import React, { useMemo, useState } from "react";
import { scoreTone } from "./Result";

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const monthKey = (iso) => new Date(iso).toLocaleString(undefined, { month: "long", year: "numeric" });

// Catmull-Rom spline through points -> smooth SVG path (like the reference chart)
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function topSkills(matches, key, n = 6) {
  const counts = {};
  matches.forEach((m) => m[key].forEach((s) => (counts[s] = (counts[s] || 0) + 1)));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function StatCard({ label, value, sub, sub2, highlight }) {
  return (
    <div className="panel stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${highlight ? " accent" : ""}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
      {sub2 && <div className="stat-sub accent">{sub2}</div>}
    </div>
  );
}

function ScoreChart({ matches }) {
  const [show, setShow] = useState({ similarity: true, skills: true });
  const data = matches.slice(0, 12).reverse(); // oldest -> newest
  const W = 640, H = 260, L = 34, B = 26, T = 10;
  const step = (W - L) / data.length;
  const x = (i) => L + step * i + step / 2;
  const y = (v) => T + (H - T - B) * (1 - v / 100);

  const line = (key) =>
    smoothPath(data.map((m, i) => [x(i), y(m[key] ?? 0)]));

  const recent = avg(matches.slice(0, 5).map((m) => m.score));
  const before = matches.slice(5, 10);
  const delta = before.length ? recent - avg(before.map((m) => m.score)) : null;

  return (
    <div className="panel chart-card">
      <div className="chart-head">
        <div>
          <h3>Scores by match</h3>
          <div className="legend">
            <label><input type="checkbox" checked readOnly /> <span className="sw bar" /> Match score</label>
            <label>
              <input type="checkbox" checked={show.similarity} onChange={(e) => setShow({ ...show, similarity: e.target.checked })} />
              <span className="sw line1" /> Similarity
            </label>
            <label>
              <input type="checkbox" checked={show.skills} onChange={(e) => setShow({ ...show, skills: e.target.checked })} />
              <span className="sw line2" /> Skill coverage
            </label>
          </div>
        </div>
        {delta !== null && (
          <div className="chart-delta">
            <span>Last 5 matches vs the 5 before</span>
            <strong>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</strong>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Match scores chart">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 8} y={y(v) + 4} className="axis" textAnchor="end">{v}</text>
          </g>
        ))}
        {data.map((m, i) => (
          <g key={m.id}>
            <rect
              x={x(i) - step * 0.34}
              y={y(m.score)}
              width={step * 0.68}
              height={y(0) - y(m.score)}
              rx="3"
              className="bar-rect"
            >
              <title>{`${m.resume_name}: ${Math.round(m.score)}`}</title>
            </rect>
            <text x={x(i)} y={H - 6} className="axis" textAnchor="middle">#{m.id}</text>
          </g>
        ))}
        {show.similarity && <path d={line("semantic_score")} className="line1" />}
        {show.skills && <path d={line("skill_score")} className="line2" />}
      </svg>
    </div>
  );
}

function SkillBars({ title, items, kind }) {
  const max = items.length ? items[0][1] : 1;
  return (
    <div className="panel skill-bars">
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted small">Nothing yet.</p>}
      {items.map(([skill, n]) => (
        <div key={skill} className="skill-bar">
          <div className="skill-bar-row">
            <span>{skill}</span>
            <span className="dots" />
            <span className="num">{n}</span>
          </div>
          <div className="skill-bar-track"><div className={`skill-bar-fill ${kind}`} style={{ width: `${(n / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function MonthList({ matches }) {
  const months = useMemo(() => {
    const groups = [];
    matches.forEach((m) => {
      const key = monthKey(m.created_at);
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, items: [] }));
      g.items.push(m);
    });
    return groups;
  }, [matches]);
  const [open, setOpen] = useState(months[0]?.key);

  return (
    <div className="month-list">
      {months.map((g) => {
        const isOpen = open === g.key;
        return (
          <div key={g.key} className={`panel month${isOpen ? " open" : ""}`}>
            <button className="month-head" onClick={() => setOpen(isOpen ? null : g.key)}>
              <span>{g.key}</span>
              <span className="month-toggle">{isOpen ? "×" : "+"}</span>
            </button>
            {isOpen && (
              <div className="month-body">
                <div className="dotted-row"><span>Matches</span><span className="dots" /><span>{g.items.length}</span></div>
                <div className="dotted-row"><span>Average score</span><span className="dots" /><span>{Math.round(avg(g.items.map((m) => m.score)))}</span></div>
                <div className="dotted-row"><span>Best score</span><span className="dots" /><span>{Math.round(Math.max(...g.items.map((m) => m.score)))}</span></div>
                <div className="month-items">
                  {g.items.slice(0, 5).map((m) => (
                    <a key={m.id} href="#/history" className="month-item">
                      <span className="truncate">{m.resume_name}</span>
                      <span className={`pill-score ${scoreTone(m.score)}`}>{Math.round(m.score)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dashboard({ matches, error }) {
  if (error) return <div className="page"><div className="panel notice"><p>{error}</p></div></div>;
  if (!matches) return <div className="page"><p className="muted">Loading dashboard...</p></div>;

  if (matches.length === 0) {
    return (
      <div className="page">
        <div className="panel empty">
          <h2 className="display">Nothing to <em>report</em> yet</h2>
          <p className="muted">Save a few matches and your dashboard will fill in.</p>
          <a href="#/match" className="pill pill-light">Run your first match →</a>
        </div>
      </div>
    );
  }

  const scores = matches.map((m) => m.score);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const thisWeek = matches.filter((m) => new Date(m.created_at).getTime() >= weekAgo);
  const best = matches.reduce((a, b) => (b.score > a.score ? b : a));
  const withTips = matches.filter((m) => m.suggestions).length;

  return (
    <div className="page dashboard">
      <aside className="dash-side">
        <h1 className="display page-title">Matches<br />report</h1>
        <p className="muted">How your resumes are scoring across every saved job description.</p>
        <h4 className="side-label">By month</h4>
        <MonthList matches={matches} />
      </aside>

      <div className="dash-main">
        <div className="stat-grid">
          <StatCard
            label="Total matches"
            value={matches.length}
            sub={`This week : ${thisWeek.length}`}
            sub2={`With AI suggestions : ${withTips}`}
            highlight
          />
          <StatCard
            label="Average score"
            value={Math.round(avg(scores))}
            sub={`Similarity : ${Math.round(avg(matches.map((m) => m.semantic_score)))}`}
            sub2={`Skill coverage : ${Math.round(avg(matches.filter((m) => m.skill_score !== null).map((m) => m.skill_score)))}%`}
          />
          <StatCard
            label="Best match"
            value={Math.round(best.score)}
            sub={best.resume_name}
            sub2={(best.jd_name || best.jd_snippet || "").slice(0, 34)}
            highlight
          />
        </div>

        <ScoreChart matches={matches} />

        <div className="skill-grid">
          <SkillBars title="Most often missing" items={topSkills(matches, "missing_skills")} kind="missing" />
          <SkillBars title="Strongest skills" items={topSkills(matches, "matched_skills")} kind="match" />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
