import React, { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function FileUpload({ setResult }) {
  const [resume, setResume] = useState(null);
  const [jd, setJd] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!resume) {
      setError("Please upload a resume PDF.");
      return;
    }
    if (!jd && !jobDescription.trim()) {
      setError("Please upload a job description PDF or paste one.");
      return;
    }

    const formData = new FormData();
    formData.append("resumes", resume);
    if (jd) formData.append("job_description_file", jd);
    if (jobDescription.trim()) formData.append("job_description", jobDescription);

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/match`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Server error (${res.status})`);
        return;
      }
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <div className="form-group">
        <label>Resume PDF</label>
        <input type="file" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} />
      </div>
      <div className="form-group">
        <label>Job Description PDF</label>
        <input type="file" accept=".pdf" onChange={(e) => setJd(e.target.files[0])} />
      </div>
      <div className="form-group">
        <label>Or Paste Job Description</label>
        <textarea
          placeholder="Paste the job requirements here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Matching..." : "Match Resume"}
      </button>
    </form>
  );
}

export default FileUpload;
