import React, { useState } from "react";
import FileUpload from "./FileUpload";
import Result from "./Result";

function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="container" style={{ textAlign: "center", marginTop: "50px" }}>
      <h1 style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
        <img
          src={`${process.env.PUBLIC_URL}/icon.webp`}
          alt="icon"
          style={{ width: "40px", height: "40px" }}
        />
        Resume Matcher
      </h1>
      <div style={{ marginTop: "20px" }}>
        <FileUpload setResult={setResult} />
        {result && <Result data={result} />}
      </div>
    </div>
  );
}

export default App;
