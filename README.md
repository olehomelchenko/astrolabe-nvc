# Astrolabe – Vega-Lite Snippet Manager

A lightweight, browser-based snippet manager for Vega-Lite visualizations. Organize, edit, and preview visualization specs without leaving your browser.

## Key Features

- **Visual chart builder**: Create charts without writing JSON – select mark type, map fields to encodings, and see live preview
- **Draft/published workflow**: Experiment safely without losing your working version
- **Dataset library**: Store and reuse datasets across snippets (JSON, CSV, TSV, TopoJSON)
- **Import/export**: Back up your work or move it between browsers
- **Search and ordering**: Find snippets by name, comment, or spec content
- **Configurable settings**: Editor options, performance tuning, date formatting, light/dark themes
- **Privacy-first**: All data stored locally in your browser; no server, no tracking of personal data

## Architecture

- **Frontend-only**: HTML/CSS/JavaScript with CDN dependencies (Monaco Editor, Vega-Embed)
- **Storage**:
  - Snippets in localStorage (5 MB limit, shared across all snippets)
  - Datasets in IndexedDB (effectively unlimited)
- **No build tools**: Open `web/index.html` directly or deploy from `/web` folder to GitHub Pages
- **Minimal dependencies**: Vanilla JavaScript; all libraries loaded from HTTPS CDN

## Implementation Notes

**This project was implemented almost entirely using Claude Code.** The author is passionate about data visualization but not a professional web developer - using Claude Code made it possible to deliver a useful tool for the community without requiring years of full-stack development experience and months of development. This brings both benefits and limitations:

### ✅ Benefits
- Rapid prototyping and feature delivery
- Comprehensive documentation and code comments
- Fast iteration

### ⚠️ Drawbacks & Known Issues

2. **Potential Code Quality Issues**
   - Large monolithic JavaScript files with no strict control over reusability
   - May benefit from further refactoring or module bundling
   - Some edge cases may not be thoroughly tested (looking for user feedback here)

3. **Limited Browser Testing**
   - Primarily tested in Chrome/Chromium
   - Firefox and Safari support is likely but not exhaustively verified
   - Cross-browser CSS issues may exist

4. **Performance Considerations**
   - No code splitting or lazy loading
   - All libraries loaded upfront (Monaco Editor is ~5MB)
   - May be slow on low-bandwidth connections

5. **AI-Generated Code Characteristics**
   - Some defensive patterns or redundant checks
   - Possible over-engineering in certain areas
   - Documentation may be more verbose than necessary

## Getting Started

### For Users
1. Visit the live demo: [astrolabe-viz.com](https://astrolabe-viz.com/)
2. Create a new snippet or import existing ones
3. Edit and preview Vega-Lite specs
4. Export your work as JSON for backup

### For Developers
1. Clone the repository
2. Run a local web server (e.g., `python -m http.server` or `npx http-server`)
3. Open `web/index.html` in your browser
4. Explore the code in `web/src/`:
   - `app.js` – Application initialization and event handlers
   - `snippet-manager.js` – Snippet CRUD operations
   - `dataset-manager.js` – Dataset management with IndexedDB
   - `chart-builder.js` – Visual chart builder for creating specs from datasets
   - `user-settings.js` – Settings persistence and validation
   - `editor.js` – Monaco Editor and Vega-Lite rendering
   - `panel-manager.js` – Resizable layout and persistence
   - `config.js` – Global configuration and sample data
   - `styles.css` – Retro UI aesthetic with CSS variables

## Documentation

- **`project-docs/architecture.md`** – Technical reference: data schemas, implementation patterns, and system architecture
- **`project-docs/features-list.md`** – Complete feature inventory and code organization
- **`project-docs/storage-examples.md`** – Data structure examples and storage schema
- **`CHANGELOG.md`** – Version history and release notes
- **`CLAUDE.md`** – Project context and development guidelines (for AI assistants)

## Known Limitations & Feedback

### Known Issues
- **Data persistence**: All snippets and datasets are stored locally. Clearing browser cache will delete everything.
- **Storage limits**: Snippets are limited to 5 MB total (shared localStorage). Datasets use IndexedDB and have much higher limits.
- **Experimental dark theme**: Has minor visibility issues in some UI components.
- **No cross-device sync**: Data doesn't sync between browsers or devices.

### We'd Love Your Feedback!

Found a bug? Have a feature request? Want to report a UI issue?

**Please open an issue** on [GitHub Issues](https://github.com/olehomelchenko/astrolabe-nvc/issues) with:
- What you were trying to do
- What happened instead
- Browser and OS (e.g., Chrome 120 on macOS)
- Steps to reproduce (if applicable)

Especially helpful:
- Dark theme visibility issues
- Cross-browser compatibility problems
- Performance issues or slow loading times
- Unexpected behavior with dataset references or imports

## Contributing

This project is open to contributions! Areas that could use help:

1. **Code refactoring** – Breaking down large files, improving modularity
2. **Cross-browser testing** – Verifying Firefox and Safari support
3. **Performance optimization** – Reducing bundle size, lazy loading
4. **Dark theme polish** – Fixing remaining visibility issues
5. **Testing** – Adding unit or integration tests
6. **Documentation** – Improving code comments or user guides

## License

This project uses MIT license.

## Trademark

**Astrolabe** and the 🔭 logo are part of this project. Feel free to use the name and logo in forks, derivatives, or discussions about this project, following standard open-source conventions. If you create a significant fork or adaptation, consider using a distinct name to avoid confusion.

## Tech Stack

- **Editor**: Monaco Editor with Vega-Lite v5 JSON schema
- **Visualization**: Vega-Embed for rendering Vega-Lite specs
- **Storage**: localStorage (snippets) + IndexedDB (datasets)
- **UI**: Vanilla CSS with retro UX aesthetic
- **Analytics**: GoatCounter (privacy-friendly, GDPR-compliant)

## Future Roadmap

Planned improvements based on user feedback:

**Short-term** (Maintenance & Polish):
- Cross-browser compatibility testing and fixes
- Dark theme visibility improvements
- Performance optimization for large datasets
- Additional keyboard shortcuts and UX refinements

**Medium-term** (Feature Enhancements):
- Advanced tagging system with tag filtering
- Snippet templates and starter library
- Bulk operations (delete multiple, export selected)
- Drag-and-drop import for snippets and datasets

**Long-term** (Major Features):
- Authentication & cloud sync (optional backend integration)
  - **Note**: Will not be implemented via AI editors due to security concerns with personal data. Contributors welcome for this milestone!
- Snippet sharing via URL
- Public snippet gallery (optional)
- Collaborative editing

See [CHANGELOG.md](CHANGELOG.md) for detailed roadmap and [GitHub Issues](https://github.com/olehomelchenko/astrolabe-nvc/issues) for active feature requests and bug reports.

---

**Made by Oleh Omelchenko** for data visualization enthusiasts
