# Prompt for Claude Opus 4.5: Add AI Thought Leaders Feed to Personal Website

I want to add a new page to my personal website that aggregates content from leading AI thinkers. This should be a daily-check destination similar to Hacker News.

## Requirements

### Page Design
- Create a Hacker News-style feed aggregator with minimal, clean design
- Orange header bar (#ff6600) similar to HN
- Light beige background (#f6f6ef)
- Simple, readable typography focused on content over aesthetics

### Content Sources to Track
Track posts/updates from these people:

**AI Skeptics:**
- Gary Marcus (@GaryMarcus) - garymarcus.substack.com, Twitter
- Francois Chollet (@fchollet) - Twitter, arXiv papers
- Yann LeCun (@ylecun) - Twitter, Meta AI blog

**Measured Optimists:**
- Andrej Karpathy (@karpathy) - karpathy.github.io, Twitter
- Simon Willison (@simonw) - simonwillison.net, Twitter
- Steve Yegge (@steve_yegge) - Blog, Twitter

**AI Safety/Alignment:**
- Eliezer Yudkowsky (@ESYudkowsky) - LessWrong, Twitter
- Paul Christiano (@paulfchristiano) - Alignment Forum, Twitter

**Builders:**
- Emad Mostaque (@EMostaque) - Twitter
- Mustafa Suleyman (@mustafasuleyman) - Twitter

### Features Needed
1. **Feed display** - Show title, author, source, timestamp, link
2. **Filtering** - Toggle between "All", "AI Skeptics", "Optimists", "Safety/Alignment", "Builders"
3. **Sorting** - Sort by "New" or "Top" (if engagement metrics available)
4. **Auto-refresh** - Poll for new content every 15-30 minutes
5. **Persistent storage** - Don't show duplicates, maintain history

### Technical Approach
Please help me:

1. **Analyze my current website structure** to understand:
   - What framework/stack I'm using (Next.js, vanilla HTML, etc.)
   - Where pages are stored
   - How routing works
   - Whether I have a backend or if it's static

2. **Recommend the best architecture** for this feature given my setup:
   - Should this be client-side only with RSS-to-JSON services?
   - Do I need a simple backend service for polling feeds?
   - What's the simplest way to get this working quickly?

3. **Implement the solution**:
   - Create the new page/route for the AI feed
   - Set up RSS feed parsing for blogs (Gary Marcus, Simon Willison, Andrej Karpathy)
   - Implement Twitter/X integration if feasible (or suggest alternatives)
   - Add LessWrong/Alignment Forum monitoring
   - Create data storage (localStorage for simple version, or database if I have backend)
   - Make it mobile-responsive

4. **Configure feed sources**:
   - RSS feeds where available
   - For Twitter: either use API if I provide keys, or suggest alternatives (Nitter, RSS bridges)
   - LessWrong has a GraphQL API we can use
   - arXiv API for papers

### Starting Point
I've attached a React component prototype that shows the UI/UX design I want. Use this as the visual reference, but adapt it to work with my website's actual architecture.

## Questions to Ask Me
Before you start building, please:
1. Show me my current website structure
2. Ask if I have any API keys (Twitter, etc.)
3. Recommend the simplest technical approach given my setup
4. Confirm where I want this page to live (URL path)

## Deliverables
- Working page integrated into my website
- Clear documentation on how the feed updates work
- Instructions for adding/removing sources in the future
- Any necessary environment variables or API keys I need to configure

Let me know what you find about my website structure and we'll proceed from there!
