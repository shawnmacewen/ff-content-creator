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
      sourceId: { default: null },
      citationNumber: { default: null },
      colorClass: { default: null },
      snippet: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-attribution]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const colorClass = HTMLAttributes.colorClass || '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-attribution': 'true',
        class: `echowrite-attrib inline rounded px-1.5 py-0.5 ${colorClass}`.trim(),
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
