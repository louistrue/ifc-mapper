import React from "react";
import { MappingMode } from "./utils/types";

interface SidebarProps {
  onAddNode: (nodeType: string, mode: MappingMode) => void;
  ifcClassesAvailable: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  onAddNode,
  ifcClassesAvailable,
}) => {
  // Define node categories with their buttons
  const nodeCategories = [
    {
      title: "Property Sets",
      buttons: [
        {
          label: "Source Property Set",
          onClick: () => onAddNode("source", MappingMode.PSET),
          icon: "📋",
        },
        {
          label: "Target Property Set",
          onClick: () => onAddNode("target", MappingMode.PSET),
          icon: "🎯",
        },
      ],
    },
    {
      title: "Properties",
      buttons: [
        {
          label: "Source Property",
          onClick: () => onAddNode("source", MappingMode.PROPERTY),
          icon: "🔹",
        },
        {
          label: "Target Property",
          onClick: () => onAddNode("target", MappingMode.PROPERTY),
          icon: "🔸",
        },
      ],
    },
    {
      title: "Quantities",
      buttons: [
        {
          label: "Source Quantity",
          onClick: () => onAddNode("quantitySource", MappingMode.QUANTITY),
          icon: "📏",
        },
        {
          label: "Target Quantity",
          onClick: () => onAddNode("quantityTarget", MappingMode.QUANTITY),
          icon: "📐",
        },
      ],
    },
    {
      title: "Classifications",
      buttons: [
        {
          label: "Source Classification",
          onClick: () =>
            onAddNode("classificationSource", MappingMode.CLASSIFICATION),
          icon: "🏷️",
        },
        {
          label: "Target Classification",
          onClick: () =>
            onAddNode("classificationTarget", MappingMode.CLASSIFICATION),
          icon: "🔖",
        },
      ],
    },
    {
      title: "Filters",
      buttons: [
        {
          label: "IFC Class Filter",
          onClick: () => onAddNode("ifcClass", MappingMode.IFC_CLASS),
          icon: "🔍",
          disabled: !ifcClassesAvailable,
        },
      ],
    },
  ];

  return (
    <div
      className="sidebar"
      style={{
        width: "220px",
        height: "100%",
        backgroundColor: "#333",
        color: "#fff",
        padding: "10px",
        overflowY: "auto",
        borderRight: "1px solid #555",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "15px",
          textAlign: "center",
          padding: "5px 0",
          borderBottom: "1px solid #555",
        }}
      >
        Node Palette
      </div>

      {nodeCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} style={{ marginBottom: "15px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              backgroundColor: "#444",
              padding: "5px 8px",
              borderRadius: "4px",
            }}
          >
            {category.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {category.buttons.map((button, buttonIndex) => (
              <button
                key={buttonIndex}
                onClick={button.onClick}
                disabled={button.disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 10px",
                  backgroundColor: button.disabled ? "#555" : "#4F46E5",
                  color: button.disabled ? "#999" : "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: button.disabled ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  opacity: button.disabled ? 0.6 : 1,
                }}
              >
                <span style={{ marginRight: "8px", fontSize: "16px" }}>
                  {button.icon}
                </span>
                {button.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          fontSize: "12px",
          color: "#aaa",
          marginTop: "20px",
          padding: "10px",
          borderTop: "1px solid #555",
          textAlign: "center",
        }}
      >
        Drag nodes onto the canvas and connect them to create mappings
      </div>
    </div>
  );
};

export default Sidebar;
