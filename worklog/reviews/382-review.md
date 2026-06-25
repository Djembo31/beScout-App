# Review — Slice 382 (E-1b: Lineup-Picker-Liga-Vorfilter + Club-Admin-Liga-Picker)

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · **Datum:** 2026-06-25 · **time-spent:** ~22 min

## Verdict: REWORK → ✅ GEHEILT (alle Findings adressiert)

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | **REWORK (CRITICAL)** | `messages/*.json` vs `AdminEventsTab.tsx:50` | **S333 wrong-namespace:** `leagueBindingLabel`/`leagueBindingOpen` lagen im `fantasy`-Namespace, werden aber via `useTranslations('admin')` konsumiert → Runtime `MISSING_MESSAGE: admin.leagueBindingLabel` → Club-Admin-Liga-Select rendert raw key (bricht AC-05+AC-07). node-grep grün, nur Live-Render fängt's. | ✅ **GEHEILT:** beide Keys nach `admin`-Namespace verschoben (DE+TR, bei `maxPerClubHint`), aus `fantasy` entfernt. `pickerLeagueBound` bleibt korrekt in `fantasy` (LineupPanel = `useTranslations('fantasy')`). Verifiziert: `admin.leagueBinding*` present DE+TR, `fantasy.leagueBinding*` weg, tsc 0. |
| 2 | NIT | `events.queries.ts:126` `getAllEventsAdmin` | `league_id` fehlte im Platform-Admin-List-Select (kein Picker-Pfad, kein AC-Bruch; latente Drift). | ✅ **GEHEILT:** `league_id` ergänzt (Symmetrie zu den anderen Selects). |
| 3 | NIT | `LineupPanel.tsx` `boundLeagueClubShorts` | Chip-Filter sammelt `h.club` (short); bei mehrdeutigem Short theoretisch Chip-Doppel. Harmlos — der eigentliche Spieler-Filter nutzt clubId (korrekt). | Akzeptiert (Spieler-Filter ist die Garantie). |

## Reviewer-Kern-Befund (PASS-grade Logik)

**Picker-Filter ≡ RPC-Gate-Parität (KORREKT, der kritische Check):**
- RPC-Gate (380, `rpc_save_lineup`): pro Spieler `players.club_id → clubs.league_id == event.league_id`, fail-closed bei club_id NULL, prüft Starter **UND** Bank.
- Picker (`isInBoundLeague`): `getClub(h.clubId)?.league_id === boundLeagueId`, fail-closed. **Gleiche Quelle bewiesen:** `holdingMapper.clubId = players.club_id` (exakt was die RPC joint), `getClub(uuid).league_id = clubs.league_id`. Keine Divergenz-Achse.
- Bench-Picker abgedeckt: Filter sitzt auf `availablePlayers` NACH der pickerMode-Verzweigung → gilt starter + bench.

**Weitere PASS-Punkte:** Zwei-Achsen-Trennung (`leagueId` Vereins-Liga unverändert, `boundLeagueId` additiv) · clubId-Robustheit (S276 bewusst umgangen) · Read-Query-Drift für Picker korrekt (Picker speist via `/api/events` `select('*')` → league_id dabei; geänderte Selects decken Club-Views) · Club-Admin-Persistenz = derselbe createEvent/EDITABLE_FIELDS-Pfad (380, kein 2. Schreibweg) · Hooks vor early returns, deps korrekt · pre-existing 380-CI-Rot (EDITABLE_FIELDS-Count) mitgezogen.

## One-Line
„Die schwierige Hälfte (Picker≡RPC-Parität, Zwei-Achsen-Trennung, clubId-Robustheit) sitzt sauber" — der einzige Merge-Blocker (S333-Namespace) ist geheilt.

## Knowledge
S333-Verschärfung (Live-Beleg): neue i18n-Keys gehören in den Namespace ihres `useTranslations('X')`-Consumers, nicht „neben verwandte Keys". Bereits in errors-frontend.md S333 erfasst.
