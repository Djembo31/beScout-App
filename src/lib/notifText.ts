/**
 * Notification text helper for service files (non-React).
 * Reads from messages/de.json notifTemplates namespace.
 * Simple {param} interpolation — no ICU plural/select.
 *
 * Usage:
 *   notifText('tradeSoldBody', { name: 'Messi' })
 *   → "Dein Angebot für Messi wurde angenommen"
 */
import deMessages from '@/../messages/de.json';

const templates = (deMessages as unknown as Record<string, Record<string, string>>).notifTemplates ?? {};

export function notifText(key: string, params?: Record<string, string | number>): string {
  const template = templates[key];
  if (!template) return key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template,
  );
}
