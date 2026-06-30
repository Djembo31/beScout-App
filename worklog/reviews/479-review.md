# Review — Slice 479 (D-25 Auth-Fehler-i18n)

**Reviewer:** Cold-Context reviewer-Agent · 2026-06-30 · time-spent ~13 min
**Verdict: PASS** (würde ein Senior so mergen: Ja — alle 5 Login-Pfade + Onboarding-Fallback sauber auf `te(mapErrorToKey(...))`, Spezialfälle + Redirect-Branches unverändert, neue Regex auth-exklusiv ohne reale Kollision, nur vorhandene DE+TR-Keys.)

## Findings (alle LOW/INFO — keiner merge-blockierend; #1+#2 dennoch behoben)

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | LOW | `errorMessages.ts` Regex-Alt `only.*request.*(this.*)?after` zu breit (3 lose Tokens) — keine reale Kollision, aber latentes Risiko. | ✅ **behoben:** enger geankert `only.*request.*after.*second` (GoTrue-Wortlaut). Test grün (matcht via `for.security.purposes`). |
| 2 | LOW | Onboarding non-Error-Zweig: `msg = t('profileCreateError')` (vor-übersetzt) → `te(mapErrorToKey())` → `'generic'` = Degradation. Praktisch unerreichbar (Services werfen Error-Instanzen). | ✅ **behoben:** `msg = 'profileCreateError'` (Key) + `|| msg === 'profileCreateError'` im Spezialfall-Zweig → spezifische Meldung erhalten. |
| 3 | INFO | Spec nennt `error-keys-coverage.test.ts` (INV-25, prüft `service-throws ⊆ KNOWN_KEYS`) als DE+TR-Garantie; die echte Parität kommt aus `i18n-coverage.js` (pre-commit). | Doku-Präzision; Proof.txt ist korrekt. Kein Code-Issue. |

## Kern-Fragen verifiziert (Reviewer)
1. **Regex-Over-Match: KEINE reale Kollision.** `already.*regist` braucht literal „regist" = auth-exklusiv (kein Trading/Bounty/Mission/Poll/Equipment-String enthält register/regist). `for.security.purposes` auth-exklusiv. First-match-wins-Reihenfolge geprüft: „User already registered" + „For security purposes…" + „Email rate limit exceeded" mappen alle korrekt, ohne spezifischere Patterns zu beschatten.
2. **Login-Helper vollständig:** alle 5 Pfade nutzen `authErrorMsg`, kein roher Pfad; `invalidCredentials` erhalten.
3. **Onboarding:** handleReserved/handleInvalid + dup-key/fkey-Redirect-Control-Flow unverändert.
4. **Namespace-Garantie:** `te=errors`-NS; die 2 neuen Targets (`alreadyExists`/`rateLimited`) sind vorhandene KNOWN_KEYS, direkt in de.json + tr.json verifiziert (Reviewer). Keine neuen Output-Keys → Render-sicher.
5. **Compliance:** keine verbotenen Wording-Begriffe (nur generische vorhandene Texte). PASS.

## Knowledge-Capture (Reviewer)
`error-keys-coverage.test.ts` (INV-25) garantiert `service-throws ⊆ KNOWN_KEYS`, NICHT `mapErrorToKey-Outputs ⊆ errors-NS-DE∩TR`. Bei künftigen Slices, die **neue** ERROR_MAP-Output-Keys einführen (nicht hier — hier nur Reuse), muss die errors-NS-DE+TR-Existenz des neuen Targets explizit verifiziert werden (kein Test fängt einen Target, der in keiner Locale existiert).
