/* eslint-disable */
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
        "Installing additional dependencies..."
      ),
    });
    await pyodide.runPythonAsync(`
await micropip.install('lark')
await micropip.install('ifctester')
await micropip.install('bcf-client')
await micropip.install('pystache')
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

    const uint8Array = new Uint8Array(arrayBuffer);
    pyodide.FS.writeFile("model.ifc", uint8Array);

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

# Open the IFC model
model = ifcopenshell.open("model.ifc")

# Load mapping configuration from JSON string
mapping_config = json.loads('''${mappingConfigStr}''')
# Parse filename from JavaScript
file_name = json.loads('''${fileNameStr}''')

def apply_mapping(model, mapping_config):
    for element in model.by_type("IfcElement"):
        if hasattr(element, "HasProperties") and element.HasProperties:
            for pset in element.HasProperties:
                if hasattr(pset, "Name") and pset.Name in mapping_config:
                    target_field = mapping_config[pset.Name]
                    for prop in pset.HasProperties:
                        if hasattr(prop, "NominalValue"):
                            value = prop.NominalValue.wrappedValue if prop.NominalValue else None
                            if value is not None:
                                setattr(element, target_field, value)
    return model

model = apply_mapping(model, mapping_config)
fixed_ifc_file = "fixed_model.ifc"
model.write(fixed_ifc_file)

html_preview = f"<html><head><title>IFC Report</title></head><body>"
html_preview += f"<h1>Report for {file_name}</h1>"
html_preview += f"<p>Processed on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>"
html_preview += "<h2>Mapping Summary</h2><ul>"
for key, target in mapping_config.items():
    html_preview += f"<li>{key} mapped to {target}</li>"
html_preview += "</ul></body></html>"

results = {
    "filename": file_name,
    "html_content": html_preview,
    "fixedIfcFile": fixed_ifc_file
}
validation_result_json = json.dumps(results, default=str, ensure_ascii=False)
    `);

    const resultJson = pyodide.globals.get("validation_result_json");
    const results = JSON.parse(resultJson);
    const fixedIfcData = pyodide.FS.readFile(results.fixedIfcFile);
    results.fixedIfcData = fixedIfcData;
    results.language_code = effectiveLanguage;
    results.available_languages = Object.keys(translations);

    self.postMessage({
      type: "complete",
      results: results,
      message: getConsoleMessage(
        "console.success.processingComplete",
        "Your IFC file has been processed."
      ),
    });
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
