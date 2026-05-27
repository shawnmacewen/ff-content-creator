export function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function normalizeSourceText(input: string): string {
  const decoded = decodeHtmlEntities(input || '');
  return decoded
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    .replace(/<crossreference[^>]*>([\s\S]*?)<\/crossreference>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitTerms(input?: string | string[]): string[] {
  if (Array.isArray(input)) return input.map((term) => term.trim()).filter(Boolean);
  const text = String(input || '').trim();
  if (!text) return [];

  const quoted = Array.from(text.matchAll(/"([^"]+)"/g))
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  const unquoted = text
    .replace(/"[^"]+"/g, ' ')
    .split(/,|\n|;/g)
    .map((term) => term.trim())
    .filter(Boolean);

  return Array.from(new Set([...quoted, ...unquoted]));
}

export function textIncludesTerm(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

export function findMatchedTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => textIncludesTerm(text, term));
}

export function makeSnippet(text: string, terms: string[], fallbackLength = 260): string {
  const clean = normalizeSourceText(text);
  if (!clean) return '';

  const lower = clean.toLowerCase();
  const hit = terms.find((term) => term && lower.includes(term.toLowerCase()));
  if (!hit) return clean.slice(0, fallbackLength);

  const idx = lower.indexOf(hit.toLowerCase());
  const start = Math.max(0, idx - 100);
  const end = Math.min(clean.length, idx + hit.length + 160);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export function scoreTextMatch(args: {
  text: string;
  includeTerms: string[];
  excludeTerms: string[];
  mode: 'all' | 'any';
}) {
  const matchedTerms = findMatchedTerms(args.text, args.includeTerms);
  const excludedTerms = findMatchedTerms(args.text, args.excludeTerms);
  const includeOk = args.mode === 'any'
    ? matchedTerms.length > 0
    : matchedTerms.length === args.includeTerms.length;

  return {
    includeOk,
    excludeOk: excludedTerms.length === 0,
    matchedTerms,
    excludedTerms,
    score: matchedTerms.length * 10 - excludedTerms.length * 25,
  };
}
