import React, { useCallback, useEffect, useRef, useState } from "react";
import { getSuggestions } from "./api";

// Request body for /suggestions: saved matches by id, unsaved ones by their texts
const requestBody = (match) =>
  match.id != null
    ? { match_id: match.id }
    : {
        resume_text: match.resume_text,
        jd_text: match.jd_text,
        matched_skills: match.matched_skills,
        missing_skills: match.missing_skills,
      };

function Suggestions({ match, autoGenerate = true, onGenerated }) {
  const [items, setItems] = useState(match.suggestions || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSuggestions(requestBody(match));
      setItems(data.suggestions);
      onGenerated && onGenerated(match.id, data.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [match, onGenerated]);

  // StrictMode runs effects twice in development; only request once
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    if (autoGenerate && !match.suggestions) generate();
    // Only on first show of this match
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  return (
    <div className="panel suggestions">
      <div className="panel-head">
        <h3>
          <span className="sparkle">✦</span> How to improve this resume
        </h3>
        {items && !loading && (
          <button className="btn-ghost" onClick={generate}>Regenerate</button>
        )}
      </div>

      {loading && (
        <div className="skeleton-list">
          <p className="muted small">Asking the local AI model... the first run can take ~30 seconds.</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton line short" />
              <div className="skeleton line" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="notice">
          <p>{error}</p>
          <button className="btn-secondary" onClick={generate}>Try again</button>
        </div>
      )}

      {!loading && !error && items && (
        <ol className="suggestion-list">
          {items.map((s, i) => (
            <li key={i}>
              <span className="suggestion-num">{i + 1}</span>
              <div>
                <div className="suggestion-title">{s.title}</div>
                <div className="suggestion-detail">{s.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {!loading && !error && !items && (
        <div className="notice">
          <p>Get tailored, AI-generated suggestions for this resume and job.</p>
          <button className="btn-primary" onClick={generate}>Generate suggestions</button>
        </div>
      )}
    </div>
  );
}

export default Suggestions;
