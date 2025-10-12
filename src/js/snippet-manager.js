// Snippet management and localStorage functionality

// Generate unique ID using Date.now() + random numbers
function generateSnippetId() {
    return Date.now() + Math.random() * 1000;
}

// Generate auto-populated name with current datetime
function generateSnippetName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Create a new snippet using Phase 0 schema
function createSnippet(spec, name = null) {
    const now = new Date().toISOString();

    return {
        id: generateSnippetId(),
        name: name || generateSnippetName(),
        created: now,
        modified: now,
        spec: spec,
        draftSpec: spec, // Initially same as spec
        comment: "",
        tags: [],
        datasetRefs: [],
        meta: {}
    };
}

// LocalStorage wrapper with error handling
const SnippetStorage = {
    STORAGE_KEY: 'astrolabe-snippets',

    // Save all snippets to localStorage
    saveSnippets(snippets) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snippets));
            return true;
        } catch (error) {
            console.error('Failed to save snippets to localStorage:', error);
            // TODO: Handle quota exceeded, show user error
            return false;
        }
    },

    // Load all snippets from localStorage
    loadSnippets() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load snippets from localStorage:', error);
            return [];
        }
    },

    // Get single snippet by ID
    getSnippet(id) {
        const snippets = this.loadSnippets();
        return snippets.find(snippet => snippet.id === id);
    },

    // Save single snippet (add or update)
    saveSnippet(snippet) {
        const snippets = this.loadSnippets();
        const existingIndex = snippets.findIndex(s => s.id === snippet.id);

        snippet.modified = new Date().toISOString();

        if (existingIndex >= 0) {
            snippets[existingIndex] = snippet;
        } else {
            snippets.push(snippet);
        }

        return this.saveSnippets(snippets);
    },

    // Delete snippet by ID
    deleteSnippet(id) {
        const snippets = this.loadSnippets();
        const filteredSnippets = snippets.filter(snippet => snippet.id !== id);
        return this.saveSnippets(filteredSnippets);
    },

    // Get all snippets sorted by modified date (newest first)
    listSnippets() {
        const snippets = this.loadSnippets();
        return snippets.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    }
};

// Initialize storage with default snippet if empty
function initializeSnippetsStorage() {
    const existingSnippets = SnippetStorage.loadSnippets();

    if (existingSnippets.length === 0) {
        // Create default snippet using the sample spec from config
        const defaultSnippet = createSnippet(sampleSpec, "Sample Bar Chart");
        defaultSnippet.comment = "A simple bar chart showing category values";

        SnippetStorage.saveSnippet(defaultSnippet);
        return [defaultSnippet];
    }

    return existingSnippets;
}

// Format date for display in snippet list
function formatSnippetDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Render snippet list in the UI
function renderSnippetList() {
    const snippets = SnippetStorage.listSnippets();
    const snippetList = document.querySelector('.snippet-list');
    const placeholder = document.querySelector('.placeholder');

    if (snippets.length === 0) {
        snippetList.innerHTML = '';
        placeholder.style.display = 'block';
        placeholder.textContent = 'No snippets found';
        return;
    }

    placeholder.style.display = 'none';

    snippetList.innerHTML = snippets.map(snippet => `
        <li class="snippet-item" data-snippet-id="${snippet.id}">
            <div class="snippet-name">${snippet.name}</div>
            <div class="snippet-date">${formatSnippetDate(snippet.modified)}</div>
        </li>
    `).join('');

    // Re-attach event listeners for snippet selection
    attachSnippetEventListeners();
}

// Attach event listeners to snippet items
function attachSnippetEventListeners() {
    const snippetItems = document.querySelectorAll('.snippet-item');
    snippetItems.forEach(item => {
        item.addEventListener('click', function () {
            const snippetId = parseFloat(this.dataset.snippetId);
            selectSnippet(snippetId);
        });
    });
}

// Select and load a snippet into the editor
function selectSnippet(snippetId) {
    const snippet = SnippetStorage.getSnippet(snippetId);
    if (!snippet) return;

    // Update visual selection
    document.querySelectorAll('.snippet-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-snippet-id="${snippetId}"]`).classList.add('selected');

    // Load draft spec into editor
    if (editor) {
        editor.setValue(JSON.stringify(snippet.draftSpec, null, 2));
    }

    // Store currently selected snippet ID globally
    window.currentSnippetId = snippetId;
}