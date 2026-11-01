import React, { useCallback, useEffect, useState } from "react";
import Result, { scoreTone } from "./Result";
import { listMatches, deleteMatch, resumeUrl } from "./api";

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function History() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    listMatches()
      .then(setMatches)
      .catch((err) => setError(err.message));
  }, []);

  // Keep the table's suggestions column in sync when a row generates them
  const handleSuggestions = useCallback((id, suggestions) => {
    setMatches((ms) => ms.map((m) => (m.id === id ? { ...m, suggestions } : m)));
  }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this match from history?")) return;
    try {
      await deleteMatch(id);
      setMatches(matches.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="panel notice"><p>{error}</p></div>;
  if (!matches) return <div className="panel"><p className="muted">Loading history...</p></div>;
  if (matches.length === 0) {
    return (
      <div className="panel empty">
        <h3>No saved matches yet</h3>
        <p className="muted">Run a match with "Save to history" on and it will show up here.</p>
      </div>
    );
  }

  return (
    <div className="panel history">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Resume</th>
              <th>Job</th>
              <th>Score</th>
              <th>Missing skills</th>
              <th>AI suggestions</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const open = openId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr className={open ? "open" : ""} onClick={() => setOpenId(open ? null : m.id)}>
                    <td className="nowrap muted">{formatDate(m.created_at)}</td>
                    <td className="strong">{m.resume_name}</td>
                    <td><div className="jd-cell">{m.jd_name || m.jd_snippet}</div></td>
                    <td><span className={`pill-score ${scoreTone(m.score)}`}>{Math.round(m.score)}</span></td>
                    <td>
                      {m.missing_skills.length === 0 ? (
                        <span className="muted">None</span>
                      ) : (
                        <span className="muted">
                          {m.missing_skills.slice(0, 3).join(", ")}
                          {m.missing_skills.length > 3 && ` +${m.missing_skills.length - 3}`}
                        </span>
                      )}
                    </td>
                    <td className="suggestion-cell">
                      {m.suggestions ? (
                        <ul>
                          {m.suggestions.slice(0, 2).map((s, i) => <li key={i}>{s.title}</li>)}
                          {m.suggestions.length > 2 && <li className="muted">+{m.suggestions.length - 2} more</li>}
                        </ul>
                      ) : (
                        <button className="btn-secondary small" onClick={(e) => { e.stopPropagation(); setOpenId(m.id); }}>
                          ✦ Generate
                        </button>
                      )}
                    </td>
                    <td className="nowrap actions" onClick={(e) => e.stopPropagation()}>
                      <a className="icon-btn" href={resumeUrl(m.id)} target="_blank" rel="noreferrer" title="Open resume PDF">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                      </a>
                      <button className="icon-btn danger" onClick={() => remove(m.id)} title="Delete">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <Result data={m} onSuggestions={handleSuggestions} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default History;
