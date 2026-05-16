// Content types supported by the platform
export type ContentType =
  | 'social-twitter'
  | 'social-linkedin'
  | 'social-instagram'
  | 'email-marketing'
  | 'newsletter'
  | 'article'
  | 'infographic-copy'
  | 'faq';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export type ToneType =
  | 'professional'
  | 'casual'
  | 'urgent'
  | 'friendly'
  | 'authoritative'
  | 'conversational';

// Source content from external API
export interface SourceContent {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  type: string;
  tags: string[];
  publishedAt: string;
  author: string;
  url?: string;
  imageUrl?: string;
  sourceSystem?: string;
  publisher?: string;
  externalId?: string | null;
  metadata?: Record<string, any>;
}

// Version tracking for content
export interface ContentVersion {
  id: string;
  content: string;
  createdAt: string;
  note?: string;
}

// Generated content
export interface GeneratedContent {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  sourceContentIds: string[];
  prompt: string;
  tone: ToneType;
  status: ContentStatus;
  versions: ContentVersion[];
  createdAt: string;
  updatedAt: string;
}

// Content type metadata for UI
export interface ContentTypeInfo {
  id: ContentType;
  label: string;
  description: string;
  icon: string;
  category: 'social' | 'email' | 'long-form';
  maxLength?: number;
  placeholder?: string;
}

// Generation request
export interface GenerationRequest {
  type: ContentType;
  sourceContentIds: string[];
  customPrompt?: string;
  tone: ToneType;
  additionalContext?: string;
}

// API response types
export interface SourceContentResponse {
  data: SourceContent[];
  total: number;
  page: number;
  pageSize: number;
}

// Dashboard stats
export interface DashboardStats {
  totalGenerated: number;
  generatedThisWeek: number;
  byType: Record<ContentType, number>;
  byStatus: Record<ContentStatus, number>;
}
