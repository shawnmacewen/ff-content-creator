import type { ContentType, ToneType } from '../types/content';

const mockResponses: Record<ContentType, Record<ToneType, string>> = {
  'social-twitter': {
    professional: 'Markets reward discipline. Your portfolio strategy should reflect long-term fundamentals, not daily volatility. Focus on allocation, diversification, and consistent rebalancing. Your future self will thank you. #WealthBuilding #Investment',
    casual: 'Ever notice how the best investment moves are the boring ones? Set it, forget it, rebalance annually. That\'s literally the secret sauce. 🚀 Who else is team "boring portfolio"?',
    urgent: '⏰ Market correction = opportunity window. History shows the best time to invest is when others are fearful. Don\'t miss this. Your 2035 self will thank 2025 you.',
    friendly: 'Hey! Quick reminder: diversification isn\'t sexy but it WORKS. Mix stocks, bonds, and alternatives. Your portfolio will be less exciting but way more peaceful. Sleep better tonight! 😴',
    authoritative: 'Research demonstrates that systematic investment approaches outperform emotional decision-making by 2-3% annually. Implement a structured strategy aligned with your risk tolerance.',
    conversational: 'So I was thinking... what if your investment strategy was actually TOO complicated? Most people do better with a simple 60/40 allocation. Have you tried it?',
  },
  'social-linkedin': 'In financial services, trust isn\'t built in a quarter—it\'s built through consistent delivery, transparent communication, and putting client interests first.\n\nI\'ve seen teams that chase short-term wins lose long-term credibility. The best firms I\'ve worked with do the opposite: they invest in relationships, over-communicate during uncertainty, and stand by their commitments.\n\nWhat\'s one commitment your firm is making to clients this year? Let\'s discuss in the comments.\n\n#FinancialServices #Trust #ClientFocus',
  'social-instagram': 'Money doesn\'t buy happiness, but financial peace does. 💰 Small consistent steps lead to big wins. Start today. #FinancialFreedom',
  'email-marketing': 'Subject: Your Portfolio Deserves Better\n\nPreview: We simplified investing—now it\'s your turn\n\n---BODY---\n\nHi there,\n\nDo you feel confident about your investment strategy?\n\nMost people don\'t. And that\'s okay. Markets are complex. Our job is to simplify them.\n\nWe\'ve spent the last year refining our approach to make wealth management more accessible, transparent, and effective. The result? Better outcomes for our clients.\n\nThree things you should know:\n\n1. **Clear fees** - No hidden costs, ever\n2. **Personalized strategy** - Built around YOUR goals\n3. **Regular communication** - We keep you informed\n\nReady to take control? Let\'s talk.\n\n[SCHEDULE A CONSULTATION]\n\nBest,\nThe Team',
  newsletter: '# This Week in Markets\n\n## The Big Story\nMarkets rallied on stronger-than-expected earnings reports. The S&P 500 gained 2.3% amid optimism about interest rates.\n\n## Key Insights\n- Inflation data came in cooler than expected\n- Tech stocks led the rally\n- Bond yields declined for the week\n\n## What It Means For You\nA broad market rally is good news for diversified portfolios. If you\'ve been underweighted in equities, this might be a good time to rebalance.\n\n## Action Items\n1. Review your asset allocation\n2. Rebalance if needed\n3. Check in on your long-term goals\n\nQuestions? Reply to this email.\n\nHappy investing,\nYour Financial Team',
  article: '# Why Your Investment Strategy Needs a Reality Check\n\n## Introduction\nWe often hear from clients: "Is my portfolio doing well?" The honest answer? It depends.\n\nIt depends on your goals, your timeline, and yes—your risk tolerance. Let\'s explore how to build a strategy that actually works for you.\n\n## The Problem With "Average" Returns\nMost people compare their portfolio to the S&P 500. But that\'s apples to oranges if your portfolio should be diversified.\n\nThe real question isn\'t "Am I beating the index?" but rather "Am I on track for my goals?"\n\n## Building Your Framework\nStart with three pillars:\n\n1. **Time Horizon**: When do you need this money?\n2. **Risk Tolerance**: Can you stomach short-term volatility?\n3. **Goals**: What are you actually trying to accomplish?\n\nOnce you answer these, your asset allocation almost writes itself.\n\n## The Bottom Line\nThe best portfolio is one you can stick with. That usually means it\'s simpler than you think.\n\n---\n\nHave questions about your strategy? [Schedule a consultation with our team.](link)',
  'infographic-copy': '**Financial Freedom in 5 Steps**\n\n📊 **Step 1: Track**\nKnow where your money goes\n\n💰 **Step 2: Budget**\nAllocate intentionally\n\n📈 **Step 3: Invest**\nMake your money work\n\n🛡️ **Step 4: Protect**\nInsurance matters\n\n🎯 **Step 5: Review**\nAdjust annually\n\n**Result: 73% better outcomes** for those who follow all five steps.',
};

export function generateMockResponse(
  contentType: ContentType,
  tone: ToneType
): string {
  // Try to get the exact tone match
  if (mockResponses[contentType]?.[tone]) {
    return mockResponses[contentType][tone];
  }

  // Fallback to professional if tone not available
  return mockResponses[contentType]?.professional || 'Content generation requires an API key configuration.';
}
