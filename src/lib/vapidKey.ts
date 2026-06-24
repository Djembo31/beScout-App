/**
 * Sanitize a VAPID key read from the environment.
 *
 * PURE module — no imports → safe on BOTH client (pushSubscription.ts) and
 * server (pushSender.ts). Single source of truth so a key that was pasted into
 * a secret store WITH surrounding quotes or a trailing newline (the exact Slice
 * 369 prod corruption: `VAPID_PRIVATE_KEY="3_…A\n"`) does not silently break
 * `web-push.setVapidDetails` (server) or `urlBase64ToUint8Array` (client).
 *
 * Strips: surrounding single/double quotes + all surrounding whitespace
 * (incl. \r\n). It does NOT alter the base64url body — an actually-invalid or
 * mismatched key still fails validation downstream (that is a secret problem,
 * not something this helper papers over).
 */
export function sanitizeVapidKey(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
}
