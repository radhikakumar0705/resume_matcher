"""SQLite storage for every resume / job description match."""
import json
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "resume_matcher.db")
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS matches (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT NOT NULL,
    resume_name    TEXT NOT NULL,
    resume_text    TEXT NOT NULL,
    resume_pdf     BLOB NOT NULL,
    jd_name        TEXT,
    jd_text        TEXT NOT NULL,
    score          REAL NOT NULL,
    semantic_score REAL NOT NULL,
    skill_score    REAL,
    matched_skills TEXT NOT NULL,
    missing_skills TEXT NOT NULL,
    suggestions    TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    status      TEXT NOT NULL,          -- running | done | error
    model       TEXT NOT NULL,
    start_score REAL NOT NULL,
    end_score   REAL,
    steps       TEXT NOT NULL,          -- JSON list of step records
    draft       TEXT,                   -- tailored resume text
    error       TEXT
);
"""

# Columns returned in the history list (no large text / blob fields)
SUMMARY_COLUMNS = (
    "id, created_at, resume_name, jd_name, substr(jd_text, 1, 160) AS jd_snippet, "
    "score, semantic_score, skill_score, matched_skills, missing_skills, suggestions"
)


def _connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)  # agent threads write concurrently
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # so deleting a match removes its agent runs
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _connect() as conn:
        conn.executescript(SCHEMA)


def _row_to_dict(row):
    d = dict(row)
    for key in ("matched_skills", "missing_skills", "suggestions"):
        if key in d and d[key] is not None:
            d[key] = json.loads(d[key])
    d.pop("resume_pdf", None)
    return d


def save_match(resume_name, resume_text, resume_pdf, jd_name, jd_text, result):
    with _connect() as conn:
        cur = conn.execute(
            """INSERT INTO matches (created_at, resume_name, resume_text, resume_pdf, jd_name, jd_text,
                                    score, semantic_score, skill_score, matched_skills, missing_skills)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
                resume_name, resume_text, resume_pdf, jd_name, jd_text,
                result["score"], result["semantic_score"], result["skill_score"],
                json.dumps(result["matched_skills"]), json.dumps(result["missing_skills"]),
            ),
        )
        return cur.lastrowid


def list_matches():
    with _connect() as conn:
        rows = conn.execute(f"SELECT {SUMMARY_COLUMNS} FROM matches ORDER BY id DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def get_match(match_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM matches WHERE id = ?", (match_id,)).fetchone()
    return _row_to_dict(row) if row else None


def get_resume_pdf(match_id):
    with _connect() as conn:
        row = conn.execute("SELECT resume_name, resume_pdf FROM matches WHERE id = ?", (match_id,)).fetchone()
    return (row["resume_name"], row["resume_pdf"]) if row else None


def set_suggestions(match_id, suggestions):
    with _connect() as conn:
        conn.execute("UPDATE matches SET suggestions = ? WHERE id = ?", (json.dumps(suggestions), match_id))


def delete_match(match_id):
    with _connect() as conn:
        return conn.execute("DELETE FROM matches WHERE id = ?", (match_id,)).rowcount > 0


# --- Agent runs -------------------------------------------------------------

def _run_to_dict(row):
    d = dict(row)
    d["steps"] = json.loads(d["steps"])
    return d


def create_agent_run(match_id, model, start_score, draft):
    with _connect() as conn:
        cur = conn.execute(
            """INSERT INTO agent_runs (match_id, created_at, status, model, start_score, end_score, steps, draft)
               VALUES (?, ?, 'running', ?, ?, ?, '[]', ?)""",
            (match_id, datetime.now(timezone.utc).isoformat(timespec="seconds"), model, start_score, start_score, draft),
        )
        return cur.lastrowid


def update_agent_run(run_id, **fields):
    """Update any of: status, end_score, steps (list), draft, error."""
    if "steps" in fields:
        fields["steps"] = json.dumps(fields["steps"])
    sets = ", ".join(f"{k} = ?" for k in fields)
    with _connect() as conn:
        conn.execute(f"UPDATE agent_runs SET {sets} WHERE id = ?", (*fields.values(), run_id))


def get_agent_run(run_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM agent_runs WHERE id = ?", (run_id,)).fetchone()
    return _run_to_dict(row) if row else None


def list_agent_runs(match_id=None):
    query = ("SELECT r.id, r.match_id, r.created_at, r.status, r.model, r.start_score, r.end_score, "
             "m.resume_name, m.jd_name, substr(m.jd_text, 1, 120) AS jd_snippet "
             "FROM agent_runs r JOIN matches m ON m.id = r.match_id")
    args = ()
    if match_id is not None:
        query += " WHERE r.match_id = ?"
        args = (match_id,)
    with _connect() as conn:
        rows = conn.execute(query + " ORDER BY r.id DESC", args).fetchall()
    return [dict(r) for r in rows]


def fail_stale_runs():
    """Runs left 'running' by a previous process can never finish; mark them failed."""
    with _connect() as conn:
        conn.execute("UPDATE agent_runs SET status = 'error', error = 'Server restarted during the run' "
                     "WHERE status = 'running'")
