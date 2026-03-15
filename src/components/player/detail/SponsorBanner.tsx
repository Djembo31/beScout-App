'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSponsor } from '@/lib/queries';
import { trackImpression, trackClick } from '@/lib/services/sponsorTracking';
import type { SponsorPlacement } from '@/types';

const PLACEMENT_LABEL_KEYS: Record<SponsorPlacement, string> = {
  home_hero: 'presentedBy',
  home_mid: 'sponsoredBy',
  market_top: 'sponsoredBy',
  club_hero: 'presentedBy',
  player_mid: 'sponsoredBy',
  player_footer: 'partner',
  event: 'sponsoredBy',
  market_transferlist: 'sponsoredBy',
  market_ipo: 'sponsoredBy',
  market_portfolio: 'partner',
  market_offers: 'sponsoredBy',
  club_community: 'sponsoredBy',
  club_players: 'sponsoredBy',
  fantasy_spieltag: 'sponsoredBy',
  fantasy_pitch: 'presentedBy',
  fantasy_leaderboard: 'sponsoredBy',
  fantasy_history: 'sponsoredBy',
  profile_hero: 'presentedBy',
  profile_footer: 'partner',
  community_feed: 'sponsoredBy',
  community_research: 'sponsoredBy',
};

interface SponsorBannerProps {
  placement: SponsorPlacement;
  clubId?: string | null;
  /** Pass sponsor data directly (e.g. from event) — skips DB fetch */
  sponsor?: { id?: string; name: string; logo_url: string; link_url?: string | null } | null;
  className?: string;
}

export default function SponsorBanner({ placement, clubId, sponsor: directSponsor, className = '' }: SponsorBannerProps) {
  const ts = useTranslations('sponsor');
  const { data: dbSponsor } = useSponsor(placement, clubId);
  const bannerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);

  const raw = directSponsor ?? dbSponsor ?? null;
  const sponsorId = (directSponsor as { id?: string } | null)?.id ?? dbSponsor?.id ?? null;
  const sponsor: { name: string; logo_url: string; link_url: string | null } | null =
    raw ? { name: raw.name, logo_url: raw.logo_url, link_url: raw.link_url ?? null } : null;

  // Reset impression flag when sponsor changes
  useEffect(() => {
    impressionTracked.current = false;
  }, [sponsorId]);

  // IntersectionObserver: track impression after 1s visible at 50%
  useEffect(() => {
    if (!sponsorId || !bannerRef.current) return;
    const el = bannerRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionTracked.current) {
          timer = setTimeout(() => {
            if (!impressionTracked.current && sponsorId) {
              impressionTracked.current = true;
              trackImpression(sponsorId, placement);
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [sponsorId, placement]);

  const handleClick = useCallback(() => {
    if (sponsorId) trackClick(sponsorId, placement);
  }, [sponsorId, placement]);

  if (!sponsor) return null;

  const label = ts(PLACEMENT_LABEL_KEYS[placement]);

  const content = (
    <div ref={bannerRef} className={`bg-surface-minimal border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-gold/50" />
        <span className="text-[11px] font-bold text-white/30 uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {sponsor.logo_url && (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="h-6 w-auto max-w-[80px] rounded object-contain"
          />
        )}
        <span className="text-xs font-black text-white/40">{sponsor.name}</span>
      </div>
    </div>
  );

  if (sponsor.link_url) {
    return (
      <a href={sponsor.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity" onClick={handleClick}>
        {content}
      </a>
    );
  }

  return content;
}
