export type AttributionSpan = {
  text: string;
  sourceId: string | null;
  snippet: string | null;
  confidence: number | null;
  citationNumber: number | null;
};

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'because',
  'before',
  'between',
  'could',
  'from',
  'have',
  'into',
  'more',
  'most',
  'only',
  'other',
  'over',
  'should',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
]);

function cleanTokens(x: string) {
  return x
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3 && !STOP_WORDS.has(t));
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

function splitSourcePassages(text: string) {
  const sentences = sentenceSplit(text);
  if (!sentences.length && text.trim()) return [text.trim().slice(0, 420)];

  const passages: string[] = [];
  for (let i = 0; i < sentences.length; i += 1) {
    passages.push(sentences.slice(i, i + 2).join(' ').slice(0, 520));
  }
  return passages;
}

function passageMatchScore(sentence: string, passage: string) {
  const sentenceTokens = new Set(cleanTokens(sentence));
  const passageTokens = new Set(cleanTokens(passage));
  if (sentenceTokens.size < 3 || !passageTokens.size) return { overlap: 0, normalized: 0 };

  let overlap = 0;
  for (const token of sentenceTokens) {
    if (passageTokens.has(token)) overlap += 1;
  }

  return {
    overlap,
    normalized: overlap / Math.max(1, sentenceTokens.size),
  };
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
    let best: { sourceId: string | null; snippet: string | null; overlap: number; normalized: number } = {
      sourceId: null,
      snippet: null,
      overlap: 0,
      normalized: 0,
    };

    for (const s of sources) {
      const snip = String(s.bodySnippet || '');
      for (const passage of splitSourcePassages(snip)) {
        const score = passageMatchScore(sentence, passage);
        const betterOverlap = score.overlap > best.overlap;
        const betterNormalized = score.overlap === best.overlap && score.normalized > best.normalized;
        if (betterOverlap || betterNormalized) {
          best = {
            sourceId: s.id,
            snippet: passage,
            overlap: score.overlap,
            normalized: score.normalized,
          };
        }
      }
    }

    const hasMatch = best.sourceId && best.overlap >= 2 && best.normalized >= 0.18;
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
      confidence: hasMatch ? Math.min(0.99, 0.45 + Math.min(0.5, best.normalized)) : null,
      citationNumber,
    };
  });

  return { spans, citationMap };
}
