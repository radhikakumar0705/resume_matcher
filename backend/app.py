from flask import Flask, request, jsonify
from flask_cors import CORS
from model_pipeline.pipeline import ModelPipeline
from model_pipeline.utils import extract_text_from_pdf_bytes
import os
import requests  # Added to communicate with your local Ollama instance

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB per request

pipeline = ModelPipeline()


def generate_ollama_tips(missing_skills):
    """
    Queries local Ollama instance to generate quick, actionable modifications
    to bridge the discovered skill gap.
    """
    ollama_url = "http://localhost:11434/api/generate"

    # Format missing skills array cleanly for the model context
    skills_str = ", ".join(missing_skills[:10]) if missing_skills else "None"

    prompt = f"""
    You are an expert technical resume reviewer. The candidate is missing these specific keywords/skills: {skills_str}.

    Provide exactly 3 short, high-impact bullet points explaining how they can update their resume bullets to subtly showcase or imply experience with these items.
    Get straight to the bullets. Do not include intro greetings, conversational fillers, or concluding remarks.
    """

    payload = {
        # Must be a model you've pulled (`ollama list`); override with OLLAMA_MODEL
        "model": os.environ.get("OLLAMA_MODEL", "llama3.2"),
        "prompt": prompt,
        "stream": False     # Simple synchronous single-string response
    }

    try:
        # First call after Ollama starts loads the model and can take ~30s
        response = requests.post(ollama_url, json=payload, timeout=60)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
        return "⚠️ Could not generate custom tips from the local model."
    except requests.exceptions.ConnectionError:
        return "💡 Start 'ollama serve' in your terminal to unlock automatic tailored resume tips."
    except Exception as e:
        return f"⚠️ Error generating AI optimization tips: {str(e)}"


def read_pdf_upload(file, label):
    """Return the text of an uploaded PDF, or raise ValueError with a user-facing message"""
    if not file.filename.lower().endswith(".pdf"):
        raise ValueError(f"{label} must be a PDF file")
    try:
        text = extract_text_from_pdf_bytes(file.read())
    except ValueError:
        raise ValueError(f"{label} is not a valid PDF")
    if not text.strip():
        raise ValueError(f"No text found in {label.lower()} (is it a scanned image?)")
    return text


@app.route("/")
def home():
    return "Resume Matching API is running!"


@app.route("/match", methods=["POST"])
def match_resume():
    resume_file = request.files.get("resumes")
    jd_file = request.files.get("job_description_file")
    jd_text = request.form.get("job_description", "").strip()  # fallback if pasted text

    if not resume_file or not resume_file.filename:
        return jsonify({"error": "No resume uploaded"}), 400

    try:
        resume_text = read_pdf_upload(resume_file, "Resume")
        if jd_file and jd_file.filename:
            jd_text = read_pdf_upload(jd_file, "Job description")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not jd_text:
        return jsonify({"error": "No job description provided"}), 400

    result = pipeline.predict(jd_text, resume_text)

    # --- OLLAMA INTEGRATION ---
    # Fetch tailored feedback for the missing skills
    result["ai_tips"] = generate_ollama_tips(result["missing_skills"])

    return jsonify(result)


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "Upload too large (max 10 MB)"}), 413


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
