import { Suspense } from 'react';
import GenerateClientPage from './generate-client';

// Avoid serving a cached static HTML shell that can drift from the latest JS chunks
// (and surface as a "This page couldn’t load" error after rapid UI iterations).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading generator...</div>}>
      <GenerateClientPage />
    </Suspense>
  );
}
