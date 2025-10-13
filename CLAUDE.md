# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astrolabe is a lightweight, browser-based snippet manager for Vega-Lite visualizations. It's designed as a local-first application with minimal dependencies - vanilla JavaScript, no build tools, and direct CDN imports.

## Architecture

- **Frontend-only**: Pure HTML/CSS/JavaScript with no build process
- **Storage**: localStorage (initial), planned migration to IndexedDB for scale
- **Key Dependencies**: Monaco Editor and Vega-Embed loaded via CDN
- **Structure**: Three-panel resizable interface (snippet library, editor, preview)
- **Styling**: Retro Windows 2000 aesthetic with square edges and classic colors

## Development Commands

This project uses no build tools or package managers. Development is done by:
- Opening `index.html` directly in a browser
- Using browser dev tools for debugging
- No npm, yarn, or build commands needed

## Current Features

### ✅ **Core Interface** (Phases 1-4)
- **Three-panel layout**: Resizable snippet library, Monaco editor, live preview
- **Panel controls**: Toggle buttons (📄 ✏️ 👁️) for show/hide with proportional expansion
- **Resize handles**: Drag to adjust panel widths with memory system
- **Monaco Editor**: Full JSON schema validation for Vega-Lite with autocomplete
- **Live preview**: Debounced Vega-Lite rendering with error handling

### ✅ **Data Management** (Phases 5-6)
- **localStorage persistence**: Robust snippet storage with error handling
- **Auto-save system**: Debounced draft saving for both specs and metadata
- **CRUD operations**: Create, read, update, delete with visual feedback
- **Ghost card interface**: "Create New Snippet" card at top of list
- **Smart timestamps**: Auto-generated names using ISO datetime format

### ✅ **Advanced Organization**
- **Multi-field sorting**: Sort by Modified/Created/Name with ascending/descending toggle
- **Visual sort indicators**: Arrow icons (⬇⬆) showing current sort direction
- **Comprehensive search**: Filter by name, comment, and spec content with real-time results
- **Search integration**: Works seamlessly with sorting and maintains selection
- **Settings persistence**: Sort preferences and UI state saved to localStorage

### ✅ **User Experience Enhancements**
- **Metadata panel**: Shaded section with inline name editing, comments, and timestamp info
- **Operation buttons**: Duplicate and Delete buttons in metadata panel
- **Smart state management**: Maintains selection during operations, clears when filtered out
- **Performance optimizations**: Prevents auto-save/render timeouts during snippet switching
- **Intuitive interactions**: Right-click removed in favor of accessible button controls

## Core Data Model

**Snippets**: `{id, name, created, modified, spec, draftSpec, comment, tags[], datasetRefs[], meta}`
**Settings**: `{sortBy, sortOrder, panelWidths[], panelVisibility[], autoSaveDelay, meta}`

## Development Phases

**Current Status**: Enhanced Phase 6 - Advanced Snippet Management

**Completed Phases**:
- ✅ **Phase 0**: Storage Architecture Design
- ✅ **Phase 1**: Static HTML Structure with retro styling
- ✅ **Phase 2**: Resizable Panels with memory system
- ✅ **Phase 3**: Monaco Editor Integration with Vega-Lite schema
- ✅ **Phase 4**: Vega-Lite Rendering with live preview
- ✅ **Phase 5**: Data Model + LocalStorage with comprehensive snippet storage
- ✅ **Phase 6+**: Enhanced CRUD with sorting, searching, and advanced UX

**Next Phase**: Phase 7 - Draft/Published Workflow

## Key Design Principles

- **Lean**: No frameworks, no build step, minimal dependencies
- **Local-first**: All data stored in browser with robust error handling
- **Developer-friendly**: Full JSON schema support with Monaco Editor
- **Safe experimentation**: Auto-save drafts with future draft/publish workflow
- **Performance-focused**: Debounced operations and smart state management
- **Retro aesthetic**: Consistent Windows 2000 styling throughout

## File Structure

```
/
├── index.html                 # Main application entry point & initialization
├── src/
│   ├── styles.css            # Retro Windows 2000 styling
│   └── js/                   # Modular JavaScript organization
│       ├── config.js         # Global variables, settings & sample data
│       ├── snippet-manager.js # Snippet storage, CRUD & localStorage wrapper
│       ├── panel-manager.js  # Panel resize, toggle & memory system
│       ├── editor.js         # Monaco Editor & Vega-Lite rendering
│       └── app.js           # Event handlers & coordination
└── docs/
    ├── dev-plan.md          # Complete development roadmap
    └── storage-examples.md  # Data model specifications
```

## Technical Notes

- **AMD Conflicts**: Resolved between Monaco Editor and Vega libraries using UMD builds
- **State Management**: Global flags prevent unwanted timeouts during programmatic updates
- **Memory System**: Panels remember preferred sizes across hide/show cycles
- **Search Performance**: 300ms debounced input with smart result caching
- **Auto-save Logic**: 1-second debounce for user edits, immediate for snippet switching