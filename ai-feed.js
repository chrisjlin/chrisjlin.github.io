// AI Feed - Vanilla JS Client
// Fetches aggregated feed from Cloudflare Worker and renders it

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        // Worker endpoint - update this after deploying the worker
        workerUrl: 'https://ai-feed.christopher-lin-508.workers.dev',
        refreshInterval: 30 * 60 * 1000, // 30 minutes in ms
        maxRetries: 3,
        retryDelay: 5000
    };

    // DOM Elements
    const feedList = document.getElementById('feed-list');
    const authorFilter = document.getElementById('author-filter');
    const lastUpdatedEl = document.getElementById('last-updated');

    // State
    let feedData = [];
    let currentFilter = 'all';
    let refreshTimer = null;

    // Initialize
    function init() {
        loadFeed();
        setupEventListeners();
        startAutoRefresh();
    }

    // Event Listeners
    function setupEventListeners() {
        authorFilter.addEventListener('change', function() {
            currentFilter = this.value;
            renderFeed();
        });
    }

    // Load feed from worker
    async function loadFeed(retryCount = 0) {
        try {
            showLoading();
            
            const response = await fetch(CONFIG.workerUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            feedData = data.posts || [];
            populateAuthorFilter();
            renderFeed();
            updateLastUpdated(data.fetchedAt);

        } catch (error) {
            console.error('Failed to load feed:', error);
            
            if (retryCount < CONFIG.maxRetries) {
                setTimeout(() => loadFeed(retryCount + 1), CONFIG.retryDelay);
            } else {
                showError();
            }
        }
    }

    // Populate author dropdown from feed data
    function populateAuthorFilter() {
        const authors = [...new Set(feedData.map(post => post.author))].sort();
        
        // Clear existing options except "All Authors"
        authorFilter.innerHTML = '<option value="all">All Authors</option>';
        
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorFilter.appendChild(option);
        });

        // Restore previous selection if valid
        if (authors.includes(currentFilter)) {
            authorFilter.value = currentFilter;
        } else {
            currentFilter = 'all';
            authorFilter.value = 'all';
        }
    }

    // Render feed items
    function renderFeed() {
        const filteredPosts = currentFilter === 'all' 
            ? feedData 
            : feedData.filter(post => post.author === currentFilter);

        if (filteredPosts.length === 0) {
            showEmpty();
            return;
        }

        feedList.innerHTML = filteredPosts.map((post, index) => {
            const date = formatDate(post.date);
            const source = escapeHtml(post.source || 'Web');
            
            return `
                <div class="feed-item">
                    <div class="feed-item-row">
                        <span class="feed-item-number">${index + 1}.</span>
                        <div class="feed-item-content">
                            <div class="feed-item-title">
                                <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">
                                    ${escapeHtml(post.title)}
                                </a>
                                <span class="feed-item-source">(${source})</span>
                            </div>
                            <div class="feed-item-meta">
                                <span class="feed-item-author">${escapeHtml(post.author)}</span>
                                &bull; ${date}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Format date relative to now
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update last updated timestamp
    function updateLastUpdated(fetchedAt) {
        const date = fetchedAt ? new Date(fetchedAt) : new Date();
        lastUpdatedEl.textContent = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Show loading state
    function showLoading() {
        feedList.innerHTML = '<div class="loading">Loading feed...</div>';
    }

    // Show empty state
    function showEmpty() {
        feedList.innerHTML = '<div class="empty-state">No posts available</div>';
    }

    // Show error state
    function showError() {
        feedList.innerHTML = '<div class="error-state">No posts available</div>';
    }

    // Auto-refresh timer
    function startAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
        refreshTimer = setInterval(loadFeed, CONFIG.refreshInterval);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
