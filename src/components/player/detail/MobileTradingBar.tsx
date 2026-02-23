'use client';

import { ShoppingCart, Send, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';

interface MobileTradingBarProps {
  floor: number;
  holdingQty: number;
  change24h?: number;
  isLiquidated?: boolean;
  onBuyClick: () => void;
  onSellClick: () => void;
}

export default function MobileTradingBar({
  floor, holdingQty, change24h = 0, isLiquidated, onBuyClick, onSellClick,
}: MobileTradingBarProps) {
  if (isLiquidated) return null;

  const up = change24h >= 0;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden glass px-4 py-3">
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {/* Price info */}
        <div className="shrink-0 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-lg text-[#FFD700] gold-glow">
              {fmtScout(floor)}
            </span>
            <span className="text-[10px] text-white/40">$SCOUT</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {change24h !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                up ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-red-300 bg-red-500/10'
              }`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {up ? '+' : ''}{change24h.toFixed(1)}%
              </span>
            )}
            {holdingQty > 0 && (
              <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-md">
                Du: {holdingQty} DPC
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 ml-auto shrink-0">
          <Button
            variant="gold"
            className="text-sm font-bold btn-gold-glow min-h-[44px] px-5"
            onClick={onBuyClick}
          >
            <ShoppingCart className="w-4 h-4" />
            Kaufen
          </Button>
          {holdingQty > 0 && (
            <Button
              variant="outline"
              className="text-sm font-bold min-h-[44px]"
              onClick={onSellClick}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
