import React, { useRef, useState } from "react";

// Click-or-drag PDF picker
function Dropzone({ file, onFile, label, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (f) => {
    if (f) onFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`dropzone${dragging ? " dragging" : ""}${file ? " has-file" : ""}`}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={(e) => pick(e.target.files[0])}
      />
      {file ? (
        <>
          <div className="dropzone-icon done">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="dropzone-title">{file.name}</div>
          <div className="dropzone-hint">{(file.size / 1024).toFixed(0)} KB · click to replace</div>
        </>
      ) : (
        <>
          <div className="dropzone-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          </div>
          <div className="dropzone-title">{label}</div>
          <div className="dropzone-hint">{hint}</div>
        </>
      )}
    </div>
  );
}

export default Dropzone;
