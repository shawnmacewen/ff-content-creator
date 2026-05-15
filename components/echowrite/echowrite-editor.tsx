'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { AttributionMark } from './attribution-mark';
import type { AttributionSpan } from '@/lib/echowrite/attribution';

const sourcePalette = [
  'bg-blue-500/15 border border-blue-500/30 text-foreground',
  'bg-emerald-500/15 border border-emerald-500/30 text-foreground',
  'bg-violet-500/15 border border-violet-500/30 text-foreground',
  'bg-amber-500/15 border border-amber-500/30 text-foreground',
  'bg-rose-500/15 border border-rose-500/30 text-foreground',
  'bg-cyan-500/15 border border-cyan-500/30 text-foreground',
];

function paletteClassForCitation(n: number) {
  return sourcePalette[(n - 1) % sourcePalette.length];
}

export function EchoWriteEditor({
  value,
  spans,
  onChange,
  onHoverSpan,
}: {
  value: string;
  spans: AttributionSpan[];
  onChange: (text: string) => void;
  onHoverSpan: (sourceId: string | null, snippet: string | null) => void;
}) {
  const [mode, setMode] = useState<'edit' | 'highlight'>('highlight');

  const html = useMemo(() => {
    // Build simple paragraph HTML where each sentence is a span with attribution attrs.
    if (!spans.length) return '';
    const parts = spans.map((s) => {
      const attrib = s.sourceId && s.citationNumber
        ? ` data-attribution="true" data-source-id="${s.sourceId}" data-citation-number="${s.citationNumber}" data-color-class="${paletteClassForCitation(s.citationNumber).replace(/"/g, '')}" data-snippet="${encodeURIComponent(s.snippet || '')}" class="echowrite-attrib inline rounded px-1.5 py-0.5 ${paletteClassForCitation(s.citationNumber)}"`
        : '';
      const citation = s.citationNumber ? `<sup class="ml-1 text-[10px] align-super text-muted-foreground">[${s.citationNumber}]</sup>` : '';
      const safe = s.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span${attrib}>${safe}${citation}</span>`;
    });
    return `<p>${parts.join(' ')}</p>`;
  }, [spans]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: true }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Generated content will appear here…' }),
      AttributionMark,
    ],
    content: mode === 'edit' ? value : html,
    editable: mode === 'edit',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[420px]',
      },
      handleDOMEvents: {
        mouseover: (_view, event) => {
          const el = event.target as HTMLElement | null;
          const span = el?.closest?.('span[data-attribution]') as HTMLElement | null;
          if (!span) return false;
          const sourceId = span.getAttribute('data-source-id');
          const snippetEnc = span.getAttribute('data-snippet');
          const snippet = snippetEnc ? decodeURIComponent(snippetEnc) : null;
          onHoverSpan(sourceId, snippet);
          return false;
        },
        mouseout: () => {
          onHoverSpan(null, null);
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (mode !== 'edit') return;
      onChange(editor.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (mode === 'edit') {
      editor.setEditable(true);
      editor.commands.setContent(value || '', false);
    } else {
      editor.setEditable(false);
      editor.commands.setContent(html || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, html]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {mode === 'highlight'
            ? 'Hover highlights to see supporting snippets and linked sources.'
            : 'Edit mode: changes will update the raw text output.'}
        </div>
        <Button size="sm" variant="outline" onClick={() => setMode((m) => (m === 'edit' ? 'highlight' : 'edit'))}>
          {mode === 'edit' ? 'View Highlights' : 'Edit Text'}
        </Button>
      </div>
      <div className="rounded-lg border p-3 bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
