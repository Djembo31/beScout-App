'use client';

/**
 * TopProgressBar — Slice 266 Cold-Start UX-Brücke.
 *
 * Slim 2px gold-Gradient-Bar oben am Viewport. Sichtbar während kritische
 * Cold-Start-Hydration läuft (Auth + Wallet + Tickets). Verschwindet sobald
 * alle drei resolved sind.
 *
 * Zweck: User sieht "es passiert was" während der 5-15s Cold-Start-Phase
 * statt zu denken "App ist tot" und Refresh zu drücken (Smoking-Gun #3).
 *
 * Diese Component fixt NICHT die Cold-Start-Phase selbst — das ist Slice 267
 * (Provider-Cascade-Refactor). Sie überbrückt nur Wahrnehmung.
 *
 * Slice 181 Pattern: anim-progress-shimmer ist in @layer utilities (globals.css).
 * Slice 198 Pattern: i18n-Key `nav.appLoading` in DE+TR.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/lib/hooks/useWallet';
import { useUserTickets } from '@/lib/queries/tickets';

const FADE_OUT_MS = 200;

export function TopProgressBar(): JSX.Element | null {
  const { user, loading: authLoading, profileLoading } = useUser();
  const { isLoading: walletLoading } = useWallet();
  const { isLoading: ticketsLoading } = useUserTickets(user?.id);
  const t = useTranslations('nav');

  const isCriticalLoading =
    authLoading ||
    (!!user && (profileLoading || walletLoading || ticketsLoading));

  // Anti-Flicker via 200ms fade-out: wenn Queries blitzschnell resolven, ist
  // die Bar trotzdem mind. ~200ms sichtbar (während CSS opacity-Transition
  // läuft) und verschwindet sanft. Wenn Loading wieder true wird mid-fade,
  // wird der Timer cleared und Bar bleibt visible.
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (isCriticalLoading) {
      setVisible(true);
      setFading(false);
      return;
    }
    if (!visible) return;
    setFading(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setFading(false);
    }, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [isCriticalLoading, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('appLoading')}
      // z-[60] = z-modal Token: ueber TopBar (z-30), unter Dialog (z-80) und
      // Toast (z-70). Wenn Modal offen ist soll User nicht durch Bar abgelenkt
      // werden — z-Stacking macht das automatisch (Reviewer Finding #2).
      className="fixed top-0 inset-x-0 z-[60] pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="relative h-[2px] w-full overflow-hidden bg-gold/10"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_OUT_MS}ms ease-out`,
        }}
      >
        {/* Shimmer-Streifen laeuft repetitiv von links nach rechts.
            Reduced-Motion: Streifen wird versteckt, statt-dessen statische
            Surface unten als visueller "es laedt"-Indikator. */}
        <div className="absolute inset-y-0 -left-1/4 w-1/3 bg-gradient-to-r from-transparent via-gold to-transparent anim-progress-shimmer motion-reduce:hidden" />
        <div className="absolute inset-0 hidden motion-reduce:block bg-gold/40" />
      </div>
    </div>
  );
}
