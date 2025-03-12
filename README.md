# IFC Mapper

A web application for mapping and standardizing property sets in IFC (Industry Foundation Classes) files. This tool allows you to customize the mapping of non-standard property sets to standard fields, helping normalize BIM data across different sources.

Visit the project repository: [github.com/ifc-mapper](https://github.com/ifc-mapper)

## Features

- Upload and process IFC files directly in the browser
- Interactive visual mapping interface for property sets, properties, quantities, and classifications
- Create custom nodes and connections for flexible mapping configurations
- Map custom property sets to standard fields
- Preview generated HTML reports
- Download corrected IFC files
- Internationalization support with multiple languages
- Uses WebAssembly for high-performance IFC processing

## Technical Stack

- **Frontend**: React with TypeScript
- **Visualization**: React Flow for interactive node-based mapping
- **IFC Processing**: IfcOpenShell via WebAssembly (Pyodide)
- **Building**: Vite
- **Worker Architecture**: Web Workers for non-blocking UI

## How It Works

1. **Upload an IFC File**: Select any valid IFC file to analyze.
2. **Configure Mapping**: Use the interactive visual interface to define how custom property sets should map to standard fields.
   - Drag connections between source and target nodes
   - Create custom nodes for special mapping cases
   - Group related nodes for better organization
3. **Process**: The file is processed in a web worker using IfcOpenShell via Pyodide.
4. **Review & Download**: Preview the changes and download the corrected IFC file.

## Mapping Visualization

The application features a powerful visual mapping interface that allows you to:

- Connect source and target nodes with intuitive drag-and-drop
- Create custom nodes for special mapping cases
- Organize nodes into logical groups
- Map different types of IFC data:
  - **Property Sets**: Map custom property sets to standard ones
  - **Properties**: Map individual properties with their property set information
  - **Quantities**: Map quantity sets with unit information
  - **Classifications**: Map classification systems

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

## License

[GNU Affero General Public License v3.0 (AGPL-3.0)](/LICENSE)

The AGPL is a strong copyleft license that requires anyone who distributes or modifies this software, or hosts it as a service, to make the complete source code available under the same license. This ensures that:

- All modifications to the code must be shared with the community
- If you use this software as part of a web service, you must make the complete source code available to users
- Users have the right to download, modify, and distribute the code

This license was chosen to ensure that improvements to the IFC Mapper remain open and accessible to the entire community.

## Acknowledgements

- [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) for IFC processing
- [Pyodide](https://github.com/pyodide/pyodide) for Python in the browser
- [React Flow](https://reactflow.dev/) for the interactive node-based interface
