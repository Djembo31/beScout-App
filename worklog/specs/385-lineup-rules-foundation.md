# Slice 385 — E-3 Aufstellungs-Regel-Fundament (JSONB `lineup_rules` + generischer Validator + Pilot-Regel `min_per_own_club`)

**Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n
**Größe:** M
**Scope:** Money-nah / §3 — `rpc_save_lineup` bewegt am Ende Wildcards (`spend_wildcards`/`earn_wildcards`). Neue Regel-Prüfung läuft VOR jeder Bewegung (fail-closed). Selbst gebaut, Reviewer-Pflicht.
**CEO-Entscheid:** Anil 2026-06-25 — E-3a „min. X vom Verein" = **FESTE ZAHL** (deckt sich mit `max_per_club`, rundungsfrei). Architektur **D107** (Weg B, JSONB-Regel-Liste).

---

## 1. Problem-Statement (Evidence)

Heute entscheidet beim Event-Lineup im Wesentlichen, **wer die teuersten/stärksten Karten hat** — kein Skill. Das Zielbild (Epic `event-creator-liga-epic.md` §3b, D107) macht daraus ein Skill-Spiel: ein Event soll beliebig zugeschnitten werden („min. 5 Gala-Spieler", „nur U21", „nur Süper Lig + nur Stürmer"). Topf 1 (Eintritts-Türsteher: *wer darf rein*) ist seit Slice 384 fertig. **Dieser Slice baut das Fundament für Topf 2 (Aufstellungs-Regeln: *welche Karten dürfen ins Lineup*).**

**Architektur-Entscheid D107 (Anil-approved, Weg B):** Statt eine DB-Spalte pro Regel (driftet, Schema-Change jedes Mal) → **EINE** JSONB-Spalte `events.lineup_rules` (Liste typisierter Bedingungen) + **EIN** generischer Validator-Block in `rpc_save_lineup`. Neue Regel-Art künftig = nur neuer `CASE`-Zweig + eine Builder-Zeile, **kein** Schema-Change.

**Evidence:**
- Epic `worklog/notes/event-creator-liga-epic.md` §3b (Zwei-Töpfe-Tabelle) + §5 „E-3-Regel-Liste-Fundament" + §6 (E-3a-Entscheid).
- `memory/decisions.md` **D107** (Zwei-Töpfe + Regel-Liste).
- CEO-Entscheid (AskUserQuestion 2026-06-25): feste Zahl statt Prozent.

## 2. Lösungs-Design

**Schema (additiv):** `ALTER TABLE events ADD COLUMN lineup_rules jsonb` (nullable, Default `NULL`; leer = keine Regel). Form: Liste von `{"type": <whitelisted>, "value": <int>}`.

**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline):** Neuer **generischer Validator-Block** nach der E-1-Liga-Bindung (beide gehören zu „welche Spieler erlaubt"), VOR Salary-Cap + VOR INSERT/UPDATE + VOR Wildcard-Bewegung. Der Block:
- iteriert `jsonb_array_elements(v_event.lineup_rules)`,
- **fail-closed bei unbekanntem `type`** → `unknown_lineup_rule`,
- **Wert-Bounds** (int 1..11) → `invalid_lineup_rule_value`,
- **Pilot-Regel `min_per_own_club`:** zählt Starter (`v_all_slots`, 12 Slots — konsistent mit `max_per_club`, das ebenfalls nur Starter zählt) mit `players.club_id = v_event.club_id`; ist die Zahl < Regel-Wert → `min_per_own_club_not_met`. Club-loses Event (`club_id IS NULL`) → Count = 0 → natürlich fail-closed (jede `min>0`-Regel scheitert; dokumentiert, heute kein Treffer da alle Events `club_id` haben).

**Read-Pfad (S200 — sonst kommt Spalte nie zurück):** `lineup_rules` in alle 3 `events.queries.ts`-Selects + `DbEvent`-Type + `eventMapper` + `FantasyEvent`-Type.

**Write-Pfad (Pilot-UI minimal, Builder-Vollausbau = E-4/E-6):** Admin-Form hält ein flaches Zahlenfeld `minPerOwnClub` (Mirror `maxPerClub`); `buildCreatePayload`/`buildUpdatePayload` **serialisieren** es in die `lineup_rules`-JSONB-Liste (`[{type:'min_per_own_club', value:N}]` bzw. `null`). `createEvent`-Insert + `EDITABLE_FIELDS` + Klon-Template ziehen `lineup_rules` mit. Fehler→Toast in `useEventActions.ts` + i18n DE/TR.

## 3. Betroffene Files

| File | Änderung | Warum |
|------|----------|-------|
| `supabase/migrations/2026XXXX_e3_lineup_rules.sql` | `ADD COLUMN lineup_rules jsonb` + `rpc_save_lineup` CREATE OR REPLACE (generischer Validator + `min_per_own_club`) | Fundament + Pilot-Regel |
| `src/features/fantasy/services/events.queries.ts` | `lineup_rules` in 3 Selects (Z.25/38/126) | S200: sonst nie zurück |
| `src/types/index.ts` (`DbEvent`) | `lineup_rules?: ... \| null` | Type-Wahrheit |
| `src/features/fantasy/mappers/eventMapper.ts` | `lineupRules: db.lineup_rules ?? null` | DB→Domain |
| `src/features/fantasy/types.ts` (`FantasyEvent`) | `lineupRules?: LineupRule[] \| null` | Domain-Type |
| `src/features/fantasy/services/events.mutations.ts` | `createEvent`-Param + Insert · `EDITABLE_FIELDS` (upcoming+registering) · Klon-Template-Select + Map | Write + Editier-Guard + Klon |
| `src/components/admin/hooks/useEventForm.ts` | `EventFormState.minPerOwnClub` · `populateFromEvent` · `buildCreatePayload`/`buildUpdatePayload` (Serialisierung) | Form↔Payload |
| `src/components/admin/hooks/types.ts` | `EventFormState`-Feld + `INITIAL_FORM_STATE` | Form-State |
| `src/components/admin/EventFormModal.tsx` | Zahlen-Input „min. Spieler vom eigenen Verein" (neben max-per-club) | UI-Eingabe |
| `src/features/fantasy/hooks/useEventActions.ts` | Error-Cases `min_per_own_club_not_met`/`unknown_lineup_rule`/`invalid_lineup_rule_value` → `addToast(t(...))` | Fehler-UX |
| `messages/de.json` + `messages/tr.json` | Toast-Keys (DE+TR) | i18n |
| Tests: `useEventForm.test.ts` (EDITABLE_FIELDS-Count!) + ggf. events-Mutation-Test | Count-Assertion + Serialisierung | 380/382-CI-Rot-Klasse vermeiden |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **LIVE `pg_get_functiondef('public.rpc_save_lineup(...)')`** — ✅ gelesen (22-arg-Signatur). Validierungs-Reihenfolge: formation→slot-counts→captain→wildcard-slots→dup→`max_per_club`→bench→holdings→**E-1 Liga-Bindung**→insufficient_sc→wildcard-limit→salary_cap→INSERT/UPDATE→holding_locks→**Wildcard spend/earn am Ende**. Validator-Block kommt nach E-1-Liga-Bindung. `v_all_slots` = 12 Starter-Slots. `max_per_club` nutzt `unnest(v_all_slots)` JOIN players (Starter only). **Baseline = dieser Live-Body, NICHT Migrations-Datei** (D87/PATCH-AUDIT).
2. `src/features/fantasy/services/events.queries.ts` — ✅ 3 Selects (Z.25/38/126), identische Spaltenliste; `lineup_rules` an alle 3.
3. `src/features/fantasy/services/events.mutations.ts` — ✅ `createEvent` `.insert()` (Z.52-83, Mirror `max_per_club`/`requires_follow`), `EDITABLE_FIELDS` ×2 (Z.279/287), `createNextGameweekEvents`-Klon-Select (Z.138) + Map (Z.180ff).
4. `src/components/admin/hooks/useEventForm.ts` — ✅ `populateFromEvent`, `buildCreatePayload` (Z.151), `buildUpdatePayload` (Z.192, `maybePut`). `EDITABLE_FIELDS` importiert aus `@/lib/services/events` (re-export).
5. `src/components/admin/EventFormModal.tsx` — **lesen:** wo `maxPerClub`-Input gerendert wird → analoger Input daneben (Mobile 393px, `inputMode="numeric"`).
6. `src/features/fantasy/hooks/useEventActions.ts` — ✅ Error-Switch (Z.~400ff, `salary_cap_exceeded`→`addToast(t('salaryCapExceeded'))`). Neue Cases analog.
7. `src/features/fantasy/mappers/eventMapper.ts` — ✅ `boundLeagueId: db.league_id ?? null` (Z.83) — `lineupRules` analog.
8. `src/types/index.ts` (`DbEvent`) + `src/features/fantasy/types.ts` (`FantasyEvent`) — **lesen:** exakte Feld-Positionen + ob ein `LineupRule`-Type-Alias sinnvoll ist.
9. `src/components/admin/hooks/__tests__/useEventForm.test.ts` — **lesen:** EDITABLE_FIELDS-Count-Assertion (380/382-Falle) finden + nachziehen.
10. `messages/de.json`/`tr.json` — **lesen:** Namespace der Lineup-Toast-Keys (`salaryCapExceeded` etc.) → neue Keys im SELBEN Namespace (S333 MISSING_MESSAGE-Falle).

## 5. Pattern-References

- **D107** — Zwei-Töpfe + Regel-Liste (Weg B). Türsteher = feste Spalten (S384), Aufstellungs-Regeln = JSONB.
- **S384** (Türsteher) — exaktes Vorbild für Schema-additiv + RPC-CREATE-OR-REPLACE-gegen-Live + Read/Write/Type/i18n-Kette.
- **S200** (`PLAYER_SELECT_COLS`/Select-Drift) — neue Spalte MUSS in alle Selects + Mapper + Type, sonst immer `null`, Cast lügt.
- **S380/382** (EDITABLE_FIELDS-Count-Assertion) — Feld-Addition bricht Count-Test, nur in CI sichtbar → mitziehen.
- **errors-db.md PATCH-AUDIT** — CREATE-OR-REPLACE gegen Live-Body, alle bestehenden Blöcke byte-genau erhalten (Konstanten prüfen, nicht nur Präsenz).
- **S333** (MISSING_MESSAGE) — i18n-Key im richtigen Namespace, Live-Render-Console-Scan.
- `max_per_club` (Slice 195c, `20260425150000`) — direktes Mechanik-Vorbild (feste Zahl, Starter-Count, JOIN players).

## 6. Acceptance Criteria (executable)

- **AC-1 [HAPPY]** Event mit `lineup_rules=[{type:'min_per_own_club',value:5}]`, Lineup mit ≥5 Spielern aus `event.club_id` → `rpc_save_lineup` `{ok:true}`. VERIFY: SQL force-rollback. EXPECTED: lineup_id zurück.
- **AC-2 [REJECT]** Gleiches Event, Lineup mit nur 4 eigenen → `{ok:false, error:'min_per_own_club_not_met', min:5, used:4}`. FAIL-IF: ok:true ODER Wildcard-/holding_lock-Bewegung.
- **AC-3 [FAIL-CLOSED]** `lineup_rules=[{type:'foobar',value:1}]` → `{ok:false, error:'unknown_lineup_rule'}`. Kein Lineup persistiert.
- **AC-4 [BOUNDS]** `lineup_rules=[{type:'min_per_own_club',value:0}]` und `value:99` → beide `invalid_lineup_rule_value`.
- **AC-5 [NULL/EMPTY]** `lineup_rules=NULL` und `[]` → Validator ist No-Op, Lineup speichert wie bisher (Regression-Safe für alle Bestands-Events).
- **AC-6 [NO-RESOURCE-MOVE]** Bei AC-2/AC-3/AC-4-Reject: `holding_locks` unverändert + KEIN `user_wildcards`-Delta (Validator läuft vor INSERT + vor spend/earn). VERIFY: force-rollback Vorher/Nachher-Count.
- **AC-7 [CLUBLESS]** Event `club_id=NULL` + `min_per_own_club:1` → Count 0 → `min_per_own_club_not_met` (dokumentiert fail-closed).
- **AC-8 [PATCH-AUDIT]** Alle bestehenden `rpc_save_lineup`-Blöcke (E-1 Liga-Bindung, max_per_club, salary_cap, wildcard spend/earn, bench) byte-identisch erhalten. VERIFY: Diff Live-vorher vs. neu zeigt nur den additiven Block.
- **AC-9 [WRITE-PFAD]** Admin setzt „min. 5 vom Verein" im EventFormModal → `events.lineup_rules` = `[{type:'min_per_own_club',value:5}]`; leer/0 → `NULL`. VERIFY: SQL nach Live-Create.
- **AC-10 [READ-PFAD]** `events.queries.ts` liefert `lineup_rules`; `FantasyEvent.lineupRules` ist gesetzt (nicht undefined-trotz-DB-Wert). VERIFY: tsc + Mapper-Test.
- **AC-11 [tsc/tests]** `pnpm exec tsc --noEmit` grün + `CI=true pnpm exec vitest run` grün (inkl. EDITABLE_FIELDS-Count nachgezogen).
- **AC-12 [UI-live post-Deploy]** EventFormModal rendert Input beide Builder (Platform-Admin + Club-Admin), 0 Console-Errors, kein MISSING_MESSAGE, Mobile 393px. Reject-Toast erscheint user-facing.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `lineup_rules = NULL` | No-Op (Bestands-Events, Regression-safe) |
| `lineup_rules = []` | No-Op |
| Unbekannter `type` | `unknown_lineup_rule`, fail-closed |
| `value` fehlt / nicht-int / <1 / >11 | `invalid_lineup_rule_value` |
| Mehrere Regeln in der Liste | Loop prüft alle; erste Verletzung returnt (künftige Regeln) |
| Doppelter `type` | Beide geprüft (harmlos, gleiche Bedingung) |
| Event ohne `club_id` + min_per_own_club | Count 0 → `min_per_own_club_not_met` (fail-closed) |
| min_per_own_club > gefüllte Slots der Formation | Kann nie erfüllt werden → Reject (Builder-Treffer-Anzeige fängt das später, E-4) |
| Spieler ohne `club_id` im Lineup | Zählt NICHT als „eigener Verein" (JOIN/Filter) |
| Reject mitten in Lineup-Edit (vorhandenes Lineup) | UPDATE läuft NACH Validierung → altes Lineup unverändert bei Reject |
| Wildcard-Spieler aus fremdem Verein | Zählt regulär nach `club_id` (Wildcard ist Trick fürs Holding, nicht Verein) — dokumentiert |
| Admin lädt Event mit anderer (künftiger) Regel + speichert | Pilot-Form serialisiert NUR min_per_own_club → andere Regel ginge verloren. **Scope-Out:** heute keine andere Regel; Multi-Regel-Builder = E-4. In Spec dokumentiert. |

## 8. Self-Verification Commands

```bash
# 1. Live-RPC-Baseline VOR Edit (Patch-Audit-Anker)
#   mcp__supabase__execute_sql: SELECT pg_get_functiondef('public.rpc_save_lineup(...)'::regprocedure)

# 2. Read-Pfad: lineup_rules in allen 3 Selects?
grep -n "lineup_rules" src/features/fantasy/services/events.queries.ts   # erwartet 3

# 3. Write-Pfad vollständig?
grep -rn "minPerOwnClub\|lineup_rules\|lineupRules" src/features/fantasy/ src/components/admin/

# 4. EDITABLE_FIELDS-Count-Assertion (380/382-Falle)
grep -rn "EDITABLE_FIELDS\|toHaveLength\|toContain('lineup_rules')" src/components/admin/hooks/__tests__/ src/lib/__tests__/

# 5. i18n DE+TR neue Keys vorhanden + gleicher Namespace
grep -n "minPerOwnClubNotMet\|unknownLineupRule\|invalidLineupRuleValue\|minPerOwnClub" messages/de.json messages/tr.json

# 6. tsc + tests
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run

# 7. Force-rollback Money-Smoke (SQL BEGIN…ROLLBACK): AC-1/2/3/4/5/6/7 + user_wildcards-Delta=0 bei Reject
```

## 9. Open-Questions

- **CEO-geklärt:** feste Zahl (nicht Prozent). ✅
- **Autonom-Zone (CTO):** Validator-Code-Struktur, Error-Code-Namen, ob `LineupRule`-Type-Alias, exakte Input-Platzierung im Modal, Serialisierungs-Logik im Payload-Builder, Wert-Obergrenze (11).
- **Keine offene CEO-Frage** für diesen Slice. Builder-Vollausbau (Multi-Regel-Dropdown + Echtzeit-Treffer-Anzeige) ist bewusst Scope-Out (E-4/E-6).

## 10. Proof-Plan

- `worklog/proofs/385-lineup-rules-smoke.txt` — force-rollback SQL-Smoke: AC-1 (pass) / AC-2 (reject + 0 Resource-Move) / AC-3 (unknown) / AC-4 (bounds) / AC-5 (null+empty No-Op) / AC-6 (wildcard-Delta=0) / AC-7 (clubless) / AC-8 (Patch-Audit-Diff).
- `worklog/proofs/385-vitest.txt` — vitest-Output (EDITABLE_FIELDS-Count + Serialisierung).
- `worklog/proofs/385-eventform-modal.png` — Playwright post-Deploy: Input in beiden Buildern, kein MISSING_MESSAGE, Mobile 393px.

## 11. Scope-Out

- Weitere Regel-Typen (`age_*`, `nation_in`, `mv_max_eur`, `position_quota`, max-pro-Nation) — je eigener winziger Folge-Slice (kein Schema-Change dank JSONB).
- Creator-zentrierter Builder + „Bedingung hinzufügen ▾"-Dropdown + **Echtzeit-Treffer-Anzeige** — E-4/E-6.
- Multi-Regel-Erhalt im Pilot-Form (Form serialisiert nur min_per_own_club) — kommt mit Multi-Regel-Builder.
- Datenbedarf für Folge-Regeln (Alter/Geburtsdatum, Nationalität auf `players`) — eigener Daten-Slice.

## 12. Stage-Chain (geplant)

SPEC (jetzt) → IMPACT: inline (grep-verifiziert, 1 Migration + Read/Write-Kette) → BUILD (selbst, kein Worktree — Money-nah) → REVIEW (reviewer-Agent, Pflicht) → PROVE (force-rollback-Smoke + vitest + Playwright post-Deploy) → LOG (+ ggf. errors-db Pattern + Epic E-3-Block reconcilen + Knowledge-Kopplung fantasy.md prüfen).

## 13. Pre-Mortem (M — optional, 5 Szenarien)

1. **Patch-Audit-Drift:** CREATE-OR-REPLACE vergisst einen Live-Block (z.B. Track-F-Wildcard) → Lineup-Bruch. **Mitigation:** AC-8 Diff Live-vorher vs. neu, nur additiver Block.
2. **Resource-Move bei Reject:** Validator versehentlich NACH spend_wildcards platziert → Wildcard verbrannt trotz Reject. **Mitigation:** AC-6, Block strikt vor INSERT.
3. **S200-Drift:** Spalte nicht in allen Selects → `lineupRules` immer null → Form-Edit lädt nie die Regel. **Mitigation:** AC-10 + grep =3.
4. **EDITABLE_FIELDS-CI-Rot:** Count-Test nicht nachgezogen → CI rot nach Push (380/382-Klasse). **Mitigation:** Code-Reading #9 + AC-11.
5. **JSONB-Typ-Mismatch:** `(v_rule->>'value')::int` wirft bei nicht-numerischem Wert (Cast-Exception statt sauberem Reject). **Mitigation:** Bounds-Check defensiv (`->>'value' ~ '^[0-9]+$'` prüfen ODER `value` NULL→reject vor Cast); AC-4 deckt es.
