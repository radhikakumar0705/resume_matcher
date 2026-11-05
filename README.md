# Resume Matcher

An automated resume matching system that evaluates resumes against job descriptions using **semantic embeddings** and **skill extraction**. The system combines natural language processing (NLP) with contextual similarity to rank candidates effectively.

---

## Project Overview

Recruitment processes often involve manual screening of hundreds of resumes, which is time-consuming and error-prone. This project leverages transformer-based embeddings (`SentenceTransformer`) to understand the semantic content of resumes and job descriptions, along with dynamic skill extraction to identify matched and missing skills. The result is a ranked list of candidates that best fit the job requirements.

---

## Features

- **Semantic Matching:** Measures the contextual similarity between a resume and a job description using `all-MiniLM-L6-v2` embeddings (long documents are embedded in chunks and averaged, so nothing past the model's 256-token limit is dropped).
- **Skill Extraction:** Finds skills from a curated vocabulary (`backend/model_pipeline/skills.py`) in both documents and reports which job skills the resume has and which it is missing.
- **Combined Score:** `score = 0.6 × semantic similarity + 0.4 × skill coverage` (similarity alone if the job description names no known skills).
- **Match history & dashboard:** Every job description and resume you match can be saved, browsed and re-opened.
- **AI suggestions:** A local LLM (Ollama) suggests concrete ways to improve the resume for the job.
- **Resume tailoring agent:** An AI agent rewrites the resume for the job one line at a time (see below).
- **Frontend & Backend:** Built with React (frontend) and Python Flask (backend), packaged with Docker and Kubernetes.

---

## Libraries and Frameworks Used

- **Backend:** Python, Flask
- **Frontend:** React
- **Machine Learning / NLP:**
  - `sentence-transformers` (for embeddings)
  - `numpy` (cosine similarity)
- **Utilities:** `PyMuPDF` (reading PDF resumes and job descriptions)

---

## How It Works

1. Extract text from the uploaded PDF(s) with PyMuPDF.
2. Extract skills from the resume and job description with `extract_skills()`.
3. Compute semantic similarity using transformer embeddings.
4. Identify matched and missing skills.
5. Blend similarity and skill coverage into a 0-100 match score.

To add skills, add an entry to `SKILLS` in `backend/model_pipeline/skills.py` (display name -> regex of aliases).

---

## Running Locally

Backend (Python 3.10-3.12):

```bash
cd backend
python -m venv venv
venv/Scripts/activate      # Windows; on macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py              # set FLASK_DEBUG=1 for debug mode
```

The first run downloads the embedding model (~90 MB). The API listens on http://127.0.0.1:5000.

Optional AI resume tips: install [Ollama](https://ollama.com), run `ollama pull llama3.2` and `ollama serve`. The backend asks it for tips on the missing skills; set `OLLAMA_MODEL` to use a different model. Without Ollama running, matching still works and the tips section shows a hint to start it.

Frontend:

```bash
cd frontend
npm install
npm start
```

Set `REACT_APP_API_URL` if the backend is not at http://127.0.0.1:5000.

---

## Resume Tailoring Agent

Open **Agent** in the menu (or click "Tailor this resume with the AI agent" on a result), pick a saved match and press **Run agent**. The agent runs on a local Ollama model (`qwen2.5:7b` by default, set `AGENT_MODEL` to change it) with three tools:

- `rewrite_line(line, rewritten, reason)` rewrites one bullet or sentence. Every edit is re-scored by the matcher, and the backend rejects it if it lowers the score, adds a skill the resume didn't have, drops one it did, duplicates another line, or touches a locked line (headings, job titles, contact details, skill lists).
- `get_status` returns the current score and missing skills.
- `finish(summary)` ends the run.

The page shows every step live, the before/after score, each accepted edit and the final draft. Runs are stored with the match.

```bash
ollama pull qwen2.5:7b
```

---

## Running with Docker

Ollama runs on your machine (not in a container) so it can use your GPU; the containers reach it through `host.docker.internal`.

```bash
docker compose up -d --build
```

The site is at http://localhost:8080 (set `WEB_PORT` to use another port). nginx serves the React build and proxies `/api` to the Flask backend (gunicorn). The database lives in the `backend-data` volume.

---

## Running on Kubernetes

The manifests in `k8s/` target a local cluster such as Docker Desktop's built-in Kubernetes (Settings → Kubernetes → Enable). Build the images first so the cluster can use them:

```bash
docker compose build
kubectl --context docker-desktop apply -k k8s
```

The site is at http://localhost:8086. It runs one backend pod (SQLite on a persistent volume), two nginx frontend pods and a ConfigMap for the Ollama URL and model names. Remove it with `kubectl --context docker-desktop delete -k k8s`.
