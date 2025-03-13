import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { IfcClassNodeItem } from "../utils/types";

// IFC Class Selection Node
export const IfcClassNode = ({ data }: NodeProps<IfcClassNodeItem>) => {
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    data.selectedClasses || []
  );
  const [isOpen, setIsOpen] = useState(false);

  // Update the node data when selection changes
  useEffect(() => {
    if (
      data.onClassesSelected &&
      JSON.stringify(selectedClasses) !== JSON.stringify(data.selectedClasses)
    ) {
      data.onClassesSelected(selectedClasses);
    }
  }, [selectedClasses, data]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const toggleClass = (ifcClass: string) => {
    if (selectedClasses.includes(ifcClass)) {
      setSelectedClasses(selectedClasses.filter((c) => c !== ifcClass));
    } else {
      setSelectedClasses([...selectedClasses, ifcClass]);
    }
  };

  return (
    <div
      className="custom-node ifc-class-node"
      style={{
        width: "220px",
        padding: "6px",
        margin: "3px",
        background: "#e8e8d8",
        color: "#333",
        borderRadius: "4px",
        border: "1px solid #555",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        transition: "all 0.2s ease",
        zIndex: isOpen ? 10 : 1,
      }}
    >
      <div className="font-medium text-sm truncate">{data.label}</div>
      <div className="text-xs text-green-600 flex items-center mt-1">
        <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1"></span>
        IFC Class Filter
      </div>

      <div className="mt-2">
        <button
          onClick={toggleDropdown}
          className="w-full text-left px-2 py-1 text-xs bg-white bg-opacity-50 rounded border border-gray-300 flex justify-between items-center"
        >
          <span>
            {selectedClasses.length === 0
              ? "Select IFC Classes"
              : `${selectedClasses.length} class(es) selected`}
          </span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen && data.availableClasses && (
          <div
            className="absolute mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-10"
            style={{ width: "210px" }}
          >
            {data.availableClasses.map((ifcClass) => (
              <div
                key={ifcClass}
                className="px-2 py-1 text-xs hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => toggleClass(ifcClass)}
              >
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(ifcClass)}
                  onChange={() => {}}
                  className="mr-2"
                />
                {ifcClass}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: "#22C55E", // Green color for IFC class nodes
          width: "10px",
          height: "10px",
          border: "2px solid #e8e8d8",
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: "#22C55E", // Green color for IFC class nodes
          width: "10px",
          height: "10px",
          border: "2px solid #e8e8d8",
        }}
      />
    </div>
  );
};
