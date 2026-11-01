import React, { useState } from "react";
import FileUpload from "./FileUpload";
import Result from "./Result";

function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="container">
      {/* Structural layout wrapping your app brand */}
      <div className="app-header">
        <img
          src={`${process.env.PUBLIC_URL}/icon.webp`}
          alt="App Icon"
          className="app-icon"
        />
        <h1 className="app-title">Resume Matcher</h1>
      </div>
      
      <div className="main-content">
        <FileUpload setResult={setResult} />
        {result && <Result data={result} />}
      </div>
    </div>
  );
}

export default App;