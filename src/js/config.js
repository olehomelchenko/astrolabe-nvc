// Global variables and configuration
let editor; // Global editor instance
let renderTimeout; // For debouncing
let currentViewMode = 'draft'; // Track current view mode: 'draft' or 'published'

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

// URL State Management
const URLState = {
    // Parse current hash into state object
    parse() {
        const hash = window.location.hash.slice(1); // Remove '#'
        if (!hash) return { view: 'snippets', snippetId: null, datasetId: null };

        const parts = hash.split('/');

        // #snippet-123456
        if (hash.startsWith('snippet-')) {
            return { view: 'snippets', snippetId: hash, datasetId: null };
        }

        // #datasets
        if (parts[0] === 'datasets') {
            if (parts.length === 1) {
                return { view: 'datasets', snippetId: null, datasetId: null };
            }
            // #datasets/new
            if (parts[1] === 'new') {
                return { view: 'datasets', snippetId: null, datasetId: 'new' };
            }
            // #datasets/dataset-123456
            if (parts[1].startsWith('dataset-')) {
                return { view: 'datasets', snippetId: null, datasetId: parts[1] };
            }
        }

        return { view: 'snippets', snippetId: null, datasetId: null };
    },

    // Update URL hash without triggering hashchange
    update(state, replaceState = false) {
        let hash = '';

        if (state.view === 'datasets') {
            if (state.datasetId === 'new') {
                hash = '#datasets/new';
            } else if (state.datasetId) {
                // Add 'dataset-' prefix if not already present
                const datasetId = typeof state.datasetId === 'string' && state.datasetId.startsWith('dataset-')
                    ? state.datasetId
                    : `dataset-${state.datasetId}`;
                hash = `#datasets/${datasetId}`;
            } else {
                hash = '#datasets';
            }
        } else if (state.snippetId) {
            // Add 'snippet-' prefix if not already present
            const snippetId = typeof state.snippetId === 'string' && state.snippetId.startsWith('snippet-')
                ? state.snippetId
                : `snippet-${state.snippetId}`;
            hash = `#${snippetId}`;
        }

        if (replaceState) {
            window.history.replaceState(null, '', hash || '#');
        } else {
            window.location.hash = hash;
        }
    },

    // Clear hash
    clear() {
        window.history.replaceState(null, '', window.location.pathname);
    }
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

// Shared utility: Format bytes for display
function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

