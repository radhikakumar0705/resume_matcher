import React from "react";

function Result({ data }) {
  // Guard clause just in case data is empty
  if (!data) return null;

  return (
    <div className="result">
      <h2>Match Result</h2>

      <div className="result-item">
        <strong>Match Score:</strong>
        <span className="score-badge">{data.score}%</span>
      </div>

      <div className="result-item">
        <strong>Similarity:</strong> {data.semantic_score}%
      </div>

      {data.skill_score !== null && (
        <div className="result-item">
          <strong>Skill Coverage:</strong> {data.skill_score}%
        </div>
      )}

      <div className="result-item">
        <strong>Matched Skills:</strong>
        <div style={{ display: 'inline-block', marginTop: '5px' }}>
          {data.matched_skills && data.matched_skills.length > 0 ? (
            data.matched_skills.map((skill, index) => (
              <span key={index} className="tag match">{skill}</span>
            ))
          ) : (
            <span style={{ color: '#64748b' }}>None</span>
          )}
        </div>
      </div>

      <div className="result-item">
        <strong>Missing Skills:</strong>
        <div style={{ display: 'inline-block', marginTop: '5px' }}>
          {data.missing_skills && data.missing_skills.length > 0 ? (
            data.missing_skills.map((skill, index) => (
              <span key={index} className="tag missing">{skill}</span>
            ))
          ) : (
            <span style={{ color: '#34d399' }}>None! Perfect match.</span>
          )}
        </div>
      </div>

      {data.ai_tips && (
        <div className="ai-tips">
          <h3>AI Resume Tips</h3>
          <p>{data.ai_tips}</p>
        </div>
      )}
    </div>
  );
}

export default Result;
