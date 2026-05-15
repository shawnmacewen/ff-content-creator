'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EchoWritePage() {
  const [prompt, setPrompt] = useState('');
  const [writingStyle, setWritingStyle] = useState<'professional' | 'fun' | 'educational'>('professional');
  const [contentType, setContentType] = useState<'article' | 'video-script'>('article');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/echo-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          writingStyle,
          contentType,
          length,
          targetWordCount: targetWordCount ? Number(targetWordCount) : undefined,
        }),
      });
      const json = await res.json();
      setContent(json.content || '');
      setSources(json.sources || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EchoWrite</h1>
        <p className="text-muted-foreground">AI-assisted editorial generation grounded in your source content library.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Textarea
          placeholder="Describe the content you want (e.g., write an article about the impact of war on oil prices for retirement-focused investors)."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Writing Style</div>
            <Select value={writingStyle} onValueChange={(v: any) => setWritingStyle(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="fun">Fun</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Content Type</div>
            <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video-script">Video Script</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Length</div>
            <Select value={length} onValueChange={(v: any) => setLength(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Target Word Count (optional)</div>
            <Input value={targetWordCount} onChange={(e) => setTargetWordCount(e.target.value)} placeholder="e.g., 900" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generate} disabled={loading || !prompt.trim()}>{loading ? 'Generating...' : 'Generate'}</Button>
          <Button variant="outline" onClick={generate} disabled={loading || !prompt.trim()}>Regenerate</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-2">Source Context Used</h2>
          <div className="space-y-2 text-sm">
            {sources.length ? sources.map((s) => (
              <div key={s.id} className="rounded border p-2">
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.publisher || 'n/a'} • {s.designation || 'n/a'} • score {s.score}</div>
              </div>
            )) : <div className="text-muted-foreground">No sources yet.</div>}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Generated Output</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(content || '')}>Copy</Button>
            </div>
          </div>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={24} placeholder="Generated content will appear here." />
        </div>
      </div>
    </div>
  );
}
