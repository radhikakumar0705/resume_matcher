import React, { useState } from "react";

function FileUpload({ setResult }) {
  const [resume, setResume] = useState(null);
  const [jd, setJd] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume && !jd && !jobDescription) {
      alert("Please upload a resume or provide a job description.");
      return;
    }

    const formData = new FormData();
    if (resume) formData.append("resumes", resume);
    if (jd) formData.append("job_description_file", jd);
    if (jobDescription) formData.append("job_description", jobDescription);

    try {
      const res = await fetch("http://127.0.0.1:5000/match", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data[0]);
    } catch (err) {
      console.error(err);
      alert("Error contacting server");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <div>
        <label>Resume PDF:</label>
        <input type="file" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} />
      </div>
      <div>
        <label>Job description PDF:</label>
        <input type="file" accept=".pdf" onChange={(e) => setJd(e.target.files[0])} />
      </div>
      <div>
        <label>Or paste job description:</label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>
      <button type="submit">Match Resume</button>
    </form>
  );
}

export default FileUpload;
