// Chart Builder - Visual chart construction from datasets

// Global state for chart builder
window.chartBuilderState = null;

// Timeout for debounced preview updates
let previewUpdateTimeout = null;

// Map column types to Vega-Lite types
function mapColumnTypeToVegaType(columnType) {
    const typeMap = {
        'number': 'quantitative',
        'date': 'temporal',
        'text': 'nominal',
        'boolean': 'nominal'
    };
    return typeMap[columnType] || 'nominal';
}

// Helper: Update active state for a group of toggle buttons
function setActiveToggle(buttons, activeButton) {
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
}

// Open chart builder modal with dataset
async function openChartBuilder(datasetId) {
    try {
        // Fetch dataset from IndexedDB
        const dataset = await DatasetStorage.getDataset(datasetId);
        if (!dataset) {
            showToast('Dataset not found', 'error');
            return;
        }

        // Initialize state with defaults
        window.chartBuilderState = {
            datasetId: datasetId,
            datasetName: dataset.name,
            spec: {
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "data": {"name": dataset.name},
                "mark": {"type": "bar", "tooltip": true},
                "encoding": {}
            }
        };

        // Populate field dropdowns with dataset columns BEFORE showing modal
        populateFieldDropdowns(dataset);

        // Auto-select smart defaults
        autoSelectDefaults(dataset);

        // Show modal
        const modal = document.getElementById('chart-builder-modal');
        modal.style.display = 'flex';

        // Update URL to reflect chart builder state
        URLState.update({
            view: 'datasets',
            datasetId: datasetId,
            action: 'build'
        });

        // Initial preview update (with a small delay to ensure DOM is ready)
        setTimeout(() => {
            updateChartBuilderPreview();
        }, 50);

    } catch (error) {
        console.error('Error opening chart builder:', error);
        showToast('Error opening chart builder', 'error');
    }
}

// Populate field dropdowns with dataset columns
function populateFieldDropdowns(dataset) {
    const encodings = ['x', 'y', 'color', 'size'];
    const columns = dataset.columns || [];

    encodings.forEach(encoding => {
        const select = document.getElementById(`encoding-${encoding}-field`);
        if (!select) return;

        // Clear existing options except "None"
        select.innerHTML = '<option value="">None</option>';

        // Add column options
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            select.appendChild(option);
        });
    });
}

// Auto-select smart defaults based on column types
function autoSelectDefaults(dataset) {
    const columns = dataset.columns || [];
    const columnTypes = dataset.columnTypes || [];

    if (columns.length === 0) return;

    // Select first column for X axis
    if (columns.length >= 1) {
        const firstCol = columns[0];
        const firstColType = columnTypes.find(ct => ct.name === firstCol);
        setEncoding('x', firstCol, firstColType ? mapColumnTypeToVegaType(firstColType.type) : 'nominal');
    }

    // Select second column for Y axis (if exists)
    if (columns.length >= 2) {
        const secondCol = columns[1];
        const secondColType = columnTypes.find(ct => ct.name === secondCol);
        setEncoding('y', secondCol, secondColType ? mapColumnTypeToVegaType(secondColType.type) : 'quantitative');
    }
}

// Set encoding field and type in UI and state
function setEncoding(channel, field, type) {
    // Update dropdown
    const select = document.getElementById(`encoding-${channel}-field`);
    if (select) {
        select.value = field;
    }

    // Update type toggle buttons
    const typeButtons = document.querySelectorAll(`[data-encoding="${channel}"][data-type]`);
    const activeButton = Array.from(typeButtons).find(btn => btn.dataset.type === type);
    if (activeButton) {
        setActiveToggle(typeButtons, activeButton);
    }

    // Update state
    if (!window.chartBuilderState) return;

    if (field) {
        window.chartBuilderState.spec.encoding[channel] = {
            field: field,
            type: type
        };
    } else {
        delete window.chartBuilderState.spec.encoding[channel];
    }
}

// Generate Vega-Lite spec from current state
function generateVegaLiteSpec() {
    if (!window.chartBuilderState) return null;

    const state = window.chartBuilderState;
    const spec = JSON.parse(JSON.stringify(state.spec)); // Deep clone

    // Add width/height if specified
    const width = document.getElementById('chart-width');
    const height = document.getElementById('chart-height');

    if (width && width.value) {
        spec.width = parseInt(width.value);
    }

    if (height && height.value) {
        spec.height = parseInt(height.value);
    }

    // Remove empty encodings
    if (Object.keys(spec.encoding).length === 0) {
        delete spec.encoding;
    }

    return spec;
}

// Validate chart configuration
function validateChartConfig() {
    if (!window.chartBuilderState) return false;

    const spec = window.chartBuilderState.spec;
    const encoding = spec.encoding || {};

    // At least one encoding must be set
    const hasEncoding = Object.keys(encoding).length > 0;

    return hasEncoding;
}

// Update preview with debouncing
function updateChartBuilderPreview() {
    clearTimeout(previewUpdateTimeout);

    // Get debounce time from settings (default 1500ms)
    const debounceTime = getSetting('performance.renderDebounce') || 1500;

    previewUpdateTimeout = setTimeout(async () => {
        await renderChartBuilderPreview();
    }, debounceTime);
}

// Render preview in chart builder
async function renderChartBuilderPreview() {
    const previewContainer = document.getElementById('chart-builder-preview');
    const errorDiv = document.getElementById('chart-builder-error');
    const createBtn = document.getElementById('chart-builder-create-btn');

    if (!previewContainer) return;

    try {
        // Validate configuration
        const isValid = validateChartConfig();

        if (!isValid) {
            // Show placeholder
            previewContainer.innerHTML = '<div class="chart-preview-placeholder">Configure at least one encoding to see preview</div>';
            if (errorDiv) errorDiv.textContent = '';
            if (createBtn) createBtn.disabled = true;
            return;
        }

        // Generate spec
        const spec = generateVegaLiteSpec();
        if (!spec) return;

        // Resolve dataset references (reuse existing function from editor.js)
        const resolvedSpec = await resolveDatasetReferences(JSON.parse(JSON.stringify(spec)));

        // Clear container
        previewContainer.innerHTML = '';

        // Render with Vega-Embed
        await window.vegaEmbed('#chart-builder-preview', resolvedSpec, {
            actions: false,
            renderer: 'svg'
        });

        // Clear error and enable create button
        if (errorDiv) errorDiv.textContent = '';
        if (createBtn) createBtn.disabled = false;

    } catch (error) {
        console.error('Error rendering chart preview:', error);

        // Show error message
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Error rendering chart';
        }

        // Show error in preview
        previewContainer.innerHTML = `<div class="chart-preview-placeholder" style="color: #d32f2f;">Error: ${error.message || 'Failed to render chart'}</div>`;

        // Disable create button
        if (createBtn) createBtn.disabled = true;
    }
}

// Create snippet from chart builder
async function createSnippetFromBuilder() {
    if (!window.chartBuilderState) return;

    try {
        // Generate final spec
        const spec = generateVegaLiteSpec();
        if (!spec) return;

        // Create snippet with auto-generated name
        const snippetName = generateSnippetName();
        const now = new Date().toISOString();

        const snippet = {
            id: generateSnippetId(),
            name: snippetName,
            created: now,
            modified: now,
            spec: spec,
            draftSpec: null,
            comment: `Chart built from dataset: ${window.chartBuilderState.datasetName}`,
            tags: [],
            datasetRefs: [window.chartBuilderState.datasetName],
            meta: {}
        };

        // Save snippet
        SnippetStorage.saveSnippet(snippet);

        // Close chart builder
        closeChartBuilder();

        // Close dataset modal if open
        const datasetModal = document.getElementById('dataset-modal');
        if (datasetModal) {
            datasetModal.style.display = 'none';
        }

        // Select and open the new snippet
        selectSnippet(snippet.id);

        // Show success message
        showToast(`Created snippet: ${snippetName}`, 'success');

    } catch (error) {
        console.error('Error creating snippet from builder:', error);
        showToast('Error creating snippet', 'error');
    }
}

// Close chart builder modal
function closeChartBuilder() {
    const modal = document.getElementById('chart-builder-modal');
    modal.style.display = 'none';

    // Update URL - go back to dataset view
    if (window.chartBuilderState && window.chartBuilderState.datasetId) {
        URLState.update({
            view: 'datasets',
            datasetId: window.chartBuilderState.datasetId,
            action: null
        });
    }

    // Clear timeout
    clearTimeout(previewUpdateTimeout);

    // Clear state
    window.chartBuilderState = null;

    // Clear preview
    const previewContainer = document.getElementById('chart-builder-preview');
    if (previewContainer) {
        previewContainer.innerHTML = '<div class="chart-preview-placeholder">Configure chart to see preview</div>';
    }

    // Clear error
    const errorDiv = document.getElementById('chart-builder-error');
    if (errorDiv) {
        errorDiv.textContent = '';
    }

    // Reset create button
    const createBtn = document.getElementById('chart-builder-create-btn');
    if (createBtn) {
        createBtn.disabled = true;
    }
}

// Initialize chart builder event listeners
function initializeChartBuilder() {
    // Close button
    const closeBtn = document.getElementById('chart-builder-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeChartBuilder);
    }

    // Cancel button
    const cancelBtn = document.getElementById('chart-builder-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeChartBuilder);
    }

    // Back button
    const backBtn = document.getElementById('chart-builder-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            closeChartBuilder();
            // Dataset modal should still be open
        });
    }

    // Create snippet button
    const createBtn = document.getElementById('chart-builder-create-btn');
    if (createBtn) {
        createBtn.addEventListener('click', createSnippetFromBuilder);
    }

    // Mark type toggle buttons
    const markButtons = document.querySelectorAll('.mark-toggle-group .btn-toggle');
    markButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveToggle(markButtons, btn);

            if (window.chartBuilderState) {
                window.chartBuilderState.spec.mark.type = btn.dataset.mark;
                updateChartBuilderPreview();
            }
        });
    });

    // Encoding field dropdowns
    const encodings = ['x', 'y', 'color', 'size'];
    encodings.forEach(encoding => {
        const select = document.getElementById(`encoding-${encoding}-field`);
        if (select) {
            select.addEventListener('change', async (e) => {
                const field = e.target.value;

                if (!window.chartBuilderState) return;

                if (field) {
                    // Try to get active type button, or auto-detect from dataset
                    const activeTypeBtn = document.querySelector(`[data-encoding="${encoding}"][data-type].active`);
                    let type = activeTypeBtn ? activeTypeBtn.dataset.type : 'nominal';

                    // If no active type button, auto-detect from column type
                    if (!activeTypeBtn && window.chartBuilderState.datasetId) {
                        const dataset = await DatasetStorage.getDataset(window.chartBuilderState.datasetId);
                        const columnTypes = dataset.columnTypes || [];
                        const colType = columnTypes.find(ct => ct.name === field);
                        if (colType) {
                            type = mapColumnTypeToVegaType(colType.type);
                        }
                    }

                    setEncoding(encoding, field, type);
                } else {
                    // Remove encoding when "None" is selected
                    setEncoding(encoding, '', '');
                }

                updateChartBuilderPreview();
            });
        }
    });

    // Encoding type toggle buttons
    const typeButtons = document.querySelectorAll('.type-toggle-group .btn-toggle');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const encoding = btn.dataset.encoding;
            const type = btn.dataset.type;

            // Update active state for this encoding's buttons
            const encodingButtons = document.querySelectorAll(`[data-encoding="${encoding}"][data-type]`);
            setActiveToggle(encodingButtons, btn);

            // Update state
            if (window.chartBuilderState && window.chartBuilderState.spec.encoding[encoding]) {
                window.chartBuilderState.spec.encoding[encoding].type = type;
                updateChartBuilderPreview();
            }
        });
    });

    // Dimension inputs
    const widthInput = document.getElementById('chart-width');
    const heightInput = document.getElementById('chart-height');

    if (widthInput) {
        widthInput.addEventListener('input', () => {
            updateChartBuilderPreview();
        });
    }

    if (heightInput) {
        heightInput.addEventListener('input', () => {
            updateChartBuilderPreview();
        });
    }
}
