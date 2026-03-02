'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Share2, Users, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { getUserReferralCode, getUserReferralCount } from '@/lib/services/referral';

type Props = {
  userId: string;
};

export default function ReferralCard({ userId }: Props) {
  const ta = useTranslations('airdrop');
  const tc = useTranslations('common');
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUserReferralCode(userId).then(c => setCode(c)).catch(err => console.error('[ReferralCard] getReferralCode:', err));
    getUserReferralCount(userId).then(n => setCount(n)).catch(err => console.error('[ReferralCard] getReferralCount:', err));
  }, [userId]);

  if (!code) return null;

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('[ReferralCard] copyToClipboard:', err); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BeScout',
          text: ta('referralShareText'),
          url: referralUrl,
        });
      } catch (err) { console.error('[ReferralCard] share:', err); }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="p-4 bg-gold/[0.04] border-gold/15">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-gold" />
        <span className="text-xs font-bold text-white/50 uppercase">{ta('inviteFriends')}</span>
        {count > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold">
            {ta('invitedCount', { count })}
          </span>
        )}
      </div>

      {/* Referral Code */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-gold tracking-widest select-all">
          {code}
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label={tc('copyLabel')}
        >
          {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-white/50" />}
        </button>
      </div>

      <Button variant="gold" size="sm" className="w-full gap-1.5" onClick={handleShare}>
        <Share2 className="size-3.5" />
        {ta('shareLink')}
      </Button>
    </Card>
  );
}
