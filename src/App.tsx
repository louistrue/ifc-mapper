import React, { useState, useRef, useEffect } from "react";
import MappingConfig from "./components/MappingConfig";
// We need to import the worker with the ?worker suffix
// The type annotation is needed to support the worker import
// @ts-expect-error - the worker import is not typed
import IfcWorker from "./worker/ifcWorker.js?worker";
import "./App.css";

interface MappingConfigState {
  [key: string]: string;
}

interface ProcessingResults {
  html_content: string;
  fixedIfcData: Uint8Array;
  filename: string;
  language_code?: string;
  available_languages?: string[];
}

interface WorkerErrorData {
  type: string;
  message: string;
  stack?: string;
  details?: string;
  errorType?: string;
}

function App() {
  const [workerStatus, setWorkerStatus] = useState<string>("");
  const [results, setResults] = useState<ProcessingResults | null>(null);
  const [error, setError] = useState<WorkerErrorData | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [mappingConfig, setMappingConfig] = useState<MappingConfigState>({});

  useEffect(() => {
    // Initialize the worker
    workerRef.current = new IfcWorker();

    // Set up the message handler
    workerRef.current.onmessage = (event) => {
      const { type, message, results, stack, details, errorType } = event.data;
      if (type === "progress") {
        setWorkerStatus(message);
        setError(null);
      } else if (type === "complete") {
        setResults(results);
        setWorkerStatus("Processing complete");
        setError(null);
      } else if (type === "error") {
        setWorkerStatus(`Error: ${message}`);
        setError({ type, message, stack, details, errorType });
        console.error("Worker error:", message, details || "");
      }
    };

    // Clean up the worker when the component unmounts
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setWorkerStatus("Reading file...");
      setError(null);
      setResults(null);
      const arrayBuffer = await file.arrayBuffer();

      if (workerRef.current) {
        workerRef.current.postMessage({
          arrayBuffer,
          fileName: file.name,
          language: "en", // Change as needed for different languages
          mappingConfig,
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setWorkerStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleMappingChange = (pset: string, targetField: string) => {
    setMappingConfig((prev) => ({ ...prev, [pset]: targetField }));
  };

  const handleDownload = () => {
    if (!results || !results.fixedIfcData) return;

    const blob = new Blob([results.fixedIfcData], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = results.filename || "fixed_model.ifc";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <header>
        <h1>IFC Data Mapper</h1>
        <p>
          Upload an IFC file and apply mapping configurations to standardize
          data
        </p>
      </header>

      <main>
        <section className="file-upload-section">
          <div className="file-input-container">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".ifc"
              id="ifc-file-input"
            />
            <label htmlFor="ifc-file-input">Select IFC File</label>
          </div>

          {workerStatus && (
            <div className={`status-container ${error ? "error-status" : ""}`}>
              <h3>Status:</h3>
              <p>{workerStatus}</p>
              {error && error.details && (
                <div className="error-details">
                  <h4>Error Details:</h4>
                  <pre>{error.details}</pre>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mapping-section">
          <MappingConfig
            onMappingChange={handleMappingChange}
            availablePsets={["CustomPset_Quantity", "CustomPset_Material"]}
          />
        </section>

        {results && (
          <section className="results-section">
            <h2>Preview Report</h2>
            <div
              className="preview-container"
              dangerouslySetInnerHTML={{ __html: results.html_content }}
            />
            <button className="download-button" onClick={handleDownload}>
              Download Fixed IFC
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
