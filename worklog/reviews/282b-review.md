# Review Slice 282b — LHCI-Auth-Fix

**Typ:** Self-Review (Spec §12: kein src/-Produktionscode — Config + e2e-Script + GHA. LHCI-Integration per offizieller Docs via context7, Login-Flow 1:1 aus synthetic-users.)
**Verdict:** PASS
**Datum:** 2026-06-12

## Geprüfte Änderungen

| File | Check | Ergebnis |
|------|-------|----------|
| `e2e/lhci-login.cjs` | Idempotent (Cookie-Skip)? Loud-Fail bei Login-Bruch (AC-05)? Keine Credential-Logs? Debug-Instrumentierung restlos entfernt? | ✅ alle (Negativ-Test: Error-Abort; grep TEMP-DEBUG/softnav = 0) |
| `lighthouserc.cjs` | Settings 1:1 aus JSON portiert (Throttling/Emulation/Assertions diff-geprüft)? chromePath auf collect-Ebene (LHCI-Override-Falle)? disableStorageReset? | ✅ |
| `.puppeteerrc.cjs` | Schützt ALLE Workflows vor Chrome-Download? | ✅ verifiziert: `pnpm add -D puppeteer` ohne Download, ~/.cache/puppeteer leer (AC-04) |
| `lighthouse.yml` | Secrets nur als env (GHA-masked)? include-hidden-files? yaml-lint? | ✅ |
| `package.json` | Einziger lighthouserc-Konsument umgestellt, JSON gelöscht (kein Orphan) | ✅ grep: 2/2 Referenzen auf .cjs |

## BUILD-Erkenntnisse (Debugging-Journey, ~4 Iterationen)

1. **False-positive #1:** Skip-Check via `page.url()` nach domcontentloaded — der App-Auth-Redirect ist CLIENT-side (nach Hydration), URL zeigt noch `/` → Script dachte „eingeloggt". Fix: deterministischer `sb-*-auth-token`-Cookie-Check.
2. **False-Debugging-Trap:** `lhci collect` (ohne upload) schreibt KEINE Reports nach `.lighthouseci/` — alle „immer noch /login"-Checks nach dem Cookie-Fix lasen STALE Pre-Fix-Reports aus dem alten autorun. ~1h Fehlersuche an einem bereits gelösten Problem (Probes bewiesen dann: Audit-Page war längst eingeloggt). Verify-Regel: Reports IMMER über `fetchTime` der LHRs validieren, nie `manifest[last]`.
3. **LHCI-API-Falle:** `puppeteerLaunchOptions.executablePath` wird intern von `options.chromePath` ÜBERSCHRIEBEN (`puppeteer-manager.js`) — chromePath muss auf collect-Ebene stehen.

## Verify-Stand

- AC-01 ✅ lokal: **9/9 Runs `requested == final`** (/, /market, /community — 0× /login)
- AC-04 ✅ kein Chrome-Download bei install
- AC-05 ✅ Negativ-Test wirft `[lhci-login] Login fehlgeschlagen` → Collection-Abort
- AC-07 ✅ `worklog/audits/2026-06-12/lighthouse-baseline-authed.md` (Befunde: /market TBT-Median 5,4s = 4,2-MB-Parse-Bestätigung · Home CLS 0.55)
- AC-02/03 ⏳ GHA-Run post-Deploy (pending bei Review-Zeitpunkt, wird in Proof nachgetragen)

## Knowledge-Capture-Kandidaten

1. errors-infra.md: „upload-artifact@v4 `include-hidden-files:false` schließt Dot-Dirs still aus" (Slice-279-Artifacts waren deshalb 5 Wochen leer).
2. testing.md: „Client-side-Auth-Apps: Login-State NIE via page.url() nach domcontentloaded prüfen — Cookie-Check" + „lhci collect schreibt ohne upload keine Reports".

**time-spent:** ~30 min (Review) · BUILD inkl. Debugging ~2,5h
