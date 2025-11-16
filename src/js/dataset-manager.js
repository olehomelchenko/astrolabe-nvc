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

// Replace dataset name references in a Vega-Lite spec
function replaceDatasetNameInSpec(spec, oldName, newName) {
    if (!spec || typeof spec !== 'object') return spec;

    // Clone the spec to avoid mutation
    const newSpec = JSON.parse(JSON.stringify(spec));

    // Recursively traverse and replace dataset name references
    (function traverse(obj) {
        if (!obj || typeof obj !== 'object') return;

        // Check if this is a data object with a name property matching oldName
        if (obj.data && typeof obj.data === 'object' && obj.data.name === oldName) {
            obj.data.name = newName;
        }

        // Recursively check all properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                traverse(obj[key]);
            }
        }
    })(newSpec);

    return newSpec;
}

// Calculate dataset statistics
function calculateDatasetStats(data, format, source) {
    let rowCount = 0;
    let columnCount = 0;
    let columns = [];
    let columnTypes = [];
    let size = 0;

    // For URL sources, we can't calculate stats without fetching
    if (source === 'url') {
        return { rowCount: null, columnCount: null, columns: [], columnTypes: [], size: null };
    }

    if (format === 'json' || format === 'topojson') {
        if (!Array.isArray(data) || data.length === 0) {
            return { rowCount: 0, columnCount: 0, columns: [], columnTypes: [], size: 0 };
        }
        rowCount = data.length;
        const firstRow = data[0];
        columns = typeof firstRow === 'object' ? Object.keys(firstRow) : [];
        columnCount = columns.length;

        // Infer column types
        if (columns.length > 0) {
            columnTypes = columns.map(col => {
                const values = data.map(row => row[col]);
                const type = detectColumnType(values);
                return { name: col, type };
            });
        }

        size = new Blob([JSON.stringify(data)]).size;
    } else if (format === 'csv' || format === 'tsv') {
        // For CSV/TSV, data is stored as raw text
        const lines = data.trim().split('\n');
        rowCount = Math.max(0, lines.length - 1); // Subtract header row
        if (lines.length > 0) {
            const separator = format === 'csv' ? ',' : '\t';
            columns = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
            columnCount = columns.length;

            // Infer column types from all rows
            if (columns.length > 0 && lines.length > 1) {
                columnTypes = columns.map((col, colIndex) => {
                    const values = lines.slice(1).map(line => {
                        const cells = line.split(separator);
                        return cells[colIndex] ? cells[colIndex].trim().replace(/^"|"$/g, '') : '';
                    });
                    const type = detectColumnType(values);
                    return { name: col, type };
                });
            }
        }
        size = new Blob([data]).size;
    }

    return { rowCount, columnCount, columns, columnTypes, size };
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

// Count how many snippets use a specific dataset
function countSnippetUsage(datasetName) {
    const snippets = SnippetStorage.loadSnippets();
    return snippets.filter(snippet =>
        snippet.datasetRefs && snippet.datasetRefs.includes(datasetName)
    ).length;
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
        let columnTypes = [];
        let size = contentLength ? parseInt(contentLength) : new Blob([text]).size;

        // Parse based on format
        if (format === 'json') {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                rowCount = data.length;
                if (data.length > 0 && typeof data[0] === 'object') {
                    columns = Object.keys(data[0]);
                    columnCount = columns.length;

                    // Infer column types
                    if (columns.length > 0) {
                        columnTypes = columns.map(col => {
                            const values = data.map(row => row[col]);
                            const type = detectColumnType(values);
                            return { name: col, type };
                        });
                    }
                }
            }
        } else if (format === 'csv' || format === 'tsv') {
            const lines = text.trim().split('\n');
            rowCount = Math.max(0, lines.length - 1); // Subtract header
            if (lines.length > 0) {
                const separator = format === 'csv' ? ',' : '\t';
                columns = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
                columnCount = columns.length;

                // Infer column types from all rows
                if (columns.length > 0 && lines.length > 1) {
                    columnTypes = columns.map((col, colIndex) => {
                        const values = lines.slice(1).map(line => {
                            const cells = line.split(separator);
                            return cells[colIndex] ? cells[colIndex].trim().replace(/^"|"$/g, '') : '';
                        });
                        const type = detectColumnType(values);
                        return { name: col, type };
                    });
                }
            }
        } else if (format === 'topojson') {
            // TopoJSON structure is complex, just note it exists
            rowCount = null;
            columnCount = null;
        }

        return { rowCount, columnCount, columns, columnTypes, size };
    } catch (error) {
        throw new Error(`Failed to fetch URL metadata: ${error.message}`);
    }
}

// Render dataset list in modal
async function renderDatasetList() {
    const datasets = await DatasetStorage.listDatasets();

    if (datasets.length === 0) {
        document.getElementById('dataset-list').innerHTML = '<div class="dataset-empty">No datasets yet. Click "New Dataset" to create one.</div>';
        return;
    }

    // Sort by modified date (most recent first)
    datasets.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // Format individual dataset items
    const formatDatasetItem = (dataset) => {
        let metaText;
        const formatLabel = dataset.format ? dataset.format.toUpperCase() : 'UNKNOWN';

        if (dataset.source === 'url') {
            // Show metadata if available, otherwise just URL and format
            if (dataset.rowCount !== null && dataset.size !== null) {
                metaText = `URL • ${dataset.rowCount} rows • ${formatLabel} • ${formatBytes(dataset.size)}`;
            } else {
                metaText = `URL • ${formatLabel}`;
            }
        } else {
            metaText = `${dataset.rowCount} rows • ${formatLabel} • ${formatBytes(dataset.size)}`;
        }

        // Count snippet usage and create badge
        const usageCount = countSnippetUsage(dataset.name);
        const usageBadge = usageCount > 0
            ? `<div class="dataset-usage-badge" title="${usageCount} snippet${usageCount !== 1 ? 's' : ''} using this dataset">📄 ${usageCount}</div>`
            : '';

        return `
            <div class="dataset-item" data-item-id="${dataset.id}">
                <div class="dataset-info">
                    <div class="dataset-name">${dataset.name}</div>
                    <div class="dataset-meta">${metaText}</div>
                </div>
                ${usageBadge}
            </div>
        `;
    };

    // Use generic list renderer
    renderGenericList('dataset-list', datasets, formatDatasetItem, selectDataset, {
        emptyMessage: 'No datasets yet. Click "New Dataset" to create one.',
        itemSelector: '.dataset-item'
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
    const selectedItem = document.querySelector(`[data-item-id="${datasetId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

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

    // Populate columns list with types
    const columnsSection = document.getElementById('columns-section');
    const columnsList = document.getElementById('dataset-detail-columns-list');

    if (dataset.columnTypes && dataset.columnTypes.length > 0) {
        columnsSection.style.display = 'block';

        const columnsHTML = dataset.columnTypes.map(col => {
            const icon = getTypeIcon(col.type);
            return `
                <div class="column-item">
                    <span class="column-type-icon">${icon}</span>
                    <span class="column-name">${col.name}</span>
                    <span class="column-type">${col.type}</span>
                </div>
            `;
        }).join('');

        columnsList.innerHTML = columnsHTML;
    } else {
        columnsSection.style.display = 'none';
    }

    // Show/hide preview toggle based on data type
    const toggleGroup = document.getElementById('preview-toggle-group');
    const canShowTable = (dataset.format === 'json' || dataset.format === 'csv' || dataset.format === 'tsv');

    if (dataset.source === 'url') {
        // For URL datasets, check if we have cached preview data
        if (window.urlPreviewCache && window.urlPreviewCache[dataset.id]) {
            if (canShowTable) {
                toggleGroup.style.display = 'flex';
            } else {
                toggleGroup.style.display = 'none';
            }
            showRawPreview(dataset);
        } else {
            // Show load preview option
            toggleGroup.style.display = 'none';
            showURLPreviewPrompt(dataset);
        }
    } else {
        // For inline datasets
        if (canShowTable) {
            toggleGroup.style.display = 'flex';
        } else {
            toggleGroup.style.display = 'none';
        }
        showRawPreview(dataset);
    }

    // Store current dataset ID and data
    window.currentDatasetId = datasetId;
    window.currentDatasetData = dataset;

    // Update linked snippets display
    updateLinkedSnippets(dataset);

    // Initialize auto-save for detail fields
    initializeDatasetDetailAutoSave();

    // Update URL state (URLState.update will add 'dataset-' prefix)
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: datasetId });
    }
}

// Show URL preview prompt (button to load data)
function showURLPreviewPrompt(dataset) {
    const previewBox = document.getElementById('dataset-preview');
    const tableContainer = document.getElementById('dataset-preview-table');

    previewBox.style.display = 'block';
    tableContainer.style.display = 'none';

    const promptHTML = `<div style="text-align: center;"><div style="margin-bottom: 8px; font-size: 11px; color: #606060;">URL: ${dataset.data}<br/>Format: ${dataset.format.toUpperCase()}</div><button class="btn btn-standard primary" id="load-preview-btn">Load Preview</button><div style="margin-top: 6px; font-size: 10px; color: #808080; font-style: italic;">Data will be fetched but not saved</div></div>`;

    previewBox.innerHTML = promptHTML;

    // Add click handler
    const loadBtn = document.getElementById('load-preview-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            await loadURLPreview(dataset);
        });
    }
}

// Load and cache URL preview data
async function loadURLPreview(dataset) {
    const previewBox = document.getElementById('dataset-preview');
    previewBox.innerHTML = '<div style="text-align: center; padding: 20px; font-size: 11px;">Loading data from URL...</div>';

    try {
        const response = await fetch(dataset.data);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();

        // Parse data based on format
        let parsedData;
        if (dataset.format === 'json' || dataset.format === 'topojson') {
            parsedData = JSON.parse(text);
        } else if (dataset.format === 'csv' || dataset.format === 'tsv') {
            parsedData = text;
        }

        // Cache the preview data (don't save to DB)
        if (!window.urlPreviewCache) {
            window.urlPreviewCache = {};
        }
        window.urlPreviewCache[dataset.id] = {
            data: parsedData,
            fetchedAt: Date.now()
        };

        // Create a temporary dataset object with the fetched data
        const previewDataset = {
            ...dataset,
            data: parsedData,
            source: 'inline' // Treat as inline for preview purposes
        };

        // Update current dataset data for preview
        window.currentDatasetData = previewDataset;

        // Show toggle buttons now that we have data
        const toggleGroup = document.getElementById('preview-toggle-group');
        const canShowTable = (dataset.format === 'json' || dataset.format === 'csv' || dataset.format === 'tsv');
        if (canShowTable) {
            toggleGroup.style.display = 'flex';
        }

        // Show the preview
        showRawPreview(previewDataset);

    } catch (error) {
        previewBox.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f00; font-size: 11px;">
                <div style="margin-bottom: 8px;">Failed to load URL data:</div>
                <div>${error.message}</div>
                <button class="btn btn-standard" id="retry-preview-btn" style="margin-top: 12px;">Retry</button>
            </div>
        `;

        const retryBtn = document.getElementById('retry-preview-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                await loadURLPreview(dataset);
            });
        }
    }
}

// Show raw preview
function showRawPreview(dataset) {
    const rawBtn = document.getElementById('preview-raw-btn');
    const tableBtn = document.getElementById('preview-table-btn');
    const previewBox = document.getElementById('dataset-preview');
    const tableContainer = document.getElementById('dataset-preview-table');

    // Update button states
    if (rawBtn && tableBtn) {
        rawBtn.classList.add('active');
        tableBtn.classList.remove('active');
    }

    // Show raw, hide table
    previewBox.style.display = 'block';
    tableContainer.style.display = 'none';

    // Generate preview text
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
    previewBox.textContent = previewText;
}

// Detect column type from sample values
function detectColumnType(values) {
    // Filter out null/undefined values
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (validValues.length === 0) return 'text';

    let numberCount = 0;
    let booleanCount = 0;
    let dateCount = 0;

    for (const val of validValues) {
        const str = String(val).trim();

        // Check boolean
        if (str === 'true' || str === 'false' || str === '0' || str === '1' ||
            str === 'True' || str === 'False' || str === 'TRUE' || str === 'FALSE') {
            booleanCount++;
            continue;
        }

        // Check number
        const num = parseFloat(str);
        if (!isNaN(num) && isFinite(num) && str === String(num)) {
            numberCount++;
            continue;
        }

        // Check date (ISO format or common patterns)
        // ISO: 2024-01-15, 2024-01-15T10:30:00, etc.
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
        // Common: 01/15/2024, 15-01-2024, etc.
        const commonDatePattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

        if (isoDatePattern.test(str) || commonDatePattern.test(str)) {
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime())) {
                dateCount++;
                continue;
            }
        }
    }

    const total = validValues.length;
    const threshold = 0.8; // 80% of values must match type

    if (booleanCount / total >= threshold) return 'boolean';
    if (numberCount / total >= threshold) return 'number';
    if (dateCount / total >= threshold) return 'date';
    return 'text';
}

// Get type icon
function getTypeIcon(type) {
    switch (type) {
        case 'number': return '🔢';
        case 'date': return '📅';
        case 'boolean': return '✓';
        case 'text':
        default: return '🔤';
    }
}

// Show table preview
function showTablePreview(dataset) {
    const rawBtn = document.getElementById('preview-raw-btn');
    const tableBtn = document.getElementById('preview-table-btn');
    const previewBox = document.getElementById('dataset-preview');
    const tableContainer = document.getElementById('dataset-preview-table');

    // Update button states
    rawBtn.classList.remove('active');
    tableBtn.classList.add('active');

    // Hide raw, show table
    previewBox.style.display = 'none';
    tableContainer.style.display = 'block';

    // Generate table HTML
    let tableHTML = '';
    const maxRows = 20; // Show first 20 rows

    if (dataset.format === 'json') {
        if (!Array.isArray(dataset.data) || dataset.data.length === 0) {
            tableHTML = '<div class="preview-table-info">Cannot display non-array JSON data in table format</div>';
        } else {
            const rows = dataset.data.slice(0, maxRows);
            const columns = Object.keys(rows[0] || {});

            // Detect column types
            const columnTypes = {};
            columns.forEach(col => {
                const values = dataset.data.map(row => row[col]);
                columnTypes[col] = detectColumnType(values);
            });

            tableHTML = '<table class="preview-table">';
            tableHTML += '<thead><tr>';
            columns.forEach(col => {
                const typeIcon = getTypeIcon(columnTypes[col]);
                tableHTML += `<th><span class="type-icon">${typeIcon}</span> ${col}</th>`;
            });
            tableHTML += '</tr></thead>';
            tableHTML += '<tbody>';
            rows.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach(col => {
                    const value = row[col];
                    const type = columnTypes[col];
                    let displayValue = '';
                    let cssClass = '';

                    if (value === null || value === undefined) {
                        displayValue = '';
                        cssClass = 'cell-null';
                    } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value);
                        cssClass = 'cell-text';
                    } else {
                        displayValue = String(value);
                        cssClass = `cell-${type}`;
                    }

                    tableHTML += `<td class="${cssClass}">${displayValue}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';

            if (dataset.data.length > maxRows) {
                tableHTML += `<div class="preview-table-info">Showing first ${maxRows} of ${dataset.data.length} rows</div>`;
            }
        }
    } else if (dataset.format === 'csv' || dataset.format === 'tsv') {
        const separator = dataset.format === 'csv' ? ',' : '\t';
        const lines = dataset.data.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            tableHTML = '<div class="preview-table-info">No data to display</div>';
        } else {
            const headerLine = lines[0];
            const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
            const dataLines = lines.slice(1, maxRows + 1);
            const allDataLines = lines.slice(1); // All lines for type detection

            // Parse all data for type detection
            const columnData = headers.map(() => []);
            allDataLines.forEach(line => {
                const cells = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                cells.forEach((cell, idx) => {
                    if (columnData[idx]) {
                        columnData[idx].push(cell);
                    }
                });
            });

            // Detect column types
            const columnTypes = columnData.map(colValues => detectColumnType(colValues));

            tableHTML = '<table class="preview-table">';
            tableHTML += '<thead><tr>';
            headers.forEach((header, idx) => {
                const typeIcon = getTypeIcon(columnTypes[idx]);
                tableHTML += `<th><span class="type-icon">${typeIcon}</span> ${header}</th>`;
            });
            tableHTML += '</tr></thead>';
            tableHTML += '<tbody>';
            dataLines.forEach(line => {
                const cells = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                tableHTML += '<tr>';
                cells.forEach((cell, idx) => {
                    const type = columnTypes[idx] || 'text';
                    const cssClass = cell === '' ? 'cell-null' : `cell-${type}`;
                    tableHTML += `<td class="${cssClass}">${cell}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';

            if (lines.length > maxRows + 1) {
                tableHTML += `<div class="preview-table-info">Showing first ${maxRows} of ${lines.length - 1} rows</div>`;
            }
        }
    }

    tableContainer.innerHTML = tableHTML;
}

// Update linked snippets display in dataset details panel
function updateLinkedSnippets(dataset) {
    // Find all snippets that reference this dataset
    const snippets = SnippetStorage.loadSnippets();
    const linkedSnippets = snippets.filter(snippet =>
        snippet.datasetRefs && snippet.datasetRefs.includes(dataset.name)
    );

    updateGenericLinkedItems(
        linkedSnippets,
        'dataset-snippets',
        'dataset-snippets-section',
        (snippet) => `
            <div class="stat-item">
                <span class="stat-label">📄</span>
                <span>
                    <a href="#snippet-${snippet.id}" class="snippet-link" data-linked-item-id="${snippet.id}">${snippet.name}</a>
                </span>
            </div>
        `,
        (snippetId) => {
            openSnippetFromDataset(snippetId);
        }
    );
}

// Close dataset manager and open snippet
function openSnippetFromDataset(snippetId) {
    // Close dataset manager
    closeDatasetManager();

    // Small delay to ensure UI is ready
    setTimeout(() => {
        selectSnippet(parseFloat(snippetId));
    }, 100);
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

    // Track event
    Analytics.track('modal-datasets', 'Open Dataset Manager');
}

// Close dataset manager modal
function closeDatasetManager(updateURL = true) {
    const modal = document.getElementById('dataset-modal');
    modal.style.display = 'none';
    window.currentDatasetId = null;

    // Hide dataset form if it's open (without updating URL to avoid double update)
    const formView = document.getElementById('dataset-form-view');
    if (formView && formView.style.display !== 'none') {
        hideNewDatasetForm(false);
    }

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

    // Calculate metadata for the detected data
    let metadata = null;
    if (detection.source === 'url' && detection.content) {
        metadata = calculateDatasetStats(
            detection.parsed || detection.content,
            detection.format,
            'inline'
        );
    } else if (detection.source === 'inline') {
        metadata = calculateDatasetStats(
            detection.parsed || originalInput,
            detection.format,
            'inline'
        );
    }

    // Show preview with metadata
    let previewText = '';

    if (detection.source === 'url') {
        previewText = `URL: ${originalInput}\n\n`;
        if (metadata && metadata.columns && metadata.columns.length > 0) {
            previewText += `Columns (${metadata.columnCount}): ${metadata.columns.join(', ')}\n`;
            previewText += `Rows: ${metadata.rowCount}\n\n`;
        }
        if (detection.content) {
            const lines = detection.content.split('\n');
            previewText += `Preview (first 10 lines):\n${lines.slice(0, 10).join('\n')}`;
            if (lines.length > 10) {
                previewText += `\n... (${lines.length - 10} more lines)`;
            }
        }
    } else {
        if (metadata && metadata.columns && metadata.columns.length > 0) {
            previewText = `Columns (${metadata.columnCount}): ${metadata.columns.join(', ')}\n`;
            previewText += `Rows: ${metadata.rowCount}\n\n`;
        }
        const lines = originalInput.split('\n');
        previewText += lines.slice(0, 15).join('\n');
        if (lines.length > 15) {
            previewText += `\n... (${lines.length - 15} more lines)`;
        }
    }
    detectedPreviewEl.textContent = previewText;

    // Store detection data for later use
    window.currentDetection = {
        ...detection,
        originalInput,
        metadata
    };
}

// Hide detection confirmation UI
function hideDetectionConfirmation() {
    const confirmEl = document.getElementById('dataset-detection-confirm');
    confirmEl.style.display = 'none';
    window.currentDetection = null;
}

// Setup input handler for dataset form (handles both create and edit)
function setupDatasetInputHandler() {
    const inputEl = document.getElementById('dataset-form-input');

    // Remove existing listener if any
    if (inputEl._datasetInputHandler) {
        inputEl.removeEventListener('input', inputEl._datasetInputHandler);
    }

    // Create new handler
    const handler = async function () {
        const text = this.value.trim();
        if (!text) {
            hideDetectionConfirmation();
            hideSchemaWarning();
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
                    checkSchemaChanges();
                } else {
                    errorEl.textContent = 'Could not detect data format from URL. Please check the URL or try pasting the data directly.';
                    hideDetectionConfirmation();
                    hideSchemaWarning();
                }
            } catch (error) {
                errorEl.textContent = error.message;
                hideDetectionConfirmation();
                hideSchemaWarning();
            }
        } else {
            // Inline data - detect format
            const detection = detectDataFormat(text);

            if (detection.format) {
                showDetectionConfirmation({
                    ...detection,
                    source: 'inline'
                }, text);
                checkSchemaChanges();
            } else {
                errorEl.textContent = 'Could not detect data format. Please ensure your data is valid JSON, CSV, or TSV.';
                hideDetectionConfirmation();
                hideSchemaWarning();
            }
        }
    };

    // Store reference to handler for cleanup
    inputEl._datasetInputHandler = handler;

    // Attach listener
    inputEl.addEventListener('input', handler);
}

// Show new dataset form
function showNewDatasetForm(updateURL = true) {
    // Set mode to create
    window.datasetFormMode = 'create';
    window.editingDatasetId = null;
    window.originalSchema = null;

    document.getElementById('dataset-list-view').style.display = 'none';
    document.getElementById('dataset-form-view').style.display = 'block';
    document.getElementById('dataset-form-name').value = '';
    document.getElementById('dataset-form-input').value = '';
    document.getElementById('dataset-form-comment').value = '';
    document.getElementById('dataset-form-error').textContent = '';

    // Update form header
    document.querySelector('.dataset-form-header').textContent = 'Create New Dataset';

    // Hide schema warning
    hideSchemaWarning();

    // Hide detection confirmation
    hideDetectionConfirmation();

    // Update URL state
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: 'new' });
    }

    // Setup input handler for detection
    setupDatasetInputHandler();
}

// Show edit dataset form
async function showEditDatasetForm(datasetId, updateURL = true) {
    const dataset = await DatasetStorage.getDataset(datasetId);
    if (!dataset) return;

    // Set mode to edit
    window.datasetFormMode = 'edit';
    window.editingDatasetId = datasetId;

    // Store original schema for comparison
    window.originalSchema = dataset.columns ? [...dataset.columns] : [];

    document.getElementById('dataset-list-view').style.display = 'none';
    document.getElementById('dataset-form-view').style.display = 'block';

    // Populate form with current values
    document.getElementById('dataset-form-name').value = dataset.name;
    document.getElementById('dataset-form-comment').value = dataset.comment || '';

    // Populate data input based on source
    let inputValue;
    if (dataset.source === 'url') {
        inputValue = dataset.data; // The URL string
    } else if (dataset.format === 'json' || dataset.format === 'topojson') {
        inputValue = JSON.stringify(dataset.data, null, 2);
    } else if (dataset.format === 'csv' || dataset.format === 'tsv') {
        inputValue = dataset.data;
    }
    document.getElementById('dataset-form-input').value = inputValue;

    // Trigger detection to show current state
    const inputEl = document.getElementById('dataset-form-input');
    // Use setTimeout to ensure the value is set before triggering
    setTimeout(() => {
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);

    document.getElementById('dataset-form-error').textContent = '';

    // Update form header
    document.querySelector('.dataset-form-header').textContent = 'Edit Dataset';

    // Hide schema warning initially
    hideSchemaWarning();

    // Update URL state
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: `edit-${datasetId}` });
    }

    // Setup input handler for detection
    setupDatasetInputHandler();
}

// Hide schema warning
function hideSchemaWarning() {
    const warningEl = document.getElementById('dataset-schema-warning');
    if (warningEl) {
        warningEl.style.display = 'none';
    }
}

// Show schema warning with details
function showSchemaWarning(oldSchema, newSchema) {
    let warningEl = document.getElementById('dataset-schema-warning');

    // Create warning element if it doesn't exist
    if (!warningEl) {
        const confirmEl = document.getElementById('dataset-detection-confirm');
        warningEl = document.createElement('div');
        warningEl.id = 'dataset-schema-warning';
        warningEl.className = 'dataset-schema-warning';
        confirmEl.parentNode.insertBefore(warningEl, confirmEl.nextSibling);
    }

    // Determine what changed
    const added = newSchema.filter(col => !oldSchema.includes(col));
    const removed = oldSchema.filter(col => !newSchema.includes(col));

    let message = '⚠️ Schema Change Detected<br/>';

    if (removed.length > 0) {
        message += `<strong>Removed columns:</strong> ${removed.join(', ')}<br/>`;
    }
    if (added.length > 0) {
        message += `<strong>Added columns:</strong> ${added.join(', ')}<br/>`;
    }

    message += '<em>Saving will update the dataset schema. Linked snippets may be affected.</em>';

    warningEl.innerHTML = message;
    warningEl.style.display = 'block';
}

// Check for schema changes
function checkSchemaChanges() {
    // Only check in edit mode
    if (window.datasetFormMode !== 'edit' || !window.originalSchema) {
        return;
    }

    // Get current detection
    const detection = window.currentDetection;
    if (!detection || !detection.format) {
        hideSchemaWarning();
        return;
    }

    // Extract new schema from detected data
    let newSchema = [];

    if (detection.source === 'url' && detection.content) {
        // Parse content to get schema
        const tempStats = calculateDatasetStats(
            detection.parsed || detection.content,
            detection.format,
            'inline'
        );
        newSchema = tempStats.columns || [];
    } else if (detection.source === 'inline') {
        const tempStats = calculateDatasetStats(
            detection.parsed || detection.originalInput,
            detection.format,
            'inline'
        );
        newSchema = tempStats.columns || [];
    }

    // Compare schemas
    const originalSchema = window.originalSchema || [];

    if (newSchema.length === 0 && originalSchema.length === 0) {
        hideSchemaWarning();
        return;
    }

    // Check if schemas are different
    const schemaChanged =
        originalSchema.length !== newSchema.length ||
        !originalSchema.every(col => newSchema.includes(col)) ||
        !newSchema.every(col => originalSchema.includes(col));

    if (schemaChanged) {
        showSchemaWarning(originalSchema, newSchema);
    } else {
        hideSchemaWarning();
    }
}

// Hide new dataset form
function hideNewDatasetForm(updateURL = true) {
    document.getElementById('dataset-list-view').style.display = 'block';
    document.getElementById('dataset-form-view').style.display = 'none';
    window.datasetFormMode = null;
    window.editingDatasetId = null;
    window.originalSchema = null;
    hideSchemaWarning();

    // Update URL to dataset list view
    if (updateURL) {
        URLState.update({ view: 'datasets', snippetId: null, datasetId: null });
    }
}

// Save new dataset (handles both create and edit modes)
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

    try {
        if (window.datasetFormMode === 'edit') {
            // Edit mode - update existing dataset
            const datasetId = window.editingDatasetId;

            // Check if name already exists (excluding current dataset)
            if (await DatasetStorage.nameExists(name, datasetId)) {
                errorEl.textContent = 'A dataset with this name already exists';
                return;
            }

            // Update dataset
            const updates = {
                name,
                data,
                format,
                source,
                comment
            };

            // Add metadata if available (for URL sources)
            if (metadata) {
                Object.assign(updates, metadata);
            }

            await DatasetStorage.updateDataset(datasetId, updates);

            hideNewDatasetForm();
            await renderDatasetList();
            await selectDataset(datasetId);

            Toast.success('Dataset updated successfully');

            // Refresh visualization if a snippet is open
            if (window.currentSnippetId && typeof renderVisualization === 'function') {
                await renderVisualization();
            }

            // Track event
            Analytics.track('dataset-update', `Update dataset (${source})`);
        } else {
            // Create mode - create new dataset
            // Check if name already exists
            if (await DatasetStorage.nameExists(name)) {
                errorEl.textContent = 'A dataset with this name already exists';
                return;
            }

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
            await selectDataset(dataset.id);

            Toast.success('Dataset created successfully');

            // Refresh visualization if a snippet is open
            if (window.currentSnippetId && typeof renderVisualization === 'function') {
                await renderVisualization();
            }

            // Track event
            Analytics.track('dataset-create', `Create dataset (${source})`);
        }
    } catch (error) {
        errorEl.textContent = `Failed to save dataset: ${error.message}`;
    }
}

// Delete current dataset
async function deleteCurrentDataset() {
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    // Check if dataset is in use
    const usageCount = countSnippetUsage(dataset.name);
    const warningMessage = usageCount > 0
        ? `⚠️ Warning: Dataset "${dataset.name}" is currently used by ${usageCount} snippet${usageCount !== 1 ? 's' : ''}.\n\nDeleting this dataset will break those visualizations.`
        : null;

    confirmGenericDeletion(dataset.name, warningMessage, async () => {
        await DatasetStorage.deleteDataset(dataset.id);
        document.getElementById('dataset-details').style.display = 'none';
        window.currentDatasetId = null;
        await renderDatasetList();

        // Show success message
        Toast.success('Dataset deleted');

        // Track event
        trackEventIfAvailable('dataset-delete', 'Delete dataset');
    });
}

// Copy dataset reference to clipboard
async function copyDatasetReference() {
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    const reference = `"data": {"name": "${dataset.name}"}`;
    await navigator.clipboard.writeText(reference);
    Toast.success('Dataset reference copied to clipboard!');
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

        // Refresh visualization if a snippet is open
        if (window.currentSnippetId && typeof renderVisualization === 'function') {
            await renderVisualization();
        }

        // Brief success indicator
        refreshBtn.textContent = '✓';
        setTimeout(() => {
            refreshBtn.textContent = '🔄';
            refreshBtn.disabled = false;
        }, 1000);
    } catch (error) {
        Toast.error(`Failed to refresh metadata: ${error.message}`);
        refreshBtn.textContent = '🔄';
        refreshBtn.disabled = false;
    }
}

// Create new snippet from current dataset
async function createNewSnippetFromDataset() {
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    // Close dataset manager
    closeDatasetManager();

    // Small delay to ensure UI is ready
    setTimeout(() => {
        // Call the function from snippet-manager.js
        createSnippetFromDataset(dataset.name);
    }, 100);
}

// Export dataset to file
async function exportCurrentDataset() {
    const dataset = await getCurrentDataset();
    if (!dataset) return;

    let dataToExport;
    let filename;
    let mimeType;

    try {
        if (dataset.source === 'url') {
            // For URL datasets, fetch the content and export it
            const response = await fetch(dataset.data);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            dataToExport = content;
        } else {
            // For inline datasets, export the stored data
            if (dataset.format === 'json' || dataset.format === 'topojson') {
                dataToExport = JSON.stringify(dataset.data, null, 2);
            } else if (dataset.format === 'csv' || dataset.format === 'tsv') {
                dataToExport = dataset.data;
            }
        }

        // Determine file extension and MIME type
        switch (dataset.format) {
            case 'json':
                filename = `${dataset.name}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                filename = `${dataset.name}.csv`;
                mimeType = 'text/csv';
                break;
            case 'tsv':
                filename = `${dataset.name}.tsv`;
                mimeType = 'text/tab-separated-values';
                break;
            case 'topojson':
                filename = `${dataset.name}.topojson`;
                mimeType = 'application/json';
                break;
            default:
                filename = `${dataset.name}.txt`;
                mimeType = 'text/plain';
        }

        // Create blob and download
        const blob = new Blob([dataToExport], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        Toast.success(`Dataset "${dataset.name}" exported successfully`);

        // Track event
        Analytics.track('dataset-export', `Export dataset (${dataset.format})`);

    } catch (error) {
        Toast.error(`Failed to export dataset: ${error.message}`);
    }
}

// Detect format from file extension
function detectFormatFromFilename(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.tsv') || lower.endsWith('.tab') || lower.endsWith('.txt')) return 'tsv';
    if (lower.endsWith('.topojson')) return 'topojson';
    return null;
}

// Import dataset from file
async function importDatasetFromFile(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    try {
        // Read file content
        const text = await file.text();

        // Try to detect format from filename first
        let formatHint = detectFormatFromFilename(file.name);

        // Auto-detect format from content
        const detection = detectDataFormat(text);

        // Use filename hint if content detection is uncertain
        let format = detection.format;
        if (!format && formatHint) {
            format = formatHint;
        }

        if (!format) {
            Toast.error('Could not detect data format from file. Please ensure the file contains valid JSON, CSV, or TSV data.');
            return;
        }

        // Generate default name from filename (remove extension)
        let baseName = file.name.replace(/\.(json|csv|tsv|txt|topojson)$/i, '');

        // Check if name already exists and make it unique
        let datasetName = baseName;
        let wasRenamed = false;
        let counter = 1;
        while (await DatasetStorage.nameExists(datasetName)) {
            wasRenamed = true;
            // Add timestamp-based suffix for uniqueness
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
            datasetName = `${baseName}_${timestamp}`;

            // If still exists (unlikely), add a counter
            if (await DatasetStorage.nameExists(datasetName)) {
                datasetName = `${baseName}_${timestamp}_${counter}`;
                counter++;
            } else {
                break;
            }
        }

        // Prepare data based on format
        let data;
        if (format === 'json' || format === 'topojson') {
            if (!detection.parsed) {
                Toast.error('Invalid JSON data in file.');
                return;
            }
            data = detection.parsed;
        } else if (format === 'csv' || format === 'tsv') {
            const lines = text.trim().split('\n');
            if (lines.length < 2) {
                Toast.error(`${format.toUpperCase()} file must have at least a header row and one data row.`);
                return;
            }
            data = text.trim();
        }

        // Create dataset
        await DatasetStorage.createDataset(
            datasetName,
            data,
            format,
            'inline',
            `Imported from file: ${file.name}`
        );

        // Refresh the list
        await renderDatasetList();

        // Show success message with rename notification if applicable
        if (wasRenamed) {
            Toast.warning(`Dataset name "${baseName}" was already taken, so your dataset was automatically renamed to "${datasetName}".`);
        } else {
            Toast.success(`Dataset "${datasetName}" imported successfully!`);
        }

        // Track event
        Analytics.track('dataset-import', `Import dataset (${format})`);

    } catch (error) {
        Toast.error(`Failed to import dataset: ${error.message}`);
    } finally {
        // Reset file input
        fileInput.value = '';
    }
}

// Auto-save dataset metadata (name and comment)
async function autoSaveDatasetMeta() {
    const nameField = document.getElementById('dataset-detail-name');
    const commentField = document.getElementById('dataset-detail-comment');
    if (!nameField || !commentField) return;

    const dataset = await getCurrentDataset();
    if (!dataset) return;

    const newName = nameField.value.trim();
    const newComment = commentField.value;

    // Store old name for snippet reference updates
    const oldName = dataset.name;
    const nameChanged = newName !== dataset.name;

    // Check if name has changed
    if (nameChanged) {
        // Validate name is not empty
        if (!newName) {
            Toast.error('Dataset name cannot be empty');
            nameField.value = dataset.name; // Restore previous value
            return;
        }

        // Check if new name already exists
        if (await DatasetStorage.nameExists(newName)) {
            Toast.error(`Dataset name "${newName}" already exists`);
            nameField.value = dataset.name; // Restore previous value
            return;
        }

        // Check if any snippets reference this dataset
        const snippets = SnippetStorage.loadSnippets();
        const affectedSnippets = snippets.filter(snippet =>
            snippet.datasetRefs && snippet.datasetRefs.includes(dataset.name)
        );

        // Show warning if there are affected snippets
        if (affectedSnippets.length > 0) {
            const confirmed = confirm(
                `⚠️ Warning: Renaming this dataset will update ${affectedSnippets.length} snippet${affectedSnippets.length > 1 ? 's' : ''} that reference it.\n\n` +
                `We'll attempt to update all references automatically, but complex specs with nested data sources may require manual review.\n\n` +
                `Affected snippets:\n${affectedSnippets.map(s => `• ${s.name}`).join('\n')}\n\n` +
                `Continue with rename?`
            );

            if (!confirmed) {
                nameField.value = dataset.name; // Restore previous value
                return;
            }
        }
    }

    // Update dataset
    const updatedDataset = await DatasetStorage.updateDataset(dataset.id, {
        name: newName || dataset.name,
        comment: newComment
    });

    // If name changed, update all snippets that reference this dataset
    if (nameChanged && newName) {
        const snippets = SnippetStorage.loadSnippets();
        const affectedSnippets = snippets.filter(snippet =>
            snippet.datasetRefs && snippet.datasetRefs.includes(oldName)
        );

        affectedSnippets.forEach(snippet => {
            // Update spec and draftSpec by replacing dataset name references
            snippet.spec = replaceDatasetNameInSpec(snippet.spec, oldName, newName);
            snippet.draftSpec = replaceDatasetNameInSpec(snippet.draftSpec, oldName, newName);

            // Re-extract dataset references from updated specs
            // extractDatasetRefs is a global function from snippet-manager.js
            if (typeof extractDatasetRefs === 'function') {
                snippet.datasetRefs = extractDatasetRefs(snippet.spec);
            }

            SnippetStorage.saveSnippet(snippet);
        });

        // Show success message
        if (affectedSnippets.length > 0) {
            Toast.success(`Updated ${affectedSnippets.length} snippet${affectedSnippets.length > 1 ? 's' : ''}`);
        }

        // Refresh linked snippets display
        updateLinkedSnippets(updatedDataset);
    }

    // Update the modified timestamp in the UI
    document.getElementById('dataset-detail-modified').textContent = new Date(updatedDataset.modified).toLocaleString();

    // Update the dataset list display to reflect the new name
    await renderDatasetList();

    // Restore selection after re-render
    const selectedItem = document.querySelector(`[data-item-id="${dataset.id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Refresh visualization if a snippet is open
    if (window.currentSnippetId && typeof renderVisualization === 'function') {
        await renderVisualization();
    }
}

// Debounced auto-save for dataset metadata
let datasetMetaAutoSaveTimeout;
function debouncedAutoSaveDatasetMeta() {
    clearTimeout(datasetMetaAutoSaveTimeout);
    datasetMetaAutoSaveTimeout = setTimeout(autoSaveDatasetMeta, 1000);
}

// Initialize auto-save for dataset detail fields
function initializeDatasetDetailAutoSave() {
    const nameField = document.getElementById('dataset-detail-name');
    const commentField = document.getElementById('dataset-detail-comment');

    if (nameField) {
        // Remove any existing event listener to prevent duplicates
        nameField.removeEventListener('input', debouncedAutoSaveDatasetMeta);
        nameField.addEventListener('input', debouncedAutoSaveDatasetMeta);
    }

    if (commentField) {
        // Remove any existing event listener to prevent duplicates
        commentField.removeEventListener('input', debouncedAutoSaveDatasetMeta);
        commentField.addEventListener('input', debouncedAutoSaveDatasetMeta);
    }
}
