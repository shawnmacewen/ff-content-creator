'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function InstagramCarousel2Client() {
  const [status, setStatus] = useState<string>('Not started');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Carousel 2.0</h1>
        <p className="text-muted-foreground">
          Fresh implementation area for the next-generation carousel pipeline (new APIs, prompts, and workflow).
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">{status}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatus('Scaffolded UI route + nav entry. Next: implement /api/generate/instagram-carousel-2/*');
                toast.success('Updated');
              }}
            >
              Mark scaffolded
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Note: This page is intentionally minimal. We’ll port the proven UX pieces after we stabilize the new pipeline.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
