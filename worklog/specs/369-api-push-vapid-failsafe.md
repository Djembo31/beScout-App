# Slice 369 — `/api/push → 500` Fail-Safe + VAPID-Secret-Heal

**Slice-Type:** Service + Infra (Secret) · **Größe:** S · **Scope:** §3 Money-adjacent (Push auf Trade-Pfad) + Security (Secret) → selbst gebaut.

## 1. Problem-Statement (Evidence)
E2E-Fund **T-2** (`worklog/notes/365-e2e-findings.md`): Beim Kauf `2× POST https://www.bescout.net/api/push → 500`. Trade lief durch, kein Block, aber Server-500 + für Sentry unsichtbar.

**Root-Cause (bewiesen, nicht geraten):**
1. `ensureVapid()` (`pushSender.ts:20-28`) ruft `webpush.setVapidDetails()` **ohne try/catch**. `web-push` validiert dort (`node_modules/web-push/src/vapid-helper.js:96-132`) und **wirft** bei Fehlformat (Länge ≠ 65/32 B, nicht URL-safe-Base64, `=`-Padding).
2. Live aus Vercel-Prod gezogen (`vercel env pull --environment=production`): `VAPID_PRIVATE_KEY` = `"3_…A\n"` (literale Quotes **+ Trailing-Newline**), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = `"BO…6h0"` (Quotes + **passt nicht zum Private Key**). `setVapidDetails` wirft live „Vapid private key must be a URL safe Base 64 (without =)". → 500 bei **jedem** Push.
3. Throw läuft ungefangen `ensureVapid → sendPushToUser → sendPushForNotification → route.ts:53 catch`. Der catch **returnt** 500 statt zu werfen → `withLogger.captureError` (apiLogger.ts:95, nur bei Throw) feuert nie → **Sentry blind** (0 Push-Issues trotz Live-500).
4. Verifiziertes korrektes Paar liegt in `.env.local` (`pub BIsqP4U3… / priv 3_qXXZ…`, web-push + ECDH-Pair-Check ✓).

## 2. Lösungs-Design
**A — Code-Fail-Safe (CTO, klar korrekt, secret-unabhängig):**
- Shared Pure-Helper `src/lib/vapidKey.ts` → `sanitizeVapidKey(raw)`: trim + Wrap-Quotes strippen + Whitespace/Newline raus. (Client+Server safe, kein Import, wie `notificationDeepLink.ts`.)
- `ensureVapid()`: `setVapidDetails` in try/catch; bei Throw **einmalig** `captureError` (Flag `_vapidFailed`, kein Spam) + `return false` → Push wird still übersprungen (= Verhalten „keys not configured"). **Tötet den 500.**
- `route.ts` catch: `captureError(err,{route:'public.push',feature:'push'})` → Observability-Lücke zu.
- `pushSubscription.ts` (Client): `sanitizeVapidKey` auf `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (defense; quoted Build-Value bricht sonst `urlBase64ToUint8Array` still).

**B — Secret-Heal (Anil-Entscheid 2026-06-24: lokales Paar, ich via CLI):**
- Vercel-Prod `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` auf das saubere `.env.local`-Paar setzen (ohne Quotes/Newline), Redeploy (NEXT_PUBLIC = build-time inlined). Alte (ohnehin kaputte) Subs re-subscriben via 410-Self-Heal.

## 3. Betroffene Files
- `src/lib/vapidKey.ts` (neu, pure)
- `src/lib/services/pushSender.ts` (ensureVapid try/catch + sanitize)
- `src/app/api/push/route.ts` (captureError im catch)
- `src/lib/services/pushSubscription.ts` (sanitize Client)
- Vercel-Prod-Secrets (2 Vars) — kein Repo-File

## 4. Code-Reading-Liste (erledigt VOR BUILD)
- `pushSender.ts` — ensureVapid/sendPushToUser/sendPushForNotification Throw-Pfade ✓
- `route.ts` — catch returnt 500 statt throw (Sentry-Blind-Ursache) ✓
- `apiLogger.ts` — captureError nur bei Throw (Z.95) ✓
- `node_modules/web-push/src/vapid-helper.js` — Throw-Bedingungen Z.96-132 ✓
- `pushSubscription.ts` — Client liest gleiche Var, urlBase64ToUint8Array bricht bei Quotes ✓
- Live `vercel env pull` — exakte Korruption (Quotes+Newline+Pair-Mismatch) ✓

## 5. Pattern-References
- `errors-frontend.md` „NIEMALS `.catch(() => {})`" — hier umgekehrt: kein ungefangener Throw auf Fire-and-forget-Side-Effect.
- Observability-Stack (`pattern_observability_stack.md`) — captureError/logSilentRejects.
- Secret-Rotation-Klasse (MEMORY „3 Secrets rotated") — Quote/Newline-Paste-Drift.

## 6. Acceptance Criteria
- AC1: `sanitizeVapidKey('"abc\n"') === 'abc'` (Unit, ≥4 Cases inkl. clean/quotes/newline/empty).
- AC2: `ensureVapid()` mit kaputtem Key wirft NICHT mehr → `return false` (kein Throw propagiert).
- AC3: `tsc --noEmit` grün + `vitest run` betroffene Tests grün.
- AC4: Vercel-Prod-Pull NACH Heal: beide Keys clean (kein Quote/Newline), `setVapidDetails` OK, ECDH-Pair-Match true.
- AC5: Post-Deploy: echter Buy auf bescout.net → `/api/push` **kein 500** (Network-Trace / Playwright).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Key leer/unset | `ensureVapid` return false (wie bisher), kein Throw |
| Key mit Quotes/Newline | sanitize entfernt → valide |
| Key valide aber Pair-Mismatch | setVapidDetails OK, sendNotification 401/410 → caught in allSettled, kein 500 |
| Notification-Row fehlt (Race) | maybeSingle null → route 404 (unverändert) |
| Sentry down | captureError no-op, Push-Skip trotzdem sauber |

## 8. Self-Verification
- `node -e` setVapidDetails(cleaned) + ECDH-Pair (wie Diagnose-Snippet).
- `vercel env pull` Format-Check (len/prefix, kein Secret-Leak).
- Playwright Buy-Flow Network-Filter auf `/api/push` Status.

## 9. Open-Questions
- Pflicht-geklärt: Keypaar (lokal) + wer setzt (ich/CLI) → Anil 2026-06-24. ✓
- Autonom: Helper-Platzierung (`src/lib/vapidKey.ts`), Flag-Name `_vapidFailed`.

## 10. Proof-Plan
`worklog/proofs/369-push-vapid.txt`: (a) Unit-Output sanitize+ensureVapid, (b) Prod-Pull-Format pre/post-Heal + Pair-Match, (c) Post-Deploy Buy Network-Trace `/api/push` ≠ 500.

## 11. Scope-Out
- Cross-User Notification INSERT-RLS (eigener Slice, in route.ts-Kommentar vermerkt).
- T-1 Cold-Start-Liquidität, P-4 ipo_price-Drift (eigene Slices).
- Sybil/Anti-Manip (Phase 2).

## 12. Stage-Chain
SPEC → IMPACT (inline: nur Push-Pfad + 2 Secrets, kein DB/Schema) → BUILD → REVIEW (reviewer) → PROVE → LOG.
