'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SourceSelector } from '@/components/generator/source-selector';
import { InstagramGenerateWorkflow } from '@/components/generator/instagram-workflow';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  // Preserve deep-link source selection
  useEffect(() => {
    const sourceIdsParam = searchParams.get('sourceIds');
    if (sourceIdsParam) setSelectedSourceIds(sourceIdsParam.split(',').filter(Boolean));
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate Social Content</h1>
            <p className="text-muted-foreground">Transform your articles into engaging social media content.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-2xl" onClick={() => router.push('/library')} variant="outline">
            Saved Drafts
          </Button>
          <Button className="rounded-2xl bg-violet-600 hover:bg-violet-600/90" onClick={() => {}}>
            Generate
          </Button>
        </div>
      </div>

      <InstagramGenerateWorkflow selectedSourceIds={selectedSourceIds} setSelectedSourceIds={setSelectedSourceIds} />

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Source Content</div>
            <div className="text-xs text-muted-foreground">Select an article to generate from (existing component, will be restyled).</div>
          </div>
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => {}}>
            <Sparkles className="h-4 w-4" />
            Use selection
          </Button>
        </div>
        <div className="mt-4">
          <SourceSelector selectedIds={selectedSourceIds} onSelectionChange={setSelectedSourceIds} />
        </div>
      </div>
    </div>
  );
}
