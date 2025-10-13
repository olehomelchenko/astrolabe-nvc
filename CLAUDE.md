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
- **No build tools**: Open `index.html` directly in browser (needs local server for IndexedDB)

## Current Status

**Completed**: Phases 0-10 (Core functionality + Dataset Management)
**Next**: Phase 11 - Advanced Dataset Features (optional enhancements)

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

See `docs/dev-plan.md` for complete roadmap and technical details.
