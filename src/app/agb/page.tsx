'use client';

import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/components/legal/LegalLayout';

export default function AGBPage() {
  const t = useTranslations('legal.agb');

  return (
    <LegalLayout title={t('title')}>
      {/* Geltungsbereich */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('scopeTitle')}</h2>
        <p>{t('scopeContent')}</p>
      </section>

      {/* Registrierung */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('registrationTitle')}</h2>
        <p>{t('registrationContent')}</p>
      </section>

      {/* bCredits */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('creditsTitle')}</h2>
        <p>{t('creditsContent')}</p>
      </section>

      {/* DPC */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('dpcTitle')}</h2>
        <p>{t('dpcContent')}</p>
      </section>

      {/* Fantasy */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('fantasyTitle')}</h2>
        <p>{t('fantasyContent')}</p>
      </section>

      {/* Verbotene Handlungen */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('prohibitedTitle')}</h2>
        <p>{t('prohibitedContent')}</p>
      </section>

      {/* Haftung */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('liabilityTitle')}</h2>
        <p>{t('liabilityContent')}</p>
      </section>

      {/* Kündigung */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('terminationTitle')}</h2>
        <p>{t('terminationContent')}</p>
      </section>

      {/* Schlussbestimmungen */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('finalTitle')}</h2>
        <p>{t('finalContent')}</p>
      </section>
    </LegalLayout>
  );
}
