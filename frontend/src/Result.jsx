import React from "react";
import Suggestions from "./Suggestions";

export const scoreTone = (score) => (score >= 70 ? "good" : score >= 45 ? "ok" : "low");

const VERDICT = {
  good: "Strong match",
  ok: "Partial match",
  low: "Weak match",
};

function ScoreRing({ score }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(score, 100) / 100);
  return (
    <div className={`score-ring ${scoreTone(score)}`}>
      <svg viewBox="0 0 120 120" width="140" height="140">
        <circle cx="60" cy="60" r={r} className="ring-bg" />
        <circle
          cx="60" cy="60" r={r}
          className="ring-fg"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-value">
        <span>{Math.round(score)}</span>
        <small>/ 100</small>
      </div>
    </div>
  );
}

function Bar({ label, value, hint }) {
  return (
    <div className="bar" title={hint}>
      <div className="bar-label">
        <span>{label}</span>
        <span>{value === null ? "n/a" : `${Math.round(value)}%`}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value || 0}%` }} />
      </div>
    </div>
  );
}

function SkillChips({ skills, kind, empty }) {
  if (!skills || skills.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <div className="chips">
      {skills.map((s) => (
        <span key={s} className={`chip ${kind}`}>{s}</span>
      ))}
    </div>
  );
}

function Result({ data, onSuggestions }) {
  if (!data) return null;
  const tone = scoreTone(data.score);

  return (
    <div className="result-grid">
      <div className="panel result">
        <div className="score-block">
          <ScoreRing score={data.score} />
          <div>
            <div className={`verdict ${tone}`}>{VERDICT[tone]}</div>
            <p className="muted small">
              {data.resume_name || "Resume"}{data.jd_name ? ` vs ${data.jd_name}` : " vs pasted job description"}
            </p>
            <Bar label="Content similarity" value={data.semantic_score} hint="How closely the resume's content matches the job overall" />
            <Bar label="Skill coverage" value={data.skill_score} hint="Share of the job's skills found in the resume" />
          </div>
        </div>

        <div className="skills-block">
          <h4>Skills you have <span className="count">{data.matched_skills.length}</span></h4>
          <SkillChips skills={data.matched_skills} kind="match" empty="No skills from the job description found yet." />
          <h4>Missing skills <span className="count">{data.missing_skills.length}</span></h4>
          <SkillChips skills={data.missing_skills} kind="missing" empty="None. Every listed skill is covered." />
        </div>
      </div>

      <Suggestions match={data} onGenerated={onSuggestions} />
    </div>
  );
}

export default Result;
