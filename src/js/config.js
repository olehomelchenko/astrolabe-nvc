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

// Settings storage
const AppSettings = {
    STORAGE_KEY: 'astrolabe-settings',

    // Default settings
    defaults: {
        sortBy: 'modified',
        sortOrder: 'desc'
    },

    // Load settings from localStorage
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? { ...this.defaults, ...JSON.parse(stored) } : this.defaults;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.defaults;
        }
    },

    // Save settings to localStorage
    save(settings) {
        try {
            const currentSettings = this.load();
            const updatedSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    },

    // Get specific setting
    get(key) {
        const settings = this.load();
        return settings[key];
    },

    // Set specific setting
    set(key, value) {
        const update = {};
        update[key] = value;
        return this.save(update);
    }
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

