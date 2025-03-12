import {
  NodeItem,
  PropertyNodeItem,
  QuantityNodeItem,
  ClassificationNodeItem,
} from "./types";

// Sample property data
export const properties: PropertyNodeItem[] = [
  {
    id: "prop1",
    label: "Pset_WallCommon:Reference",
    pset: "Pset_WallCommon",
  },
  {
    id: "prop2",
    label: "Pset_WallCommon:ThermalTransmittance",
    pset: "Pset_WallCommon",
  },
  { id: "prop3", label: "Custom_Pset:Material", pset: "Custom_Pset" },
];

export const targetProperties: NodeItem[] = [
  { id: "tgt1", label: "StandardReference" },
  { id: "tgt2", label: "U-Value" },
  { id: "tgt3", label: "Material" },
];

// Sample quantity data
export const quantities: QuantityNodeItem[] = [
  { id: "length", label: "Length", unit: "m" },
  { id: "area", label: "Area", unit: "m²" },
  { id: "volume", label: "Volume", unit: "m³" },
];

export const targetQuantities: QuantityNodeItem[] = [
  { id: "netLength", label: "NetLength", unit: "m" },
  { id: "grossArea", label: "GrossArea", unit: "m²" },
  { id: "netVolume", label: "NetVolume", unit: "m³" },
];

// Sample classification data
export const classificationComponents: ClassificationNodeItem[] = [
  { id: "name", label: "Classification Name", type: "Name" },
  { id: "reference", label: "Classification Reference", type: "Reference" },
];

export const targetClassification: NodeItem[] = [
  { id: "classification", label: "IFC Classification" },
];
