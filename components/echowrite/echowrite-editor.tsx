'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Pencil, Highlighter } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
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
  const applyingRef = useRef(false);
  const lastExternalValueRef = useRef<string>('');

  // Default to highlight mode on mount (avoid any hydration weirdness flipping modes).
  useEffect(() => {
    setMode('highlight');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { htmlHighlight, htmlEdit } = useMemo(() => {
    // Build paragraph HTML from the raw value.
    // - highlight mode: decorate sentences w/ attribution + citation badges
    // - edit mode: preserve paragraph formatting but NO attribution marks/badges
    if (!value?.trim()) return { htmlHighlight: '', htmlEdit: '' };

    const paragraphs = String(value)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const renderPlainSentence = (text: string) => {
      const safe = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span class="text-foreground">${safe}</span>`;
    };

    const spanQueue = [...spans];
    const takeNextSpan = () => spanQueue.shift() || ({ text: '', sourceId: null, snippet: null, confidence: null, citationNumber: null } as AttributionSpan);

    const renderHighlightedSentence = (fallbackText: string) => {
      const s = takeNextSpan();
      const text = s.text || fallbackText;
      const safe = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      if (!showMatches || !s.sourceId || !s.citationNumber) {
        return `<span class="text-foreground">${safe}</span>`;
      }

      const colors = colorForCitation(s.citationNumber);
      const hoverRing = hoveredSourceId && hoveredSourceId === s.sourceId
        ? ` ring-2 ${colors.ring} ring-offset-1 ring-offset-background`
        : '';

      const colorClass = `${colors.bg} ${colors.darkBg} cursor-pointer transition-all text-foreground${hoverRing}`.trim();
      const attrib = ` data-attribution="true" data-source-id="${s.sourceId}" data-citation-number="${s.citationNumber}" data-color-class="${colorClass.replace(/\"/g, '')}" data-snippet="${encodeURIComponent(s.snippet || '')}" class="${colorClass.replace(/\"/g, '')}"`;
      const badge = `<sup class="${colors.badge} text-white text-[10px] px-1.5 py-0.5 rounded font-semibold ml-0.5 inline-flex items-center justify-center min-w-[18px]">${s.citationNumber}</sup>`;
      return `<span${attrib}>${safe}${badge}</span>`;
    };

    const toSentences = (p: string) =>
      p.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

    const htmlEdit = paragraphs
      .map((p) => {
        const parts = toSentences(p).map(renderPlainSentence);
        return `<p>${parts.join(' ')}</p>`;
      })
      .join('');

    const htmlHighlight = paragraphs
      .map((p) => {
        const parts = toSentences(p).map((t) => renderHighlightedSentence(t));
        return `<p>${parts.join(' ')}</p>`;
      })
      .join('');

    return { htmlHighlight, htmlEdit };
  }, [value, spans, showMatches, hoveredSourceId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      // Prevent link-click navigation from inside the editor (can cause perceived "404" route jumps)
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Generated content will appear here…' }),
      AttributionMark,
    ],
    content: mode === 'edit' ? htmlEdit : htmlHighlight,
    editable: mode === 'edit',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[420px]',
      },
      handleDOMEvents: {
        click: (_view, event) => {
          // Never navigate away from EchoWrite due to accidental link clicks inside editable content.
          const el = event.target as HTMLElement | null;
          const a = el?.closest?.('a') as HTMLAnchorElement | null;
          if (a) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        mouseover: (_view, event) => {
          if (mode !== 'highlight') return false;
          const el = event.target as HTMLElement | null;
          const span = el?.closest?.('span[data-attribution]') as HTMLElement | null;
          if (!span) return false;
          const sourceId = span.getAttribute('data-source-id');
          const snippetEnc = span.getAttribute('data-snippet');
          const snippet = snippetEnc ? decodeURIComponent(snippetEnc) : null;
          onHoverSpan(sourceId, snippet);
          return false;
        },
        // Intentionally do NOT clear hover on mouseout; otherwise moving from the editor
        // into the Sources sidebar can clear the hover state and prevent highlight sync.
      },
    },
    onUpdate: ({ editor }) => {
      if (mode !== 'edit') return;
      if (applyingRef.current) return;
      // Preserve paragraph spacing when saving back to plain text.
      onChange(editor.getText({ blockSeparator: '\n\n' }));
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(mode === 'edit');

    // Only force-reset content when:
    // - switching back to highlight mode, OR
    // - the external value changed (generate/regenerate), OR
    // - editor has no content yet.
    const externalChanged = value !== lastExternalValueRef.current;
    if (externalChanged) lastExternalValueRef.current = value;

    const shouldApply = externalChanged || editor.isEmpty || mode === 'highlight';
    if (!shouldApply) return;

    const contentToApply = mode === 'edit' ? htmlEdit : htmlHighlight;

    applyingRef.current = true;
    try {
      editor.commands.setContent(contentToApply || '', false);
    } finally {
      applyingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, htmlEdit, htmlHighlight, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {mode === 'highlight'
            ? 'Hover highlights to see supporting snippets and linked sources.'
            : 'Edit mode: changes will update the raw text output.'}
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            pressed={mode === 'edit'}
            onClick={() => setMode('edit')}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
          </Toggle>
          <Toggle
            pressed={mode === 'highlight'}
            onClick={() => setMode('highlight')}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Highlighter className="h-4 w-4" />
            <span>Highlight</span>
          </Toggle>
        </div>
      </div>
      <div className="rounded-lg border p-3 bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
