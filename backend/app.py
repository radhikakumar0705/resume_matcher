from flask import Flask, request, jsonify
from flask_cors import CORS
from model_pipeline.pipeline import ModelPipeline
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load trained pipeline
pipeline = ModelPipeline(path="uploads/saved_models/model_pipeline.joblib")

@app.route("/")
def home():
    return "Resume Matching API is running!"

@app.route("/match", methods=["POST"])
def match_resume():
    # Get uploaded resume
    resume_file = request.files.get("resumes")
    jd_file = request.files.get("job_description_file")
    jd_text = request.form.get("job_description")  # fallback if pasted text

    if not resume_file:
        return jsonify({"error": "No resume uploaded"}), 400

    resume_path = os.path.join(UPLOAD_FOLDER, secure_filename(resume_file.filename))
    resume_file.save(resume_path)

    # Extract resume text
    from model_pipeline.utils import extract_text_from_pdf_bytes
    with open(resume_path, "rb") as f:
        resume_bytes = f.read()
    resume_text = extract_text_from_pdf_bytes(resume_bytes)

    # Extract JD text
    if jd_file:
        jd_path = os.path.join(UPLOAD_FOLDER, secure_filename(jd_file.filename))
        jd_file.save(jd_path)
        with open(jd_path, "rb") as f:
            jd_bytes = f.read()
        jd_text = extract_text_from_pdf_bytes(jd_bytes)
    elif not jd_text:
        return jsonify({"error": "No job description provided"}), 400

    # Predict match
    score, matched_skills, missing_skills = pipeline.predict(jd_text, resume_text)

    return jsonify([{
        "score": round(score, 2),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }])

if __name__ == "__main__":
    app.run(debug=True)
