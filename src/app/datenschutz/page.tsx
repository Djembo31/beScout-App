'use client';

import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/components/legal/LegalLayout';

export default function DatenschutzPage() {
  const t = useTranslations('legal.datenschutz');

  return (
    <LegalLayout title={t('title')}>
      {/* Verantwortlicher */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('controllerTitle')}</h2>
        <p>{t('controllerContent')}</p>
      </section>

      {/* Übersicht */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('overviewTitle')}</h2>
        <p>{t('overviewContent')}</p>
      </section>

      {/* Erhobene Daten */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('dataTypesTitle')}</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>{t('dataBestand')}</li>
          <li>{t('dataNutzung')}</li>
          <li>{t('dataInhalt')}</li>
          <li>{t('dataTransaktion')}</li>
          <li>{t('dataCookies')}</li>
        </ul>
      </section>

      {/* Rechtsgrundlagen */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('legalBasisTitle')}</h2>
        <p>{t('legalBasisContent')}</p>
      </section>

      {/* Drittanbieter */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('thirdPartyTitle')}</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>{t('thirdPartySupabase')}</li>
          <li>{t('thirdPartySentry')}</li>
          <li>{t('thirdPartyVercel')}</li>
        </ul>
      </section>

      {/* Betroffenenrechte */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('rightsTitle')}</h2>
        <p>{t('rightsContent')}</p>
      </section>

      {/* Aufbewahrung */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('retentionTitle')}</h2>
        <p>{t('retentionContent')}</p>
      </section>

      {/* Änderungen */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">{t('changesTitle')}</h2>
        <p>{t('changesContent')}</p>
      </section>
    </LegalLayout>
  );
}
