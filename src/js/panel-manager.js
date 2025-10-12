// Panel toggle and expansion functions
function updatePanelMemory() {
    const snippetPanel = document.getElementById('snippet-panel');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    // Only update memory for visible panels
    if (snippetPanel.style.display !== 'none') {
        panelMemory.snippetWidth = snippetPanel.style.width || '25%';
    }
    if (editorPanel.style.display !== 'none') {
        panelMemory.editorWidth = editorPanel.style.width || '50%';
    }
    if (previewPanel.style.display !== 'none') {
        panelMemory.previewWidth = previewPanel.style.width || '25%';
    }
}


function togglePanel(panelId) {
    console.log('🔘 Toggle clicked for:', panelId);

    // Fix ID mapping - buttons use plural, panels use singular
    const panelIdMap = {
        'snippets': 'snippet-panel',
        'editor': 'editor-panel',
        'preview': 'preview-panel'
    };

    const actualPanelId = panelIdMap[panelId];
    const panel = document.getElementById(actualPanelId);
    const button = document.getElementById('toggle-' + panelId);

    console.log('🔍 Looking for panel:', actualPanelId, 'Found:', !!panel);
    console.log('🔍 Looking for button:', 'toggle-' + panelId, 'Found:', !!button);

    if (!panel || !button) {
        console.error('❌ Panel or button not found!');
        return;
    }

    console.log('📏 BEFORE toggle - Panel widths:');
    logCurrentWidths();

    if (panel.style.display === 'none') {
        console.log('👁️ SHOWING panel:', panelId);
        // Show panel
        panel.style.display = 'flex';
        button.classList.add('active');

        // Restore from memory and redistribute
        redistributePanelWidths();
    } else {
        console.log('🙈 HIDING panel:', panelId);
        // Hide panel - DON'T update memory, just hide
        panel.style.display = 'none';
        button.classList.remove('active');

        // Redistribute remaining panels
        redistributePanelWidths();
    }

    console.log('📏 AFTER toggle - Panel widths:');
    logCurrentWidths();
    console.log('💾 Panel memory:', panelMemory);

    saveLayoutToStorage();
}

function redistributePanelWidths() {
    console.log('🔄 Redistributing panel widths...');

    const snippetPanel = document.getElementById('snippet-panel');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    const panels = [
        { element: snippetPanel, id: 'snippet', memoryKey: 'snippetWidth' },
        { element: editorPanel, id: 'editor', memoryKey: 'editorWidth' },
        { element: previewPanel, id: 'preview', memoryKey: 'previewWidth' }
    ];

    const visiblePanels = panels.filter(panel => panel.element.style.display !== 'none');
    console.log('👁️ Visible panels:', visiblePanels.map(p => p.id));

    if (visiblePanels.length === 0) return;

    // Get total desired width from memory
    let totalMemoryWidth = 0;
    console.log('📊 Memory widths:');
    visiblePanels.forEach(panel => {
        const width = parseFloat(panelMemory[panel.memoryKey]);
        console.log(`  ${panel.id}: ${panelMemory[panel.memoryKey]} → ${width}`);
        totalMemoryWidth += width;
    });
    console.log('📊 Total memory width:', totalMemoryWidth);

    // Redistribute proportionally to fill 100%
    console.log('🧮 Calculating new widths:');
    visiblePanels.forEach(panel => {
        const memoryWidth = parseFloat(panelMemory[panel.memoryKey]);
        const newWidth = (memoryWidth / totalMemoryWidth) * 100;
        console.log(`  ${panel.id}: ${memoryWidth}/${totalMemoryWidth} * 100 = ${newWidth}%`);
        panel.element.style.width = `${newWidth}%`;
    });
}


function logCurrentWidths() {
    const snippetPanel = document.getElementById('snippet-panel');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    console.log('  Snippets:', {
        width: snippetPanel.style.width || 'default',
        display: snippetPanel.style.display || 'default',
        visible: snippetPanel.style.display !== 'none'
    });
    console.log('  Editor:', {
        width: editorPanel.style.width || 'default',
        display: editorPanel.style.display || 'default',
        visible: editorPanel.style.display !== 'none'
    });
    console.log('  Preview:', {
        width: previewPanel.style.width || 'default',
        display: previewPanel.style.display || 'default',
        visible: previewPanel.style.display !== 'none'
    });
}

function saveLayoutToStorage() {
    const snippetPanel = document.getElementById('snippet-panel');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    // DON'T update memory here - it's already updated during manual resize

    const layout = {
        snippetWidth: snippetPanel.style.width || '25%',
        editorWidth: editorPanel.style.width || '50%',
        previewWidth: previewPanel.style.width || '25%',
        snippetVisible: snippetPanel.style.display !== 'none',
        editorVisible: editorPanel.style.display !== 'none',
        previewVisible: previewPanel.style.display !== 'none',
        memory: panelMemory
    };

    localStorage.setItem('astrolabe-layout', JSON.stringify(layout));
}

function loadLayoutFromStorage() {
    try {
        const saved = localStorage.getItem('astrolabe-layout');
        if (saved) {
            const layout = JSON.parse(saved);

            // Restore memory if available
            if (layout.memory) {
                panelMemory = layout.memory;
            }

            // Restore panel visibility
            const snippetPanel = document.getElementById('snippet-panel');
            const editorPanel = document.getElementById('editor-panel');
            const previewPanel = document.getElementById('preview-panel');

            snippetPanel.style.display = layout.snippetVisible !== false ? 'flex' : 'none';
            editorPanel.style.display = layout.editorVisible !== false ? 'flex' : 'none';
            previewPanel.style.display = layout.previewVisible !== false ? 'flex' : 'none';

            // Update toggle button states
            document.getElementById('toggle-snippets').classList.toggle('active', layout.snippetVisible !== false);
            document.getElementById('toggle-editor').classList.toggle('active', layout.editorVisible !== false);
            document.getElementById('toggle-preview').classList.toggle('active', layout.previewVisible !== false);

            // Restore widths and redistribute
            snippetPanel.style.width = layout.snippetWidth;
            editorPanel.style.width = layout.editorWidth;
            previewPanel.style.width = layout.previewWidth;

            redistributePanelWidths();
        }
    } catch (error) {
        // Ignore errors, use default layout
    }
}
function initializeResize() {
    const handles = document.querySelectorAll('.resize-handle');
    const panels = [
        document.getElementById('snippet-panel'),
        document.getElementById('editor-panel'),
        document.getElementById('preview-panel')
    ];

    handles.forEach((handle, index) => {
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            currentHandle = index;
            startX = e.clientX;
            startWidths = panels.map(panel => panel.getBoundingClientRect().width);

            handle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const containerWidth = document.querySelector('.main-panels').getBoundingClientRect().width;

        if (currentHandle === 0) {
            // Resizing between snippet and editor panels
            const minWidth = 200;
            const newSnippetWidth = Math.max(minWidth, startWidths[0] + deltaX);
            const newEditorWidth = Math.max(minWidth, startWidths[1] - deltaX);

            if (newSnippetWidth >= minWidth && newEditorWidth >= minWidth) {
                panels[0].style.width = `${(newSnippetWidth / containerWidth) * 100}%`;
                panels[1].style.width = `${(newEditorWidth / containerWidth) * 100}%`;
            }
        } else if (currentHandle === 1) {
            // Resizing between editor and preview panels
            const minWidth = 200;
            const newEditorWidth = Math.max(minWidth, startWidths[1] + deltaX);
            const newPreviewWidth = Math.max(minWidth, startWidths[2] - deltaX);

            if (newEditorWidth >= minWidth && newPreviewWidth >= minWidth) {
                panels[1].style.width = `${(newEditorWidth / containerWidth) * 100}%`;
                panels[2].style.width = `${(newPreviewWidth / containerWidth) * 100}%`;
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentHandle = null;

            document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('dragging'));
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Update memory ONLY after manual resize
            updatePanelMemory();
            console.log('🎯 Manual resize completed - Updated memory:', panelMemory);

            saveLayoutToStorage();
        }
    });
}
