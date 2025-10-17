// Resolve dataset references in a spec
async function resolveDatasetReferences(spec) {
    // If spec has data.name, look it up
    if (spec.data && spec.data.name && typeof spec.data.name === 'string') {
        const datasetName = spec.data.name;
        const dataset = await DatasetStorage.getDatasetByName(datasetName);

        if (dataset) {
            // Replace data reference with actual data in the format Vega-Lite expects
            if (dataset.source === 'url') {
                // For URL sources, pass the URL and format
                spec.data = {
                    url: dataset.data,
                    format: { type: dataset.format }
                };
            } else {
                // For inline sources
                if (dataset.format === 'json') {
                    spec.data = { values: dataset.data };
                } else if (dataset.format === 'csv') {
                    spec.data = {
                        values: dataset.data,
                        format: { type: 'csv' }
                    };
                } else if (dataset.format === 'tsv') {
                    spec.data = {
                        values: dataset.data,
                        format: { type: 'tsv' }
                    };
                } else if (dataset.format === 'topojson') {
                    spec.data = {
                        values: dataset.data,
                        format: { type: 'topojson' }
                    };
                }
            }
        } else {
            throw new Error(`Dataset "${datasetName}" not found`);
        }
    }

    // Recursively resolve in layers (for layered specs)
    if (spec.layer && Array.isArray(spec.layer)) {
        for (let layer of spec.layer) {
            await resolveDatasetReferences(layer);
        }
    }

    // Recursively resolve in concat/hconcat/vconcat
    if (spec.concat && Array.isArray(spec.concat)) {
        for (let view of spec.concat) {
            await resolveDatasetReferences(view);
        }
    }
    if (spec.hconcat && Array.isArray(spec.hconcat)) {
        for (let view of spec.hconcat) {
            await resolveDatasetReferences(view);
        }
    }
    if (spec.vconcat && Array.isArray(spec.vconcat)) {
        for (let view of spec.vconcat) {
            await resolveDatasetReferences(view);
        }
    }

    // Recursively resolve in facet
    if (spec.spec) {
        await resolveDatasetReferences(spec.spec);
    }

    return spec;
}

// Render function that takes spec from editor
async function renderVisualization() {
    const previewContainer = document.getElementById('vega-preview');

    try {
        // Get current content from editor
        const specText = editor.getValue();
        let spec = JSON.parse(specText);

        // Resolve dataset references
        spec = await resolveDatasetReferences(spec);

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
    const debounceTime = getSetting('performance.renderDebounce') || 1500;
    renderTimeout = setTimeout(renderVisualization, debounceTime);
}

// Update render debounce setting (called when settings are changed)
function updateRenderDebounce(newDebounce) {
    // The next render will automatically use the new debounce time
    // No need to do anything special here
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
