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

## Phase 4: Settings Modal ✅ COMPLETE

**Status**: Done
**Files**: `src/js/user-settings.js`, `index.html`, `src/js/app.js`

### What Was Converted

- Settings modal form with all input controls using `x-model`
- Apply/Reset/Cancel buttons with `@click` handlers
- Computed `isDirty` property to enable/disable Apply button
- Conditional custom date format field with `x-show`
- Slider value displays with `x-text`
- All form state management moved to Alpine component

### Implementation Approach

1. Created `settingsPanel()` component in `user-settings.js` with form state tracking
2. Used `x-model` (with `.number` modifier where needed) for all form inputs:
   - Theme selects
   - Font size and render debounce sliders
   - Tab size select
   - Checkboxes (minimap, word wrap, line numbers)
   - Date format and custom format input
3. Added computed `isDirty` getter to compare current vs. original state
4. Added computed `showCustomDateFormat` getter for conditional field visibility
5. Moved all apply/reset/cancel logic into Alpine component methods
6. Removed vanilla event listeners and old `loadSettingsIntoUI()` / `applySettings()` functions

### What Stays Vanilla

- Settings storage layer (getSettings, updateSettings, etc.)
- Settings validation logic (validateSetting)
- Editor option updates (applied from within Alpine component)
- Theme application logic (applied from within Alpine component)
- Modal open/close functions (simple ModalManager calls)

### Key Learnings

- Alpine component handles all form state reactivity
- `isDirty` computed property automatically enables/disables Apply button
- `x-model.number` modifier ensures numeric values for sliders and selects
- `x-show` provides clean conditional rendering for custom date format field
- All business logic (validation, saving, applying) stays in existing functions
- Net code reduction: ~150 lines of manual DOM manipulation removed

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

## Phase 6: Meta Fields (Name, Comment) ✅ COMPLETE

**Status**: Done
**Files**: `index.html`, `src/js/snippet-manager.js`

### What Was Converted

- Name and comment input fields with `x-model` bindings
- Debounced auto-save functionality moved to Alpine component
- Metadata loading when snippet is selected

### Implementation Approach

1. Added `snippetName` and `snippetComment` properties to `snippetList()` component
2. Added `loadMetadata()` method to load fields when snippet selected
3. Added `saveMetaDebounced()` and `saveMeta()` methods for auto-saving
4. Converted HTML inputs to use `x-model` with `@input="saveMetaDebounced()"`
5. Updated `selectSnippet()` to call Alpine component's `loadMetadata()` via `_x_dataStack`
6. Removed vanilla event listeners and old `autoSaveMeta()`/`debouncedAutoSaveMeta()` functions

### What Stays Vanilla

- SnippetStorage save operations (called from Alpine component)
- Name generation logic (generateSnippetName)
- Snippet list re-rendering after save

### Key Learnings

- Alpine's `x-model` provides two-way data binding for inputs
- `@input` event handler triggers debounced save on every keystroke
- Alpine component accessed via DOM element's `_x_dataStack[0]` property
- Debounce timeout stored in component state for proper cleanup
- Net code reduction: ~40 lines of manual event listener setup removed

---

## Phase 7: Panel Visibility Toggles ✅ COMPLETE

**Status**: Done
**Files**: `index.html`, `src/js/panel-manager.js`, `src/js/app.js`

### What Was Converted

- Panel toggle buttons with `:class` binding and `@click` handlers
- Button active state managed by Alpine store
- Alpine store synced with vanilla layout management

### Implementation Approach

1. Created Alpine store `panels` with `snippetVisible`, `editorVisible`, `previewVisible` flags
2. Converted toggle buttons to use `:class="{ 'active': $store.panels.XXX }"` and `@click="togglePanel()"`
3. Updated `togglePanel()` function to sync visibility changes with Alpine store
4. Updated `loadLayoutFromStorage()` to initialize Alpine store from localStorage
5. Removed vanilla event listener setup from app.js

### What Stays Vanilla

- Panel resizing logic (all width redistribution and drag-to-resize)
- Layout persistence to localStorage
- Keyboard shortcuts
- The `togglePanel()` function itself (but now syncs with Alpine store)

### Key Learnings

- Alpine store provides reactive button states
- Hybrid approach: Alpine handles UI reactivity, vanilla handles complex layout math
- Store acts as single source of truth for visibility, synced bidirectionally
- Kept existing layout management logic intact - Alpine only manages button states
- Net code reduction: ~8 lines (removed event listener setup)

---

## Phase 8: Toast Notifications (Optional) ✅ COMPLETE

**Status**: Done
**Files**: `src/js/config.js`, `index.html`

### What Was Converted

- Toast notification system with Alpine store and reactive rendering
- Toast queue managed in Alpine store
- Toasts rendered with `x-for` template
- Toast transitions managed via Alpine reactivity

### Implementation Approach

1. Created Alpine store `toasts` with:
   - `items` array to hold toast queue
   - `add(message, type)` method to create new toasts
   - `remove(id)` method to dismiss toasts
   - `getIcon(type)` helper for icon lookup
   - Auto-dismiss with setTimeout after 4 seconds
2. Updated `Toast` utility object to call Alpine store methods instead of DOM manipulation
3. Converted HTML to use `x-for` to render toasts from store
4. Used `:class` binding for show/hide animation states
5. Used `@click` for close button

### What Stays Vanilla

- Toast utility API (Toast.show, Toast.error, Toast.success, etc.)
- Auto-dismiss timing logic (now in Alpine store)
- Icon definitions

### Key Learnings

- Alpine `x-for` with templates provides clean list rendering
- Store manages toast queue reactively
- Visibility flag triggers CSS transitions
- Toast API unchanged - all existing code continues to work
- Net code reduction: ~30 lines of manual DOM manipulation removed
- Cleaner separation: store handles state, CSS handles animations

---

## Recommended Order

1. ✅ **Phase 1: Snippet Panel** - DONE
2. ✅ **Phase 2: Dataset Manager** - DONE
3. ✅ **Phase 3: View Mode Toggle** - DONE
4. ✅ **Phase 4: Settings Modal** - DONE
5. ✅ **Phase 6: Meta Fields** - DONE
6. ✅ **Phase 7: Panel Toggles** - DONE
7. **Phase 5: Chart Builder** - More complex (SKIPPED - not essential for migration)
8. ✅ **Phase 8: Toast Notifications** - DONE

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
