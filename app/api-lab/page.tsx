'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const presets = [
  { label: 'Provider Metadata (GET)', method: 'GET', path: '/api/source-content/provider-metadata', body: '' },
  { label: 'Provider Categories (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=categories', body: '' },
  { label: 'Provider Subcategories (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=subcategories', body: '' },
  { label: 'Provider Sources (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=sources', body: '' },
  { label: 'Provider Tags (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=tags', body: '' },
  { label: 'Provider Article by ID (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=article&articleId=', body: '' },
  { label: 'Search Articles + Contents (GET)', method: 'GET', path: '/api/source-content/provider-metadata?mode=search-contents&search=401k&limit=5', body: '' },
  { label: 'Provider Sync Dry Run (POST)', method: 'POST', path: '/api/source-content/sync', body: JSON.stringify({ mode: 'provider', dryRun: true }, null, 2) },
  { label: 'Provider Sync (POST)', method: 'POST', path: '/api/source-content/sync', body: JSON.stringify({ mode: 'provider', dryRun: false }, null, 2) },
  { label: 'Provider Sync + Force Date Refresh (POST)', method: 'POST', path: '/api/source-content/sync', body: JSON.stringify({ mode: 'provider', dryRun: false, forceDetailDateRefresh: true }, null, 2) },
  { label: 'Provider Backfill Missing Publisher/Date (POST)', method: 'POST', path: '/api/source-content/sync', body: JSON.stringify({ mode: 'provider-backfill', dryRun: false }, null, 2) },
  { label: 'Source Content Page 1 (GET)', method: 'GET', path: '/api/source-content?page=1&pageSize=20', body: '' },
  { label: 'Image Test (POST)', method: 'POST', path: '/api/generate/image-test', body: JSON.stringify({ prompt: 'a simple cute cat illustration, flat colors' }, null, 2) },
];

export default function ContentApiExplorerPage() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/source-content/provider-metadata');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [responseText, setResponseText] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const run = async () => {
    setLoading(true);
    setStatus('');
    setResponseText('');
    setImagePreview('');
    try {
      const res = await fetch(path, {
        method,
        headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : body || '{}',
      });
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText}`);
      try {
        const json = JSON.parse(text);
        const rawImage = typeof json?.imageUrl === 'string' ? json.imageUrl : '';
        if (rawImage.startsWith('data:image/') || rawImage.startsWith('http')) {
          setImagePreview(rawImage);
          json.imageUrl = rawImage.startsWith('data:image/')
            ? `[data-image:${rawImage.slice(0, 48)}... (${rawImage.length} chars)]`
            : rawImage;
        }
        setResponseText(JSON.stringify(json, null, 2));
      } catch {
        setResponseText(text);
      }
    } catch (e: any) {
      setStatus('Request failed');
      setResponseText(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content API Explorer</h1>
        <p className="text-muted-foreground">Run provider and app API calls and inspect raw JSON responses.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p.label} variant="outline" size="sm" onClick={() => { setMethod(p.method); setPath(p.path); setBody(p.body); }}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input value={method} onChange={(e) => setMethod(e.target.value.toUpperCase())} placeholder="GET/POST" />
        <div className="md:col-span-3"><Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/..." /></div>
      </div>

      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="JSON body for POST" className="min-h-[140px] font-mono text-xs" />

      <Button onClick={run} disabled={loading}>{loading ? 'Running...' : 'Run Request'}</Button>

      <div className="rounded border p-3 space-y-3">
        <div className="text-sm font-medium">Status: {status || '—'}</div>
        {imagePreview ? (
          <div className="rounded border bg-muted/20 p-2">
            <div className="text-xs text-muted-foreground mb-2">Image Preview</div>
            <img src={imagePreview} alt="API generated" className="rounded border max-h-80" />
          </div>
        ) : null}
        <pre className="text-xs whitespace-pre-wrap break-words max-h-[500px] overflow-auto">{responseText || 'No response yet.'}</pre>
      </div>
    </div>
  );
}
