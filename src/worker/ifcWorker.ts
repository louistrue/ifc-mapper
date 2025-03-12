/* eslint-disable */
// This file needs to be a .ts file for TypeScript compatibility, but we're using JS for the worker code

declare global {
  function importScripts(...urls: string[]): void;
  interface Pyodide {
    loadPyodide: (config: any) => Promise<any>;
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
    };
    loadPackage: (packages: string[]) => Promise<void>;
    runPythonAsync: (code: string) => Promise<any>;
    globals: {
      get: (name: string) => any;
    };
  }
}

// The actual worker code
let pyodide: any = null;
let translations: Record<string, any> = {};
let consoleTranslations: Record<string, any> = {};

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

function detectErrorType(error: Error): string | null {
  const errorStr = error.toString().toLowerCase();
  if (
    errorStr.includes("out of memory") ||
    errorStr.includes("internalerror: out of memory")
  ) {
    return ERROR_TYPES.OUT_OF_MEMORY;
  }
  return null;
}

async function loadTranslations(lang: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`./locales/${lang}/translation.json`);
    if (!response.ok) {
      console.error(
        `Failed to load translations for ${lang}:`,
        response.statusText
      );
      if (lang !== "en") return loadTranslations("en");
      return {};
    }
    const translationData = await response.json();
    if (translationData.console) consoleTranslations = translationData;
    if (translationData.report) return translationData.report;
    console.error(`No report section found in ${lang} translations`);
    return {};
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    if (lang !== "en") return loadTranslations("en");
    return {};
  }
}

function getConsoleMessage(
  key: string,
  defaultMessage: string,
  params: Record<string, any> = {}
): string {
  try {
    if (!consoleTranslations) return defaultMessage;
    if (!key.startsWith("console.")) key = "console." + key;
    const keys = key.split(".");
    let message: any = consoleTranslations;
    for (const k of keys) {
      if (message && message[k]) {
        message = message[k];
      } else {
        return defaultMessage;
      }
    }
    if (typeof message === "string") {
      let translatedMessage = message;
      for (const [k, value] of Object.entries(params)) {
        translatedMessage = translatedMessage.replace(`{{${k}}}`, value);
      }
      return translatedMessage;
    }
    return defaultMessage;
  } catch (error) {
    console.error("Error getting console message:", error);
    return defaultMessage;
  }
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

    // @ts-ignore - loadPyodide comes from the imported script
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
    });

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
  } catch (error: any) {
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

interface WorkerMessageEvent {
  data: {
    arrayBuffer: ArrayBuffer;
    fileName?: string;
    language?: string;
    mappingConfig?: Record<string, string>;
  };
}

self.onmessage = async (event: WorkerMessageEvent) => {
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
        INITIAL_TRANSLATIONS[
          effectiveLanguage as keyof typeof INITIAL_TRANSLATIONS
        ]?.loadingTranslations || "Loading translations...",
    });
    translations = await loadTranslations(effectiveLanguage);

    await loadPyodideAndPackages();

    const uint8Array = new Uint8Array(arrayBuffer);
    pyodide.FS.writeFile("model.ifc", uint8Array);

    const mappingConfigStr = JSON.stringify(mappingConfig || {});

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
html_preview += f"<h1>Report for {fileName or 'Unnamed IFC Model'}</h1>"
html_preview += f"<p>Processed on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>"
html_preview += "<h2>Mapping Summary</h2><ul>"
for key, target in mapping_config.items():
    html_preview += f"<li>{key} mapped to {target}</li>"
html_preview += "</ul></body></html>"

results = {
    "filename": fileName or "fixed_model.ifc",
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
  } catch (error: any) {
    console.error("Worker error:", error);
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
      });
    } else {
      self.postMessage({
        type: "error",
        message: getConsoleMessage(
          "console.error.generic",
          "An error occurred: {{message}}",
          { message: error.message }
        ),
        stack: error.stack,
      });
    }
  }
};

// Need to add the importScripts at the very beginning of the file
// Using a comment to indicate this special requirement
// "WORKER_HEADER:importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');"
