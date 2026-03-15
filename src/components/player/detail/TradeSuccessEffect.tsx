'use client';

import React, { useEffect } from 'react';

interface TradeSuccessEffectProps {
  show: boolean;
  onComplete: () => void;
}

export default function TradeSuccessEffect({ show, onComplete }: TradeSuccessEffectProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
      <div className="relative">
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
        <div className="trade-particle" />
      </div>
    </div>
  );
}
