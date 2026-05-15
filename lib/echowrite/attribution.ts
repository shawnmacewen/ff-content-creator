export type AttributionSpan = {
  text: string;
  sourceId: string | null;
  snippet: string | null;
  confidence: number | null;
  citationNumber: number | null;
};

function cleanTokens(x: string) {
  return x
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3);
}

export function sentenceSplit(text: string) {
  return text
    .split(/\n{2,}/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function overlapScore(a: string, b: string) {
  const aSet = new Set(cleanTokens(a));
  const bSet = new Set(cleanTokens(b));
  if (!aSet.size || !bSet.size) return 0;
  let overlap = 0;
  for (const t of aSet) if (bSet.has(t)) overlap += 1;
  return overlap;
}

export function buildAttribution(
  content: string,
  sources: Array<{ id: string; title: string; bodySnippet?: string }>
): {
  spans: AttributionSpan[];
  citationMap: Map<string, number>;
} {
  const sentences = sentenceSplit(content);
  const citationMap = new Map<string, number>();
  let nextCitation = 1;

  const spans: AttributionSpan[] = sentences.map((sentence) => {
    let best: { sourceId: string | null; snippet: string | null; score: number } = {
      sourceId: null,
      snippet: null,
      score: 0,
    };

    for (const s of sources) {
      const snip = String(s.bodySnippet || '');
      const score = overlapScore(sentence, snip);
      if (score > best.score) {
        best = { sourceId: s.id, snippet: snip.slice(0, 320), score };
      }
    }

    const hasMatch = best.score > 0 && best.sourceId;
    let citationNumber: number | null = null;
    if (hasMatch) {
      if (!citationMap.has(best.sourceId!)) {
        citationMap.set(best.sourceId!, nextCitation);
        nextCitation += 1;
      }
      citationNumber = citationMap.get(best.sourceId!) || null;
    }

    return {
      text: sentence,
      sourceId: hasMatch ? best.sourceId : null,
      snippet: hasMatch ? best.snippet : null,
      confidence: hasMatch ? Math.min(0.99, 0.55 + Math.min(0.44, best.score * 0.06)) : null,
      citationNumber,
    };
  });

  return { spans, citationMap };
}
