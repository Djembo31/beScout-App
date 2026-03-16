'use client';

import { useTranslations } from 'next-intl';
import { ShoppingCart, Send, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';

interface MobileTradingBarProps {
  floor: number;
  holdingQty: number;
  change24h?: number;
  isLiquidated?: boolean;
  onBuyClick: () => void;
  onSellClick: () => void;
  onLimitClick?: () => void;
}

export default function MobileTradingBar({
  floor, holdingQty, change24h = 0, isLiquidated, onBuyClick, onSellClick, onLimitClick,
}: MobileTradingBarProps) {
  const t = useTranslations('playerDetail');
  if (isLiquidated) return null;

  const up = change24h >= 0;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden glass px-4 py-3 safe-bottom">
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {/* Price info */}
        <div className="shrink-0 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-lg text-gold gold-glow">
              {fmtScout(floor)}
            </span>
            <span className="text-[10px] text-white/40">Credits</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {change24h !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                up ? 'text-green-500 bg-green-500/10' : 'text-red-300 bg-red-500/10'
              }`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {up ? '+' : ''}{change24h.toFixed(1)}%
              </span>
            )}
            {holdingQty > 0 && (
              <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">
                {t('youOwn', { count: holdingQty })}
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
            <ShoppingCart className="size-4" aria-hidden="true" />
            {t('buy')}
          </Button>
          {onLimitClick && (
            <Button
              variant="outline"
              className="text-sm font-bold min-h-[44px] px-3"
              onClick={onLimitClick}
              aria-label={t('limitOrderTitle')}
            >
              <Clock className="size-4" aria-hidden="true" />
            </Button>
          )}
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
