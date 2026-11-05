import React, { useEffect, useRef, useState } from "react";
import { listMatches, listAgentRuns, startAgentRun, getAgentRun } from "./api";

const POLL_MS = 1500;

function Delta({ value }) {
  if (value == null) return null;
  const sign = value > 0 ? "+" : "";
  return <span className={`delta ${value > 0 ? "up" : value < 0 ? "down" : ""}`}>{sign}{value.toFixed(1)}</span>;
}

// One entry in the agent's timeline
function Step({ step }) {
  if (step.type === "start") {
    return (
      <li className="step-item info">
        <div className="step-title">Started with <strong>{step.model}</strong> at score {Math.round(step.score)}</div>
        {step.missing_skills?.length > 0 && (
          <div className="step-text">Missing from the resume: {step.missing_skills.join(", ")}</div>
        )}
      </li>
    );
  }
  if (step.type === "thought") {
    return (
      <li className="step-item thought">
        <div className="step-title">Thinking</div>
        <div className="step-text">{step.text}</div>
      </li>
    );
  }
  if (step.type === "error") {
    return (
      <li className="step-item rejected">
        <div className="step-title">Run failed</div>
        <div className="step-text">{step.text}</div>
      </li>
    );
  }
  if (step.type === "finish") {
    return (
      <li className="step-item done">
        <div className="step-title">Finished</div>
        <div className="step-text">{step.summary}</div>
        {step.note && <div className="step-text muted">Agent's note: {step.note}</div>}
      </li>
    );
  }

  // Tool calls
  const { tool, args = {}, output = {} } = step;
  if (tool === "rewrite_line") {
    const n = args.line || args.start_line;
    const lines = n ? `L${n}` : "a line";
    if (output.applied) {
      return (
        <li className="step-item applied">
          <div className="step-title">Rewrote {lines} <Delta value={output.change} /></div>
          <div className="step-text quote">{args.rewritten}</div>
          {args.reason && <div className="step-text muted">{args.reason}</div>}
        </li>
      );
    }
    return (
      <li className="step-item rejected">
        <div className="step-title">Tried to rewrite {lines}: rejected</div>
        <div className="step-text quote struck">{args.rewritten}</div>
        <div className="step-text muted">{output.error}</div>
      </li>
    );
  }
  if (tool === "get_status") {
    return (
      <li className="step-item info">
        <div className="step-title">Checked the score: {Math.round(output.score)}</div>
      </li>
    );
  }
  if (tool === "finish") {
    return output.error ? (
      <li className="step-item rejected">
        <div className="step-title">Tried to stop early</div>
        <div className="step-text muted">{output.error}</div>
      </li>
    ) : null;
  }
  return (
    <li className="step-item info">
      <div className="step-title">{tool}</div>
    </li>
  );
}

function RunView({ run }) {
  const [copied, setCopied] = useState(false);
  const finish = run.steps.find((s) => s.type === "finish");
  const edits = finish?.edits || [];
  const delta = run.end_score != null ? run.end_score - run.start_score : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(run.draft || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="run-view">
      <div className="panel run-head">
        <div className="run-scores">
          <div>
            <span className="stat-label">Before</span>
            <span className="run-score">{Math.round(run.start_score)}</span>
          </div>
          <span className="run-arrow">→</span>
          <div>
            <span className="stat-label">After</span>
            <span className="run-score accent">{Math.round(run.end_score ?? run.start_score)}</span>
          </div>
          <Delta value={delta} />
        </div>
        <div className={`run-status ${run.status}`}>
          {run.status === "running" && <span className="spinner light" />}
          {run.status === "running" ? "Agent working..." : run.status === "done" ? "Done" : "Failed"}
        </div>
      </div>

      <div className="run-grid">
        <div className="panel">
          <h3 className="panel-title">What the agent did</h3>
          <ol className="timeline">
            {run.steps.map((s, i) => <Step key={i} step={s} />)}
            {run.status === "running" && (
              <li className="step-item pending"><div className="step-title muted">Waiting for the model...</div></li>
            )}
          </ol>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Tailored resume</h3>
            {run.status !== "running" && <button className="btn-secondary small" onClick={copy}>{copied ? "Copied" : "Copy text"}</button>}
          </div>
          {edits.length > 0 && (
            <div className="edit-list">
              {edits.map((e, i) => (
                <div key={i} className="edit">
                  <div className="edit-meta">{e.lines} <Delta value={e.change} /></div>
                  <div className="edit-before">{e.before}</div>
                  <div className="edit-after">{e.after}</div>
                </div>
              ))}
            </div>
          )}
          <pre className="draft">{run.draft}</pre>
          <p className="muted small">Review every edit before using it. Replace placeholders like [X%] with real numbers.</p>
        </div>
      </div>
    </div>
  );
}

function Agent({ params }) {
  const [matches, setMatches] = useState(null);
  const [runs, setRuns] = useState([]);
  const [matchId, setMatchId] = useState(params.match || "");
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    listMatches()
      .then((m) => {
        setMatches(m);
        if (!params.match && m.length) setMatchId(String(m[0].id));
      })
      .catch((err) => setError(err.message));
    listAgentRuns().then(setRuns).catch(() => {});
    return () => clearTimeout(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the run until the agent finishes
  const follow = (id) => {
    clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        const r = await getAgentRun(id);
        setRun(r);
        if (r.status === "running") pollRef.current = setTimeout(tick, POLL_MS);
        else listAgentRuns().then(setRuns).catch(() => {});
      } catch (err) {
        setError(err.message);
      }
    };
    tick();
  };

  const start = async () => {
    setError("");
    setStarting(true);
    try {
      const r = await startAgentRun(Number(matchId));
      setRun(r);
      follow(r.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page agent-page">
      <aside className="dash-side">
        <h1 className="display page-title">Tailoring<br /><em>agent</em></h1>
        <p className="muted">
          An AI agent rewrites your resume for a job, one line at a time. After every edit it re-scores the
          resume and keeps only changes that help. It can't add skills you don't have.
        </p>

        <div className="panel agent-controls">
          <label className="field-label" htmlFor="match-select">Saved match</label>
          {matches && matches.length === 0 ? (
            <p className="muted small">No saved matches yet. <a href="#/match" className="link">Run a match first</a>.</p>
          ) : (
            <select id="match-select" value={matchId} onChange={(e) => setMatchId(e.target.value)} disabled={!matches}>
              {(matches || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.resume_name} · {(m.jd_name || m.jd_snippet || "").slice(0, 34)} · {Math.round(m.score)}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn-primary"
            onClick={start}
            disabled={!matchId || starting || run?.status === "running"}
          >
            {run?.status === "running" ? <><span className="spinner" /> Running...</> : "Run agent"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        {runs.length > 0 && (
          <>
            <h4 className="side-label">Past runs</h4>
            <div className="month-items">
              {runs.slice(0, 8).map((r) => (
                <button key={r.id} className={`month-item run-item${run?.id === r.id ? " active" : ""}`} onClick={() => follow(r.id)}>
                  <span className="truncate">{r.resume_name}</span>
                  <span className="run-item-score">
                    {Math.round(r.start_score)} → {Math.round(r.end_score ?? r.start_score)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      <div className="dash-main">
        {run ? (
          <RunView run={run} />
        ) : (
          <div className="panel empty">
            <h2 className="display">Pick a match and <em>run</em> the agent</h2>
            <p className="muted">You'll see every step it takes, every edit it keeps and every one it rejects.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Agent;
