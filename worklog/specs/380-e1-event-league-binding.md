# Slice 380 — E-1: Fußball-Liga an die Event-Aufstellung binden

**Slice-Type:** Migration + Service + UI (cross-domain)
**Größe:** M
**CEO-Scope:** Nein (kein Money-Flow — reine Aufstell-Restriktion). Reviewer-Pflicht (M, Schema + RPC).
**Plan-Anker:** `worklog/notes/event-creator-liga-epic.md` (E-1) · **Kanon:** D104 (Event-Modell) + **D105** (Liga = Fußball-Liga).

---

## 1. Problem-Statement

**Evidence:** D104-Zielbild (Anil 2026-06-25) + Live-Audit:
- `events` hat **keine** `league_id`-Spalte (Live `information_schema`, 2026-06-25). Die Liga eines Events ist heute nur indirekt über `club_id → clubs.league_id` ermittelbar.
- `rpc_save_lineup` (Live `pg_get_functiondef`, D87) prüft **nicht**, dass die aufgestellten Spieler aus der Liga des Events kommen. Es gibt nur `max_per_club` (Obergrenze pro Verein) + eine „Track F"-Liga-Ermittlung, die **ausschließlich** für die Wildcard-Zählung greift (`v_event_league_id` aus `clubs.league_id`).
- Folge: Das D104-Kernziel „BeScout-Liga-Event = an EINE Liga gebunden → Lineup nur aus dieser Liga" ist nicht erzwingbar. Fundament für alles Liga-bezogene (E-2 Wertung pro Liga) fehlt.

**Anil-Entscheid (AskUserQuestion, 2026-06-25):**
1. **Weg B** — eigene `events.league_id`-Spalte (nullable): gesetzt = an diese Liga gebunden (Aufstellung muss passen), **NULL = offen / alle Ligen**. (Zukunftssicher für vereinslose User-/Sponsor-/liga-weite Events in E-4/E-6.)
2. Bestehende 207 Events **bleiben offen** (`league_id` NULL, kein Backfill) → kein bestehendes Verhalten ändert sich, kein Risiko für laufende Events.

---

## 2. Lösungs-Design

**Eine nullable Spalte erledigt beides** — „welche Liga" UND „beschränkt ja/nein":
- `events.league_id uuid NULL REFERENCES public.leagues(id)`.
- `NULL` = offen (alle Ligen erlaubt — heutiges Verhalten, default).
- gesetzt = gebunden → `rpc_save_lineup` erzwingt: jeder aufgestellte Spieler (Starter + Bank) gehört zu einem Verein dieser Liga (`players.club_id → clubs.league_id = events.league_id`).

**3 Bausteine:**
1. **Migration:** Spalte additiv + FK + Index. Kein Backfill.
2. **RPC `rpc_save_lineup`:** additiver Liga-Gate-Block (nur aktiv wenn `v_event.league_id IS NOT NULL`). Body sonst byte-identisch — Money/Wildcard/Salary unberührt.
3. **Admin-Erstell-UI + Plumbing:** Liga-Wähler („Offen / alle Ligen" = NULL-Default) in `EventFormModal`, durchgereicht via `useEventForm` → `createEvent` → INSERT; `DbEvent`-Type + Mapper + `EDITABLE_FIELDS` + Klon (`createNextGameweekEvents`) ziehen `league_id` mit; user-facing Fehlermeldung beim Reject.

**`is_liga_event` bleibt UNANGETASTET** (= BeScout-Saison-Wertungs-Schalter, D105; dessen Entwirrung ist E-2).

---

## 3. Betroffene Files

| File | Änderung | Warum |
|------|----------|-------|
| `supabase/migrations/<ts>_e1_event_league_id.sql` | NEU: `ALTER TABLE events ADD COLUMN league_id uuid NULL REFERENCES leagues(id)` + Index | Spalte (Weg B) |
| `rpc_save_lineup` (Migration, CREATE OR REPLACE) | Liga-Gate-Block (additiv) | Erzwingung |
| `src/types/index.ts` (`DbEvent`) | `league_id: string \| null` | Type-Wahrheit |
| `src/features/fantasy/services/events.mutations.ts` | `createEvent` Param `leagueId`; INSERT; `EDITABLE_FIELDS` (+`league_id` upcoming/registering); Klon-Template select + map | Plumbing |
| `src/features/fantasy/mappers/eventMapper.ts` | `leagueId` in `FantasyEvent` mappen | Reader |
| `src/features/fantasy/types.ts` (`FantasyEvent`) | `leagueId: string \| null` | Reader-Type |
| `src/components/admin/hooks/types.ts` (`EventFormState`, `INITIAL_FORM_STATE`) | `leagueId: string` | Form-State |
| `src/components/admin/hooks/useEventForm.ts` | populate/clone/buildCreatePayload/buildUpdatePayload | Form-Logik |
| `src/components/admin/EventFormModal.tsx` | Liga-`<select>` („Offen/alle Ligen" + aktive Ligen) | UI |
| `messages/de.json` + `messages/tr.json` | Label + Fehlermeldung `player_not_in_event_league` | i18n |
| evtl. explizite Event-`select(...)`-Spaltenlisten | `league_id` ergänzen | SELECT_COLS-Sync (S200-Klasse) |

---

## 4. Code-Reading-Liste (vor Code — Pflicht, ≥6 für M)

1. **Live `pg_get_functiondef('rpc_save_lineup')`** ✅ (gelesen 2026-06-25, D87) — Body-Struktur, wo der Liga-Block sauber einhängt (nach `max_per_club`, vor Insert), Bench-Variablen `v_bench_uids`, `v_all_slots`.
2. **Live `events`-Schema** ✅ — keine `league_id`; `club_id` nullable; alle 207 Events haben club_id; `is_liga_event` existiert.
3. **`clubs`/`leagues`-Schema** ✅ — `clubs.league_id` NOT NULL; `leagues`(id,name,short,country,is_active,logo_url).
4. **`events.mutations.ts`** ✅ — `createEvent` INSERT-Shape, `EDITABLE_FIELDS`, `createNextGameweekEvents`-Klon-select (muss `league_id` aufnehmen, sonst driftet Klon).
5. **`useEventForm.ts`** ✅ — Reducer + `populateFromEvent`/`cloneFromEvent`/`buildCreatePayload`/`buildUpdatePayload` (alle 4 müssen `leagueId` führen).
6. **VOR BUILD lesen:** `src/components/admin/EventFormModal.tsx` (wo das `<select>` zwischen welche Felder), `src/components/admin/hooks/types.ts` (`EventFormState` + `INITIAL_FORM_STATE`), `eventMapper.ts` (Map-Stelle), `src/types/index.ts` `DbEvent` (+ ob es eine Event-`SELECT_COLS`-Konstante gibt), Liga-Liste-Service (`src/lib/leagues.ts` / `getLeagues`) für den Picker.
7. **VOR BUILD lesen:** wie der Lineup-Save den RPC-Error an die UI bringt (`lineups.mutations.ts` + `useLineupSave.ts`) → Fehlermeldungs-Mapping `player_not_in_event_league`.

---

## 5. Pattern-References

- **D104 / D105** — Event-Modell + „Liga = Fußball"; `league_id` ist die Fußball-Liga, nicht `is_liga_event`.
- **errors-frontend.md „Multi-League Props-Propagation" (J3+J4)** — neues optional Field → ALLE Render/Map/Call-Sites greppen (optional = kein TSC-Fehler).
- **errors-frontend.md „PLAYER_SELECT_COLS Sync" (S200)** — neue Spalte → Type + Mapper + jede explizite `select()`-Spaltenliste + Klon-select, sonst kommt `league_id` nie zurück.
- **errors-db.md RLS/Grant** — `rpc_save_lineup` ist `SECURITY DEFINER`; CREATE OR REPLACE erhält ACL → post-Apply `proacl`-Verify, Body sonst byte-identisch.
- **D87** — Live-functiondef war Baseline (kein Migrations-File als Wahrheit).

---

## 6. Acceptance Criteria (executable)

- **AC1 [Schema]:** `SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='events' AND column_name='league_id'` → 1 Row, `YES`. FK auf `leagues(id)` existiert.
- **AC2 [Bestand offen]:** `SELECT count(*) FROM events WHERE league_id IS NOT NULL` → **0** (kein Backfill, alle bestehenden offen).
- **AC3 [RPC offen=heute]:** Event mit `league_id=NULL` → `rpc_save_lineup` mit gemischt-ligen Lineup → `ok:true` (unverändertes Verhalten).
- **AC4 [RPC gebunden, valide]:** Event `league_id=<Liga X>`, alle Starter+Bank aus Liga X → `ok:true`.
- **AC5 [RPC gebunden, Verstoß]:** Event `league_id=<Liga X>`, ein Starter aus Liga Y → `ok:false, error:'player_not_in_event_league'` (+ `player_id`). Lineup NICHT gespeichert (kein `lineups`-Row, keine `holding_locks`).
- **AC6 [Bank-Verstoß]:** Bank-Spieler aus Liga Y bei gebundenem Event → `ok:false, error:'player_not_in_event_league'`.
- **AC7 [club_id NULL Spieler]:** gebundenes Event, Spieler ohne `club_id` aufgestellt → `ok:false, error:'player_not_in_event_league'` (fail-closed, keine Liga ⇒ nicht verifizierbar).
- **AC8 [Money byte-identisch]:** Wildcard-/Salary-/max_per_club-/Holdings-Pfade unverändert (Diff zeigt nur additiven Liga-Block); `proacl` von `rpc_save_lineup` unverändert.
- **AC9 [Create-UI]:** Admin-Erstellen mit Liga-Wähler → Event mit `league_id` gesetzt; „Offen / alle Ligen" → `league_id=NULL`. Klon eines gebundenen Events übernimmt `league_id`.
- **AC10 [tsc]:** `pnpm exec tsc --noEmit` grün. `CI=true pnpm exec vitest run` (events/lineups) grün.

---

## 7. Edge Cases

| # | Fall | Verhalten |
|---|------|-----------|
| 1 | `league_id=NULL` (offen) | Keine Liga-Prüfung (heutiges Verhalten). |
| 2 | Starter aus falscher Liga | Reject `player_not_in_event_league`. |
| 3 | Bank aus falscher Liga | Reject (Bank zählt, weil Auto-Sub). |
| 4 | Spieler `club_id IS NULL` | Reject (fail-closed). |
| 5 | Wildcard-Slot-Spieler falsche Liga | Reject (Liga-Gate gilt für alle 12 Starter, unabhängig vom Wildcard-/Besitz-Status). |
| 6 | Leere Slots (Formation < 12) | Nur gefüllte Slots prüfen (NULL-Slot überspringen). |
| 7 | Liga gelöscht/inaktiv nach Event-Erstellung | FK verhindert Löschen; inaktive Liga = Anzeige-Sache, Bindung bleibt gültig. |
| 8 | Bestehendes laufendes Event | `league_id=NULL` → unverändert (AC2). |
| 9 | Event ohne club_id + league_id gesetzt | Erlaubt (Weg B entkoppelt) — Liga-Prüfung greift normal. |
| 10 | Edit eines Events: league_id ändern | Nur in `upcoming`/`registering` (EDITABLE_FIELDS); danach gesperrt (Lineups schon gebaut). |

---

## 8. Self-Verification Commands

```bash
# Schema (AC1/AC2)
# SELECT column_name,is_nullable,(SELECT confrelid::regclass FROM pg_constraint WHERE conrelid='events'::regclass AND conname LIKE '%league_id%') FROM information_schema.columns WHERE table_name='events' AND column_name='league_id';
# SELECT count(*) FROM events WHERE league_id IS NOT NULL;   -- erwartet 0

# RPC-Smoke (AC3-AC8): BEGIN; set_config jwt sub; rpc_save_lineup(...); ROLLBACK je Fall.
# Body-Diff: pg_get_functiondef vor/nach — nur additiver Liga-Block + v_event_league_id-Reuse.
# proacl unverändert:
# SELECT proacl FROM pg_proc WHERE proname='rpc_save_lineup';

# Plumbing (S200-Sync): jede explizite events-select-Liste greppen
grep -rn "from('events')" src/ | grep "select(" | grep -v "league_id"   # Treffer prüfen
# Multi-League-Propagation (J3): leagueId an allen Map/Call-Sites
grep -rn "leagueId" src/features/fantasy/ src/components/admin/

pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy src/lib/services/__tests__/lineup
```

---

## 9. Open-Questions

**Geklärt (Anil, AskUserQuestion 2026-06-25):**
- Weg B (eigene `league_id`) ✅ · Bestand bleibt offen (kein Backfill) ✅.

**Autonom-Zone (CTO):**
- Liga-Gate-Block-Platzierung im RPC (nach `max_per_club`, vor Insert), Error-Code-Name `player_not_in_event_league`.
- Bank wird mitgeprüft (Auto-Sub-Konsistenz).
- Picker des Liga-`<select>`: aktive Ligen via bestehenden Liga-Service, „Offen / alle Ligen" als erste Option (NULL).

**Scope-Out (eigener Folge-Slice E-1b):**
- **Lineup-Builder-Picker-Vorfilter** auf die Event-Liga (User sieht nur erlaubte Spieler). E-1 liefert Integrität (RPC-Reject) + klare Fehlermeldung; der UX-Vorfilter im Aufstell-Picker ist ein eigenes Subsystem (lineupStore/useLineupBuilder) → separater kleiner Slice. **Wird im LOG als bewusster Scope-Out + Folge-Slice notiert** (kein Silent-Cap).

---

## 10. Proof-Plan

- `worklog/proofs/380-league-binding.txt` — Live BEGIN…ROLLBACK Smoke (AC1-AC8) inkl. Schema-Query, 3 RPC-Fälle (offen/valide/Verstoß + Bank + club_id-NULL), Body-Diff-Beleg, `proacl`.
- `worklog/proofs/380-create-ui.png` — Admin-Erstell-Formular mit Liga-Wähler (DE), Event danach mit `league_id` (Playwright/bescout.net nach Deploy ODER lokal falls Admin-UI-State).
- tsc + vitest Output.

---

## 11. Scope-Out

- **E-2** (Wertung pro Liga / `is_liga_event`→„BeScout-Saison"-Umzug) — separater Slice.
- **Lineup-Picker-Vorfilter** (E-1b, s. §9).
- Kein Money-Flow, keine Fee-Änderung, kein `is_liga_event`-Touch.
- Keine Migration bestehender Events (bewusst offen).

---

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (inline §3+§4, grep-Consumer) → BUILD (Migration → RPC → Type/Service/Mapper → UI → i18n) → REVIEW (Reviewer-Agent, M + Schema/RPC) → PROVE (RPC-Smoke + UI-Screenshot) → LOG (+ Tracker-Reconcile E5-Roadmap E-1 abhaken, MASTERPLAN/TODO).

---

## 13. Pre-Mortem (optional bei M — 5 Szenarien)

1. **`league_id` kommt nie im Reader an** → vergessene `select()`-Spaltenliste/Mapper (S200-Klasse). Mitigation: §8-grep + AC9.
2. **Bestehende Events brechen** → versehentlicher Backfill. Mitigation: AC2 = 0, Migration ohne UPDATE.
3. **RPC-Body-Drift** → CREATE OR REPLACE auf veralteter Basis statt Live. Mitigation: D87 Live-functiondef als Baseline, Body-Diff in Proof.
4. **Grant-Verlust** → `proacl`-Check (AC8).
5. **Multi-League-Propagation übersehen** → optional Field, kein TSC-Fehler (J3). Mitigation: §8-grep aller `leagueId`-Call-Sites + Reviewer.
