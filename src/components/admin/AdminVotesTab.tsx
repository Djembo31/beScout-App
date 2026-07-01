'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { CreatePollButton } from '@/components/community/CreatePollModal';
import type { ClubWithAdmin } from '@/types';

// Slice 499 (§0-Schnitt): Das alte separate Vereins-Abstimmungs-System (ohne Treasury-Split)
// wurde entfernt — bezahlte Community-Polls (source='club', 70% → Vereins-Treasury, D86/D92)
// sind der kanonische Weg. Erstellte Polls erscheinen im Community-Feed.
export default function AdminVotesTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-balance">{t('votesTitle')}</h2>

      {user && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-500/[0.04] border-amber-500/20">
          <div>
            <div className="font-bold text-amber-300">{t('clubPollSectionTitle')}</div>
            <p className="text-xs text-white/50">{t('clubPollSectionDesc')}</p>
          </div>
          <CreatePollButton userId={user.id} source="club" clubId={club.id} />
        </Card>
      )}
    </div>
  );
}
