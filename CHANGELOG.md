# Changelog

All notable changes to Astrolabe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

**Note**: Astrolabe is currently in alpha (pre-1.0) development. Version numbers below 1.0.0 indicate active development status. A stable 1.0 release will occur after public launch and thorough testing.

---
## [Unreleased]

### Added
- (New features currently in development)

### Fixed
- (Bugfixes will be listed here)

### Changed
- (Improvements and refinements will be listed here)

### Removed
- (Removed features will be listed here)

---
## [0.4.0] - 2025-11-26

### Changed
- **Alpine.js Integration**: Migrated interactive UI components to Alpine.js framework for improved reactivity and maintainability
  - Chart Builder controls now use Alpine.js reactive data binding
  - Preview Panel fit mode controls migrated to Alpine stores
  - Toast notification system backed by Alpine store with declarative rendering
  - Simplified state management with reactive Alpine stores
  - No user-facing behavior changes (internal architecture refactor)
  - Improved code organization and reduced DOM manipulation complexity

---
## [0.2.0] - 2025-11-17

### Added
- **Visual Chart Builder**: Create Vega-Lite visualizations without writing JSON
  - Access via "Build Chart" button in dataset details panel
  - Support for 5 mark types: Bar, Line, Point, Area, Circle
  - Map dataset columns to encoding channels: X, Y, Color, Size
  - 4 data type options per encoding: Quantitative, Ordinal, Nominal, Temporal
  - Smart defaults based on column type detection
  - Live preview with debounced rendering
  - Width/Height dimension controls
  - Validation with helpful error messages
  - URL state support (`#datasets/dataset-123/build`)
  - Browser back/forward navigation integrated
  - Creates snippets with auto-generated names and dataset references
- **Progressive Web App (PWA) Support**: Install Astrolabe as standalone app with offline functionality
  - Service worker caches all application files and CDN dependencies
  - Full offline access after initial load
  - Install button in browser for desktop/mobile installation
  - Runs in standalone window without browser chrome
  - "Add to Home Screen" support on iOS/Android
  - Automatic cache updates when app version changes
  - Works seamlessly with existing IndexedDB and localStorage

---
## [0.1.0] - 2025-10-15

### Added

Initial alpha release with complete feature set for lightweight Vega-Lite snippet management.

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

## Release Notes

### Alpha Development Status

Astrolabe is currently in alpha (pre-1.0) development. The application is feature-complete and functional, but has not been publicly released or extensively tested across all browsers and platforms.

**Development Timeline**: October 2024 - November 2025

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

## Data Compatibility

All alpha versions maintain backward compatibility. Snippets (localStorage), datasets (IndexedDB), and settings persist across updates with no migration required.

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
