import React, { useState } from "react";

interface MappingConfigProps {
  availableCustomPsets: string[];
  availableStandardPsets: string[];
  currentMappings: Record<string, string>;
  onMappingChange: (sourcePset: string, targetPset: string) => void;
}

const MappingConfig: React.FC<MappingConfigProps> = ({
  availableCustomPsets,
  availableStandardPsets,
  currentMappings,
  onMappingChange,
}) => {
  const [selectedCustomPset, setSelectedCustomPset] = useState<string>("");

  const handleAddMapping = () => {
    if (selectedCustomPset) {
      // Create a default empty mapping for this pset
      onMappingChange(selectedCustomPset, "");
      setSelectedCustomPset("");
    }
  };

  const handleRemoveMapping = (sourcePset: string) => {
    onMappingChange(sourcePset, "");
  };

  // Sort psets alphabetically
  const sortedCustomPsets = [...availableCustomPsets].sort();
  const sortedStandardPsets = [...availableStandardPsets].sort();

  // Psets already mapped
  const mappedPsets = Object.keys(currentMappings);

  // Psets available to map (not yet mapped)
  const availableToMapPsets = sortedCustomPsets.filter(
    (pset) => !mappedPsets.includes(pset)
  );

  return (
    <div className="mapping-config">
      <div className="add-mapping">
        <select
          value={selectedCustomPset}
          onChange={(e) => setSelectedCustomPset(e.target.value)}
          className="pset-select"
        >
          <option value="">Select a property set to map</option>
          {availableToMapPsets.map((pset) => (
            <option key={pset} value={pset}>
              {pset}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddMapping}
          disabled={!selectedCustomPset}
          className="add-button"
        >
          Add Mapping
        </button>
      </div>

      {mappedPsets.length > 0 ? (
        <table className="mapping-table">
          <thead>
            <tr>
              <th>Source Property Set</th>
              <th>Target Standard Property Set</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappedPsets.map((sourcePset) => (
              <tr key={sourcePset}>
                <td>{sourcePset}</td>
                <td>
                  <select
                    value={currentMappings[sourcePset] || ""}
                    onChange={(e) =>
                      onMappingChange(sourcePset, e.target.value)
                    }
                    className="pset-select"
                  >
                    <option value="">Select target property set</option>
                    {sortedStandardPsets.map((standardPset) => (
                      <option key={standardPset} value={standardPset}>
                        {standardPset}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleRemoveMapping(sourcePset)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-mappings">
          <p>
            No property sets mapped yet. Select a source property set to begin
            mapping.
          </p>
        </div>
      )}
    </div>
  );
};

export default MappingConfig;
