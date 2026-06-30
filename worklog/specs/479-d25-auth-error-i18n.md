# Slice 479 — D-25 Auth-Fehler-i18n (Login + Onboarding)

**Slice-Type:** UI (i18n-Wiring)
**Größe:** S
**Scope:** CTO-autonom (Verdrahtung vorhandener `errors`-Keys; KEINE neuen TR-Strings → kein TR-Review)
**Welle:** Mock→Pro Konsistenz-Batch (disease-register D-25)

## 1. Problem-Statement (Evidence)
`/login` + `/onboarding` zeigen rohe GoTrue/Service-Englisch-Strings via `setError(authError.message)` / `setError(msg)` an DE+TR-User = i18n-Leak auf dem **ersten Bildschirm** (erstes Pro-Eindruck). Register D-25: „4 von 5 Auth-Fehler-Pfaden untranslatiert. Zentrale `mapErrorToKey` existiert, im Login nicht importiert. Auch onboarding."
- Login raw-Pfade: signUp (Z.85), Passwort-non-„invalid" (Z.103), Magic-Link (Z.121), OAuth (Z.138), Demo (Z.161). Nur „Invalid login credentials" übersetzt.
- Onboarding: Fallback `setError(msg)` (Z.218) = roh, außer handleReserved/handleInvalid.

## 2. Lösungs-Design
`te(mapErrorToKey(raw))` (errors-NS) statt roh — vorhandene Keys, kein neuer String.
- Login: `const te = useTranslations('errors')` + Helper `authErrorMsg(raw) = raw==='Invalid login credentials' ? t('invalidCredentials') : te(mapErrorToKey(raw))`; alle 5 Pfade darauf. (invalidCredentials bleibt auth-NS-Spezialfall.)
- Onboarding: Fallback-Zweig `: msg` → `: te(mapErrorToKey(msg))` (handleReserved/handleInvalid + Redirect-Branches unverändert).
- `errorMessages.ts` ERROR_MAP: +2 auth-Patterns → **vorhandene** Keys: `/user.*already.*regist|already.*regist/i → alreadyExists` · `/for.security.purposes|only.*request.*after|email.*rate.*limit/i → rateLimited`. (Rest GoTrue → `generic`, übersetzt statt roh.)

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/app/(auth)/login/page.tsx` | +`te` + Helper + 5 Pfade |
| `src/app/(auth)/onboarding/page.tsx` | +`te` + Fallback-Zweig |
| `src/lib/errorMessages.ts` | +2 auth-Regex → vorhandene Keys |
| `src/lib/__tests__/error-keys-coverage.test.ts` | grün bleiben (alle map-Outputs haben DE+TR) |

## 4. Code-Reading-Liste (DONE)
1. `login/page.tsx:85/100-104/121/138/161` — 5 setError-Pfade, nur invalidCredentials gemappt. ✓
2. `errorMessages.ts` — `mapErrorToKey`/KNOWN_KEYS/ERROR_MAP, errors-NS; alreadyExists+rateLimited existieren. ✓
3. `onboarding/page.tsx:199-218` — Fallback `setError(msg)` roh; handleReserved/Invalid + dup-key/fkey-Redirect getrennt. ✓
4. Slice 379/393/S196/J1+J3 (errors-frontend: i18n-Key-Leak via Service-Errors, mapErrorToKey-Pattern). ✓

## 5. Pattern-References
- errors-frontend.md „i18n-Key-Leak via Service-Errors" (J1+J3) + „Hardcoded German addToast/Error-Strings" (S196) — `te(mapErrorToKey(...))` ist der kanonische Fix.
- errorMessages.ts `mapErrorToKey` = zentrale SSOT (§0.3).

## 6. Acceptance Criteria
- **AC-1** Login: kein Pfad setzt mehr roh `authError.message`; alle via `authErrorMsg`. VERIFY: grep.
- **AC-2** „Invalid login credentials" zeigt weiter `auth.invalidCredentials` (nicht generic). VERIFY: Helper-Logik/Trace.
- **AC-3** `mapErrorToKey('User already registered')==='alreadyExists'`, `mapErrorToKey('For security purposes, you can only request this after 60 seconds')==='rateLimited'`. VERIFY: Unit (error-keys-coverage o. neu).
- **AC-4** Onboarding-Fallback via `te(mapErrorToKey)`; handleReserved/Invalid + Redirects unverändert. VERIFY: grep/Trace.
- **AC-5** tsc 0 + error-keys-coverage-Test grün (alle map-Outputs DE+TR).
- **AC-6** Live (post-Deploy): Login mit falschem Passwort + unbekannter Mail → DE/TR-Meldung, kein Englisch.

## 7. Edge Cases
unbekannter GoTrue-String → generic (übersetzt) · invalidCredentials → auth-Spezialfall · leerer message → normalizeError/generic · onboarding dup-key → Redirect (kein Display) · te(key) fehlt → i18n-Gate verhindert (alle map-Outputs haben DE+TR).

## 8. Self-Verification
```bash
npx tsc --noEmit
npx vitest run src/lib/__tests__/error-keys-coverage.test.ts
grep -n "authError.message\|setError(msg)" src/app/(auth)/login/page.tsx src/app/(auth)/onboarding/page.tsx   # erwartet: 0 rohe
```

## 9. Open-Questions
Kein CEO-/TR-Review nötig (nur vorhandene Keys verdrahtet). **Optional-Enhancement (flag, TR-Review):** spezifische Auth-Keys (emailNotConfirmed/weakPassword/signupsDisabled) DE+TR für feinere UX statt generic → eigener Slice.

## 10. Proof-Plan
`worklog/proofs/479-auth-error-i18n.txt`: tsc 0 + vitest + grep 0-rohe-Pfade + AC-3-Map-Trace. + Live-Login-Screenshot post-Deploy.

## 11. Scope-Out
Spezifische GoTrue-Key-Granularität (neue TR-Strings) → optional, TR-Review. Andere setError-Stellen außerhalb auth/onboarding (eigene Domänen).

## 12. Stage-Chain
SPEC → BUILD (3 Files) → REVIEW (reviewer-Agent, S + shared mapper) → PROVE (tsc+vitest+grep+Live) → LOG (+ Register D-25 geheilt).

## 13. Pre-Mortem
- „2 neue Regex kollidieren mit Trading-Errors" → auth-spezifisch verankert (`already.regist`, `security.purposes`), keine Trading-Überschneidung; error-keys-coverage-Test fängt Regression.
- „te() wirft bei fehlendem Key" → alle map-Outputs in errors-NS DE+TR (i18n-Gate); generic existiert.
- „invalidCredentials verloren" → Helper behält den auth-NS-Spezialfall explizit.
