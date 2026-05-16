import type { ContentType, ContentTypeInfo, ToneType } from './types/content';

export const CONTENT_TYPES: ContentTypeInfo[] = [
  {
    id: 'social-twitter',
    label: 'Twitter/X Post',
    description: 'Short-form posts for Twitter/X (280 chars)',
    icon: 'twitter',
    category: 'social',
    maxLength: 280,
    placeholder: 'Create an engaging tweet about...',
  },
  {
    id: 'social-linkedin',
    label: 'LinkedIn Post',
    description: 'Professional posts for LinkedIn',
    icon: 'linkedin',
    category: 'social',
    maxLength: 3000,
    placeholder: 'Write a thought leadership post about...',
  },
  {
    id: 'social-instagram',
    label: 'Instagram Caption',
    description: 'Engaging captions for Instagram posts',
    icon: 'instagram',
    category: 'social',
    maxLength: 2200,
    placeholder: 'Create a captivating caption for...',
  },
  {
    id: 'email-marketing',
    label: 'Marketing Email',
    description: 'Promotional emails and campaigns',
    icon: 'mail',
    category: 'email',
    placeholder: 'Write a compelling email about...',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Regular newsletter content',
    icon: 'newspaper',
    category: 'email',
    placeholder: 'Create newsletter content covering...',
  },
  {
    id: 'article',
    label: 'Article/Blog Post',
    description: 'Long-form articles and blog content',
    icon: 'file-text',
    category: 'long-form',
    placeholder: 'Write an article about...',
  },
  {
    id: 'infographic-copy',
    label: 'Infographic Copy',
    description: 'Text content for infographics',
    icon: 'bar-chart',
    category: 'long-form',
    placeholder: 'Create copy for an infographic about...',
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions with clear, compliant answers',
    icon: 'help-circle',
    category: 'long-form',
    placeholder: 'Create an FAQ about...',
  },
];

export const TONE_OPTIONS: { value: ToneType; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and approachable' },
  { value: 'urgent', label: 'Urgent', description: 'Creates sense of immediacy' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and personable' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert and confident' },
  { value: 'conversational', label: 'Conversational', description: 'Natural dialogue style' },
];

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-emerald-500/20 text-emerald-500',
  published: 'bg-blue-500/20 text-blue-500',
};

export const CONTENT_TYPE_MAP: Record<ContentType, ContentTypeInfo> = CONTENT_TYPES.reduce(
  (acc, type) => {
    acc[type.id] = type;
    return acc;
  },
  {} as Record<ContentType, ContentTypeInfo>
);

export function getContentTypeInfo(type: ContentType): ContentTypeInfo | undefined {
  return CONTENT_TYPE_MAP[type];
}

export function getContentTypesByCategory(category: 'social' | 'email' | 'long-form'): ContentTypeInfo[] {
  return CONTENT_TYPES.filter((t) => t.category === category);
}
