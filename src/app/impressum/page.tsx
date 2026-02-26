'use client';

import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/components/legal/LegalLayout';

export default function ImpressumPage() {
  const t = useTranslations('legal.impressum');

  return (
    <LegalLayout title={t('title')}>
      {/* Firma */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('companyTitle')}</h2>
        <p>{t('companyName')}</p>
        <p>{t('companyAddress')}</p>
      </section>

      {/* Vertreter */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('representativeTitle')}</h2>
        <p>{t('representativeName')}</p>
      </section>

      {/* Kontakt */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('contactTitle')}</h2>
        <p>{t('contactEmail')}</p>
      </section>

      {/* USt-IdNr */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('vatTitle')}</h2>
        <p>{t('vatContent')}</p>
      </section>

      {/* Haftung Inhalte */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('liabilityTitle')}</h2>
        <p>{t('liabilityContent')}</p>
      </section>

      {/* Haftung Links */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('linksTitle')}</h2>
        <p>{t('linksContent')}</p>
      </section>

      {/* Urheberrecht */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('copyrightTitle')}</h2>
        <p>{t('copyrightContent')}</p>
      </section>

      {/* Streitbeilegung */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('disputeTitle')}</h2>
        <p>{t('disputeContent')}</p>
      </section>
    </LegalLayout>
  );
}
