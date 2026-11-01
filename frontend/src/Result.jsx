import React from "react";

function Result({ data }) {
  return (
    <div className="result">
      <h2>Match Result</h2>
      <p><strong>Score:</strong> {data.score}</p>
      <p>
        <strong>Semantic similarity:</strong> {data.semantic_score}
        {data.skill_score !== null && (
          <> &middot; <strong>Skill coverage:</strong> {data.skill_score}%</>
        )}
      </p>
      <p><strong>Matched Skills:</strong> {data.matched_skills.join(", ") || "None"}</p>
      <p><strong>Missing Skills:</strong> {data.missing_skills.join(", ") || "None"}</p>
    </div>
  );
}

export default Result;
