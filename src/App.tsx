import React, { useState, useRef, useEffect } from "react";
import MappingVisual from "./components/MappingVisual";
// We need to import the worker with the ?worker suffix
import IfcWorker from "./worker/ifcWorker.js?worker";
import "./App.css";

interface MappingConfigState {
  [key: string]: string;
}

interface ModelInfo {
  pset_names: string[];
  quantity_names: string[];
  standard_psets: string[];
  standard_quantities: string[];
  element_types: string[];
}

interface ProcessingResults {
  fixedIfcData: Uint8Array;
  filename: string;
  modelInfo: ModelInfo;
  changesMade: number;
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
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    // Initialize the worker
    workerRef.current = new IfcWorker();

    // Set up the message handler
    workerRef.current.onmessage = (event) => {
      const { type, message, results, stack, details, errorType } = event.data;
      if (type === "progress") {
        setWorkerStatus(message);
        setError(null);
        setIsProcessing(true);
      } else if (type === "complete") {
        setResults(results);
        setModelInfo(results.modelInfo);
        setWorkerStatus(
          `Processing complete. ${results.changesMade} changes made.`
        );
        setError(null);
        setIsProcessing(false);
      } else if (type === "error") {
        setWorkerStatus(`Error: ${message}`);
        setError({ type, message, stack, details, errorType });
        console.error("Worker error:", message, details || "");
        setIsProcessing(false);
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
      setSelectedFile(file);
      setModelInfo(null);
      setIsProcessing(true);
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
      setIsProcessing(false);
    }
  };

  const applyMapping = () => {
    if (!selectedFile) return;

    try {
      setWorkerStatus("Applying mapping configuration...");
      setError(null);
      setIsProcessing(true);

      selectedFile.arrayBuffer().then((arrayBuffer) => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            arrayBuffer,
            fileName: selectedFile.name,
            language: "en",
            mappingConfig,
          });
        }
      });
    } catch (error) {
      console.error("Error applying mapping:", error);
      setWorkerStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (sourcePset: string, targetPset: string) => {
    setMappingConfig((prev) => {
      // If targetPset is empty, remove the mapping
      if (!targetPset) {
        const newConfig = { ...prev };
        delete newConfig[sourcePset];
        return newConfig;
      }

      return { ...prev, [sourcePset]: targetPset };
    });
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
    <div
      className="app-container"
      style={{
        backgroundColor: "#e0e0d0",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "'Courier New', monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top navigation bar with title and file selection */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          backgroundColor: "#555",
          color: "#fff",
          borderRadius: "8px",
          marginBottom: "10px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          height: "50px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              margin: 0,
              fontFamily: "'Courier New', monospace",
            }}
          >
            IFC Data Mapper
          </h1>
          <span
            style={{
              fontSize: "0.7rem",
              margin: "0 0 0 10px",
              opacity: 0.8,
              borderLeft: "1px solid #777",
              paddingLeft: "10px",
            }}
          >
            Map custom property sets to standard IFC property sets
          </span>
        </div>

        {/* File selection button in header */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "inline-block",
          }}
        >
          <button
            style={{
              backgroundColor: "#e8e8d8",
              color: "#333",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
            }}
          >
            {selectedFile ? "SELECT DIFFERENT FILE" : "SELECT IFC FILE"}
          </button>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".ifc"
            style={{
              position: "absolute",
              fontSize: "100px",
              opacity: "0",
              right: "0",
              top: "0",
              cursor: "pointer",
            }}
          />
        </div>
      </header>

      <main
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          gap: "15px",
          height: "calc(100vh - 90px)",
        }}
      >
        {/* Main content area - takes up most of the space */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            gap: "15px",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {!modelInfo ? (
            !isProcessing ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#f5f5f0",
                  borderRadius: "8px",
                  border: "2px solid #555",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                  background:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#e8e8d8",
                    padding: "30px",
                    borderRadius: "8px",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    border: "1px solid #555",
                    maxWidth: "80%",
                  }}
                >
                  <h2
                    style={{
                      marginBottom: "20px",
                      color: "#333",
                      fontFamily: "'Courier New', monospace",
                      fontSize: "1.5rem",
                    }}
                  >
                    Select IFC File to Begin
                  </h2>
                  <p style={{ marginBottom: "20px", color: "#555" }}>
                    Upload an IFC file to analyze its structure and create
                    property mappings
                  </p>
                  <div
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      display: "inline-block",
                      cursor: "pointer",
                    }}
                  >
                    <button
                      style={{
                        backgroundColor: "#555",
                        color: "#fff",
                        border: "none",
                        padding: "12px 24px",
                        borderRadius: "4px",
                        fontSize: "16px",
                        cursor: "pointer",
                        fontFamily: "'Courier New', monospace",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      SELECT IFC FILE
                    </button>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".ifc"
                      style={{
                        position: "absolute",
                        fontSize: "100px",
                        opacity: "0",
                        right: "0",
                        top: "0",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Show central console when processing but no model info yet
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#f5f5f0",
                  borderRadius: "8px",
                  border: "2px solid #555",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#222",
                    color: "#33ff33",
                    fontFamily: "'Courier New', monospace",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    border: "2px solid #444",
                    width: "500px",
                    maxWidth: "80%",
                    transition: "all 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                      borderBottom: "1px solid #444",
                      paddingBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#33ff33",
                        marginRight: "8px",
                      }}
                    ></div>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                      SYSTEM STATUS
                    </span>
                  </div>
                  <div style={{ overflowY: "auto", flexGrow: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.5,
                        fontSize: "14px",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {workerStatus || "Processing..."}
                    </p>
                    {error && (
                      <div
                        style={{
                          marginTop: "10px",
                          color: "#ff5555",
                          borderTop: "1px dashed #444",
                          paddingTop: "8px",
                          fontSize: "14px",
                        }}
                      >
                        <p style={{ margin: 0 }}>ERROR: {error.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <>
              <section
                className="mapping-section"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ flexGrow: 1, minHeight: 0 }}>
                  <MappingVisual
                    sourcePsets={modelInfo.pset_names}
                    targetPsets={modelInfo.standard_psets}
                    currentMappings={mappingConfig}
                    onMappingUpdate={handleMappingChange}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "10px",
                    gap: "15px",
                  }}
                >
                  <div style={{ flex: 1 }}></div>
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Console-like status display - positioned at the bottom right */}
                    <div
                      style={{
                        backgroundColor: "#222",
                        color: "#33ff33",
                        fontFamily: "'Courier New', monospace",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        border: "2px solid #444",
                        width: "300px",
                        maxHeight: "120px",
                        transition: "all 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                        marginRight: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "4px",
                          borderBottom: "1px solid #444",
                          paddingBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#33ff33",
                            marginRight: "6px",
                          }}
                        ></div>
                        <span style={{ fontWeight: "bold", fontSize: "10px" }}>
                          SYSTEM STATUS
                        </span>
                      </div>
                      <div style={{ overflowY: "auto", flexGrow: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            lineHeight: 1.3,
                            fontSize: "11px",
                            fontFamily: "'Courier New', monospace",
                          }}
                        >
                          {workerStatus || "Ready. Awaiting IFC file input."}
                        </p>
                        {error && (
                          <div
                            style={{
                              marginTop: "6px",
                              color: "#ff5555",
                              borderTop: "1px dashed #444",
                              paddingTop: "4px",
                              fontSize: "11px",
                            }}
                          >
                            <p style={{ margin: 0 }}>ERROR: {error.message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={applyMapping}
                      disabled={
                        Object.keys(mappingConfig).length === 0 || isProcessing
                      }
                      style={{
                        backgroundColor:
                          Object.keys(mappingConfig).length === 0 ||
                          isProcessing
                            ? "#999"
                            : "#555",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontSize: "14px",
                        cursor:
                          Object.keys(mappingConfig).length === 0 ||
                          isProcessing
                            ? "not-allowed"
                            : "pointer",
                        fontFamily: "'Courier New', monospace",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      APPLY MAPPING
                    </button>

                    {results && results.changesMade > 0 && (
                      <button
                        onClick={handleDownload}
                        style={{
                          backgroundColor: "#555",
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          cursor: "pointer",
                          fontFamily: "'Courier New', monospace",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        DOWNLOAD FIXED IFC
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
