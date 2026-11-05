import React, { useEffect, useState } from "react";
import Logo from "./Logo";

export const PAGES = [
  { route: "home", label: "home", blurb: "Start here" },
  { route: "match", label: "new match", blurb: "Score a resume against a job" },
  { route: "agent", label: "agent", blurb: "Let AI tailor a resume to a job" },
  { route: "dashboard", label: "dashboard", blurb: "Trends across every match" },
  { route: "history", label: "history", blurb: "Every saved resume and job" },
];

const href = (route) => (route === "home" ? "#/" : `#/${route}`);

function Nav({ route }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu on navigation and lock page scroll while it's open
  useEffect(() => setMenuOpen(false), [route]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header className={`nav${menuOpen ? " menu-open" : ""}`}>
        <a href="#/" className="nav-logo" aria-label="Resume Matcher home"><Logo /></a>
        <nav className="nav-links">
          {PAGES.slice(1).map((p) => (
            <a key={p.route} href={href(p.route)} className={route === p.route ? "active" : ""}>
              {p.label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          <a href="#/match" className="pill pill-solid nav-cta">New match</a>
          <button
            className={`menu-btn${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span /><span />
          </button>
        </div>
      </header>

      <div className={`menu-page${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <svg className="arcs" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-100 700 C 300 300, 900 300, 1300 700" />
          <path d="M-100 820 C 350 420, 850 420, 1300 820" />
        </svg>
        <ol className="menu-list">
          {PAGES.map((p, i) => (
            <li key={p.route} style={{ transitionDelay: menuOpen ? `${80 + i * 60}ms` : "0ms" }}>
              <a href={href(p.route)} className={route === p.route ? "active" : ""} tabIndex={menuOpen ? 0 : -1}>
                <span className="menu-num">0{i + 1}</span>
                <span className="menu-label">{p.label}</span>
                <span className="menu-blurb">{p.blurb}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="menu-foot">
          Runs locally · your resumes never leave this computer
        </p>
      </div>
    </>
  );
}

export default Nav;
