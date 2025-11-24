# Alpine.js Migration Plan

## Overview

Incremental migration of Astrolabe from vanilla JavaScript to Alpine.js for reactive UI management. Each phase is independently deployable and leaves the project fully functional.

## Guiding Principles

1. **Each step is independently deployable** - Project always works
2. **No big-bang rewrites** - Small, focused changes
3. **Test after each step** - Catch issues early
4. **Alpine + Vanilla coexist** - No forced conversions
5. **SnippetStorage/DatasetStorage remain authoritative** - Alpine is view layer only
6. **Migration only, no new features** - Convert existing functionality without adding new UI features

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
- Meta fields (name, comment)
- All CRUD business logic

### Key Learnings

- Alpine store keeps minimal UI state (`currentSnippetId`)
- Storage layer does all filtering/sorting
- Alpine component is thin wrapper
- Automatic reactivity eliminates manual DOM updates

---

## Phase 2: Dataset Manager Modal ✅ COMPLETE

**Status**: Done
**Files**: `src/js/dataset-manager.js`, `index.html`

### What Was Converted

- Dataset list rendering with `x-for` template
- Selection highlighting with `:class` binding to Alpine store
- Empty state with `x-show`
- Click handlers with `@click`

**Note**: Dataset modal did NOT have sort/search controls before migration, so none were added.

### Implementation Approach

1. Add Alpine store with `currentDatasetId` for selection state
2. Create `datasetList()` component as thin wrapper around existing logic
3. Move meta formatting logic from inline HTML strings to component methods
4. Convert HTML to use Alpine directives
5. Update `renderDatasetList()` to trigger Alpine component refresh
6. Update `selectDataset()` to update Alpine store instead of manual DOM manipulation

### What Stays Vanilla

- DatasetStorage (IndexedDB operations)
- Dataset detail panel
- Preview table rendering
- Import/export logic
- All dataset form/edit functionality

### Key Learnings

- Alpine component is very thin
- Most logic moved from inline HTML strings to component methods
- Net code increase: only +20 lines total
- Same pattern as Phase 1: minimal, focused conversion
- Don't add features during migration - only convert what exists

---

## Phase 3: View Mode Toggle (Draft/Published) ✅ COMPLETE

**Status**: Done
**Files**: `index.html`, `src/js/snippet-manager.js`, `src/js/app.js`, `src/js/config.js`

### What Was Converted

- View mode toggle buttons (Draft/Published) with `:class` binding and `@click` handlers
- All references to `currentViewMode` global variable now use Alpine store
- Removed vanilla event listeners from app.js
- Removed `currentViewMode` global variable from config.js

### Implementation Approach

1. Added `viewMode` property to Alpine snippets store (default: 'draft')
2. Converted button HTML to use `:class` binding and `@click` handlers
3. Updated all references to `currentViewMode` to use `Alpine.store('snippets').viewMode`
4. Simplified `updateViewModeUI()` function (now only handles publish/revert button visibility)
5. Removed vanilla event listeners from app.js

### What Stays Vanilla

- Editor integration logic
- Publish/discard actions
- Publish/revert button visibility logic (handled by `updateViewModeUI`)

### Key Learnings

- Alpine store provides clean reactive state for view mode
- Toggle button active states now automatically update via Alpine `:class` binding
- All business logic references updated to use Alpine store instead of global variable
- `updateViewModeUI` simplified but still needed for publish/revert button management

---

## Phase 4: Settings Modal

**Status**: Planned
**Files**: `src/js/app.js`, `index.html`

### What to Convert

Settings form with multiple inputs and apply/reset functionality.

### Implementation Approach

1. Create `settingsPanel()` component with settings state tracking
2. Use `x-model` for all form inputs (theme, editor settings, date format)
3. Add computed `isDirty` property to enable/disable Apply button
4. Use `x-show` for conditional fields (custom date format)
5. Remove manual event listeners from app.js

### What Stays Vanilla

- AppSettings storage layer
- Editor option updates
- Theme application logic

---

## Phase 5: Chart Builder Modal

**Status**: Planned
**Files**: `src/js/chart-builder.js`, `index.html`

### What to Convert

Chart builder form with dataset selection, chart type, and field mappings.

### Implementation Approach

1. Create `chartBuilder()` component with form state
2. Load datasets on init, populate dropdowns with `x-for`
3. Track selected dataset and available fields
4. Generate spec preview with computed property
5. Enable/disable insert button based on validation

### What Stays Vanilla

- Dataset field detection
- Type inference logic
- Spec generation utilities

---

## Phase 6: Meta Fields (Name, Comment)

**Status**: Planned
**Files**: `index.html`, `src/js/snippet-manager.js`

### What to Convert

Name and comment fields with auto-save functionality.

### Implementation Approach

1. Add `snippetName` and `snippetComment` to `snippetList()` component
2. Use `x-model` with debounced input handlers
3. Call `loadMetadata()` when snippet selected
4. Auto-save on change with 500ms debounce

### What Stays Vanilla

- SnippetStorage save operations

---

## Phase 7: Panel Visibility Toggles

**Status**: Planned
**Files**: `index.html`, `src/js/panel-manager.js`

### What to Convert

Toggle buttons for showing/hiding panels.

### Implementation Approach

1. Create Alpine store for UI state (panel visibility flags)
2. Convert toggle buttons to use `:class` and `@click`
3. Add `x-show` to panels with transitions
4. Persist visibility state to localStorage

### What Stays Vanilla

- Panel resizing logic
- Keyboard shortcuts

---

## Phase 8: Toast Notifications (Optional)

**Status**: Planned
**Files**: `src/js/config.js`, `index.html`

### What to Convert

Toast notification system with auto-dismiss.

### Implementation Approach

1. Create Alpine store for toast queue
2. Render toasts with `x-for` and transitions
3. Update `Toast` utility to add items to Alpine store
4. Auto-dismiss with setTimeout

### What Stays Vanilla

- Toast message generation

---

## Recommended Order

1. ✅ **Phase 1: Snippet Panel** - DONE
2. ✅ **Phase 2: Dataset Manager** - DONE
3. ✅ **Phase 3: View Mode Toggle** - DONE
4. **Phase 4: Settings Modal** - Another modal, builds confidence
5. **Phase 6: Meta Fields** - Before Chart Builder (simpler)
6. **Phase 7: Panel Toggles** - Quick win
7. **Phase 5: Chart Builder** - More complex, save for when confident
8. **Phase 8: Toast Notifications** - Optional polish

---

## Emergency Rollback Plan

If a phase causes issues:

1. **Quick Fix**: Comment out Alpine directives, uncomment vanilla JS
2. **Git Revert**: Each phase is a separate commit
3. **Hybrid Mode**: Alpine and vanilla can coexist - revert problematic sections only

---

## Post-Migration

After all phases complete:

### Code Cleanup
- Remove no-op functions
- Remove unused vanilla event listeners
- Clean up global state variables
- Update JSDoc comments

### Documentation
- Update architecture.md
- Document Alpine components
- Add Alpine.js to dependencies list
- Update CLAUDE.md with Alpine patterns

---

## Questions & Decisions Log

| Date | Phase | Question | Decision | Rationale |
|------|-------|----------|----------|-----------|
| 2025-01-24 | 1 | Store snippets in Alpine or Storage? | Storage | Single source of truth, Alpine just views |
| 2025-01-24 | 1 | Keep old functions as stubs? | Yes | Backwards compatibility, easier rollback |
| 2025-01-24 | 2 | Add sort/search to dataset modal? | No | Migration only - don't add features that didn't exist |
| 2025-01-24 | 2 | How much net code increase is acceptable? | ~20 lines | Alpine boilerplate worth it for reactivity gains |

---

## Success Metrics

### Quantitative
- ~300+ lines of code removed overall
- No performance regression
- Zero increase in bug reports
- All tests passing

### Qualitative
- Code is more readable
- New features easier to add
- Less manual DOM manipulation
- Clearer separation of concerns
