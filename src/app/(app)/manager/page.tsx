'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui';

const ManagerSkeleton = () => (
  <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-6">
    <div>
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-64" />
    </div>
    <Skeleton className="h-12 w-full rounded-xl" />
    <Skeleton className="h-64 rounded-2xl" />
    <Skeleton className="h-48 rounded-2xl" />
  </div>
);

const ManagerContent = dynamic(
  () => import('@/features/manager/components/ManagerContent'),
  {
    ssr: false,
    loading: () => <ManagerSkeleton />,
  }
);

export default function ManagerPage() {
  return <ManagerContent />;
}
