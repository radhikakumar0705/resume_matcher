import React from "react";

function Result({ data }) {
  return (
    <div className="result">
      <h2>Match Result</h2>
      <p><strong>Score:</strong> {data.score}</p>
      <p><strong>Matched Skills:</strong> {data.matched_skills.join(", ")}</p>
      <p><strong>Missing Skills:</strong> {data.missing_skills.join(", ")}</p>
    </div>
  );
}

export default Result;
