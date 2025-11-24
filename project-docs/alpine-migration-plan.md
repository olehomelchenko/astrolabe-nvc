# Alpine.js Migration Plan

## Overview

Incremental migration of Astrolabe from vanilla JavaScript to Alpine.js for reactive UI management. Each phase is independently deployable and leaves the project fully functional.

## Guiding Principles

1. **Each step is independently deployable** - Project always works
2. **No big-bang rewrites** - Small, focused changes
3. **Test after each step** - Catch issues early
4. **Alpine + Vanilla coexist** - No forced conversions
5. **SnippetStorage/DatasetStorage remain authoritative** - Alpine is view layer only

## Architecture Philosophy

```
┌─────────────────────┐
│   Alpine.js (7KB)   │  ← Reactivity + UI bindings
└──────────┬──────────┘
           │ calls
           ▼
┌─────────────────────┐
│  Storage Layer      │  ← All business logic
│  - SnippetStorage   │    (filtering, sorting, CRUD)
│  - DatasetStorage   │
└─────────────────────┘
```

**Clean separation:**
- **Alpine**: Handles reactivity, DOM updates, user interactions
- **Storage**: Single source of truth for data logic

---

## Phase 1: Snippet Panel ✅ COMPLETE

**Status**: Done
**Effort**: 3 hours
**Lines saved**: ~80 lines
**Files**: `index.html`, `src/js/snippet-manager.js`, `src/js/app.js`

### What Was Converted

- Snippet list rendering with `x-for`
- Search with `x-model` (reactive filtering)
- Sort controls with `@click` and `:class`
- Selection highlighting with `:class`
- Ghost card (+ Create New Snippet)

### What Stayed Vanilla

- SnippetStorage (localStorage operations)
- Editor integration
- Meta fields (name, comment) - for now
- All CRUD business logic

### Key Learnings

- Alpine store keeps minimal UI state (`currentSnippetId`)
- Storage layer does all filtering/sorting
- Alpine component is thin wrapper (~60 lines)
- Automatic reactivity eliminates manual DOM updates

---

## Phase 2: Dataset Manager Modal

**Status**: Planned
**Effort**: 2-3 hours
**Risk**: Low (modal is self-contained)
**Lines to save**: ~100 lines
**Files**: `src/js/dataset-manager.js`, `index.html`

### What to Convert

**Target sections**:
1. Dataset list rendering
2. Search/filter controls
3. Sort controls (name, created, modified, size)
4. Selection highlighting

### Implementation Steps

#### Step 2.1: Add Alpine store for dataset selection

```javascript
// In dataset-manager.js, top of file
document.addEventListener('alpine:init', () => {
    Alpine.store('datasets', {
        currentDatasetId: null
    });
});
```

#### Step 2.2: Create Alpine component

```javascript
function datasetList() {
    return {
        searchQuery: '',
        sortBy: AppSettings.get('datasetSortBy') || 'modified',
        sortOrder: AppSettings.get('datasetSortOrder') || 'desc',

        get filteredDatasets() {
            return DatasetStorage.listDatasets(
                this.sortBy,
                this.sortOrder,
                this.searchQuery
            );
        },

        toggleSort(sortType) {
            if (this.sortBy === sortType) {
                this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            } else {
                this.sortBy = sortType;
                this.sortOrder = 'desc';
            }
            AppSettings.set('datasetSortBy', this.sortBy);
            AppSettings.set('datasetSortOrder', this.sortOrder);
        },

        clearSearch() {
            this.searchQuery = '';
            const searchInput = document.getElementById('dataset-search');
            if (searchInput) searchInput.focus();
        },

        formatDate(dataset) {
            const date = this.sortBy === 'created' ? dataset.created : dataset.modified;
            return formatDatasetDate(date);
        },

        getSize(dataset) {
            return formatDatasetSize(dataset.size);
        },

        selectDataset(datasetId) {
            window.selectDataset(datasetId);
        },

        createNewDataset() {
            window.openDatasetImport();
        }
    };
}
```

#### Step 2.3: Convert dataset list HTML

Find the dataset list section in the modal and convert to Alpine:

```html
<div class="dataset-modal-content" x-data="datasetList()">
    <!-- Sort controls -->
    <div class="sort-controls">
        <span class="sort-label">Sort by:</span>
        <button class="sort-btn"
                :class="{ 'active': sortBy === 'modified' }"
                @click="toggleSort('modified')">
            <span class="sort-text">Modified</span>
            <span class="sort-arrow" x-text="sortBy === 'modified' && sortOrder === 'desc' ? '⬇' : '⬆'">⬇</span>
        </button>
        <!-- ... similar for other sort buttons -->
    </div>

    <!-- Search controls -->
    <div class="search-controls">
        <input type="text"
               id="dataset-search"
               x-model="searchQuery"
               placeholder="Search datasets..." />
        <button class="btn btn-icon"
                @click="clearSearch()">×</button>
    </div>

    <!-- Dataset list -->
    <ul class="dataset-list" id="dataset-list">
        <!-- Ghost card -->
        <li class="dataset-item ghost-card"
            @click="createNewDataset()">
            <div class="dataset-name">+ Import Dataset</div>
            <div class="dataset-date">Click to import</div>
        </li>

        <!-- Dataset items -->
        <template x-for="dataset in filteredDatasets" :key="dataset.id">
            <li class="dataset-item"
                :data-item-id="dataset.id"
                :class="{ 'selected': $store.datasets.currentDatasetId === dataset.id }"
                @click="selectDataset(dataset.id)">
                <div class="dataset-info">
                    <div class="dataset-name" x-text="dataset.name"></div>
                    <div class="dataset-date" x-text="formatDate(dataset)"></div>
                </div>
                <span class="dataset-size" x-text="getSize(dataset)"></span>
            </li>
        </template>
    </ul>

    <div class="placeholder"
         x-show="filteredDatasets.length === 0"
         x-text="searchQuery.trim() ? 'No datasets match your search' : 'No datasets found'">
        No datasets found
    </div>
</div>
```

#### Step 2.4: Update helper functions

Convert these to no-ops:

```javascript
function renderDatasetList(searchQuery = null) {
    // Alpine.js handles rendering automatically
}

function initializeDatasetSortControls() {
    // Alpine.js handles this
}

function initializeDatasetSearchControls() {
    // Alpine.js handles this
}
```

Update `selectDataset()`:

```javascript
function selectDataset(datasetId) {
    const dataset = await DatasetStorage.getDataset(datasetId);
    if (!dataset) return;

    // Update Alpine store selection
    if (typeof Alpine !== 'undefined' && Alpine.store('datasets')) {
        Alpine.store('datasets').currentDatasetId = datasetId;
    }

    // ... rest of function stays the same
}
```

### What Stays Vanilla

- DatasetStorage (IndexedDB operations)
- Preview table rendering
- Import/export logic
- Data type detection
- Format conversion

### Validation Checklist

- [ ] Open dataset modal - list displays
- [ ] Search filters datasets instantly
- [ ] All 4 sort methods work (name, created, modified, size)
- [ ] Sort direction toggles (⬇ ⬆)
- [ ] Select dataset - highlights correctly
- [ ] Import dataset - list updates
- [ ] Delete dataset - list updates
- [ ] Preview table renders correctly
- [ ] Export functionality works
- [ ] No console errors

---

## Phase 3: View Mode Toggle (Draft/Published)

**Status**: Planned
**Effort**: 30 minutes
**Risk**: Very low (small isolated feature)
**Lines to save**: ~20 lines
**Files**: `index.html`, `src/js/snippet-manager.js`

### What to Convert

Current implementation uses manual class toggling. Replace with Alpine reactivity.

### Implementation Steps

#### Step 3.1: Add viewMode to Alpine store

```javascript
// In snippet-manager.js, update Alpine store
Alpine.store('snippets', {
    currentSnippetId: null,
    viewMode: 'draft'  // Add this
});
```

#### Step 3.2: Convert HTML buttons

Find the view mode toggle buttons and add Alpine directives:

```html
<div class="view-mode-selector">
    <button class="view-mode-btn"
            :class="{ 'active': $store.snippets.viewMode === 'draft' }"
            @click="$store.snippets.viewMode = 'draft'; loadCurrentSnippet()">
        <span class="status-indicator draft"></span>
        Draft
    </button>
    <button class="view-mode-btn"
            :class="{ 'active': $store.snippets.viewMode === 'published' }"
            @click="$store.snippets.viewMode = 'published'; loadCurrentSnippet()">
        <span class="status-indicator published"></span>
        Published
    </button>
</div>
```

#### Step 3.3: Update editor loading logic

```javascript
function loadSnippetIntoEditor(snippet) {
    if (!editor || !snippet) return;

    window.isUpdatingEditor = true;

    // Get spec based on view mode from Alpine store
    const viewMode = (typeof Alpine !== 'undefined' && Alpine.store('snippets'))
        ? Alpine.store('snippets').viewMode
        : 'draft';

    const spec = viewMode === 'published' ? snippet.spec : snippet.draftSpec;

    // ... rest stays the same
}
```

#### Step 3.4: Remove manual toggle code

Find and simplify `updateViewModeUI()` function - no more manual classList manipulation needed.

### Validation Checklist

- [ ] Click "Draft" button - editor shows draft spec
- [ ] Click "Published" button - editor shows published spec
- [ ] Active button highlighted correctly
- [ ] Switching snippets maintains current view mode
- [ ] Publish/discard actions work correctly

---

## Phase 4: Settings Modal

**Status**: Planned
**Effort**: 1-2 hours
**Risk**: Low (self-contained modal)
**Lines to save**: ~50 lines
**Files**: `src/js/app.js`, `index.html`

### What to Convert

Settings form with multiple inputs, apply/reset functionality.

### Implementation Steps

#### Step 4.1: Create Alpine component

```javascript
function settingsPanel() {
    return {
        settings: {},
        originalSettings: {},

        init() {
            this.loadSettings();
        },

        loadSettings() {
            this.settings = { ...AppSettings.getAll() };
            this.originalSettings = { ...this.settings };
        },

        get isDirty() {
            return JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
        },

        applySettings() {
            // Update theme
            document.documentElement.setAttribute('data-theme', this.settings.ui.theme);

            // Update editor settings
            if (editor) {
                editor.updateOptions({
                    fontSize: this.settings.editor.fontSize,
                    theme: this.settings.editor.theme,
                    minimap: { enabled: this.settings.editor.minimap },
                    wordWrap: this.settings.editor.wordWrap,
                    lineNumbers: this.settings.editor.lineNumbers,
                    tabSize: this.settings.editor.tabSize
                });
            }

            // Save to localStorage
            AppSettings.setMultiple(this.settings);

            this.originalSettings = { ...this.settings };

            // Re-render snippet list to reflect date format changes
            renderSnippetList();

            // Update metadata display if snippet selected
            const currentSnippet = getCurrentSnippet();
            if (currentSnippet) {
                selectSnippet(currentSnippet.id, false);
            }

            Toast.success('Settings saved');
        },

        resetSettings() {
            this.settings = { ...AppSettings.defaults };
        },

        cancelSettings() {
            this.loadSettings();
            closeSettings();
        }
    };
}
```

#### Step 4.2: Convert settings form HTML

Use `x-model` for all form inputs:

```html
<div class="modal-content" x-data="settingsPanel()">
    <!-- Theme -->
    <select x-model="settings.ui.theme">
        <option value="light">Light</option>
        <option value="dark">Dark Experimental</option>
    </select>

    <!-- Editor Font Size -->
    <input type="number"
           x-model.number="settings.editor.fontSize"
           min="8" max="32" />

    <!-- Editor Theme -->
    <select x-model="settings.editor.theme">
        <option value="vs-light">Light</option>
        <option value="vs-dark">Dark</option>
    </select>

    <!-- Minimap -->
    <input type="checkbox" x-model="settings.editor.minimap" />

    <!-- Date Format -->
    <select x-model="settings.ui.dateFormat">
        <option value="relative">Relative (2 hours ago)</option>
        <option value="locale">Locale (browser default)</option>
        <option value="iso">ISO 8601</option>
        <option value="custom">Custom</option>
    </select>

    <!-- Custom Date Format (conditional) -->
    <div x-show="settings.ui.dateFormat === 'custom'">
        <input type="text" x-model="settings.ui.customDateFormat" />
    </div>

    <!-- Actions -->
    <button @click="applySettings()"
            :disabled="!isDirty"
            class="btn btn-modal primary">
        Apply
    </button>
    <button @click="resetSettings()" class="btn btn-modal">
        Reset to Defaults
    </button>
    <button @click="cancelSettings()" class="btn btn-modal">
        Cancel
    </button>
</div>
```

#### Step 4.3: Simplify settings initialization

Remove manual event listener registration in app.js - Alpine handles it all.

### Validation Checklist

- [ ] Settings modal opens with current values
- [ ] All form inputs work (dropdowns, checkboxes, numbers)
- [ ] Apply button disabled when no changes
- [ ] Apply button enabled when settings change
- [ ] Apply saves and applies settings immediately
- [ ] Theme changes take effect
- [ ] Editor settings apply to Monaco
- [ ] Reset to Defaults works
- [ ] Cancel discards changes
- [ ] Custom date format field shows/hides correctly

---

## Phase 5: Chart Builder Modal

**Status**: Planned
**Effort**: 2-3 hours
**Risk**: Medium (more complex state)
**Lines to save**: ~80 lines
**Files**: `src/js/chart-builder.js`, `index.html`

### What to Convert

Chart builder form with dataset selection, chart type, and field mappings.

### Implementation Steps

#### Step 5.1: Create Alpine component

```javascript
function chartBuilder() {
    return {
        chartType: 'bar',
        datasetId: null,
        dataset: null,
        encoding: {
            x: null,
            y: null,
            color: null,
            size: null
        },

        async init() {
            // Load datasets
            const datasets = await DatasetStorage.getAllDatasets();
            this.datasets = datasets;
        },

        get availableDatasets() {
            return this.datasets || [];
        },

        get availableFields() {
            if (!this.dataset) return [];
            return Object.keys(this.dataset.preview || {});
        },

        async selectDataset(datasetId) {
            this.datasetId = datasetId;
            this.dataset = await DatasetStorage.getDataset(datasetId);
            // Reset encodings when dataset changes
            this.encoding = { x: null, y: null, color: null, size: null };
        },

        get specPreview() {
            if (!this.datasetId) return null;

            const spec = {
                $schema: "https://vega.github.io/schema/vega-lite/v5.json",
                data: { name: this.dataset.name },
                mark: this.chartType,
                encoding: {}
            };

            if (this.encoding.x) spec.encoding.x = { field: this.encoding.x, type: "quantitative" };
            if (this.encoding.y) spec.encoding.y = { field: this.encoding.y, type: "quantitative" };
            if (this.encoding.color) spec.encoding.color = { field: this.encoding.color, type: "nominal" };
            if (this.encoding.size) spec.encoding.size = { field: this.encoding.size, type: "quantitative" };

            return JSON.stringify(spec, null, 2);
        },

        get canInsert() {
            return this.datasetId && this.encoding.x && this.encoding.y;
        },

        insertChart() {
            if (!this.canInsert) return;

            // Insert spec into editor
            if (editor) {
                window.isUpdatingEditor = true;
                editor.setValue(this.specPreview);
                window.isUpdatingEditor = false;

                autoSaveDraft();
                renderPreview();
            }

            closeChartBuilder();
            Toast.success('Chart inserted into editor');
        }
    };
}
```

#### Step 5.2: Convert chart builder HTML

```html
<div class="modal-content" x-data="chartBuilder()">
    <!-- Dataset Selection -->
    <div class="form-group">
        <label>Dataset</label>
        <select x-model="datasetId" @change="selectDataset($event.target.value)">
            <option value="">Select a dataset...</option>
            <template x-for="ds in availableDatasets" :key="ds.id">
                <option :value="ds.id" x-text="ds.name"></option>
            </template>
        </select>
    </div>

    <!-- Chart Type -->
    <div class="form-group">
        <label>Chart Type</label>
        <select x-model="chartType">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="point">Scatter</option>
            <option value="area">Area</option>
        </select>
    </div>

    <!-- Field Mappings -->
    <div class="form-group" x-show="datasetId">
        <label>X-axis</label>
        <select x-model="encoding.x">
            <option value="">Select field...</option>
            <template x-for="field in availableFields" :key="field">
                <option :value="field" x-text="field"></option>
            </template>
        </select>
    </div>

    <div class="form-group" x-show="datasetId">
        <label>Y-axis</label>
        <select x-model="encoding.y">
            <option value="">Select field...</option>
            <template x-for="field in availableFields" :key="field">
                <option :value="field" x-text="field"></option>
            </template>
        </select>
    </div>

    <div class="form-group" x-show="datasetId">
        <label>Color (optional)</label>
        <select x-model="encoding.color">
            <option value="">None</option>
            <template x-for="field in availableFields" :key="field">
                <option :value="field" x-text="field"></option>
            </template>
        </select>
    </div>

    <!-- Preview -->
    <div class="chart-preview" x-show="specPreview">
        <pre x-text="specPreview"></pre>
    </div>

    <!-- Actions -->
    <button @click="insertChart()"
            :disabled="!canInsert"
            class="btn btn-modal primary">
        Insert Chart
    </button>
    <button @click="closeChartBuilder()" class="btn btn-modal">
        Cancel
    </button>
</div>
```

### What Stays Vanilla

- Dataset field detection
- Type inference logic
- Spec generation utilities (if complex)

### Validation Checklist

- [ ] Chart builder modal opens
- [ ] Dataset dropdown populates
- [ ] Select dataset - field dropdowns populate
- [ ] Change chart type - preview updates
- [ ] Select X/Y fields - preview updates
- [ ] Optional fields (color, size) work
- [ ] Insert button disabled when invalid
- [ ] Insert button enabled when valid
- [ ] Insert adds spec to editor
- [ ] Cancel closes modal

---

## Phase 6: Meta Fields (Name, Comment)

**Status**: Planned
**Effort**: 1 hour
**Risk**: Low
**Lines to save**: ~30 lines
**Files**: `index.html`, `src/js/snippet-manager.js`

### What to Convert

Name and comment fields with auto-save functionality.

### Implementation Steps

#### Step 6.1: Add to snippetList component

```javascript
function snippetList() {
    return {
        // ... existing properties

        snippetName: '',
        snippetComment: '',

        loadMetadata(snippet) {
            this.snippetName = snippet.name || '';
            this.snippetComment = snippet.comment || '';
        },

        saveMetadata() {
            const snippet = getCurrentSnippet();
            if (!snippet) return;

            snippet.name = this.snippetName;
            snippet.comment = this.snippetComment;

            SnippetStorage.saveSnippet(snippet);
            renderSnippetList(); // Refresh list to show new name
        }
    };
}
```

#### Step 6.2: Convert HTML inputs

```html
<div class="snippet-meta" x-show="$store.snippets.currentSnippetId">
    <div class="meta-header">Name</div>
    <input type="text"
           x-model="snippetName"
           @input.debounce.500ms="saveMetadata()"
           class="input small"
           placeholder="Snippet name..." />

    <div class="meta-header">Comment</div>
    <textarea x-model="snippetComment"
              @input.debounce.500ms="saveMetadata()"
              class="input textarea medium"
              placeholder="Add a comment..."
              rows="3"></textarea>
</div>
```

#### Step 6.3: Update selectSnippet function

Call `loadMetadata()` when snippet selected:

```javascript
function selectSnippet(snippetId, updateURL = true) {
    // ... existing code

    // Load metadata into Alpine component
    if (typeof Alpine !== 'undefined') {
        const component = Alpine.$data(document.querySelector('[x-data*="snippetList"]'));
        if (component) {
            component.loadMetadata(snippet);
        }
    }
}
```

### Validation Checklist

- [ ] Select snippet - name and comment populate
- [ ] Edit name - auto-saves after 500ms
- [ ] Edit comment - auto-saves after 500ms
- [ ] Name changes reflect in snippet list
- [ ] Switching snippets loads correct metadata

---

## Phase 7: Panel Visibility Toggles

**Status**: Planned
**Effort**: 30 minutes
**Risk**: Very low
**Lines to save**: ~20 lines
**Files**: `index.html`, `src/js/panel-manager.js`

### What to Convert

Toggle buttons for showing/hiding panels.

### Implementation Steps

#### Step 7.1: Create Alpine store for UI state

```javascript
// In panel-manager.js or app.js
document.addEventListener('alpine:init', () => {
    Alpine.store('ui', {
        snippetPanelVisible: true,
        editorPanelVisible: true,
        previewPanelVisible: true
    });
});
```

#### Step 7.2: Convert toggle buttons

```html
<div class="toggle-strip">
    <button class="btn btn-icon xlarge"
            :class="{ 'active': $store.ui.snippetPanelVisible }"
            @click="$store.ui.snippetPanelVisible = !$store.ui.snippetPanelVisible">
        📄
    </button>
    <button class="btn btn-icon xlarge"
            :class="{ 'active': $store.ui.editorPanelVisible }"
            @click="$store.ui.editorPanelVisible = !$store.ui.editorPanelVisible">
        ✏️
    </button>
    <button class="btn btn-icon xlarge"
            :class="{ 'active': $store.ui.previewPanelVisible }"
            @click="$store.ui.previewPanelVisible = !$store.ui.previewPanelVisible">
        👁️
    </button>
</div>
```

#### Step 7.3: Update panel visibility

```html
<div class="panel snippet-panel"
     x-show="$store.ui.snippetPanelVisible"
     x-transition>
    <!-- ... -->
</div>

<div class="panel editor-panel"
     x-show="$store.ui.editorPanelVisible"
     x-transition>
    <!-- ... -->
</div>

<div class="panel preview-panel"
     x-show="$store.ui.previewPanelVisible"
     x-transition>
    <!-- ... -->
</div>
```

#### Step 7.4: Persist state

```javascript
// Add watchers in Alpine.init
Alpine.effect(() => {
    const ui = Alpine.store('ui');
    localStorage.setItem('ui-panel-visibility', JSON.stringify({
        snippetPanel: ui.snippetPanelVisible,
        editorPanel: ui.editorPanelVisible,
        previewPanel: ui.previewPanelVisible
    }));
});

// Load on init
const saved = localStorage.getItem('ui-panel-visibility');
if (saved) {
    const { snippetPanel, editorPanel, previewPanel } = JSON.parse(saved);
    Alpine.store('ui').snippetPanelVisible = snippetPanel;
    Alpine.store('ui').editorPanelVisible = editorPanel;
    Alpine.store('ui').previewPanelVisible = previewPanel;
}
```

### Validation Checklist

- [ ] Toggle buttons show active state
- [ ] Click toggles show/hide panel
- [ ] Transitions are smooth
- [ ] State persists on page refresh
- [ ] Keyboard shortcuts still work
- [ ] Resizing works with hidden panels

---

## Phase 8: Toast Notifications (Optional)

**Status**: Planned
**Effort**: 1-2 hours
**Risk**: Low
**Lines to save**: ~40 lines
**Files**: `src/js/config.js`, `index.html`

### What to Convert

Toast notification system with auto-dismiss.

### Implementation Steps

#### Step 8.1: Create Alpine store

```javascript
// In config.js
document.addEventListener('alpine:init', () => {
    Alpine.store('toasts', {
        items: [],
        nextId: 1,

        show(message, type = 'info', duration = 3000) {
            const id = this.nextId++;
            this.items.push({ id, message, type });

            if (duration > 0) {
                setTimeout(() => this.dismiss(id), duration);
            }
        },

        dismiss(id) {
            this.items = this.items.filter(t => t.id !== id);
        },

        success(message, duration = 3000) {
            this.show(message, 'success', duration);
        },

        error(message, duration = 5000) {
            this.show(message, 'error', duration);
        },

        info(message, duration = 3000) {
            this.show(message, 'info', duration);
        },

        warning(message, duration = 4000) {
            this.show(message, 'warning', duration);
        }
    });
});

// Update Toast utility to use Alpine store
const Toast = {
    success: (msg, duration) => Alpine.store('toasts').success(msg, duration),
    error: (msg, duration) => Alpine.store('toasts').error(msg, duration),
    info: (msg, duration) => Alpine.store('toasts').info(msg, duration),
    warning: (msg, duration) => Alpine.store('toasts').warning(msg, duration)
};
```

#### Step 8.2: Convert HTML

```html
<div id="toast-container">
    <template x-for="toast in $store.toasts.items" :key="toast.id">
        <div class="toast"
             :class="`toast-${toast.type}`"
             x-transition:enter="toast-enter"
             x-transition:enter-start="toast-enter-start"
             x-transition:enter-end="toast-enter-end"
             x-transition:leave="toast-leave"
             x-transition:leave-start="toast-leave-start"
             x-transition:leave-end="toast-leave-end"
             @click="$store.toasts.dismiss(toast.id)">
            <span x-text="toast.message"></span>
        </div>
    </template>
</div>
```

#### Step 8.3: Add transition CSS

```css
.toast-enter {
    transition: all 0.3s ease-out;
}
.toast-enter-start {
    opacity: 0;
    transform: translateY(-1rem);
}
.toast-enter-end {
    opacity: 1;
    transform: translateY(0);
}
.toast-leave {
    transition: all 0.2s ease-in;
}
.toast-leave-start {
    opacity: 1;
    transform: translateY(0);
}
.toast-leave-end {
    opacity: 0;
    transform: translateY(-1rem);
}
```

### Validation Checklist

- [ ] Success toast appears and auto-dismisses
- [ ] Error toast appears and auto-dismisses
- [ ] Multiple toasts stack correctly
- [ ] Click to dismiss works
- [ ] Animations are smooth
- [ ] No memory leaks from timers

---

## Migration Timeline Estimate

| Phase | Effort | Cumulative Lines Saved | Risk Level |
|-------|--------|------------------------|------------|
| 1. Snippet Panel ✅ | 3h | -80 | Low |
| 2. Dataset Manager | 3h | -180 | Low |
| 3. View Mode Toggle | 0.5h | -200 | Very Low |
| 4. Settings Modal | 2h | -250 | Low |
| 5. Chart Builder | 3h | -330 | Medium |
| 6. Meta Fields | 1h | -360 | Low |
| 7. Panel Toggles | 0.5h | -380 | Very Low |
| 8. Toast Notifications | 2h | -420 | Low |
| **Total** | **~15 hours** | **~420 lines** | |

---

## Testing Checklist Template

Use this after completing each phase:

### Core Functionality
- [ ] Page loads without errors
- [ ] All existing features work
- [ ] No console errors
- [ ] Performance is good (no lag)

### Converted Feature
- [ ] Reactivity works (search, sort, filters)
- [ ] User interactions respond correctly
- [ ] State persists correctly
- [ ] Edge cases handled (empty states, errors)
- [ ] Animations/transitions smooth

### Regression Testing
- [ ] Other features still work
- [ ] Import/export still functional
- [ ] Keyboard shortcuts still work
- [ ] Browser refresh preserves state
- [ ] Multiple tabs/windows work correctly

### Browser Compatibility
- [ ] Chrome/Edge works
- [ ] Firefox works
- [ ] Safari works (if available)

---

## Emergency Rollback Plan

If a phase causes issues:

### Option 1: Quick Fix
1. Comment out Alpine directives in HTML
2. Uncomment vanilla JavaScript code
3. Test that functionality is restored

### Option 2: Git Revert
Each phase should be a separate commit:
```bash
git log --oneline  # Find the commit
git revert <commit-hash>
```

### Option 3: Hybrid Mode
Alpine and vanilla can coexist:
- Keep working Alpine sections
- Revert problematic sections to vanilla
- Fix issues in separate branch
- Merge when stable

---

## Recommended Order

Based on risk/reward analysis:

1. ✅ **Phase 1: Snippet Panel** - DONE
2. **Phase 2: Dataset Manager** - Similar complexity, good practice
3. **Phase 3: View Mode Toggle** - Quick win, validates pattern
4. **Phase 4: Settings Modal** - Another modal, builds confidence
5. **Phase 6: Meta Fields** - Before Chart Builder (simpler)
6. **Phase 7: Panel Toggles** - Quick win
7. **Phase 5: Chart Builder** - More complex, save for when confident
8. **Phase 8: Toast Notifications** - Optional polish

---

## Post-Migration Considerations

After all phases complete:

### Code Cleanup
- Remove all no-op functions
- Remove unused vanilla event listeners
- Clean up global state variables
- Update JSDoc comments

### Documentation Updates
- Update architecture.md
- Document Alpine components
- Add Alpine.js to dependencies list
- Update CLAUDE.md with Alpine patterns

### Performance Optimization
- Monitor Alpine reactivity performance
- Add `x-cloak` for flicker prevention
- Consider Alpine.js plugins if needed

### Future Enhancements
With Alpine in place, new features become easier:
- Drag-and-drop reordering
- Inline editing
- Real-time collaboration indicators
- Advanced filtering (tags, date ranges)

---

## Questions & Decisions Log

Track decisions made during migration:

| Date | Phase | Question | Decision | Rationale |
|------|-------|----------|----------|-----------|
| 2025-01-24 | 1 | Store snippets in Alpine or Storage? | Storage | Single source of truth, Alpine just views |
| 2025-01-24 | 1 | Keep old functions as stubs? | Yes | Backwards compatibility, easier rollback |

---

## Success Metrics

How we'll know the migration is successful:

### Quantitative
- [ ] ~400+ lines of code removed
- [ ] No performance regression (< 5% slower)
- [ ] Zero increase in bug reports
- [ ] All tests passing

### Qualitative
- [ ] Code is more readable
- [ ] New features easier to add
- [ ] Less manual DOM manipulation
- [ ] Clearer separation of concerns

---

## Resources

- [Alpine.js Documentation](https://alpinejs.dev/)
- [Alpine.js Examples](https://alpinejs.dev/examples)
- [Alpine.js Cheatsheet](https://alpinejs.dev/cheatsheet)
- Project: `/project-docs/architecture.md`
