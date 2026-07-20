'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type PageBannerHelpContent = {
  useFor: string;
  doesNot: string;
  intendedUse: string;
};

const defaultBannerHelp: Record<string, PageBannerHelpContent> = {
  Dashboard: {
    useFor: 'Review source readiness, saved content activity, generation volume, token spend, and workflow momentum.',
    doesNot: 'It does not edit records, sync source content, or generate drafts.',
    intendedUse: 'Start here to spot what needs attention, then jump into the specific tool for the work.',
  },
  'Generate Content': {
    useFor: 'Turn one trusted source article into coordinated campaign copy, social assets, captions, or image outputs.',
    doesNot: 'It does not scan the whole library for gaps or manage saved drafts after review.',
    intendedUse: 'Choose a source first, select the needed output formats, generate, review, then save useful work.',
  },
  EchoWrite: {
    useFor: 'Create source-backed drafts with retrieval notes and evidence highlights.',
    doesNot: 'It does not replace Content Scan, manage the saved library, or guarantee every prompt has enough source support.',
    intendedUse: 'Use a focused brief, review the matched sources, edit the draft, and save only reviewed output.',
  },
  'Source Content': {
    useFor: 'Browse synced advisor source inventory, inspect details, and select trusted inputs for downstream tools.',
    doesNot: 'It does not generate new content or analyze topic gaps by itself.',
    intendedUse: 'Find and verify source material before sending it to Generate, EchoWrite, CE Course Creator, or Canadianizer.',
  },
  'Saved Content': {
    useFor: 'Review, edit, organize, and reuse durable generated drafts, assets, and campaign packages.',
    doesNot: 'It does not search the raw source inventory or generate new drafts directly.',
    intendedUse: 'Use it as the working library after content has been generated or adapted.',
  },
  'Content Scan': {
    useFor: 'Search exact terms or use AI Scan to evaluate source coverage, related ideas, and update opportunities.',
    doesNot: 'It does not write final copy or automatically update source articles.',
    intendedUse: 'Use it before creating or refreshing content so the team knows what the library already covers.',
  },
  'Content Upload': {
    useFor: 'Paste custom content, scan metadata, review controlled fields, and save it into the source library.',
    doesNot: 'It does not manage generated drafts or bulk upload files yet.',
    intendedUse: 'Use it when the team has approved source material that should become reusable input.',
  },
  'CE Course Creator': {
    useFor: 'Combine related source articles into a CE course package and quiz draft.',
    doesNot: 'It does not certify credit eligibility, publish to an LMS, or replace compliance review.',
    intendedUse: 'Select strong related sources, generate a package, then review and save the draft for downstream handling.',
  },
  Canadianizer: {
    useFor: 'Adapt one source article through a Canadian lens with side-by-side equivalency review.',
    doesNot: 'It does not translate whole campaigns or guarantee legal, tax, or compliance approval.',
    intendedUse: 'Use it after selecting a source that needs Canadian context, then review gaps before saving.',
  },
  'Token Usage': {
    useFor: 'Review recent AI activity, model usage, estimated token volume, and cost signals.',
    doesNot: 'It does not change model settings, run generation, or edit content.',
    intendedUse: 'Use it for operational review and spend awareness after AI-assisted work runs.',
  },
  'Knowledge Center': {
    useFor: 'Find tool guidance, task paths, glossary entries, and troubleshooting help for Editorial workflows.',
    doesNot: 'It does not run app actions, sync content, generate drafts, or change records.',
    intendedUse: 'Use it when a workflow is unclear or when a teammate needs the intended path for a tool.',
  },
  'Tag Explorer': {
    useFor: 'Scan local source tags, review coverage, and spot cleanup candidates.',
    doesNot: 'It does not merge, rename, or govern tags automatically.',
    intendedUse: 'Use it for planning and metadata review before deeper cleanup decisions.',
  },
  'Template Design System': {
    useFor: 'Review visual examples, workflow-coded accents, and reusable interface patterns.',
    doesNot: 'It does not change production templates or generate content.',
    intendedUse: 'Use it as a design reference when aligning new screens or reviewing visual consistency.',
  },
};

type PageBannerHelpProps = {
  title: string;
  help?: PageBannerHelpContent | false;
  className?: string;
};

export function PageBannerHelp({ title, help, className }: PageBannerHelpProps) {
  const resolvedHelp = help === false ? null : help || defaultBannerHelp[title];

  if (!resolvedHelp) return null;

  return (
    <div className={cn('absolute right-3 top-3 z-20', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${title} guidance`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white/85 shadow-sm backdrop-blur transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" align="start" sideOffset={8} className="max-w-[340px] bg-slate-950 px-4 py-3 text-left text-white">
          <div className="text-sm font-semibold">{title} guidance</div>
          <div className="mt-3 space-y-2 text-xs leading-5 text-white/80">
            <p><span className="font-semibold text-white">Use for:</span> {resolvedHelp.useFor}</p>
            <p><span className="font-semibold text-white">Does not do:</span> {resolvedHelp.doesNot}</p>
            <p><span className="font-semibold text-white">Intended use:</span> {resolvedHelp.intendedUse}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
