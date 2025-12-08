// Chart Builder - Visual chart construction from datasets

/**
 * Alpine.js component for Chart Builder
 * Manages reactive state for chart configuration and preview
 */
function chartBuilder() {
    return {
        // Dataset info
        datasetId: null,
        datasetName: null,
        dataset: null,

        // Chart configuration
        markType: 'bar',
        encodings: {
            x: { field: '', type: 'nominal' },
            y: { field: '', type: 'quantitative' },
            color: { field: '', type: 'nominal' },
            size: { field: '', type: 'quantitative' }
        },
        width: null,
        height: null,

        // UI state
        previewTimeout: null,

        // Computed: Generate Vega-Lite spec from current state
        get spec() {
            const spec = {
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "data": { "name": this.datasetName },
                "mark": { "type": this.markType, "tooltip": true },
                "encoding": {}
            };

            // Add encodings
            ['x', 'y', 'color', 'size'].forEach(channel => {
                const enc = this.encodings[channel];
                if (enc.field) {
                    spec.encoding[channel] = {
                        field: enc.field,
                        type: enc.type
                    };
                }
            });

            // Add dimensions if specified
            if (this.width) spec.width = parseInt(this.width);
            if (this.height) spec.height = parseInt(this.height);

            // Remove empty encoding object
            if (Object.keys(spec.encoding).length === 0) {
                delete spec.encoding;
            }

            return spec;
        },

        // Computed: Check if configuration is valid
        get isValid() {
            return Object.values(this.encodings).some(enc => enc.field !== '');
        },

        // Initialize component with dataset
        async init(datasetId) {
            try {
                // Validate datasetId is provided
                if (!datasetId || isNaN(datasetId)) {
                    console.warn('Chart builder init called without valid datasetId');
                    return false;
                }

                // Fetch dataset from IndexedDB
                this.dataset = await DatasetStorage.getDataset(datasetId);
                if (!this.dataset) {
                    Toast.error('Dataset not found');
                    return false;
                }

                this.datasetId = datasetId;
                this.datasetName = this.dataset.name;

                // Populate field dropdowns
                populateFieldDropdowns(this.dataset);

                // Auto-select smart defaults
                this.autoSelectDefaults();

                // Trigger initial preview
                this.$nextTick(() => {
                    this.updatePreview();
                });

                return true;
            } catch (error) {
                console.error('Error initializing chart builder:', error);
                Toast.error('Error opening chart builder');
                return false;
            }
        },

        // Auto-select smart defaults based on column types
        autoSelectDefaults() {
            const columns = this.dataset.columns || [];
            const columnTypes = this.dataset.columnTypes || [];

            if (columns.length === 0) return;

            // Select first column for X axis
            if (columns.length >= 1) {
                const firstCol = columns[0];
                const firstColType = columnTypes.find(ct => ct.name === firstCol);
                this.encodings.x.field = firstCol;
                this.encodings.x.type = firstColType ? mapColumnTypeToVegaType(firstColType.type) : 'nominal';
            }

            // Select second column for Y axis (if exists)
            if (columns.length >= 2) {
                const secondCol = columns[1];
                const secondColType = columnTypes.find(ct => ct.name === secondCol);
                this.encodings.y.field = secondCol;
                this.encodings.y.type = secondColType ? mapColumnTypeToVegaType(secondColType.type) : 'quantitative';
            }
        },

        // Set mark type and update preview
        setMarkType(type) {
            this.markType = type;
            this.updatePreview();
        },

        // Set encoding field and auto-detect type if needed
        async setEncodingField(channel, field) {
            this.encodings[channel].field = field;

            if (field && this.dataset) {
                // Auto-detect type from column type
                const columnTypes = this.dataset.columnTypes || [];
                const colType = columnTypes.find(ct => ct.name === field);
                if (colType) {
                    this.encodings[channel].type = mapColumnTypeToVegaType(colType.type);
                }
            }

            this.updatePreview();
        },

        // Set encoding type and update preview
        setEncodingType(channel, type) {
            if (this.encodings[channel].field) {
                this.encodings[channel].type = type;
                this.updatePreview();
            }
        },

        // Update preview with debouncing
        updatePreview() {
            clearTimeout(this.previewTimeout);

            // Get debounce time from settings (default 1500ms)
            const debounceTime = getSetting('performance.renderDebounce') || 1500;

            this.previewTimeout = setTimeout(async () => {
                await this.renderPreview();
            }, debounceTime);
        },

        // Render preview in chart builder
        async renderPreview() {
            const previewContainer = document.getElementById('chart-builder-preview');
            const errorDiv = document.getElementById('chart-builder-error');

            if (!previewContainer) return;

            try {
                // Validate configuration
                if (!this.isValid) {
                    previewContainer.innerHTML = '<div class="chart-preview-placeholder">Configure at least one encoding to see preview</div>';
                    if (errorDiv) errorDiv.textContent = '';
                    return;
                }

                // Resolve dataset references
                const resolvedSpec = await resolveDatasetReferences(JSON.parse(JSON.stringify(this.spec)));

                // Clear container
                previewContainer.innerHTML = '';

                // Render with Vega-Embed
                await window.vegaEmbed('#chart-builder-preview', resolvedSpec, {
                    actions: false,
                    renderer: 'svg'
                });

                // Clear error
                if (errorDiv) errorDiv.textContent = '';

            } catch (error) {
                console.error('Error rendering chart preview:', error);

                // Show error message
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Error rendering chart';
                }

                // Show error in preview
                previewContainer.innerHTML = `<div class="chart-preview-placeholder" style="color: #d32f2f;">Error: ${error.message || 'Failed to render chart'}</div>`;
            }
        },

        // Create snippet from current chart configuration
        async createSnippet() {
            if (!this.isValid) return;

            try {
                // Create snippet with auto-generated name
                const snippetName = generateSnippetName();
                const now = new Date().toISOString();

                const snippet = {
                    id: generateSnippetId(),
                    name: snippetName,
                    created: now,
                    modified: now,
                    spec: this.spec,
                    draftSpec: null,
                    comment: `Chart built from dataset: ${this.datasetName}`,
                    tags: [],
                    datasetRefs: [this.datasetName],
                    meta: {}
                };

                // Save snippet
                SnippetStorage.saveSnippet(snippet);

                // Close modals
                this.close();
                const datasetModal = document.getElementById('dataset-modal');
                if (datasetModal) datasetModal.style.display = 'none';

                // Select and open the new snippet
                selectSnippet(snippet.id);

                // Show success message
                Toast.success(`Created snippet: ${snippetName}`);

            } catch (error) {
                console.error('Error creating snippet from builder:', error);
                Toast.error('Error creating snippet');
            }
        },

        // Close chart builder and cleanup
        close() {
            const modal = document.getElementById('chart-builder-modal');
            modal.style.display = 'none';

            // Update URL - go back to dataset view
            if (this.datasetId) {
                URLState.update({
                    view: 'datasets',
                    datasetId: this.datasetId,
                    action: null
                });
            }

            // Clear timeout
            clearTimeout(this.previewTimeout);

            // Reset state
            this.datasetId = null;
            this.datasetName = null;
            this.dataset = null;
            this.markType = 'bar';
            this.encodings = {
                x: { field: '', type: 'nominal' },
                y: { field: '', type: 'quantitative' },
                color: { field: '', type: 'nominal' },
                size: { field: '', type: 'quantitative' }
            };
            this.width = null;
            this.height = null;

            // Clear preview
            const previewContainer = document.getElementById('chart-builder-preview');
            if (previewContainer) {
                previewContainer.innerHTML = '<div class="chart-preview-placeholder">Configure chart to see preview</div>';
            }

            // Clear error
            const errorDiv = document.getElementById('chart-builder-error');
            if (errorDiv) errorDiv.textContent = '';
        }
    };
}

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
        // Show modal first
        const modal = document.getElementById('chart-builder-modal');
        modal.style.display = 'flex';

        // Get Alpine component instance and initialize it
        const chartBuilderView = document.getElementById('chart-builder-view');
        if (chartBuilderView && chartBuilderView._x_dataStack) {
            const component = chartBuilderView._x_dataStack[0];
            const success = await component.init(datasetId);

            if (!success) {
                modal.style.display = 'none';
                return;
            }
        }

        // Update URL to reflect chart builder state
        URLState.update({
            view: 'datasets',
            datasetId: datasetId,
            action: 'build'
        });

    } catch (error) {
        console.error('Error opening chart builder:', error);
        Toast.error('Error opening chart builder');
    }
}



// Populate field dropdowns with dataset columns (utility function)
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

// closeChartBuilder - now calls Alpine component's close() method  
function closeChartBuilder() {
    const chartBuilderView = document.getElementById('chart-builder-view');
    if (chartBuilderView && chartBuilderView._x_dataStack) {
        const component = chartBuilderView._x_dataStack[0];
        component.close();
    }
}
