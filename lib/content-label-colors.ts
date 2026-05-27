const designationClassByKey: Record<string, string> = {
  alert: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200',
  article: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-200',
  commentary: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-200',
  guide: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200',
  insight: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-200',
  insights: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-200',
  'market update': 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200',
  newsletter: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-200',
  presentation: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/35 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
  report: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/35 dark:bg-indigo-500/15 dark:text-indigo-200',
  video: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200',
  webinar: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/35 dark:bg-purple-500/15 dark:text-purple-200',
};

const designationPalette = [
  'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-200',
  'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-200',
  'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200',
  'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200',
  'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-200',
  'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200',
];

const tagPalette = [
  'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-200',
  'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-200',
  'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/35 dark:bg-indigo-500/15 dark:text-indigo-200',
  'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/35 dark:bg-purple-500/15 dark:text-purple-200',
  'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/35 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
  'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-500/35 dark:bg-pink-500/15 dark:text-pink-200',
  'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200',
  'border-lime-300 bg-lime-50 text-lime-800 dark:border-lime-500/35 dark:bg-lime-500/15 dark:text-lime-200',
];

function labelKey(value?: string | null) {
  return String(value || 'unknown')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function designationLabelClass(value?: string | null) {
  const key = labelKey(value);
  return designationClassByKey[key] || designationPalette[stableIndex(key, designationPalette.length)];
}

export function tagLabelClass(value?: string | null) {
  const key = labelKey(value);
  return tagPalette[stableIndex(key, tagPalette.length)];
}

export function overflowLabelClass() {
  return 'border-border bg-muted text-muted-foreground';
}
