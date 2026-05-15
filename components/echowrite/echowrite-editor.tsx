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

const sourceColors = [
  {
    bg: 'bg-[#f3e8ff]',
    darkBg: 'dark:bg-purple-950/50',
    badge: 'bg-[#a855f7]',
    border: 'border-l-[#a855f7]',
    ring: 'ring-[#7c3aed]',
  },
  {
    bg: 'bg-[#fef9c3]',
    darkBg: 'dark:bg-yellow-950/50',
    badge: 'bg-[#eab308]',
    border: 'border-l-[#eab308]',
    ring: 'ring-[#7c3aed]',
  },
  {
    bg: 'bg-[#fee2e2]',
    darkBg: 'dark:bg-red-950/50',
    badge: 'bg-[#f87171]',
    border: 'border-l-[#f87171]',
    ring: 'ring-[#7c3aed]',
  },
  {
    bg: 'bg-[#dcfce7]',
    darkBg: 'dark:bg-green-950/50',
    badge: 'bg-[#22c55e]',
    border: 'border-l-[#22c55e]',
    ring: 'ring-[#7c3aed]',
  },
  {
    bg: 'bg-[#dbeafe]',
    darkBg: 'dark:bg-blue-950/50',
    badge: 'bg-[#3b82f6]',
    border: 'border-l-[#3b82f6]',
    ring: 'ring-[#7c3aed]',
  },
] as const;

function colorForCitation(n: number) {
  return sourceColors[(n - 1) % sourceColors.length];
}

export function EchoWriteEditor({
  value,
  spans,
  onChange,
  onHoverSpan,
  showMatches,
  hoveredSourceId,
}: {
  value: string;
  spans: AttributionSpan[];
  onChange: (text: string) => void;
  onHoverSpan: (sourceId: string | null, snippet: string | null) => void;
  showMatches: boolean;
  hoveredSourceId: string | null;
}) {
  const [mode, setMode] = useState<'edit' | 'highlight'>('highlight');

  const html = useMemo(() => {
    // Build paragraph HTML where each sentence is a highlight span + citation badge.
    if (!spans.length) return '';
    const parts = spans.map((s) => {
      const safe = s.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!showMatches || !s.sourceId || !s.citationNumber) {
        return `<span>${safe}</span>`;
      }

      const colors = colorForCitation(s.citationNumber);
      const hoverRing = hoveredSourceId && hoveredSourceId === s.sourceId
        ? ` ring-2 ${colors.ring} ring-offset-1 ring-offset-background`
        : '';

      const attrib = ` data-attribution="true" data-source-id="${s.sourceId}" data-citation-number="${s.citationNumber}" data-snippet="${encodeURIComponent(s.snippet || '')}" class="${colors.bg} ${colors.darkBg} px-0.5 rounded cursor-pointer inline transition-all text-foreground${hoverRing}"`;
      const badge = `<sup class="${colors.badge} text-white text-[10px] px-1.5 py-0.5 rounded font-semibold ml-0.5 inline-flex items-center justify-center min-w-[18px]">${s.citationNumber}</sup>`;
      return `<span${attrib}>${safe}${badge}</span>`;
    });
    return `<p>${parts.join(' ')}</p>`;
  }, [spans, showMatches, hoveredSourceId]);

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

  useEffect(() => {
    if (!editor) return;
    if (mode !== 'highlight') return;
    editor.commands.setContent(html || '', false);
  }, [editor, html, mode]);

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
