import type { GeneratedContent, ContentType, ContentStatus } from '../types/content';

const STORAGE_KEY = 'ff-content-library';

export function getStoredContent(): GeneratedContent[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as GeneratedContent[];
  } catch {
    return [];
  }
}

export function saveContent(content: GeneratedContent): void {
  if (typeof window === 'undefined') return;
  
  const existing = getStoredContent();
  const index = existing.findIndex((c) => c.id === content.id);
  
  if (index >= 0) {
    existing[index] = content;
  } else {
    existing.unshift(content);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteContent(id: string): void {
  if (typeof window === 'undefined') return;
  
  const existing = getStoredContent();
  const filtered = existing.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getContentById(id: string): GeneratedContent | undefined {
  return getStoredContent().find((c) => c.id === id);
}

export function getContentByType(type: ContentType): GeneratedContent[] {
  return getStoredContent().filter((c) => c.type === type);
}

export function getContentByStatus(status: ContentStatus): GeneratedContent[] {
  return getStoredContent().filter((c) => c.status === status);
}

export function getRecentContent(limit = 10): GeneratedContent[] {
  return getStoredContent()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getContentStats() {
  const content = getStoredContent();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const thisWeek = content.filter((c) => new Date(c.createdAt) >= weekAgo);
  
  const byType = content.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byStatus = content.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const socialCount = content.filter((c) => c.type.startsWith('social-')).length;
  const emailCount = content.filter((c) => c.type.includes('email') || c.type.includes('newsletter')).length;
  const articleCount = content.filter((c) => c.type === 'article' || c.type === 'infographic-copy').length;
  
  return {
    totalGenerated: content.length,
    generatedThisWeek: thisWeek.length,
    byType,
    byStatus,
    socialCount,
    emailCount,
    articleCount,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
