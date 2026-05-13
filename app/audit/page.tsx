'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Match = {
  id: string;
  title: string;
  publisher: string | null;
  sourceSystem: string | null;
  publishedAt: string | null;
  snippet: string;
  score: number;
};

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [publisher, setPublisher] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, publisher, limit: 200 }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Audit</h1>
        <p className="text-muted-foreground">Type what you want to find. AI will convert your request into DB search rules.</p>
      </div>

      <div className="flex gap-2">
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. list content that mentions 2025 mileage rate but not 2026 mileage rate" />
        <select className="border rounded px-2 bg-background" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
          <option value="all">All publishers</option>
          <option value="broadridge-forefield">Broadridge Forefield</option>
          <option value="publisher-content">Publisher Content</option>
          <option value="sample">Sample</option>
        </select>
        <Button onClick={run} disabled={loading || !prompt.trim()}>{loading ? 'Running...' : 'Run Audit'}</Button>
      </div>

      {result?.structured && (
        <div className="text-xs text-muted-foreground rounded border p-3">
          Parsed query: <code>{JSON.stringify(result.structured)}</code>
        </div>
      )}

      <div className="space-y-3">
        {(result?.matches || []).map((m: Match) => (
          <div key={m.id} className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{m.title}</div>
              <Badge variant="outline">{m.publisher || 'Unavailable'}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Published date unavailable'}</div>
            <p className="text-sm text-muted-foreground">{m.snippet || 'No snippet available.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
