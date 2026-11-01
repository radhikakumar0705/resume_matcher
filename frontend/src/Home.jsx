import React from "react";

const STEPS = [
  {
    title: "Upload",
    text: "Drop in a resume PDF and paste or upload the job description.",
  },
  {
    title: "Score",
    text: "Get a match score from content similarity and skill coverage, with matched and missing skills.",
  },
  {
    title: "Improve",
    text: "A local AI model suggests specific edits to make the resume a stronger fit.",
  },
];

function Home({ stats }) {
  return (
    <div className="home">
      <section className="hero">
        <svg className="arcs" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-60 120 C 250 140, 420 300, 520 520" />
          <path d="M1260 120 C 950 140, 780 300, 680 520" />
          <path d="M-60 360 C 200 330, 380 420, 440 520" />
          <path d="M1260 360 C 1000 330, 820 420, 760 520" />
        </svg>
        <h1 className="display">
          <em>Together</em>, we turn<br />resumes into <em>offers</em>.
        </h1>
        <p className="hero-sub">
          Match any resume to any job in seconds, see exactly which skills are missing,
          and get AI suggestions to close the gap.
        </p>
        <a href="#/match" className="pill pill-light pill-lg">Match a resume <span aria-hidden="true">→</span></a>
      </section>

      {stats.total > 0 && (
        <section className="stat-strip">
          <div><span className="stat-big">{stats.total}</span><span className="stat-cap">resumes matched</span></div>
          <div><span className="stat-big">{stats.avg}</span><span className="stat-cap">average score</span></div>
          <div><span className="stat-big">{stats.best}</span><span className="stat-cap">best match</span></div>
          <a href="#/dashboard" className="pill">Open dashboard →</a>
        </section>
      )}

      <section className="steps">
        <h2 className="display section-title">How it <em>works</em></h2>
        <div className="step-cards">
          {STEPS.map((s, i) => (
            <div key={s.title} className="panel step-card">
              <span className="step-index">0{i + 1}</span>
              <h3 className="display">{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
