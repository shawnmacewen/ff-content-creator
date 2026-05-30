import { Suspense } from 'react';
import CanadianizerClient from '@/components/canadianizer/canadianizer-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CanadianizerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Canadianizer Eh?...</div>}>
      <CanadianizerClient />
    </Suspense>
  );
}
