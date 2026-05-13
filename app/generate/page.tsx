import { Suspense } from 'react';
import GenerateClientPage from './generate-client';

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading generator...</div>}>
      <GenerateClientPage />
    </Suspense>
  );
}
