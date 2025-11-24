// Application version (update with each release)
const APP_VERSION = '0.3.0';

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

// URL State Management
const URLState = {
    // Parse current hash into state object
    parse() {
        const hash = window.location.hash.slice(1); // Remove '#'
        if (!hash) return { view: 'snippets', snippetId: null, datasetId: null, action: null };

        const parts = hash.split('/');

        // #snippet-123456
        if (hash.startsWith('snippet-')) {
            return { view: 'snippets', snippetId: hash, datasetId: null, action: null };
        }

        // #datasets
        if (parts[0] === 'datasets') {
            if (parts.length === 1) {
                return { view: 'datasets', snippetId: null, datasetId: null, action: null };
            }
            // #datasets/new
            if (parts[1] === 'new') {
                return { view: 'datasets', snippetId: null, datasetId: 'new', action: null };
            }
            // #datasets/dataset-123456/build (chart builder)
            if (parts.length === 3 && parts[2] === 'build' && parts[1].startsWith('dataset-')) {
                return { view: 'datasets', snippetId: null, datasetId: parts[1], action: 'build' };
            }
            // #datasets/edit-dataset-123456 or #datasets/dataset-123456
            if (parts[1].startsWith('edit-') || parts[1].startsWith('dataset-')) {
                return { view: 'datasets', snippetId: null, datasetId: parts[1], action: null };
            }
        }

        return { view: 'snippets', snippetId: null, datasetId: null, action: null };
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

                // Add action suffix if present
                if (state.action === 'build') {
                    hash += '/build';
                }
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

// Alpine.js Store for toast notifications
document.addEventListener('alpine:init', () => {
    Alpine.store('toasts', {
        items: [],
        counter: 0,
        DURATION: 4000,

        add(message, type = 'info') {
            const id = ++this.counter;
            const toast = { id, message, type, visible: false };
            this.items.push(toast);

            // Trigger show animation on next tick
            setTimeout(() => {
                const found = this.items.find(t => t.id === id);
                if (found) found.visible = true;
            }, 10);

            // Auto-dismiss
            setTimeout(() => this.remove(id), this.DURATION);
        },

        remove(id) {
            const toast = this.items.find(t => t.id === id);
            if (toast) {
                toast.visible = false;
                // Remove from array after animation
                setTimeout(() => {
                    this.items = this.items.filter(t => t.id !== id);
                }, 300);
            }
        },

        getIcon(type) {
            const icons = {
                error: '❌',
                success: '✓',
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || icons.info;
        }
    });

    // Preview panel fit mode store
    Alpine.store('preview', {
        fitMode: 'default' // 'default' | 'width' | 'full'
    });
});

// Toast Notification System (now backed by Alpine store)
const Toast = {
    // Auto-dismiss duration in milliseconds
    DURATION: 4000,

    // Show toast notification
    show(message, type = 'info') {
        if (Alpine.store('toasts')) {
            Alpine.store('toasts').add(message, type);
        }
    },

    // Dismiss specific toast
    dismiss(toastId) {
        if (Alpine.store('toasts')) {
            Alpine.store('toasts').remove(toastId);
        }
    },

    // Convenience methods
    error(message) {
        this.show(message, 'error');
    },

    success(message) {
        this.show(message, 'success');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

// Analytics utility: Track events with GoatCounter
const Analytics = {
    track(eventName, title) {
        // Only track if GoatCounter is loaded
        if (window.goatcounter && window.goatcounter.count) {
            window.goatcounter.count({
                path: eventName,
                title: title || eventName,
                event: true,
            });
        }
    }
};

// Modal Manager - Generic modal control utility
const ModalManager = {
    // Track which events to send to analytics when opening modals
    trackingMap: {
        'help-modal': ['modal-help', 'Open Help modal'],
        'donate-modal': ['modal-donate', 'Open Donate modal'],
        'settings-modal': ['modal-settings', 'Open Settings modal'],
        'dataset-modal': ['modal-dataset', 'Open Dataset Manager']
    },

    open(modalId, shouldTrack = true) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            if (shouldTrack && this.trackingMap[modalId]) {
                const [event, title] = this.trackingMap[modalId];
                Analytics.track(event, title);
            }
        }
    },

    close(modalId) {
        // Special handling for dataset modal to ensure URL state is updated
        if (modalId === 'dataset-modal' && typeof closeDatasetManager === 'function') {
            closeDatasetManager();
            return;
        }

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    isOpen(modalId) {
        const modal = document.getElementById(modalId);
        return modal && modal.style.display === 'flex';
    },

    // Close any open modal (for ESC key handler)
    closeAny() {
        const modalIds = ['chart-builder-modal', 'help-modal', 'donate-modal', 'settings-modal', 'dataset-modal', 'extract-modal'];
        for (const modalId of modalIds) {
            if (this.isOpen(modalId)) {
                // Special handling for chart builder to properly update URL
                if (modalId === 'chart-builder-modal' && typeof closeChartBuilder === 'function') {
                    closeChartBuilder();
                    return true;
                }
                this.close(modalId);
                return true;
            }
        }
        return false;
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
