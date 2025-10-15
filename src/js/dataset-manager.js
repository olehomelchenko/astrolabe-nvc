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

// Helper: Get currently selected dataset
async function getCurrentDataset() {
    return window.currentDatasetId ? await DatasetStorage.getDataset(window.currentDatasetId) : null;
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
                metaText = `URL • ${dataset.rowCount} rows • ${dataset.format.toUpperCase()} • ${formatBytes(dataset.size)}`;
            } else {
                metaText = `URL • ${dataset.format.toUpperCase()}`;
            }
        } else {
            metaText = `${dataset.rowCount} rows • ${dataset.format.toUpperCase()} • ${formatBytes(dataset.size)}`;
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
async function selectDataset(datasetId, updateURL = true) {
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
    document.getElementById('dataset-detail-size').textContent = formatBytes(dataset.size);
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

    // Update URL state (URLState.update will add 'dataset-' prefix)
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: datasetId });
    }
}

// Open dataset manager modal
function openDatasetManager(updateURL = true) {
    const modal = document.getElementById('dataset-modal');
    modal.style.display = 'flex';
    renderDatasetList();

    // Update URL state
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: null });
    }
}

// Close dataset manager modal
function closeDatasetManager(updateURL = true) {
    const modal = document.getElementById('dataset-modal');
    modal.style.display = 'none';
    window.currentDatasetId = null;

    // Update URL state - restore snippet if one is selected
    if (updateURL) {
        if (window.currentSnippetId) {
            URLState.update({ view: 'snippets', snippetId: window.currentSnippetId, datasetId: null });
        } else {
            URLState.clear();
        }
    }
}

// Auto-detect data format from pasted content
function detectDataFormat(text) {
    text = text.trim();

    // Try JSON first
    try {
        const parsed = JSON.parse(text);

        // Check if it's TopoJSON
        if (parsed && typeof parsed === 'object' && parsed.type === 'Topology') {
            return { format: 'topojson', parsed, confidence: 'high' };
        }

        // Check if it's JSON array
        if (Array.isArray(parsed)) {
            return { format: 'json', parsed, confidence: 'high' };
        }

        // Could be TopoJSON or other JSON object
        return { format: 'json', parsed, confidence: 'medium' };
    } catch (e) {
        // Not JSON, continue checking
    }

    // Check for CSV/TSV
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length >= 2) {
        const firstLine = lines[0];

        // Count delimiters
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;

        // TSV detection
        if (tabCount > 0 && tabCount > commaCount) {
            // Verify consistency across rows
            const isConsistent = lines.slice(0, 5).every(line =>
                (line.match(/\t/g) || []).length === tabCount
            );

            if (isConsistent) {
                return { format: 'tsv', parsed: text, confidence: 'high' };
            }
        }

        // CSV detection
        if (commaCount > 0) {
            // Basic consistency check (at least 2 rows with similar comma count)
            const isConsistent = lines.slice(0, 5).every(line => {
                const count = (line.match(/,/g) || []).length;
                return Math.abs(count - commaCount) <= 1; // Allow 1 comma difference
            });

            if (isConsistent) {
                return { format: 'csv', parsed: text, confidence: 'medium' };
            }
        }
    }

    return { format: null, parsed: null, confidence: 'low' };
}

// Check if text is a URL
function isURL(text) {
    try {
        const url = new URL(text.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Detect format from URL extension
function detectFormatFromURL(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.endsWith('.json')) return 'json';
    if (urlLower.endsWith('.csv')) return 'csv';
    if (urlLower.endsWith('.tsv') || urlLower.endsWith('.tab')) return 'tsv';
    if (urlLower.endsWith('.topojson')) return 'topojson';
    return null;
}

// Fetch and detect format from URL
async function fetchAndDetectURL(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        const detected = detectDataFormat(text);

        // If no format detected from content, try URL extension
        if (!detected.format) {
            const formatFromURL = detectFormatFromURL(url);
            if (formatFromURL) {
                return {
                    format: formatFromURL,
                    content: text,
                    confidence: 'low',
                    source: 'url'
                };
            }
        }

        return {
            format: detected.format,
            content: text,
            parsed: detected.parsed,
            confidence: detected.confidence,
            source: 'url'
        };
    } catch (error) {
        throw new Error(`Failed to fetch URL: ${error.message}`);
    }
}

// Show detected format confirmation UI
function showDetectionConfirmation(detection, originalInput) {
    const confirmEl = document.getElementById('dataset-detection-confirm');
    const detectedFormatEl = document.getElementById('detected-format');
    const detectedSourceEl = document.getElementById('detected-source');
    const detectedPreviewEl = document.getElementById('detected-preview');
    const detectedConfidenceEl = document.getElementById('detected-confidence');

    confirmEl.style.display = 'block';

    // Show detected format
    detectedFormatEl.textContent = detection.format ? detection.format.toUpperCase() : 'Unknown';

    // Show source
    detectedSourceEl.textContent = detection.source === 'url' ? 'URL' : 'Inline Data';

    // Show confidence indicator
    const confidenceClass = detection.confidence === 'high' ? 'high' :
                           detection.confidence === 'medium' ? 'medium' : 'low';
    detectedConfidenceEl.className = `detected-confidence ${confidenceClass}`;
    detectedConfidenceEl.textContent = `${detection.confidence} confidence`;

    // Show preview
    let previewText = '';
    if (detection.source === 'url') {
        previewText = `URL: ${originalInput}\n\n`;
        if (detection.content) {
            const lines = detection.content.split('\n');
            previewText += `Preview (first 10 lines):\n${lines.slice(0, 10).join('\n')}`;
            if (lines.length > 10) {
                previewText += `\n... (${lines.length - 10} more lines)`;
            }
        }
    } else {
        const lines = originalInput.split('\n');
        previewText = lines.slice(0, 15).join('\n');
        if (lines.length > 15) {
            previewText += `\n... (${lines.length - 15} more lines)`;
        }
    }
    detectedPreviewEl.textContent = previewText;

    // Store detection data for later use
    window.currentDetection = {
        ...detection,
        originalInput
    };
}

// Hide detection confirmation UI
function hideDetectionConfirmation() {
    const confirmEl = document.getElementById('dataset-detection-confirm');
    confirmEl.style.display = 'none';
    window.currentDetection = null;
}

// Show new dataset form
function showNewDatasetForm(updateURL = true) {
    document.getElementById('dataset-list-view').style.display = 'none';
    document.getElementById('dataset-form-view').style.display = 'block';
    document.getElementById('dataset-form-name').value = '';
    document.getElementById('dataset-form-input').value = '';
    document.getElementById('dataset-form-comment').value = '';
    document.getElementById('dataset-form-error').textContent = '';

    // Hide detection confirmation
    hideDetectionConfirmation();

    // Update URL state
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: 'new' });
    }

    // Add paste handler if not already added
    if (!window.datasetListenersAdded) {
        const inputEl = document.getElementById('dataset-form-input');

        // Handle paste/input with auto-detection
        inputEl.addEventListener('input', async function () {
            const text = this.value.trim();
            if (!text) {
                hideDetectionConfirmation();
                return;
            }

            const errorEl = document.getElementById('dataset-form-error');
            errorEl.textContent = '';

            // Check if it's a URL
            if (isURL(text)) {
                errorEl.textContent = 'Fetching and analyzing URL...';

                try {
                    const detection = await fetchAndDetectURL(text);
                    errorEl.textContent = '';

                    if (detection.format) {
                        showDetectionConfirmation(detection, text);
                    } else {
                        errorEl.textContent = 'Could not detect data format from URL. Please check the URL or try pasting the data directly.';
                        hideDetectionConfirmation();
                    }
                } catch (error) {
                    errorEl.textContent = error.message;
                    hideDetectionConfirmation();
                }
            } else {
                // Inline data - detect format
                const detection = detectDataFormat(text);

                if (detection.format) {
                    showDetectionConfirmation({
                        ...detection,
                        source: 'inline'
                    }, text);
                } else {
                    errorEl.textContent = 'Could not detect data format. Please ensure your data is valid JSON, CSV, or TSV.';
                    hideDetectionConfirmation();
                }
            }
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
    const comment = document.getElementById('dataset-form-comment').value.trim();
    const errorEl = document.getElementById('dataset-form-error');

    errorEl.textContent = '';

    // Validation
    if (!name) {
        errorEl.textContent = 'Dataset name is required';
        return;
    }

    // Check if we have detected data
    if (!window.currentDetection || !window.currentDetection.format) {
        errorEl.textContent = 'Please paste data or URL to detect format';
        return;
    }

    const detection = window.currentDetection;
    const { format, source, originalInput } = detection;

    let data;
    let metadata = null;

    if (source === 'url') {
        // For URL, we already fetched the content
        data = originalInput; // Store the URL string

        // Calculate metadata from fetched content
        if (detection.content) {
            try {
                metadata = calculateDatasetStats(
                    detection.parsed || detection.content,
                    format,
                    'inline'
                );
                // Override to use actual content size
                metadata.size = new Blob([detection.content]).size;
            } catch (error) {
                console.warn('Failed to calculate metadata:', error);
            }
        }
    } else {
        // Inline data
        if (format === 'json' || format === 'topojson') {
            if (!detection.parsed) {
                errorEl.textContent = 'Invalid JSON data';
                return;
            }
            if (format === 'json' && Array.isArray(detection.parsed) && detection.parsed.length === 0) {
                errorEl.textContent = 'Data array cannot be empty';
                return;
            }
            data = detection.parsed;
        } else if (format === 'csv' || format === 'tsv') {
            const lines = originalInput.trim().split('\n');
            if (lines.length < 2) {
                errorEl.textContent = `${format.toUpperCase()} must have at least a header row and one data row`;
                return;
            }
            data = originalInput.trim();
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
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    if (confirm(`Delete dataset "${dataset.name}"? This action cannot be undone.`)) {
        await DatasetStorage.deleteDataset(dataset.id);
        document.getElementById('dataset-details').style.display = 'none';
        window.currentDatasetId = null;
        await renderDatasetList();
    }
}

// Copy dataset reference to clipboard
async function copyDatasetReference() {
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    const reference = `"data": {"name": "${dataset.name}"}`;
    await navigator.clipboard.writeText(reference);
    alert('Dataset reference copied to clipboard!');
}

// Refresh metadata for URL dataset
async function refreshDatasetMetadata() {
    const dataset = await getCurrentDataset();
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
