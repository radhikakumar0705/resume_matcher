import React, { useState } from "react";
import Dropzone from "./Dropzone";
import { matchResume } from "./api";

function MatchForm({ onResult }) {
  const [resume, setResume] = useState(null);
  const [jdMode, setJdMode] = useState("paste"); // "paste" | "upload"
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [save, setSave] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const jdReady = jdMode === "paste" ? jdText.trim().length > 0 : !!jdFile;
  const ready = !!resume && jdReady;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!resume) return setError("Add a resume PDF first.");
    if (!jdReady) return setError("Add the job description: paste it or upload a PDF.");

    const formData = new FormData();
    formData.append("resumes", resume);
    if (jdMode === "upload") formData.append("job_description_file", jdFile);
    else formData.append("job_description", jdText);
    formData.append("save", save ? "true" : "false");

    setLoading(true);
    try {
      onResult(await matchResume(formData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel match-form">
      <div className="form-grid">
        <section>
          <h3 className="step"><span className="step-num">1</span> Resume</h3>
          <Dropzone
            file={resume}
            onFile={setResume}
            label="Drop your resume here"
            hint="or click to browse · PDF up to 10 MB"
          />
        </section>

        <section>
          <div className="step-row">
            <h3 className="step"><span className="step-num">2</span> Job description</h3>
            <div className="segmented" role="tablist">
              <button type="button" className={jdMode === "paste" ? "active" : ""} onClick={() => setJdMode("paste")}>
                Paste text
              </button>
              <button type="button" className={jdMode === "upload" ? "active" : ""} onClick={() => setJdMode("upload")}>
                Upload PDF
              </button>
            </div>
          </div>
          {jdMode === "paste" ? (
            <textarea
              className="jd-text"
              placeholder="Paste the job title, responsibilities and requirements..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          ) : (
            <Dropzone
              file={jdFile}
              onFile={setJdFile}
              label="Drop the job description here"
              hint="or click to browse · PDF"
            />
          )}
        </section>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-footer">
        <label className="switch">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span className="switch-track" />
          <span>Save to history</span>
        </label>
        <button type="submit" className="btn-primary" disabled={loading || !ready}>
          {loading ? <><span className="spinner" /> Analyzing...</> : "Match resume"}
        </button>
      </div>
    </form>
  );
}

export default MatchForm;
