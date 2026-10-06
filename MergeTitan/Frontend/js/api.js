const API_BASE_URL = "http://localhost:8000/api";

async function request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.detail ||
            data?.message ||
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}

export async function getReviews() {
    return request("/reviews", {
        method: "GET"
    });
}

export async function getReview(id) {
    if (!id) {
        throw new Error("Review ID is required.");
    }

    return request(`/reviews/${encodeURIComponent(id)}`, {
        method: "GET"
    });
}

export async function scanReview(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Scan payload must be a valid object.");
    }

    return request("/reviews/scan", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function sendGitHubWebhook(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Webhook payload must be a valid object.");
    }

    return request("/webhooks/github", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export default {
    getReviews,
    getReview,
    scanReview,
    sendGitHubWebhook
};
