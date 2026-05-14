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
import { CONTENT_TYPE_MAP } from '@/lib/content-config';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';


export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [tone, setTone] = useState<ToneType>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [includeInstagramImage, setIncludeInstagramImage] = useState(false);

  // Parse URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const sourceIdsParam = searchParams.get('sourceIds');

    if (typeParam && typeParam.includes('-')) {
      setSelectedContentTypes([typeParam as ContentType]);
    } else if (typeParam === 'social') {
      setSelectedContentTypes(['social-twitter']);
    } else if (typeParam === 'email') {
      setSelectedContentTypes(['email-marketing']);
    } else if (typeParam === 'article') {
      setSelectedContentTypes(['article']);
    }

    if (sourceIdsParam) {
      setSelectedSourceIds(sourceIdsParam.split(',').filter(Boolean));
    }
  }, [searchParams]);

  const handleGenerate = useCallback(async () => {
    if (!selectedContentTypes.length) {
      toast.error('Please select at least one content type');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setCompliance(null);
    setGeneratedImages({});
    setImageStatus(includeInstagramImage ? 'Generating Instagram image...' : null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedContentTypes[0],
          mode: selectedContentTypes.length > 1 ? 'kit' : 'single',
          selectedTypes: selectedContentTypes,
          includeInstagramImage,
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
        setGeneratedImages(payload?.images || {});
        if (includeInstagramImage) {
          const txt = String(payload?.content || '');
          if (/Image URL:/i.test(txt)) setImageStatus('Instagram image generated');
          else if (/Image generation status: failed/i.test(txt)) setImageStatus('Instagram image failed (see output section)');
          else setImageStatus('Instagram image status unknown');
        }
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
  }, [selectedContentTypes, includeInstagramImage, selectedSourceIds, customPrompt, tone, additionalContext]);

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleSave = async (status: ContentStatus) => {
    const primaryType = selectedContentTypes[0];
    if (!primaryType || !generatedContent) return;

    const content: GeneratedContent = {
      id: generateId(),
      type: primaryType,
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

  const generationMode: 'single' | 'kit' = selectedContentTypes.length > 1 ? 'kit' : 'single';
  const canGenerate = selectedContentTypes.length > 0;
  const previewLabel = selectedContentTypes.length
    ? (generationMode === 'kit'
      ? `KIT: ${selectedContentTypes.map((type) => CONTENT_TYPE_MAP[type].label).join(' · ')}`
      : CONTENT_TYPE_MAP[selectedContentTypes[0]].label)
    : null;

  const handleToggleType = (type: ContentType) => {
    setSelectedContentTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

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
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Generation Mode</h2>
        <div className="flex gap-2">
          <Button type="button" variant={generationMode === 'single' ? 'default' : 'outline'} disabled>Single Asset</Button>
          <Button type="button" variant={generationMode === 'kit' ? 'default' : 'outline'} disabled>KIT</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">1. Select Content Type</h2>
            <ContentTypeSelector
              selected={selectedContentTypes}
              onToggle={handleToggleType}
              includeInstagramImage={includeInstagramImage}
              onToggleInstagramImage={() => setIncludeInstagramImage((v) => !v)}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">2. Configure Generation</h2>
            <div className="space-y-4">
              <ToneControls
                tone={tone}
                onToneChange={setTone}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                additionalContext={additionalContext}
                onAdditionalContextChange={setAdditionalContext}
              />
              <div className="pt-3 border-t border-border flex justify-end">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="gap-2 min-w-36"
                >
                  <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">3. Source Content</h2>
        <SourceSelector
          selectedIds={selectedSourceIds}
          onSelectionChange={setSelectedSourceIds}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">4. Preview & Save</h2>
        <GenerationPreview
          contentType={selectedContentTypes[0] ?? null}
          previewLabel={previewLabel}
          content={generatedContent}
          isGenerating={isGenerating}
          onContentChange={setGeneratedContent}
          onRegenerate={handleRegenerate}
          onSave={handleSave}
          compliance={compliance}
          imageGenerationEnabled={selectedContentTypes.includes('social-instagram') ? includeInstagramImage : false}
          generatedImages={generatedImages}
          imageStatus={imageStatus}
        />
      </div>
    </div>
  );
}
