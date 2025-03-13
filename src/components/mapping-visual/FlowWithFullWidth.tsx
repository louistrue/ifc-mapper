import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Connection,
  addEdge,
  useEdgesState,
  useNodesState,
  ConnectionLineType,
  BackgroundVariant,
  useReactFlow,
  NodeProps,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  SelectionMode,
  Panel,
  useKeyPress,
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
import { IfcClassNode } from "./nodes/IfcClassNode";

// Import utilities and types
import { MappingMode, MappingVisualProps, NodeItem } from "./utils/types";
import { createEdgesFromMappings } from "./utils/flowUtils";
import {
  properties,
  targetProperties,
  quantities,
  targetQuantities,
  classificationComponents,
  targetClassification,
} from "./utils/sampleData";

// Import the sidebar component
import Sidebar from "./Sidebar";

const FlowWithFullWidth = ({
  sourcePsets,
  targetPsets,
  currentMappings,
  onMappingUpdate,
  ifcClasses = [],
}: MappingVisualProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // State for nodes and edges
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Track delete key press
  const deleteKeyPressed = useKeyPress(["Delete", "Backspace"]);

  // Add state for debug info
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      // This function is kept for potential future use
    };

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Handle node changes (position, selection, etc.)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Track selection changes to update selectedNodeId
      changes.forEach((change) => {
        if (change.type === "select") {
          setSelectedNodeId(change.selected ? change.id : null);
        }
      });

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  // Handle keyboard events for node deletion
  useEffect(() => {
    if (deleteKeyPressed && selectedNodeId) {
      // Find the node to delete
      const nodeToDelete = nodes.find((node) => node.id === selectedNodeId);

      // Only delete nodes that are not group headers
      if (nodeToDelete && nodeToDelete.type !== "group") {
        // Remove the node
        setNodes(nodes.filter((node) => node.id !== selectedNodeId));

        // Remove any connected edges
        setEdges(
          edges.filter(
            (edge) =>
              edge.source !== selectedNodeId && edge.target !== selectedNodeId
          )
        );

        // Clear selection
        setSelectedNodeId(null);
      }
    }
  }, [deleteKeyPressed, selectedNodeId, nodes, edges, setNodes, setEdges]);

  // Define custom node types with improved styling
  const nodeTypes = useMemo(
    () => ({
      source: SourceNode,
      target: TargetNode,
      quantitySource: QuantitySourceNode,
      quantityTarget: QuantityTargetNode,
      classificationSource: ClassificationSourceNode,
      classificationTarget: ClassificationTargetNode,
      ifcClass: IfcClassNode,
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
    const gridSections: Record<
      string,
      { x: number; y: number; width: number; height: number }
    > = {
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
      const backgroundColors: Record<string, string> = {
        [MappingMode.PSET]: "rgba(240, 240, 245, 0.8)",
        [MappingMode.PROPERTY]: "rgba(240, 245, 240, 0.8)",
        [MappingMode.QUANTITY]: "rgba(240, 245, 255, 0.8)",
        [MappingMode.CLASSIFICATION]: "rgba(255, 245, 240, 0.8)",
      };
      const backgroundColor = backgroundColors[mode];

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
  }, [sourcePsets, targetPsets]);

  // Initialize nodes and edges on component mount
  useEffect(() => {
    setNodes(initialNodes);
    // Create edges from current mappings
    const initialEdges = createEdgesFromMappings(currentMappings);
    setEdges(initialEdges);
  }, [initialNodes, currentMappings, setNodes, setEdges]);

  // Handle adding a new node from the sidebar
  const handleAddNode = useCallback(
    (nodeType: string, mode: MappingMode) => {
      // Generate a unique ID for the new node
      const id = `${nodeType}-${mode}-${Date.now()}`;

      // Create the node data based on the type
      let nodeData: Record<string, unknown> = {
        id,
        label: `New ${nodeType} Node`,
        mode,
      };

      // For IFC class node, add available classes
      if (nodeType === "ifcClass") {
        nodeData = {
          ...nodeData,
          availableClasses: ifcClasses,
          selectedClasses: [],
          onClassesSelected: (selectedClasses: string[]) => {
            // Update the node data with selected classes
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      selectedClasses,
                    },
                  };
                }
                return node;
              })
            );
          },
        };
      }

      // Get the current viewport to position the node in the center of the visible area
      const { x, y, zoom } = reactFlowInstance.getViewport();
      const centerX =
        -x / zoom + (reactFlowWrapper.current?.clientWidth || 800) / (2 * zoom);
      const centerY =
        -y / zoom +
        (reactFlowWrapper.current?.clientHeight || 600) / (2 * zoom);

      // Create the new node
      const newNode: Node = {
        id,
        type: nodeType,
        data: nodeData,
        position: {
          // Position the node in the center of the viewport
          x: centerX - 110, // Center the node (half of node width)
          y: centerY - 40, // Center the node (half of node height)
        },
        style: {
          margin: "3px",
        },
        width: 220,
        draggable: true,
        // Set the node as selected when added
        selected: true,
      };

      // Add the new node to the flow and set it as selected
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [ifcClasses, setNodes, reactFlowInstance]
  );

  // Handle edge connections with IFC class filtering
  const onConnect = useCallback(
    (params: Connection) => {
      // Check if the source node is the IFC class filter
      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);

      if (!sourceNode || !targetNode) {
        const errorMsg = "Source or target node not found for connection";
        console.warn(errorMsg, params);
        setDebugInfo(errorMsg + ": " + JSON.stringify(params));
        return;
      }

      // Ensure we have valid string values for source and target
      if (params.source === null || params.target === null) {
        const errorMsg = "Source or target is null";
        console.warn(errorMsg, params);
        setDebugInfo(errorMsg + ": " + JSON.stringify(params));
        return;
      }

      const connectionInfo = {
        source: {
          id: params.source,
          type: sourceNode.type,
          data: sourceNode.data,
        },
        target: {
          id: params.target,
          type: targetNode.type,
          data: targetNode.data,
        },
      };

      console.log("Connecting nodes:", connectionInfo);
      setDebugInfo("Connecting: " + JSON.stringify(connectionInfo, null, 2));

      // Check if there's already a connection between these nodes
      const existingEdge = edges.find(
        (edge) => edge.source === params.source && edge.target === params.target
      );

      if (existingEdge) {
        const errorMsg = "Connection already exists between these nodes";
        console.warn(errorMsg);
        setDebugInfo(errorMsg);
        return;
      }

      if (sourceNode.type === "ifcClass") {
        // Only allow connections to source nodes
        const validTargetTypes = [
          "source",
          "quantitySource",
          "classificationSource",
        ];
        if (validTargetTypes.includes(targetNode.type || "")) {
          // Create the edge
          const newEdge = {
            ...params,
            id: `${params.source}-${params.target}`,
            animated: true,
            style: {
              stroke: "#22C55E",
              strokeWidth: 2,
              strokeDasharray: "5 5", // Make the filter connections dashed
            },
            data: {
              ifcClassFilter: true,
              selectedClasses: sourceNode.data.selectedClasses || [],
            },
          };
          setEdges((eds) => addEdge(newEdge, eds));
          setDebugInfo("Created IFC class filter connection");
        } else {
          setDebugInfo(
            `Invalid target type for IFC class filter: ${targetNode.type}`
          );
        }
      } else {
        // Check if this is a valid source to target connection
        const isSourceToTarget =
          (sourceNode.type?.includes("Source") ||
            sourceNode.type === "source") &&
          (targetNode.type?.includes("Target") || targetNode.type === "target");

        // Check if this is a valid target to source connection (reverse the direction)
        const isTargetToSource =
          (targetNode.type?.includes("Source") ||
            targetNode.type === "source") &&
          (sourceNode.type?.includes("Target") || sourceNode.type === "target");

        if (!isSourceToTarget && !isTargetToSource) {
          const errorMsg = `Invalid connection between node types: ${sourceNode.type} → ${targetNode.type}`;
          console.warn(errorMsg);
          setDebugInfo(errorMsg);
          return;
        }

        // For target to source connections, swap the source and target
        let actualSource = params.source;
        let actualTarget = params.target;
        let actualSourceNode = sourceNode;
        let actualTargetNode = targetNode;

        if (isTargetToSource) {
          actualSource = params.target;
          actualTarget = params.source;
          actualSourceNode = targetNode;
          actualTargetNode = sourceNode;
          console.log("Swapping direction for target to source connection");
          setDebugInfo("Swapping direction for target to source connection");
        }

        // Regular mapping edge - ensure source and target are strings
        const newEdge = {
          id: `${actualSource}-${actualTarget}`,
          source: actualSource,
          target: actualTarget,
          animated: true,
          style: { stroke: "#4F46E5", strokeWidth: 2 },
        };
        setEdges((eds) => addEdge(newEdge, eds));

        // Determine the mapping mode based on node types
        let mode = MappingMode.PROPERTY;
        if (
          actualSourceNode.type === "quantitySource" ||
          actualTargetNode.type === "quantityTarget"
        ) {
          mode = MappingMode.QUANTITY;
        } else if (
          actualSourceNode.type === "classificationSource" ||
          actualTargetNode.type === "classificationTarget"
        ) {
          mode = MappingMode.CLASSIFICATION;
        }

        // Get any IFC class filters that apply to this source node
        const ifcClassFilters = edges.filter(
          (edge) =>
            edge.target === actualSource && edge.data?.ifcClassFilter === true
        );

        // Collect all selected IFC classes from connected filter nodes
        const selectedClasses: string[] = [];
        ifcClassFilters.forEach((edge) => {
          if (edge.data?.selectedClasses) {
            selectedClasses.push(...edge.data.selectedClasses);
          }
        });

        // Create additional data with IFC class filter if applicable
        const additionalData: Record<string, unknown> = {};
        if (selectedClasses.length > 0) {
          additionalData.ifcClassFilter = [...new Set(selectedClasses)]; // Remove duplicates
        }

        // Extract the node IDs without the prefixes for the mapping update
        const sourceId = actualSource.replace(/^source-[^-]+-/, "");
        const targetId = actualTarget.replace(/^target-[^-]+-/, "");

        // Call the onMappingUpdate callback with the mapping information
        onMappingUpdate(sourceId, targetId, mode, additionalData);
        setDebugInfo(`Created mapping connection: ${mode}`);
      }
    },
    [nodes, edges, onMappingUpdate, setEdges, setDebugInfo]
  );

  // Add functions to prevent viewport reset when connecting nodes
  const onConnectStart = useCallback(() => {
    // Store the current viewport to prevent reset
    console.log("Connection started");
  }, []);

  const onConnectEnd = useCallback(() => {
    // Keep the current viewport
    console.log("Connection ended");
  }, []);

  // Add CSS styles for selected nodes
  useEffect(() => {
    // Add CSS for selected nodes if not already present
    const styleId = "react-flow-selected-node-style";
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.innerHTML = `
        .react-flow__node.selected {
          box-shadow: 0 0 0 2px #ff3366 !important;
          border-color: #ff3366 !important;
          z-index: 10 !important;
        }
        .custom-node.selected {
          box-shadow: 0 0 0 2px #ff3366 !important;
          border-color: #ff3366 !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      {/* Sidebar with node palette */}
      <Sidebar
        onAddNode={handleAddNode}
        ifcClassesAvailable={ifcClasses.length > 0}
      />

      {/* Main flow area */}
      <div ref={reactFlowWrapper} style={{ flexGrow: 1, height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.Bezier}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView
          snapToGrid={true}
          snapGrid={[10, 10]}
          selectionMode={SelectionMode.Partial}
          selectionOnDrag={false}
          panOnDrag={[1, 2]} // Allow panning with middle mouse and right mouse buttons
          selectionKeyCode={null} // Disable shift selection to allow single-click selection
          deleteKeyCode={null} // Disable default delete key handling (we handle it ourselves)
          connectOnClick={false} // Disable connecting on click to prevent accidental connections
          elevateEdgesOnSelect={true} // Make selected edges appear above others
          elevateNodesOnSelect={true} // Make selected nodes appear above others
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#aaa"
          />
          <Controls />
          <Panel
            position="top-right"
            style={{
              background: "rgba(255,255,255,0.8)",
              padding: "8px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            Press Delete to remove selected node
          </Panel>

          {/* Debug panel */}
          <Panel
            position="bottom-left"
            style={{
              background: "rgba(0,0,0,0.7)",
              color: "#33ff33",
              padding: "8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontFamily: "monospace",
              maxWidth: "300px",
              maxHeight: "150px",
              overflow: "auto",
              display: debugInfo ? "block" : "none",
            }}
          >
            {debugInfo}
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowWithFullWidth;
