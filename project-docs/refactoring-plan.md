# Astrolabe Refactoring Plan

**Date:** 2025-10-19
**Goal:** Reduce code duplication and improve maintainability while preserving simplicity
**Expected Impact:** Reduce codebase by ~400-500 lines (~7-10%)

---

## High Impact, Low Effort Refactorings

### 1. Consolidate Event Handlers in app.js
**Current:** 795 lines with ~200 lines of repetitive addEventListener calls
**Target:** ~650-700 lines
**Savings:** ~100-150 lines

#### Issues:
- Lines 118-434 are primarily boilerplate event registration
- Repetitive patterns for modal open/close
- Each modal has dedicated open/close functions that just toggle display
- Event listeners attached individually to each button

#### Implementation:
```javascript
// Generic modal manager
const ModalManager = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      this.trackOpen(modalId);
    }
  },
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },
  trackOpen(modalId) {
    const trackingMap = {
      'help-modal': 'modal-help',
      'donate-modal': 'modal-donate',
      'settings-modal': 'modal-settings',
      'dataset-modal': 'modal-dataset'
    };
    if (trackingMap[modalId]) {
      Analytics.track(trackingMap[modalId], `Open ${modalId}`);
    }
  }
};

// Event delegation for modal closes
document.addEventListener('click', (e) => {
  // Close buttons
  if (e.target.matches('[id$="-modal-close"]')) {
    const modalId = e.target.id.replace('-close', '');
    ModalManager.close(modalId);
  }
  // Overlay clicks
  if (e.target.classList.contains('modal')) {
    ModalManager.close(e.target.id);
  }
});
```

#### Files to modify:
- `src/js/app.js` - Consolidate modal handlers

---

### 2. Better Utilize generic-storage-ui.js
**Current:** generic-storage-ui.js exists but is underused
**Target:** Apply consistently across snippet-manager.js and dataset-manager.js
**Savings:** ~100-150 lines

#### Issues:
- Both managers have duplicate patterns for:
  - List rendering with item selection
  - Linked item display
  - Modal management
  - Form validation
  - Delete confirmations
- generic-storage-ui.js has the abstractions but they're not fully applied

#### Duplicated Functions to Consolidate:

**Snippet Manager:**
- `renderSnippetList()` → Use `renderGenericList()`
- `attachSnippetEventListeners()` → Integrated into generic renderer
- `selectSnippet()` → Use `selectGenericItem()`
- `updateLinkedDatasets()` → Already uses `updateGenericLinkedItems()` ✓
- `deleteSnippet()` → Already uses `confirmGenericDeletion()` ✓

**Dataset Manager:**
- `renderDatasetList()` → Use `renderGenericList()`
- `attachDatasetEventListeners()` → Integrated into generic renderer
- `selectDataset()` → Use `selectGenericItem()`
- `updateLinkedSnippets()` → Use `updateGenericLinkedItems()`
- `deleteCurrentDataset()` → Use `confirmGenericDeletion()`

#### Implementation Strategy:
1. Enhance `renderGenericList()` to handle ghost cards (e.g., "Create New Snippet")
2. Add optional transformer for list items (format functions)
3. Ensure `selectGenericItem()` handles both numeric and string IDs
4. Update both managers to use generic functions consistently

#### Files to modify:
- `src/js/generic-storage-ui.js` - Enhance existing functions
- `src/js/snippet-manager.js` - Apply generic list/select functions
- `src/js/dataset-manager.js` - Apply generic list/select functions

---

### 3. Simplify user-settings.js
**Current:** 300 lines with complex dot-path API
**Target:** ~220-250 lines
**Savings:** ~50-80 lines

#### Issues:
- Dot-path API (`getSetting('editor.fontSize')`) is over-engineered for ~10 settings
- `validateSetting()` has 40 lines for simple validation
- Import/export functions (30 lines) appear unused
- Path parsing logic (20 lines) in getter/setter

#### Implementation:
```javascript
// Simpler API - direct property access
const settings = getSettings();
settings.editor.fontSize = 14;
saveSettings();

// Or keep helper but simplify:
function getSetting(path) {
  const [section, key] = path.split('.');
  return userSettings?.[section]?.[key];
}

function updateSetting(path, value) {
  const [section, key] = path.split('.');
  if (userSettings[section]) {
    userSettings[section][key] = value;
    return saveSettings();
  }
  return false;
}
```

#### Changes:
1. Simplify getter/setter - assume 2-level structure (section.key)
2. Inline validation - check ranges directly in `updateSettings()`
3. Remove import/export if unused (check usage first)
4. Keep `formatDate()` logic - it's used throughout UI

#### Files to modify:
- `src/js/user-settings.js` - Simplify API and validation

---

## Medium Impact, Medium Effort (Future)

### 4. Refactor config.js into Focused Modules
**Current:** 257 lines of mixed concerns
**Target:** Split into 3-4 focused files
**Savings:** 0 LOC, but improves organization

#### Proposed Structure:
```
src/js/
  state.js          - URLState, global variables (editor, currentSnippetId, etc.)
  ui-utils.js       - Toast, formatBytes, ModalManager
  analytics.js      - Analytics wrapper
  defaults.js       - sampleSpec, constants (STORAGE_LIMIT_BYTES, etc.)
```

#### Benefits:
- Easier to find utilities
- Clearer dependencies
- Better mental model of what's "global"

#### Files to create/modify:
- Create: `src/js/state.js`, `src/js/ui-utils.js`, `src/js/analytics.js`, `src/js/defaults.js`
- Modify: `src/js/config.js` (delete after migration)
- Update: `index.html` script tags

---

### 5. Extract snippet-drafts.js from snippet-manager.js
**Current:** snippet-manager.js at 1393 lines handles many concerns
**Target:** Split draft workflow into separate module
**Savings:** 0 LOC, but improves maintainability

#### Functions to Extract:
- `loadSnippetIntoEditor()`
- `updateViewModeUI()`
- `switchViewMode()`
- `publishDraft()`
- `revertDraft()`
- `autoSaveDraft()`
- `debouncedAutoSave()`
- `initializeAutoSave()`

**Lines:** ~200-250 lines → `snippet-drafts.js`

#### Benefits:
- Easier to work on CRUD without draft complexity
- Draft workflow becomes a clear, separate concern
- Reduces cognitive load when reading snippet-manager.js

#### Files to create/modify:
- Create: `src/js/snippet-drafts.js`
- Modify: `src/js/snippet-manager.js` (remove draft functions)
- Update: `index.html` script tag order

---

## Implementation Order

### Phase 1: High Impact, Low Effort (This Session)
1. ✅ Create this refactoring plan
2. ✅ Consolidate event handlers in app.js (795 → 672 lines, -123)
3. ✅ Simplify user-settings.js (300 → 224 lines, -76)
4. ✅ Added ModalManager to config.js (257 → 303 lines, +46)
5. ⏸️ Enhance and apply generic-storage-ui.js (IN PROGRESS)

**Net Savings So Far: 153 lines (2.5% reduction)**

### Phase 2: Medium Effort (Future Session)
5. Refactor config.js into focused modules
6. Extract snippet-drafts.js

---

## Testing Strategy

After each refactoring step:
1. Open `index.html` in browser
2. Test core workflows:
   - Create/edit/delete snippet
   - Create/edit/delete dataset
   - Draft/publish workflow
   - Search and sort snippets
   - Import/export snippets
   - Settings modal
   - All keyboard shortcuts
3. Check browser console for errors
4. Verify localStorage and IndexedDB persistence

---

## Rollback Strategy

- Each refactoring committed separately
- Git tags for each major step
- Can revert individual changes via `git revert`

---

## Success Metrics

- **LOC Reduction:** 400-500 lines (~7-10%)
- **Duplication:** Near-zero between snippet/dataset managers
- **Complexity:** event handlers reduced from ~30 to ~10
- **Maintainability:** Adding dataset search becomes trivial (reuse snippet search pattern)
- **Philosophy:** Code size better matches feature importance

---

## Notes

- Keep changes incremental and testable
- Preserve all existing functionality
- Don't introduce new dependencies
- Maintain vanilla JS approach
- Update comments for clarity
