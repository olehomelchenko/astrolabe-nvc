# CLAUDE.md

Instructions for Claude Code when working on this project.

## Project Overview

**Astrolabe** is a lightweight, browser-based snippet manager for Vega-Lite visualizations. Pure vanilla JavaScript, no build tools, retro Windows 2000 aesthetic.

## Architecture

- **Frontend-only**: HTML/CSS/JavaScript with CDN dependencies (Monaco Editor, Vega-Embed)
- **Storage**: localStorage with Phase 0 schema (id, name, created, modified, spec, draftSpec, comment, tags, datasetRefs, meta)
- **Structure**: Three resizable panels (snippet library, Monaco editor, live preview)
- **No build tools**: Open `index.html` directly in browser

## Current Status

**Completed**: Phases 0-9 (All core functionality including import/export)
**Next**: Phase 10 - Dataset Management

See `docs/dev-plan.md` for complete roadmap and technical details.
