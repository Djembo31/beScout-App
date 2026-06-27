# Review — Slice 422 (FantasyPlayerRow Club-Identität UUID)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **time-spent:** ~9 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT (Vollständigkeit) | PlayerPicker:112 · LineupBuilder:198 · useLineupPanelState:138 | An die Row wurde das **rohe** `player.clubId` durchgereicht, obwohl die Helper für den Fixture-Lookup bereits `clubId = player.clubId ?? allPlayers.find(...)?.clubId` (mit Fallback) berechnen → für Holdings mit `clubId===null`, aber über `allPlayers` auflösbar, blieb der Freitext-Pfad. | ✅ **GEFIXT** — `clubId: clubId ?? player.clubId` in allen 3 Helpern (aufgelöste Variable durchgereicht). tsc grün. |
| 2 | INFO (out-of-scope) | `availableClubsList` (PlayerPicker:79 / LineupBuilder:165 / useLineupPanelState:105), Synergy-Gruppierung nach `player.club` | Dieselbe Anti-Pattern-Klasse (`getClub(short)`/`getClub(freitext)`) für Filter-Logos + Synergy-Key. | Folge-Smell, separater Slice (Spec §11 Scope-Out korrekt). In active.md/Handoff vermerkt. |

## One-Line
Ja — Senior merged das: Kern-Anti-Pattern (UUID-Logo eigen + aufgelöstes Gegner-Logo) sauber, NULL-sicher, über alle 4 Render-Sites konsistent; Finding #1 war optionale Politur, jetzt mit-gefixt.

## Belege (Reviewer)
- **Alle Render-Sites abgedeckt:** FantasyPlayerRow gerendert in PlayerPicker:255, LineupBuilder:313, LineupPanel:878+1047. Alle bauen Props via `getRowProps` (3 Definitionen) — alle drei setzen `clubId` + `opponentLogoUrl`. Kein vergessener Aufrufer. (Impl deckt 3 Aufrufer ab, Spec nannte 2 — Impl gründlicher, kein Drift. useLineupPanelState wäre der klassische S149b-Blindspot gewesen, nicht vergessen.)
- **NULL-Sicherheit korrekt:** clubId null → Freitext-Fallback (kein Crash); getClub miss → optional-chained graceful; opponentLogoUrl null → `{... && <Image>}` kein broken-img; nextFixture null → `--`-Zweig.
- **Name↔Logo konsistent:** beide aus `clubData` (kein „korrektes Logo + stale Name"-Split).
- **S276:** `getClub(uuid)` liest `clubCache.get(c.id)` (clubs.ts:78) — kollisionsfrei. Kein `getClub(short)` mehr in FantasyPlayerRow (AC-6). „Offener Display-Rest" aus fantasy.md Scoring (Slice 420) geschlossen.
- **business.md:** keine Wording/Compliance-Berührung (reine Daten/Logos), korrekt kein CEO-Scope.
- **Tests:** kein FantasyPlayerRow-Fixture existiert; neue Felder optional → kein S375-Bruch.

## Positive
- Impl übertrifft Spec (3 statt 2 Aufrufer), Name-Konsistenz proaktiv, präzise Knowledge-Kommentare (S276/S368b/Slice 420).
