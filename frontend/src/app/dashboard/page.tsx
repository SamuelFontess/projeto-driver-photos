'use client';

import { Suspense } from 'react';
import { FileBrowser } from '@/src/features/files/components/FileBrowser';
import { Loader2 } from 'lucide-react';

function FileBrowserFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<FileBrowserFallback />}>
        <FileBrowser />
      </Suspense>
    </div>
  );
}
