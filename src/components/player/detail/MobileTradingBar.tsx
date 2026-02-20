'use client';

import { ShoppingCart, Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';

interface MobileTradingBarProps {
  floor: number;
  holdingQty: number;
  isLiquidated?: boolean;
  onBuyClick: () => void;
  onSellClick: () => void;
}

export default function MobileTradingBar({
  floor, holdingQty, isLiquidated, onBuyClick, onSellClick,
}: MobileTradingBarProps) {
  if (isLiquidated) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {/* Price info */}
        <div className="shrink-0 mr-1">
          <div className="font-mono font-bold text-[#FFD700] text-sm">{fmtBSD(floor)} BSD</div>
          <div className="text-[11px] text-white/40">Floor</div>
        </div>
        {/* Buy button */}
        <Button
          variant="gold"
          className="flex-1 text-sm font-bold"
          onClick={onBuyClick}
        >
          <ShoppingCart className="w-4 h-4" />
          Kaufen
        </Button>
        {/* Sell button (only if holding) */}
        {holdingQty > 0 && (
          <Button
            variant="outline"
            className="flex-1 text-sm font-bold"
            onClick={onSellClick}
          >
            <Send className="w-4 h-4" />
            Verkaufen
          </Button>
        )}
      </div>
    </div>
  );
}
