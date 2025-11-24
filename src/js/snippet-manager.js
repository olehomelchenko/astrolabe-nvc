// Snippet management and localStorage functionality

// Alpine.js Store for UI state only (selection tracking)
// Business logic stays in SnippetStorage
document.addEventListener('alpine:init', () => {
    Alpine.store('snippets', {
        currentSnippetId: null,
        viewMode: 'draft' // 'draft' or 'published'
    });
});

// Alpine.js Component for snippet list
// Thin wrapper around SnippetStorage - Alpine handles reactivity, storage handles logic
function snippetList() {
    return {
        searchQuery: '',
        sortBy: AppSettings.get('sortBy') || 'modified',
        sortOrder: AppSettings.get('sortOrder') || 'desc',

        // Meta fields for selected snippet
        snippetName: '',
        snippetComment: '',
        metaSaveTimeout: null,

        // Computed property: calls SnippetStorage with current filters/sort
        get filteredSnippets() {
            return SnippetStorage.listSnippets(
                this.sortBy,
                this.sortOrder,
                this.searchQuery
            );
        },

        toggleSort(sortType) {
            if (this.sortBy === sortType) {
                // Toggle order
                this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            } else {
                // Switch to new sort type with desc order
                this.sortBy = sortType;
                this.sortOrder = 'desc';
            }

            // Save to settings
            AppSettings.set('sortBy', this.sortBy);
            AppSettings.set('sortOrder', this.sortOrder);
        },

        clearSearch() {
            this.searchQuery = '';
            const searchInput = document.getElementById('snippet-search');
            if (searchInput) searchInput.focus();
        },

        // Helper methods for display
        formatDate(snippet) {
            const date = this.sortBy === 'created' ? snippet.created : snippet.modified;
            return formatSnippetDate(date);
        },

        getSize(snippet) {
            const snippetSize = new Blob([JSON.stringify(snippet)]).size;
            return snippetSize / 1024; // KB
        },

        hasDraft(snippet) {
            return JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);
        },

        // Load meta fields when a snippet is selected
        loadMetadata(snippet) {
            this.snippetName = snippet.name || '';
            this.snippetComment = snippet.comment || '';
        },

        // Save meta fields with debouncing (called via x-model watchers)
        saveMetaDebounced() {
            clearTimeout(this.metaSaveTimeout);
            this.metaSaveTimeout = setTimeout(() => this.saveMeta(), 1000);
        },

        // Save meta fields to storage
        saveMeta() {
            const snippet = getCurrentSnippet();
            if (snippet) {
                snippet.name = this.snippetName.trim() || generateSnippetName();
                snippet.comment = this.snippetComment;
                SnippetStorage.saveSnippet(snippet);

                // Update the snippet list display to reflect the new name
                renderSnippetList();

                // Restore selection after re-render
                restoreSnippetSelection();
            }
        },

        // Actions
        selectSnippet(snippetId) {
            window.selectSnippet(snippetId);
        },

        createNewSnippet() {
            window.createNewSnippet();
        }
    };
}

// Storage limits (5MB in bytes)
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

// Generate unique ID using Date.now() + random numbers
function generateSnippetId() {
    return Date.now() + Math.random() * 1000;
}

// Generate auto-populated name with current datetime
function generateSnippetName() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

// Nested spec keys for recursive traversal
const NESTED_SPEC_KEYS = ['layer', 'concat', 'hconcat', 'vconcat', 'spec'];

// Generic spec traversal helper - executes callback on each spec object
// Returns first non-undefined result, or defaultReturn if no match found
function traverseSpec(spec, callback, defaultReturn = null) {
    if (!spec || typeof spec !== 'object') return defaultReturn;

    const result = callback(spec);
    if (result !== undefined) return result;

    for (const key of NESTED_SPEC_KEYS) {
        if (Array.isArray(spec[key])) {
            for (const item of spec[key]) {
                const result = traverseSpec(item, callback, defaultReturn);
                if (result !== undefined) return result;
            }
        } else if (spec[key] && typeof spec[key] === 'object') {
            const result = traverseSpec(spec[key], callback, defaultReturn);
            if (result !== undefined) return result;
        }
    }
    return defaultReturn;
}

// Extract dataset references from Vega-Lite spec
function extractDatasetRefs(spec) {
    const datasetNames = new Set();

    function traverse(obj) {
        if (!obj || typeof obj !== 'object') return;

        // Check if this is a data object with a name property
        if (obj.data && typeof obj.data === 'object' && obj.data.name) {
            datasetNames.add(obj.data.name);
        }

        // Recursively check all properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                traverse(obj[key]);
            }
        }
    }

    traverse(spec);
    return Array.from(datasetNames);
}

// Detect if spec has inline data (data.values)
function hasInlineData(spec) {
    return traverseSpec(spec, (s) => {
        if (s.data && s.data.values) {
            if (Array.isArray(s.data.values) || typeof s.data.values === 'string') {
                return true;
            }
        }
        return undefined;
    }, false) === true;
}

// Extract inline data from spec (finds first occurrence)
function extractInlineDataFromSpec(spec) {
    return traverseSpec(spec, (s) => {
        if (s.data && s.data.values) {
            if (Array.isArray(s.data.values) || typeof s.data.values === 'string') {
                return s.data.values;
            }
        }
        return undefined;
    }, null);
}

// Detect inline data format from spec
function detectInlineDataFormat(spec) {
    return traverseSpec(spec, (s) => {
        if (s.data && s.data.format && s.data.format.type) {
            const formatType = s.data.format.type.toLowerCase();
            if (formatType === 'csv' || formatType === 'tsv' || formatType === 'json' || formatType === 'topojson') {
                return formatType;
            }
        }
        return undefined;
    }, 'json');
}

// Replace inline data with dataset reference
function replaceInlineDataWithReference(spec, datasetName) {
    if (!spec || typeof spec !== 'object') return spec;

    // Clone the spec to avoid mutation
    const newSpec = JSON.parse(JSON.stringify(spec));
    let replaced = false;

    // Traverse and replace first occurrence of inline data
    (function traverseAndReplace(obj) {
        if (replaced || !obj || typeof obj !== 'object') return;

        if (obj.data && obj.data.values && (Array.isArray(obj.data.values) || typeof obj.data.values === 'string')) {
            obj.data = { name: datasetName };
            replaced = true;
            return;
        }

        for (const key of NESTED_SPEC_KEYS) {
            if (replaced) return;
            if (Array.isArray(obj[key])) {
                for (const item of obj[key]) {
                    traverseAndReplace(item);
                    if (replaced) return;
                }
            } else if (obj[key] && typeof obj[key] === 'object') {
                traverseAndReplace(obj[key]);
            }
        }
    })(newSpec);

    return newSpec;
}

// Create a new snippet using Phase 0 schema
function createSnippet(spec, name = null) {
    const now = new Date().toISOString();

    return {
        id: generateSnippetId(),
        name: name || generateSnippetName(),
        created: now,
        modified: now,
        spec: spec,
        draftSpec: spec, // Initially same as spec
        comment: "",
        tags: [],
        datasetRefs: [],
        meta: {}
    };
}

// LocalStorage wrapper with error handling
const SnippetStorage = {
    STORAGE_KEY: 'astrolabe-snippets',

    // Save all snippets to localStorage
    saveSnippets(snippets) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snippets));
            updateStorageMonitor();
            return true;
        } catch (error) {
            console.error('Failed to save snippets to localStorage:', error);
            Toast.error('Failed to save: Storage quota may be exceeded. Consider deleting old snippets.');
            return false;
        }
    },

    // Load all snippets from localStorage
    loadSnippets() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load snippets from localStorage:', error);
            return [];
        }
    },

    // Get single snippet by ID
    getSnippet(id) {
        const snippets = this.loadSnippets();
        return snippets.find(snippet => snippet.id === id);
    },

    // Save single snippet (add or update)
    saveSnippet(snippet) {
        const snippets = this.loadSnippets();
        const existingIndex = snippets.findIndex(s => s.id === snippet.id);

        snippet.modified = new Date().toISOString();

        if (existingIndex >= 0) {
            snippets[existingIndex] = snippet;
        } else {
            snippets.push(snippet);
        }

        return this.saveSnippets(snippets);
    },

    // Delete snippet by ID
    deleteSnippet(id) {
        const snippets = this.loadSnippets();
        const filteredSnippets = snippets.filter(snippet => snippet.id !== id);
        return this.saveSnippets(filteredSnippets);
    },

    // Get all snippets with sorting and filtering
    listSnippets(sortBy = null, sortOrder = null, searchQuery = null) {
        let snippets = this.loadSnippets();

        // Apply search filter if provided
        if (searchQuery && searchQuery.trim()) {
            snippets = this.filterSnippets(snippets, searchQuery.trim());
        }

        // Use provided sort options or fall back to settings
        const actualSortBy = sortBy || AppSettings.get('sortBy') || 'modified';
        const actualSortOrder = sortOrder || AppSettings.get('sortOrder') || 'desc';

        return snippets.sort((a, b) => {
            let comparison = 0;

            switch (actualSortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'created':
                    comparison = new Date(a.created) - new Date(b.created);
                    break;
                case 'size':
                    // Calculate size for both snippets
                    const sizeA = new Blob([JSON.stringify(a)]).size;
                    const sizeB = new Blob([JSON.stringify(b)]).size;
                    comparison = sizeA - sizeB;
                    break;
                case 'modified':
                default:
                    comparison = new Date(a.modified) - new Date(b.modified);
                    break;
            }

            return actualSortOrder === 'desc' ? -comparison : comparison;
        });
    },

    // Filter snippets based on search query
    filterSnippets(snippets, query) {
        const searchTerm = query.toLowerCase();

        return snippets.filter(snippet => {
            // Search in name
            if (snippet.name.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Search in comment
            if (snippet.comment && snippet.comment.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Search in spec content (JSON stringified)
            try {
                const specText = JSON.stringify(snippet.draftSpec || snippet.spec).toLowerCase();
                if (specText.includes(searchTerm)) {
                    return true;
                }
            } catch (error) {
                // Ignore JSON stringify errors
            }

            return false;
        });
    }
};

// Initialize storage with sample data from JSON file if empty
async function initializeSnippetsStorage() {
    const existingSnippets = SnippetStorage.loadSnippets();

    if (existingSnippets.length === 0) {
        // Try loading sample data from JSON file
        try {
            const response = await fetch('sample-data.json');
            if (response.ok) {
                const sampleData = await response.json();
                const result = await processImportedData(sampleData, { silent: true });

                if (result.success) {
                    return result.normalizedSnippets;
                }
            }
        } catch (error) {
            console.warn('Failed to load sample-data.json, using fallback:', error);
        }

        // Fallback: create default snippet using the sample spec from config
        const defaultSnippet = createSnippet(sampleSpec, "Sample Bar Chart");
        defaultSnippet.comment = "A simple bar chart showing category values";

        SnippetStorage.saveSnippet(defaultSnippet);
        return [defaultSnippet];
    }

    return existingSnippets;
}

// Format date for display in snippet list (delegates to user-settings.js)
function formatSnippetDate(isoString) {
    return formatDate(isoString, false);
}

// Format full date/time for display in meta info (delegates to user-settings.js)
function formatFullDate(isoString) {
    return formatDate(isoString, true);
}

// Render snippet list in the UI
// With Alpine.js, the list is reactive - no manual rendering needed
// This function kept as no-op for backwards compatibility
function renderSnippetList(searchQuery = null) {
    // Alpine.js handles rendering automatically via reactive bindings
}

// Initialize sort controls
// NOTE: Alpine.js now handles all sort/search controls via directives
// These functions kept as no-ops for backwards compatibility with app.js
function initializeSortControls() {
    // Alpine.js handles this
}

function initializeSearchControls() {
    // Alpine.js handles this
}

// Helper: Get currently selected snippet
function getCurrentSnippet() {
    return window.currentSnippetId ? SnippetStorage.getSnippet(window.currentSnippetId) : null;
}

// Helper: Restore visual selection state for current snippet
function restoreSnippetSelection() {
    if (window.currentSnippetId) {
        const item = document.querySelector(`[data-item-id="${window.currentSnippetId}"]`);
        if (item) {
            item.classList.add('selected');
            return item;
        }
    }
    return null;
}

// Clear current selection and hide meta panel
function clearSelection() {
    window.currentSnippetId = null;
    document.querySelectorAll('.snippet-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Clear editor content
    if (editor) {
        window.isUpdatingEditor = true;
        editor.setValue('{}');
        window.isUpdatingEditor = false;
    }

    // Hide meta panel and show placeholder
    const metaSection = document.getElementById('snippet-meta');
    const placeholder = document.querySelector('.placeholder');
    if (metaSection) metaSection.style.display = 'none';
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.textContent = 'Click to select a snippet';
    }
}

// Select and load a snippet into the editor
function selectSnippet(snippetId, updateURL = true) {
    const snippet = SnippetStorage.getSnippet(snippetId);
    if (!snippet) return;

    // Update Alpine store selection for UI highlighting
    if (typeof Alpine !== 'undefined' && Alpine.store('snippets')) {
        Alpine.store('snippets').currentSnippetId = snippetId;
    }

    // Load spec based on current view mode
    loadSnippetIntoEditor(snippet);
    updateViewModeUI(snippet);

    // Show and populate meta fields
    const metaSection = document.getElementById('snippet-meta');
    const createdField = document.getElementById('snippet-created');
    const modifiedField = document.getElementById('snippet-modified');
    const placeholder = document.querySelector('.placeholder');

    if (metaSection) {
        metaSection.style.display = 'block';

        // Load metadata into Alpine component
        const snippetPanel = document.getElementById('snippet-panel');
        if (snippetPanel && snippetPanel._x_dataStack) {
            const alpineData = snippetPanel._x_dataStack[0];
            if (alpineData && typeof alpineData.loadMetadata === 'function') {
                alpineData.loadMetadata(snippet);
            }
        }

        // Format and display dates
        if (createdField) {
            createdField.textContent = formatFullDate(snippet.created);
        }
        if (modifiedField) {
            modifiedField.textContent = formatFullDate(snippet.modified);
        }

        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    // Store currently selected snippet ID globally
    window.currentSnippetId = snippetId;

    // Update linked datasets display
    updateLinkedDatasets(snippet);

    // Update Extract to Dataset button visibility
    updateExtractButton();

    // Update URL state (URLState.update will add 'snippet-' prefix)
    if (updateURL) {
        URLState.update({ view: 'snippets', snippetId: snippetId, datasetId: null });
    }
}

// Update linked datasets display in metadata panel
function updateLinkedDatasets(snippet) {
    const datasetRefs = snippet.datasetRefs || [];

    updateGenericLinkedItems(
        datasetRefs,
        'snippet-datasets',
        'snippet-datasets-section',
        (datasetName) => `
            <div class="meta-info-item">
                <span class="meta-info-label">📁</span>
                <span class="meta-info-value">
                    <a href="#datasets" class="dataset-link" data-linked-item-id="${datasetName}" title="Open dataset manager and view this dataset">${datasetName}</a>
                </span>
            </div>
        `,
        async (datasetName) => {
            await openDatasetByName(datasetName);
        }
    );
}

// Open dataset manager and select dataset by name
async function openDatasetByName(datasetName) {
    // Open dataset manager modal
    openDatasetManager();

    // Wait for datasets to load and find the one with matching name
    // We need to use DatasetStorage which is defined in dataset-manager.js
    try {
        const dataset = await DatasetStorage.getDatasetByName(datasetName);
        if (dataset) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                selectDataset(dataset.id);
            }, 100);
        } else {
            Toast.error(`Dataset "${datasetName}" not found. It may have been deleted.`);
        }
    } catch (error) {
        console.error('Error opening dataset:', error);
        Toast.error(`Could not open dataset "${datasetName}".`);
    }
}

// Auto-save functionality
let autoSaveTimeout;
window.isUpdatingEditor = false; // Global flag to prevent auto-save/debounce during programmatic updates

// Save current editor content as draft for the selected snippet
function autoSaveDraft() {
    if (!window.currentSnippetId || !editor) return;

    // Only save to draft if we're in draft mode
    if (Alpine.store('snippets').viewMode !== 'draft') return;

    try {
        const currentSpec = JSON.parse(editor.getValue());
        const snippet = getCurrentSnippet();

        if (snippet) {
            snippet.draftSpec = currentSpec;

            // Extract and update dataset references
            snippet.datasetRefs = extractDatasetRefs(currentSpec);

            SnippetStorage.saveSnippet(snippet);

            // Refresh snippet list to update status light and dataset indicator
            renderSnippetList();
            // Restore selection
            restoreSnippetSelection();

            // Update button states
            updateViewModeUI(snippet);
        }
    } catch (error) {
        // Ignore JSON parse errors during editing
    }
}

// Debounced auto-save (triggered on editor changes)
function debouncedAutoSave() {
    // Don't auto-save if we're programmatically updating the editor
    if (window.isUpdatingEditor) return;

    // If viewing published and no draft exists, create draft automatically
    if (Alpine.store('snippets').viewMode === 'published') {
        const snippet = getCurrentSnippet();
        if (snippet) {
            const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);
            if (!hasDraft) {
                // No draft exists, automatically switch to draft mode
                Alpine.store('snippets').viewMode = 'draft';
                updateViewModeUI(snippet);
                editor.updateOptions({ readOnly: false });
            }
        }
    }

    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSaveDraft, 1000); // 1 second delay
}

// Initialize auto-save on editor changes
function initializeAutoSave() {
    // Meta fields auto-save now handled by Alpine.js in snippetList() component

    // Initialize button event listeners
    const duplicateBtn = document.getElementById('duplicate-btn');
    const deleteBtn = document.getElementById('delete-btn');

    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            if (window.currentSnippetId) {
                duplicateSnippet(window.currentSnippetId);
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (window.currentSnippetId) {
                deleteSnippet(window.currentSnippetId);
            }
        });
    }
}

// CRUD Operations

// Create new snippet
function createNewSnippet() {
    const emptySpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"values": []},
        "mark": "point",
        "encoding": {}
    };

    const newSnippet = createSnippet(emptySpec);
    SnippetStorage.saveSnippet(newSnippet);

    // Refresh the list and select the new snippet
    renderSnippetList();
    selectSnippet(newSnippet.id);

    // Track event
    Analytics.track('snippet-create', 'Create new snippet');

    return newSnippet;
}

// Duplicate existing snippet
function duplicateSnippet(snippetId) {
    const originalSnippet = SnippetStorage.getSnippet(snippetId);
    if (!originalSnippet) return;

    const duplicateSpec = JSON.parse(JSON.stringify(originalSnippet.draftSpec));
    const duplicateName = `${originalSnippet.name}_copy`;

    const newSnippet = createSnippet(duplicateSpec, duplicateName);
    newSnippet.comment = originalSnippet.comment;
    newSnippet.tags = [...originalSnippet.tags];
    newSnippet.datasetRefs = extractDatasetRefs(duplicateSpec);

    SnippetStorage.saveSnippet(newSnippet);

    // Refresh the list and select the new snippet
    renderSnippetList();
    selectSnippet(newSnippet.id);

    // Show success message
    Toast.success('Snippet duplicated successfully');

    // Track event
    Analytics.track('snippet-duplicate', 'Duplicate snippet');

    return newSnippet;
}

// Create new snippet from dataset with minimal spec
function createSnippetFromDataset(datasetName) {
    const minimalSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"name": datasetName},
        "mark": {"type": "point", "tooltip": true},
        "encoding": {}
    };

    const newSnippet = createSnippet(minimalSpec);
    newSnippet.comment = `Visualization using dataset: ${datasetName}`;
    newSnippet.datasetRefs = [datasetName];

    SnippetStorage.saveSnippet(newSnippet);

    // Refresh the list and select the new snippet
    renderSnippetList();
    selectSnippet(newSnippet.id);

    // Track event
    Analytics.track('snippet-from-dataset', 'Create snippet from dataset');

    return newSnippet;
}

// Show extract to dataset modal
function showExtractModal() {
    const snippet = getCurrentSnippet();
    if (!snippet) return;

    // Get the draft spec (most recent version)
    const spec = snippet.draftSpec;

    // Check if spec has inline data
    if (!hasInlineData(spec)) {
        Toast.info('No inline data found in this snippet.');
        return;
    }

    // Extract the inline data and its format
    const inlineData = extractInlineDataFromSpec(spec);
    if (!inlineData || (Array.isArray(inlineData) && inlineData.length === 0) || (typeof inlineData === 'string' && inlineData.trim() === '')) {
        Toast.warning('No inline data could be extracted.');
        return;
    }

    // Generate default dataset name from snippet name
    const defaultName = `${snippet.name}_data`.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Show modal
    const modal = document.getElementById('extract-modal');
    const nameInput = document.getElementById('extract-dataset-name');
    const previewEl = document.getElementById('extract-data-preview');
    const errorEl = document.getElementById('extract-form-error');

    nameInput.value = defaultName;

    // Generate preview based on data type
    if (typeof inlineData === 'string') {
        // CSV/TSV data - show first few lines
        const lines = inlineData.trim().split('\n');
        const previewLines = lines.slice(0, 11); // Header + 10 data rows
        previewEl.textContent = previewLines.join('\n');
        if (lines.length > 11) {
            previewEl.textContent += `\n\n... (${lines.length - 11} more rows)`;
        }
    } else {
        // JSON data (array)
        previewEl.textContent = JSON.stringify(inlineData.slice(0, 10), null, 2);
        if (inlineData.length > 10) {
            previewEl.textContent += `\n\n... (${inlineData.length - 10} more rows)`;
        }
    }

    errorEl.textContent = '';

    modal.style.display = 'flex';
}

// Hide extract to dataset modal
function hideExtractModal() {
    const modal = document.getElementById('extract-modal');
    modal.style.display = 'none';
}

// Extract to dataset - create dataset and update snippet
async function extractToDataset() {
    const snippet = getCurrentSnippet();
    if (!snippet) return;

    const nameInput = document.getElementById('extract-dataset-name');
    const errorEl = document.getElementById('extract-form-error');
    const datasetName = nameInput.value.trim();

    errorEl.textContent = '';

    // Validation
    if (!datasetName) {
        errorEl.textContent = 'Dataset name is required';
        return;
    }

    // Check if dataset name already exists
    if (await DatasetStorage.nameExists(datasetName)) {
        errorEl.textContent = 'A dataset with this name already exists';
        return;
    }

    // Extract inline data from draft spec
    const inlineData = extractInlineDataFromSpec(snippet.draftSpec);
    if (!inlineData) {
        errorEl.textContent = 'Could not extract inline data';
        return;
    }

    try {
        // Detect the data format (json, csv, tsv, etc.)
        const format = detectInlineDataFormat(snippet.draftSpec);

        // Create dataset in IndexedDB
        await DatasetStorage.createDataset(datasetName, inlineData, format, 'inline', `Extracted from snippet: ${snippet.name}`);

        // Replace inline data with dataset reference in draft spec
        snippet.draftSpec = replaceInlineDataWithReference(snippet.draftSpec, datasetName);

        // Update dataset references
        snippet.datasetRefs = extractDatasetRefs(snippet.draftSpec);

        // Save snippet
        SnippetStorage.saveSnippet(snippet);

        // Update editor with new spec
        if (editor && Alpine.store('snippets').viewMode === 'draft') {
            window.isUpdatingEditor = true;
            editor.setValue(JSON.stringify(snippet.draftSpec, null, 2));
            window.isUpdatingEditor = false;
        }

        // Refresh UI
        renderSnippetList();
        restoreSnippetSelection();
        updateLinkedDatasets(snippet);
        updateViewModeUI(snippet);
        updateExtractButton();

        // Close modal
        hideExtractModal();

        // Show success message
        Toast.success(`Dataset "${datasetName}" created successfully!`);

        // Track event
        Analytics.track('dataset-extract', 'Extract inline data to dataset');
    } catch (error) {
        errorEl.textContent = `Failed to create dataset: ${error.message}`;
    }
}

// Update visibility of Extract to Dataset button
function updateExtractButton() {
    const extractBtn = document.getElementById('extract-btn');
    if (!extractBtn) return;

    const snippet = getCurrentSnippet();
    if (!snippet) {
        extractBtn.style.display = 'none';
        return;
    }

    // Check if draft spec has inline data
    const hasInline = hasInlineData(snippet.draftSpec);
    extractBtn.style.display = hasInline ? 'block' : 'none';
}

// Delete snippet with confirmation
function deleteSnippet(snippetId) {
    const snippet = SnippetStorage.getSnippet(snippetId);
    if (!snippet) return;

    const confirmed = confirmGenericDeletion(snippet.name, null, () => {
        SnippetStorage.deleteSnippet(snippetId);

        // If we deleted the currently selected snippet, clear selection
        if (window.currentSnippetId === snippetId) {
            clearSelection();
        }

        // Refresh the list
        renderSnippetList();

        // Show success message
        Toast.success('Snippet deleted');

        // Track event
        trackEventIfAvailable('snippet-delete', 'Delete snippet');
    });

    return confirmed;
}

// Load snippet into editor based on view mode
function loadSnippetIntoEditor(snippet) {
    if (!editor) return;

    window.isUpdatingEditor = true;

    const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);

    if (Alpine.store('snippets').viewMode === 'draft') {
        editor.setValue(JSON.stringify(snippet.draftSpec, null, 2));
        editor.updateOptions({ readOnly: false });
    } else {
        // Published view - always read-only if draft exists
        editor.setValue(JSON.stringify(snippet.spec, null, 2));
        editor.updateOptions({ readOnly: hasDraft });
    }

    window.isUpdatingEditor = false;
}

// Update view mode UI (buttons and editor state)
function updateViewModeUI(snippet) {
    const draftBtn = document.getElementById('view-draft');
    const publishedBtn = document.getElementById('view-published');
    const publishBtn = document.getElementById('publish-btn');
    const revertBtn = document.getElementById('revert-btn');

    // Update toggle button states (now handled by Alpine :class binding)
    // But we still need to update the action buttons (publish/revert)
    const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);

    if (Alpine.store('snippets').viewMode === 'draft') {
        // In draft mode: show both buttons, enable based on draft existence
        publishBtn.classList.add('visible');
        revertBtn.classList.add('visible');
        publishBtn.disabled = !hasDraft;
        revertBtn.disabled = !hasDraft;
    } else {
        // In published mode: hide both buttons
        publishBtn.classList.remove('visible');
        revertBtn.classList.remove('visible');
    }
}

// Switch view mode
function switchViewMode(mode) {
    Alpine.store('snippets').viewMode = mode;
    const snippet = getCurrentSnippet();
    if (snippet) {
        loadSnippetIntoEditor(snippet);
        updateViewModeUI(snippet);
    }
}

// Publish draft to spec
function publishDraft() {
    const snippet = getCurrentSnippet();
    if (!snippet) return;

    // Copy draftSpec to spec
    snippet.spec = JSON.parse(JSON.stringify(snippet.draftSpec));

    // Update dataset references for published spec
    snippet.datasetRefs = extractDatasetRefs(snippet.spec);

    SnippetStorage.saveSnippet(snippet);

    // Refresh UI
    renderSnippetList();
    restoreSnippetSelection();

    updateViewModeUI(snippet);

    // Show success message
    Toast.success('Snippet published successfully!');

    // Track event
    Analytics.track('snippet-publish', 'Publish draft');
}

// Revert draft to published spec
function revertDraft() {
    const snippet = getCurrentSnippet();
    if (!snippet) return;

    if (confirm('Revert all draft changes to last published version? This cannot be undone.')) {
        // Copy spec to draftSpec
        snippet.draftSpec = JSON.parse(JSON.stringify(snippet.spec));
        SnippetStorage.saveSnippet(snippet);

        // Reload editor if in draft view
        if (Alpine.store('snippets').viewMode === 'draft') {
            loadSnippetIntoEditor(snippet);
        }

        // Refresh UI
        renderSnippetList();
        restoreSnippetSelection();

        updateViewModeUI(snippet);

        // Show success message
        Toast.success('Draft reverted to published version');

        // Track event
        Analytics.track('snippet-revert', 'Revert draft');
    }
}

// Calculate storage usage in bytes
function calculateStorageUsage() {
    const snippetsData = localStorage.getItem(SnippetStorage.STORAGE_KEY);
    if (!snippetsData) return 0;

    // Calculate size in bytes
    return new Blob([snippetsData]).size;
}

// Update storage monitor display
function updateStorageMonitor() {
    const usedBytes = calculateStorageUsage();
    const percentage = (usedBytes / STORAGE_LIMIT_BYTES) * 100;

    const storageText = document.getElementById('storage-text');
    const storageFill = document.getElementById('storage-fill');

    if (storageText) {
        storageText.textContent = `${formatBytes(usedBytes)} / 5 MB`;
    }

    if (storageFill) {
        storageFill.style.width = `${Math.min(percentage, 100)}%`;

        // Remove all state classes
        storageFill.classList.remove('warning', 'critical');

        // Add warning/critical classes based on usage
        if (percentage >= 95) {
            storageFill.classList.add('critical');
        } else if (percentage >= 90) {
            storageFill.classList.add('warning');
        }
    }
}

// Export all snippets and datasets to JSON file
async function exportSnippets() {
    const snippets = SnippetStorage.loadSnippets();

    if (snippets.length === 0) {
        Toast.info('No snippets to export');
        return;
    }

    // Get ALL datasets for complete backup
    const datasets = await DatasetStorage.listDatasets();

    // Create unified export format
    const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "Astrolabe",
        snippets: snippets,
        datasets: datasets
    };

    // Create JSON blob
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `astrolabe-project-${new Date().toISOString().slice(0, 10)}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    const count = datasets.length > 0
        ? `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''} and ${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}`
        : `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}`;
    Toast.success(`Exported ${count}`);

    // Track event
    Analytics.track('project-export', `Export ${snippets.length} snippets, ${datasets.length} datasets`);
}

// Normalize external snippet format to Astrolabe format
function normalizeSnippet(externalSnippet) {
    // Check if already in Astrolabe format (has 'created' field as ISO string)
    const isAstrolabeFormat = externalSnippet.created &&
                             typeof externalSnippet.created === 'string' &&
                             externalSnippet.created.includes('T');

    if (isAstrolabeFormat) {
        // Already in correct format, just ensure all fields exist
        return {
            id: externalSnippet.id || generateSnippetId(),
            name: externalSnippet.name || generateSnippetName(),
            created: externalSnippet.created,
            modified: externalSnippet.modified || externalSnippet.created,
            spec: externalSnippet.spec || {},
            draftSpec: externalSnippet.draftSpec || externalSnippet.spec || {},
            comment: externalSnippet.comment || "",
            tags: externalSnippet.tags || [],
            datasetRefs: externalSnippet.datasetRefs || [],
            meta: externalSnippet.meta || {}
        };
    }

    // External format - map fields
    const createdDate = externalSnippet.createdAt ?
                       new Date(externalSnippet.createdAt).toISOString() :
                       new Date().toISOString();

    return {
        id: generateSnippetId(), // Generate new ID to avoid conflicts
        name: externalSnippet.name || generateSnippetName(),
        created: createdDate,
        modified: createdDate,
        spec: externalSnippet.content || externalSnippet.spec || {},
        draftSpec: externalSnippet.draft || externalSnippet.draftSpec || externalSnippet.content || externalSnippet.spec || {},
        comment: externalSnippet.comment || "",
        tags: ["imported"], // Add 'imported' tag
        datasetRefs: [],
        meta: {}
    };
}

// Calculate size of data in bytes
function calculateDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
}

// Estimate if import would fit in storage (before attempting to save)
function estimateImportFit(existingSnippets, newSnippets) {
    const currentSize = calculateDataSize(existingSnippets);
    const newDataSize = calculateDataSize(newSnippets);
    const totalSize = currentSize + newDataSize;
    const available = STORAGE_LIMIT_BYTES - currentSize;

    return {
        currentSize: currentSize,
        newDataSize: newDataSize,
        totalSize: totalSize,
        available: available,
        willFit: totalSize <= STORAGE_LIMIT_BYTES,
        overageBytes: Math.max(0, totalSize - STORAGE_LIMIT_BYTES)
    };
}

// Core logic to process imported data (shared between file import and initial sample data)
async function processImportedData(importedData, options = {}) {
    const { silent = false } = options;

    // Detect format: legacy (array) or unified (object with version)
    let snippetsToImport = [];
    let datasetsToImport = [];

    if (Array.isArray(importedData)) {
        // Legacy format: array of snippets only
        snippetsToImport = importedData;
    } else if (importedData.version && importedData.snippets) {
        // New unified format
        snippetsToImport = importedData.snippets || [];
        datasetsToImport = importedData.datasets || [];
    } else {
        // Single snippet object
        snippetsToImport = [importedData];
    }

    if (snippetsToImport.length === 0) {
        if (!silent) Toast.info('No snippets found in file');
        return { success: false };
    }

    // Import datasets first (if any)
    let datasetsImported = 0;
    const renamedDatasets = []; // Track renamed datasets for warning

    for (const datasetData of datasetsToImport) {
        try {
            let datasetName = datasetData.name;
            const originalName = datasetName;

            // Handle name conflicts by renaming
            if (await DatasetStorage.nameExists(datasetName)) {
                const timestamp = Date.now().toString().slice(-6);
                datasetName = `${originalName}_${timestamp}`;

                // Unlikely, but ensure uniqueness
                let counter = 1;
                while (await DatasetStorage.nameExists(datasetName)) {
                    datasetName = `${originalName}_${timestamp}_${counter}`;
                    counter++;
                }

                renamedDatasets.push({ from: originalName, to: datasetName });
            }

            await DatasetStorage.createDataset(
                datasetName,
                datasetData.data,
                datasetData.format,
                datasetData.source,
                datasetData.comment || ''
            );
            datasetsImported++;
        } catch (error) {
            console.warn(`Failed to import dataset ${datasetData.name}:`, error);
        }
    }

    // Import snippets (existing normalization logic)
    const existingSnippets = SnippetStorage.loadSnippets();
    const existingIds = new Set(existingSnippets.map(s => s.id));

    let snippetsImported = 0;
    const normalizedSnippets = [];

    snippetsToImport.forEach(snippet => {
        const normalized = normalizeSnippet(snippet);

        // Ensure no ID conflicts
        while (existingIds.has(normalized.id)) {
            normalized.id = generateSnippetId();
        }

        normalizedSnippets.push(normalized);
        existingIds.add(normalized.id);
        snippetsImported++;
    });

    // Estimate storage fit
    const fit = estimateImportFit(existingSnippets, normalizedSnippets);

    if (!fit.willFit && !silent) {
        Toast.warning(
            `⚠️ Import is ${formatBytes(fit.overageBytes)} over the 5 MB limit. Attempting to load...`,
            5000
        );
    }

    // Save snippets
    const allSnippets = existingSnippets.concat(normalizedSnippets);

    if (SnippetStorage.saveSnippets(allSnippets)) {
        if (!silent) {
            let message = `Imported ${snippetsImported} snippet${snippetsImported !== 1 ? 's' : ''}`;
            if (datasetsImported > 0) {
                message += ` and ${datasetsImported} dataset${datasetsImported !== 1 ? 's' : ''}`;
            }

            // Warn about renamed datasets
            if (renamedDatasets.length > 0) {
                const renameList = renamedDatasets.map(r => `"${r.from}" → "${r.to}"`).join(', ');
                Toast.warning(
                    `${message}. Some datasets were renamed due to conflicts: ${renameList}. You may need to update dataset references in affected snippets.`,
                    8000
                );
            } else {
                Toast.success(message);
            }

            // Track event
            Analytics.track('project-import', `Import ${snippetsImported} snippets, ${datasetsImported} datasets`);
        }

        renderSnippetList();
        updateStorageMonitor();

        return { success: true, snippetsImported, datasetsImported, normalizedSnippets };
    } else {
        const overageBytes = fit.overageBytes > 0 ? fit.overageBytes : calculateDataSize(allSnippets) - STORAGE_LIMIT_BYTES;
        if (!silent) {
            Toast.error(
                `Storage quota exceeded by ${formatBytes(overageBytes)}. Please delete some snippets and try again.`,
                6000
            );
        }
        return { success: false };
    }
}

// Import snippets and datasets from JSON file
function importSnippets(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            await processImportedData(importedData);
        } catch (error) {
            console.error('Import error:', error);
            Toast.error('Failed to import. Please check that the file is valid JSON.');
        }

        // Clear file input
        fileInput.value = '';
    };

    reader.readAsText(file);
}

