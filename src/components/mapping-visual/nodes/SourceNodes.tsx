import { Handle, Position, NodeProps } from "reactflow";

// Source node for properties
export const SourceNode = ({ data }: NodeProps) => (
  <div
    className="custom-node source-node"
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
    }}
  >
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-blue-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
      Source
    </div>

    {/* Input handle for IFC class filter connections */}
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#22C55E", // Green color to match IFC class filter
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />

    {/* Output handle for mapping connections */}
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{
        background: "#4F46E5",
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />
  </div>
);

// Quantity node with unit information
export const QuantitySourceNode = ({ data }: NodeProps) => (
  <div
    className="custom-node source-node"
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
    }}
  >
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-blue-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
      Quantity {data.unit && `(${data.unit})`}
    </div>

    {/* Input handle for IFC class filter connections */}
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#22C55E", // Green color to match IFC class filter
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />

    {/* Output handle for mapping connections */}
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{
        background: "#4F46E5",
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />
  </div>
);

// Classification nodes
export const ClassificationSourceNode = ({ data }: NodeProps) => (
  <div
    className="custom-node source-node"
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
    }}
  >
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-blue-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
      {data.type} Classification
    </div>

    {/* Input handle for IFC class filter connections */}
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#22C55E", // Green color to match IFC class filter
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />

    {/* Output handle for mapping connections */}
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{
        background: "#4F46E5",
        width: "10px",
        height: "10px",
        border: "2px solid #e8e8d8",
      }}
    />
  </div>
);
