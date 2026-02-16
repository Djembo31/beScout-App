'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Share2, Users, Check } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { getUserReferralCode, getUserReferralCount } from '@/lib/services/referral';

type Props = {
  userId: string;
};

export default function ReferralCard({ userId }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUserReferralCode(userId).then(c => setCode(c)).catch(() => {});
    getUserReferralCount(userId).then(n => setCount(n)).catch(() => {});
  }, [userId]);

  if (!code) return null;

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BeScout',
          text: 'Komm zu BeScout — DPC-Trading, Fantasy & mehr für Fußball-Fans!',
          url: referralUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-[#FFD700]/[0.04] to-purple-500/[0.04] border-[#FFD700]/15">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#FFD700]" />
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Freunde einladen</span>
        {count > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] text-[10px] font-bold">
            {count} eingeladen
          </span>
        )}
      </div>

      {/* Referral Code */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-[#FFD700] tracking-widest select-all">
          {code}
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Kopieren"
        >
          {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-white/50" />}
        </button>
      </div>

      <Button variant="gold" size="sm" className="w-full gap-1.5" onClick={handleShare}>
        <Share2 className="w-3.5 h-3.5" />
        Link teilen
      </Button>
    </Card>
  );
}
