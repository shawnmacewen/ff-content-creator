import { Mark, mergeAttributes } from '@tiptap/core';

export interface AttributionAttrs {
  sourceId: string | null;
  citationNumber: number | null;
  colorClass: string | null;
  snippet: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attribution: {
      setAttribution: (attrs: Partial<AttributionAttrs>) => ReturnType;
      unsetAttribution: () => ReturnType;
    };
  }
}

export const AttributionMark = Mark.create({
  name: 'attribution',

  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-source-id'),
        renderHTML: (attrs) => (attrs.sourceId ? { 'data-source-id': attrs.sourceId } : {}),
      },
      citationNumber: {
        default: null,
        parseHTML: (el) => {
          const raw = (el as HTMLElement).getAttribute('data-citation-number');
          return raw ? Number(raw) : null;
        },
        renderHTML: (attrs) => (attrs.citationNumber ? { 'data-citation-number': String(attrs.citationNumber) } : {}),
      },
      colorClass: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-color-class'),
        renderHTML: (attrs) => (attrs.colorClass ? { 'data-color-class': attrs.colorClass } : {}),
      },
      snippet: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-snippet'),
        renderHTML: (attrs) => (attrs.snippet ? { 'data-snippet': attrs.snippet } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-attribution]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const colorClass = HTMLAttributes['data-color-class'] || '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-attribution': 'true',
        class: `echowrite-attrib inline rounded px-0.5 ${colorClass}`.trim(),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAttribution:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetAttribution:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
