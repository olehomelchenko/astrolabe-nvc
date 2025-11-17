# Astrolabe Architecture

**A lightweight, browser-based snippet manager for Vega-Lite visualizations**

> **Technical reference for developers**
> For project overview, see [../README.md](../README.md)
> For development guidelines, see [../CLAUDE.md](../CLAUDE.md)
> For feature inventory, see [features-list.md](features-list.md)

## Project Vision

Astrolabe is a focused tool for managing, editing, and previewing Vega-Lite visualization specifications. It emphasizes efficient snippet management with a clean, resizable three-panel interface: snippet library, Monaco editor with schema-aware autocomplete, and live preview.

## Design Principles

- **Local-first**: All data stored in browser (localStorage for snippets, IndexedDB for datasets)
- **Minimal dependencies**: Vanilla JavaScript, no build tools, direct CDN imports
- **Developer-friendly**: Full JSON schema support, syntax validation, and intellisense
- **Version-aware**: Draft/published workflow for safe experimentation
- **Dataset management**: Separate storage for datasets with reference system
- **Extensible**: Clean architecture for future cloud sync and authentication

---

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Editor**: Monaco Editor v0.47.0 (via CDN)
- **Visualization**: Vega-Embed v6 (includes Vega v5 & Vega-Lite v5)
- **Storage**: localStorage (snippets) + IndexedDB (datasets)
- **Architecture**: Modular script organization with logical file separation
- **Backend**: None (frontend-only application)

---

## Data Schemas

### Snippet Schema

Snippets are stored in localStorage with full draft/published version control.

```javascript
{
  id: number,                    // Unique identifier (timestamp + random)
  name: string,                  // User-editable name (default: ISO datetime)
  created: ISO string,           // Creation timestamp
  modified: ISO string,          // Last modification timestamp
  spec: string,                  // Published Vega-Lite spec (JSON)
  draftSpec: string|null,        // Working draft spec (null = no changes)
  comment: string,               // User notes
  tags: string[],                // Organizational tags
  datasetRefs: string[],         // Referenced dataset names
  meta: object                   // Extensibility field
}
```

**Key Design Decisions**:
- ID generation: `Date.now() + Math.floor(Math.random() * 10000)` for uniqueness
- Auto-naming: ISO datetime format (YYYY-MM-DD_HH-MM-SS) for default names
- Draft/published workflow: separate `spec` and `draftSpec` fields for safe experimentation
- Dataset tracking: `datasetRefs` array automatically populated by reference extraction

### Dataset Schema

Datasets are stored in IndexedDB for unlimited size support.

```javascript
{
  id: number,                    // Unique identifier (timestamp + random)
  name: string,                  // Unique dataset name (enforced by index)
  created: ISO string,           // Creation timestamp
  modified: ISO string,          // Last modification timestamp
  data: any,                     // Inline data (array/object) or URL string
  format: string,                // 'json'|'csv'|'tsv'|'topojson'
  source: string,                // 'inline'|'url'
  comment: string,               // User notes
  rowCount: number|null,         // Calculated row count
  columnCount: number|null,      // Calculated column count
  columns: string[],             // Column names
  size: number|null,             // Data size in bytes
  meta: object                   // Extensibility field
}
```

**Key Design Decisions**:
- Unique name constraint: IndexedDB index prevents duplicate dataset names
- Computed metadata: automatic calculation of size, rowCount, columns for datasets
- Multi-format: JSON, CSV, TSV, TopoJSON with format-specific parsing
- Multi-source: Inline data storage or URL references with automatic fetching

### Settings Schema

User preferences stored in localStorage separately from snippets.

```javascript
{
  sortBy: string,                // 'modified'|'created'|'name'
  sortOrder: string,             // 'asc'|'desc'
  panelWidths: number[],         // Panel width percentages [left, center, right]
  panelVisibility: boolean[],    // Panel visibility states
  panelMemory: number[],         // Remembered widths for hidden panels
  editor: {
    fontSize: number,            // 10-18px
    tabSize: number,             // 2, 4, 8
    minimap: boolean,            // Show/hide minimap
    wordWrap: string,            // 'on'|'off'
    lineNumbers: string          // 'on'|'off'
  },
  dateFormat: string,            // 'smart'|'locale'|'iso'|'custom'
  customDateFormat: string,      // Token-based format (e.g., 'YYYY-MM-DD')
  renderDebounceDelay: number,   // 300-3000ms
  theme: string,                 // 'light'|'dark'
  meta: object                   // Extensibility field
}
```

---

## Storage Architecture

### LocalStorage Structure

```
astrolabe:snippets        # JSON array of all snippets
astrolabe:settings        # User preferences and UI state
```

**Limits**:
- 5 MB total shared across all localStorage data
- Storage monitor tracks usage with visual warnings at 90% and 95%

### IndexedDB Structure

**Database**: `astrolabeDB`
**Version**: 1
**Object Store**: `datasets`
- **keyPath**: `id`
- **Indexes**:
  - `name` (unique) - prevents duplicate dataset names
  - `modified` - for efficient sorting

**Benefits**:
- Effectively unlimited storage (hundreds of MB typical)
- Better performance for large datasets
- Structured query support via indexes

---

## Code Organization

### File Structure

```
web/
├── index.html                 # Main HTML structure
├── src/
│   ├── js/
│   │   ├── config.js         # Global variables, settings API, utilities
│   │   ├── snippet-manager.js # Snippet CRUD, storage, search, sort
│   │   ├── dataset-manager.js # Dataset CRUD, IndexedDB operations
│   │   ├── chart-builder.js  # Visual chart builder for creating specs
│   │   ├── panel-manager.js  # Layout resizing and persistence
│   │   ├── editor.js         # Monaco and Vega library integration
│   │   ├── user-settings.js  # Settings management
│   │   └── app.js            # Application initialization and events
│   └── styles.css            # Retro Windows 2000 aesthetic
└── (CDN libraries loaded at runtime)
```

### Module Responsibilities

**config.js** (~200 lines)
- Global state variables (`currentSnippetId`, `currentViewMode`, etc.)
- Settings API (load, save, get, set, validate)
- Utility functions (date formatting, Toast notifications, URLState)
- Sample data for first-time users

**snippet-manager.js** (~1100 lines)
- SnippetStorage wrapper for localStorage operations
- Full CRUD operations (create, read, update, delete, duplicate)
- Search and multi-field sorting
- Draft/published workflow logic
- Dataset reference extraction (recursive)
- Import/export functionality
- Storage monitoring and size calculation
- Auto-save system with debouncing

**dataset-manager.js** (~1200 lines)
- DatasetStorage wrapper for IndexedDB operations
- Full CRUD operations with async/Promise API
- Format detection (JSON, CSV, TSV, TopoJSON)
- Auto-detection system (URL/format/confidence scoring)
- Metadata calculation (rows, columns, size, types)
- URL fetching with CORS handling
- Table preview rendering with type detection
- Import/export with format conversion
- Extract inline data to dataset

**chart-builder.js** (~457 lines)
- Visual chart builder for creating Vega-Lite specs from datasets
- Mark type selection (Bar, Line, Point, Area, Circle)
- Encoding channel mapping (X, Y, Color, Size)
- Data type selection (Quantitative, Ordinal, Nominal, Temporal)
- Smart defaults based on column type detection
- Live preview with debounced rendering
- Width/Height dimension controls
- Validation and error handling
- Snippet creation with auto-generated metadata

**panel-manager.js** (~200 lines)
- Drag-to-resize implementation
- Panel show/hide toggle logic
- Panel memory system (remembers sizes when hidden)
- Proportional width redistribution
- localStorage persistence for layout state

**editor.js** (~150 lines)
- Monaco Editor initialization with Vega-Lite schema
- AMD loader conflict resolution (Monaco vs Vega)
- Debounced rendering (1.5s for edits, immediate for selection)
- Dataset reference resolution before rendering
- Error display in preview panel
- Format-aware data injection (JSON/CSV/TSV/TopoJSON/URL)

**user-settings.js** (~300 lines)
- Settings validation and defaults
- Editor configuration management
- Theme system (light/dark)
- Date formatting engine
- Performance tuning options
- Settings modal UI logic

**app.js** (~250 lines)
- Application initialization sequence
- Event listener registration
- Monaco editor setup
- URL state management (hashchange listener)
- Keyboard shortcut handlers
- Modal management

**styles.css** (~280 lines)
- Windows 2000 aesthetic (classic gray, beveled borders)
- Component-based architecture (base classes + modifiers)
- CSS variables for theming
- Responsive layout with flexbox
- Toast notification animations
- Modal styles with viewport constraints

---

## Technical Implementation Patterns

### State Management

**Synchronous Flags**:
- `isUpdatingEditor`: Prevents auto-save during programmatic editor updates
- `currentViewMode`: Tracks draft vs published view ('draft' or 'published')
- `currentSnippetId`: Selected snippet for metadata/editing
- `currentDatasetId`: Selected dataset in modal

**State Flow**:
1. User selects snippet → `selectSnippet(id)` called
2. Flag `isUpdatingEditor = true` set
3. Editor content updated programmatically
4. Flag `isUpdatingEditor = false` cleared
5. Editor change listener ignores update (flag was true)
6. Manual edits trigger auto-save (flag is false)

### Auto-Save System

**Debouncing Strategy**:
- Editor changes: 1.5s debounce for rendering
- Draft spec changes: 1s debounce for auto-save
- Name/comment changes: 1s debounce for auto-save
- Search input: 300ms debounce for filtering

**Implementation**:
```javascript
let autoSaveTimeout = null;

function autoSaveDraft() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const content = editor.getValue();
    SnippetStorage.updateDraft(currentSnippetId, content);
    updateSnippetList(); // Refresh status lights
  }, 1000);
}
```

### Dataset Resolution

**Recursive Reference Extraction**:
Vega-Lite specs can have datasets at multiple levels (layers, concat, facet). The resolution algorithm:

1. Parse JSON spec
2. Recursively search for `data: { name: "..." }` patterns
3. Extract all unique dataset names
4. Update `datasetRefs` array in snippet metadata
5. Before rendering, resolve each reference to actual data

**Resolution Logic**:
```javascript
async function resolveDatasetReferences(spec) {
  const specObj = JSON.parse(spec);

  async function resolve(node) {
    if (node.data?.name) {
      const dataset = await DatasetStorage.getByName(node.data.name);
      if (dataset) {
        node.data = formatDataForVega(dataset);
      }
    }
    // Recurse into layers, concat, facet, etc.
    if (node.layer) await Promise.all(node.layer.map(resolve));
    if (node.concat) await Promise.all(node.concat.map(resolve));
    // ... other composite types
  }

  await resolve(specObj);
  return JSON.stringify(specObj);
}
```

### URL State Management

**Hash-based Routing**:
- Snippet selection: `#snippet-123456`
- Dataset modal: `#datasets`
- Dataset selection: `#datasets/dataset-123456`
- New dataset form: `#datasets/new`

**URLState Utility**:
```javascript
const URLState = {
  parse() {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash.startsWith('snippet-')) return { type: 'snippet', id: hash };
    if (hash === 'datasets') return { type: 'datasets' };
    if (hash.startsWith('datasets/dataset-')) return { type: 'dataset', id: hash };
    if (hash === 'datasets/new') return { type: 'new-dataset' };
    return null;
  },

  update(state, replace = false) {
    const hash = formatState(state); // e.g., 'snippet-123456'
    if (replace) {
      history.replaceState(null, '', '#' + hash);
    } else {
      window.location.hash = hash;
    }
  },

  clear() {
    history.replaceState(null, '', window.location.pathname);
  }
};
```

**Benefits**:
- Shareable links to specific snippets/datasets
- Browser back/forward navigation works naturally
- Page refresh preserves user context
- Multi-tab workflows supported

### Type Detection Algorithm

**Column Type Inference** (for table preview):

1. Sample first 100 values in column
2. Try parsing each value as number/date/boolean
3. Calculate success rate for each type
4. If ≥80% match a type, classify as that type
5. Otherwise, classify as text

**Type Detection**:
```javascript
function detectColumnType(values) {
  const sample = values.slice(0, 100).filter(v => v != null);
  const total = sample.length;

  let numberCount = 0, dateCount = 0, booleanCount = 0;

  for (const val of sample) {
    if (!isNaN(Number(val))) numberCount++;
    if (Date.parse(val)) dateCount++;
    if (['true', 'false', 'yes', 'no'].includes(String(val).toLowerCase())) booleanCount++;
  }

  if (numberCount / total >= 0.8) return 'number';
  if (dateCount / total >= 0.8) return 'date';
  if (booleanCount / total >= 0.8) return 'boolean';
  return 'text';
}
```

---

## Performance Considerations

### Debouncing

All user input is debounced to prevent excessive operations:
- **Rendering**: 1.5s prevents rapid re-renders while editing
- **Auto-save**: 1s reduces localStorage write frequency
- **Search**: 300ms balances responsiveness and performance

### Lazy Loading

- **Monaco Editor**: Loaded asynchronously from CDN on page load
- **Vega libraries**: Loaded after Monaco to avoid AMD conflicts
- **URL dataset previews**: Fetched on-demand only when "Load Preview" clicked
- **Table rendering**: Only first 20 rows displayed (full data in memory)

### Storage Optimization

- **Snippets**: Stored as JSON strings in localStorage (5MB limit)
- **Datasets**: Stored in IndexedDB (no practical limit)
- **URL datasets**: Data not persisted, only URL and metadata stored
- **Preview cache**: In-memory only, cleared on page reload

### Memory Management

- **Editor content**: Monaco handles memory internally
- **Vega charts**: Previous chart cleared before new render
- **Preview cache**: Limited to session lifetime, not persisted
- **Event listeners**: Properly cleaned up on modal close

---

## Extension Points

### Adding New Data Formats

1. Add format to `DatasetStorage.detectFormat()`
2. Implement parser in `DatasetStorage.calculateMetadata()`
3. Add format option to dataset form UI
4. Update `formatDataForVega()` in editor.js for rendering

### Adding New Settings

1. Define default in `DEFAULT_SETTINGS` (config.js)
2. Add validation in `validateSettings()`
3. Add UI control in settings modal
4. Apply setting where needed (e.g., editor configuration)

### Cloud Sync Integration

Future architecture for authentication and sync:

1. Add authentication module (OAuth or email/password)
2. Design minimal REST API for CRUD operations
3. Implement sync logic:
   - Upload: localStorage → server on changes
   - Download: server → localStorage on login
   - Conflict resolution: timestamp-based or manual
4. Add sync status indicator in UI
5. Maintain local-first architecture (offline-capable)

---

## Known Technical Constraints

### Browser Compatibility

- **Monaco Editor**: Requires modern browser (ES6+, modules)
- **IndexedDB**: Requires browser support (all modern browsers)
- **localStorage**: 5 MB limit varies by browser
- **CSS Grid/Flexbox**: IE11 not supported

### Storage Limits

- **Snippets**: 5 MB localStorage limit (shared across all snippets)
- **Datasets**: IndexedDB quota varies (typically 50%+ of available disk)
- **URL datasets**: Subject to CORS restrictions
- **Session storage**: Not used (all persistence is long-term)

### Security Considerations

- **No authentication**: All data accessible to anyone with browser access
- **XSS risk**: User-provided specs executed by Vega (trusted content assumed)
- **CORS**: URL datasets must have proper CORS headers
- **localStorage**: Readable by any script on same origin

---

## Development Workflow

### Local Development

1. Clone repository
2. Run local web server: `python -m http.server` or `npx http-server`
3. Open `web/index.html` in browser
4. Use browser DevTools for debugging
5. Test with multiple browsers (Chrome, Firefox, Safari)

### Testing Checklist

- **Snippet CRUD**: Create, edit, duplicate, delete
- **Draft/Publish**: Toggle modes, publish, revert
- **Dataset CRUD**: Create inline/URL, edit, delete
- **Search/Sort**: Real-time filtering, multi-field sorting
- **Import/Export**: Round-trip data integrity
- **Storage**: Approach 5MB limit and verify warnings
- **URL State**: Refresh page, use back/forward buttons
- **Keyboard Shortcuts**: Test all shortcuts on Mac/Windows
- **Responsive**: Resize panels, hide/show panels
- **Error Handling**: Invalid JSON, network failures, CORS errors

### Code Style Guidelines

- **Vanilla JS**: No frameworks, no transpilation
- **ES6+**: Use modern syntax (arrow functions, const/let, template literals)
- **Comments**: Explain "why", not "what"
- **Naming**: Descriptive variable names, camelCase for JS
- **Functions**: Small, single-purpose functions
- **Error Handling**: Try/catch with user-friendly messages
- **No external builds**: Direct CDN imports, no webpack/babel

---

## Migration Path

### From localStorage to IndexedDB (Snippets)

If snippet storage needs to exceed 5 MB in the future:

1. Create new IndexedDB object store: `snippets`
2. Write migration script: `localStorage → IndexedDB`
3. Update `SnippetStorage` to use IndexedDB API
4. Keep settings in localStorage (small size)
5. Run migration on app load (one-time)
6. Show migration progress to user

### Adding Authentication

Architecture for future cloud sync:

1. Add login modal (email/password or OAuth)
2. Store auth token in localStorage
3. Add sync button in header
4. Implement conflict resolution UI
5. Keep local-first (offline mode still works)
6. Add "Last synced" indicator

---

## Troubleshooting

### Monaco Editor Not Loading

- Check CDN availability (loader.js, editor.main.js)
- Verify AMD loader not conflicting (temporary `window.define` removal)
- Check browser console for errors

### Vega Rendering Failures

- Verify spec is valid JSON
- Check dataset references are resolved
- Look for CORS errors on URL datasets
- Verify Vega-Lite schema compatibility

### Storage Issues

- Check localStorage quota (5 MB limit)
- Verify IndexedDB support in browser
- Clear browser cache if storage corrupted
- Use export to back up before clearing

### Performance Problems

- Reduce render debounce delay in settings
- Check for large datasets in snippets (move to dataset library)
- Verify browser DevTools not throttling
- Test in incognito mode (extensions disabled)
