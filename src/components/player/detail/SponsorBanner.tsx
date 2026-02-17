'use client';

import { Zap } from 'lucide-react';
import { useSponsor } from '@/lib/queries';
import type { SponsorPlacement } from '@/types';

const PLACEMENT_LABELS: Record<SponsorPlacement, string> = {
  home_hero: 'Präsentiert von',
  home_mid: 'Gesponsert von',
  market_top: 'Gesponsert von',
  club_hero: 'Präsentiert von',
  player_mid: 'Gesponsert von',
  player_footer: 'Partner',
  event: 'Gesponsert von',
  market_transferlist: 'Gesponsert von',
  market_ipo: 'Gesponsert von',
  market_portfolio: 'Partner',
  market_offers: 'Gesponsert von',
  club_community: 'Gesponsert von',
  club_players: 'Gesponsert von',
  fantasy_spieltag: 'Gesponsert von',
  fantasy_pitch: 'Präsentiert von',
  fantasy_leaderboard: 'Gesponsert von',
  fantasy_history: 'Gesponsert von',
  profile_hero: 'Präsentiert von',
  profile_footer: 'Partner',
  community_feed: 'Gesponsert von',
  community_research: 'Gesponsert von',
};

interface SponsorBannerProps {
  placement: SponsorPlacement;
  clubId?: string | null;
  /** Pass sponsor data directly (e.g. from event) — skips DB fetch */
  sponsor?: { name: string; logo_url: string; link_url?: string | null } | null;
  className?: string;
}

export default function SponsorBanner({ placement, clubId, sponsor: directSponsor, className = '' }: SponsorBannerProps) {
  const { data: dbSponsor } = useSponsor(placement, clubId);

  const raw = directSponsor ?? dbSponsor ?? null;
  const sponsor: { name: string; logo_url: string; link_url: string | null } | null =
    raw ? { name: raw.name, logo_url: raw.logo_url, link_url: raw.link_url ?? null } : null;

  if (!sponsor) return null;

  const label = PLACEMENT_LABELS[placement];

  const content = (
    <div className={`bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-[#FFD700]/50" />
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {sponsor.logo_url && (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="w-5 h-5 rounded object-contain"
          />
        )}
        <span className="text-xs font-black text-white/40">{sponsor.name}</span>
      </div>
    </div>
  );

  if (sponsor.link_url) {
    return (
      <a href={sponsor.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}
