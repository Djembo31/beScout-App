# Slice 285 Review — FM-06 Rankings-Liga-Header verschieben

**Typ:** Self-Review (Primary-Claude) — zulässig: XS Layout-Move, kein Logic-Change, tsc grün.
**Verdict:** PASS
**Datum:** 2026-06-13

## Was geprüft

| Check | Ergebnis |
|-------|----------|
| Diff-Scope = nur Layout (JSX-Reorder) | ✅ — `LeagueScopeHeader` von Page-Top in rechte Grid-Spalte über `PlayerRankings` verschoben, in `space-y-3`-Container |
| Props unverändert durchgereicht | ✅ — `filterCountry`/`filterLeague` an PlayerRankings, `leagueBarSize="md" nonSticky` am Header identisch |
| `LeagueScopeHeader` exakt 1 Import + 1 Verwendung | ✅ — kein Doppel-Render (grep) |
| Logic/State/Store berührt | ❌ keine — `useLeagueScope`-Selektoren (Z.22-23) unverändert, globaler SSOT intakt |
| tsc | ✅ `pnpm exec tsc --noEmit` grün |
| Cross-Page-Regression (/clubs, /fantasy) | ✅ nicht berührt — Header dort weiter Top (by design, ganze Seite gescoped) |

## common-errors.md Abgleich

- **Multi-Slot-Suppression (Slice 278):** N/A — kein Multi-Slot, keine doppelte Daten-Quelle.
- **i18n-Key-Leak:** N/A — keine neuen Strings (Header/Card bringen eigene i18n mit).
- **Cross-Section-Coupling:** geprüft — Header wirkt jetzt physisch dort wo er filtert; kein zweiter Konsument der den Filter ignoriert + gleichzeitig „darunter" steht.

## Findings

Keine. Reiner Layout-Move, kein Verhalten geändert außer visueller Platzierung (= Slice-Ziel).

## Offen für PROVE

- AC-2 visuell: Screenshot bescout.net `/rankings` mobil (393px) + desktop post-Deploy.
