'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentTypeSelector } from '@/components/generator/content-type-selector';
import { SourceSelector } from '@/components/generator/source-selector';
import { ToneControls } from '@/components/generator/tone-controls';
import { GenerationPreview } from '@/components/generator/generation-preview';
import { generateId } from '@/lib/storage/local-storage';
import type { ContentType, ToneType, ContentStatus, GeneratedContent } from '@/lib/types/content';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [tone, setTone] = useState<ToneType>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);
  const [generationMode, setGenerationMode] = useState<'single' | 'kit'>('single');
  const [kitAssets, setKitAssets] = useState({ linkedin: true, instagram: true, email: true });

  // Parse URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const sourceIdsParam = searchParams.get('sourceIds');

    if (typeParam && typeParam.includes('-')) {
      setContentType(typeParam as ContentType);
    } else if (typeParam === 'social') {
      setContentType('social-twitter');
    } else if (typeParam === 'email') {
      setContentType('email-marketing');
    } else if (typeParam === 'article') {
      setContentType('article');
    }

    if (sourceIdsParam) {
      setSelectedSourceIds(sourceIdsParam.split(',').filter(Boolean));
    }
  }, [searchParams]);

  const handleGenerate = useCallback(async () => {
    if (generationMode === 'single' && !contentType) {
      toast.error('Please select a content type');
      return;
    }

    if (generationMode === 'kit' && !Object.values(kitAssets).some(Boolean)) {
      toast.error('Select at least one KIT asset');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setCompliance(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          mode: generationMode,
          kitAssets,
          sourceContentIds: selectedSourceIds,
          customPrompt,
          tone,
          additionalContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const contentTypeHeader = response.headers.get('content-type') || '';
      if (contentTypeHeader.includes('application/json')) {
        const payload = await response.json();
        setGeneratedContent(payload?.content || '');
        setCompliance(payload?.compliance || null);
      } else {
        const text = await response.text();
        setGeneratedContent(text);
      }

      toast.success('Content generated successfully');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [contentType, selectedSourceIds, customPrompt, tone, additionalContext]);

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleSave = async (status: ContentStatus) => {
    if (!contentType || !generatedContent) return;

    const content: GeneratedContent = {
      id: generateId(),
      type: contentType,
      title: generatedContent.split('\n')[0].slice(0, 100) || 'Untitled',
      content: generatedContent,
      sourceContentIds: selectedSourceIds,
      prompt: customPrompt,
      tone,
      status,
      versions: [
        {
          id: generateId(),
          content: generatedContent,
          createdAt: new Date().toISOString(),
          note: 'Initial generation',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/generated-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: content.type,
          title: content.title,
          content: content.content,
          sourceContentIds: content.sourceContentIds,
          prompt: content.prompt,
          tone: content.tone,
          status: content.status,
          versionNote: 'Initial generation',
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save content');
      }

      toast.success(`Content saved as ${status}`);
      router.push('/library');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save content');
    }
  };

  const canGenerate = generationMode === 'kit' ? Object.values(kitAssets).some(Boolean) : contentType !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate Content</h1>
            <p className="text-muted-foreground">
              Create AI-powered content based on your source material
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="gap-2"
        >
          <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Generation Mode</h2>
        <div className="flex gap-2">
          <Button type="button" variant={generationMode === 'single' ? 'default' : 'outline'} onClick={() => setGenerationMode('single')}>Single Asset</Button>
          <Button type="button" variant={generationMode === 'kit' ? 'default' : 'outline'} onClick={() => setGenerationMode('kit')}>KIT</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {generationMode === 'single' ? (
            <div>
              <h2 className="text-lg font-semibold mb-4">1. Select Content Type</h2>
              <ContentTypeSelector selected={contentType} onSelect={setContentType} />
            </div>
          ) : (
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-2">1. Select KIT Content Types</h2>
              <p className="text-sm text-muted-foreground">Choose one or more assets to generate from the selected source article(s).</p>
              <div className="grid md:grid-cols-1 gap-2 text-sm mt-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={kitAssets.linkedin} onChange={(e) => setKitAssets((s) => ({ ...s, linkedin: e.target.checked }))} /> LinkedIn Post</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={kitAssets.instagram} onChange={(e) => setKitAssets((s) => ({ ...s, instagram: e.target.checked }))} /> Instagram Caption</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={kitAssets.email} onChange={(e) => setKitAssets((s) => ({ ...s, email: e.target.checked }))} /> Email</label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">2. Configure Generation</h2>
            <div className="space-y-4">
              <SourceSelector
                selectedIds={selectedSourceIds}
                onSelectionChange={setSelectedSourceIds}
              />
              <ToneControls
                tone={tone}
                onToneChange={setTone}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                additionalContext={additionalContext}
                onAdditionalContextChange={setAdditionalContext}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">3. Preview & Save</h2>
        <GenerationPreview
          contentType={generationMode === 'kit' ? 'social-linkedin' : contentType}
          content={generatedContent}
          isGenerating={isGenerating}
          onContentChange={setGeneratedContent}
          onRegenerate={handleRegenerate}
          onSave={handleSave}
          compliance={compliance}
        />
      </div>
    </div>
  );
}
