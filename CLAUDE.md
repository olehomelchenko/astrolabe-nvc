# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astrolabe is a lightweight, browser-based snippet manager for Vega-Lite visualizations. It's designed as a local-first application with minimal dependencies - vanilla JavaScript, no build tools, and direct CDN imports.

## Architecture

- **Frontend-only**: Pure HTML/CSS/JavaScript with no build process
- **Storage**: localStorage (initial), planned migration to IndexedDB for scale
- **Key Dependencies**: Monaco Editor and Vega-Embed loaded via CDN
- **Structure**: Three-panel resizable interface (snippet library, editor, preview)

## Development Commands

This project uses no build tools or package managers. Development is done by:
- Opening `index.html` directly in a browser
- Using browser dev tools for debugging
- No npm, yarn, or build commands needed

## Core Data Model

The application centers around two main entities:
- **Snippets**: `{id, name, created, modified, spec, draftSpec, comment, tags[], datasetRefs[], published}`
- **Datasets**: `{id, name, created, modified, data, format, size}`

## Development Phases

The project follows a structured 14-phase development plan (see docs/dev-plan.md):
- Phase 0: Storage architecture design
- Phase 1-4: Basic UI layout and editor integration
- Phase 5-7: Data persistence and draft/publish workflow
- Phase 8-12: Polish and advanced features
- Phase 13-14: Future enhancements (search, cloud sync)

**Current Status**: Phase 0 - Storage Architecture Design

## Key Design Principles

- **Lean**: No frameworks, no build step, minimal dependencies
- **Local-first**: All data stored in browser initially
- **Developer-friendly**: Full JSON schema support with Monaco Editor
- **Safe experimentation**: Draft/published workflow prevents data loss

## File Structure

Currently minimal:
- `docs/dev-plan.md` - Complete development roadmap
- Future: `index.html`, CSS, and JavaScript files in root