# CLAUDE.md

Instructions for Claude Code when working on this project.

## Project Overview

**Astrolabe** is a lightweight, browser-based snippet manager for Vega-Lite visualizations. Pure vanilla JavaScript, no build tools, retro Windows 2000 aesthetic.

## Architecture

- **Frontend-only**: HTML/CSS/JavaScript with CDN dependencies (Monaco Editor, Vega-Embed)
- **Storage**:
  - **Snippets**: localStorage with Phase 0 schema (id, name, created, modified, spec, draftSpec, comment, tags, datasetRefs, meta)
  - **Datasets**: IndexedDB (unlimited size, multi-format: JSON/CSV/TSV/TopoJSON, inline & URL sources)
- **Structure**: Three resizable panels (snippet library, Monaco editor, live preview) + Dataset Manager modal
- **Deployment**: Web app files in `/web` folder; `/docs` folder contains development documentation only
- **No build tools**: Open `web/index.html` directly in browser (needs local server for IndexedDB)

## Current Status

**Completed**: Phases 0-13 (Core functionality + Dataset Management + Advanced Dataset Features + Polish & UX Refinements)
**In Progress**: GitHub Pages deployment preparation
**Next**: Phase 14 - Advanced Snippet Features or additional refinements

### Key Features Implemented
- ✅ Snippet management with draft/published workflow
- ✅ Multi-field sorting and real-time search
- ✅ Storage monitoring and import/export
- ✅ **Dataset management with IndexedDB**
  - Multi-format support (JSON, CSV, TSV, TopoJSON)
  - Multi-source support (inline data, URL references)
  - Automatic metadata calculation and URL fetching
  - Dataset reference resolution in Vega-Lite specs
  - Modal UI with button-group selectors
- ✅ **Advanced Dataset Features (Phase 12)**
  - Bidirectional snippet ↔ dataset linking with usage tracking
  - Extract inline data to datasets
  - Import/Export datasets with auto-format detection
  - Table preview with type detection (🔢📅🔤✓)
  - On-demand URL preview loading with caching
- ✅ **Polish & UX Features (Phase 13)**
  - Cross-platform keyboard shortcuts (Cmd/Ctrl+Shift+N, Cmd/Ctrl+K, Cmd/Ctrl+S, Escape)
  - Toast notification system (error, success, warning, info)
  - Comprehensive tooltips on all interactive elements
  - Enhanced Help modal with 6 sections (About, Features, Getting Started, Shortcuts, Storage, Privacy)
  - Data persistence warnings
  - **User Settings System**
    - Configurable editor options (font size 10-18px, tab size, minimap, word wrap, line numbers)
    - Performance tuning (render debounce delay 300-3000ms)
    - Date formatting options (smart/relative, locale, ISO, custom with tokens)
    - UI theme selection (Light, Dark Experimental)
  - **Theme System**
    - Light theme (Windows 2000 classic aesthetic)
    - Experimental dark theme with CSS variables for theming
    - Automatic editor theme synchronization with UI theme

See `docs/dev-plan.md` for complete roadmap and technical details.

## Development Principles

- **Iterative**: Each phase produces working, testable functionality
- **Lean**: No frameworks, no build step, minimal dependencies
- **Maintainable**: Clean code organization with logical separation of concerns
- **Simple**: Favor code removal over addition; avoid over-engineering

## General coding instructions 
Astrolabe is a project with minimalistic philosophy; it tries to avoid external dependencies and complexity, if possible.
This means that whatever new feature, refactor, or bug fix is being considered, the solution should not be over-engineered unless absolutely necessary. The importance and complexity of a feature defines allowed number of lines of code dedicated to it.
Pay attention to the existing code base style and approaches and try to adhere to the existing style instead of bringing your own vision.
When updating documentation, do not record intermediate changes - write them always as a matter-of-fact information.
When working on the code, if you notice any opportunities to better bring the project to the state above - bring this to user's attention and ask for approval to implement the suggested changes.
