import { Suspense } from 'react';
import CeCourseCreatorClient from '@/components/ce-course-creator/ce-course-creator-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CeCourseCreatorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading CE Course Creator...</div>}>
      <CeCourseCreatorClient />
    </Suspense>
  );
}
