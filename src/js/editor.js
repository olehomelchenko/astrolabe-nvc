// Render function that takes spec from editor
async function renderVisualization() {
    const previewContainer = document.getElementById('vega-preview');

    try {
        // Get current content from editor
        const specText = editor.getValue();
        const spec = JSON.parse(specText);

        // Render with Vega-Embed (use global variable)
        await window.vegaEmbed('#vega-preview', spec, {
            actions: false, // Hide action menu for cleaner look
            renderer: 'svg' // Use SVG for better quality
        });

    } catch (error) {
        // Handle rendering errors gracefully
        previewContainer.innerHTML = `
                    <div style="padding: 20px; color: #d32f2f; font-size: 12px; font-family: monospace;">
                        <strong>Rendering Error:</strong><br>
                        ${error.message}
                        <br><br>
                        <em>Check your JSON syntax and Vega-Lite specification.</em>
                    </div>
                `;
    }
}

// Debounced render function
function debouncedRender() {
    // Don't debounce if we're programmatically updating - render immediately
    if (window.isUpdatingEditor) {
        renderVisualization();
        return;
    }

    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(renderVisualization, 1500);
}

// Load Vega libraries dynamically with UMD builds
function loadVegaLibraries() {
    return new Promise((resolve, reject) => {
        // Temporarily disable AMD define to avoid conflicts
        const originalDefine = window.define;
        window.define = undefined;

        // Load Vega
        const vegaScript = document.createElement('script');
        vegaScript.src = 'https://unpkg.com/vega@5/build/vega.min.js';
        vegaScript.onload = () => {
            // Load Vega-Lite
            const vegaLiteScript = document.createElement('script');
            vegaLiteScript.src = 'https://unpkg.com/vega-lite@5/build/vega-lite.min.js';
            vegaLiteScript.onload = () => {
                // Load Vega-Embed
                const vegaEmbedScript = document.createElement('script');
                vegaEmbedScript.src = 'https://unpkg.com/vega-embed@6/build/vega-embed.min.js';
                vegaEmbedScript.onload = () => {
                    // Restore AMD define
                    window.define = originalDefine;
                    resolve();
                };
                vegaEmbedScript.onerror = reject;
                document.head.appendChild(vegaEmbedScript);
            };
            vegaLiteScript.onerror = reject;
            document.head.appendChild(vegaLiteScript);
        };
        vegaScript.onerror = reject;
        document.head.appendChild(vegaScript);
    });
}
