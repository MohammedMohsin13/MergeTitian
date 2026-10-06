/**
 * MergeTitan - Main Application Controller
 * Manages dashboard state, UI rendering, event binding, manual PR scans, and auto-refresh.
 */

import { fetchAllReviews, fetchReviewById, triggerManualScan } from './api.js';
import { openModal, closeModal, renderPRDetailModal } from './modal.js';

// Application State
const state = {
    reviews: [],
    filteredReviews: [],
    activeFilter: 'ALL',
    searchQuery: '',
    isLoading: false,
    autoRefreshInterval: null
};

// DOM Selectors
const DOM = {
    prGrid: document.getElementById('prGrid'),
    searchInputs: document.querySelectorAll('.pr-search-input'),
    filterBtns: document.querySelectorAll('[data-filter]'),
    scanForm: document.getElementById('manualScanForm'),
    scanModalOverlay: document.getElementById('scanModalOverlay'),
    detailModalOverlay: document.getElementById('prDetailModalOverlay'),
    refreshBtn: document.getElementById('refreshBtn'),
    metricTotal: document.getElementById('metricTotal'),
    metricPassed: document.getElementById('metricPassed'),
    metricFailed: document.getElementById('metricFailed'),
    metricWarning: document.getElementById('metricWarning'),
    metricAvgScore: document.getElementById('metricAvgScore')
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await loadDashboardData();
    startAutoRefresh(30000); // 30-second poll interval for devsecops monitoring
});

/**
 * Set up user interface event handlers.
 */
function initEventListeners() {
    // Search input handling with debouncing
    DOM.searchInputs.forEach(input => {
        input.addEventListener('input', debounce((e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        }, 200));
    });

    // Filter tab buttons
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.activeFilter = e.currentTarget.getAttribute('data-filter') || 'ALL';
            applyFilters();
        });
    });

    // Manual Refresh
    if (DOM.refreshBtn) {
        DOM.refreshBtn.addEventListener('click', () => loadDashboardData(true));
    }

    // Manual Scan Form Submission
    if (DOM.scanForm) {
        DOM.scanForm.addEventListener('submit', handleManualScanSubmit);
    }

    // Delegated click for PR card details view
    if (DOM.prGrid) {
        DOM.prGrid.addEventListener('click', handleCardClick);
    }
}

/**
 * Fetch PR reviews from backend and update dashboard.
 * @param {boolean} showToast - Optional notification indicator.
 */
async function loadDashboardData(showToast = false) {
    try {
        setLoadingState(true);
        const data = await fetchAllReviews();
        state.reviews = Array.isArray(data) ? data : [];
        applyFilters();
        updateMetrics();

        if (showToast) {
            console.log('[MergeTitan] Dashboard data synced.');
        }
    } catch (error) {
        console.error('[MergeTitan App Error] Failed to load PR reviews:', error);
        renderErrorState(error.message);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Filter and render reviews based on search query and status filter.
 */
function applyFilters() {
    state.filteredReviews = state.reviews.filter(review => {
        const matchesFilter = state.activeFilter === 'ALL' || review.status === state.activeFilter;
        const matchesSearch = !state.searchQuery || 
            review.title.toLowerCase().includes(state.searchQuery) ||
            review.author.toLowerCase().includes(state.searchQuery) ||
            review.branch.toLowerCase().includes(state.searchQuery) ||
            String(review.id).includes(state.searchQuery);

        return matchesFilter && matchesSearch;
    });

    renderPRCards(state.filteredReviews);
}

/**
 * Render grid of PR cards.
 * @param {Array} reviews - List of PR objects.
 */
function renderPRCards(reviews) {
    if (!DOM.prGrid) return;

    if (reviews.length === 0) {
        DOM.prGrid.innerHTML = `
            <div class="empty-state">
                <p class="empty-title">No PR Audits Found</p>
                <p class="empty-subtitle">Try adjusting your filter or trigger a manual scan.</p>
            </div>
        `;
        return;
    }

    DOM.prGrid.innerHTML = reviews.map(review => {
        const issueCount = review.issues ? review.issues.length : 0;
        const badgeClass = getBadgeClass(review.status);
        const scoreClass = getScoreColorClass(review.score);

        return `
            <article class="pr-card" data-pr-id="${escapeHtml(review.id)}">
                <div class="pr-card-header">
                    <span class="status-badge ${badgeClass}">${escapeHtml(review.status)}</span>
                    <span class="pr-id">#${escapeHtml(review.id)}</span>
                </div>
                <h3 class="pr-card-title">${escapeHtml(review.title)}</h3>
                <div class="pr-card-meta">
                    <span><strong>Author:</strong> ${escapeHtml(review.author)}</span>
                    <span><strong>Branch:</strong> <code>${escapeHtml(review.branch)}</code></span>
                </div>
                <div class="pr-card-footer">
                    <div class="score-pill ${scoreClass}">
                        <span>Score:</span> <strong>${review.score}/100</strong>
                    </div>
                    <div class="issues-count">
                        <span>${issueCount} issue${issueCount === 1 ? '' : 's'}</span>
                    </div>
                    <button class="btn btn-secondary btn-sm" data-action="view-details" data-pr-id="${escapeHtml(review.id)}">
                        Review
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Handle card click delegation for opening audit detail modal.
 */
async function handleCardClick(event) {
    const target = event.target.closest('[data-action="view-details"]') || event.target.closest('.pr-card');
    if (!target) return;

    const prId = target.getAttribute('data-pr-id');
    if (!prId) return;

    try {
        // Fetch detailed data from server for accuracy
        const detailData = await fetchReviewById(prId);
        renderPRDetailModal(detailData, 'prModalContent');
        openModal(DOM.detailModalOverlay || 'prDetailModalOverlay');
    } catch (error) {
        console.error(`[MergeTitan Error] Could not load details for PR #${prId}:`, error);
        alert(`Failed to load review details: ${error.message}`);
    }
}

/**
 * Handle form submission for triggering manual local analysis.
 */
async function handleManualScanSubmit(event) {
    event.preventDefault();

    const submitBtn = DOM.scanForm.querySelector('button[type="submit"]');
    const titleInput = document.getElementById('scanTitle');
    const authorInput = document.getElementById('scanAuthor');
    const branchInput = document.getElementById('scanBranch');
    const repoInput = document.getElementById('scanRepo');

    const scanPayload = {
        title: titleInput ? titleInput.value.trim() : 'Manual Scan',
        author: authorInput ? authorInput.value.trim() : 'DevSecOps Operator',
        branch: branchInput ? branchInput.value.trim() : 'main',
        repo: repoInput ? repoInput.value.trim() : 'local/repo'
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Running Scan...';
        }

        const newReview = await triggerManualScan(scanPayload);
        
        // Reset form and close modal
        DOM.scanForm.reset();
        if (DOM.scanModalOverlay) closeModal(DOM.scanModalOverlay);

        // Refresh grid
        await loadDashboardData();

        // Open newly created scan result
        renderPRDetailModal(newReview, 'prModalContent');
        openModal(DOM.detailModalOverlay || 'prDetailModalOverlay');

    } catch (error) {
        console.error('[MergeTitan Error] Manual scan failed:', error);
        alert(`Scan execution error: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Run Audit Scan';
        }
    }
}

/**
 * Update analytical counter cards on the dashboard header.
 */
function updateMetrics() {
    const total = state.reviews.length;
    const passed = state.reviews.filter(r => r.status === 'PASSED').length;
    const failed = state.reviews.filter(r => r.status === 'FAILED').length;
    const warning = state.reviews.filter(r => r.status === 'WARNING').length;

    const totalScore = state.reviews.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;

    if (DOM.metricTotal) DOM.metricTotal.textContent = total;
    if (DOM.metricPassed) DOM.metricPassed.textContent = passed;
    if (DOM.metricFailed) DOM.metricFailed.textContent = failed;
    if (DOM.metricWarning) DOM.metricWarning.textContent = warning;
    if (DOM.metricAvgScore) DOM.metricAvgScore.textContent = `${avgScore}/100`;
}

/**
 * Start automatic background polling.
 */
function startAutoRefresh(ms = 30000) {
    if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = setInterval(() => loadDashboardData(), ms);
}

/**
 * UI loading indicator toggle.
 */
function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    if (DOM.refreshBtn) {
        DOM.refreshBtn.classList.toggle('spinning', isLoading);
    }
}

/**
 * Render error indicator in grid.
 */
function renderErrorState(message) {
    if (!DOM.prGrid) return;
    DOM.prGrid.innerHTML = `
        <div class="error-state">
            <p class="error-title">Unable to sync with MergeTitan backend</p>
            <p class="error-message">${escapeHtml(message)}</p>
            <button class="btn btn-primary btn-sm" onclick="location.reload()">Retry Connection</button>
        </div>
    `;
}

// Utilities
function getBadgeClass(status) {
    switch (status) {
        case 'PASSED': return 'badge-passed';
        case 'FAILED': return 'badge-failed';
        case 'WARNING': return 'badge-warning';
        default: return 'badge-neutral';
    }
}

function getScoreColorClass(score) {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
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

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
