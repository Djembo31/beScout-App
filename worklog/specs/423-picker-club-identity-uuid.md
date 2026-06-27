# Slice 423 — Picker-Club-Identität durchgängig auf UUID (Filter-Chips + Synergie-Gruppierung)

**Slice-Type:** UI
**Größe:** S
**CEO-Scope:** nein (Display-only Gruppier-Key-Wechsel; `score_event`/Money-Path nachweislich unberührt)
**Datum:** 2026-06-27

## 1. Problem-Statement (Evidence)

Folge-Smell aus Slice 422 (Reviewer-INFO + faktenbasiert vertieft). Nach 422 zeigt die FantasyPlayerRow den Club per **UUID** (Melih Bostan → „Konyaspor", live verifiziert), aber zwei Picker-Surfaces gruppieren noch nach dem stale Freitext `h.club` (`players.club`):

1. **Filter-Chips** (`availableClubsList` in PlayerPicker:76 / LineupBuilder / useLineupPanelState): `Set(holdings.map(h => h.club))` + `getClub(h.club)` für Logo. Für die 6,6 % stale Spieler (DB-belegt Slice 422: 294/4472) entsteht ein **„Sakaryaspor"-Chip mit Sakaryaspor-Logo**, der beim Klick einen Spieler zeigt, dessen Row „Konyaspor" sagt → sichtbare Inkonsistenz, die 422 erst sichtbar machte.
2. **Synergie-Vorschau** (`synergyClubs` + `synergyPct`): gruppiert die Lineup-Auswahl nach `h.club`-String. **`score_event` (Server-Wahrheit, Live-`functiondef` D87) rechnet Synergie über `club_id` (UUID)** (`v_club_ids UUID[]`, `SELECT p.club_id FROM players`, +5 %/Paar, LEAST 15). Die Client-String-Gruppierung **divergiert** für stale Spieler → die Vorschau zeigt Synergie, die der Server nicht vergibt (oder umgekehrt) = **irreführende Vorschau in einem money-nahen Feature**.

## 2. Lösungs-Design

Picker-Club-Identität durchgängig auf **`clubId` (UUID)** ziehen — wie die Row in 422, und wie der Server in `score_event`:
- **Gruppier-Key** überall `h.clubId ?? h.club` (Fallback Freitext nur wenn clubId NULL).
- **Filter-Chips:** nach clubId gruppieren; Label = `getClub(clubId)?.name ?? h.club`, Logo = `getClub(clubId)?.logo`. `clubFilter` hält clubIds. Filter-Anwendung `clubFilter.includes(h.clubId ?? h.club)`.
- **Synergie:** `synergyClubs` = clubIds der selektierten Spieler; `hasSynergy`/`synergyPct`/`synergyOnly` per clubId.
- **PickerSortFilter:** Chip-Typ `{ short, logo }` → `{ id, label, logo }` (Key getrennt vom Label).

**Kein Money-Change:** `score_event` bleibt unberührt — der Server rechnet schon per club_id, der Client gleicht sich nur an. Rein Display.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/features/fantasy/components/lineup/PlayerPicker.tsx` | synergyClubs + availableClubsList + 2 Filter-Anwendungen + synergyPct auf clubId |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | dito |
| `src/components/fantasy/event-tabs/useLineupPanelState.ts` | dito |
| `src/components/fantasy/PickerSortFilter.tsx` | Chip-Typ `{id,label,logo}`, Toggle by id, render label |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `PlayerPicker.tsx:66-82,95-96,150-159` — synergyClubs/availableClubsList/Filter. ✅ gelesen.
2. `PickerSortFilter.tsx:16-22,44-60,130-154` — Chip-Typ + Toggle + Render (`club.short` als Key UND Label). ✅ gelesen.
3. `score_event` Live-functiondef — Synergie per `club_id` (v_club_ids UUID[]). ✅ verifiziert (D87).
4. `UserDpcHolding` (types.ts:116) — `clubId: string | null` vorhanden. ✅.
5. LineupBuilder + useLineupPanelState — identisches synergy/filter-Pattern (grep im BUILD bestätigen).
6. Tests, die PickerSortFilter/availableClubs/clubFilter mocken (grep im BUILD, S375).

## 5. Pattern-References

- **Slice 422** — Row-Club-Identität auf UUID; dies vollendet den Picker (Filter+Synergie) gleich.
- **S368b** (errors-frontend) — Display-Anker aus Source-of-Truth, nicht stale denormalisierte Spalte.
- **D87** — Live-`functiondef` vor Money-Annahme: belegt Server nutzt club_id → Client-Angleich ist Display-only.
- **S149b** — neue/ geänderte Prop-Shape → alle Call-Sites greppen.

## 6. Acceptance Criteria

- **AC-1:** Filter-Chip für einen stale Spieler (Melih Bostan) zeigt „Konyaspor" + Konyaspor-Logo (nicht Sakaryaspor), konsistent zur Row. VERIFY: grep + ggf. Live.
- **AC-2:** Synergie-Vorschau gruppiert nach clubId — zwei Spieler mit gleichem `club_id` (auch bei abweichendem stale String) zeigen Synergie; zwei mit gleichem stale String aber verschiedenem club_id NICHT. VERIFY: Logik-Inspektion + tsc.
- **AC-3 [server-unberührt]:** `score_event` nicht geändert (kein Migration-File). VERIFY: `git diff --stat` zeigt nur die 4 TS-Files.
- **AC-4 [NULL-safe]:** `clubId === null` → Fallback `h.club` (Verhalten wie bisher, kein Crash). VERIFY: tsc + Fallback-Pfad.
- **AC-5 [build]:** tsc 0 + betroffene Tests grün.
- **AC-6 [Regression]:** Nicht-stale Spieler (93,4 %) unverändert (clubId-Auflösung == String-Auflösung). VERIFY: Logik.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `h.clubId === null` | Key-Fallback `h.club` (alter Pfad) |
| stale String, clubId gesetzt | gruppiert nach clubId (korrekt) |
| zwei stale Spieler gleicher String, verschiedene clubId | jetzt getrennte Chips (korrekt; vorher fälschlich gemerged) |
| `getClub(clubId) === null` (Cache cold) | Label-Fallback `h.club`, Logo null (graceful) |
| `clubFilter` alte String-Werte im State | State ist component-lokal (`useState([])`), startet leer → kein Persist-Drift |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
git diff --stat   # erwartet: nur 4 TS-Files, KEIN supabase/migrations
grep -n "synergyClubs\|availableClubs\|clubFilter\|h.club\b\|player.club\b" src/features/fantasy/components/lineup/PlayerPicker.tsx
CI=true npx vitest run src/components/fantasy src/features/fantasy/components/lineup 2>&1 | tail -15
```

## 9. Open-Questions

- **Autonom-Zone (CTO):** Key-Wahl `clubId ?? club`, Chip-Typ-Refactor, Fallback-Reihenfolge. Entschieden.
- **Kein CEO/Money:** `score_event` unberührt (Server rechnet schon club_id) → Client-Angleich ist Display-only, kein Geld-Pfad.
- **Scope-Out (separat geflaggt):** Synergie-**%-Heuristik** Client 4 % vs Server 5 % + Surge-Doppelung + LEAST-Cap — die Vorschau-Magnitude bleibt rough (eigener Slice, falls Anil exakte Vorschau will).

## 10. Proof-Plan

- `git diff --stat` (nur 4 TS-Files, kein Migration) + tsc + vitest-Output + grep (clubId-Gruppierung) → `worklog/proofs/423-picker-uuid.txt`. Server-Beleg: die `score_event`-functiondef-Zeilen (club_id) als Zitat. Live best-effort (Filter-Chip Bostan→Konyaspor, falls offenes Event).

## 11. Scope-Out

- Synergie-%-Genauigkeit (4 % vs 5 %/Surge/Cap) — Vorschau-Magnitude, eigener Slice.
- `score_event` selbst (unberührt — Server korrekt).
- Admin-Gameweek-Engine (CEO-Finding, separat).
- `players.club` String→UUID Daten-Migration (Carry-over E).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: Display-only Key-Wechsel, kein DB/Service) → BUILD → REVIEW (Pflicht, S) → PROVE → LOG.

## 13. Pre-Mortem

- „Synergie-Change berührt Geld" → functiondef belegt Server rechnet client-unabhängig per club_id; Client ist nur Vorschau → kein Geld-Pfad. Migration-File-Check (AC-3) als Gate.
- „PickerSortFilter Typ-Change bricht Tests" → grep Tests im BUILD (S375); Felder mechanisch.
- „clubFilter-State hält alte Strings" → component-lokaler useState, startet leer.
