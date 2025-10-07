import joblib
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from .utils import extract_skills, clean_text

class ModelPipeline:
    def __init__(self, path=None):
        """
        path: path to saved joblib pipeline (optional)
        """
        self.model = None
        self.skill_list = None
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')  # small & fast
        if path:
            self.load(path)

    def load(self, path):
        data = joblib.load(path)
        self.model = data.get("model", None)
        self.skill_list = data.get("skill_list", None)

    def save(self, path):
        joblib.dump({
            "model": self.model,
            "skill_list": self.skill_list
        }, path)

    def compute_similarity(self, jd_text, resume_text):
        """Compute semantic similarity using embeddings"""
        jd_emb = self.embedder.encode([jd_text])
        resume_emb = self.embedder.encode([resume_text])
        score = cosine_similarity(jd_emb, resume_emb)[0][0] * 100
        return score

    def predict(self, jd_text, resume_text):
        """Return match score, matched skills, missing skills"""
        jd_text = clean_text(jd_text)
        resume_text = clean_text(resume_text)

        # Dynamic skill extraction from JD
        jd_skills = extract_skills(jd_text)
        resume_skills = extract_skills(resume_text)

        matched = list(set(jd_skills) & set(resume_skills))
        missing = list(set(jd_skills) - set(resume_skills))

        # Compute semantic similarity
        score = self.compute_similarity(jd_text, resume_text)

        return score, matched, missing
