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
            alert('Coming soon in a future phase!');
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
