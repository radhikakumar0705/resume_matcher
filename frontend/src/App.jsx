import React, { useEffect, useRef, useState } from "react";
import Nav from "./Nav";
import Home from "./Home";
import MatchForm from "./MatchForm";
import Result from "./Result";
import History from "./History";
import Dashboard from "./Dashboard";
import { listMatches } from "./api";
import { useRoute } from "./router";

function App() {
  const route = useRoute();
  const [matches, setMatches] = useState(null);
  const [matchesError, setMatchesError] = useState("");
  const [result, setResult] = useState(null);
  const [resultKey, setResultKey] = useState(0);
  const resultRef = useRef(null);

  // Home and dashboard read the saved matches; refresh whenever they're shown
  useEffect(() => {
    if (route !== "home" && route !== "dashboard") return;
    listMatches()
      .then((m) => { setMatches(m); setMatchesError(""); })
      .catch((err) => setMatchesError(err.message));
  }, [route]);

  const handleResult = (data) => {
    setResult(data);
    setResultKey((k) => k + 1); // fresh suggestions panel per match
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const scores = (matches || []).map((m) => m.score);
  const stats = {
    total: scores.length,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    best: scores.length ? Math.round(Math.max(...scores)) : 0,
  };

  let page;
  if (route === "match") {
    page = (
      <div className="page">
        <div className="page-head">
          <h1 className="display page-title">New <em>match</em></h1>
          <p className="muted">Add a resume and a job description. The score takes a few seconds; AI suggestions follow.</p>
        </div>
        <MatchForm onResult={handleResult} />
        {result && (
          <div ref={resultRef} className="result-section">
            <Result key={resultKey} data={result} />
          </div>
        )}
      </div>
    );
  } else if (route === "dashboard") {
    page = <Dashboard matches={matches} error={matchesError} />;
  } else if (route === "history") {
    page = (
      <div className="page">
        <div className="page-head">
          <h1 className="display page-title">History</h1>
          <p className="muted">Every saved resume and job description. Click a row for the full result.</p>
        </div>
        <History />
      </div>
    );
  } else {
    page = <Home stats={stats} />;
  }

  return (
    <div className="app">
      <Nav route={route} />
      <main>{page}</main>
    </div>
  );
}

export default App;
