import type { ContentType, ToneType } from '../types/content';

const TONE_INSTRUCTIONS: Record<ToneType, string> = {
  professional: 'Use formal, business-appropriate language. Maintain a polished, expert tone.',
  casual: 'Use relaxed, approachable language. Keep it conversational and easy to read.',
  urgent: 'Create a sense of immediacy. Use action-oriented language that motivates quick response.',
  friendly: 'Be warm and personable. Use inclusive language that builds connection.',
  authoritative: 'Project expertise and confidence. Back up points with clear reasoning.',
  conversational: 'Write as if having a dialogue. Use natural language and occasional questions.',
};

const CONTENT_TYPE_INSTRUCTIONS: Record<ContentType, string> = {
  'social-twitter': `Create a Twitter/X post that is concise and engaging.
- Maximum 280 characters
- Use attention-grabbing hooks
- Include relevant hashtags (1-3)
- Encourage engagement through questions or calls to action
- Consider using emojis sparingly for visual appeal`,

  'social-linkedin': `Create a LinkedIn post for a professional audience.
- Start with a compelling hook (first 2 lines are crucial)
- Use short paragraphs and line breaks for readability
- Include a clear call to action
- Aim for 1000-1500 characters for optimal engagement
- Keep it professional but personable
- Consider adding relevant hashtags at the end`,

  'social-instagram': `Create an Instagram caption that complements visual content.
- Start with an engaging first line (before the "more" cut-off)
- Use a conversational, authentic tone
- Include a call to action
- Add relevant hashtags (can be in comment section)
- Consider using emojis to add personality
- Aim for 150-300 characters for the main message`,

  'email-marketing': `Create a marketing email that drives action.
Structure:
- Subject line: Compelling, 40-60 characters
- Preview text: Extend the subject line intrigue
- Opening: Hook the reader immediately
- Body: Clear value proposition with benefits
- Call to action: Specific, action-oriented button text
- Closing: Reinforce the value

Keep paragraphs short and scannable.`,

  newsletter: `Create newsletter content that informs and engages subscribers.
Structure:
- Headline: Clear, informative
- Introduction: Set context and preview content
- Main sections: Well-organized with subheadings
- Key takeaways: Summarize important points
- Next steps or call to action

Balance educational content with promotional elements.`,

  article: `Create a well-structured article or blog post.
Structure:
- Headline: SEO-friendly, compelling
- Introduction: Hook + thesis statement
- Body: Organized with subheadings (H2, H3)
- Supporting points with examples/data
- Conclusion: Summarize + call to action

Use clear transitions between sections.
Include relevant statistics or examples where appropriate.`,

  'infographic-copy': `Create text content designed for an infographic layout.
Structure:
- Main headline: 5-8 words, impactful
- Section headers: Short, clear labels
- Data points: Concise statistics with context
- Supporting text: Brief explanations (1-2 sentences each)
- Call to action or conclusion

Use numbers, percentages, and short phrases.
Optimize for visual scanning.`,
};

export function buildSystemPrompt(contentType: ContentType, tone: ToneType): string {
  return `You are an expert content creator for a financial services editorial team. Your role is to create compelling, accurate, and engaging content that resonates with the target audience.

CONTENT TYPE: ${contentType}
${CONTENT_TYPE_INSTRUCTIONS[contentType]}

TONE: ${tone}
${TONE_INSTRUCTIONS[tone]}

GUIDELINES:
- Base your content on the source material provided
- Maintain factual accuracy - do not invent statistics or claims
- Adapt the source material's key messages to the target format
- Use industry-appropriate terminology
- Ensure content is compliant and appropriate for financial services
- Create content that adds value and engages the reader

OUTPUT FORMAT:
- Provide the final content ready for use
- If creating an email, clearly label Subject Line, Preview Text, and Body
- For social posts, include hashtag suggestions
- For articles, include suggested headline`;
}

export function buildUserPrompt(
  contentType: ContentType,
  sourceContent: string,
  customPrompt?: string,
  additionalContext?: string
): string {
  let prompt = `Create ${contentType.replace('-', ' ')} content based on the following source material:

---SOURCE MATERIAL---
${sourceContent}
---END SOURCE MATERIAL---`;

  if (customPrompt) {
    prompt += `\n\nSPECIFIC INSTRUCTIONS:\n${customPrompt}`;
  }

  if (additionalContext) {
    prompt += `\n\nADDITIONAL CONTEXT:\n${additionalContext}`;
  }

  return prompt;
}
