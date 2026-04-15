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
 *   // Cross-user notifications — load recipient locale first:
 *   const loc = await getRecipientLocale(recipientUserId);
 *   await createNotification(recipientId, 'trade', notifText('tradeSoldTitle', undefined, loc), ...);
 *
 * Architecture note (J10F-01, AR-60, Phase 3 HIGH-01):
 * The proper long-term fix is for services to write i18n KEYS into the DB
 * and let the React client resolve via `useTranslations`. This helper is a
 * Beta-Quickfix that lets callers pass the recipient's locale (loaded from
 * profiles.language) so cross-user notifications respect the recipient's language.
 *
 * Default 'de' keeps the helper backward-compatible with service-internal calls
 * (e.g. fallback-name lookups like `unknownFallback`, `tradeFallbackPlayer`).
 */
import deMessages from '@/../messages/de.json';
import trMessages from '@/../messages/tr.json';
import { supabase } from '@/lib/supabaseClient';

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

/**
 * Load a user's preferred notification language from `profiles.language`.
 * Returns 'de' or 'tr' — normalizes any other value (e.g. 'en') to 'de'.
 * Silently returns 'de' on fetch errors (best-effort, never blocks notifications).
 *
 * Used by services sending cross-user notifications so the recipient
 * sees templates in their chosen UI language.
 */
export async function getRecipientLocale(userId: string): Promise<LocaleKey> {
  if (!userId) return 'de';
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[notifText] getRecipientLocale failed:', error);
      return 'de';
    }
    return data?.language === 'tr' ? 'tr' : 'de';
  } catch (err) {
    console.error('[notifText] getRecipientLocale threw:', err);
    return 'de';
  }
}
