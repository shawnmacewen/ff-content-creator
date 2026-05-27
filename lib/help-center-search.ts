import {
  doDontRules,
  formatGuides,
  glossaryItems,
  helpGuides,
  quickAnswers,
  taskEntryPoints,
  troubleshootingItems,
  workflowRecipes,
} from './help-center-content';

export type HelpSearchResult = {
  id: string;
  title: string;
  type: string;
  href?: string;
  guideId?: string;
  text: string;
  score: number;
};

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'because',
  'before',
  'being',
  'from',
  'have',
  'help',
  'into',
  'more',
  'should',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
]);

type HelpEntry = Omit<HelpSearchResult, 'score'> & {
  keywords: string[];
};

function tokenize(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    )
  );
}

function guideHref(guideId: string) {
  return `/settings?tab=knowledge-base#guide-${guideId}`;
}

export function getHelpEntries(): HelpEntry[] {
  const entries: HelpEntry[] = [];

  for (const guide of helpGuides) {
    entries.push({
      id: `guide:${guide.id}`,
      title: guide.title,
      type: 'Tool Guide',
      href: guideHref(guide.id),
      guideId: guide.id,
      keywords: guide.keywords,
      text: [
        guide.eyebrow,
        `Tool link: ${guide.href}`,
        guide.description,
        `Best for: ${guide.bestFor.join(' ')}`,
        `How to use it: ${guide.steps.join(' ')}`,
        `Helpful notes: ${guide.tips.join(' ')}`,
      ].join('\n'),
    });
  }

  for (const entry of taskEntryPoints) {
    entries.push({
      id: `task:${entry.id}`,
      title: entry.title,
      type: 'Getting Started',
      href: guideHref(entry.guideId),
      guideId: entry.guideId,
      keywords: entry.keywords,
      text: [entry.description, `Steps: ${entry.steps.join(' ')}`].join('\n'),
    });
  }

  for (const answer of quickAnswers) {
    entries.push({
      id: `quick:${answer.question}`,
      title: answer.question,
      type: 'Quick Answer',
      keywords: [],
      text: answer.answer,
    });
  }

  for (const format of formatGuides) {
    entries.push({
      id: `format:${format.title}`,
      title: format.title,
      type: 'Generate Format Guide',
      href: guideHref('generate'),
      guideId: 'generate',
      keywords: format.keywords,
      text: [
        `Use when: ${format.useWhen}`,
        `Good inputs: ${format.inputs.join(' ')}`,
        `Output check: ${format.outputCheck.join(' ')}`,
      ].join('\n'),
    });
  }

  for (const recipe of workflowRecipes) {
    entries.push({
      id: `workflow:${recipe.title}`,
      title: recipe.title,
      type: 'Workflow Playbook',
      keywords: recipe.keywords,
      text: [
        `Outcome: ${recipe.outcome}`,
        `Path: ${recipe.path.join(' ')}`,
        `Notes: ${recipe.notes.join(' ')}`,
      ].join('\n'),
    });
  }

  for (const item of troubleshootingItems) {
    entries.push({
      id: `troubleshooting:${item.problem}`,
      title: item.problem,
      type: 'Troubleshooting',
      keywords: item.keywords,
      text: [`Check: ${item.check}`, `Fix: ${item.fix}`].join('\n'),
    });
  }

  for (const rule of doDontRules) {
    entries.push({
      id: `rules:${rule.title}`,
      title: `${rule.title} guardrails`,
      type: 'Do / Do Not',
      keywords: [rule.title],
      text: rule.items.join('\n'),
    });
  }

  for (const item of glossaryItems) {
    entries.push({
      id: `glossary:${item.term}`,
      title: item.term,
      type: 'Glossary',
      keywords: item.keywords,
      text: item.definition,
    });
  }

  return entries;
}

function scoreEntry(entry: HelpEntry, query: string, tokens: string[]) {
  const title = entry.title.toLowerCase();
  const type = entry.type.toLowerCase();
  const text = entry.text.toLowerCase();
  const keywords = entry.keywords.join(' ').toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  if (title.includes(q)) score += 35;
  if (text.includes(q)) score += 16;
  if (keywords.includes(q)) score += 22;

  for (const token of tokens) {
    if (title.includes(token)) score += 10;
    if (keywords.includes(token)) score += 8;
    if (type.includes(token)) score += 5;
    if (text.includes(token)) score += 3;
  }

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (title.includes(phrase)) score += 14;
    if (text.includes(phrase)) score += 7;
  }

  return score;
}

export function searchHelpContent(query: string, limit = 8): HelpSearchResult[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const tokens = tokenize(cleanQuery);
  return getHelpEntries()
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, cleanQuery, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
