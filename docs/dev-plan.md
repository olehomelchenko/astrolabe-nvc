# Astrolabe Development Plan

**A lightweight, browser-based snippet manager for Vega-Lite visualizations**

> **For AI Context**: See `CLAUDE.md` for current status and key patterns.
> **This Document**: Complete development roadmap and technical decisions.

## Project Vision

Astrolabe is a focused tool for managing, editing, and previewing Vega-Lite visualization specifications. It emphasizes efficient snippet management with a clean, resizable three-panel interface: snippet library, Monaco editor with schema-aware autocomplete, and live preview.

## Design Principles

- **Local-first**: All data stored in browser (localStorage, future IndexedDB migration)
- **Minimal dependencies**: Vanilla JavaScript, no build tools, direct CDN imports
- **Developer-friendly**: Full JSON schema support, syntax validation, and intellisense
- **Version-aware**: Draft/published workflow for safe experimentation
- **Dataset management**: Separate storage for datasets with reference system
- **Extensible**: Clean architecture for future cloud sync and authentication

## Planned Feature Set

- Resizable three-panel layout with show/hide toggles
- Auto-saving draft system with explicit publishing
- Snippet organization with sorting and search
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

**Deliverables**:
- Three-panel flexbox layout (snippet library, editor, preview)
- Header with site branding (🔭 Astrolabe) and action links
- Toggle button strip with emoji icons (📄 ✏️ 👁️)
- Retro Windows 2000 aesthetic with classic colors and square edges
- Sort and search controls in snippet panel header
- Metadata panel for snippet details

---

### **Phase 2: Resizable Panels** ✅ **COMPLETE**
**Goal**: Make panels draggable to resize

**Deliverables**:
- Drag handles between panels with hover/active states
- Mouse-based horizontal resizing with 200px minimum widths
- Panel memory system preserving preferred sizes when toggled
- Proportional redistribution when panels are hidden/shown
- localStorage persistence for panel widths, visibility, and memory
- Toggle buttons with active state indicators

---

### **Phase 3: Monaco Editor Integration** ✅ **COMPLETE**
**Goal**: Working code editor with Vega-Lite schema

**Deliverables**:
- Monaco Editor v0.47.0 loaded from CDN
- JSON language mode with Vega-Lite v5 schema validation
- Autocomplete and intellisense for Vega-Lite specifications
- Format on paste/type enabled
- Error handling for schema loading failures

---

### **Phase 4: Vega-Lite Rendering** ✅ **COMPLETE**
**Goal**: Live preview of visualizations

**Deliverables**:
- Vega, Vega-Lite, and Vega-Embed libraries loaded via CDN
- AMD loader conflict resolution between Monaco and Vega
- 1.5s debounced rendering on editor changes
- Immediate rendering on snippet selection
- Error display in preview panel for invalid specs
- SVG rendering for high-quality output

---

### **Phase 5: Data Model + LocalStorage** ✅ **COMPLETE**
**Goal**: Persist snippets and load them on page refresh

**Deliverables**:
- SnippetStorage wrapper with error handling
- Full Phase 0 schema implementation (id, name, created, modified, spec, draftSpec, comment, tags, datasetRefs, meta)
- ID generation using timestamp + random numbers
- Auto-naming with ISO datetime format (YYYY-MM-DD_HH-MM-SS)
- Dynamic snippet list rendering with relative date formatting
- Default snippet initialization on first load
- Snippet selection loading specs into editor

---

### **Phase 6: Snippet Selection & Basic CRUD** ✅ **COMPLETE**
**Goal**: Core snippet management with advanced organization

**Deliverables**:
- Snippet selection loading into editor with live preview
- Ghost card "Create New Snippet" interface at top of list
- Duplicate button creating copies with "_copy" suffix
- Delete button with confirmation dialog
- Inline name editing in metadata panel with auto-save
- Comment field with auto-save
- 1-second debounced auto-save for spec and metadata changes
- Multi-field sorting (Modified/Created/Name) with ascending/descending toggle
- Visual sort indicators with arrow icons (⬇⬆)
- Real-time search across name, comment, and spec content (300ms debounce)
- Search clear button
- Settings persistence for sort preferences
- Smart state management maintaining selection during operations
- Synchronous flag-based prevention of auto-save during programmatic updates

---

### **Phase 7: Draft/Published Workflow** ✅ **COMPLETE**
**Goal**: Safe experimentation without losing working versions

**Deliverables**:
- Draft/Published toggle buttons in editor header (merged visual design)
- Status indicator lights on snippets (🟢 green = no changes, 🟡 yellow = has draft)
- Publish button (green, copies draftSpec → spec)
- Revert button (orange, copies spec → draftSpec with confirmation)
- Context-aware button visibility (only shown in draft mode)
- Read-only published view when draft exists
- Auto-draft creation when editing published view without draft
- Auto-select first snippet on page load
- Instant status light updates after auto-save

---

### **Phase 8: Storage Monitoring** ✅ **COMPLETE**
**Goal**: Show storage usage and limits

**Deliverables**:
- Storage usage calculation using Blob API for accurate byte counting
- Progress bar display showing usage vs 5MB limit (e.g., "2.3 MB / 5 MB")
- Visual warning states: green (normal), orange (90%+ warning), red (95%+ critical)
- Storage monitor positioned at bottom of snippet panel below metadata
- Automatic updates after every save operation
- Alert dialog when localStorage quota is exceeded
- Flexbox layout ensuring monitor stays at panel bottom with scrollable snippet list

---

### **Phase 9: Export/Import** ✅ **COMPLETE**
**Goal**: Portability and backup

**Deliverables**:
- Export all snippets to JSON file with auto-generated filename (astrolabe-snippets-YYYY-MM-DD.json)
- Import snippets from JSON with automatic format detection
- Support for both Astrolabe native format and external formats
- Automatic field mapping and normalization (createdAt → created, content → spec, draft → draftSpec)
- "imported" tag automatically added to externally imported snippets
- ID conflict resolution with automatic regeneration
- Additive import (merges with existing snippets, no overwrites)
- Success/error feedback with import count
- File picker integration with header Import/Export links
- Snippet size display in list (shows KB for snippets ≥ 1 KB, right-aligned)

**Note**: Drag-and-drop import and selective export options deferred to future phases

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

- [ ] Basic tagging system with tag filtering
- [ ] Snippet templates/starter library
- [ ] Bulk operations (delete multiple, export selected)
- [ ] Size calculation and display for snippets

**Deliverable**: Enhanced snippet discovery and organization

**Note**: Search/filter and sorting already implemented in Phase 6

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
- **Editor**: Monaco Editor v0.47.0 (via CDN)
- **Visualization**: Vega-Embed v6 (includes Vega v5 & Vega-Lite v5)
- **Storage**: LocalStorage → IndexedDB (when needed)
- **Architecture**: Modular script organization with simple file separation
- **Backend** _(future)_: TBD (minimal REST API)

## Project Structure

```
/
├── index.html                 # Main HTML structure and markup
├── CLAUDE.md                  # Project instructions for Claude Code
├── src/
│   ├── styles.css            # Retro Windows 2000 aesthetic styling
│   └── js/                   # Modular JavaScript organization
│       ├── config.js         # Global variables, settings, & sample data
│       ├── snippet-manager.js # Snippet storage, CRUD operations & localStorage wrapper
│       ├── panel-manager.js  # Panel resize, toggle & memory system
│       ├── editor.js         # Monaco Editor initialization & Vega-Lite rendering
│       └── app.js            # Application initialization & event handlers
└── docs/
    ├── dev-plan.md           # This development roadmap
    └── storage-examples.md   # Data model specifications
```

## Development Principles

- **Iterative**: Each phase produces working, testable functionality
- **Lean**: No frameworks, no build step, minimal dependencies
- **Data-first**: Storage schema designed upfront for extensibility
- **User-focused**: Auto-save, clear state, forgiving UX
- **Maintainable**: Clean code organization with logical separation of concerns
- **Simple**: Favor code removal over addition; avoid over-engineering

## Code Organization

- **index.html**: Main HTML structure with semantic markup
- **app.js**: Application initialization and event handler registration
- **config.js**: Global variables, settings management, and sample data
- **snippet-manager.js**: Storage wrapper and all snippet CRUD operations
- **panel-manager.js**: Layout resizing, toggling, and persistence
- **editor.js**: Monaco and Vega library loading and rendering logic
- **styles.css**: Retro Windows 2000 aesthetic with component-based organization

---

## Current Status

**Completed**: Phases 0-9 (Storage, UI, editor, rendering, persistence, CRUD, organization, draft/published workflow, storage monitoring, import/export)
**Next**: Phase 10 - Dataset Management
**See**: `CLAUDE.md` for concise current state summary

---

## Implemented Features

### Core Capabilities (Phases 0-9)
- Three-panel resizable layout with memory and persistence
- Monaco Editor v0.47.0 with Vega-Lite v5 schema validation
- Live Vega-Lite rendering with debounced updates and error display
- localStorage-based snippet management with full CRUD
- Multi-field sorting (Modified/Created/Name) with direction toggle
- Real-time search across snippet name, comment, and spec content
- Auto-save system (1s debounce) for specs and metadata
- Ghost card interface for snippet creation
- Draft/Published workflow with version control
- Status indicator lights (green/yellow) showing draft state
- Context-aware Publish/Revert buttons with color coding
- Storage monitoring with visual progress bar and warning states
- Export/Import functionality with format auto-detection
- Snippet size display (right-aligned, shown for ≥ 1 KB)
- Retro Windows 2000 aesthetic throughout

### Technical Implementation
- **State Management**: Synchronous `isUpdatingEditor` flag prevents unwanted auto-saves
- **View Modes**: `currentViewMode` tracks draft vs published state
- **Read-only Logic**: Monaco editor locked in published view when draft exists
- **Auto-draft Creation**: Editing published without draft auto-switches to draft mode
- **Debouncing**: 1.5s render, 1s auto-save, 300ms search
- **AMD Resolution**: Temporary `window.define` disabling for Vega library loading
- **Panel Memory**: localStorage persistence for sizes and visibility across sessions
- **Data Model**: Phase 0 schema with `spec` (published) and `draftSpec` (working) fields
- **Storage Calculation**: Blob API for accurate byte counting of snippet data
- **Flexbox Layout**: Scrollable snippet list with fixed metadata and storage monitor at bottom
- **Import/Export**: Format detection, field normalization, ID conflict resolution, additive merging
- **Size Display**: Per-snippet size calculation with conditional rendering (≥ 1 KB threshold)