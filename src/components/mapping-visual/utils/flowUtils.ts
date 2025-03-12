import { Edge } from "reactflow";

// Create edges from current mappings
export const createEdgesFromMappings = (
  currentMappings: Record<string, string>
): Edge[] => {
  const edges: Edge[] = [];

  // Create edges for Pset mappings from the currentMappings
  Object.entries(currentMappings).forEach(([source, target]) => {
    if (target) {
      edges.push({
        id: `pset-${source}-to-${target}`,
        source: `source-pset-${source}`,
        target: `target-pset-${target}`,
        animated: true,
        style: {
          stroke: "#6366f1",
          strokeWidth: 2,
          opacity: 0.8,
        },
      });
    }
  });

  return edges;
};

// Add example edges for demonstration
export const addExampleEdges = (edges: Edge[]): Edge[] => {
  // Property Mapping example edges
  edges.push({
    id: `property-prop1-to-tgt1`,
    source: `source-property-prop1`,
    target: `target-property-tgt1`,
    animated: true,
    style: {
      stroke: "#6366f1",
      strokeWidth: 2,
      opacity: 0.8,
    },
  });

  // Quantity Mapping example edge
  edges.push({
    id: `quantity-length-to-netLength`,
    source: `source-quantity-length`,
    target: `target-quantity-netLength`,
    animated: true,
    style: {
      stroke: "#6366f1",
      strokeWidth: 2,
      opacity: 0.8,
    },
  });

  // Classification Mapping example edge
  edges.push({
    id: `classification-name-to-classification`,
    source: `source-classification-name`,
    target: `target-classification`,
    animated: true,
    style: {
      stroke: "#6366f1",
      strokeWidth: 2,
      opacity: 0.8,
    },
  });

  return edges;
};
