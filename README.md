# IFC Mapper

A web application for mapping and standardizing property sets in IFC (Industry Foundation Classes) files. This tool allows you to customize the mapping of non-standard property sets to standard fields, helping normalize BIM data across different sources.

## Features

- Upload and process IFC files directly in the browser
- Map custom property sets to standard fields
- Preview generated HTML reports
- Download corrected IFC files
- Internationalization support with multiple languages
- Uses WebAssembly for high-performance IFC processing

## Technical Stack

- **Frontend**: React with TypeScript
- **IFC Processing**: IfcOpenShell via WebAssembly (Pyodide)
- **Building**: Vite
- **Worker Architecture**: Web Workers for non-blocking UI

## How It Works

1. **Upload an IFC File**: Select any valid IFC file to analyze.
2. **Configure Mapping**: Define how custom property sets should map to standard fields.
3. **Process**: The file is processed in a web worker using IfcOpenShell via Pyodide.
4. **Review & Download**: Preview the changes and download the corrected IFC file.

## Development

### Prerequisites

- Node.js (v14.x or higher)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Web Worker Architecture

This application uses a Web Worker to handle the heavy lifting of IFC processing, ensuring the main UI thread remains responsive. The worker:

1. Loads Pyodide (Python in the browser)
2. Installs IfcOpenShell and dependencies
3. Processes the IFC file using Python code
4. Returns the results to the main thread

## Internationalization

The application supports multiple languages through translation files located in `public/locales/`. Currently supported languages:

- English (en)
- German (de)
- French (fr)
- Italian (it)
- Romansh (rm)

## License

MIT License

## Acknowledgements

- [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) for IFC processing
- [Pyodide](https://github.com/pyodide/pyodide) for Python in the browser
