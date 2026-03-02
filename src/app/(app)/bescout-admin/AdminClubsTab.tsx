'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2, Trophy, MapPin, Plus, Settings, Loader2, BadgeCheck, UserPlus,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getAllClubs, type AdminClub } from '@/lib/services/platformAdmin';
import { useToast } from '@/components/providers/ToastProvider';
import CreateClubModal from '@/components/admin/CreateClubModal';
import InviteClubAdminModal from '@/components/admin/InviteClubAdminModal';

interface AdminClubsTabProps {
  adminId: string;
  role: string;
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  baslangic: { label: 'Başlangıç', color: 'bg-white/10 text-white/60' },
  profesyonel: { label: 'Profesyonel', color: 'bg-sky-500/20 text-sky-300' },
  sampiyon: { label: 'Şampiyon', color: 'bg-gold/20 text-gold' },
};

export function AdminClubsTab({ adminId, role }: AdminClubsTabProps) {
  const router = useRouter();
  const t = useTranslations('bescoutAdmin');
  const tc = useTranslations('common');
  const { addToast } = useToast();
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteClub, setInviteClub] = useState<AdminClub | null>(null);

  const canCreate = role === 'superadmin' || role === 'admin';

  async function loadClubs() {
    setLoading(true);
    try {
      const data = await getAllClubs();
      setClubs(data);
    } catch (err) {
      console.error('[AdminClubs] Load failed:', err);
      addToast(t('clubsLoadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClubs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-white/50" aria-hidden="true" />
          <span className="font-bold text-white tabular-nums">{clubs.length} Club{clubs.length !== 1 ? 's' : ''}</span>
        </div>
        {canCreate && (
          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[44px]"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('createClubBtn')}
          </Button>
        )}
      </div>

      {/* Club List */}
      {clubs.length === 0 ? (
        <Card className="p-8 text-center text-white/30">
          <Building2 className="size-8 mx-auto mb-2 text-white/15" aria-hidden="true" />
          <p className="text-sm text-pretty">{t('noClubs')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clubs.map(club => {
            const planBadge = PLAN_BADGE[club.plan] ?? PLAN_BADGE.baslangic;
            return (
              <Card key={club.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Club info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white truncate">{club.name}</span>
                      {club.is_verified && <BadgeCheck className="size-4 text-gold shrink-0" aria-hidden="true" />}
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', planBadge.color)}>
                        {planBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Trophy className="size-3" aria-hidden="true" />
                        {club.league}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden="true" />
                        {club.city ? `${club.city}, ` : ''}{club.country}
                      </span>
                    </div>
                  </div>

                  {/* Right: Stats + Action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-white/40">
                        <span className="tabular-nums">{club.player_count}</span> {t('clubPlayers')}
                      </div>
                      <div className="text-xs text-white/40">
                        <span className="tabular-nums">{club.follower_count}</span> {t('clubFollowers')}
                      </div>
                    </div>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInviteClub(club)}
                        className="min-h-[44px]"
                        aria-label={t('inviteAdmin', { club: club.name })}
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/club/${club.slug}/admin`)}
                      className="min-h-[44px]"
                    >
                      <Settings className="size-4" aria-hidden="true" />
                      {tc('manage')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Club Modal */}
      <CreateClubModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        adminId={adminId}
        onCreated={loadClubs}
      />

      {/* Invite Club Admin Modal */}
      {inviteClub && (
        <InviteClubAdminModal
          open={!!inviteClub}
          onClose={() => setInviteClub(null)}
          clubId={inviteClub.id}
          clubName={inviteClub.name}
        />
      )}
    </div>
  );
}
