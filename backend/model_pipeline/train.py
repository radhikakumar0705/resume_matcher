from .pipeline import ModelPipeline
import joblib
from datasets import load_dataset

# Load resume-job description dataset
dataset = load_dataset("cnamuangtoun/resume-job-description-fit")

# Combine all resumes and JDs to extract dynamic skill list
all_texts = []
for item in dataset['train']:
    all_texts.append(item['resume_text'])
    all_texts.append(item['job_description_text'])

from .utils import extract_skills
skill_list = []
for text in all_texts:
    skill_list += extract_skills(text)

skill_list = list(set(skill_list))  # unique

# Create pipeline object
pipeline = ModelPipeline()
pipeline.skill_list = skill_list

# Save pipeline
pipeline.save("uploads/saved_models/model_pipeline.joblib")

print("Training complete. Pipeline saved with dynamic skills.")
