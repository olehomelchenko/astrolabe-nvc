// Application initialization and event handlers

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration.scope);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Display app version in header
    const versionBadge = document.getElementById('app-version-badge');
    if (versionBadge && typeof APP_VERSION !== 'undefined') {
        versionBadge.textContent = `v${APP_VERSION}`;
    }

    // Initialize user settings
    initSettings();

    // Apply saved theme immediately on page load
    const theme = getSetting('ui.theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // Initialize snippet storage and render list (async)
    initializeSnippetsStorage().then(() => {
        // Render snippet list (now handled reactively by Alpine)
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
    });

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

        // Get user settings for editor configuration
        const editorSettings = getSetting('editor') || {
            fontSize: 12,
            theme: 'vs-light',
            minimap: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            tabSize: 2
        };

        // Create the editor
        editor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: JSON.stringify(sampleSpec, null, 2),
            language: 'json',
            theme: editorSettings.theme,
            fontSize: editorSettings.fontSize,
            minimap: { enabled: editorSettings.minimap },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: editorSettings.wordWrap,
            lineNumbers: editorSettings.lineNumbers,
            tabSize: editorSettings.tabSize,
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

        // Load saved preview fit mode from settings
        const savedPreviewFitMode = getSetting('ui.previewFitMode') || 'default';
        setPreviewFitMode(savedPreviewFitMode);

        // Initialize auto-save functionality
        initializeAutoSave();

        // Initialize URL state management AFTER editor is ready
        initializeURLStateManagement();
    });

    // Toggle panel buttons (now handled by Alpine.js in index.html)

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
        helpLink.addEventListener('click', () => ModalManager.open('help-modal'));
    }

    const donateLink = document.getElementById('donate-link');
    if (donateLink) {
        donateLink.addEventListener('click', () => ModalManager.open('donate-modal'));
    }

    // Settings Modal
    const settingsLink = document.getElementById('settings-link');

    if (settingsLink) {
        settingsLink.addEventListener('click', openSettingsModal);
    }

    // Settings buttons and UI interactions now handled by Alpine.js in settingsPanel() component

    // Dataset Manager
    const datasetsLink = document.getElementById('datasets-link');
    const toggleDatasetsBtn = document.getElementById('toggle-datasets');
    const newDatasetBtn = document.getElementById('new-dataset-btn');
    const editDatasetBtn = document.getElementById('edit-dataset-btn');
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

    // New dataset button
    if (newDatasetBtn) {
        newDatasetBtn.addEventListener('click', showNewDatasetForm);
    }

    // Edit dataset button
    if (editDatasetBtn) {
        editDatasetBtn.addEventListener('click', async function () {
            if (Alpine.store('datasets').currentDatasetId) {
                await showEditDatasetForm(Alpine.store('datasets').currentDatasetId);
            }
        });
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

    // Build chart from dataset button
    const buildChartBtn = document.getElementById('build-chart-btn');
    if (buildChartBtn) {
        buildChartBtn.addEventListener('click', async () => {
            if (Alpine.store('datasets').currentDatasetId) {
                openChartBuilder(Alpine.store('datasets').currentDatasetId);
            }
        });
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
        previewRawBtn.addEventListener('click', function () {
            if (Alpine.store('datasets').currentDatasetData) {
                showRawPreview(Alpine.store('datasets').currentDatasetData);
            }
        });
    }
    if (previewTableBtn) {
        previewTableBtn.addEventListener('click', function () {
            if (Alpine.store('datasets').currentDatasetData) {
                showTablePreview(Alpine.store('datasets').currentDatasetData);
            }
        });
    }

    // Global modal event delegation - handles close buttons and overlay clicks
    document.addEventListener('click', function (e) {
        // Handle modal close buttons (×)
        if (e.target.id && e.target.id.endsWith('-modal-close')) {
            const modalId = e.target.id.replace('-close', '');
            ModalManager.close(modalId);
            return;
        }

        // Handle overlay clicks (clicking outside modal content)
        if (e.target.classList.contains('modal')) {
            ModalManager.close(e.target.id);
            return;
        }
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
    const extractCancelBtn = document.getElementById('extract-cancel-btn');
    const extractCreateBtn = document.getElementById('extract-create-btn');

    if (extractCancelBtn) {
        extractCancelBtn.addEventListener('click', hideExtractModal);
    }

    if (extractCreateBtn) {
        extractCreateBtn.addEventListener('click', extractToDataset);
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
        } else if (state.datasetId && state.datasetId.startsWith('edit-')) {
            // Show edit dataset form - extract numeric ID from "edit-123456"
            const numericId = parseFloat(state.datasetId.replace('edit-', ''));
            if (!isNaN(numericId)) {
                showEditDatasetForm(numericId, false);
            }
        } else if (state.datasetId) {
            // Extract numeric ID from "dataset-123456"
            const numericId = parseFloat(state.datasetId.replace('dataset-', ''));
            if (!isNaN(numericId)) {
                selectDataset(numericId, false);

                // Handle chart builder action
                if (state.action === 'build') {
                    openChartBuilder(numericId);
                }
            }
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
    createNewSnippet: function () {
        createNewSnippet();
    },

    toggleDatasetManager: function () {
        const modal = document.getElementById('dataset-modal');
        if (modal && modal.style.display === 'flex') {
            closeDatasetManager();
        } else {
            openDatasetManager();
        }
    },

    publishDraft: function () {
        if (Alpine.store('snippets').viewMode === 'draft' && Alpine.store('snippets').currentSnippetId) {
            publishDraft();
        }
    },

    toggleSettings: function () {
        if (ModalManager.isOpen('settings-modal')) {
            closeSettingsModal();
        } else {
            openSettingsModal();
        }
    },

    closeAnyModal: function () {
        // Try ModalManager first for standard modals
        if (ModalManager.closeAny()) {
            return true;
        }
        // Handle special modals with custom close logic
        if (ModalManager.isOpen('extract-modal')) {
            hideExtractModal();
            return true;
        }
        // Dataset manager has special close logic (URL state)
        const datasetModal = document.getElementById('dataset-modal');
        if (datasetModal && datasetModal.style.display === 'flex') {
            closeDatasetManager();
            return true;
        }
        return false;
    }
};

// Keyboard shortcuts handler (document-level)
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
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

        // Cmd/Ctrl+,: Toggle settings
        if (modifierKey && e.key === ',') {
            e.preventDefault();
            KeyboardActions.toggleSettings();
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

// Settings modal functions (simplified - most logic now in Alpine settingsPanel() component)
function openSettingsModal() {
    ModalManager.open('settings-modal');
    // Settings will be loaded via Alpine's init() method
}

function closeSettingsModal() {
    ModalManager.close('settings-modal');
}
