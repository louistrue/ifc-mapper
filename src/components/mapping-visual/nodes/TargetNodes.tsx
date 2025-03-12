import { Handle, Position, NodeProps } from "reactflow";

export const TargetNode = ({ data }: NodeProps) => (
  <div
    className="custom-node target-node"
    style={{
      width: "220px",
      padding: "6px",
      margin: "3px",
      background: "#d8d8c8",
      color: "#333",
      borderRadius: "4px",
      border: "1px solid #555",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      transition: "all 0.2s ease",
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#16A34A",
        width: "10px",
        height: "10px",
        border: "2px solid #d8d8c8",
      }}
    />
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-green-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
      Target
    </div>
  </div>
);

export const QuantityTargetNode = ({ data }: NodeProps) => (
  <div
    className="custom-node target-node"
    style={{
      width: "220px",
      padding: "6px",
      margin: "3px",
      background: "#d8d8c8",
      color: "#333",
      borderRadius: "4px",
      border: "1px solid #555",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      transition: "all 0.2s ease",
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#16A34A",
        width: "10px",
        height: "10px",
        border: "2px solid #d8d8c8",
      }}
    />
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-green-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
      Target {data.unit && `(${data.unit})`}
    </div>
  </div>
);

export const ClassificationTargetNode = ({ data }: NodeProps) => (
  <div
    className="custom-node target-node"
    style={{
      width: "220px",
      padding: "6px",
      margin: "3px",
      background: "#d8d8c8",
      color: "#333",
      borderRadius: "4px",
      border: "1px solid #555",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      transition: "all 0.2s ease",
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{
        background: "#16A34A",
        width: "10px",
        height: "10px",
        border: "2px solid #d8d8c8",
      }}
    />
    <div className="font-medium text-sm truncate">{data.label}</div>
    <div className="text-xs text-green-500 flex items-center mt-1">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
      Reference
    </div>
  </div>
);
