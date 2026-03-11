'use client';

import { ShieldOff } from 'lucide-react';

export default function BlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-md text-center" role="alert">
        <ShieldOff className="mx-auto mb-6 h-16 w-16 text-red-500/60" role="img" aria-label="Region restricted" />
        <h1 className="mb-3 text-2xl font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded" tabIndex={-1} aria-label="Service not available in your region">
          Service Not Available
        </h1>
        <p className="text-sm leading-relaxed text-white/50">
          BeScout is not available in your region due to regulatory restrictions.
          If you believe this is an error, please contact support.
        </p>
        <p className="mt-6 text-xs text-white/30">
          support@bescout.io
        </p>
      </div>
    </div>
  );
}
