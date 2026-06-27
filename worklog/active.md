# Active Slice

```
status: idle
slice: 424
title: Synergie-Vorschau == Server (Formel flat +5%/≥2-Verein + clubId-Key + count) — DONE
size: M
stage: LOG (DONE)
spec: worklog/specs/424-synergy-preview-server-parity.md
impact: skipped (Display-only: Client-Vorschau an score_event angeglichen; Server-RPC UNBERÜHRT, kein Migration)
proof: worklog/proofs/424-synergy-parity.txt
review: worklog/reviews/424-review.md (CONCERNS→adressiert: Doku-Korrektur, kein Code-Fix)
proof-summary: tsc 0 + 277 Tests (+6 neue Synergie-Unit, Server-Spiegel-ACs) + git diff (7 TS, kein Migration) + functiondef. Reviewer-Korrektur: ALLE Synergie-Banner (Bau+Scored) lesen den Client-Rechner → Fix macht alle server-treu. Folge-Slice notiert (Scored an echtes synergy_bonus_pct binden).
```

## Zuletzt

- **Slice 423** (2026-06-27) — Picker-Club-Identität auf UUID (Filter + Synergie-Gruppierung) (S, PASS).
- **Slice 422** (2026-06-27) — FantasyPlayerRow Club-Logo+Name aus UUID (S, PASS, Live Bostan→Konyaspor).
- **Slice 421** (2026-06-27) — Welle 2.4 Per-Liga-GW-Max + GameweekSelector-Orphan (S, PASS).

## Plan (424) — CEO-Entscheid Anil: Synergie BEHALTEN + Vorschau == Server

`calculateSynergyPreview` (Banner) divergierte 3-fach vom Server (`score_event`, functiondef D87): (1) Key `h.club`-String statt club_id (423 erfasste das hier nicht), (2) Formel `5×(count−1)` statt server-flat **+5 % pro Verein mit ≥2** (LEAST 15) — 3 Spieler = Client 10 % vs Server 5 %, (3) `count` fehlt → `×N`-Anzeige nach flat-Formel falsch. Plus Row-Pill `length×4` (immer 4). Fix: server-exakte Formel + clubId + count; Pill flat 5. **Rein Display — score_event UNBERÜHRT** (kein Migration). Surge (×2) bewusst Scope-Out (Client-Chip-State nicht ohne neue Query).

## Eskalation an CEO (offen, NICHT autonom)
- **Admin-Gameweek-Engine** inkohärent liga-gescoped (finalizeGameweek club-scoped vs syncFixtureScores global). Architektur-Entscheid „GW-Lifecycle per-Liga?".
- **Ranking-Konsolidierung** scout_scores↔user_stats (Quelle-Entscheid). **Welle 3** (Lineup-Datenmodell-Fork).
