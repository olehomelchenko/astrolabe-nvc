// Application initialization and event handlers

document.addEventListener('DOMContentLoaded', function () {
    // Initialize snippet storage and render list
    initializeSnippetsStorage();

    // Initialize sort controls
    initializeSortControls();

    // Initialize search controls
    initializeSearchControls();

    renderSnippetList();

    // Update storage monitor
    updateStorageMonitor();

    // Auto-select first snippet on page load (only if no hash in URL)
    if (!window.location.hash) {
        const firstSnippet = SnippetStorage.listSnippets()[0];
        if (firstSnippet) {
            selectSnippet(firstSnippet.id);
        }
    }

    // Load saved layout
    loadLayoutFromStorage();

    // Initialize resize functionality
    initializeResize();

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    // Initialize Monaco Editor
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs' } });
    require(['vs/editor/editor.main'], async function () {
        // Fetch Vega-Lite schema for validation
        let vegaLiteSchema;
        try {
            const response = await fetch('https://vega.github.io/schema/vega-lite/v5.json');
            vegaLiteSchema = await response.json();
        } catch (error) {
            vegaLiteSchema = null;
        }

        // Configure JSON language with schema
        if (vegaLiteSchema) {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: [{
                    uri: "https://vega.github.io/schema/vega-lite/v5.json",
                    fileMatch: ["*"],
                    schema: vegaLiteSchema
                }]
            });
        }

        // Load Vega libraries before creating editor
        await loadVegaLibraries();

        // Create the editor
        editor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: JSON.stringify(sampleSpec, null, 2),
            language: 'json',
            theme: 'vs-light',
            fontSize: 12,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true
        });

        // Register custom keyboard shortcuts in Monaco
        registerMonacoKeyboardShortcuts();

        // Add debounced auto-render on editor change
        editor.onDidChangeModelContent(() => {
            debouncedRender();
            debouncedAutoSave();
        });

        // Initial render
        renderVisualization();

        // Initialize auto-save functionality
        initializeAutoSave();

        // Initialize URL state management AFTER editor is ready
        initializeURLStateManagement();
    });

    // Toggle panel buttons
    document.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', function () {
            const panelId = this.id.replace('toggle-', '');
            togglePanel(panelId);
        });
    });

    // Header links
    const importLink = document.getElementById('import-link');
    const exportLink = document.getElementById('export-link');
    const helpLink = document.getElementById('help-link');
    const importFileInput = document.getElementById('import-file-input');

    if (importLink && importFileInput) {
        importLink.addEventListener('click', function () {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', function () {
            importSnippets(this);
        });
    }

    if (exportLink) {
        exportLink.addEventListener('click', function () {
            exportSnippets();
        });
    }

    if (helpLink) {
        helpLink.addEventListener('click', function () {
            openHelpModal();
        });
    }

    const donateLink = document.getElementById('donate-link');
    if (donateLink) {
        donateLink.addEventListener('click', function () {
            openDonateModal();
        });
    }

    // Dataset Manager
    const datasetsLink = document.getElementById('datasets-link');
    const toggleDatasetsBtn = document.getElementById('toggle-datasets');
    const datasetModal = document.getElementById('dataset-modal');
    const datasetModalClose = document.getElementById('dataset-modal-close');
    const newDatasetBtn = document.getElementById('new-dataset-btn');
    const cancelDatasetBtn = document.getElementById('cancel-dataset-btn');
    const saveDatasetBtn = document.getElementById('save-dataset-btn');
    const deleteDatasetBtn = document.getElementById('delete-dataset-btn');
    const copyReferenceBtn = document.getElementById('copy-reference-btn');

    // Open dataset manager
    if (datasetsLink) {
        datasetsLink.addEventListener('click', openDatasetManager);
    }
    if (toggleDatasetsBtn) {
        toggleDatasetsBtn.addEventListener('click', openDatasetManager);
    }

    // Close dataset manager
    if (datasetModalClose) {
        datasetModalClose.addEventListener('click', closeDatasetManager);
    }

    // Close on overlay click
    if (datasetModal) {
        datasetModal.addEventListener('click', function (e) {
            if (e.target === datasetModal) {
                closeDatasetManager();
            }
        });
    }

    // New dataset button
    if (newDatasetBtn) {
        newDatasetBtn.addEventListener('click', showNewDatasetForm);
    }

    // Import dataset button and file input
    const importDatasetBtn = document.getElementById('import-dataset-btn');
    const importDatasetFile = document.getElementById('import-dataset-file');
    if (importDatasetBtn && importDatasetFile) {
        importDatasetBtn.addEventListener('click', function () {
            importDatasetFile.click();
        });

        importDatasetFile.addEventListener('change', function () {
            importDatasetFromFile(this);
        });
    }

    // Cancel dataset button
    if (cancelDatasetBtn) {
        cancelDatasetBtn.addEventListener('click', hideNewDatasetForm);
    }

    // Save dataset button
    if (saveDatasetBtn) {
        saveDatasetBtn.addEventListener('click', saveNewDataset);
    }

    // Delete dataset button
    if (deleteDatasetBtn) {
        deleteDatasetBtn.addEventListener('click', deleteCurrentDataset);
    }

    // Copy reference button
    if (copyReferenceBtn) {
        copyReferenceBtn.addEventListener('click', copyDatasetReference);
    }

    // Refresh metadata button
    const refreshMetadataBtn = document.getElementById('refresh-metadata-btn');
    if (refreshMetadataBtn) {
        refreshMetadataBtn.addEventListener('click', refreshDatasetMetadata);
    }

    // New snippet from dataset button
    const newSnippetBtn = document.getElementById('new-snippet-btn');
    if (newSnippetBtn) {
        newSnippetBtn.addEventListener('click', createNewSnippetFromDataset);
    }

    // Export dataset button
    const exportDatasetBtn = document.getElementById('export-dataset-btn');
    if (exportDatasetBtn) {
        exportDatasetBtn.addEventListener('click', exportCurrentDataset);
    }

    // Preview toggle buttons
    const previewRawBtn = document.getElementById('preview-raw-btn');
    const previewTableBtn = document.getElementById('preview-table-btn');
    if (previewRawBtn) {
        previewRawBtn.addEventListener('click', function() {
            if (window.currentDatasetData) {
                showRawPreview(window.currentDatasetData);
            }
        });
    }
    if (previewTableBtn) {
        previewTableBtn.addEventListener('click', function() {
            if (window.currentDatasetData) {
                showTablePreview(window.currentDatasetData);
            }
        });
    }

    // Help Modal
    const helpModal = document.getElementById('help-modal');
    const helpModalClose = document.getElementById('help-modal-close');

    if (helpModalClose) {
        helpModalClose.addEventListener('click', closeHelpModal);
    }

    // Close on overlay click
    if (helpModal) {
        helpModal.addEventListener('click', function (e) {
            if (e.target === helpModal) {
                closeHelpModal();
            }
        });
    }

    // Donate Modal
    const donateModal = document.getElementById('donate-modal');
    const donateModalClose = document.getElementById('donate-modal-close');

    if (donateModalClose) {
        donateModalClose.addEventListener('click', closeDonateModal);
    }

    // Close on overlay click
    if (donateModal) {
        donateModal.addEventListener('click', function (e) {
            if (e.target === donateModal) {
                closeDonateModal();
            }
        });
    }

    // View mode toggle buttons
    document.getElementById('view-draft').addEventListener('click', () => {
        switchViewMode('draft');
    });

    document.getElementById('view-published').addEventListener('click', () => {
        switchViewMode('published');
    });

    // Publish and Revert buttons
    document.getElementById('publish-btn').addEventListener('click', publishDraft);
    document.getElementById('revert-btn').addEventListener('click', revertDraft);

    // Extract to Dataset button
    const extractBtn = document.getElementById('extract-btn');
    if (extractBtn) {
        extractBtn.addEventListener('click', showExtractModal);
    }

    // Extract modal buttons
    const extractModalClose = document.getElementById('extract-modal-close');
    const extractCancelBtn = document.getElementById('extract-cancel-btn');
    const extractCreateBtn = document.getElementById('extract-create-btn');
    const extractModal = document.getElementById('extract-modal');

    if (extractModalClose) {
        extractModalClose.addEventListener('click', hideExtractModal);
    }

    if (extractCancelBtn) {
        extractCancelBtn.addEventListener('click', hideExtractModal);
    }

    if (extractCreateBtn) {
        extractCreateBtn.addEventListener('click', extractToDataset);
    }

    // Close modal on overlay click
    if (extractModal) {
        extractModal.addEventListener('click', function (e) {
            if (e.target === extractModal) {
                hideExtractModal();
            }
        });
    }
});

// Handle URL hash changes (browser back/forward)
function handleURLStateChange() {
    const state = URLState.parse();

    if (state.view === 'datasets') {
        // Open dataset modal
        openDatasetManager(false); // Don't update URL

        if (state.datasetId === 'new') {
            // Show new dataset form
            showNewDatasetForm(false);
        } else if (state.datasetId) {
            // Extract numeric ID from "dataset-123456"
            const numericId = parseFloat(state.datasetId.replace('dataset-', ''));
            selectDataset(numericId, false);
        }
    } else if (state.snippetId) {
        // Close dataset modal if open
        const modal = document.getElementById('dataset-modal');
        if (modal && modal.style.display === 'flex') {
            closeDatasetManager(false);
        }

        // Select snippet
        const numericId = parseFloat(state.snippetId.replace('snippet-', ''));
        selectSnippet(numericId, false);
    }
}

// Initialize URL state management
function initializeURLStateManagement() {
    // Handle hashchange event for back/forward navigation
    window.addEventListener('hashchange', handleURLStateChange);

    // Check if there's a hash in the URL on page load
    if (window.location.hash) {
        handleURLStateChange();
    }
}

// Keyboard shortcut action handlers (shared between Monaco and document)
const KeyboardActions = {
    createNewSnippet: function() {
        createNewSnippet();
    },

    toggleDatasetManager: function() {
        const modal = document.getElementById('dataset-modal');
        if (modal && modal.style.display === 'flex') {
            closeDatasetManager();
        } else {
            openDatasetManager();
        }
    },

    publishDraft: function() {
        if (currentViewMode === 'draft' && window.currentSnippetId) {
            publishDraft();
        }
    },

    closeAnyModal: function() {
        const helpModal = document.getElementById('help-modal');
        const datasetModal = document.getElementById('dataset-modal');
        const extractModal = document.getElementById('extract-modal');
        const donateModal = document.getElementById('donate-modal');

        if (helpModal && helpModal.style.display === 'flex') {
            closeHelpModal();
            return true;
        }
        if (datasetModal && datasetModal.style.display === 'flex') {
            closeDatasetManager();
            return true;
        }
        if (extractModal && extractModal.style.display === 'flex') {
            hideExtractModal();
            return true;
        }
        if (donateModal && donateModal.style.display === 'flex') {
            closeDonateModal();
            return true;
        }
        return false;
    }
};

// Keyboard shortcuts handler (document-level)
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escape: Close any open modal
        if (e.key === 'Escape') {
            if (KeyboardActions.closeAnyModal()) {
                return;
            }
        }

        // Detect modifier key: Cmd on Mac, Ctrl on Windows/Linux
        const modifierKey = e.metaKey || e.ctrlKey;

        // Cmd/Ctrl+Shift+N: Create new snippet
        if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            KeyboardActions.createNewSnippet();
            return;
        }

        // Cmd/Ctrl+K: Toggle dataset manager
        if (modifierKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            KeyboardActions.toggleDatasetManager();
            return;
        }

        // Cmd/Ctrl+S: Publish draft
        if (modifierKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            KeyboardActions.publishDraft();
            return;
        }
    });
}

// Register keyboard shortcuts in Monaco Editor
function registerMonacoKeyboardShortcuts() {
    if (!editor) return;

    // Cmd/Ctrl+Shift+N: Create new snippet
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyN,
        KeyboardActions.createNewSnippet);

    // Cmd/Ctrl+K: Toggle dataset manager
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        KeyboardActions.toggleDatasetManager);

    // Cmd/Ctrl+S: Publish draft
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        KeyboardActions.publishDraft);
}

// Help modal functions
function openHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Track event
        Analytics.track('modal-help', 'Open Help modal');
    }
}

function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Donate modal functions
function openDonateModal() {
    const modal = document.getElementById('donate-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Track event
        Analytics.track('modal-donate', 'Open Donate modal');
    }
}

function closeDonateModal() {
    const modal = document.getElementById('donate-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
