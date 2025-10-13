// Application initialization and event handlers

document.addEventListener('DOMContentLoaded', function () {
    // Initialize snippet storage and render list
    initializeSnippetsStorage();

    // Initialize sort controls
    initializeSortControls();

    // Initialize search controls
    initializeSearchControls();

    renderSnippetList();

    // Auto-select first snippet on page load
    const firstSnippet = SnippetStorage.listSnippets()[0];
    if (firstSnippet) {
        selectSnippet(firstSnippet.id);
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
    });

    // Toggle panel buttons
    document.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', function () {
            const panelId = this.id.replace('toggle-', '');
            togglePanel(panelId);
        });
    });

    // Header links - show placeholder
    document.querySelectorAll('.header-link').forEach(link => {
        link.addEventListener('click', function () {
            alert('Coming soon in a future phase!');
        });
    });

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
