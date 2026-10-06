/**
 * MergeTitan - API Interface Module
 * Handles all network requests to the MergeTitan Backend API endpoints.
 */

// Base API URL - easily configurable for local dev or production environments
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Generic helper wrapper for fetch API calls with error handling and JSON parsing.
 * @param {string} endpoint - Relative API endpoint path.
 * @param {Object} [options={}] - Fetch configuration options (method, headers, body, etc.).
 * @returns {Promise<any>} Parsed JSON response from the server.
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.detail) {
                    errorMessage = typeof errorData.detail === 'string' 
                        ? errorData.detail 
                        : JSON.stringify(errorData.detail);
                }
            } catch (_) {
                // Response body wasn't JSON, fallback to standard HTTP status message
            }
            throw new Error(errorMessage);
        }

        // Handle 204 No Content response
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`[MergeTitan API Error] ${options.method || 'GET'} ${url}:`, error.message);
        throw error;
    }
}

/**
 * Fetch all Pull Request audits.
 * Endpoint: GET /api/reviews
 * @returns {Promise<Array>} Array of PR review objects matching PR Review Schema.
 */
export async function fetchAllReviews() {
    return await request('/reviews', {
        method: 'GET'
    });
}

/**
 * Fetch detailed audit report for a specific Pull Request.
 * Endpoint: GET /api/reviews/{id}
 * @param {string|number} id - The PR Review ID.
 * @returns {Promise<Object>} PR review detail object matching PR Review Schema.
 */
export async function fetchReviewById(id) {
    if (!id) {
        throw new Error('Review ID is required to fetch details.');
    }
    return await request(`/reviews/${encodeURIComponent(id)}`, {
        method: 'GET'
    });
}

/**
 * Manually trigger local AI/Linter code scan on target pull request or repository payload.
 * Endpoint: POST /api/reviews/scan
 * @param {Object} scanPayload - Payload containing PR details or target scan configuration.
 * @returns {Promise<Object>} Newly created PR review record matching PR Review Schema.
 */
export async function triggerManualScan(scanPayload) {
    return await request('/reviews/scan', {
        method: 'POST',
        body: JSON.stringify(scanPayload)
    });
}

/**
 * Simulate or send GitHub Webhook payload for processing PR events.
 * Endpoint: POST /api/webhooks/github
 * @param {Object} webhookPayload - Standard GitHub Pull Request event webhook body.
 * @returns {Promise<Object>} Webhook acknowledgment and generated review result.
 */
export async function sendGitHubWebhook(webhookPayload) {
    return await request('/webhooks/github', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
    });
}
