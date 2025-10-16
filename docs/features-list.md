# Astrolabe - Current Features List

> **Purpose**: Comprehensive inventory of all implemented features for code review and optimization
> **Created**: 2025-10-15
> **Updated**: 2025-10-16
> **Status**: Phases 0-12 Complete, Phase 13 In Progress (Keyboard Shortcuts, Notifications, Tooltips, Help Documentation)

---

## 🔭 **ASTROLABE - Current Features Inventory**

### **1. Layout & UI Structure**
- Three-panel resizable layout (Snippet Library | Editor | Preview)
- Manual drag-to-resize with 200px minimum widths
- Panel show/hide toggle buttons (📄 ✏️ 👁️ 📁)
- Panel memory system (remembers sizes when toggled)
- Proportional width redistribution when panels are hidden/shown
- Layout persistence to localStorage across sessions
- Retro Windows 2000 aesthetic styling

**Files**: `panel-manager.js`, `styles.css`, `index.html`

---

### **2. Monaco Code Editor**
- Monaco Editor v0.47.0 integration via CDN
- JSON syntax highlighting and validation
- Vega-Lite v5 schema autocomplete and intellisense
- Format-on-paste and format-on-type
- Read-only mode (when viewing published with draft)
- Automatic layout resizing

**Files**: `app.js` (lines 31-82), `index.html` (line 11)

---

### **3. Vega-Lite Rendering**
- Live preview panel with Vega-Embed v6
- SVG rendering for high quality
- 1.5-second debounced rendering on editor changes
- Immediate rendering on snippet selection
- Error display with helpful messages
- Dataset reference resolution (inline & URL)
- Recursive resolution for layered/concat/faceted specs

**Files**: `editor.js`, `app.js` (rendering calls)

---

### **4. Snippet Management (CRUD)**
- Create new snippet (ghost card interface)
- Duplicate snippet (with "_copy" suffix)
- Delete snippet (with confirmation dialog)
- Inline name editing with auto-save
- Comment field with auto-save
- Auto-generated ISO datetime names (YYYY-MM-DD_HH-MM-SS)
- Unique ID generation (timestamp + random)
- Created/Modified timestamps with formatted display

**Files**: `snippet-manager.js` (lines 7-36, 621-701), `app.js` (event handlers)

---

### **5. Snippet Organization**
- Multi-field sorting (Modified/Created/Name)
- Ascending/descending toggle with arrow indicators (⬇⬆)
- Real-time search across name, comment, and spec content
- 300ms debounced search
- Search clear button with enabled/disabled state
- Visual sort indicators on active button
- Sort preferences persisted to localStorage
- Snippet size display (shows KB for ≥1KB snippets, right-aligned)

**Files**: `snippet-manager.js` (lines 96-405), `app.js` (initialization)

---

### **6. Draft/Published Workflow**
- Dual-spec storage (spec = published, draftSpec = working)
- View mode toggle (Draft/Published buttons)
- Status indicator lights (🟢 green = clean, 🟡 yellow = has draft)
- Publish button (copies draftSpec → spec)
- Revert button (copies spec → draftSpec with confirmation)
- Context-aware button visibility (only in draft mode)
- Auto-draft creation when editing published view
- Read-only published view when draft exists
- 1-second debounced auto-save for draft changes

**Files**: `snippet-manager.js` (lines 494-810), `config.js` (currentViewMode)

---

### **7. Storage Management**
- localStorage for snippets (5MB limit awareness)
- Storage usage monitor with progress bar
- Visual warning states (green/orange/red at 90%/95%)
- Accurate byte counting using Blob API
- Storage monitor positioned below metadata panel
- Real-time updates after save operations
- Quota exceeded alerts

**Files**: `snippet-manager.js` (lines 3-5, 812-853), `index.html` (storage monitor UI)

---

### **8. Import/Export**
- Export all snippets to JSON with auto-generated filename
- Import from JSON with format auto-detection
- Support for Astrolabe native format
- Support for external formats with field mapping
- Automatic "imported" tag for external snippets
- ID conflict resolution with regeneration
- Additive import (no overwrites)
- Success/error feedback with count

**Files**: `snippet-manager.js` (lines 855-976), `app.js` (lines 92-112)

---

### **9. Dataset Management**
- IndexedDB storage (unlimited size, separate from snippets)
- Multi-format support: JSON, CSV, TSV, TopoJSON
- Multi-source support: Inline data & URL references
- Full CRUD operations for datasets
- Modal-based Dataset Manager UI
- Dataset list with metadata display
- Dataset details panel with editable name/comment
- Statistics display (rows, columns, size)
- Data preview (first 5 rows or URL info)
- Copy reference button (generates `"data": {"name": "..."}`)
- Delete dataset with confirmation
- Refresh metadata button for URL datasets (🔄)
- **Auto-detection system**:
  - Single input field for data or URL
  - Automatic URL detection and content fetching
  - Format detection (JSON, CSV, TSV, TopoJSON)
  - Confidence scoring (high/medium/low)
  - Visual confirmation with badges and preview
- URL fetching with CORS error handling
- Unique dataset name constraint (IndexedDB index)
- Empty state message for no datasets

**Files**: `dataset-manager.js`, `editor.js` (resolution), `app.js` (event handlers), `index.html` (modal UI)

---

### **10. Settings & Persistence**
- Settings storage in localStorage (separate from snippets)
- Default settings (sortBy: modified, sortOrder: desc)
- Settings API (load, save, get, set)
- Panel layout persistence
- Panel memory persistence
- Sort preferences persistence
- Auto-restore on page load

**Files**: `config.js` (lines 19-65), `panel-manager.js` (lines 76-131)

---

### **11. Auto-Save System**
- 1-second debounced auto-save for editor changes
- 1-second debounced auto-save for name/comment changes
- Synchronous flag (`isUpdatingEditor`) to prevent unwanted saves
- Auto-save only in draft mode
- Instant status light updates after save
- Storage monitor updates after save

**Files**: `snippet-manager.js` (lines 494-619), `app.js` (lines 73-75)

---

### **12. URL State Management**
- Hash-based URL routing for snippets and datasets
- Snippet selection persists in URL (`#snippet-123456`)
- Dataset modal state persists in URL:
  - Modal open: `#datasets`
  - Dataset selected: `#datasets/dataset-123456`
  - New dataset form: `#datasets/new`
- Browser back/forward navigation support
- Page reload preserves state (selected snippet/dataset)
- URL sharing for specific snippets or datasets
- Automatic state restoration on page load
- Restores snippet URL when closing dataset modal
- No external libraries (native Hash API)

**Files**: `config.js` (URLState utility), `snippet-manager.js` (snippet URLs), `dataset-manager.js` (dataset URLs), `app.js` (hashchange listener)

---

### **13. User Experience Enhancements**
- Auto-select first snippet on page load
- Relative date formatting (Today/Yesterday/X days ago)
- Full datetime display in metadata panel
- Empty state placeholders
- "No snippets match your search" for search results
- Confirmation dialogs for destructive actions
- Flexbox layout with scrollable snippet list
- Fixed metadata and storage monitor at bottom

**Files**: `snippet-manager.js` (formatting functions), `app.js` (auto-select), `styles.css` (layout)

---

### **13. Advanced Dataset Features (Phase 12)**
- **Dataset Dependencies & Linking**:
  - Recursive dataset reference extraction from Vega-Lite specs
  - Bidirectional snippet ↔ dataset linking with clickable links
  - Dataset usage tracking and count badges (📄 count)
  - Visual indicators (📁) for snippets using datasets
  - Linked datasets section in snippet metadata
  - Linked snippets section in dataset details
  - Navigation between snippets and datasets via links
- **Extract to Dataset**:
  - Inline data detection in draft specs
  - Extract modal with name generation and preview
  - Automatic spec transformation (inline → reference)
  - Auto-update snippet with dataset reference
  - Conditional Extract button (shows when inline data detected)
- **Import/Export Datasets**:
  - Import from file (.json, .csv, .tsv, .txt)
  - Auto-format detection from content and filename
  - Automatic naming from filename with duplicate handling
  - Timestamp suffix for duplicate names (e.g., "data_123456")
  - Export to format-specific files (.json, .csv, .tsv, .topojson)
  - URL dataset export fetches and downloads live content
- **Table Preview with Type Detection**:
  - Raw/Table toggle for tabular data (JSON arrays, CSV, TSV)
  - Vanilla JS table rendering (first 20 rows)
  - Sticky headers with scrollable content
  - Column type detection (80% threshold): number, date, boolean, text
  - Type icons in headers: 🔢 📅 ✓ 🔤
  - Type-specific formatting: italic numbers (right-aligned), italic dates, bold booleans
  - Color coding: blue numbers, green dates, orange booleans, gray nulls
  - Monospace font (Consolas/Monaco/Courier New)
- **URL Preview Loading**:
  - On-demand fetch with "Load Preview" button
  - In-memory cache for fetched data (session-only)
  - Full table view and type detection for fetched data
  - Error handling with retry option
  - Data not saved to database (preview only)
- **New Snippet from Dataset**:
  - Button in dataset details to create snippet
  - Auto-generated minimal Vega-Lite spec with dataset reference
  - Pre-populated comment and datasetRefs
- **UI Enhancements**:
  - Larger modal (95% width, max 1200px, 85% height)
  - Actions moved to top of dataset details
  - Dataset list with usage badges

**Files**: `dataset-manager.js` (lines 19-1165), `snippet-manager.js` (dataset tracking), `app.js` (event handlers), `index.html` (UI), `styles.css` (table styles)

---

## 📊 **Feature Statistics**

- **Core Feature Groups**: 14
- **Total Individual Capabilities**: ~100+
- **Storage Systems**: 2 (localStorage for snippets, IndexedDB for datasets)
- **UI Panels**: 3 main + 1 modal
- **Auto-save Points**: 3 (draft spec, name, comment)
- **Data Formats**: 4 (JSON, CSV, TSV, TopoJSON)
- **Data Sources**: 2 (inline, URL)
- **Type Detection**: 4 types (number, date, boolean, text)
- **Import/Export**: Snippets + Datasets

---

## 🗂️ **Code Organization**

```
src/
├── js/
│   ├── config.js           # Global variables, settings, sample data
│   ├── snippet-manager.js  # Snippet CRUD, storage, search, sort, extract (1,100+ lines)
│   ├── dataset-manager.js  # Dataset CRUD, IndexedDB, preview, types (1,200+ lines)
│   ├── panel-manager.js    # Layout resizing, toggling, persistence (200 lines)
│   ├── editor.js           # Monaco setup, Vega rendering, dataset resolution (150 lines)
│   └── app.js              # Event handlers, initialization (250+ lines)
└── styles.css              # Retro Windows 2000 aesthetic (280+ lines)
```

**Total JS Lines**: ~2,900+ lines (excluding comments and blank lines)

---

## 🎯 **Use This Document For**

1. **Feature Review**: Select a feature to audit code relevance
2. **Code Cleanup**: Identify potential leftovers or redundancies
3. **Optimization**: Find opportunities to reduce codebase size
4. **Documentation**: Reference for what's actually implemented
5. **Planning**: Determine what to polish vs what to add

---

### **13. Polish & UX Refinements (Phase 13)** ⏳ _In Progress_

**Keyboard Shortcuts**:
- Cmd/Ctrl+Shift+N: Create new snippet
- Cmd/Ctrl+K: Toggle dataset manager
- Cmd/Ctrl+S: Publish draft
- Escape: Close any open modal
- Dual handler system (document-level + Monaco integration)
- Cross-platform support (Cmd on Mac, Ctrl on Windows/Linux)

**Toast Notification System**:
- Four types: error, success, warning, info
- Bottom-right positioning, 4-second auto-dismiss
- Slide-in/slide-out animations
- Manual close button
- Replaced 19 `alert()` calls with contextual toasts
- Kept `confirm()` dialogs for destructive actions

**Tooltips**:
- Added to all interactive elements (buttons, links, controls)
- Keyboard shortcut hints included where applicable
- Consistent tooltip text across the application

**Enhanced Help Documentation**:
- Comprehensive Help modal with 6 sections
- About Astrolabe (project vision and approach)
- Key Features (scannable highlights)
- Getting Started (4-step workflow guide)
- Keyboard Shortcuts (reference table)
- Storage & Limits (with data persistence warning)
- Tips & Tricks (power user features)

**Files**: `app.js` (keyboard handlers), `config.js` (Toast utility), `styles.css` (toast/help styles), `index.html` (help modal)

---

## 📝 **Next Steps**

### Phase 13 In Progress! Keyboard shortcuts, notifications, tooltips, and help documentation complete.

**Remaining Phase 13 Tasks**:
- [ ] Loading states for rendering
- [ ] Empty states (no snippets, no datasets)
- [ ] Improved visual design polish
- [ ] Cross-browser testing

**Future Phases**:
- **Phase 14**: Advanced Snippet Features (tagging system, templates, bulk operations)
- **Phase 15**: Authentication & Backend (cloud sync, sharing)
