// user-settings.js - User preferences and configuration management

const SETTINGS_STORAGE_KEY = 'astrolabe-user-settings';

// Default settings configuration
const DEFAULT_SETTINGS = {
    version: 1,

    editor: {
        fontSize: 12,              // 10-18px
        theme: 'vs-light',         // 'vs-light' | 'vs-dark' | 'hc-black'
        minimap: false,            // true | false
        wordWrap: 'on',            // 'on' | 'off'
        lineNumbers: 'on',         // 'on' | 'off'
        tabSize: 2                 // 2-8 spaces
    },

    performance: {
        renderDebounce: 1500       // 300-3000ms - delay before visualization renders
    },

    ui: {
        theme: 'light',            // 'light' | 'experimental'
        previewFitMode: 'default'  // 'default' | 'width' | 'full'
    },

    formatting: {
        dateFormat: 'smart',       // 'smart' | 'locale' | 'iso' | 'custom'
        customDateFormat: 'yyyy-MM-dd HH:mm'  // Used when dateFormat === 'custom'
    }
};

// Current user settings (loaded from localStorage or defaults)
let userSettings = null;

// Initialize settings - load from localStorage or use defaults
function initSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle version upgrades
            userSettings = mergeWithDefaults(parsed);
        } else {
            userSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
        userSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    return userSettings;
}

// Merge stored settings with defaults (handles new settings in updates)
function mergeWithDefaults(stored) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    // Merge each section
    for (const section in stored) {
        if (merged[section] && typeof merged[section] === 'object') {
            Object.assign(merged[section], stored[section]);
        } else {
            merged[section] = stored[section];
        }
    }

    return merged;
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings));
        return true;
    } catch (error) {
        console.error('Error saving user settings:', error);
        return false;
    }
}

// Get all current settings
function getSettings() {
    if (!userSettings) {
        initSettings();
    }
    return userSettings;
}

// Get a specific setting by path (e.g., 'editor.fontSize')
// Simplified: assumes 2-level structure (section.key)
function getSetting(path) {
    const settings = getSettings();
    const [section, key] = path.split('.');
    return settings?.[section]?.[key];
}

// Update a specific setting by path
// Simplified: assumes 2-level structure (section.key)
function updateSetting(path, value) {
    const settings = getSettings();
    const [section, key] = path.split('.');

    if (settings[section]) {
        settings[section][key] = value;
        return saveSettings();
    }
    return false;
}

// Update multiple settings at once
function updateSettings(updates) {
    const settings = getSettings();

    for (const path in updates) {
        const [section, key] = path.split('.');
        if (settings[section]) {
            settings[section][key] = updates[path];
        }
    }

    return saveSettings();
}

// Reset all settings to defaults
function resetSettings() {
    userSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return saveSettings();
}

// Format date according to user settings
function formatDate(isoString, useFullFormat = false) {
    const date = new Date(isoString);
    const format = getSetting('formatting.dateFormat');

    if (!useFullFormat && format === 'smart') {
        // Smart format: relative for recent dates
        const diffMs = new Date() - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    if (format === 'locale') {
        return useFullFormat
            ? date.toLocaleString([], {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
            : date.toLocaleDateString();
    }

    if (format === 'iso') {
        return useFullFormat
            ? date.toISOString()
            : date.toISOString().split('T')[0];
    }

    if (format === 'custom') {
        const customFormat = getSetting('formatting.customDateFormat');
        return formatCustomDate(date, customFormat);
    }

    // Fallback to locale
    return date.toLocaleDateString();
}

// Format date using custom format tokens
function formatCustomDate(date, format) {
    const pad = (n, width = 2) => String(n).padStart(width, '0');

    const tokens = {
        'yyyy': date.getFullYear(),
        'yy': String(date.getFullYear()).slice(-2),
        'MM': pad(date.getMonth() + 1),
        'M': date.getMonth() + 1,
        'dd': pad(date.getDate()),
        'd': date.getDate(),
        'HH': pad(date.getHours()),
        'H': date.getHours(),
        'hh': pad(date.getHours() % 12 || 12),
        'h': date.getHours() % 12 || 12,
        'mm': pad(date.getMinutes()),
        'm': date.getMinutes(),
        'ss': pad(date.getSeconds()),
        's': date.getSeconds(),
        'a': date.getHours() < 12 ? 'am' : 'pm',
        'A': date.getHours() < 12 ? 'AM' : 'PM'
    };

    let result = format;
    // Sort by length descending to replace longer tokens first
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);
    for (const token of sortedTokens) {
        result = result.replace(new RegExp(token, 'g'), tokens[token]);
    }

    return result;
}

// Validate setting value - simplified with inline validation rules
function validateSetting(path, value) {
    const rules = {
        'editor.fontSize': () => typeof value === 'number' && value >= 10 && value <= 18 ? [] : ['Font size must be between 10 and 18'],
        'editor.theme': () => ['vs-light', 'vs-dark', 'hc-black'].includes(value) ? [] : ['Invalid editor theme'],
        'editor.tabSize': () => typeof value === 'number' && value >= 2 && value <= 8 ? [] : ['Tab size must be between 2 and 8'],
        'performance.renderDebounce': () => typeof value === 'number' && value >= 300 && value <= 3000 ? [] : ['Render debounce must be between 300-3000ms'],
        'formatting.dateFormat': () => ['smart', 'locale', 'iso', 'custom'].includes(value) ? [] : ['Invalid date format'],
        'ui.theme': () => ['light', 'experimental'].includes(value) ? [] : ['Invalid UI theme']
    };

    return rules[path] ? rules[path]() : [];
}

// Alpine.js Component for settings panel
// Thin wrapper - Alpine handles form state and reactivity, user-settings.js handles storage
function settingsPanel() {
    return {
        // Form state (loaded from settings on open)
        uiTheme: 'light',
        fontSize: 12,
        editorTheme: 'vs-light',
        tabSize: 2,
        minimap: false,
        wordWrap: true,
        lineNumbers: true,
        renderDebounce: 1500,
        dateFormat: 'smart',
        customDateFormat: 'yyyy-MM-dd HH:mm',

        // Original values for dirty checking
        originalSettings: null,

        // Initialize component with current settings
        init() {
            this.loadSettings();
        },

        // Load settings from storage into form
        loadSettings() {
            const settings = getSettings();
            this.uiTheme = settings.ui.theme;
            this.fontSize = settings.editor.fontSize;
            this.editorTheme = settings.editor.theme;
            this.tabSize = settings.editor.tabSize;
            this.minimap = settings.editor.minimap;
            this.wordWrap = settings.editor.wordWrap === 'on';
            this.lineNumbers = settings.editor.lineNumbers === 'on';
            this.renderDebounce = settings.performance.renderDebounce;
            this.dateFormat = settings.formatting.dateFormat;
            this.customDateFormat = settings.formatting.customDateFormat;

            // Store original values for dirty checking
            this.originalSettings = JSON.stringify(this.getCurrentFormState());
        },

        // Get current form state as object
        getCurrentFormState() {
            return {
                uiTheme: this.uiTheme,
                fontSize: this.fontSize,
                editorTheme: this.editorTheme,
                tabSize: this.tabSize,
                minimap: this.minimap,
                wordWrap: this.wordWrap,
                lineNumbers: this.lineNumbers,
                renderDebounce: this.renderDebounce,
                dateFormat: this.dateFormat,
                customDateFormat: this.customDateFormat
            };
        },

        // Check if settings have been modified
        get isDirty() {
            return this.originalSettings !== JSON.stringify(this.getCurrentFormState());
        },

        // Show custom date format field when 'custom' is selected
        get showCustomDateFormat() {
            return this.dateFormat === 'custom';
        },

        // Apply settings and save
        apply() {
            const newSettings = {
                'ui.theme': this.uiTheme,
                'editor.fontSize': parseInt(this.fontSize),
                'editor.theme': this.editorTheme,
                'editor.tabSize': parseInt(this.tabSize),
                'editor.minimap': this.minimap,
                'editor.wordWrap': this.wordWrap ? 'on' : 'off',
                'editor.lineNumbers': this.lineNumbers ? 'on' : 'off',
                'performance.renderDebounce': parseInt(this.renderDebounce),
                'formatting.dateFormat': this.dateFormat,
                'formatting.customDateFormat': this.customDateFormat
            };

            // Validate settings
            let hasErrors = false;
            for (const [path, value] of Object.entries(newSettings)) {
                const errors = validateSetting(path, value);
                if (errors.length > 0) {
                    Toast.show(errors.join(', '), 'error');
                    hasErrors = true;
                    break;
                }
            }

            if (hasErrors) return;

            // Save settings
            if (updateSettings(newSettings)) {
                // Apply theme to document
                document.documentElement.setAttribute('data-theme', this.uiTheme);

                // Sync editor theme with UI theme
                const editorTheme = this.uiTheme === 'experimental' ? 'vs-dark' : 'vs-light';
                newSettings['editor.theme'] = editorTheme;

                // Apply editor settings immediately
                if (editor) {
                    editor.updateOptions({
                        fontSize: newSettings['editor.fontSize'],
                        theme: editorTheme,
                        tabSize: newSettings['editor.tabSize'],
                        minimap: { enabled: newSettings['editor.minimap'] },
                        wordWrap: newSettings['editor.wordWrap'],
                        lineNumbers: newSettings['editor.lineNumbers']
                    });
                }

                // Update the editor theme in settings
                updateSetting('editor.theme', editorTheme);

                // Update debounced render function
                if (typeof updateRenderDebounce === 'function') {
                    updateRenderDebounce(newSettings['performance.renderDebounce']);
                }

                // Re-render snippet list to reflect date format changes
                renderSnippetList();

                // Update metadata display if a snippet is selected
                if (Alpine.store('snippets').currentSnippetId) {
                    const snippet = SnippetStorage.getSnippet(Alpine.store('snippets').currentSnippetId);
                    if (snippet) {
                        document.getElementById('snippet-created').textContent = formatDate(snippet.created, true);
                        document.getElementById('snippet-modified').textContent = formatDate(snippet.modified, true);
                    }
                }

                Toast.success('Settings applied successfully');
                closeSettingsModal();

                // Track event
                Analytics.track('settings-apply', 'Applied settings');
            } else {
                Toast.error('Failed to save settings');
            }
        },

        // Reset to defaults
        reset() {
            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                resetSettings();
                this.loadSettings();
                Toast.success('Settings reset to defaults');
            }
        },

        // Cancel changes and close modal
        cancel() {
            closeSettingsModal();
        }
    };
}
