from flask import Flask, request, jsonify
from flask_cors import CORS
from model_pipeline.pipeline import ModelPipeline
from model_pipeline.utils import extract_text_from_pdf_bytes
import os

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB per request

pipeline = ModelPipeline()


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

    return jsonify(pipeline.predict(jd_text, resume_text))


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "Upload too large (max 10 MB)"}), 413


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
