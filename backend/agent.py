"""Resume tailoring agent.

An LLM (local Ollama, via its tool-calling chat API) works in a loop:
it looks at the gaps between a resume and a job description, rewrites
lines of the resume, and gets the new match score back after every
edit, until it decides it's done or runs out of steps.

The resume is shown to the model with numbered lines and edited by line
number, which small local models handle far more reliably than copying
exact passages.

Guardrails keep it honest:
- a rewrite is rejected if it introduces a skill the original resume
  never mentions, or if it lowers the score;
- metrics it can't know are written as placeholders like [X%];
- the final summary is built from the edits actually applied, not from
  the model's own claims.
"""
import json
import os
import re
import threading
from datetime import datetime, timezone

import requests

import db
from model_pipeline.utils import extract_skills

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
# Agent work needs reliable tool calling; 7B+ models do far better than llama3.2 (3B)
AGENT_MODEL = os.environ.get("AGENT_MODEL", "qwen2.5:7b")
MAX_STEPS = int(os.environ.get("AGENT_MAX_STEPS", 12))
MAX_JD_CHARS = 2500

SYSTEM_PROMPT = """You are a resume tailoring agent. Your goal is to raise the match score between \
the candidate's resume and the job description by rewriting lines of the resume.

Rules:
- Only use experience, tools and skills that are already in the resume. Never invent jobs, skills, \
employers or numbers. If a metric would help, write a placeholder like [X%] or [N users].
- Never inflate the scope of the work: "wrote SQL queries" must not become "managed databases".
- Reword real lines to use the job description's wording and to highlight the most relevant work.
- Edit one line per rewrite_line call, keeping its meaning and about the same length. Lines marked \
[locked] (headings, job titles, contact details) can't be edited.
- After each edit you get the new score. Edits that don't raise it are rejected; try a different line.
- Edit each line at most once. Make 2 to 5 edits, then call finish.

JOB DESCRIPTION:
{jd}"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "rewrite_line",
            "description": "Replace one resume line (by its number in the listing) with an improved version, then re-score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "line": {"type": "integer", "description": "Line number from the resume listing, e.g. 5 for L5."},
                    "rewritten": {"type": "string", "description": "The improved line, same meaning, using only real experience from the resume."},
                    "reason": {"type": "string", "description": "One short sentence on why this helps."},
                },
                "required": ["line", "rewritten", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_status",
            "description": "Get the current score, matched and missing skills, and the numbered resume.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finish",
            "description": "Stop when you've made your best edits.",
            "parameters": {
                "type": "object",
                "properties": {"summary": {"type": "string", "description": "Two sentences on what you changed and why."}},
                "required": ["summary"],
            },
        },
    },
]

TOOL_NAMES = {t["function"]["name"] for t in TOOLS}

BULLET = re.compile(r"^[-•*·–▪●]\s*")
STOPWORDS = {"with", "from", "that", "this", "their", "used", "using", "into", "were", "have",
             "also", "over", "such", "them", "they", "which", "while", "for", "and", "the"}


def _merge_wrapped(lines):
    """PDF text wraps long bullets onto the next line; join a line that continues the previous one."""
    merged = []
    for ln in lines:
        if merged and ln[:1].islower() and not BULLET.match(ln):
            merged[-1] = f"{merged[-1]} {ln}"
        else:
            merged.append(ln)
    return merged


def _editable(line):
    """Bullets and full sentences can be rewritten; headings, job titles and contact lines can't."""
    if line.count(",") >= 3 and not BULLET.match(line):
        return False  # a skills list, not a sentence
    return bool(BULLET.match(line)) or len(line.split()) >= 8


def _stems(text):
    words = re.findall(r"[a-z0-9+#]+", text.lower())
    return {w[:5] for w in words if len(w) > 3 and w not in STOPWORDS}


def _coverage(before, after):
    """Share of the original line's key words that the rewrite keeps."""
    b = _stems(before)
    return len(b & _stems(after)) / len(b) if b else 1.0

# Rewording soft skills is fine; only technical skills must already be in the resume
SOFT_SKILLS = {"Communication", "Leadership", "Teamwork", "Problem Solving", "Project Management"}


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _parse_args(raw):
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw or "{}")
    except (TypeError, ValueError):
        return {}


def _text_tool_call(content):
    """Small models sometimes write the tool call as JSON text instead of a real tool call."""
    match = re.search(r"\{.*\}", content or "", flags=re.DOTALL)
    if not match:
        return None
    try:
        obj = json.loads(match.group(0))
    except ValueError:
        return None
    name = obj.get("name") or obj.get("function")
    if name not in TOOL_NAMES:
        return None
    return {"function": {"name": name, "arguments": obj.get("parameters") or obj.get("arguments") or {}}}


class TailoringAgent:
    def __init__(self, pipeline, match, run_id):
        self.pipeline = pipeline
        self.run_id = run_id
        self.jd = match["jd_text"]
        self.original_skills = set(extract_skills(match["resume_text"]))
        # One entry per line; edits replace a line in place, so line numbers never shift
        self.lines = _merge_wrapped([ln.strip() for ln in match["resume_text"].splitlines() if ln.strip()])
        self.originals = list(self.lines)
        self.start_score = match["score"]
        self.score = match["score"]
        self.steps = []
        self.applied = []      # successful edits
        self.edited = set()    # line indexes already changed
        self.attempts = 0      # rewrite_line calls
        self.tried = set()     # (line, text) already attempted
        self.model_summary = None

    @property
    def draft(self):
        return "\n".join(self.lines)

    def numbered(self):
        return "\n".join(
            f"L{i + 1}: {ln}" + ("" if _editable(ln) else "  [locked]")
            for i, ln in enumerate(self.lines)
        )

    def _log(self, kind, **data):
        self.steps.append({"type": kind, "at": _now(), **data})
        db.update_agent_run(self.run_id, steps=self.steps, draft=self.draft, end_score=self.score)

    # --- tools -----------------------------------------------------------------

    def tool_get_status(self, _args):
        result = self.pipeline.predict(self.jd, self.draft)
        return {
            "score": result["score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "resume": self.numbered(),
        }

    def tool_rewrite_line(self, args):
        self.attempts += 1
        try:
            # Accept the older start_line/end_line names some models still send
            line = int(args.get("line") or args.get("start_line") or args.get("end_line"))
        except (TypeError, ValueError):
            return {"error": "line must be a line number from the resume listing, e.g. 5 for L5."}
        rewritten = " ".join(str(args.get("rewritten") or "").split())
        n = len(self.lines)
        if not 1 <= line <= n:
            return {"error": f"There is no L{line}; lines go from L1 to L{n}."}
        i = line - 1
        current = self.lines[i]
        if not _editable(current):
            return {"error": f"L{line} is locked (\"{current}\"). Edit a bullet or sentence instead."}
        if i in self.edited:
            return {"error": f"L{line} was already edited. Pick a line you haven't changed."}
        if len(rewritten) < 10:
            return {"error": "Give the full rewritten line."}
        key = (line, rewritten.lower())
        if key in self.tried:
            return {"error": "You already tried exactly this edit. Pick a different line or change the wording."}
        self.tried.add(key)

        # Keep the bullet marker if the model dropped it
        marker = BULLET.match(current)
        if marker and not BULLET.match(rewritten):
            rewritten = marker.group(0) + rewritten

        if _coverage(current, rewritten) < 0.34:
            return {"error": f"That rewrite doesn't match L{line}, which says: \"{current}\". "
                             "Check the line number and keep the line's meaning."}

        for j, other in enumerate(self.lines):
            if j != i and _editable(other) and _coverage(rewritten, other) > 0.8 and _coverage(other, rewritten) > 0.8:
                return {"error": f"That rewrite repeats L{j + 1}. Every line should describe different work."}

        invented = set(extract_skills(rewritten)) - self.original_skills - SOFT_SKILLS
        if invented:
            return {"error": f"Rejected: the resume never mentions {', '.join(sorted(invented))}. "
                             "Only use skills the candidate really has."}

        candidate = self.lines[:i] + [rewritten] + self.lines[i + 1:]
        candidate_text = "\n".join(candidate)

        lost = set(extract_skills(self.draft)) - set(extract_skills(candidate_text))
        if lost:
            return {"error": f"Rejected: that would remove {', '.join(sorted(lost))} from the resume. "
                             "Keep the skills the original line mentions."}

        new = self.pipeline.predict(self.jd, candidate_text)
        delta = new["score"] - self.score
        if delta <= 0:
            return {"error": f"Rejected: that rewrite didn't raise the score ({delta:+.1f}). Try another line.",
                    "score": self.score}

        self.lines = candidate
        self.edited.add(i)
        self.score = new["score"]
        self.applied.append({"lines": f"L{line}", "before": current, "after": rewritten,
                             "reason": str(args.get("reason") or ""), "change": round(delta, 2)})
        return {"applied": True, "new_score": new["score"], "change": round(delta, 2),
                "missing_skills": new["missing_skills"]}

    def tool_finish(self, args):
        if self.attempts == 0:
            return {"error": "You haven't edited anything yet. Call rewrite_line on a line from the resume first."}
        self.model_summary = (args.get("summary") or "").strip()
        return {"done": True}

    # --- loop --------------------------------------------------------------------

    def _chat(self, messages):
        try:
            res = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": AGENT_MODEL,
                    "messages": messages,
                    "tools": TOOLS,
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {"temperature": 0.3, "num_ctx": 8192},
                },
                timeout=240,
            )
        except requests.exceptions.ConnectionError:
            raise RuntimeError("Ollama isn't running. Start it with 'ollama serve'.")
        except requests.exceptions.Timeout:
            raise RuntimeError("The model took too long to respond.")
        if res.status_code == 404:
            raise RuntimeError(f"Model '{AGENT_MODEL}' isn't installed. Run 'ollama pull {AGENT_MODEL}'.")
        if res.status_code != 200:
            raise RuntimeError(f"Ollama returned an error ({res.status_code}): {res.text[:200]}")
        return res.json()["message"]

    def _summary(self):
        if not self.applied:
            return "No edits were applied: none of the model's rewrites improved the score while staying truthful."
        text = (f"Applied {len(self.applied)} edit{'s' if len(self.applied) != 1 else ''}; "
                f"score {self.start_score:.1f} → {self.score:.1f}.")
        return text

    def run(self):
        status = self.tool_get_status({})
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(jd=self.jd[:MAX_JD_CHARS])},
            {"role": "user", "content": (
                f"Current score: {status['score']}\n"
                f"Skills already shown: {', '.join(status['matched_skills']) or 'none'}\n"
                f"Missing skills: {', '.join(status['missing_skills']) or 'none'}\n"
                "The missing skills are NOT in the candidate's experience, so you must never add them. "
                "Instead, rephrase lines about the skills already shown so they echo the job description's "
                "language, responsibilities and priorities. Keep every skill a line already mentions.\n\n"
                f"RESUME (numbered lines):\n{status['resume']}\n\n"
                "Tailor this resume for the job. Call rewrite_line for your first edit."
            )},
        ]
        self._log("start", score=self.score, model=AGENT_MODEL,
                  missing_skills=status["missing_skills"])
        nudges = 0

        for _ in range(MAX_STEPS):
            msg = self._chat(messages)
            calls = msg.get("tool_calls") or []
            if not calls:
                fallback = _text_tool_call(msg.get("content"))
                calls = [fallback] if fallback else []

            if not calls:
                if msg.get("content"):
                    self._log("thought", text=msg["content"].strip()[:600])
                nudges += 1
                if nudges > 3:
                    break
                messages.append({"role": "assistant", "content": msg.get("content", "")})
                messages.append({"role": "user", "content": (
                    "Don't describe the edit, make it: call rewrite_line with line, "
                    "rewritten and reason. Call finish when you are done."
                )})
                continue

            messages.append({"role": "assistant", "content": msg.get("content", ""), "tool_calls": calls})
            for call in calls:
                name = call["function"]["name"]
                args = _parse_args(call["function"].get("arguments"))
                handler = getattr(self, f"tool_{name}", None)
                output = handler(args) if handler else {"error": f"Unknown tool {name}"}

                # Keep the trace readable: the numbered resume is shown once, not on every status call
                shown = {k: v for k, v in output.items() if k != "resume"}
                self._log("tool", tool=name, args=args, output=shown, score=self.score)
                messages.append({"role": "tool", "content": json.dumps(output), "tool_name": name})

            if self.model_summary is not None:
                break

        self._log("finish", summary=self._summary(), note=self.model_summary or "",
                  score=self.score, edits=self.applied)


def start_run(pipeline, match):
    """Create an agent run for a saved match and execute it in a background thread."""
    run_id = db.create_agent_run(match["id"], AGENT_MODEL, match["score"], match["resume_text"])

    def work():
        agent = TailoringAgent(pipeline, match, run_id)
        try:
            agent.run()
            db.update_agent_run(run_id, status="done", draft=agent.draft, end_score=agent.score)
        except Exception as e:  # surface any failure on the run instead of a silent dead thread
            agent._log("error", text=str(e))
            db.update_agent_run(run_id, status="error", error=str(e))

    threading.Thread(target=work, daemon=True).start()
    return run_id
