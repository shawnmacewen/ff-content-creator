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
  const includeRaw = parts[0] || '';
  const excludeRaw = parts.slice(1).join(' ');

  const includeTokens = includeRaw
    .replace(/"[^"]+"/g, ' ')
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const excludeTokens = excludeRaw
    .replace(/"[^"]+"/g, ' ')
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const mustInclude = Array.from(new Set([...quoted, ...includeTokens]));
  const mustExclude = Array.from(new Set(extractQuoted(excludeRaw).concat(excludeTokens)));

  return { mustInclude, mustExclude, mode };
}
