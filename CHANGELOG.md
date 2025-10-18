# Changelog

All notable changes to Astrolabe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2025-10-15

### Initial Release

Complete feature set for lightweight Vega-Lite snippet management.

#### Core Features
- Three-panel resizable layout with drag handles and panel memory
- Monaco Editor v0.47.0 with Vega-Lite v5 schema validation and autocomplete
- Live Vega-Lite preview with debounced rendering
- Draft/published workflow for safe experimentation
- Auto-save system with 1-second debounce
- Multi-field sorting (Modified/Created/Name) with direction toggle
- Real-time search across snippet name, comment, and spec content
- Snippet size display for large snippets (≥1KB)

#### Storage & Data Management
- localStorage-based snippet storage with 5MB monitoring
- IndexedDB-based dataset library (unlimited size)
- Multi-format dataset support: JSON, CSV, TSV, TopoJSON
- Multi-source dataset support: inline data and URL references
- Automatic dataset reference resolution in Vega-Lite specs
- Intelligent format auto-detection with confidence scoring
- Storage usage monitor with visual warnings (90% and 95% thresholds)

#### Dataset Features
- Full CRUD operations for datasets
- Automatic metadata calculation (rows, columns, size, types)
- URL dataset fetching with CORS error handling
- Metadata refresh for URL datasets
- Bidirectional snippet ↔ dataset linking with usage tracking
- Extract inline data from specs to dataset library
- Table preview with type detection (number 🔢, date 📅, boolean ✓, text 🔤)
- On-demand URL preview loading with session cache
- Create new snippet from dataset with auto-generated spec

#### Import/Export
- Export all snippets to JSON with auto-generated filename
- Import snippets with format auto-detection and field mapping
- Export/import datasets with format-specific file extensions
- URL dataset export fetches and downloads live content
- Additive import (no overwrites) with ID conflict resolution
- Automatic "imported" tag for external snippets

#### User Experience
- Cross-platform keyboard shortcuts (Cmd/Ctrl+Shift+N, Cmd/Ctrl+K, Cmd/Ctrl+S, Escape)
- Toast notification system (error, success, warning, info)
- Comprehensive tooltips with keyboard hints
- Enhanced Help modal with 6 sections (About, Features, Getting Started, Shortcuts, Storage, Privacy)
- Retro Windows 2000 aesthetic throughout UI

#### Settings & Customization
- Configurable editor options (font size 10-18px, tab size, minimap, word wrap, line numbers)
- Performance tuning (render debounce delay 300-3000ms)
- Date formatting options (smart/relative, locale, ISO, custom with tokens)
- Theme selection (Light, Dark Experimental)
- Automatic editor theme synchronization with UI theme
- Settings persistence in localStorage

#### URL State Management
- Hash-based routing for snippets and datasets
- Browser back/forward navigation support
- Page reload preserves selected snippet or dataset
- Shareable URLs for specific snippets or datasets
- Modal state persistence in URL

#### Technical Implementation
- Vanilla JavaScript (no frameworks, no build tools)
- AMD loader conflict resolution between Monaco and Vega
- Recursive dataset reference extraction
- Format-aware data injection for rendering
- Blob API for accurate storage size calculation
- Component-based CSS architecture with theming support

---

## [Unreleased]

### Fixed
- (Bugfixes will be listed here)

### Added
- (New features will be listed here)

### Changed
- (Improvements and refinements will be listed here)

### Removed
- (Removed features will be listed here)

---

## Release Notes

### v1.0.0 - Feature-Complete MVP

Astrolabe v1.0 represents a complete, production-ready implementation of a browser-based Vega-Lite snippet manager. The application is fully functional with no known critical bugs.

**Development Timeline**: October 2024 - October 2025

**Key Accomplishments**:
- Zero external dependencies (beyond CDN libraries)
- No build tools required
- 100% local-first architecture
- Comprehensive dataset management system
- Professional UX with keyboard shortcuts and notifications

**Known Limitations**:
- Experimental dark theme has minor visibility issues
- No cross-device synchronization (future feature)
- Storage limited to browser (no cloud backup)
- Primarily tested in Chrome/Chromium browsers

**Browser Compatibility**:
- Chrome/Chromium: Fully tested and supported
- Firefox: Likely compatible, not exhaustively tested
- Safari: Likely compatible, not exhaustively tested
- IE11: Not supported (requires modern ES6+ features)

---

## Upgrade Guide

### From Pre-Release to v1.0

No migration required. All features are additive and backward-compatible with any data created during development.

**Data Compatibility**:
- Snippets in localStorage: No changes to schema
- Datasets in IndexedDB: No changes to schema
- Settings in localStorage: New settings added with defaults

**New Settings** (automatically applied):
- `editor.fontSize`: Default 14px
- `editor.tabSize`: Default 2
- `editor.minimap`: Default true
- `editor.wordWrap`: Default 'on'
- `editor.lineNumbers`: Default 'on'
- `dateFormat`: Default 'smart'
- `renderDebounceDelay`: Default 1500ms
- `theme`: Default 'light'

---

## Future Roadmap

Planned features based on user feedback and enhancement proposals:

### Short-term (Maintenance)
- Cross-browser compatibility testing and fixes
- Dark theme visibility improvements
- Performance optimization for large datasets
- Additional keyboard shortcuts

### Medium-term (Enhancements)
- Advanced tagging system with tag filtering
- Snippet templates and starter library
- Bulk operations (delete multiple, export selected)
- Drag-and-drop import for snippets and datasets
- Snippet duplication with customizable naming

### Long-term (Major Features)
- Authentication and user accounts
- Cloud synchronization
- Snippet sharing via URL
- Public snippet gallery (optional)
- Collaborative editing

See [GitHub Issues](https://github.com/olehomelchenko/astrolabe-nvc/issues) for active feature requests and bug reports.
