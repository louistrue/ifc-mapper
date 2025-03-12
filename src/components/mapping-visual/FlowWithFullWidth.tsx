import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  addEdge,
  useEdgesState,
  useNodesState,
  ConnectionLineType,
  BackgroundVariant,
  useReactFlow,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

// Import node components
import {
  SourceNode,
  QuantitySourceNode,
  ClassificationSourceNode,
} from "./nodes/SourceNodes";
import {
  TargetNode,
  QuantityTargetNode,
  ClassificationTargetNode,
} from "./nodes/TargetNodes";

// Import utilities and types
import { MappingMode, MappingVisualProps, NodeItem } from "./utils/types";
import { createEdgesFromMappings, addExampleEdges } from "./utils/flowUtils";
import {
  properties,
  targetProperties,
  quantities,
  targetQuantities,
  classificationComponents,
  targetClassification,
} from "./utils/sampleData";

const FlowWithFullWidth = ({
  sourcePsets,
  targetPsets,
  currentMappings,
  onMappingUpdate,
}: MappingVisualProps) => {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // State for custom node creation
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [customNodeType, setCustomNodeType] = useState<"source" | "target">(
    "source"
  );
  const [customNodeMode, setCustomNodeMode] = useState<MappingMode>(
    MappingMode.PSET
  );
  const [customNodeLabel, setCustomNodeLabel] = useState("");
  const [customNodePset, setCustomNodePset] = useState("");
  const [addToGroup, setAddToGroup] = useState(true);

  // Update container width on mount and resize
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.getBoundingClientRect().width);
    }

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    };

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Define custom node types with improved styling
  const nodeTypes = useMemo(
    () => ({
      source: SourceNode,
      target: TargetNode,
      quantitySource: QuantitySourceNode,
      quantityTarget: QuantityTargetNode,
      classificationSource: ClassificationSourceNode,
      classificationTarget: ClassificationTargetNode,
      group: ({ data }: NodeProps) => (
        <div className="font-bold p-2 bg-white bg-opacity-30 rounded-lg text-sm">
          {data.label}
        </div>
      ),
    }),
    []
  );

  // Create nodes with a layout that avoids overlap
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // Calculate the usable height for the grid
    const canvasHeight = 1500; // Increased from 1200 to 1500 to fit more nodes

    // Define fixed coordinates for each section
    const gridSections = {
      [MappingMode.PSET]: {
        x: 20, // Moved further left to fit new width
        y: 50, // Fixed top position with padding
        width: 800, // Fixed width in pixels - same as other sections
        height: canvasHeight - 100, // Full height minus padding
      },
      [MappingMode.PROPERTY]: {
        x: 850, // Increased gap from PSET
        y: 50, // Fixed top position with padding
        width: 800, // Fixed width in pixels
        height: 400, // Increased height for more nodes
      },
      [MappingMode.QUANTITY]: {
        x: 850, // Increased gap from PSET
        y: 500, // Adjusted position based on increased PROPERTY height
        width: 800, // Fixed width in pixels
        height: 400, // Increased height for more nodes
      },
      [MappingMode.CLASSIFICATION]: {
        x: 850, // Increased gap from PSET
        y: 950, // Adjusted position based on increased QUANTITY height
        width: 800, // Fixed width in pixels
        height: 500, // Increased height for more nodes
      },
    };

    // Function to create section headers
    const createSectionHeader = (mode: MappingMode, title: string) => {
      const section = gridSections[mode];
      const backgroundColor = {
        [MappingMode.PSET]: "rgba(240, 240, 245, 0.8)",
        [MappingMode.PROPERTY]: "rgba(240, 245, 240, 0.8)",
        [MappingMode.QUANTITY]: "rgba(240, 245, 255, 0.8)",
        [MappingMode.CLASSIFICATION]: "rgba(255, 245, 240, 0.8)",
      }[mode];

      // Use fixed width based on node width - same for all groups
      const nodeWidth = 220; // Base node width
      const fixedWidth = nodeWidth * 3 + 100; // Same width for all groups

      // Position at the exact coordinates defined in gridSections
      return {
        id: `section-${mode}`,
        type: "group",
        data: { label: title },
        position: {
          x: section.x,
          y: section.y,
        },
        style: {
          width: fixedWidth,
          height: section.height,
          backgroundColor,
          borderRadius: "12px",
          padding: "15px",
          paddingTop: "20px",
          border: "1px solid #ccc",
          boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
          fontSize: "16px",
          fontWeight: "bold",
        },
        draggable: false,
        selectable: false,
      };
    };

    // Add section headers to the grid
    nodes.push(
      createSectionHeader(MappingMode.PROPERTY, "Property Mapping") as Node
    );
    nodes.push(
      createSectionHeader(MappingMode.QUANTITY, "Quantity Mapping") as Node
    );
    nodes.push(
      createSectionHeader(
        MappingMode.CLASSIFICATION,
        "Classification Mapping"
      ) as Node
    );
    nodes.push(
      createSectionHeader(MappingMode.PSET, "Property Set Mapping") as Node
    );

    // Helper function to calculate node positions within a grid cell
    const calculateNodePositions = (
      mode: MappingMode,
      sourceItems: Array<string | NodeItem>,
      targetItems: Array<string | NodeItem>,
      nodeCreator: (
        item: string | NodeItem,
        isSource: boolean,
        index: number,
        yPos: number
      ) => Node
    ) => {
      const sectionId = `section-${mode}`;

      // Define spacing constants
      const headerHeight = 40; // Space for the header
      const topPadding = 15; // Padding from the top
      const verticalSpacing = 15; // Reduced from 20 to 15 to fit more nodes
      const nodeHeight = 80; // Approximate height of a node with padding

      // Fixed node width
      const nodeWidth = 220;

      // Calculate group width (same for all groups)
      const groupWidth = nodeWidth * 3 + 100; // Same width for all groups

      // Calculate horizontal positions for source and target columns
      // For all groups, position at 1/4 and 3/4 of the width
      const sourceColumnX = groupWidth * 0.25 - nodeWidth / 2;
      const targetColumnX = groupWidth * 0.75 - nodeWidth / 2;

      // Source nodes layout - from top to bottom
      sourceItems.forEach((item, index) => {
        const yPosition =
          headerHeight + topPadding + (nodeHeight + verticalSpacing) * index;

        const node = nodeCreator(item, true, index, yPosition);

        // Add parentId and extent to keep nodes within their section
        node.parentId = sectionId;
        node.extent = "parent";

        // Add explicit styling to ensure nodes stay contained
        node.style = {
          ...node.style,
          margin: "3px",
        };

        // Position node in source column
        node.position = {
          x: sourceColumnX,
          y: yPosition,
        };

        // Set fixed width for all nodes
        node.width = nodeWidth;

        nodes.push(node);
      });

      // Target nodes layout - from top to bottom
      targetItems.forEach((item, index) => {
        const yPosition =
          headerHeight + topPadding + (nodeHeight + verticalSpacing) * index;

        const node = nodeCreator(item, false, index, yPosition);

        // Add parentId and extent to keep nodes within their section
        node.parentId = sectionId;
        node.extent = "parent";

        // Add explicit styling to ensure nodes stay contained
        node.style = {
          ...node.style,
          margin: "3px",
        };

        // Position node in target column
        node.position = {
          x: targetColumnX,
          y: yPosition,
        };

        // Set fixed width for all nodes
        node.width = nodeWidth;

        nodes.push(node);
      });
    };

    // 1. PROPERTY MAPPING NODES
    calculateNodePositions(
      MappingMode.PROPERTY,
      properties,
      targetProperties,
      (prop, isSource, yPos) => ({
        id: isSource
          ? `source-property-${typeof prop === "string" ? prop : prop.id}`
          : `target-property-${typeof prop === "string" ? prop : prop.id}`,
        type: isSource ? "source" : "target",
        data: {
          label: typeof prop === "string" ? prop : prop.label,
          pset: isSource && typeof prop !== "string" ? prop.pset : undefined,
          mode: MappingMode.PROPERTY,
        },
        position: {
          x: 0, // Will be adjusted later
          y: yPos,
        },
        draggable: true,
      })
    );

    // 2. QUANTITY MAPPING NODES
    calculateNodePositions(
      MappingMode.QUANTITY,
      quantities,
      targetQuantities,
      (quantity, isSource, yPos) => ({
        id: isSource
          ? `source-quantity-${
              typeof quantity === "string" ? quantity : quantity.id
            }`
          : `target-quantity-${
              typeof quantity === "string" ? quantity : quantity.id
            }`,
        type: isSource ? "quantitySource" : "quantityTarget",
        data: {
          label: typeof quantity === "string" ? quantity : quantity.label,
          unit: typeof quantity !== "string" ? quantity.unit : undefined,
          mode: MappingMode.QUANTITY,
        },
        position: {
          x: 0, // Will be adjusted later
          y: yPos,
        },
        draggable: true,
      })
    );

    // 3. CLASSIFICATION MAPPING NODES
    calculateNodePositions(
      MappingMode.CLASSIFICATION,
      classificationComponents,
      targetClassification,
      (item, isSource, yPos) => ({
        id: isSource
          ? `source-classification-${typeof item === "string" ? item : item.id}`
          : `target-classification`,
        type: isSource ? "classificationSource" : "classificationTarget",
        data: {
          label: typeof item === "string" ? item : item.label,
          type: isSource && typeof item !== "string" ? item.type : undefined,
          mode: MappingMode.CLASSIFICATION,
        },
        position: {
          x: 0, // Will be adjusted later
          y: yPos,
        },
        draggable: true,
      })
    );

    // 4. PSET MAPPING NODES - Now with 3x height and in bottom right
    calculateNodePositions(
      MappingMode.PSET,
      sourcePsets,
      targetPsets,
      (pset, isSource, yPos) => ({
        id: isSource ? `source-pset-${pset}` : `target-pset-${pset}`,
        type: isSource ? "source" : "target",
        data: { label: pset, mode: MappingMode.PSET },
        position: {
          x: 0, // Will be adjusted later
          y: yPos,
        },
        draggable: true,
      })
    );

    return nodes;
  }, [sourcePsets, targetPsets, containerWidth]);

  // Create edges from current mappings
  const initialEdges: Edge[] = useMemo(() => {
    // Create edges for Pset mappings
    const edges = createEdgesFromMappings(currentMappings);

    // Add example edges for other mapping types
    return addExampleEdges(edges);
  }, [currentMappings]);

  // Set up state for nodes and edges with initial values
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when source/target lists or mappings change
  useEffect(() => {
    // Only update if these props change to avoid resetting the manually created edges
    const sourcePsetsString = sourcePsets.sort().join(",");
    const targetPsetsString = targetPsets.sort().join(",");

    const currentSourcePsetsString = nodes
      .filter((n) => n.id.startsWith("source-pset-"))
      .map((n) => n.data.label)
      .sort()
      .join(",");

    const currentTargetPsetsString = nodes
      .filter((n) => n.id.startsWith("target-pset-"))
      .map((n) => n.data.label)
      .sort()
      .join(",");

    if (
      sourcePsetsString !== currentSourcePsetsString ||
      targetPsetsString !== currentTargetPsetsString
    ) {
      setNodes(initialNodes);
      // Don't reset all edges, just update the ones for psets
      setEdges((prev) => {
        // Remove existing pset edges
        const nonPsetEdges = prev.filter(
          (edge) => !edge.id.startsWith("pset-")
        );
        // Add the new pset edges
        return [
          ...nonPsetEdges,
          ...initialEdges.filter((edge) => edge.id.startsWith("pset-")),
        ];
      });
    }
  }, [
    sourcePsets,
    targetPsets,
    initialNodes,
    initialEdges,
    nodes,
    setNodes,
    setEdges,
  ]);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("Connection attempt:", connection);

      // Find the connected nodes
      const source = nodes.find((n) => n.id === connection.source);
      const target = nodes.find((n) => n.id === connection.target);

      if (!source || !target) {
        console.error("Could not find source or target node for connection");
        return;
      }

      // Determine the mapping mode from the source node
      const mode = (source.data.mode as MappingMode) || MappingMode.PSET;
      console.log("Connection mode:", mode);

      // Create appropriate edge id based on the mapping mode
      let edgeId: string;
      // Declare variables outside switch to avoid linter errors
      let sourceId,
        targetId,
        sourcePropId,
        targetPropId,
        sourceQuantityId,
        targetQuantityId,
        sourceClassId;

      switch (mode) {
        case MappingMode.PSET:
          // Extract the pset name from the node id
          sourceId = source.id
            .replace("source-pset-", "")
            .replace(/^custom-source-pset-\d+$/, source.data.label);
          targetId = target.id
            .replace("target-pset-", "")
            .replace(/^custom-target-pset-\d+$/, target.data.label);
          edgeId = `pset-${sourceId}-to-${targetId}`;
          break;
        case MappingMode.PROPERTY:
          // Extract the property ids from the node ids
          sourcePropId = source.id
            .replace("source-property-", "")
            .replace(/^custom-source-property-\d+$/, source.data.label);
          targetPropId = target.id
            .replace("target-property-", "")
            .replace(/^custom-target-property-\d+$/, target.data.label);
          edgeId = `property-${sourcePropId}-to-${targetPropId}`;
          break;
        case MappingMode.QUANTITY:
          // Extract the quantity ids from the node ids
          sourceQuantityId = source.id
            .replace("source-quantity-", "")
            .replace(/^custom-source-quantity-\d+$/, source.data.label);
          targetQuantityId = target.id
            .replace("target-quantity-", "")
            .replace(/^custom-target-quantity-\d+$/, target.data.label);
          edgeId = `quantity-${sourceQuantityId}-to-${targetQuantityId}`;
          break;
        case MappingMode.CLASSIFICATION:
          // Extract the classification ids from the node ids
          sourceClassId = source.id
            .replace("source-classification-", "")
            .replace(/^custom-source-classification-\d+$/, source.data.label);
          // For classification, targetId is always 'classification'
          edgeId = `classification-${sourceClassId}-to-classification`;
          break;
        default:
          edgeId = `edge-${connection.source}-${connection.target}`;
      }

      // Create a new edge with the appropriate ID
      const newEdge = {
        ...connection,
        id: edgeId,
        animated: true,
        style: {
          stroke: "#6366f1",
          strokeWidth: 2,
          opacity: 0.8,
        },
        data: { mode }, // Store the mapping mode in the edge data
      };

      console.log("Creating new edge:", newEdge);

      // Directly add the edge to make sure it's immediately visible
      setEdges((eds) => {
        console.log("Current edges:", eds);
        console.log("Adding edge:", newEdge);

        // Check if this exact edge already exists - if it does, don't add it again
        const edgeExists = eds.some((edge) => edge.id === newEdge.id);
        if (edgeExists) {
          console.log(
            `Edge ${newEdge.id} already exists, not adding duplicate`
          );
          return eds;
        }

        // Add the new edge - allow multiple connections from the same source (one-to-many)
        const updatedEdges = addEdge(newEdge, eds);
        console.log("Updated edges:", updatedEdges);
        return updatedEdges;
      });

      // Gather additional data based on mode
      let additionalData: Record<string, unknown> = {};

      if (mode === MappingMode.PROPERTY && source.data.pset) {
        // Include the property set information for property mappings
        additionalData.sourcePset = source.data.pset;
      } else if (mode === MappingMode.QUANTITY) {
        additionalData = {
          sourceUnit: source.data.unit,
          targetUnit: target.data.unit,
        };
      } else if (mode === MappingMode.CLASSIFICATION) {
        additionalData = {
          type: source.data.type,
        };
      }

      // Extract the actual label/property name from the data
      const sourceProperty = source.data.label;
      const targetProperty = target.data.label;

      console.log("Calling onMappingUpdate with:", {
        sourceProperty,
        targetProperty,
        mode,
        additionalData,
      });

      // Update the mapping
      if (onMappingUpdate) {
        onMappingUpdate(sourceProperty, targetProperty, mode, additionalData);
      }
    },
    [nodes, onMappingUpdate, setEdges]
  );

  // Only fit view on initial render, not after every node change
  useEffect(() => {
    // Get viewport once when the component mounts
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
    // Only include reactFlowInstance in dependencies, not nodes
  }, [reactFlowInstance]);

  // Handle custom node creation
  const handleAddCustomNode = useCallback(() => {
    if (!customNodeLabel) return;

    // Generate a unique ID for the node
    const nodeId = `custom-${customNodeType}-${customNodeMode.toLowerCase()}-${Date.now()}`;

    // Determine node type based on mode and source/target
    let nodeTypeValue: string = customNodeType;
    if (customNodeMode === MappingMode.QUANTITY) {
      nodeTypeValue =
        customNodeType === "source" ? "quantitySource" : "quantityTarget";
    } else if (customNodeMode === MappingMode.CLASSIFICATION) {
      nodeTypeValue =
        customNodeType === "source"
          ? "classificationSource"
          : "classificationTarget";
    }

    // Create node data
    const nodeData: Record<string, any> = {
      label: customNodeLabel,
      mode: customNodeMode,
    };

    // Add pset if it's a property node and has a pset specified
    if (
      customNodeMode === MappingMode.PROPERTY &&
      customNodeType === "source" &&
      customNodePset
    ) {
      nodeData.pset = customNodePset;
    }

    // Get current viewport to position the node in the center of the visible area
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX =
      -x / zoom + (containerRef.current?.clientWidth || 800) / (2 * zoom);
    const centerY =
      -y / zoom + (containerRef.current?.clientHeight || 600) / (2 * zoom);

    // Create the new node
    const newNode: Node = {
      id: nodeId,
      type: nodeTypeValue,
      data: nodeData,
      position: {
        x: centerX - 110, // Center the node (half of node width)
        y: centerY - 40, // Center the node (half of node height)
      },
      draggable: true,
      width: 220,
    };

    // If adding to a group, set the parentId and extent
    if (addToGroup) {
      const sectionId = `section-${customNodeMode}`;
      newNode.parentId = sectionId;
      newNode.extent = "parent";

      // Adjust position to be relative to the parent group
      const parentNode = nodes.find((node) => node.id === sectionId);
      if (parentNode) {
        // Find the last node in the group to position the new node below it
        const groupNodes = nodes.filter(
          (node) =>
            node.parentId === sectionId && node.type?.includes(customNodeType)
        );

        const columnX =
          customNodeType === "source"
            ? parentNode.style?.width
              ? (parentNode.style.width as number) * 0.25 - 110
              : 40
            : parentNode.style?.width
            ? (parentNode.style.width as number) * 0.75 - 110
            : 400;

        // If there are existing nodes, position below the last one
        if (groupNodes.length > 0) {
          // Sort nodes by y position
          const sortedNodes = [...groupNodes].sort(
            (a, b) =>
              a.position.y + (a.height || 0) - (b.position.y + (b.height || 0))
          );

          const lastNode = sortedNodes[sortedNodes.length - 1];
          newNode.position = {
            x: columnX,
            y: lastNode.position.y + (lastNode.height || 80) + 15, // Position below the last node with spacing
          };
        } else {
          // If no existing nodes, position at the top of the column
          newNode.position = {
            x: columnX,
            y: 100, // Position near the top of the group
          };
        }
      }
    }

    // Add the node to the flow
    setNodes((nds) => [...nds, newNode]);

    // Reset form
    setCustomNodeLabel("");
    setCustomNodePset("");
    setIsAddingNode(false);
  }, [
    customNodeLabel,
    customNodeType,
    customNodeMode,
    customNodePset,
    setNodes,
    reactFlowInstance,
    nodes,
    addToGroup,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        border: "2px solid #555",
        borderRadius: "8px",
        overflow: "auto", // Allow scrolling
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        backgroundColor: "#f0f0e8",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Add Custom Node Button */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setIsAddingNode(!isAddingNode)}
          style={{
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {isAddingNode ? "Cancel" : "Add Custom Node"}
        </button>
      </div>

      {/* Custom Node Panel */}
      {isAddingNode && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "10px",
            zIndex: 10,
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            width: "300px",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>
            Add Custom Node
          </h3>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Node Type:
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="radio"
                  name="nodeType"
                  value="source"
                  checked={customNodeType === "source"}
                  onChange={() => setCustomNodeType("source")}
                  style={{ marginRight: "5px" }}
                />
                Source
              </label>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="radio"
                  name="nodeType"
                  value="target"
                  checked={customNodeType === "target"}
                  onChange={() => setCustomNodeType("target")}
                  style={{ marginRight: "5px" }}
                />
                Target
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Node Category:
            </label>
            <select
              value={customNodeMode}
              onChange={(e) => setCustomNodeMode(e.target.value as MappingMode)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value={MappingMode.PSET}>Property Set</option>
              <option value={MappingMode.PROPERTY}>Property</option>
              <option value={MappingMode.QUANTITY}>Quantity</option>
              <option value={MappingMode.CLASSIFICATION}>Classification</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Node Label:
            </label>
            <input
              type="text"
              value={customNodeLabel}
              onChange={(e) => setCustomNodeLabel(e.target.value)}
              placeholder="Enter node label"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          {customNodeMode === MappingMode.PROPERTY &&
            customNodeType === "source" && (
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Property Set (optional):
                </label>
                <input
                  type="text"
                  value={customNodePset}
                  onChange={(e) => setCustomNodePset(e.target.value)}
                  placeholder="Enter property set name"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            )}

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: "bold",
              }}
            >
              <input
                type="checkbox"
                checked={addToGroup}
                onChange={(e) => setAddToGroup(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Add to corresponding group
            </label>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}>
              If checked, the node will be added to the{" "}
              {customNodeMode.toLowerCase()} group. Otherwise, it will be placed
              on the canvas.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => setIsAddingNode(false)}
              style={{
                backgroundColor: "#f3f4f6",
                color: "#333",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomNode}
              disabled={!customNodeLabel}
              style={{
                backgroundColor: customNodeLabel ? "#6366f1" : "#a5a6f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 12px",
                cursor: customNodeLabel ? "pointer" : "not-allowed",
                fontWeight: "bold",
              }}
            >
              Add Node
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView={false}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2.0}
        defaultViewport={{ x: 0, y: 0, zoom: 0.25 }}
        style={{
          background: "rgba(240, 240, 232, 0.8)",
          width: "200%", // Increased to 200% to provide more space for the wider layout
          height: "120%", // Increased to 120% to provide more vertical space
        }}
        connectionLineStyle={{ stroke: "#555", strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[20, 20]}
        onConnectStart={(params) => console.log("Connection start:", params)}
        onConnectEnd={(event) => console.log("Connection end:", event)}
        connectOnClick={true}
        isValidConnection={(connection) => {
          // Get source and target nodes
          const sourceNode = nodes.find((n) => n.id === connection.source);
          const targetNode = nodes.find((n) => n.id === connection.target);

          if (!sourceNode || !targetNode) return false;

          // Check that we're connecting source → target
          const isSourceToTarget =
            (sourceNode.type?.includes("source") ||
              sourceNode.id.includes("source")) &&
            (targetNode.type?.includes("target") ||
              targetNode.id.includes("target"));

          // Get the mapping mode from the source node
          const sourceMode = sourceNode.data?.mode;
          const targetMode = targetNode.data?.mode;

          // Make sure we're connecting within the same mode (property-to-property, etc.)
          const isSameMode = sourceMode === targetMode;

          // Always return a boolean to satisfy the ValidConnectionFunc type
          return isSourceToTarget && isSameMode ? true : false;
        }}
      >
        <Controls
          position="bottom-right"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            margin: "10px",
            backgroundColor: "transparent",
          }}
        />
        <Background
          color="#555"
          gap={20}
          size={1}
          style={{ opacity: 0.1 }}
          variant={BackgroundVariant.Lines}
        />
      </ReactFlow>
    </div>
  );
};

export default FlowWithFullWidth;
