import type { SourceContent } from '../types/content';

// Mock source content representing existing editorial material
// This simulates content from an external API that the AI will learn from
export const MOCK_SOURCE_CONTENT: SourceContent[] = [
  {
    id: 'src-001',
    title: 'The Future of Digital Finance: Trends to Watch in 2026',
    body: `The financial services industry continues to evolve at an unprecedented pace. As we look ahead to 2026, several key trends are reshaping how institutions and consumers interact with money.

Artificial intelligence is no longer just a buzzword—it's becoming the backbone of financial decision-making. From risk assessment to customer service, AI-powered solutions are delivering faster, more accurate results than ever before.

Blockchain technology has matured beyond cryptocurrency speculation. Enterprise adoption is accelerating, with major institutions implementing distributed ledger solutions for everything from cross-border payments to securities settlement.

The rise of embedded finance means that financial services are increasingly invisible, woven seamlessly into the fabric of everyday digital experiences. Whether you're shopping online, booking travel, or managing your business, financial tools are right there when you need them.

Sustainability has moved from nice-to-have to must-have. ESG considerations are now central to investment decisions, and green finance products are seeing explosive growth.`,
    excerpt: 'Exploring the key trends reshaping financial services, from AI adoption to sustainable investing.',
    type: 'article',
    tags: ['finance', 'technology', 'trends', 'AI', 'blockchain'],
    publishedAt: '2026-05-01T10:00:00Z',
    author: 'Sarah Chen',
    url: 'https://example.com/future-digital-finance',
  },
  {
    id: 'src-002',
    title: 'Quarterly Market Update: Q1 2026 Performance Review',
    body: `The first quarter of 2026 delivered mixed results across global markets, with technology stocks leading gains while traditional sectors showed more modest performance.

Key Highlights:
- S&P 500 gained 4.2% for the quarter
- Technology sector outperformed with 7.8% returns
- Fixed income markets stabilized after 2025 volatility
- Emerging markets showed renewed strength

Our analysis suggests that investors should maintain diversified portfolios while considering tactical allocations to sectors benefiting from AI adoption and infrastructure spending.

Looking ahead, we anticipate continued volatility around central bank policy decisions, but remain cautiously optimistic about equity market prospects for the remainder of the year.`,
    excerpt: 'Q1 2026 market review highlighting technology sector strength and portfolio positioning recommendations.',
    type: 'newsletter',
    tags: ['markets', 'quarterly-update', 'investing', 'analysis'],
    publishedAt: '2026-04-15T08:00:00Z',
    author: 'Michael Torres',
    url: 'https://example.com/q1-2026-update',
  },
  {
    id: 'src-003',
    title: 'Client Success Story: Modernizing Portfolio Management',
    body: `When Apex Wealth Management approached us with their digital transformation challenges, they were facing a common problem: legacy systems that couldn't keep pace with client expectations.

The Challenge:
Apex's existing infrastructure required manual processes for portfolio rebalancing, client reporting, and compliance checks. This created bottlenecks and increased operational risk.

Our Solution:
We implemented an integrated platform that automated 80% of routine operations while providing real-time visibility into portfolio performance and risk metrics.

The Results:
- 60% reduction in operational processing time
- 99.9% accuracy in automated compliance checks
- Client satisfaction scores increased by 35%
- Advisors freed up to focus on high-value client relationships

"The transformation has been remarkable," says Jennifer Walsh, COO of Apex Wealth Management. "We've gone from struggling to keep up to setting the pace in our market."`,
    excerpt: 'How Apex Wealth Management transformed operations with modern portfolio management technology.',
    type: 'case-study',
    tags: ['client-success', 'digital-transformation', 'wealth-management', 'automation'],
    publishedAt: '2026-03-20T14:00:00Z',
    author: 'David Park',
    url: 'https://example.com/apex-case-study',
  },
  {
    id: 'src-004',
    title: 'Understanding the New SEC Climate Disclosure Rules',
    body: `The Securities and Exchange Commission's new climate disclosure requirements represent a significant shift in corporate reporting obligations. Here's what financial professionals need to know.

Effective Dates:
Large accelerated filers must begin reporting in fiscal 2026, with smaller companies following in subsequent years.

Key Requirements:
1. Scope 1 and 2 greenhouse gas emissions disclosure
2. Climate-related risks and their financial impacts
3. Board oversight of climate-related matters
4. Climate-related targets and transition plans

Preparation Steps:
Companies should begin by assessing their current emissions data collection capabilities and identifying gaps. Establishing baseline measurements now will be critical for demonstrating progress.

The investment implications are significant. Companies with robust climate governance and clear transition strategies may be viewed more favorably by investors increasingly focused on sustainability metrics.`,
    excerpt: 'A guide to the SEC climate disclosure requirements and their implications for financial reporting.',
    type: 'article',
    tags: ['regulation', 'SEC', 'climate', 'ESG', 'compliance'],
    publishedAt: '2026-02-28T09:00:00Z',
    author: 'Rachel Kim',
    url: 'https://example.com/sec-climate-rules',
  },
  {
    id: 'src-005',
    title: 'Webinar Recap: AI in Investment Research',
    body: `Last week's webinar on artificial intelligence in investment research drew over 500 participants eager to understand how these technologies are reshaping the industry.

Key Takeaways:

Natural Language Processing (NLP) is revolutionizing how analysts process earnings calls, regulatory filings, and news. Leading firms report 10x improvements in document analysis speed.

Machine learning models are augmenting—not replacing—human judgment. The most successful implementations combine AI-driven insights with experienced analyst interpretation.

Data quality remains the biggest challenge. "Garbage in, garbage out" applies more than ever when training investment models.

Ethical considerations are increasingly important. Firms must ensure AI systems don't perpetuate biases or create unfair advantages.

The consensus among our panelists: AI adoption is no longer optional for firms wanting to remain competitive, but implementation requires careful planning and appropriate governance.`,
    excerpt: 'Highlights from our webinar exploring how AI is transforming investment research practices.',
    type: 'article',
    tags: ['AI', 'investment-research', 'webinar', 'technology'],
    publishedAt: '2026-04-05T16:00:00Z',
    author: 'James Liu',
    url: 'https://example.com/ai-research-webinar',
  },
  {
    id: 'src-006',
    title: 'Monthly Economic Outlook: May 2026',
    body: `Economic Indicators at a Glance:
- GDP Growth: 2.3% (annualized)
- Unemployment: 3.8%
- Inflation (CPI): 2.4%
- Fed Funds Rate: 4.25%

Analysis:
The economy continues to demonstrate resilience despite elevated interest rates. Consumer spending remains robust, supported by a strong labor market and moderating inflation.

The Federal Reserve is expected to maintain its current policy stance through mid-year, with potential rate cuts in the second half of 2026 if inflation continues its downward trajectory.

Key risks to watch include geopolitical tensions affecting energy markets, potential commercial real estate stress, and the impact of AI adoption on labor markets.

Our View:
We maintain a constructive outlook on the U.S. economy, expecting a soft landing rather than recession. However, we recommend maintaining defensive positioning in portfolios given elevated uncertainty.`,
    excerpt: 'May 2026 economic analysis covering growth, inflation, and Federal Reserve policy outlook.',
    type: 'newsletter',
    tags: ['economics', 'outlook', 'Federal-Reserve', 'inflation'],
    publishedAt: '2026-05-05T07:00:00Z',
    author: 'Patricia Nguyen',
    url: 'https://example.com/may-2026-outlook',
  },
  {
    id: 'src-007',
    title: 'New Product Launch: Sustainable Income Fund',
    body: `We're excited to announce the launch of our Sustainable Income Fund, designed for investors seeking attractive yields while maintaining strong ESG credentials.

Fund Highlights:
- Target yield: 4.5-5.5% annually
- ESG integration across all holdings
- Focus on companies with strong sustainability practices
- Diversified across sectors and geographies

Investment Approach:
The fund invests primarily in investment-grade corporate bonds from companies demonstrating leadership in environmental sustainability, social responsibility, and governance practices.

Our proprietary ESG scoring methodology evaluates over 200 factors to identify companies that are not just avoiding harm, but actively contributing to sustainable development.

Why Now?
The sustainable fixed income market has matured significantly, offering attractive opportunities without sacrificing yield or quality. As climate regulations tighten globally, companies with strong sustainability profiles are better positioned for long-term success.`,
    excerpt: 'Introducing our new Sustainable Income Fund combining attractive yields with ESG leadership.',
    type: 'product-announcement',
    tags: ['product-launch', 'ESG', 'fixed-income', 'sustainable-investing'],
    publishedAt: '2026-04-22T11:00:00Z',
    author: 'Marketing Team',
    url: 'https://example.com/sustainable-income-fund',
  },
  {
    id: 'src-008',
    title: '5 Tips for Effective Client Communication',
    body: `Strong client relationships are built on clear, consistent communication. Here are five strategies our top advisors use to keep clients informed and engaged.

1. Set Clear Expectations Early
During onboarding, establish how often clients will hear from you and through what channels. Consistency builds trust.

2. Lead with What Matters
Don't bury the key message. Whether it's good news or bad, clients appreciate directness. Start with the bottom line, then provide supporting details.

3. Use Plain Language
Avoid jargon whenever possible. If you must use technical terms, explain them. Your expertise shows through clear explanations, not complex vocabulary.

4. Be Proactive, Not Reactive
Don't wait for clients to call with questions. Reach out before market events or when their situation changes. Anticipating needs demonstrates attentiveness.

5. Listen More Than You Speak
The best communicators are great listeners. Ask questions, understand concerns, and tailor your communication to each client's needs and preferences.

Remember: every interaction is an opportunity to strengthen the relationship.`,
    excerpt: 'Five proven strategies for building stronger client relationships through effective communication.',
    type: 'article',
    tags: ['client-relations', 'communication', 'best-practices', 'advisors'],
    publishedAt: '2026-03-10T13:00:00Z',
    author: 'Amanda Foster',
    url: 'https://example.com/client-communication-tips',
  },
  {
    id: 'src-009',
    title: 'Technology Infrastructure Investment Thesis',
    body: `The digital infrastructure buildout represents one of the most compelling investment themes of the decade. Here's our analysis of the opportunity.

Driving Forces:
- AI computing demands are driving unprecedented data center expansion
- Cloud adoption continues accelerating across industries
- Edge computing requires distributed infrastructure investments
- 5G rollout creating new connectivity requirements

Key Investment Areas:
1. Data Center REITs - benefiting from hyperscaler expansion
2. Semiconductor companies - especially AI chip manufacturers
3. Networking equipment - supporting increased data traffic
4. Power infrastructure - critical for energy-intensive computing

Risks to Consider:
- Valuation concerns in some segments
- Supply chain constraints
- Regulatory scrutiny of large technology platforms
- Energy sustainability challenges

Our Positioning:
We favor diversified exposure across the infrastructure stack, with particular emphasis on companies demonstrating pricing power and sustainable competitive advantages.`,
    excerpt: 'Investment analysis of the digital infrastructure buildout driven by AI and cloud computing demands.',
    type: 'research',
    tags: ['investment-thesis', 'technology', 'infrastructure', 'AI'],
    publishedAt: '2026-04-18T10:00:00Z',
    author: 'Robert Chen',
    url: 'https://example.com/tech-infrastructure-thesis',
  },
  {
    id: 'src-010',
    title: 'Retirement Planning in an Era of Longevity',
    body: `Life expectancy continues to increase, fundamentally changing retirement planning assumptions. Today's retirees may need their savings to last 30+ years.

Key Considerations:

Spending Patterns Evolve
Early retirement often involves higher spending on travel and activities. Later years may see healthcare costs rise. Plan for changing needs across retirement phases.

Inflation Remains a Risk
Over a 30-year retirement, even modest inflation significantly erodes purchasing power. Portfolios need growth assets to maintain real value.

Healthcare Costs Require Planning
Medicare doesn't cover everything. Long-term care insurance or dedicated savings for potential care needs should be part of the plan.

Social Security Optimization
Delaying benefits can significantly increase lifetime income. For married couples, coordinated claiming strategies can maximize household benefits.

Flexibility is Key
The best retirement plans allow for adjustments. Regular reviews and willingness to modify spending or portfolio strategy help navigate unexpected challenges.

Working with a financial advisor to create a comprehensive plan that addresses longevity risk is more important than ever.`,
    excerpt: 'How increasing life expectancy is reshaping retirement planning strategies and considerations.',
    type: 'article',
    tags: ['retirement', 'financial-planning', 'longevity', 'healthcare'],
    publishedAt: '2026-02-15T09:00:00Z',
    author: 'Linda Martinez',
    url: 'https://example.com/retirement-longevity',
  },
  {
    id: 'src-011',
    title: 'Global Markets Weekly: Trade Tensions and Currency Moves',
    body: `This Week in Review:

Trade Policy Developments
New tariff announcements impacted Asian markets mid-week, though cooler rhetoric by Friday helped stabilize sentiment. Supply chain diversification remains a key theme.

Currency Markets
The dollar weakened against major currencies as markets priced in potential Fed rate cuts. EUR/USD broke above 1.12 for the first time since October.

Emerging Markets
Latin American equities outperformed, led by Brazilian financials. Asian markets were mixed, with China showing resilience despite trade concerns.

Commodities
Oil prices stabilized around $75/barrel. Gold reached new highs as investors sought safe-haven assets amid uncertainty.

Looking Ahead
Key events next week include:
- FOMC meeting minutes release
- Eurozone PMI data
- U.S. employment report

Portfolio Implications
We maintain our slight overweight to international equities, viewing the dollar weakness as supportive of non-U.S. returns for U.S.-based investors.`,
    excerpt: 'Weekly global markets summary covering trade policy, currency movements, and emerging market performance.',
    type: 'newsletter',
    tags: ['global-markets', 'weekly-update', 'currencies', 'trade-policy'],
    publishedAt: '2026-05-09T17:00:00Z',
    author: 'International Team',
    url: 'https://example.com/global-weekly-may-9',
  },
  {
    id: 'src-012',
    title: 'The Rise of Direct Indexing: What Advisors Need to Know',
    body: `Direct indexing has emerged as one of the fastest-growing segments in wealth management. Here's why it matters and how advisors can leverage it for clients.

What is Direct Indexing?
Instead of buying an ETF or mutual fund, direct indexing involves purchasing the individual securities that make up an index. This provides several advantages.

Tax-Loss Harvesting
The primary benefit. Owning individual securities allows advisors to sell losing positions to offset gains while maintaining market exposure through similar holdings.

Customization
Clients can exclude specific stocks or sectors based on personal values, concentrated positions, or other preferences without sacrificing diversification.

ESG Integration
Direct indexing makes it easy to implement custom ESG screens, excluding companies that don't meet client-defined criteria.

Cost Considerations
Technology has dramatically reduced implementation costs. What once required significant minimums is now accessible to clients with $100,000 or less.

When Does It Make Sense?
Direct indexing provides the most value for taxable accounts with significant capital gains. Tax-advantaged accounts benefit less from the tax-loss harvesting capability.

The bottom line: direct indexing is no longer a niche solution for the ultra-wealthy—it's becoming a mainstream wealth management tool.`,
    excerpt: 'Understanding direct indexing benefits and implementation considerations for wealth advisors.',
    type: 'article',
    tags: ['direct-indexing', 'tax-management', 'wealth-management', 'advisors'],
    publishedAt: '2026-03-25T11:00:00Z',
    author: 'Kevin Wright',
    url: 'https://example.com/direct-indexing-guide',
  },
];

// Helper functions for filtering and searching mock content
export function searchSourceContent(
  query: string,
  filters?: {
    type?: string;
    tags?: string[];
    author?: string;
  }
): SourceContent[] {
  let results = [...MOCK_SOURCE_CONTENT];

  // Text search across title, body, and excerpt
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (content) =>
        content.title.toLowerCase().includes(lowerQuery) ||
        content.body.toLowerCase().includes(lowerQuery) ||
        content.excerpt.toLowerCase().includes(lowerQuery) ||
        content.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Filter by type
  if (filters?.type) {
    results = results.filter((content) => content.type === filters.type);
  }

  // Filter by tags
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter((content) =>
      filters.tags!.some((tag) => content.tags.includes(tag))
    );
  }

  // Filter by author
  if (filters?.author) {
    results = results.filter((content) =>
      content.author.toLowerCase().includes(filters.author!.toLowerCase())
    );
  }

  return results;
}

export function getSourceContentById(id: string): SourceContent | undefined {
  return MOCK_SOURCE_CONTENT.find((content) => content.id === id);
}

export function getSourceContentByIds(ids: string[]): SourceContent[] {
  return MOCK_SOURCE_CONTENT.filter((content) => ids.includes(content.id));
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  MOCK_SOURCE_CONTENT.forEach((content) => {
    content.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

export function getAllTypes(): string[] {
  const typeSet = new Set<string>();
  MOCK_SOURCE_CONTENT.forEach((content) => {
    typeSet.add(content.type);
  });
  return Array.from(typeSet).sort();
}

export function getAllAuthors(): string[] {
  const authorSet = new Set<string>();
  MOCK_SOURCE_CONTENT.forEach((content) => {
    authorSet.add(content.author);
  });
  return Array.from(authorSet).sort();
}
