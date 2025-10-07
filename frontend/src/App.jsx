import React, { useState } from "react";
import FileUpload from "./FileUpload";
import Result from "./Result";

function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="container">
      <h1>Resume Matcher</h1>
      <FileUpload setResult={setResult} />
      {result && <Result data={result} />}
    </div>
  );
}

export default App;
