import fitz  # PyMuPDF
import re
from .skills import SKILLS

# Compile each skill's aliases once, wrapped in boundaries so a skill only
# matches as a whole token ("java" not in "javascript", "git" not in "github").
_SKILL_PATTERNS = {
    name: re.compile(rf"(?<![a-z0-9+#.])(?:{pattern})(?![a-z0-9+#])")
    for name, pattern in SKILLS.items()
}


def extract_text_from_pdf_bytes(pdf_bytes):
    """Extract text from PDF bytes. Raises ValueError if it is not a readable PDF."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError("File is not a valid PDF") from e
    with doc:
        return "".join(page.get_text() for page in doc)


def normalize_whitespace(text):
    return re.sub(r"\s+", " ", text).strip()


def extract_skills(text):
    """Return the sorted list of known skills (from skills.SKILLS) found in text."""
    text = normalize_whitespace(text.lower())
    return sorted(name for name, pattern in _SKILL_PATTERNS.items() if pattern.search(text))
