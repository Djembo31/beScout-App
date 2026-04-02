'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ManagerContent = dynamic(
  () => import('@/features/manager/components/ManagerContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    ),
  }
);

export default function ManagerPage() {
  return <ManagerContent />;
}
