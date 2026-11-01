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
- **Frontend & Backend:** Built with React (frontend) and Python Flask (backend).

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

Frontend:

```bash
cd frontend
npm install
npm start
```

Set `REACT_APP_API_URL` if the backend is not at http://127.0.0.1:5000.
