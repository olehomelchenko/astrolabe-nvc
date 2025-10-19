# CLAUDE.md

Instructions for Claude Code when working on this project.

## Project Overview

**Astrolabe** is a lightweight, browser-based snippet manager for Vega-Lite visualizations. Pure vanilla JavaScript, no build tools, retro Windows 2000 aesthetic.

## Architecture

- **Frontend-only**: HTML/CSS/JavaScript with CDN dependencies (Monaco Editor, Vega-Embed)
- **Storage**:
  - **Snippets**: localStorage (id, name, created, modified, spec, draftSpec, comment, tags, datasetRefs, meta)
  - **Datasets**: IndexedDB (unlimited size, multi-format: JSON/CSV/TSV/TopoJSON, inline & URL sources)
- **Structure**: Three resizable panels (snippet library, Monaco editor, live preview) + Dataset Manager modal
- **Deployment**: Web app files in `/web` folder; `/project-docs` folder contains development documentation
- **No build tools**: Open `web/index.html` directly in browser (needs local server for IndexedDB)

## Current Status

**Version**: 1.0.0 (Feature-complete MVP)
**Deployment**: Live at astrolabe-viz.com
**Mode**: Maintenance and iterative improvements

### Core Capabilities
- Snippet management with draft/published workflow
- Dataset library (IndexedDB) with multi-format support (JSON, CSV, TSV, TopoJSON)
- Dataset reference resolution in Vega-Lite specs
- User settings and theme system (Light, Dark Experimental)
- Import/export functionality for snippets and datasets
- Real-time search and multi-field sorting
- Cross-platform keyboard shortcuts
- Toast notification system
- Storage monitoring with visual warnings
- URL state management (shareable links, browser navigation)
- Bidirectional snippet ↔ dataset linking
- Table preview with type detection
- Extract inline data to datasets

See `project-docs/architecture.md` for complete technical details.

## Development Mode

Development is **iterative** based on:
- Bug reports and fixes
- User feedback and feature requests
- Performance optimization
- Cross-browser compatibility improvements
- Code quality enhancements

When implementing changes:
- Treat each issue/enhancement as an independent task
- Group related bugfixes in a single commit
- Update CHANGELOG.md for user-facing changes
- Test thoroughly across different browsers when possible
- Maintain backward compatibility with existing data

## Development Principles

- **Lean**: No frameworks, no build step, minimal dependencies
- **Maintainable**: Clean code organization with logical separation of concerns
- **Simple**: Favor code removal over addition; avoid over-engineering
- **Local-first**: All data stored in browser, no server dependencies

## General coding instructions (important)
- Astrolabe is a project with minimalistic philosophy; it tries to avoid external dependencies and complexity, if possible. This means that whatever new feature, refactor, or bug fix is being considered, the solution should not be over-engineered unless absolutely necessary. The importance and complexity of a feature defines allowed number of lines of code dedicated to it.
- Pay attention to the existing code base style and approaches and try to adhere to the existing style instead of bringing your own vision.
- When updating documentation, do not record intermediate changes - write them always as a matter-of-fact information.
- When working on the code, if you notice any opportunities to better bring the project to the state above - bring this to user's attention and ask for approval to implement the suggested changes.
- Testing: The user always tests changes manually. Do not start local servers or attempt to run the application.
