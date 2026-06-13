# Proof Slice 284c (2026-06-13)

## Build-Evidenz
- tsc --noEmit → 0
- vitest manager+rankings+market+services: **59 Files / 1238 Tests grün**
- JSON-Validierung beider Locales nach Key-Insertion ✓

## Parity-Argument FM-01 (statt Extra-Test)
/market (BestandView:122 via computePlayerFloor) und /manager (KaderTab neu via
computePlayerFloor) konsumieren jetzt DENSELBEN Helper — Divergenz strukturell
ausgeschlossen (Single-Source). Audit-Vorschlag „Parity-Test-Invariant" damit
konstruktiv erfüllt.

## Live-Spotcheck (post-Deploy) ✅

Post-Deploy-Smoke Run 27446937629 SUCCESS. Verify-Script e2e/qa-284c-verify.ts
(Login + /rankings + /manager, 393px) — 0 App-Console-Errors (nur transiente
RSC-Prefetch-Blips = LW-01-Klasse, kein App-Bug). Screenshots:
qa-screenshots/284c-rankings-default.png + 284c-manager-kader.png.

### FM-02 DB-bewiesen (der tote Markt)
```
tradeable=4501 · change_nonzero=0 · volume_nonzero=0
```
4501 handelbare Spieler, KEINER mit change/volume != 0. Vor Fix: Veränderung/
Volumen-Tab = 20 zufällige „+0%". Nach Fix (.neq/.gt-Filter): 0 Rows →
Empty-State `noMarketMovement`. Genau korrekt.

### FM-03 DB-bewiesen (kleine Ligen verschwanden)
Global-Top-100-by-floor vs. tradeable pro Liga:
```
2. Bundesliga: 542 tradeable, 0 im Top-100   → Liga-Filter zeigte NICHTS
Süper Lig:     588 tradeable, 1 im Top-100   → zeigte 1 Spieler
TFF 1. Lig:    715 tradeable, 1 im Top-100   → zeigte 1 Spieler
Bundesliga:    579 tradeable, 14 im Top-100
```
Server-seitiger club_id-Filter (statt Client-Filter auf gekapptem Top-100)
zeigt jetzt die echten Top 20 jeder Liga. Audit-Befund „kleine Ligen 2-3
Spieler/nichts" exakt reproduziert + behoben.

### FM-01/04/05/07
Code + 1238/1238 Tests grün; FM-01-Parity strukturell (gemeinsamer
computePlayerFloor-Helper); /manager-Kader rendert Werte sauber.

