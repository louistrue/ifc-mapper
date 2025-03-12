// Load Pyodide without using importScripts (which doesn't work in module workers)
import { loadPyodideInstance } from "./pyodideLoader.js";

// The actual worker code
let pyodide = null;
let translations = {};
let consoleTranslations = {};

const INITIAL_TRANSLATIONS = {
  en: { loadingTranslations: "Loading translations..." },
  de: { loadingTranslations: "Übersetzungen werden geladen..." },
  fr: { loadingTranslations: "Chargement des traductions..." },
  it: { loadingTranslations: "Caricamento delle traduzioni..." },
  rm: { loadingTranslations: "Chargiar translaziuns..." },
};

const ERROR_TYPES = {
  OUT_OF_MEMORY: "out_of_memory",
};

function detectErrorType(error) {
  const errorStr = error.toString().toLowerCase();
  if (
    errorStr.includes("out of memory") ||
    errorStr.includes("internalerror: out of memory")
  ) {
    return ERROR_TYPES.OUT_OF_MEMORY;
  }
  return null;
}

async function loadTranslations(lang) {
  try {
    // First try loading from the locales directory
    try {
      const response = await fetch(`./locales/${lang}/translation.json`);
      if (response.ok) {
        const translationData = await response.json();
        if (translationData.console) consoleTranslations = translationData;
        if (translationData.report) return translationData.report;
      }
    } catch (error) {
      console.warn(
        `Failed to load translations for ${lang} from ./locales/: ${error.message}`
      );
    }

    // If that fails, try loading from public/locales
    try {
      const response = await fetch(`/locales/${lang}/translation.json`);
      if (response.ok) {
        const translationData = await response.json();
        if (translationData.console) consoleTranslations = translationData;
        if (translationData.report) return translationData.report;
      }
    } catch (error) {
      console.warn(
        `Failed to load translations for ${lang} from /locales/: ${error.message}`
      );
    }

    // If both failed and we're not already trying English, fall back to English
    if (lang !== "en") {
      console.warn(`Falling back to English translations`);
      return loadTranslations("en");
    }

    // If even English fails, create a minimal fallback object
    console.warn(
      "All translation loading attempts failed, using fallback translations"
    );
    consoleTranslations = {
      console: {
        loading: {
          pyodide: "Loading Pyodide...",
          dependencies: "Installing dependencies...",
          processingMapping: "Processing IFC file...",
        },
        error: {
          generic: "Error: {{message}}",
        },
        success: {
          processingComplete: "Processing complete",
        },
      },
    };
    return {};
  } catch (error) {
    console.error(`Critical error loading translations: ${error.message}`);
    // Create absolute minimum fallback if everything fails
    return {};
  }
}

function getConsoleMessage(key, defaultMessage, params = {}) {
  try {
    if (!consoleTranslations) return defaultMessage;
    if (!key.startsWith("console.")) key = "console." + key;
    const keys = key.split(".");
    let message = consoleTranslations;
    for (const k of keys) {
      if (message && message[k]) {
        message = message[k];
      } else {
        return formatMessage(defaultMessage, params);
      }
    }
    if (typeof message === "string") {
      return formatMessage(message, params);
    }
    return formatMessage(defaultMessage, params);
  } catch (error) {
    console.error("Error getting console message:", error);
    return formatMessage(defaultMessage, params);
  }
}

// Helper function to ensure message placeholders are always replaced
function formatMessage(message, params = {}) {
  let formattedMessage = message;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    // Make sure we replace all occurrences, not just the first one
    while (formattedMessage.includes(placeholder)) {
      formattedMessage = formattedMessage.replace(
        placeholder,
        String(value || "")
      );
    }
  }
  return formattedMessage;
}

async function loadPyodideAndPackages() {
  if (pyodide !== null) return pyodide;

  try {
    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.pyodide",
        "Loading Pyodide..."
      ),
    });

    // Use our loader helper
    pyodide = await loadPyodideInstance();

    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.pyodideSuccess",
        "Pyodide loaded successfully"
      ),
    });

    await pyodide.loadPackage(["micropip", "sqlite3"]);

    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.micropipPatch",
        "Patching micropip..."
      ),
    });
    await pyodide.runPythonAsync(`
import micropip
from micropip._micropip import WheelInfo
WheelInfo.check_compatible = lambda self: None
    `);

    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.ifcOpenShell",
        "Installing IfcOpenShell..."
      ),
    });
    // Install IfcOpenShell using the autoapi wheel
    await pyodide.runPythonAsync(`
import micropip
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
    `);

    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.dependencies",
        "Installing basic dependencies..."
      ),
    });
    await pyodide.runPythonAsync(`
await micropip.install('numpy')
    `);

    return pyodide;
  } catch (error) {
    self.postMessage({
      type: "error",
      message: getConsoleMessage(
        "console.error.pyodideLoad",
        "Failed to load Pyodide: {{message}}",
        { message: error.message }
      ),
    });
    throw error;
  }
}

self.onmessage = async (event) => {
  const { arrayBuffer, fileName, language = "en", mappingConfig } = event.data;

  console.log("Worker: Language received:", language);
  const normalizedLanguage = language.toLowerCase().split("-")[0];
  const supportedLanguages = ["en", "de", "fr", "it", "rm"];
  const effectiveLanguage = supportedLanguages.includes(normalizedLanguage)
    ? normalizedLanguage
    : "en";
  console.log("Worker: Using language:", effectiveLanguage);

  try {
    self.postMessage({
      type: "progress",
      message:
        INITIAL_TRANSLATIONS[effectiveLanguage]?.loadingTranslations ||
        "Loading translations...",
    });
    translations = await loadTranslations(effectiveLanguage);

    await loadPyodideAndPackages();

    // First step: Load the IFC file and analyze its structure
    const uint8Array = new Uint8Array(arrayBuffer);
    pyodide.FS.writeFile("model.ifc", uint8Array);

    // Get available property sets
    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.analyzing",
        "Analyzing IFC structure..."
      ),
    });

    // Get all property sets from the model first, to inform user interface
    const ifc_analysis = await pyodide.runPythonAsync(`
import ifcopenshell
import json
from datetime import datetime

# Open the IFC model
model = ifcopenshell.open("model.ifc")

# Get the distinct property set names in the model
custom_pset_names = set()
custom_quantity_names = set()
for element in model.by_type("IfcElement"):
    if hasattr(element, "IsDefinedBy"):
        for definition in element.IsDefinedBy:
            if hasattr(definition, "RelatingPropertyDefinition"):
                prop_def = definition.RelatingPropertyDefinition
                if prop_def.is_a("IfcPropertySet"):
                    custom_pset_names.add(prop_def.Name)
                elif prop_def.is_a("IfcElementQuantity"):
                    custom_quantity_names.add(prop_def.Name)

# Get all standard schema property sets and quantities
standard_psets = []
standard_quantities = []

# Since ifcopenshell.util.pset is not available, we'll directly identify standard property sets
# Standard property sets start with "Pset_" and quantity sets start with "Qto_"
# Retrieve all property sets from the model and filter standard ones
for element in model.by_type("IfcPropertySet"):
    if element.Name and element.Name.startswith("Pset_"):
        if element.Name not in standard_psets:
            standard_psets.append(element.Name)
    
for element in model.by_type("IfcElementQuantity"):
    if element.Name and element.Name.startswith("Qto_"):
        if element.Name not in standard_quantities:
            standard_quantities.append(element.Name)

# Add common standard property sets if they're not already in the model
common_psets = [
    "Pset_WallCommon", "Pset_BeamCommon", "Pset_SlabCommon", "Pset_ColumnCommon",
    "Pset_DoorCommon", "Pset_WindowCommon", "Pset_SpaceCommon", "Pset_BuildingCommon",
    "Pset_BuildingStoreyCommon", "Pset_SiteCommon", "Pset_CurtainWallCommon"
]
for pset in common_psets:
    if pset not in standard_psets:
        standard_psets.append(pset)

common_qtos = [
    "Qto_WallBaseQuantities", "Qto_BeamBaseQuantities", "Qto_SlabBaseQuantities",
    "Qto_ColumnBaseQuantities", "Qto_DoorBaseQuantities", "Qto_WindowBaseQuantities",
    "Qto_SpaceBaseQuantities"
]
for qto in common_qtos:
    if qto not in standard_quantities:
        standard_quantities.append(qto)

# Remove duplicates and sort
standard_psets = sorted(list(set(standard_psets)))
standard_quantities = sorted(list(set(standard_quantities)))

# Get all element types in the model
element_types = set()
for element in model.by_type("IfcElement"):
    element_types.add(element.is_a())

model_info = {
    "pset_names": list(custom_pset_names),
    "quantity_names": list(custom_quantity_names),
    "standard_psets": standard_psets,
    "standard_quantities": standard_quantities,
    "element_types": list(element_types)
}

json.dumps(model_info)
    `);

    const modelInfo = JSON.parse(ifc_analysis);

    // Now apply the mapping configuration if provided
    const mappingConfigStr = JSON.stringify(mappingConfig || {});
    const fileNameStr = JSON.stringify(fileName || "unnamed_model.ifc");

    self.postMessage({
      type: "progress",
      message: getConsoleMessage(
        "console.loading.processingMapping",
        "Applying mapping configuration..."
      ),
    });

    await pyodide.runPythonAsync(`
import ifcopenshell
import json
from datetime import datetime
import base64

# Open the IFC model
model = ifcopenshell.open("model.ifc")

# Load mapping configuration from JSON string
mapping_config = json.loads('''${mappingConfigStr}''')
# Parse filename from JavaScript
file_name = json.loads('''${fileNameStr}''')

def apply_mapping(model, mapping_config):
    changes_log = []
    # Counter for changes made
    changes_made = 0
    
    for element in model.by_type("IfcElement"):
        element_changes = []
        element_id = element.id()
        element_type = element.is_a()
        element_name = getattr(element, "Name", "Unnamed")
        
        # Process property sets (custom properties to standard properties)
        custom_psets = {}
        standard_psets = {}
        
        if hasattr(element, "IsDefinedBy"):
            for definition in element.IsDefinedBy:
                if hasattr(definition, "RelatingPropertyDefinition"):
                    prop_def = definition.RelatingPropertyDefinition
                    
                    # Handle regular property sets
                    if prop_def.is_a("IfcPropertySet"):
                        pset_name = prop_def.Name
                        
                        # Check if this pset is in our mapping config as a source
                        if pset_name in mapping_config:
                            # Get the target schema pset
                            target_pset_name = mapping_config[pset_name]
                            
                            # Store properties for later transfer
                            if hasattr(prop_def, "HasProperties"):
                                props_dict = {}
                                for prop in prop_def.HasProperties:
                                    if hasattr(prop, "Name") and hasattr(prop, "NominalValue"):
                                        value = prop.NominalValue.wrappedValue if prop.NominalValue else None
                                        if value is not None:
                                            props_dict[prop.Name] = value
                                
                                if props_dict:
                                    custom_psets[pset_name] = props_dict
                                    
                                    # Create or get the target pset
                                    target_pset = None
                                    for def2 in element.IsDefinedBy:
                                        if hasattr(def2, "RelatingPropertyDefinition"):
                                            pd = def2.RelatingPropertyDefinition
                                            if pd.is_a("IfcPropertySet") and pd.Name == target_pset_name:
                                                target_pset = pd
                                                break
                                    
                                    if not target_pset:
                                        # Create new standard property set
                                        target_pset = model.createIfcPropertySet(
                                            GlobalId=ifcopenshell.guid.new(),
                                            OwnerHistory=model.by_type("IfcOwnerHistory")[0] if model.by_type("IfcOwnerHistory") else None,
                                            Name=target_pset_name,
                                            Description=f"Mapped from {pset_name}",
                                            HasProperties=[]
                                        )
                                        # Connect the new pset to the element
                                        model.createIfcRelDefinesByProperties(
                                            GlobalId=ifcopenshell.guid.new(),
                                            OwnerHistory=model.by_type("IfcOwnerHistory")[0] if model.by_type("IfcOwnerHistory") else None,
                                            RelatedObjects=[element],
                                            RelatingPropertyDefinition=target_pset
                                        )
                                    
                                    # Transfer the properties
                                    for prop_name, prop_value in props_dict.items():
                                        # Check if property already exists
                                        existing_prop = None
                                        if target_pset.HasProperties:
                                            for p in target_pset.HasProperties:
                                                if p.Name == prop_name:
                                                    existing_prop = p
                                                    break
                                        
                                        # Create new property or update existing
                                        if existing_prop:
                                            # Update existing property
                                            if hasattr(existing_prop, "NominalValue"):
                                                # Create appropriate value based on type
                                                value_type = type(prop_value).__name__
                                                if value_type == "float":
                                                    new_value = model.createIfcReal(prop_value)
                                                elif value_type == "int":
                                                    new_value = model.createIfcInteger(prop_value)
                                                elif value_type == "bool":
                                                    new_value = model.createIfcBoolean(prop_value)
                                                else:
                                                    new_value = model.createIfcText(str(prop_value))
                                                
                                                existing_prop.NominalValue = new_value
                                                changes_made += 1
                                                element_changes.append(f"Updated property {prop_name} in {target_pset_name}")
                                        else:
                                            # Create new property
                                            value_type = type(prop_value).__name__
                                            if value_type == "float":
                                                new_value = model.createIfcReal(prop_value)
                                            elif value_type == "int":
                                                new_value = model.createIfcInteger(prop_value)
                                            elif value_type == "bool":
                                                new_value = model.createIfcBoolean(prop_value)
                                            else:
                                                new_value = model.createIfcText(str(prop_value))
                                            
                                            new_prop = model.createIfcPropertySingleValue(
                                                Name=prop_name,
                                                Description=f"Mapped from {pset_name}",
                                                NominalValue=new_value,
                                                Unit=None
                                            )
                                            
                                            # Add property to the target pset
                                            props = list(target_pset.HasProperties) if target_pset.HasProperties else []
                                            props.append(new_prop)
                                            target_pset.HasProperties = props
                                            
                                            changes_made += 1
                                            element_changes.append(f"Added property {prop_name} to {target_pset_name}")
        
        if element_changes:
            changes_log.append({
                "element_id": element_id,
                "element_type": element_type,
                "element_name": element_name,
                "changes": element_changes
            })
    
    return model, changes_log, changes_made

# Apply the mapping
model, changes_log, changes_made = apply_mapping(model, mapping_config)

# Write the updated model to a file
fixed_ifc_file = f"fixed_{file_name}"
model.write(fixed_ifc_file)

# After processing create the output
model.write(fixed_ifc_file)
with open(fixed_ifc_file, "rb") as f:
    ifc_bytes = f.read()
    
# Convert bytes to base64 string for JSON serialization
ifc_bytes_base64 = base64.b64encode(ifc_bytes).decode('utf-8')

# Create results with base64 encoded data instead of raw bytes
results = {
    "fixedIfcData_base64": ifc_bytes_base64,
    "filename": fixed_ifc_file,
    "modelInfo": model_info,
    "changesMade": changes_made,
}

json.dumps(results)
    `);

    const resultsJson = pyodide.runPython("json.dumps(results)");
    const pythonResults = JSON.parse(resultsJson);

    // Convert the base64 string back to Uint8Array
    const base64Data = pythonResults.fixedIfcData_base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create the results object with proper Uint8Array data
    const results = {
      fixedIfcData: bytes,
      filename: pythonResults.filename,
      modelInfo: pythonResults.modelInfo,
      changesMade: pythonResults.changesMade,
      language_code: effectiveLanguage,
      available_languages: Object.keys(translations),
    };

    // Send the results back
    self.postMessage({ type: "complete", results });
  } catch (error) {
    console.error("Worker error:", error);

    // Get full error details including Python traceback if available
    let errorMessage = error.message || String(error);

    // Extract Python traceback if available
    if (error.pyodideError) {
      errorMessage = `Python Error: ${error.pyodideError}`;
    } else if (error.stack && error.stack.includes("Traceback")) {
      errorMessage = `Error with traceback: ${error.stack}`;
    }

    const errorType = detectErrorType(error);
    if (errorType === ERROR_TYPES.OUT_OF_MEMORY) {
      self.postMessage({
        type: "error",
        errorType: ERROR_TYPES.OUT_OF_MEMORY,
        message: getConsoleMessage(
          "console.error.outOfMemory",
          "Pyodide ran out of memory. The page will reload automatically to free resources."
        ),
        stack: error.stack,
        details: errorMessage,
      });
    } else {
      self.postMessage({
        type: "error",
        message: getConsoleMessage(
          "console.error.generic",
          "An error occurred: {{message}}",
          { message: errorMessage }
        ),
        stack: error.stack,
        details: errorMessage,
      });
    }
  }
};
