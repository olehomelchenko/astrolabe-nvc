# Astrolabe

**A lightweight, browser-based snippet manager for Vega-Lite visualizations**

## Overview

Astrolabe is a focused tool for managing, editing, and previewing Vega-Lite visualization specifications. Unlike full-featured visualization editors, Astrolabe emphasizes efficient snippet management with a clean, resizable three-panel interface: snippet library, Monaco editor with schema-aware autocomplete, and live preview.

## End Goals

- **Local-first**: All data stored in browser (localStorage initially, IndexedDB for scale)
- **Minimal dependencies**: Vanilla JavaScript, no build tools, direct CDN imports
- **Developer-friendly**: Full JSON schema support, syntax validation, and intellisense
- **Version-aware**: Draft/published workflow for safe experimentation
- **Dataset management**: Separate storage for datasets with reference system
- **Extensible**: Clean architecture for future cloud sync and authentication

## Core Features

- Resizable three-panel layout with show/hide toggles
- Auto-saving draft system with explicit publishing
- Snippet duplication, renaming, deletion
- Storage monitoring and size tracking
- Export/import functionality
- Dataset library and management
- (Future) Authentication and cloud synchronization

---

## Development Roadmap

### **Phase 0: Storage Architecture Design** ✅ **COMPLETE**
**Goal**: Define data structures that accommodate full feature set

- [x] Design snippet schema: `{id, name, created, modified, spec, draftSpec, comment, tags[], datasetRefs[], meta}`
- [x] Design dataset schema: `{id, name, created, modified, data, format, rowCount, columnCount, size, columns, comment, tags, meta}`
- [x] Design settings schema: `{panelWidths[], panelVisibility[], autoSaveDelay, meta}`
- [x] Plan localStorage key structure and namespacing
- [x] Define upgrade/migration path for schema changes
- [x] Document storage architecture decisions (see storage-examples.md)

**Deliverable**: Documented data model that supports all planned features

**Key Decisions Made**:
- ID generation: `Date.now() + random numbers` for uniqueness
- Auto-naming: ISO datetime format for default snippet names
- Draft/published workflow: separate `spec` and `draftSpec` fields
- Computed metadata: automatic calculation of size, rowCount, columns for datasets
- Extensibility: `meta` field in all schemas for future enhancements
- Settings persistence: panel state and UI preferences stored locally

---

### **Phase 1: Static HTML Structure** ✅ **COMPLETE**
**Goal**: Basic three-panel layout with placeholder content

- [x] Create `index.html` with basic structure
- [x] Add minimal CSS for three-column flexbox layout
- [x] Add placeholder divs for: snippet list, editor, preview
- [x] Add vertical toggle button strip (moved to left side with emoji icons)
- [x] Test that layout renders at correct proportions

**Deliverable**: Static page with three visible sections + toggle buttons

**Additional Enhancements Made**:
- Added header with site branding (🔭 Astrolabe) and quick action links
- Applied retro Windows 2000 aesthetic with square edges and classic colors
- Implemented basic toggle functionality for show/hide panels
- Added snippet selection highlighting
- Used emoji icons for better UX (📄 ✏️ 👁️)
- Optimized font sizes for better readability

---

### **Phase 2: Resizable Panels**
**Goal**: Make panels draggable to resize

- [ ] Add resize handles/dividers between panels
- [ ] Implement vanilla JS drag handlers for horizontal resizing
- [ ] Store panel widths in localStorage (restore on load)
- [ ] Implement toggle button logic to show/hide each panel
- [ ] Handle edge cases (minimum widths, hiding panels)

**Deliverable**: Fully interactive layout with resizable and toggleable panels

---

### **Phase 3: Monaco Editor Integration**
**Goal**: Working code editor with Vega-Lite schema

- [ ] Load Monaco Editor from CDN
- [ ] Initialize Monaco in the middle panel
- [ ] Configure JSON mode with Vega-Lite schema URL for autocomplete
- [ ] Add a test Vega-Lite spec as default content
- [ ] Verify schema validation and autocomplete works

**Deliverable**: Working editor with intellisense for Vega-Lite

---

### **Phase 4: Vega-Lite Rendering**
**Goal**: Live preview of visualizations

- [ ] Load Vega-Embed from CDN
- [ ] Create render function that takes spec from editor
- [ ] Add debounced auto-render on editor change
- [ ] Display rendered chart in right panel
- [ ] Handle rendering errors gracefully (show in preview panel)

**Deliverable**: Editor → live chart pipeline working with auto-refresh

---

### **Phase 5: Data Model + LocalStorage**
**Goal**: Persist snippets and load them on page refresh

- [ ] Implement storage wrapper using Phase 0 schema
- [ ] Create localStorage functions (save, load, list, delete)
- [ ] Initialize with a default example snippet if storage is empty
- [ ] Populate snippet list panel from localStorage
- [ ] Handle localStorage errors/quota exceeded

**Deliverable**: Snippets persist across page reloads

---

### **Phase 6: Snippet Selection & Basic CRUD**
**Goal**: Core snippet management

- [ ] Click snippet in list → load into editor + render
- [ ] Highlight selected snippet in list
- [ ] **Create**: "New Snippet" button → generates datetime name
- [ ] **Duplicate**: Duplicate button creates copy with timestamp suffix
- [ ] **Delete**: Delete button per snippet (with confirmation)
- [ ] **Rename**: Inline or modal rename functionality
- [ ] Auto-save draft on editor change (debounced)
- [ ] Add comment/meta text field (below snippet list or in sidebar)

**Deliverable**: Complete basic CRUD with auto-saving drafts

---

### **Phase 7: Draft/Published Workflow**
**Goal**: Safe experimentation without losing working versions

- [ ] Add "Published" badge/indicator to snippet list items
- [ ] Add "Publish" button in editor UI
- [ ] Toggle between viewing draft vs published version
- [ ] On publish: copy `draftSpec` → `spec`, update `published` timestamp
- [ ] Visual indicator in editor showing draft vs published state
- [ ] Option to revert draft to last published version
- [ ] Prevent accidental data loss with clear state indication

**Deliverable**: Git-like draft/staged workflow for specs

---

### **Phase 8: Storage Monitoring**
**Goal**: Show storage usage and limits

- [ ] Calculate total localStorage usage
- [ ] Display as progress bar or text (e.g., "2.3 MB / ~5 MB")
- [ ] Show individual snippet sizes in list
- [ ] Add warning indicator when approaching 80% capacity
- [ ] Display draft vs published size differences

**Deliverable**: User can see storage consumption

---

### **Phase 9: Export/Import**
**Goal**: Portability and backup

- [ ] Export single snippet as JSON file (include metadata)
- [ ] Export all snippets as JSON bundle
- [ ] Import snippets from JSON (with conflict resolution)
- [ ] Drag-and-drop import
- [ ] Export published vs draft options

**Deliverable**: Full backup/restore capability

---

### **Phase 10: Dataset Management - Part 1**
**Goal**: Separate dataset storage infrastructure

- [ ] Implement dataset storage schema from Phase 0
- [ ] Create dataset CRUD operations
- [ ] Add dataset library panel/modal
- [ ] List all stored datasets with metadata
- [ ] Add/delete/rename datasets
- [ ] Display dataset size and row counts

**Deliverable**: Basic dataset storage separate from snippets

---

### **Phase 11: Dataset Management - Part 2**
**Goal**: Reference datasets from specs

- [ ] Detect inline data in Vega-Lite specs
- [ ] "Extract to dataset" feature for inline data
- [ ] Replace inline data with dataset references
- [ ] Auto-resolve dataset references when rendering
- [ ] Update snippet UI to show linked datasets
- [ ] Handle missing dataset references gracefully

**Deliverable**: Specs can reference shared datasets

---

### **Phase 12: Polish & UX Refinements**
**Goal**: Professional feel and usability

- [ ] Improved visual design (minimal but polished CSS)
- [ ] Keyboard shortcuts (Ctrl+S to publish, Ctrl+N for new, etc.)
- [ ] Better error messages and validation feedback
- [ ] Loading states for rendering
- [ ] Empty states (no snippets, no datasets)
- [ ] Tooltips for buttons and features
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Deliverable**: Polished, production-ready MVP

---

### **Phase 13: Advanced Snippet Features**
**Goal**: Power user functionality

- [ ] Search/filter snippets by name, comment, tags
- [ ] Sort options (name, date created, modified, size)
- [ ] Basic tagging system
- [ ] Snippet templates/starter library
- [ ] Bulk operations (delete multiple, export selected)

**Deliverable**: Enhanced snippet discovery and organization

---

### **Phase 14: Authentication & Backend** _(Future)_
**Goal**: Multi-device sync and sharing

- [ ] Design minimal backend API
- [ ] User authentication (email/password or OAuth)
- [ ] Sync localStorage ↔ cloud storage
- [ ] Conflict resolution strategy
- [ ] Share snippets via URL
- [ ] Public snippet gallery (optional)

**Deliverable**: Cloud-backed, multi-device Astrolabe

---

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Editor**: Monaco Editor (via CDN)
- **Visualization**: Vega-Embed (includes Vega & Vega-Lite)
- **Storage**: LocalStorage → IndexedDB (when needed)
- **Backend** _(future)_: TBD (minimal REST API)

## Development Principles

- **Iterative**: Each phase produces working, testable functionality
- **Lean**: No frameworks, no build step, minimal dependencies
- **Data-first**: Storage schema designed upfront for extensibility
- **User-focused**: Auto-save, clear state, forgiving UX

---

**Current Phase**: Phase 2 - Resizable Panels
**Status**: Ready to begin implementation