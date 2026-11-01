import numpy as np
from sentence_transformers import SentenceTransformer
from .utils import extract_skills, normalize_whitespace

# all-MiniLM-L6-v2 truncates input at 256 word-piece tokens, so long resumes
# are embedded in chunks of this many words and the chunk embeddings averaged.
CHUNK_WORDS = 150

# Final score = blend of semantic similarity and share of JD skills covered.
SEMANTIC_WEIGHT = 0.6
SKILL_WEIGHT = 0.4


class ModelPipeline:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.embedder = SentenceTransformer(model_name)  # small & fast

    def embed(self, text):
        """Embed text of any length as the normalized mean of its chunk embeddings."""
        words = text.split()
        chunks = [" ".join(words[i:i + CHUNK_WORDS]) for i in range(0, len(words), CHUNK_WORDS)]
        embs = self.embedder.encode(chunks, normalize_embeddings=True)
        mean = embs.mean(axis=0)
        return mean / np.linalg.norm(mean)

    def compute_similarity(self, jd_text, resume_text):
        """Semantic similarity between JD and resume, 0-100"""
        cosine = float(np.dot(self.embed(jd_text), self.embed(resume_text)))
        return max(cosine, 0.0) * 100

    def predict(self, jd_text, resume_text):
        """Return a dict with the overall score, its parts, and matched/missing skills"""
        jd_text = normalize_whitespace(jd_text)
        resume_text = normalize_whitespace(resume_text)

        jd_skills = set(extract_skills(jd_text))
        resume_skills = set(extract_skills(resume_text))
        matched = sorted(jd_skills & resume_skills)
        missing = sorted(jd_skills - resume_skills)

        semantic_score = self.compute_similarity(jd_text, resume_text)
        if jd_skills:
            skill_score = len(matched) / len(jd_skills) * 100
            score = SEMANTIC_WEIGHT * semantic_score + SKILL_WEIGHT * skill_score
        else:
            # No recognizable skills in the JD: fall back to similarity alone
            skill_score = None
            score = semantic_score

        return {
            "score": round(score, 2),
            "semantic_score": round(semantic_score, 2),
            "skill_score": None if skill_score is None else round(skill_score, 2),
            "matched_skills": matched,
            "missing_skills": missing,
        }
