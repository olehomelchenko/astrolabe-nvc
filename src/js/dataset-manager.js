// Dataset management with IndexedDB

const DB_NAME = 'astrolabe-datasets';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

let db = null;

// Initialize IndexedDB
function initializeDatasetDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('name', 'name', { unique: true });
                objectStore.createIndex('modified', 'modified', { unique: false });
            }
        };
    });
}

// Generate unique ID
function generateDatasetId() {
    return Date.now() + Math.random() * 1000;
}

// Calculate dataset statistics
function calculateDatasetStats(data, format, source) {
    let rowCount = 0;
    let columnCount = 0;
    let columns = [];
    let size = 0;

    // For URL sources, we can't calculate stats without fetching
    if (source === 'url') {
        return { rowCount: null, columnCount: null, columns: [], size: null };
    }

    if (format === 'json' || format === 'topojson') {
        if (!Array.isArray(data) || data.length === 0) {
            return { rowCount: 0, columnCount: 0, columns: [], size: 0 };
        }
        rowCount = data.length;
        const firstRow = data[0];
        columns = typeof firstRow === 'object' ? Object.keys(firstRow) : [];
        columnCount = columns.length;
        size = new Blob([JSON.stringify(data)]).size;
    } else if (format === 'csv' || format === 'tsv') {
        // For CSV/TSV, data is stored as raw text
        const lines = data.trim().split('\n');
        rowCount = Math.max(0, lines.length - 1); // Subtract header row
        if (lines.length > 0) {
            const separator = format === 'csv' ? ',' : '\t';
            columns = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
            columnCount = columns.length;
        }
        size = new Blob([data]).size;
    }

    return { rowCount, columnCount, columns, size };
}

// Dataset Storage API
const DatasetStorage = {
    // Initialize database
    async init() {
        if (!db) {
            await initializeDatasetDB();
        }
        return db;
    },

    // Create new dataset
    async createDataset(name, data, format, source, comment = '') {
        await this.init();

        const now = new Date().toISOString();
        const stats = calculateDatasetStats(data, format, source);

        const dataset = {
            id: generateDatasetId(),
            name: name.trim(),
            created: now,
            modified: now,
            data: data, // For inline: actual data, for URL: the URL string
            format: format, // 'json', 'csv', 'tsv', or 'topojson'
            source: source, // 'inline' or 'url'
            comment: comment.trim(),
            ...stats
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(dataset);

            request.onsuccess = () => resolve(dataset);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all datasets
    async listDatasets() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get single dataset by ID
    async getDataset(id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get dataset by name
    async getDatasetByName(name) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('name');
            const request = index.get(name);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Update dataset
    async updateDataset(id, updates) {
        await this.init();

        const dataset = await this.getDataset(id);
        if (!dataset) {
            throw new Error('Dataset not found');
        }

        // Update fields
        if (updates.name !== undefined) dataset.name = updates.name.trim();
        if (updates.data !== undefined) {
            dataset.data = updates.data;
            if (updates.format !== undefined) dataset.format = updates.format;
            if (updates.source !== undefined) dataset.source = updates.source;

            // If metadata fields are explicitly provided, use them directly
            if (updates.rowCount !== undefined) dataset.rowCount = updates.rowCount;
            if (updates.columnCount !== undefined) dataset.columnCount = updates.columnCount;
            if (updates.columns !== undefined) dataset.columns = updates.columns;
            if (updates.size !== undefined) dataset.size = updates.size;

            // Otherwise, calculate stats (for inline data)
            if (updates.rowCount === undefined && updates.columnCount === undefined) {
                const stats = calculateDatasetStats(updates.data, dataset.format, dataset.source);
                Object.assign(dataset, stats);
            }
        }
        if (updates.comment !== undefined) dataset.comment = updates.comment.trim();

        dataset.modified = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(dataset);

            request.onsuccess = () => resolve(dataset);
            request.onerror = () => reject(request.error);
        });
    },

    // Delete dataset
    async deleteDataset(id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    // Check if dataset name exists
    async nameExists(name, excludeId = null) {
        const datasets = await this.listDatasets();
        return datasets.some(d => d.name === name && d.id !== excludeId);
    }
};

// Format bytes for display
function formatDatasetSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Fetch URL data and calculate metadata
async function fetchURLMetadata(url, format) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const text = await response.text();

        let rowCount = 0;
        let columnCount = 0;
        let columns = [];
        let size = contentLength ? parseInt(contentLength) : new Blob([text]).size;

        // Parse based on format
        if (format === 'json') {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                rowCount = data.length;
                if (data.length > 0 && typeof data[0] === 'object') {
                    columns = Object.keys(data[0]);
                    columnCount = columns.length;
                }
            }
        } else if (format === 'csv' || format === 'tsv') {
            const lines = text.trim().split('\n');
            rowCount = Math.max(0, lines.length - 1); // Subtract header
            if (lines.length > 0) {
                const separator = format === 'csv' ? ',' : '\t';
                columns = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
                columnCount = columns.length;
            }
        } else if (format === 'topojson') {
            // TopoJSON structure is complex, just note it exists
            rowCount = null;
            columnCount = null;
        }

        return { rowCount, columnCount, columns, size };
    } catch (error) {
        throw new Error(`Failed to fetch URL metadata: ${error.message}`);
    }
}

// Render dataset list in modal
async function renderDatasetList() {
    const datasets = await DatasetStorage.listDatasets();
    const listContainer = document.getElementById('dataset-list');

    if (datasets.length === 0) {
        listContainer.innerHTML = '<div class="dataset-empty">No datasets yet. Click "New Dataset" to create one.</div>';
        return;
    }

    // Sort by modified date (most recent first)
    datasets.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    const html = datasets.map(dataset => {
        let metaText;
        if (dataset.source === 'url') {
            // Show metadata if available, otherwise just URL and format
            if (dataset.rowCount !== null && dataset.size !== null) {
                metaText = `URL • ${dataset.rowCount} rows • ${dataset.format.toUpperCase()} • ${formatDatasetSize(dataset.size)}`;
            } else {
                metaText = `URL • ${dataset.format.toUpperCase()}`;
            }
        } else {
            metaText = `${dataset.rowCount} rows • ${dataset.format.toUpperCase()} • ${formatDatasetSize(dataset.size)}`;
        }

        return `
            <div class="dataset-item" data-dataset-id="${dataset.id}">
                <div class="dataset-info">
                    <div class="dataset-name">${dataset.name}</div>
                    <div class="dataset-meta">${metaText}</div>
                </div>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;

    // Attach click handlers
    document.querySelectorAll('.dataset-item').forEach(item => {
        item.addEventListener('click', function() {
            const datasetId = parseFloat(this.dataset.datasetId);
            selectDataset(datasetId);
        });
    });
}

// Select a dataset and show details
async function selectDataset(datasetId) {
    const dataset = await DatasetStorage.getDataset(datasetId);
    if (!dataset) return;

    // Update selection state
    document.querySelectorAll('.dataset-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-dataset-id="${datasetId}"]`).classList.add('selected');

    // Show details panel
    const detailsPanel = document.getElementById('dataset-details');
    detailsPanel.style.display = 'block';

    // Show/hide refresh button for URL datasets
    const refreshBtn = document.getElementById('refresh-metadata-btn');
    if (dataset.source === 'url') {
        refreshBtn.style.display = 'flex';
    } else {
        refreshBtn.style.display = 'none';
    }

    // Populate details
    document.getElementById('dataset-detail-name').value = dataset.name;
    document.getElementById('dataset-detail-comment').value = dataset.comment;
    document.getElementById('dataset-detail-rows').textContent = dataset.rowCount !== null ? dataset.rowCount : 'N/A';
    document.getElementById('dataset-detail-columns').textContent = dataset.columnCount !== null ? dataset.columnCount : 'N/A';
    document.getElementById('dataset-detail-size').textContent = dataset.size !== null ? formatDatasetSize(dataset.size) : 'N/A';
    document.getElementById('dataset-detail-created').textContent = new Date(dataset.created).toLocaleString();
    document.getElementById('dataset-detail-modified').textContent = new Date(dataset.modified).toLocaleString();

    // Show preview
    let previewText;
    if (dataset.source === 'url') {
        previewText = `URL: ${dataset.data}\nFormat: ${dataset.format.toUpperCase()}`;
    } else if (dataset.format === 'json' || dataset.format === 'topojson') {
        const previewData = Array.isArray(dataset.data) ? dataset.data.slice(0, 5) : dataset.data;
        previewText = JSON.stringify(previewData, null, 2);
    } else if (dataset.format === 'csv' || dataset.format === 'tsv') {
        const lines = dataset.data.split('\n');
        previewText = lines.slice(0, 6).join('\n'); // Header + 5 rows
    }
    document.getElementById('dataset-preview').textContent = previewText;

    // Store current dataset ID
    window.currentDatasetId = datasetId;
}

// Open dataset manager modal
function openDatasetManager() {
    const modal = document.getElementById('dataset-modal');
    modal.style.display = 'flex';
    renderDatasetList();
}

// Close dataset manager modal
function closeDatasetManager() {
    const modal = document.getElementById('dataset-modal');
    modal.style.display = 'none';
    window.currentDatasetId = null;
}

// Update format hint and placeholder
function updateFormatHint(format) {
    const hintEl = document.getElementById('dataset-format-hint');
    const dataEl = document.getElementById('dataset-form-data');

    if (format === 'json') {
        hintEl.textContent = 'JSON array of objects: [{"col1": "value", "col2": 123}, ...]';
        dataEl.placeholder = '[{"col1": "value", "col2": 123}, ...]';
    } else if (format === 'csv') {
        hintEl.textContent = 'CSV with header row: col1,col2\\nvalue1,123\\nvalue2,456';
        dataEl.placeholder = 'col1,col2\nvalue1,123\nvalue2,456';
    } else if (format === 'tsv') {
        hintEl.textContent = 'TSV with header row: col1\\tcol2\\nvalue1\\t123\\nvalue2\\t456';
        dataEl.placeholder = 'col1\tcol2\nvalue1\t123\nvalue2\t456';
    } else if (format === 'topojson') {
        hintEl.textContent = 'TopoJSON object: {"type": "Topology", "objects": {...}, "arcs": [...]}';
        dataEl.placeholder = '{"type": "Topology", "objects": {...}}';
    }
}

// Toggle between URL and inline data inputs
function toggleDataSource(source) {
    const urlGroup = document.getElementById('dataset-url-group');
    const dataGroup = document.getElementById('dataset-data-group');

    if (source === 'url') {
        urlGroup.style.display = 'block';
        dataGroup.style.display = 'none';
    } else {
        urlGroup.style.display = 'none';
        dataGroup.style.display = 'block';
    }
}

// Show new dataset form
function showNewDatasetForm() {
    document.getElementById('dataset-list-view').style.display = 'none';
    document.getElementById('dataset-form-view').style.display = 'block';
    document.getElementById('dataset-form-name').value = '';
    document.getElementById('dataset-form-data').value = '';
    document.getElementById('dataset-form-url').value = '';
    document.getElementById('dataset-form-comment').value = '';
    document.getElementById('dataset-form-error').textContent = '';

    // Reset to inline data source and JSON format
    document.querySelectorAll('[data-source]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.source === 'inline');
    });
    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.format === 'json');
    });
    toggleDataSource('inline');
    updateFormatHint('json');

    // Add listeners if not already added
    if (!window.datasetListenersAdded) {
        // Source toggle button listeners
        document.querySelectorAll('[data-source]').forEach(btn => {
            btn.addEventListener('click', function () {
                // Update active state
                document.querySelectorAll('[data-source]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                toggleDataSource(this.dataset.source);
            });
        });

        // Format toggle button listeners
        document.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', function () {
                // Update active state
                document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateFormatHint(this.dataset.format);
            });
        });

        window.datasetListenersAdded = true;
    }
}

// Hide new dataset form
function hideNewDatasetForm() {
    document.getElementById('dataset-list-view').style.display = 'block';
    document.getElementById('dataset-form-view').style.display = 'none';
}

// Save new dataset
async function saveNewDataset() {
    const name = document.getElementById('dataset-form-name').value.trim();
    const source = document.querySelector('[data-source].active').dataset.source;
    const format = document.querySelector('[data-format].active').dataset.format;
    const comment = document.getElementById('dataset-form-comment').value.trim();
    const errorEl = document.getElementById('dataset-form-error');

    errorEl.textContent = '';

    // Validation
    if (!name) {
        errorEl.textContent = 'Dataset name is required';
        return;
    }

    let data;
    let metadata = null;

    if (source === 'url') {
        const url = document.getElementById('dataset-form-url').value.trim();
        if (!url) {
            errorEl.textContent = 'URL is required';
            return;
        }
        // Basic URL validation
        try {
            new URL(url);
        } catch (error) {
            errorEl.textContent = 'Invalid URL format';
            return;
        }

        // Fetch metadata from URL
        errorEl.textContent = 'Fetching data from URL...';
        try {
            metadata = await fetchURLMetadata(url, format);
            errorEl.textContent = '';
        } catch (error) {
            errorEl.textContent = `Warning: ${error.message}. Dataset will be created without metadata.`;
            // Continue anyway - URL might require CORS or auth
            await new Promise(resolve => setTimeout(resolve, 2000)); // Show warning briefly
            errorEl.textContent = '';
        }

        data = url; // Store the URL string
    } else {
        // Inline data
        const dataText = document.getElementById('dataset-form-data').value.trim();
        if (!dataText) {
            errorEl.textContent = 'Data is required';
            return;
        }

        // Basic validation of data format
        try {
            if (format === 'json' || format === 'topojson') {
                const parsed = JSON.parse(dataText);
                if (format === 'json' && !Array.isArray(parsed)) {
                    errorEl.textContent = 'JSON data must be an array of objects';
                    return;
                }
                if (format === 'json' && parsed.length === 0) {
                    errorEl.textContent = 'Data array cannot be empty';
                    return;
                }
                data = parsed; // Store as parsed JSON
            } else if (format === 'csv' || format === 'tsv') {
                const lines = dataText.trim().split('\n');
                if (lines.length < 2) {
                    errorEl.textContent = `${format.toUpperCase()} must have at least a header row and one data row`;
                    return;
                }
                data = dataText; // Store as raw CSV/TSV string
            }
        } catch (error) {
            errorEl.textContent = `Validation error: ${error.message}`;
            return;
        }
    }

    // Check if name already exists
    if (await DatasetStorage.nameExists(name)) {
        errorEl.textContent = 'A dataset with this name already exists';
        return;
    }

    // Create dataset
    try {
        const dataset = await DatasetStorage.createDataset(name, data, format, source, comment);

        // If we have metadata from URL fetch, update the dataset
        if (metadata) {
            await DatasetStorage.updateDataset(dataset.id, {
                data: data,
                ...metadata
            });
        }

        hideNewDatasetForm();
        await renderDatasetList();
    } catch (error) {
        errorEl.textContent = `Failed to save dataset: ${error.message}`;
    }
}

// Delete current dataset
async function deleteCurrentDataset() {
    if (!window.currentDatasetId) return;

    const dataset = await DatasetStorage.getDataset(window.currentDatasetId);
    if (!dataset) return;

    if (confirm(`Delete dataset "${dataset.name}"? This action cannot be undone.`)) {
        await DatasetStorage.deleteDataset(window.currentDatasetId);
        document.getElementById('dataset-details').style.display = 'none';
        window.currentDatasetId = null;
        await renderDatasetList();
    }
}

// Copy dataset reference to clipboard
function copyDatasetReference() {
    if (!window.currentDatasetId) return;

    DatasetStorage.getDataset(window.currentDatasetId).then(dataset => {
        const reference = `"data": {"name": "${dataset.name}"}`;
        navigator.clipboard.writeText(reference).then(() => {
            alert('Dataset reference copied to clipboard!');
        });
    });
}

// Refresh metadata for URL dataset
async function refreshDatasetMetadata() {
    if (!window.currentDatasetId) return;

    const dataset = await DatasetStorage.getDataset(window.currentDatasetId);
    if (!dataset || dataset.source !== 'url') return;

    const refreshBtn = document.getElementById('refresh-metadata-btn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳';

    try {
        const metadata = await fetchURLMetadata(dataset.data, dataset.format);

        // Update dataset with new metadata
        await DatasetStorage.updateDataset(dataset.id, {
            data: dataset.data,
            ...metadata
        });

        // Refresh the display
        await selectDataset(dataset.id);
        await renderDatasetList();

        // Brief success indicator
        refreshBtn.textContent = '✓';
        setTimeout(() => {
            refreshBtn.textContent = '🔄';
            refreshBtn.disabled = false;
        }, 1000);
    } catch (error) {
        alert(`Failed to refresh metadata: ${error.message}`);
        refreshBtn.textContent = '🔄';
        refreshBtn.disabled = false;
    }
}
