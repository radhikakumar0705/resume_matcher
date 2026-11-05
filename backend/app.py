from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from model_pipeline.pipeline import ModelPipeline
from model_pipeline.utils import extract_text_from_pdf_bytes
from suggestions import generate_suggestions, SuggestionError
import agent
import db
import io
import os

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB per request

pipeline = ModelPipeline()
db.init_db()
db.fail_stale_runs()


def read_pdf_upload(file, label):
    """Return (text, bytes) of an uploaded PDF, or raise ValueError with a user-facing message"""
    if not file.filename.lower().endswith(".pdf"):
        raise ValueError(f"{label} must be a PDF file")
    data = file.read()
    try:
        text = extract_text_from_pdf_bytes(data)
    except ValueError:
        raise ValueError(f"{label} is not a valid PDF")
    if not text.strip():
        raise ValueError(f"No text found in {label.lower()} (is it a scanned image?)")
    return text, data


@app.route("/")
def home():
    return "Resume Matching API is running!"


@app.route("/match", methods=["POST"])
def match_resume():
    resume_file = request.files.get("resumes")
    jd_file = request.files.get("job_description_file")
    jd_text = request.form.get("job_description", "").strip()  # fallback if pasted text
    save = request.form.get("save", "true").lower() != "false"

    if not resume_file or not resume_file.filename:
        return jsonify({"error": "No resume uploaded"}), 400

    jd_name = None
    try:
        resume_text, resume_bytes = read_pdf_upload(resume_file, "Resume")
        if jd_file and jd_file.filename:
            jd_text, _ = read_pdf_upload(jd_file, "Job description")
            jd_name = jd_file.filename
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not jd_text:
        return jsonify({"error": "No job description provided"}), 400

    result = pipeline.predict(jd_text, resume_text)
    result["resume_name"] = resume_file.filename
    result["jd_name"] = jd_name

    if save:
        result["id"] = db.save_match(resume_file.filename, resume_text, resume_bytes, jd_name, jd_text, result)
    else:
        # Not stored, so the client sends the texts back to request suggestions
        result["id"] = None
        result["resume_text"] = resume_text
        result["jd_text"] = jd_text

    return jsonify(result)


@app.route("/suggestions", methods=["POST"])
def suggestions():
    """Generate LLM suggestions for a saved match ({"match_id"}) or raw texts."""
    body = request.get_json(silent=True) or {}
    match_id = body.get("match_id")

    if match_id is not None:
        match = db.get_match(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404
    elif body.get("resume_text") and body.get("jd_text"):
        match = body
    else:
        return jsonify({"error": "Provide match_id or resume_text and jd_text"}), 400

    try:
        items = generate_suggestions(
            match["resume_text"], match["jd_text"],
            match.get("matched_skills", []), match.get("missing_skills", []),
        )
    except SuggestionError as e:
        return jsonify({"error": str(e)}), 503

    if match_id is not None:
        db.set_suggestions(match_id, items)
    return jsonify({"suggestions": items})


@app.route("/matches", methods=["GET"])
def list_matches():
    return jsonify(db.list_matches())


@app.route("/matches/<int:match_id>", methods=["GET"])
def get_match(match_id):
    match = db.get_match(match_id)
    if not match:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match)


@app.route("/matches/<int:match_id>", methods=["DELETE"])
def delete_match(match_id):
    if not db.delete_match(match_id):
        return jsonify({"error": "Match not found"}), 404
    return "", 204


@app.route("/matches/<int:match_id>/resume", methods=["GET"])
def download_resume(match_id):
    found = db.get_resume_pdf(match_id)
    if not found:
        return jsonify({"error": "Match not found"}), 404
    name, data = found
    return send_file(io.BytesIO(data), mimetype="application/pdf", download_name=name)


@app.route("/agent/runs", methods=["POST"])
def start_agent_run():
    body = request.get_json(silent=True) or {}
    match = db.get_match(body.get("match_id"))
    if not match:
        return jsonify({"error": "Pick a saved match to tailor"}), 404
    run_id = agent.start_run(pipeline, match)
    return jsonify(db.get_agent_run(run_id)), 202


@app.route("/agent/runs", methods=["GET"])
def list_agent_runs():
    match_id = request.args.get("match_id", type=int)
    return jsonify(db.list_agent_runs(match_id))


@app.route("/agent/runs/<int:run_id>", methods=["GET"])
def get_agent_run(run_id):
    run = db.get_agent_run(run_id)
    if not run:
        return jsonify({"error": "Run not found"}), 404
    return jsonify(run)


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "Upload too large (max 10 MB)"}), 413


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
