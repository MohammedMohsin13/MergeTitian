/**
 * MergeTitan - Modal Interface Controller Module
 * Handles modal display state, keyboard accessibility, backdrop focus locks,
 * and dynamic DOM injection for PR review details and manual audit forms.
 */

/**
 * Open a specified modal overlay.
 * @param {string|HTMLElement} target - Element ID or HTMLElement of the modal overlay.
 */
export function openModal(target) {
    const modalOverlay = typeof target === 'string' 
        ? document.getElementById(target) 
        : target;

    if (!modalOverlay) {
        console.warn(`[MergeTitan Modal] Modal overlay not found:`, target);
        return;
    }

    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');
    
    // Prevent background scrolling when modal is open
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside the modal for accessibility
    const firstFocusable = modalOverlay.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
        firstFocusable.focus();
    }
}

/**
 * Close a specified modal overlay, or all open modals if no target is provided.
 * @param {string|HTMLElement} [target] - Optional Element ID or HTMLElement of the modal overlay.
 */
export function closeModal(target) {
    if (target) {
        const modalOverlay = typeof target === 'string' 
            ? document.getElementById(target) 
            : target;
        
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            modalOverlay.setAttribute('aria-hidden', 'true');
        }
    } else {
        // Close all active modals
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        activeModals.forEach((overlay) => {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        });
    }

    // Restore background scrolling if no other modals remain active
    const remainingActive = document.querySelectorAll('.modal-overlay.active');
    if (remainingActive.length === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
}

/**
 * Global Keyboard Event Listeners for Accessibility (ESC to close).
 */
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal();
    }
});

/**
 * Global Event Delegation for Dynamic Modal Triggers and Backdrop Clicks.
 */
document.addEventListener('click', (event) => {
    // Open Trigger
    const openBtn = event.target.closest('[data-open-modal]');
    if (openBtn) {
        const targetId = openBtn.getAttribute('data-open-modal');
        openModal(targetId);
        return;
    }

    // Close Trigger
    const closeBtn = event.target.closest('[data-close-modal]');
    if (closeBtn) {
        const modalOverlay = closeBtn.closest('.modal-overlay');
        closeModal(modalOverlay);
        return;
    }

    // Backdrop Click (outside modal content body)
    if (event.target.classList.contains('modal-overlay')) {
        closeModal(event.target);
    }
});

/**
 * Renders full Pull Request audit details dynamically into the detail modal container.
 * Strictly adheres to the MergeTitan PR Review Schema.
 * 
 * @param {Object} review - The PR Review object.
 * @param {string} [containerId='prModalContent'] - ID of target modal body element.
 */
export function renderPRDetailModal(review, containerId = 'prModalContent') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[MergeTitan Modal] Modal container '#${containerId}' not found.`);
        return;
    }

    const { id, title, author, branch, status, score, issues = [] } = review;

    const badgeClass = getBadgeClass(status);
    const scoreColorClass = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';

    const issuesHTML = issues.length > 0 ? issues.map(issue => `
        <div class="issue-card severity-${issue.severity.toLowerCase()}">
            <div class="issue-card-header">
                <span class="severity-tag severity-${issue.severity.toLowerCase()}">${escapeHtml(issue.severity)}</span>
                <span class="issue-rule"><code>${escapeHtml(issue.rule)}</code></span>
                <span class="issue-file-location">${escapeHtml(issue.file)}:${escapeHtml(issue.line)}</span>
            </div>
            <p class="issue-description">${escapeHtml(issue.description)}</p>
            ${issue.remediation ? `
                <div class="issue-remediation">
                    <div class="remediation-header">Auto-Remediation Suggestion</div>
                    <pre class="remediation-diff"><code>${escapeHtml(issue.remediation)}</code></pre>
                </div>
            ` : ''}
        </div>
    `).join('') : `
        <div class="empty-issues-box">
            <span class="icon-check">✔</span>
            <p>No security vulnerabilities or code smell violations detected in this Pull Request.</p>
        </div>
    `;

    container.innerHTML = `
        <div class="modal-header">
            <div class="modal-title-wrapper">
                <span class="status-badge ${badgeClass}">${escapeHtml(status)}</span>
                <h2 class="modal-pr-title">[PR #${escapeHtml(id)}] ${escapeHtml(title)}</h2>
            </div>
            <button type="button" class="modal-close-icon" data-close-modal aria-label="Close modal">&times;</button>
        </div>

        <div class="modal-meta-grid">
            <div class="meta-card">
                <span class="meta-label">Author</span>
                <span class="meta-value">${escapeHtml(author)}</span>
            </div>
            <div class="meta-card">
                <span class="meta-label">Target Branch</span>
                <span class="meta-value"><code>${escapeHtml(branch)}</code></span>
            </div>
            <div class="meta-card">
                <span class="meta-label">Quality & Security Score</span>
                <span class="meta-value ${scoreColorClass}">${score}/100</span>
            </div>
        </div>

        <div class="modal-body-section">
            <h3 class="section-heading">Detected Security & Quality Issues (${issues.length})</h3>
            <div class="issues-container">
                ${issuesHTML}
            </div>
        </div>
    `;
}

// Utility Functions
function getBadgeClass(status) {
    switch (status) {
        case 'PASSED': return 'badge-passed';
        case 'FAILED': return 'badge-failed';
        case 'WARNING': return 'badge-warning';
        default: return 'badge-neutral';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
