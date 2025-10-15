// Snippet management and localStorage functionality

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
            alert('Failed to save: Storage quota may be exceeded. Consider deleting old snippets.');
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

// Initialize storage with default snippet if empty
function initializeSnippetsStorage() {
    const existingSnippets = SnippetStorage.loadSnippets();

    if (existingSnippets.length === 0) {
        // Create default snippet using the sample spec from config
        const defaultSnippet = createSnippet(sampleSpec, "Sample Bar Chart");
        defaultSnippet.comment = "A simple bar chart showing category values";

        SnippetStorage.saveSnippet(defaultSnippet);
        return [defaultSnippet];
    }

    return existingSnippets;
}

// Format date for display in snippet list
function formatSnippetDate(isoString) {
    const date = new Date(isoString);
    const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

// Format full date/time for display in meta info
function formatFullDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Render snippet list in the UI
function renderSnippetList(searchQuery = null) {
    // Get search query from input if not provided
    if (searchQuery === null) {
        const searchInput = document.getElementById('snippet-search');
        searchQuery = searchInput ? searchInput.value : '';
    }

    const snippets = SnippetStorage.listSnippets(null, null, searchQuery);
    const snippetList = document.querySelector('.snippet-list');
    const placeholder = document.querySelector('.placeholder');

    if (snippets.length === 0) {
        snippetList.innerHTML = '';
        placeholder.style.display = 'block';

        // Show different message for search vs empty state
        if (searchQuery && searchQuery.trim()) {
            placeholder.textContent = 'No snippets match your search';
        } else {
            placeholder.textContent = 'No snippets found';
        }
        return;
    }

    placeholder.style.display = 'none';

    const ghostCard = `
        <li class="snippet-item ghost-card" id="new-snippet-card">
            <div class="snippet-name">+ Create New Snippet</div>
            <div class="snippet-date">Click to create</div>
        </li>
    `;

    const currentSort = AppSettings.get('sortBy');
    const snippetItems = snippets.map(snippet => {
        // Show appropriate date based on current sort
        let dateText;
        if (currentSort === 'created') {
            dateText = formatSnippetDate(snippet.created);
        } else {
            dateText = formatSnippetDate(snippet.modified);
        }

        // Calculate snippet size
        const snippetSize = new Blob([JSON.stringify(snippet)]).size;
        const sizeKB = snippetSize / 1024;
        const sizeHTML = sizeKB >= 1 ? `<span class="snippet-size">${sizeKB.toFixed(0)} KB</span>` : '';

        // Determine status: green if no draft changes, yellow if has draft
        const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);
        const statusClass = hasDraft ? 'draft' : 'published';

        return `
            <li class="snippet-item" data-snippet-id="${snippet.id}">
                <div class="snippet-info">
                    <div class="snippet-name">${snippet.name}</div>
                    <div class="snippet-date">${dateText}</div>
                </div>
                ${sizeHTML}
                <div class="snippet-status ${statusClass}"></div>
            </li>
        `;
    }).join('');

    snippetList.innerHTML = ghostCard + snippetItems;

    // Re-attach event listeners for snippet selection
    attachSnippetEventListeners();
}

// Initialize sort controls
function initializeSortControls() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    const currentSort = AppSettings.get('sortBy');
    const currentOrder = AppSettings.get('sortOrder');

    // Update active button and arrow based on settings
    sortButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.sort === currentSort) {
            button.classList.add('active');
            updateSortArrow(button, currentOrder);
        } else {
            updateSortArrow(button, 'desc'); // Default to desc for inactive buttons
        }

        // Add click handler
        button.addEventListener('click', function() {
            const sortType = this.dataset.sort;
            toggleSort(sortType);
        });
    });
}

// Update sort arrow display
function updateSortArrow(button, direction) {
    const arrow = button.querySelector('.sort-arrow');
    if (arrow) {
        arrow.textContent = direction === 'desc' ? '⬇' : '⬆';
    }
}

// Toggle sort method and direction
function toggleSort(sortType) {
    const currentSort = AppSettings.get('sortBy');
    const currentOrder = AppSettings.get('sortOrder');

    let newOrder;
    if (currentSort === sortType) {
        // Same button clicked - toggle direction
        newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
    } else {
        // Different button clicked - default to desc
        newOrder = 'desc';
    }

    // Save to settings
    AppSettings.set('sortBy', sortType);
    AppSettings.set('sortOrder', newOrder);

    // Update button states and arrows
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === sortType) {
            btn.classList.add('active');
            updateSortArrow(btn, newOrder);
        } else {
            updateSortArrow(btn, 'desc'); // Default for inactive buttons
        }
    });

    // Re-render list
    renderSnippetList();

    // Restore selection if there was one
    restoreSnippetSelection();
}

// Initialize search controls
function initializeSearchControls() {
    const searchInput = document.getElementById('snippet-search');
    const clearButton = document.getElementById('search-clear');

    if (searchInput) {
        // Debounced search on input
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300); // 300ms debounce
        });

        // Update clear button state
        searchInput.addEventListener('input', updateClearButton);
    }

    if (clearButton) {
        clearButton.addEventListener('click', clearSearch);
        // Initialize clear button state
        updateClearButton();
    }
}

// Perform search and update display
function performSearch() {
    const searchInput = document.getElementById('snippet-search');
    if (!searchInput) return;

    renderSnippetList(searchInput.value);

    // Clear selection if current snippet is no longer visible
    if (window.currentSnippetId) {
        const selectedItem = document.querySelector(`[data-snippet-id="${window.currentSnippetId}"]`);
        if (!selectedItem) {
            clearSelection();
        } else {
            selectedItem.classList.add('selected');
        }
    }
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('snippet-search');
    if (searchInput) {
        searchInput.value = '';
        performSearch();
        updateClearButton();
        searchInput.focus();
    }
}

// Update clear button state
function updateClearButton() {
    const searchInput = document.getElementById('snippet-search');
    const clearButton = document.getElementById('search-clear');

    if (clearButton && searchInput) {
        clearButton.disabled = !searchInput.value.trim();
    }
}

// Helper: Get currently selected snippet
function getCurrentSnippet() {
    return window.currentSnippetId ? SnippetStorage.getSnippet(window.currentSnippetId) : null;
}

// Helper: Restore visual selection state for current snippet
function restoreSnippetSelection() {
    if (window.currentSnippetId) {
        const item = document.querySelector(`[data-snippet-id="${window.currentSnippetId}"]`);
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

// Attach event listeners to snippet items
function attachSnippetEventListeners() {
    const snippetItems = document.querySelectorAll('.snippet-item');
    snippetItems.forEach(item => {
        // Handle ghost card for new snippet creation
        if (item.id === 'new-snippet-card') {
            item.addEventListener('click', function () {
                createNewSnippet();
            });
            return;
        }

        // Left click to select
        item.addEventListener('click', function () {
            const snippetId = parseFloat(this.dataset.snippetId);
            selectSnippet(snippetId);
        });
    });
}

// Select and load a snippet into the editor
function selectSnippet(snippetId) {
    const snippet = SnippetStorage.getSnippet(snippetId);
    if (!snippet) return;

    // Update visual selection
    document.querySelectorAll('.snippet-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-snippet-id="${snippetId}"]`).classList.add('selected');

    // Load spec based on current view mode
    loadSnippetIntoEditor(snippet);
    updateViewModeUI(snippet);

    // Show and populate meta fields
    const metaSection = document.getElementById('snippet-meta');
    const nameField = document.getElementById('snippet-name');
    const commentField = document.getElementById('snippet-comment');
    const createdField = document.getElementById('snippet-created');
    const modifiedField = document.getElementById('snippet-modified');
    const placeholder = document.querySelector('.placeholder');

    if (metaSection && nameField && commentField) {
        metaSection.style.display = 'block';
        nameField.value = snippet.name || '';
        commentField.value = snippet.comment || '';

        // Format and display dates
        if (createdField) {
            createdField.textContent = formatFullDate(snippet.created);
        }
        if (modifiedField) {
            modifiedField.textContent = formatFullDate(snippet.modified);
        }

        placeholder.style.display = 'none';
    }

    // Store currently selected snippet ID globally
    window.currentSnippetId = snippetId;
}

// Auto-save functionality
let autoSaveTimeout;
window.isUpdatingEditor = false; // Global flag to prevent auto-save/debounce during programmatic updates

// Save current editor content as draft for the selected snippet
function autoSaveDraft() {
    if (!window.currentSnippetId || !editor) return;

    // Only save to draft if we're in draft mode
    if (currentViewMode !== 'draft') return;

    try {
        const currentSpec = JSON.parse(editor.getValue());
        const snippet = getCurrentSnippet();

        if (snippet) {
            snippet.draftSpec = currentSpec;
            SnippetStorage.saveSnippet(snippet);

            // Refresh snippet list to update status light
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
    if (currentViewMode === 'published') {
        const snippet = getCurrentSnippet();
        if (snippet) {
            const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);
            if (!hasDraft) {
                // No draft exists, automatically switch to draft mode
                currentViewMode = 'draft';
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
    // Initialize meta fields auto-save
    const nameField = document.getElementById('snippet-name');
    const commentField = document.getElementById('snippet-comment');

    if (nameField) {
        nameField.addEventListener('input', () => {
            debouncedAutoSaveMeta();
        });
    }

    if (commentField) {
        commentField.addEventListener('input', () => {
            debouncedAutoSaveMeta();
        });
    }

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

// Save meta fields (name and comment) for the selected snippet
function autoSaveMeta() {
    const nameField = document.getElementById('snippet-name');
    const commentField = document.getElementById('snippet-comment');
    if (!nameField || !commentField) return;

    const snippet = getCurrentSnippet();
    if (snippet) {
        snippet.name = nameField.value.trim() || generateSnippetName();
        snippet.comment = commentField.value;
        SnippetStorage.saveSnippet(snippet);

        // Update the snippet list display to reflect the new name
        renderSnippetList();

        // Restore selection after re-render
        restoreSnippetSelection();
    }
}

// Debounced meta auto-save
let metaAutoSaveTimeout;
function debouncedAutoSaveMeta() {
    clearTimeout(metaAutoSaveTimeout);
    metaAutoSaveTimeout = setTimeout(autoSaveMeta, 1000);
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

    SnippetStorage.saveSnippet(newSnippet);

    // Refresh the list and select the new snippet
    renderSnippetList();
    selectSnippet(newSnippet.id);

    return newSnippet;
}

// Delete snippet with confirmation
function deleteSnippet(snippetId) {
    const snippet = SnippetStorage.getSnippet(snippetId);
    if (!snippet) return;

    if (confirm(`Delete snippet "${snippet.name}"? This action cannot be undone.`)) {
        SnippetStorage.deleteSnippet(snippetId);

        // If we deleted the currently selected snippet, clear selection
        if (window.currentSnippetId === snippetId) {
            clearSelection();
        }

        // Refresh the list
        renderSnippetList();
        return true;
    }

    return false;
}

// Load snippet into editor based on view mode
function loadSnippetIntoEditor(snippet) {
    if (!editor) return;

    window.isUpdatingEditor = true;

    const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);

    if (currentViewMode === 'draft') {
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

    // Update toggle button states
    if (currentViewMode === 'draft') {
        draftBtn.classList.add('active');
        publishedBtn.classList.remove('active');
    } else {
        draftBtn.classList.remove('active');
        publishedBtn.classList.add('active');
    }

    // Show/hide and enable/disable action buttons based on mode
    const hasDraft = JSON.stringify(snippet.spec) !== JSON.stringify(snippet.draftSpec);

    if (currentViewMode === 'draft') {
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
    currentViewMode = mode;
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
    SnippetStorage.saveSnippet(snippet);

    // Refresh UI
    renderSnippetList();
    restoreSnippetSelection();

    updateViewModeUI(snippet);
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
        if (currentViewMode === 'draft') {
            loadSnippetIntoEditor(snippet);
        }

        // Refresh UI
        renderSnippetList();
        restoreSnippetSelection();

        updateViewModeUI(snippet);
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

// Export all snippets to JSON file
function exportSnippets() {
    const snippets = SnippetStorage.loadSnippets();

    if (snippets.length === 0) {
        alert('No snippets to export');
        return;
    }

    // Create JSON blob
    const jsonString = JSON.stringify(snippets, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `astrolabe-snippets-${new Date().toISOString().slice(0, 10)}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

// Import snippets from JSON file
function importSnippets(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Handle both single snippet and array of snippets
            const snippetsToImport = Array.isArray(importedData) ? importedData : [importedData];

            if (snippetsToImport.length === 0) {
                alert('No snippets found in file');
                return;
            }

            // Normalize and merge with existing snippets
            const existingSnippets = SnippetStorage.loadSnippets();
            const existingIds = new Set(existingSnippets.map(s => s.id));

            let importedCount = 0;
            snippetsToImport.forEach(snippet => {
                const normalized = normalizeSnippet(snippet);

                // Ensure no ID conflicts
                while (existingIds.has(normalized.id)) {
                    normalized.id = generateSnippetId();
                }

                existingSnippets.push(normalized);
                existingIds.add(normalized.id);
                importedCount++;
            });

            // Save all snippets
            if (SnippetStorage.saveSnippets(existingSnippets)) {
                alert(`Successfully imported ${importedCount} snippet${importedCount !== 1 ? 's' : ''}`);
                renderSnippetList();
            }

        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import snippets. Please check that the file is valid JSON.');
        }

        // Clear file input
        fileInput.value = '';
    };

    reader.readAsText(file);
}

