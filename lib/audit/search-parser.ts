export interface ParsedSearchQuery {
  mustInclude: string[];
  mustExclude: string[];
  mode: 'all' | 'any';
}

function extractQuoted(input: string): string[] {
  const matches = input.match(/"([^"]+)"/g) || [];
  return matches.map((m) => m.slice(1, -1).trim()).filter(Boolean);
}

export function parseSearchPrompt(prompt: string): ParsedSearchQuery {
  const text = prompt.trim();
  const quoted = extractQuoted(text);

  let mode: 'all' | 'any' = 'all';
  if (/\b(any of|match any|either)\b/i.test(text)) mode = 'any';

  const parts = text.split(/\bbut not\b|\bwithout\b|\bexclude\b/i);
  let includeRaw = parts[0] || '';
  const excludeRaw = parts.slice(1).join(' ');

  // Natural-language helper: "mentions X" -> extract X
  const mentionsMatch = includeRaw.match(/\b(mentions?|contains?|includes?|with)\b\s+(.+)$/i);
  if (mentionsMatch?.[2]) includeRaw = mentionsMatch[2];

  // Remove instructional lead-ins
  includeRaw = includeRaw.replace(/^\s*(list|find|show|search|content|pieces|items|that)\s+/gi, ' ').trim();

  const stopWords = new Set(['the','and','for','that','with','from','this','those','these','into','about','every','piece','content','items','item','list','find','show']);

  const normalize = (s: string) => s
    .replace(/"[^"]+"/g, ' ')
    .split(/,|\band\b/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 2)
    .filter((x) => !stopWords.has(x.toLowerCase()));

  const includeTokens = normalize(includeRaw);
  const excludeTokens = normalize(excludeRaw);

  const mustInclude = Array.from(new Set([...quoted, ...includeTokens])).filter(Boolean);
  const mustExclude = Array.from(new Set(extractQuoted(excludeRaw).concat(excludeTokens))).filter(Boolean);

  return { mustInclude, mustExclude, mode };
}
