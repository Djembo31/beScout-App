/**
 * Notification text helper for service files (non-React).
 * Loads BOTH de.json + tr.json notifTemplates namespaces and resolves
 * by `locale` parameter (default 'de').
 *
 * Simple {param} interpolation — no ICU plural/select.
 *
 * Usage:
 *   notifText('tradeSoldBody', { name: 'Messi' })            // DE (default)
 *   notifText('tradeSoldBody', { name: 'Messi' }, 'tr')      // TR
 *
 * Architecture note (J10F-01, AR-60):
 * The proper long-term fix is for services to write i18n KEYS into the DB
 * and let the React client resolve via `useTranslations`. This helper is a
 * Beta-Quickfix that lets callers pass the recipient's locale (loaded from
 * profiles.locale) so cross-user notifications respect the recipient's language.
 *
 * Default 'de' keeps the helper backward-compatible with 30+ existing call-sites.
 */
import deMessages from '@/../messages/de.json';
import trMessages from '@/../messages/tr.json';

type TemplateMap = Record<string, string>;
type LocaleKey = 'de' | 'tr';

const templatesByLocale: Record<LocaleKey, TemplateMap> = {
  de: ((deMessages as unknown) as { notifTemplates?: TemplateMap }).notifTemplates ?? {},
  tr: ((trMessages as unknown) as { notifTemplates?: TemplateMap }).notifTemplates ?? {},
};

export function notifText(
  key: string,
  params?: Record<string, string | number>,
  locale: LocaleKey | string = 'de',
): string {
  const safeLocale: LocaleKey = locale === 'tr' ? 'tr' : 'de';
  const templates = templatesByLocale[safeLocale];
  // Fallback chain: requested locale -> 'de' -> raw key
  const template = templates[key] ?? templatesByLocale.de[key];
  if (!template) return key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template,
  );
}
