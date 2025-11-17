// Application initialization and event handlers

document.addEventListener('DOMContentLoaded', function () {
    // Initialize user settings
    initSettings();

    // Apply saved theme immediately on page load
    const theme = getSetting('ui.theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // Initialize snippet storage and render list (async)
    initializeSnippetsStorage().then(() => {
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

        // Initialize chart builder
        initializeChartBuilder();

        // Initialize URL state management AFTER editor is ready
        initializeURLStateManagement();
    });

    // Toggle panel buttons
    document.querySelectorAll('[id^="toggle-"][id$="-panel"]').forEach(button => {
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
        helpLink.addEventListener('click', () => ModalManager.open('help-modal'));
    }

    const donateLink = document.getElementById('donate-link');
    if (donateLink) {
        donateLink.addEventListener('click', () => ModalManager.open('donate-modal'));
    }

    // Settings Modal
    const settingsLink = document.getElementById('settings-link');
    const settingsApplyBtn = document.getElementById('settings-apply-btn');
    const settingsResetBtn = document.getElementById('settings-reset-btn');
    const settingsCancelBtn = document.getElementById('settings-cancel-btn');

    if (settingsLink) {
        settingsLink.addEventListener('click', openSettingsModal);
    }

    if (settingsCancelBtn) {
        settingsCancelBtn.addEventListener('click', closeSettingsModal);
    }

    if (settingsApplyBtn) {
        settingsApplyBtn.addEventListener('click', applySettings);
    }

    if (settingsResetBtn) {
        settingsResetBtn.addEventListener('click', function() {
            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                resetSettings();
                loadSettingsIntoUI();
                Toast.show('Settings reset to defaults', 'success');
            }
        });
    }


    // Settings UI interactions
    const fontSizeSlider = document.getElementById('setting-font-size');
    const fontSizeValue = document.getElementById('setting-font-size-value');
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.addEventListener('input', function() {
            fontSizeValue.textContent = this.value + 'px';
        });
    }

    const renderDebounceSlider = document.getElementById('setting-render-debounce');
    const renderDebounceValue = document.getElementById('setting-render-debounce-value');
    if (renderDebounceSlider && renderDebounceValue) {
        renderDebounceSlider.addEventListener('input', function() {
            renderDebounceValue.textContent = this.value + 'ms';
        });
    }

    const dateFormatSelect = document.getElementById('setting-date-format');
    const customDateFormatItem = document.getElementById('custom-date-format-item');
    if (dateFormatSelect && customDateFormatItem) {
        dateFormatSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateFormatItem.style.display = 'block';
            } else {
                customDateFormatItem.style.display = 'none';
            }
        });
    }

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
        editDatasetBtn.addEventListener('click', async function() {
            if (window.currentDatasetId) {
                await showEditDatasetForm(window.currentDatasetId);
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
            if (window.currentDatasetId) {
                openChartBuilder(window.currentDatasetId);
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

    // Global modal event delegation - handles close buttons and overlay clicks
    document.addEventListener('click', function(e) {
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

    // View mode toggle buttons
    document.getElementById('view-draft').addEventListener('click', () => {
        switchViewMode('draft');
    });

    document.getElementById('view-published').addEventListener('click', () => {
        switchViewMode('published');
    });

    // Preview fit mode buttons
    document.getElementById('preview-fit-default').addEventListener('click', () => {
        setPreviewFitMode('default');
    });

    document.getElementById('preview-fit-width').addEventListener('click', () => {
        setPreviewFitMode('width');
    });

    document.getElementById('preview-fit-full').addEventListener('click', () => {
        setPreviewFitMode('full');
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

    toggleSettings: function() {
        if (ModalManager.isOpen('settings-modal')) {
            closeSettingsModal();
        } else {
            openSettingsModal();
        }
    },

    closeAnyModal: function() {
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

// Settings modal functions (special handling for loading settings into UI)
function openSettingsModal() {
    loadSettingsIntoUI();
    ModalManager.open('settings-modal');
}

function closeSettingsModal() {
    ModalManager.close('settings-modal');
}

function loadSettingsIntoUI() {
    const settings = getSettings();

    // Appearance settings
    const uiThemeSelect = document.getElementById('setting-ui-theme');
    if (uiThemeSelect) {
        uiThemeSelect.value = settings.ui.theme;
    }

    // Editor settings
    const fontSizeSlider = document.getElementById('setting-font-size');
    const fontSizeValue = document.getElementById('setting-font-size-value');
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.value = settings.editor.fontSize;
        fontSizeValue.textContent = settings.editor.fontSize + 'px';
    }

    const editorThemeSelect = document.getElementById('setting-editor-theme');
    if (editorThemeSelect) {
        editorThemeSelect.value = settings.editor.theme;
    }

    const tabSizeSelect = document.getElementById('setting-tab-size');
    if (tabSizeSelect) {
        tabSizeSelect.value = settings.editor.tabSize;
    }

    const minimapCheckbox = document.getElementById('setting-minimap');
    if (minimapCheckbox) {
        minimapCheckbox.checked = settings.editor.minimap;
    }

    const wordWrapCheckbox = document.getElementById('setting-word-wrap');
    if (wordWrapCheckbox) {
        wordWrapCheckbox.checked = settings.editor.wordWrap === 'on';
    }

    const lineNumbersCheckbox = document.getElementById('setting-line-numbers');
    if (lineNumbersCheckbox) {
        lineNumbersCheckbox.checked = settings.editor.lineNumbers === 'on';
    }

    // Performance settings
    const renderDebounceSlider = document.getElementById('setting-render-debounce');
    const renderDebounceValue = document.getElementById('setting-render-debounce-value');
    if (renderDebounceSlider && renderDebounceValue) {
        renderDebounceSlider.value = settings.performance.renderDebounce;
        renderDebounceValue.textContent = settings.performance.renderDebounce + 'ms';
    }

    // Formatting settings
    const dateFormatSelect = document.getElementById('setting-date-format');
    const customDateFormatItem = document.getElementById('custom-date-format-item');
    if (dateFormatSelect) {
        dateFormatSelect.value = settings.formatting.dateFormat;
        if (customDateFormatItem) {
            customDateFormatItem.style.display = settings.formatting.dateFormat === 'custom' ? 'block' : 'none';
        }
    }

    const customDateFormatInput = document.getElementById('setting-custom-date-format');
    if (customDateFormatInput) {
        customDateFormatInput.value = settings.formatting.customDateFormat;
    }
}

function applySettings() {
    // Collect values from UI
    const newSettings = {
        'ui.theme': document.getElementById('setting-ui-theme').value,
        'editor.fontSize': parseInt(document.getElementById('setting-font-size').value),
        'editor.theme': document.getElementById('setting-editor-theme').value,
        'editor.tabSize': parseInt(document.getElementById('setting-tab-size').value),
        'editor.minimap': document.getElementById('setting-minimap').checked,
        'editor.wordWrap': document.getElementById('setting-word-wrap').checked ? 'on' : 'off',
        'editor.lineNumbers': document.getElementById('setting-line-numbers').checked ? 'on' : 'off',
        'performance.renderDebounce': parseInt(document.getElementById('setting-render-debounce').value),
        'formatting.dateFormat': document.getElementById('setting-date-format').value,
        'formatting.customDateFormat': document.getElementById('setting-custom-date-format').value
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

    if (hasErrors) {
        return;
    }

    // Save settings
    if (updateSettings(newSettings)) {
        // Apply theme to document
        const uiTheme = newSettings['ui.theme'];
        document.documentElement.setAttribute('data-theme', uiTheme);

        // Sync editor theme with UI theme
        const editorTheme = uiTheme === 'experimental' ? 'vs-dark' : 'vs-light';
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
        if (window.currentSnippetId) {
            const snippet = SnippetStorage.getSnippet(window.currentSnippetId);
            if (snippet) {
                document.getElementById('snippet-created').textContent = formatDate(snippet.created, true);
                document.getElementById('snippet-modified').textContent = formatDate(snippet.modified, true);
            }
        }

        Toast.show('Settings applied successfully', 'success');
        closeSettingsModal();

        // Track event
        Analytics.track('settings-apply', 'Applied settings');
    } else {
        Toast.show('Failed to save settings', 'error');
    }
}
