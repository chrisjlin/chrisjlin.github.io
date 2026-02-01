/**
 * AI Feed Worker
 * Cloudflare Worker that aggregates RSS feeds from AI thought leaders
 * 
 * Sources:
 * - Gary Marcus (Substack)
 * - Simon Willison (Blog)
 * - Andrej Karpathy (Blog)
 * - François Chollet (arXiv)
 * - LessWrong (filtered for Eliezer Yudkowsky, Paul Christiano)
 */

// Feed source configuration
const FEED_SOURCES = [
    {
        name: 'Gary Marcus',
        url: 'https://garymarcus.substack.com/feed',
        type: 'rss',
        source: 'Substack'
    },
    {
        name: 'Simon Willison',
        url: 'https://simonwillison.net/atom/everything/',
        type: 'atom',
        source: 'Blog'
    },
    {
        name: 'Steve Yegge',
        url: 'https://steve-yegge.medium.com/feed',
        type: 'rss',
        source: 'Medium'
    },
    {
        name: 'Andrej Karpathy',
        url: 'https://karpathy.github.io/feed.xml',
        type: 'rss',
        source: 'Blog'
    },
    {
        name: 'François Chollet',
        url: 'https://export.arxiv.org/api/query?search_query=au:chollet&sortBy=submittedDate&sortOrder=descending&max_results=20',
        type: 'arxiv',
        source: 'arXiv',
        authorFilter: 'Francois Chollet' // Filter for exact author match
    },
    {
        name: 'LessWrong',
        url: 'https://www.lesswrong.com/feed.xml?view=community-rss&karmaThreshold=30',
        type: 'rss',
        source: 'LessWrong',
        authorFilter: ['Eliezer Yudkowsky', 'Eliezer_Yudkowsky', 'Paul Christiano', 'paulfchristiano']
    }
];

// Cache configuration
const CACHE_TTL = 30 * 60; // 30 minutes in seconds
const CACHE_KEY = 'ai-feed-cache';
const MAX_AGE_DAYS = 30;

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCors();
        }

        try {
            // Try to get cached data first
            let cachedData = null;
            if (env.AI_FEED_CACHE) {
                cachedData = await env.AI_FEED_CACHE.get(CACHE_KEY, 'json');
            }

            if (cachedData) {
                return jsonResponse(cachedData);
            }

            // Fetch fresh data
            const posts = await aggregateFeeds();
            
            // Cache the result
            const responseData = { posts, fetchedAt: new Date().toISOString() };
            if (env.AI_FEED_CACHE) {
                ctx.waitUntil(
                    env.AI_FEED_CACHE.put(CACHE_KEY, JSON.stringify(responseData), {
                        expirationTtl: CACHE_TTL
                    })
                );
            }

            return jsonResponse(responseData);

        } catch (error) {
            console.error('Feed aggregation error:', error);
            return jsonResponse({ error: 'Failed to fetch feeds', posts: [] }, 500);
        }
    },

    // Scheduled handler for cron triggers
    async scheduled(event, env, ctx) {
        try {
            const posts = await aggregateFeeds();
            const responseData = { posts, fetchedAt: new Date().toISOString() };
            
            if (env.AI_FEED_CACHE) {
                await env.AI_FEED_CACHE.put(CACHE_KEY, JSON.stringify(responseData), {
                    expirationTtl: CACHE_TTL
                });
            }
            
            console.log(`Scheduled refresh: ${posts.length} posts cached`);
        } catch (error) {
            console.error('Scheduled refresh error:', error);
        }
    }
};

// Aggregate all feeds
async function aggregateFeeds() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

    const feedPromises = FEED_SOURCES.map(source => fetchFeed(source, cutoffDate));
    const results = await Promise.allSettled(feedPromises);

    let allPosts = [];
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            allPosts = allPosts.concat(result.value);
        } else {
            console.error(`Failed to fetch ${FEED_SOURCES[index].name}:`, result.reason);
        }
    });

    // Sort by date descending
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return allPosts;
}

// Fetch and parse a single feed
async function fetchFeed(source, cutoffDate) {
    const response = await fetch(source.url, {
        headers: {
            'User-Agent': 'AI-Feed-Aggregator/1.0',
            'Accept': 'application/xml, application/rss+xml, application/atom+xml, text/xml'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${source.url}`);
    }

    const text = await response.text();
    let posts = [];

    switch (source.type) {
        case 'rss':
            posts = parseRSS(text, source);
            break;
        case 'atom':
            posts = parseAtom(text, source);
            break;
        case 'arxiv':
            posts = parseArxiv(text, source);
            break;
        default:
            posts = parseRSS(text, source);
    }

    // Apply author filter if specified (post-fetch filtering)
    if (source.authorFilter) {
        const filters = Array.isArray(source.authorFilter) 
            ? source.authorFilter 
            : [source.authorFilter];
        
        posts = posts.filter(post => {
            return filters.some(filter => 
                post.author.toLowerCase().includes(filter.toLowerCase())
            );
        });
    }

    // Filter by date
    posts = posts.filter(post => new Date(post.date) >= cutoffDate);

    return posts;
}

// Parse RSS 2.0 feed
function parseRSS(xml, source) {
    const posts = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1];
        
        const title = extractTag(item, 'title');
        const link = extractTag(item, 'link') || extractTag(item, 'guid');
        const pubDate = extractTag(item, 'pubDate');
        const creator = extractTag(item, 'dc:creator') || extractTag(item, 'author');

        if (title && link) {
            posts.push({
                title: cleanText(title),
                url: cleanText(link),
                date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                author: cleanText(creator) || source.name,
                source: source.source
            });
        }
    }

    return posts;
}

// Parse Atom feed
function parseAtom(xml, source) {
    const posts = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];
        
        const title = extractTag(entry, 'title');
        const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i) 
                       || entry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
                       || entry.match(/<link[^>]*href=["']([^"']+)["']/i);
        const link = linkMatch ? linkMatch[1] : null;
        const published = extractTag(entry, 'published') || extractTag(entry, 'updated');
        const authorName = extractTag(entry, 'name');

        if (title && link) {
            posts.push({
                title: cleanText(title),
                url: cleanText(link),
                date: published ? new Date(published).toISOString() : new Date().toISOString(),
                author: cleanText(authorName) || source.name,
                source: source.source
            });
        }
    }

    return posts;
}

// Parse arXiv Atom feed with author filtering
function parseArxiv(xml, source) {
    const posts = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];
        
        // Extract all authors
        const authorMatches = entry.matchAll(/<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/gi);
        const authors = [...authorMatches].map(m => m[1].trim());
        
        // Check if target author is in the list
        const targetAuthor = source.authorFilter;
        const hasTargetAuthor = authors.some(a => 
            a.toLowerCase().replace(/[^\w\s]/g, '').includes(
                targetAuthor.toLowerCase().replace(/[^\w\s]/g, '')
            )
        );

        if (!hasTargetAuthor) continue;

        const title = extractTag(entry, 'title');
        const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i)
                       || entry.match(/<link[^>]*href=["']([^"']+)["']/i);
        const link = linkMatch ? linkMatch[1] : null;
        const published = extractTag(entry, 'published') || extractTag(entry, 'updated');

        if (title && link) {
            posts.push({
                title: cleanText(title).replace(/\s+/g, ' '),
                url: cleanText(link),
                date: published ? new Date(published).toISOString() : new Date().toISOString(),
                author: 'François Chollet',
                source: source.source
            });
        }
    }

    return posts;
}

// Extract content from XML tag
function extractTag(xml, tagName) {
    // Handle CDATA
    const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1];

    // Handle regular content
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}

// Clean extracted text
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// CORS headers
function handleCors() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Access-Control-Max-Age': '86400'
        }
    });
}

// JSON response with CORS
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300'
        }
    });
}
