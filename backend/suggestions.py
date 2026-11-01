"""Resume improvement suggestions from a local Ollama model."""
import json
import os
import requests

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
# Must be a model you've pulled (`ollama list`); override with OLLAMA_MODEL
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")

# Keep prompts small enough for fast local models
MAX_CHARS = 6000

PROMPT = """You are an expert technical recruiter reviewing a resume against a job description.

JOB DESCRIPTION:
{jd}

RESUME:
{resume}

Skills the resume already shows: {matched}
Skills from the job description missing from the resume: {missing}

Give 4 to 6 specific, actionable suggestions to make this resume a stronger match for this job.
Base every suggestion on what is actually in the resume: reword or reorder real experience to
highlight relevant work, quantify impact, tighten weak bullets, and surface relevant skills the
candidate already has. Never suggest claiming experience the candidate does not have; for a
missing skill, suggest highlighting closely related real experience or learning it (e.g. a small project).

Respond with JSON only, in this exact shape:
{{"suggestions": [{{"title": "short headline", "detail": "one or two sentences"}}]}}
"""


class SuggestionError(Exception):
    """Raised with a user-facing message when suggestions cannot be generated."""


def generate_suggestions(resume_text, jd_text, matched_skills, missing_skills):
    prompt = PROMPT.format(
        jd=jd_text[:MAX_CHARS],
        resume=resume_text[:MAX_CHARS],
        matched=", ".join(matched_skills) or "none detected",
        missing=", ".join(missing_skills) or "none",
    )
    try:
        # First call after Ollama starts loads the model and can take ~30s
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json"},
            timeout=120,
        )
    except requests.exceptions.ConnectionError:
        raise SuggestionError("Ollama isn't running. Start it with 'ollama serve' and try again.")
    except requests.exceptions.Timeout:
        raise SuggestionError("The model took too long to respond. Try again.")

    if response.status_code == 404:
        raise SuggestionError(f"Model '{OLLAMA_MODEL}' isn't installed. Run 'ollama pull {OLLAMA_MODEL}'.")
    if response.status_code != 200:
        raise SuggestionError(f"Ollama returned an error ({response.status_code}).")

    try:
        items = json.loads(response.json()["response"])["suggestions"]
        suggestions = [
            {"title": str(s.get("title", "")).strip(), "detail": str(s.get("detail", "")).strip()}
            for s in items if isinstance(s, dict)
        ]
    except (KeyError, TypeError, ValueError):
        raise SuggestionError("The model returned an unexpected response. Try again.")

    suggestions = [s for s in suggestions if s["title"] or s["detail"]]
    if not suggestions:
        raise SuggestionError("The model didn't return any suggestions. Try again.")
    return suggestions
