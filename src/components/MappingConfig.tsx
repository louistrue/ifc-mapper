import React from "react";

interface MappingConfigProps {
  availablePsets: string[];
  onMappingChange: (pset: string, targetField: string) => void;
}

const MappingConfig: React.FC<MappingConfigProps> = ({
  availablePsets,
  onMappingChange,
}) => {
  return (
    <div className="mapping-config">
      <h2>Mapping Configuration</h2>
      {availablePsets.map((pset) => (
        <div key={pset} className="mapping-item">
          <label>{pset}: </label>
          <select onChange={(e) => onMappingChange(pset, e.target.value)}>
            <option value="">Select target field</option>
            <option value="BaseQuantity">Base Quantity</option>
            <option value="StandardMaterial">Standard Material</option>
          </select>
        </div>
      ))}
    </div>
  );
};

export default MappingConfig;
