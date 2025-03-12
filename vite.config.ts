import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configure for large file uploads and WebAssembly
  optimizeDeps: {
    exclude: ["pyodide"], // Exclude pyodide from optimization
  },
  worker: {
    format: "iife", // Use IIFE format for workers to allow importScripts
  },
  build: {
    chunkSizeWarningLimit: 2000, // Increase the chunk size warning limit
    rollupOptions: {
      output: {
        manualChunks: {
          // Split into more manageable chunks
          vendor: ["react", "react-dom"],
          worker: ["./src/worker/ifcWorker.js"],
        },
      },
    },
  },
  server: {
    headers: {
      // Allow cross-origin isolation for SharedArrayBuffer
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
