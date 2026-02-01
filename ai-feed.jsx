import React, { useState, useEffect } from 'react';

// Mock data structure - in production this would come from RSS feeds or APIs
const FEED_SOURCES = [
  {
    name: 'Gary Marcus',
    handle: '@GaryMarcus',
    sources: ['Substack', 'Twitter'],
    category: 'skeptic'
  },
  {
    name: 'Francois Chollet',
    handle: '@fchollet',
    sources: ['Twitter', 'arXiv'],
    category: 'skeptic'
  },
  {
    name: 'Yann LeCun',
    handle: '@ylecun',
    sources: ['Twitter', 'Meta AI Blog'],
    category: 'skeptic'
  },
  {
    name: 'Andrej Karpathy',
    handle: '@karpathy',
    sources: ['Blog', 'Twitter'],
    category: 'optimist'
  },
  {
    name: 'Simon Willison',
    handle: '@simonw',
    sources: ['Blog', 'Twitter'],
    category: 'optimist'
  },
  {
    name: 'Eliezer Yudkowsky',
    handle: '@ESYudkowsky',
    sources: ['LessWrong', 'Twitter'],
    category: 'safety'
  },
  {
    name: 'Paul Christiano',
    handle: '@paulfchristiano',
    sources: ['Alignment Forum', 'Twitter'],
    category: 'safety'
  },
  {
    name: 'Emad Mostaque',
    handle: '@EMostaque',
    sources: ['Twitter'],
    category: 'builder'
  },
  {
    name: 'Mustafa Suleyman',
    handle: '@mustafasuleyman',
    sources: ['Twitter', 'Interviews'],
    category: 'builder'
  },
  {
    name: 'Steve Yegge',
    handle: '@steve_yegge',
    sources: ['Blog', 'Twitter'],
    category: 'optimist'
  }
];

// Sample posts - this would be populated by actual RSS/API data
const generateSamplePosts = () => {
  const posts = [
    {
      id: 1,
      author: 'Gary Marcus',
      title: 'Why LLMs Still Can\'t Reason: A Response to the Latest Benchmarks',
      url: 'https://garymarcus.substack.com/p/sample-post',
      source: 'Substack',
      timestamp: new Date('2025-01-31T10:30:00'),
      points: 142,
      comments: 89
    },
    {
      id: 2,
      author: 'Simon Willison',
      title: 'Using Claude\'s new prompt caching for cost-effective RAG systems',
      url: 'https://simonwillison.net/sample',
      source: 'Blog',
      timestamp: new Date('2025-01-31T08:15:00'),
      points: 234,
      comments: 45
    },
    {
      id: 3,
      author: 'Andrej Karpathy',
      title: 'Building a minimal GPT from scratch in 300 lines of clean code',
      url: 'https://karpathy.github.io/sample',
      source: 'Blog',
      timestamp: new Date('2025-01-30T16:20:00'),
      points: 891,
      comments: 156
    },
    {
      id: 4,
      author: 'Francois Chollet',
      title: 'ARC-AGI results show o3 still fails on novel reasoning tasks',
      url: 'https://twitter.com/fchollet/status/sample',
      source: 'Twitter',
      timestamp: new Date('2025-01-30T14:45:00'),
      points: 267,
      comments: 92
    },
    {
      id: 5,
      author: 'Eliezer Yudkowsky',
      title: 'Alignment tax is not optional: why capability and safety diverge',
      url: 'https://lesswrong.com/sample',
      source: 'LessWrong',
      timestamp: new Date('2025-01-29T11:00:00'),
      points: 178,
      comments: 203
    },
    {
      id: 6,
      author: 'Yann LeCun',
      title: 'Auto-regressive models are not the path to AGI',
      url: 'https://twitter.com/ylecun/status/sample',
      source: 'Twitter',
      timestamp: new Date('2025-01-29T09:30:00'),
      points: 445,
      comments: 178
    }
  ];
  return posts;
};

const AIFeedAggregator = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  
  useEffect(() => {
    // In production, this would fetch from RSS feeds or APIs
    setPosts(generateSamplePosts());
  }, []);

  const getTimeSince = (timestamp) => {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getCategoryForAuthor = (authorName) => {
    const source = FEED_SOURCES.find(s => s.name === authorName);
    return source ? source.category : 'other';
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return getCategoryForAuthor(post.author) === filter;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'new') {
      return b.timestamp - a.timestamp;
    } else {
      return b.points - a.points;
    }
  });

  return (
    <div className="min-h-screen bg-[#f6f6ef]">
      {/* Header */}
      <div className="bg-[#ff6600] px-2 py-1">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="w-5 h-5 bg-white border-2 border-white"></div>
          <span className="font-bold text-sm">AI Thought Leaders Feed</span>
          <nav className="ml-4 flex gap-3 text-sm">
            <a href="#" className="hover:underline">new</a>
            <a href="#" className="hover:underline">past</a>
            <a href="#" className="hover:underline">comments</a>
            <a href="#" className="hover:underline">sources</a>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-2 py-3 border-b border-gray-300 bg-white">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded ${filter === 'all' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('skeptic')}
            className={`px-2 py-1 rounded ${filter === 'skeptic' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
          >
            AI Skeptics
          </button>
          <button
            onClick={() => setFilter('optimist')}
            className={`px-2 py-1 rounded ${filter === 'optimist' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
          >
            Optimists
          </button>
          <button
            onClick={() => setFilter('safety')}
            className={`px-2 py-1 rounded ${filter === 'safety' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
          >
            Safety/Alignment
          </button>
          <button
            onClick={() => setFilter('builder')}
            className={`px-2 py-1 rounded ${filter === 'builder' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
          >
            Builders
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-gray-600">Sort:</span>
            <button
              onClick={() => setSortBy('new')}
              className={`px-2 py-1 rounded ${sortBy === 'new' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
            >
              New
            </button>
            <button
              onClick={() => setSortBy('points')}
              className={`px-2 py-1 rounded ${sortBy === 'points' ? 'bg-[#ff6600] text-white' : 'hover:bg-gray-100'}`}
            >
              Top
            </button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="max-w-5xl mx-auto bg-white">
        {sortedPosts.map((post, index) => (
          <div key={post.id} className="px-2 py-1 border-b border-gray-200 hover:bg-gray-50">
            <div className="flex gap-2">
              <span className="text-gray-500 text-sm mt-1 w-8">{index + 1}.</span>
              <div className="flex-1">
                <div className="flex items-start gap-1">
                  <a 
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {post.title}
                  </a>
                  <span className="text-xs text-gray-500 ml-1">
                    ({post.source})
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-semibold text-gray-700">{post.author}</span>
                  {' • '}
                  {getTimeSince(post.timestamp)}
                  <span className="mx-1">|</span>
                  <a href="#" className="hover:underline">{post.comments} comments</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="max-w-5xl mx-auto px-2 py-6 text-xs text-gray-600 bg-white">
        <div className="border-t border-gray-300 pt-4">
          <p className="mb-2">
            <strong>Note:</strong> This is a demo with sample data. In production, this would:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Fetch real RSS feeds from blogs (Gary Marcus Substack, Simon Willison, Karpathy blog)</li>
            <li>Use Twitter API to pull recent tweets from handles</li>
            <li>Monitor LessWrong/Alignment Forum for new posts</li>
            <li>Check arXiv for new papers from researchers</li>
            <li>Update every 15-30 minutes with new content</li>
          </ul>
          <p className="mt-3 text-gray-500">
            Technologies needed: RSS feed parser, Twitter API access, backend service for polling/caching
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIFeedAggregator;
