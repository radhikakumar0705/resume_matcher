import fitz  # PyMuPDF
import re
import docx2txt

def extract_text_from_pdf_bytes(pdf_bytes):
    """Extract text from PDF bytes"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def clean_text(text):
    """Basic text cleaning"""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_skills(text, skill_list=None):
    """
    Extract skills from text.
    If skill_list is provided, match only known skills.
    Otherwise, extract all unique words > 2 letters as dynamic skill list.
    """
    text = clean_text(text)
    words = set(text.split())
    if skill_list:
        return list(words.intersection(set(skill_list)))
    else:
        # Basic dynamic skill extraction
        return [w for w in words if len(w) > 2]
