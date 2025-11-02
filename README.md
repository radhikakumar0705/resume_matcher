# Resume Matcher

An automated resume matching system that evaluates resumes against job descriptions using **semantic embeddings** and **skill extraction**. The system combines natural language processing (NLP) with contextual similarity to rank candidates effectively.

---

## Project Overview

Recruitment processes often involve manual screening of hundreds of resumes, which is time-consuming and error-prone. This project leverages transformer-based embeddings (`SentenceTransformer`) to understand the semantic content of resumes and job descriptions, along with dynamic skill extraction to identify matched and missing skills. The result is a ranked list of candidates that best fit the job requirements.

---

## Features

- **Semantic Matching:** Measures the contextual similarity between resumes and job descriptions.
- **Dynamic Skill Extraction:** Identifies matched and missing skills for each candidate.
- **Candidate Ranking:** Combines skill matching and semantic similarity scores.
- **Frontend & Backend:** Built with React (frontend) and Python Flask (backend).

---

## Libraries and Frameworks Used

- **Backend:** Python, Flask
- **Frontend:** React, Tailwind CSS
- **Machine Learning / NLP:**
  - `sentence-transformers` (for embeddings)
  - `scikit-learn` (cosine similarity)
  - `joblib` (save/load pipeline)
  - `numpy`, `pandas` (data processing)
- **Utilities:** `PyPDF2`, `python-docx` (for reading resumes), string/list operations for skill extraction

---

## How It Works

1. Clean resume and job description text using `clean_text()`.
2. Extract skills from both resumes and job descriptions using `extract_skills()`.
3. Compute semantic similarity using transformer embeddings.
4. Identify matched and missing skills.
5. Generate a match score and rank candidates.


