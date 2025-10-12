// Global variables and configuration
let editor; // Global editor instance
let renderTimeout; // For debouncing

// Panel resizing variables
let isResizing = false;
let currentHandle = null;
let startX = 0;
let startWidths = [];

// Panel memory for toggle functionality
let panelMemory = {
    snippetWidth: '25%',
    editorWidth: '50%',
    previewWidth: '25%'
};

// Sample Vega-Lite specification
const sampleSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "A simple bar chart with embedded data.",
    "data": {
        "values": [
            { "category": "A", "value": 28 },
            { "category": "B", "value": 55 },
            { "category": "C", "value": 43 },
            { "category": "D", "value": 91 },
            { "category": "E", "value": 81 },
            { "category": "F", "value": 53 },
            { "category": "G", "value": 19 },
            { "category": "H", "value": 87 }
        ]
    },
    "mark": "bar",
    "encoding": {
        "x": { "field": "category", "type": "nominal", "axis": { "labelAngle": 0 } },
        "y": { "field": "value", "type": "quantitative" }
    }
};

