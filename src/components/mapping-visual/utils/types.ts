// Mapping modes
export enum MappingMode {
  PSET = "pset",
  PROPERTY = "property",
  QUANTITY = "quantity",
  CLASSIFICATION = "classification",
  IFC_CLASS = "ifcClass",
}

// Define proper types for node items
export interface NodeItem {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface PropertyNodeItem extends NodeItem {
  pset?: string;
}

export interface QuantityNodeItem extends NodeItem {
  unit?: string;
}

export interface ClassificationNodeItem extends NodeItem {
  type?: string;
}

// New interface for IFC class node items
export interface IfcClassNodeItem extends NodeItem {
  selectedClasses?: string[];
}

export interface MappingVisualProps {
  sourcePsets: string[];
  targetPsets: string[];
  currentMappings: Record<string, string>;
  onMappingUpdate: (
    sourceProperty: string,
    targetProperty: string,
    mode: MappingMode,
    additionalData?: Record<string, unknown>
  ) => void;
  ifcClasses?: string[];
}
