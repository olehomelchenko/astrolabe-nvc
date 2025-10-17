// Track preview fit mode
let previewFitMode = 'default'; // 'default', 'width', or 'full'

// Apply fit mode to spec dimensions
function applyPreviewFitMode(spec, fitMode) {
    if (!spec || typeof spec !== 'object') return spec;

    // Clone to avoid mutation
    const modifiedSpec = JSON.parse(JSON.stringify(spec));

    if (fitMode === 'width') {
        // Fit to width - get preview pane width
        const previewPane = document.getElementById('vega-preview');
        if (previewPane) {
            const containerWidth = previewPane.offsetWidth;
            modifiedSpec.width = containerWidth - 10; // 10px padding for scroll
            // Keep original aspect ratio by not setting height
        }
    } else if (fitMode === 'full') {
        // Fit to full pane - get both dimensions
        const previewPane = document.getElementById('vega-preview');
        if (previewPane) {
            modifiedSpec.width = previewPane.offsetWidth - 10; // 10px padding
            modifiedSpec.height = previewPane.offsetHeight - 10; // 10px padding
        }
    }
    // 'default' mode leaves original dimensions untouched

    return modifiedSpec;
}

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

        // Apply preview fit mode
        spec = applyPreviewFitMode(spec, previewFitMode);

        // Render with Vega-Embed (use global variable)
        await window.vegaEmbed('#vega-preview', spec, {
            actions: false, // Hide action menu for cleaner look
            renderer: 'svg' // Use SVG for better quality
        });

        // Hide overlay after successful render
        hidePreviewOverlay();

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

        // Hide overlay after error
        hidePreviewOverlay();
    }
}

// Debounced render function
function debouncedRender() {
    // Don't debounce if we're programmatically updating - render immediately
    if (window.isUpdatingEditor) {
        renderVisualization();
        return;
    }

    // Show overlay to indicate rendering is pending
    showPreviewOverlay();

    clearTimeout(renderTimeout);
    const debounceTime = getSetting('performance.renderDebounce') || 1500;
    renderTimeout = setTimeout(renderVisualization, debounceTime);
}

// Update render debounce setting (called when settings are changed)
function updateRenderDebounce(newDebounce) {
    // The next render will automatically use the new debounce time
    // No need to do anything special here
}

// Set preview fit mode and update button states
function setPreviewFitMode(mode) {
    previewFitMode = mode;

    // Update button states
    document.getElementById('preview-fit-default').classList.toggle('active', mode === 'default');
    document.getElementById('preview-fit-width').classList.toggle('active', mode === 'width');
    document.getElementById('preview-fit-full').classList.toggle('active', mode === 'full');

    // Re-render with new fit mode
    renderVisualization();
}

// Show preview overlay (dims the visualization)
function showPreviewOverlay() {
    const overlay = document.getElementById('preview-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        // Trigger reflow to enable transition
        void overlay.offsetHeight;
        overlay.classList.add('active');
    }
}

// Hide preview overlay
function hidePreviewOverlay() {
    const overlay = document.getElementById('preview-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Wait for transition to finish before hiding
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 200);
    }
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
