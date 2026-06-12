# Proof Slice 282b — LHCI authed Collection (2026-06-12)

## AC-01 — Alle Audits messen die eingeloggte App (lokal) ✅

```
$ pnpm run lighthouse:local   (3 URLs × 3 Runs, jarvis-qa, mobile-Profil)
ALLE 9 Runs: requestedUrl == finalDisplayedUrl — 0× /login
  / -> /                  Perf 46-62 | LCP 3029-3216 | TBT 1553-1984 | CLS bis 0.551
  /market -> /market      Perf 47-57 | LCP 2574-3575 | TBT 1917-7701 | CLS ~0.21
  /community -> /community Perf 54-65 | LCP 3205-3400 | TBT 2038-3168 | CLS 0.04-0.16
```

Vorher (alle Runs seit Slice 279): `finalDisplayedUrl = /login` auf allen 3 URLs.
Volle Tabelle + Hebel-Analyse: `worklog/audits/2026-06-12/lighthouse-baseline-authed.md`.

## AC-04 — Kein Chrome-Download im Install ✅

```
$ pnpm add -D puppeteer   → Done in 14.7s, kein "Downloading Chrome"
$ ls ~/.cache/puppeteer   → leer
```
(.puppeteerrc.cjs skipDownload + pnpm-10-Postinstall-Block, doppelt geschützt.)

## AC-05 — Login-Fail wirft LAUT ✅

```
$ SMOKE_EMAIL=wrong@bescout.net SMOKE_PASSWORD=falsch123 lhci collect ...
Error: [lhci-login] Login fehlgeschlagen: Waiting failed: 30000ms exceeded
    at module.exports (C:\bescout-app\e2e\lhci-login.cjs:70:11)
```
→ Collection-Abort statt stillem /login-Messen (Design-Ziel: der Slice-279-Fehler
kann nicht mehr unbemerkt passieren).

## Root-Cause-Beweise (BUILD-Debugging)

1. **Artifact-Fix:** Run 27360734770 Log: `##[warning]No files were found with the
   provided path: .lighthouseci/` — upload-artifact@v4 `include-hidden-files:false`
   schließt Dot-Dirs aus. Fix: explizit `true`.
2. **Skip-Check-Falle:** App-Auth-Redirect ist client-side; `page.url()` nach
   domcontentloaded lieferte false-positive „Session aktiv". Fix: `sb-*-auth-token`-
   Cookie-Check.
3. **In-Page-Instrumentierung** (temporär) bewies: Audit-Page hat gültigen Token
   (`expires_at +3594s, user=jarvis-qa@bescout.net`) + App lief eingeloggt
   (Streak/Achievements/ClubCache-Logs).

## AC-02 + AC-03 — GHA-Run (post-Deploy) ✅

Run 27382868006 (deployment_status für 3e6f45ab): **SUCCESS in 3m36s**.
`[lhci-login] Login für …` im Runner-Log, System-Chrome via resolveChromePath.

**AC-03:** Artifact `lhci-results-3e6f45ab…` = **4.450.298 bytes** downloadbar
(vorher: ALLE Slice-279-Runs 0 Artifacts wegen include-hidden-files-Default).

**AC-02:** Median-of-3 aus dem GHA-Artifact — alle URLs eingeloggt gemessen:

```
/          -> /          | Perf 69 | FCP 844 | LCP 3221 | TBT  664 | CLS 0.159
/market    -> /market    | Perf 52 | FCP 816 | LCP 4423 | TBT 1189 | CLS 0.189
/community -> /community | Perf 82 | FCP 815 | LCP 2067 | TBT  578 | CLS 0.101
```

GHA-Runner-Werte sind deutlich stabiler als lokal (weniger CPU-Noise) —
Phase-3-Schwellen werden aus dieser Quelle abgeleitet (3-5 Runs sammeln).
