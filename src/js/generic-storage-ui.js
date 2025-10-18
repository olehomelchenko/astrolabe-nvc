// Generic Storage UI Utilities
// Provides reusable patterns for list management, item selection, and linked item display
// Used by both snippet-manager.js and dataset-manager.js

/**
 * Generic list rendering function with support for ghost cards and custom selectors
 * @param {string} containerId - ID of container to render list into
 * @param {Array} items - Array of items to render
 * @param {Function} formatItem - Function that takes item and returns HTML string
 * @param {Function} onSelectItem - Callback when item is selected, receives item ID
 * @param {Object} options - Optional configuration
 *   - emptyMessage: Message when list is empty
 *   - ghostCard: HTML string for "create new" card (prepended to list)
 *   - onGhostCardClick: Callback for ghost card click
 *   - itemSelector: CSS selector for clickable items (default: '[data-item-id]')
 *   - ghostCardSelector: CSS selector for ghost card (default: '.ghost-card')
 *   - parseId: Function to parse ID from string (default: parseFloat)
 */
function renderGenericList(containerId, items, formatItem, onSelectItem, options = {}) {
    const {
        emptyMessage = 'No items found',
        ghostCard = null,
        onGhostCardClick = null,
        itemSelector = '[data-item-id]',
        ghostCardSelector = '.ghost-card',
        parseId = parseFloat
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0 && !ghostCard) {
        container.innerHTML = `<div class="list-empty">${emptyMessage}</div>`;
        return;
    }

    // Render ghost card + items
    const itemsHtml = items.map(formatItem).join('');
    container.innerHTML = (ghostCard || '') + itemsHtml;

    // Attach click handler to ghost card
    if (ghostCard && onGhostCardClick) {
        const ghostElement = container.querySelector(ghostCardSelector);
        if (ghostElement) {
            ghostElement.addEventListener('click', onGhostCardClick);
        }
    }

    // Attach click handlers to regular items
    container.querySelectorAll(itemSelector).forEach(item => {
        // Skip ghost cards
        if (item.matches(ghostCardSelector)) return;

        item.addEventListener('click', function() {
            const itemId = parseId(this.dataset.itemId);
            onSelectItem(itemId);
        });
    });
}

/**
 * Generic item selector function
 * Updates visual selection and populates details panel
 * @param {string|number} itemId - ID of item to select
 * @param {string} itemContainerSelector - CSS selector for item elements (e.g., '.snippet-item')
 * @param {string} dataAttributeName - Name of data attribute holding ID (e.g., 'snippetId', 'datasetId')
 */
function selectGenericItem(itemId, itemContainerSelector, dataAttributeName) {
    // Clear previous selection
    document.querySelectorAll(itemContainerSelector).forEach(item => {
        item.classList.remove('selected');
    });

    // Set new selection
    const selector = `${itemContainerSelector}[data-${dataAttributeName}="${itemId}"]`;
    const selectedItem = document.querySelector(selector);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
}

/**
 * Generic linked items viewer
 * Displays items that reference the current item
 * @param {Array} linkedItems - Array of items to display
 * @param {string} containerId - ID of container for the list
 * @param {string} sectionId - ID of section wrapper (shown/hidden based on count)
 * @param {Function} formatLinkedItem - Function that returns HTML for each linked item
 * @param {Function} onLinkedItemClick - Callback when a linked item is clicked
 */
function updateGenericLinkedItems(linkedItems, containerId, sectionId, formatLinkedItem, onLinkedItemClick) {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(containerId);

    if (!section || !container) return;

    if (linkedItems.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const html = linkedItems.map(formatLinkedItem).join('');
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('[data-linked-item-id]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkedItemId = this.dataset.linkedItemId;
            onLinkedItemClick(linkedItemId);
        });
    });
}

/**
 * Generic modal helper
 * @param {string} modalId - ID of modal element
 * @param {boolean} show - Whether to show (true) or hide (false)
 * @param {Function} onShow - Optional callback when showing
 * @param {Function} onHide - Optional callback when hiding
 */
function toggleGenericModal(modalId, show, onShow, onHide) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (show) {
        modal.style.display = 'flex';
        if (onShow) onShow();
    } else {
        modal.style.display = 'none';
        if (onHide) onHide();
    }
}

/**
 * Generic form show/hide helper
 * @param {string} viewId - ID of view/form container
 * @param {boolean} show - Whether to show (true) or hide (false)
 * @param {Function} onShow - Optional callback when showing
 * @param {Function} onHide - Optional callback when hiding
 */
function toggleGenericForm(viewId, show, onShow, onHide) {
    const view = document.getElementById(viewId);
    if (!view) return;

    if (show) {
        view.style.display = show === 'block' ? 'block' : 'flex';
        if (onShow) onShow();
    } else {
        view.style.display = 'none';
        if (onHide) onHide();
    }
}

/**
 * Generic element visibility toggler
 * @param {string} elementId - ID of element to toggle
 * @param {boolean} show - Whether to show or hide
 */
function setElementVisibility(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * Generic field populator for details panel
 * @param {Object} data - Object with field data
 * @param {Array} fieldMappings - Array of {fieldId, value} objects
 */
function populateDetailsPanel(data, fieldMappings) {
    fieldMappings.forEach(({ fieldId, getValue }) => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = getValue ? getValue(data) : '';
        }
    });
}

/**
 * Generic item deletion with confirmation
 * @param {string} itemName - Name of item for confirmation message
 * @param {string} warningMessage - Optional warning if item is in use
 * @param {Function} onConfirm - Callback if user confirms deletion
 * @returns {boolean} - Whether deletion was confirmed
 */
function confirmGenericDeletion(itemName, warningMessage = null, onConfirm) {
    let message = `Delete "${itemName}"?`;

    if (warningMessage) {
        message = `⚠️ ${warningMessage}\n\nAre you sure you want to delete it?`;
    } else {
        message += ' This action cannot be undone.';
    }

    if (confirm(message)) {
        if (onConfirm) onConfirm();
        return true;
    }
    return false;
}

/**
 * Generic file download helper
 * @param {string|Blob} content - Content to download
 * @param {string} filename - Filename for download
 * @param {string} mimeType - MIME type (default: 'text/plain')
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Clear file input helper
 * @param {string} inputId - ID of file input element
 */
function clearFileInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
}

/**
 * Generic text field update helper with debounce
 * @param {string} fieldId - ID of input field
 * @param {Function} onUpdate - Callback with new value
 * @param {number} debounceMs - Debounce delay in milliseconds
 */
function setupDebouncedFieldUpdate(fieldId, onUpdate, debounceMs = 1000) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    let timeout;
    field.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            onUpdate(this.value);
        }, debounceMs);
    });
}

/**
 * Generic toggle button state updater
 * @param {Array} buttons - Array of {id, isActive} objects
 */
function updateToggleButtons(buttons) {
    buttons.forEach(({ id, isActive }) => {
        const button = document.getElementById(id);
        if (button) {
            if (isActive) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    });
}

/**
 * Generic URL state updater with fallback
 * Only updates if URLState global is available
 * @param {Object} state - State object to pass to URLState.update
 */
function updateURLStateIfAvailable(state) {
    if (typeof URLState !== 'undefined' && URLState.update) {
        URLState.update(state);
    }
}

/**
 * Generic analytics tracker with fallback
 * Only tracks if Analytics global is available
 * @param {string} event - Event name
 * @param {string} label - Event label
 */
function trackEventIfAvailable(event, label) {
    if (typeof Analytics !== 'undefined' && Analytics.track) {
        Analytics.track(event, label);
    }
}
