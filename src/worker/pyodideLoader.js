/* eslint-disable */
// This file provides a helper for loading Pyodide in different contexts
// It handles both classic workers and module workers

// URL to Pyodide CDN
const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full";

/**
 * Load Pyodide dynamically in the current context
 * This will work in both module and classic web workers
 */
export async function loadPyodideInstance() {
  // Check if we have Pyodide loaded globally (via importScripts in classic worker)
  if (typeof self.loadPyodide === "function") {
    return await self.loadPyodide({
      indexURL: `${PYODIDE_CDN_URL}/`,
    });
  }

  // If not, try to load as ES module for module workers
  try {
    // Import from CDN as a module
    const { loadPyodide } = await import(`${PYODIDE_CDN_URL}/pyodide.mjs`);
    return await loadPyodide({
      indexURL: `${PYODIDE_CDN_URL}/`,
    });
  } catch (err) {
    console.error("Failed to load Pyodide as ES module:", err);

    // Last chance, try loading it via a script tag with a fake DOM
    if (typeof document === "undefined") {
      // We'll inject a simple document polyfill in the worker scope
      self.document = {
        head: {
          appendChild: () => {},
        },
        createElement: (tag) => {
          return {
            src: "",
            onload: null,
            onerror: null,
          };
        },
      };
    }

    // Try loading the script programmatically
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PYODIDE_CDN_URL}/pyodide.js`;
      script.onload = async () => {
        try {
          // Now loadPyodide should be available in global scope
          const pyodide = await self.loadPyodide({
            indexURL: `${PYODIDE_CDN_URL}/`,
          });
          resolve(pyodide);
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = (e) => {
        reject(new Error("Failed to load Pyodide script"));
      };
      document.head.appendChild(script);
    });
  }
}
