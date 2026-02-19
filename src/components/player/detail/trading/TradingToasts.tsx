'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

interface TradingToastsProps {
  buySuccess: string | null;
  buyError: string | null;
  shared: boolean;
  onShareTrade: () => void;
}

export default function TradingToasts({ buySuccess, buyError, shared, onShareTrade }: TradingToastsProps) {
  return (
    <>
      {buySuccess && (
        <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] rounded-xl px-4 py-3 text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {buySuccess}
          </div>
          {!shared && (
            <button
              onClick={onShareTrade}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 rounded-lg text-xs font-bold text-[#22C55E] transition-all"
            >
              In Community teilen
            </button>
          )}
        </div>
      )}
      {buyError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {buyError}
        </div>
      )}
    </>
  );
}
