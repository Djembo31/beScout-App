# Slice 382 — E-1b: Lineup-Picker-Liga-Vorfilter + Club-Admin-Liga-Picker

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI + i18n (Frontend, KEIN Money) · **Scope:** CTO (1 Produkt-Frage an Anil) · **Datum:** 2026-06-25

> Epic E5 / D104. Direkter Frontend-Zwilling zu E-1 (Slice 380): E-1 erzwingt die Liga-Bindung serverseitig in `rpc_save_lineup`; E-1b macht sie **im Picker sichtbar**, damit der User verbotene Spieler gar nicht erst wählt + gibt Club-Admins den Liga-Auswahl-Select (E-1 hatte ihn nur im Platform-Admin).

---

## 1. Problem Statement

Zwei Lücken aus E-1 (Slice 380, Scope-Out → E-1b):

1. **Picker zeigt verbotene Spieler:** Bei einem liga-gebundenen Event (`events.league_id` gesetzt) erzwingt `rpc_save_lineup`, dass alle Aufstellungs-Spieler aus der Event-Liga kommen — aber **erst beim Speichern** (`player_not_in_event_league`). Der Lineup-Builder-Picker zeigt weiterhin ALLE eigenen Spieler. Folge: User stellt Spieler auf, klickt Speichern, bekommt erst dann einen Fehler — schlechte UX, besonders Mobile.

2. **Club-Admins haben keinen Liga-Picker:** E-1 hängte den Liga-Auswahl-Select nur in den **Platform-Admin**-Caller (`AdminEventsManagementTab`). Der **Club-Admin**-Caller (`AdminEventsTab`) zeigt ihn nicht → Club-Admins können ihre Events nicht an eine Liga binden.

**Evidence:** Slice 380 Review + `worklog/notes/event-creator-liga-epic.md` E-1 Scope-Out. Betrifft: jeden Teilnehmer eines liga-gebundenen Events (Picker) + jeden Club-Admin (Erstellung).

## 2. Lösungs-Design (Architektur)

**Teil A — Picker-Vorfilter (user-facing Kern):**
- **Plumbing:** Neues Feld `FantasyEvent.boundLeagueId` (= `events.league_id`, die E-1-Bindung), gemappt in `eventMapper.ts` aus `db.league_id`. **Bewusst NICHT das bestehende `leagueId`** (das mappt die **Vereins**-Liga `clubLookup.league_id` für GameweekStatusBar, Slice 261 — andere Achse, darf nicht verschmelzen).
- **Filter:** In `LineupPanel.tsx` (Picker-Liste, ~Z.903-919) zusätzlicher Filter: bei `event.boundLeagueId` gesetzt → `availablePlayers` auf Holdings reduzieren, deren Verein in der Liga ist (`getClub(h.club)?.league_id === event.boundLeagueId`). **Fail-closed** (unbekannter Verein → raus, spiegelt RPC-Gate). Club-Chip-Liste (`availableClubsList`) analog auf Liga-Vereine reduzieren (sonst Chip → leere Liste).
- **Transparenz:** Picker-Header-Hinweis „Nur {Liga}-Spieler — Event ist an die Liga gebunden" wenn gefiltert, damit der User versteht, warum andere eigene Spieler fehlen.

**Teil B — Club-Admin-Liga-Picker:**
- `EventFormModal` zeigt den Liga-Select bereits (`{L.league && …}`, Z.150), gated über das übergebene Label `L.league` + Optionen. E-1 setzte beides nur im Platform-Admin-Caller. → Im Club-Admin-Caller (`AdminEventsTab`) das `league`/`leagueOpen`-Label + die Liga-Optionen ebenfalls übergeben.
- **Umfang der Optionen = Anil-Produkt-Frage (§9):** (1) nur eigene Club-Liga + „Offen", oder (2) alle Ligen + „Offen".

**Kein Schema/RPC/Money-Change.** `events.league_id` + `rpc_save_lineup`-Gate existieren seit 380; Persistenz/EDITABLE_FIELDS/Klon für `league_id` ebenfalls (380). Reine Frontend-Sichtbarkeit.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/fantasy/types.ts` | EDIT | `FantasyEvent.boundLeagueId?: string \| null` (neu, ≠ `leagueId`) |
| `src/features/fantasy/mappers/eventMapper.ts` | EDIT | `boundLeagueId: db.league_id ?? null` |
| `src/components/fantasy/event-tabs/LineupPanel.tsx` | EDIT | Liga-Vorfilter auf `availablePlayers` + Club-Chips + Picker-Hinweis |
| `src/components/admin/AdminEventsTab.tsx` | EDIT | Club-Admin-Caller: `league`/`leagueOpen`-Label + Liga-Optionen an EventFormModal |
| `messages/de.json` + `messages/tr.json` | EDIT | Picker-Hinweis-Key (+ ggf. Club-Admin-Labels wenn nicht vorhanden) |

**Greps vor Slice:** `grep -rn "boundLeagueId\|leagueId" src/features/fantasy/` (Kollision vermeiden) · `grep -rn "getClub(" src/components/fantasy/event-tabs/` (Signatur short vs id) · `grep -rn "L.league\|leagueOptions\|EventFormModal" src/components/admin/AdminEventsTab.tsx src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` (Platform-Vorbild für Club-Caller).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/features/fantasy/mappers/eventMapper.ts` (Z.71-81) | `leagueId` = Vereins-Liga, NICHT Event-Bindung | `db.league_id` verfügbar (DbEvent seit 380)? `boundLeagueId` additiv |
| `src/components/fantasy/event-tabs/LineupPanel.tsx` (Z.880-925) | Filter-Insertion-Punkt | exakte Stelle nach search/club/available/synergy; `availablePlayers`-Shape (UserDpcHolding: `club` short, `clubId`) |
| `src/components/fantasy/event-tabs/useLineupPanelState.ts` (Z.102-108) | `availableClubsList` via `getClub(short)` | getClub akzeptiert short → `.league_id` vorhanden |
| `src/lib/clubs.ts` (`getClub`) | Signatur + Return | nimmt short UND/ODER id? liefert `league_id`? fail bei legacy-Club |
| `src/components/admin/EventFormModal.tsx` (Z.150-165, 25-49) | Liga-Select-Gating via `L.league` | wie Label + Optionen reinkommen; `isFieldDisabled('league_id')` |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Platform-Vorbild (E-1) | wie `league`-Label + Liga-Optionen + `leagueId` gesetzt werden (kopieren in Club-Caller) |
| `src/components/admin/AdminEventsTab.tsx` | Club-Admin-Caller (Ziel) | Club-Kontext (eigene Liga?), wie EventFormModal aufgerufen, welche Labels heute |
| `worklog/specs/380-e1-event-league-binding.md` | Vorbild-Spec + EDITABLE_FIELDS/Klon | sicherstellen Club-Pfad nutzt dieselbe Persistenz (kein 2. Pfad) |
| `.claude/rules/errors-frontend.md` „Multi-League Props-Propagation" (J3+J4) | bekannte Falle | neues optional Field → alle Call-Sites greppen (kein TSC-Error) |
| `.claude/rules/errors-frontend.md` „Filter-as-audience vs result-filter" (S254) | bekannte Falle | Liga-Filter ist result-filter auf eigene Holdings, nicht Audience-Switch |

## 5. Pattern-References

- **Slice 380 (E-1)** — der RPC-Gate, den dieser Picker spiegelt; fail-closed bei unbekanntem Verein = gleiche Semantik.
- `errors-frontend.md` **Multi-League Props-Propagation (J3+J4)** — neues optional `boundLeagueId` → alle Render-Call-Sites greppen (optional = kein TSC-Fehler, Pilot-QA übersieht's).
- `errors-frontend.md` **S254 Liga/Context-Switch** — `getClub` Lookup-Map; nicht aus Result-Set ableiten.
- `errors-frontend.md` **S276 Lookup-Map ambiguous Key** — Club-Short ist nicht eindeutig über Ligen (Wolfsburg↔Wolves); bei `getClub(short)` Disambig beachten → wenn riskant, über `clubId` filtern.
- `database.md` — `clubs.league_id` = kanonische Liga (RPC-Gate nutzt es).
- `business.md` — „Liga" = Fußball-Liga (D105); Picker-Hinweis user-facing neutral.

## 6. Acceptance Criteria

```
AC-01: [HAPPY-Filter] Liga-gebundenes Event → Picker zeigt nur Spieler der Event-Liga.
  VERIFY: bescout.net liga-gebundenes Event öffnen, Picker öffnen
  EXPECTED: nur Holdings mit club.league_id == event.boundLeagueId; andere ausgeblendet
  FAIL IF: ligafremde eigene Spieler erscheinen

AC-02: [HAPPY-Offen] Offenes Event (boundLeagueId null) → Picker zeigt ALLE eigenen Spieler.
  VERIFY: Event ohne league_id, Picker öffnen
  EXPECTED: kein Liga-Filter, alle Holdings wie bisher
  FAIL IF: fälschlich gefiltert

AC-03: [TRANSPARENZ] Bei aktivem Filter zeigt der Picker einen Liga-Hinweis.
  VERIFY: liga-gebundenes Event, Picker
  EXPECTED: "Nur {Liga}-Spieler"-Hinweis (DE+TR), kein raw key
  FAIL IF: kein Hinweis / Leerzustand ohne Erklärung

AC-04: [REGRESSION-Save] Picker-Auswahl + Speichern → kein player_not_in_event_league mehr (weil nur erlaubte wählbar).
  VERIFY: liga-gebundenes Event, Lineup aus Picker, Speichern
  EXPECTED: rpc_save_lineup success (Picker-Vorfilter deckt RPC-Gate)
  FAIL IF: Picker erlaubt, aber RPC rejected (Filter ≠ Gate-Logik)

AC-05: [CLUB-ADMIN] Club-Admin-Eventformular zeigt Liga-Select.
  VERIFY: /club/<slug>/admin Event erstellen
  EXPECTED: Liga-Select sichtbar (Optionen je Anil-Entscheid §9) + "Offen / alle Ligen"
  FAIL IF: Select fehlt / disabled ohne Grund

AC-06: [CLUB-ADMIN-PERSIST] Club-Admin bindet Liga → events.league_id gespeichert.
  VERIFY: Event mit Liga erstellen, DB prüfen
  EXPECTED: events.league_id = gewählte Liga (selber Persistenz-Pfad wie Platform, 380)
  FAIL IF: league_id NULL trotz Auswahl / 2. Schreibpfad

AC-07: [I18N-DE/TR] neue Strings DE+TR, namespace-korrekt, 0 MISSING_MESSAGE.
  VERIFY: node-check + Live-Console-Scan (S333)
  EXPECTED: Picker-Hinweis DE+TR; kein Fallback
  FAIL IF: raw key / DE in TR

AC-08: [MOBILE] Picker mit Hinweis auf 393px ohne Overflow.
  VERIFY: Playwright @393px
  EXPECTED: Hinweis + Liste ok, kein horizontaler Overflow
  FAIL IF: Overflow / abgeschnitten
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Filter | boundLeagueId null | offenes Event | kein Filter | `if (event.boundLeagueId)` Guard |
| 2 | Filter | Holding mit unbekanntem Verein | getClub→null | ausgeblendet (fail-closed) | `getClub(c)?.league_id === id` (null≠id) |
| 3 | Filter | Club-Short mehrdeutig über Ligen | Wolfsburg↔Wolves | korrekte Liga via clubId statt short falls nötig | S276; Code-Reading getClub-Signatur |
| 4 | Filter | User hat 0 Spieler der Liga | leere Liste | Picker-Empty + Liga-Hinweis | bestehender Empty-State + Hinweis |
| 5 | Club-Chips | Chip außerhalb Liga | gefilterte Chips | nur Liga-Vereine als Chips | availableClubsList mit-filtern |
| 6 | Club-Admin | Edit bestehendes Event | league_id schon gesetzt | Select zeigt aktuellen Wert | EDITABLE_FIELDS league_id (380) |
| 7 | Bench-Picker | bench-Modus + Liga-Event | bench-Spieler | gleicher Liga-Filter (Bank ⊆ Liga, RPC prüft Bank auch) | Filter auf availablePlayers gilt für beide Modi |
| 8 | Prop-Propagation | boundLeagueId nicht an LineupPanel durchgereicht | optional field | grep alle FantasyEvent-Consumer | J3+J4-Falle |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
grep -rn "boundLeagueId" src/   # Plumbing vollständig: type + mapper + LineupPanel
grep -rn "getClub" src/components/fantasy/event-tabs/   # Filter nutzt richtige Signatur
# Negativ: leagueId (Vereins-Liga) NICHT verändert
grep -n "leagueId:" src/features/fantasy/mappers/eventMapper.ts
```
```sql
-- Club-Admin-Persist (nach AC-06):
SELECT id, name, league_id, club_id FROM events WHERE name ILIKE '%<club-admin-test-event>%';
```
Playwright (post-Deploy): liga-gebundenes Event Picker (gefiltert + Hinweis) + offenes Event (ungefiltert) + Club-Admin-Formular Liga-Select, DE+TR, 393px.

## 9. Open-Questions

**Pflicht-Klärung (Anil/CEO — Produkt):**
1. **Club-Admin-Liga-Picker-Umfang:** (a) nur **eigene Club-Liga + „Offen"** (ein Club bindet sein Event an seine eigene Fußball-Liga oder lässt offen — schlank, weniger Fehlbindung) ODER (b) **alle Ligen + „Offen"** (volle Symmetrie zum Platform-Admin, Club kann liga-fremd binden — RPC erzwingt's eh). → AskUserQuestion.

**Autonom-Zone (CTO):**
- `boundLeagueId`-Naming + Mapper-Detail.
- Filter-Implementierung (getClub via short vs clubId — je Code-Reading-Befund S276).
- Picker-Hinweis-Wording (DE) + Platzierung im Picker-Header.
- Club-Chip-Filter-Detail.

**Nicht-Autonom:** keine Money/RLS/Schema-Änderung (reine Sichtbarkeit; `events.league_id`-Persistenz existiert).

## 10. Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/382-picker-filter.txt` | tsc clean + grep-Plumbing + (post-Deploy) AC-06 DB-Select (Club-Admin league_id persistiert) |
| `worklog/proofs/382-picker-de.png` | Playwright: liga-gebundenes Event Picker gefiltert + Liga-Hinweis (393px) |
| `worklog/proofs/382-picker-open.png` | offenes Event Picker ungefiltert (Kontrast) |
| `worklog/proofs/382-clubadmin-league.png` | Club-Admin-Formular mit Liga-Select |

## 11. Scope-Out

- **Pro-Liga-Payout** → E-2b (Money/CEO).
- **„min. X Spieler vom Verein" / Follower / Fan-Rang-Gate** → E-3.
- **Vereinslose Events (Track-F-Wildcard `COALESCE(events.league_id, club→league)`)** → E-4-Vormerkung (380-Review); heute kein clubloses Event.
- **Server-Re-Validierung** = bereits da (rpc_save_lineup, 380) — hier NICHT angefasst.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (inline §3+§4, Frontend-only) → BUILD (Plumbing → Filter → Club-Caller → i18n) → REVIEW (reviewer-Agent — Picker≡RPC-Gate-Parität ist der Kern-Check) → PROVE (tsc + Playwright + DB-Select) → LOG
```
REVIEW = reviewer-Agent: der Picker-Filter MUSS exakt die RPC-Gate-Logik spiegeln (sonst Picker erlaubt, was RPC ablehnt = AC-04-Bug).

## 13. Pre-Mortem (5 Szenarien)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Picker-Filter ≠ RPC-Gate (z.B. short-Map-Mismatch) → Picker erlaubt, Save rejected | MED | mittel | gleiche club→league_id-Quelle wie RPC; AC-04 Live-Save-Test | Save-Fehler trotz Picker-Wahl |
| 2 | `boundLeagueId` mit `leagueId` (Vereins-Liga) verwechselt → GameweekStatusBar bricht | MED | mittel | striktes neues Feld, Negativ-grep `leagueId:` unverändert | GameweekStatusBar-Render |
| 3 | Club-Short mehrdeutig (Wolfsburg↔Wolves) → falsche Liga-Filterung | LOW | mittel | clubId-basiert filtern falls getClub(short) mehrdeutig (S276) | Multi-Liga-Test-Account |
| 4 | boundLeagueId nicht an LineupPanel durchgereicht → Filter wirkt nie | MED | hoch | grep FantasyEvent-Consumer (J3+J4); AC-01 Live | Picker zeigt alle |
| 5 | Club-Admin 2. Schreibpfad für league_id → Drift zu Platform | LOW | mittel | selber EventForm/useEventForm-Pfad (380), kein neuer Persist | AC-06 DB-Select |

---

## TR-Wording-Vorab

| Key | DE | TR | Konformität |
|-----|----|----|-------------|
| `fantasy.pickerLeagueBound` | „Nur {league}-Spieler — Event ist an die Liga gebunden" | „Sadece {league} oyuncuları — etkinlik lige bağlı" | ✓ neutral |

## Open Risiko

Kern-Risiko = **Picker-Filter weicht von der RPC-Gate-Logik ab** (AC-04): muss dieselbe `club→league_id`-Quelle nutzen, sonst „Picker erlaubt, Save lehnt ab". Zweitrisiko = `boundLeagueId`/`leagueId`-Verwechslung (zwei Liga-Achsen). Beide durch Code-Reading (Mapper + getClub) + Live-Save-Test abgedeckt. Kein Money/Schema-Risiko.
