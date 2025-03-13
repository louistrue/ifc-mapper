"use client";

import React from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import FlowWithFullWidth from "./FlowWithFullWidth";
import { MappingVisualProps } from "./utils/types";

/**
 * MappingVisual component provides a visual interface for mapping IFC properties
 * between source and target schemas.
 */
const MappingVisual = (props: MappingVisualProps) => {
  // Debug output
  console.log("MappingVisual render with:", {
    sourcePsets: props.sourcePsets,
    targetPsets: props.targetPsets,
    currentMappings: props.currentMappings,
    ifcClasses: props.ifcClasses,
  });

  return (
    <ReactFlowProvider>
      <div
        style={{
          width: "100%",
          height: "100%",
          margin: "0",
          border: "1px solid #555",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
          backgroundColor: "#f5f5f0", // Retro paper color
        }}
      >
        <FlowWithFullWidth {...props} />
      </div>
    </ReactFlowProvider>
  );
};

export default MappingVisual;
