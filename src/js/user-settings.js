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
function getSetting(path) {
    const settings = getSettings();
    const parts = path.split('.');
    let value = settings;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return undefined;
        }
    }

    return value;
}

// Update a specific setting by path
function updateSetting(path, value) {
    const settings = getSettings();
    const parts = path.split('.');
    let target = settings;

    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!target[part] || typeof target[part] !== 'object') {
            target[part] = {};
        }
        target = target[part];
    }

    // Set the value
    const lastPart = parts[parts.length - 1];
    target[lastPart] = value;

    return saveSettings();
}

// Update multiple settings at once
function updateSettings(updates) {
    const settings = getSettings();

    for (const path in updates) {
        const parts = path.split('.');
        let target = settings;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!target[part] || typeof target[part] !== 'object') {
                target[part] = {};
            }
            target = target[part];
        }

        const lastPart = parts[parts.length - 1];
        target[lastPart] = updates[path];
    }

    return saveSettings();
}

// Reset all settings to defaults
function resetSettings() {
    userSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return saveSettings();
}

// Export settings as JSON
function exportSettings() {
    return JSON.stringify(getSettings(), null, 2);
}

// Import settings from JSON string
function importSettings(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        userSettings = mergeWithDefaults(imported);
        return saveSettings();
    } catch (error) {
        console.error('Error importing settings:', error);
        return false;
    }
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

// Validate setting value
function validateSetting(path, value) {
    const errors = [];

    if (path === 'editor.fontSize') {
        if (typeof value !== 'number' || value < 10 || value > 18) {
            errors.push('Font size must be between 10 and 18');
        }
    }

    if (path === 'editor.theme') {
        const validThemes = ['vs-light', 'vs-dark', 'hc-black'];
        if (!validThemes.includes(value)) {
            errors.push('Invalid theme value');
        }
    }

    if (path === 'editor.tabSize') {
        if (typeof value !== 'number' || value < 2 || value > 8) {
            errors.push('Tab size must be between 2 and 8');
        }
    }

    if (path === 'performance.renderDebounce') {
        if (typeof value !== 'number' || value < 300 || value > 3000) {
            errors.push('Render debounce must be between 300 and 3000ms');
        }
    }

    if (path === 'formatting.dateFormat') {
        const validFormats = ['smart', 'locale', 'iso', 'custom'];
        if (!validFormats.includes(value)) {
            errors.push('Invalid date format value');
        }
    }

    return errors;
}
