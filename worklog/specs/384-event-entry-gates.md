# Slice 384 — E-3 Türsteher: Follower-Pflicht + Fan-Rang-Gate auf Events

**Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n
**Größe:** M
**Scope:** Money-nah / §3 (Eintritts-RPC `rpc_lock_event_entry` bewegt Geld — selbst bauen, Reviewer-Pflicht). **Kein neuer Geld-Flow** — die zwei Gates blocken VOR jeder Wallet-/Ticket-Bewegung; Beträge/Fees/Treasury byte-identisch.
**Epic:** event-creator-liga-epic.md E-3 (Türsteher-Teil) · **Architektur:** D107 (§3b — „Eintritts-Türsteher = feste Spalten").

---

## 1. Problem-Statement

**Evidence (Anil 2026-06-25 + Epic E-3):** Heute kann jeder bei jedem offenen Event teilnehmen, sofern Abo-/Gamification-Stufe passen. Vereine können ihre Events **nicht** auf treue Fans beschränken. E-3 (D104/D107) verlangt zwei Türsteher-Regeln auf Event-Eintritt:
- **(b) Follower-Pflicht:** nur wer dem Verein folgt, darf rein.
- **(c) Fan-Rang-Gate:** nur ab einer Fan-Stufe (`stammgast`…`vereinsikone`), wie es Polls (Slice 356) und News (Slice 346) schon haben.

**Anil-Quote:** „weitere [Bedingungen] … damit gezielt [Fans] gefördert werden können durch events" + Weg-A-Wahl („Türsteher zuerst").

**Live-Faktenbasis (D87, 2026-06-25):**
- `rpc_lock_event_entry(p_event_id uuid, p_user_id uuid)` (SECURITY DEFINER) blockt VOR Geldbewegung mit `RETURN jsonb_build_object('ok', false, 'error', '…')`. Bestehende Gates: `event_not_found` → `event_not_open` → `event_full` → **`subscription_required`** (`min_subscription_tier`, nur bei `club_id IS NOT NULL`, via `club_subscriptions` + `tier_rank`) → **`tier_required`** (`min_tier`, via `user_stats` + `gamification_tier_rank`) → `already_entered` → advisory-lock → Geld.
- Event-Spalten: `min_subscription_tier`, `min_tier`, `club_id` (nullable), `type` existieren. **`requires_follow` + `min_fan_rank_tier` existieren NICHT** → Migration.
- `club_followers(user_id NOT NULL, club_id NOT NULL)` existiert. `fan_rankings(user_id, club_id, rank_tier, total_score)` existiert. Helper `fan_rank_tier_rank(text)` live: zuschauer=0, stammgast=1, ultra=2, legende=3, ehrenmitglied=4, vereinsikone=5, else −1.
- Service-Kette: `createEvent` = direkter `.insert()`; `updateEvent` = `.update(fields)` mit `EDITABLE_FIELDS`-Guard; Eintritt via Wrapper `lock_event_entry(p_event_id)` → `lockEventEntry`-Service parst `result.error`.

## 2. Lösungs-Design

**Spiegelt das Poll-Muster (Slice 356) 1:1** — bewährt, money-safe, fail-closed.

1. **Schema (additiv):** `events.requires_follow BOOLEAN NOT NULL DEFAULT false` + `events.min_fan_rank_tier TEXT` (NULL = offen) mit CHECK = 6-Tier-Mirror (wie `community_polls`/`posts`).
2. **`rpc_lock_event_entry` CREATE OR REPLACE** (gegen **Live**-Baseline, PATCH-AUDIT S156/S356 — Body byte-genau erhalten, nur 2 Gate-Blöcke ergänzt). Position: **nach** `min_tier`-Gate, **vor** `already_entered`-Check (= vor jeder Geldbewegung). Beide Gates **nur bei `club_id IS NOT NULL`** (analog `subscription_required` — bescout/sponsor-Events ohne Verein haben kein club-spezifisches Türsteher-Signal):
   - **Follower:** `IF v_event.requires_follow AND v_event.club_id IS NOT NULL THEN IF NOT EXISTS(SELECT 1 FROM club_followers WHERE user_id=p_user_id AND club_id=v_event.club_id) THEN RETURN jsonb_build_object('ok',false,'error','follow_required'); END IF; END IF;`
   - **Fan-Rang:** `IF v_event.min_fan_rank_tier IS NOT NULL AND v_event.club_id IS NOT NULL THEN SELECT rank_tier INTO v_rank_tier FROM fan_rankings WHERE user_id=p_user_id AND club_id=v_event.club_id LIMIT 1; IF fan_rank_tier_rank(v_rank_tier) < fan_rank_tier_rank(v_event.min_fan_rank_tier) THEN RETURN jsonb_build_object('ok',false,'error','fan_rank_too_low','need',v_event.min_fan_rank_tier); END IF; END IF;` — fail-closed: `fan_rank_tier_rank(NULL)=−1 < jede Mindeststufe`.
   - Neue DECLARE-Var `v_rank_tier TEXT;`.
3. **Service:** `createEvent`-Params + `.insert()` (`requires_follow`, `min_fan_rank_tier`) · `EDITABLE_FIELDS.upcoming` + `.registering` (+2 Felder) · `LockEventEntryResult.error`-Union (+`follow_required`,`fan_rank_too_low`).
4. **Type:** `DbEvent` (+`requires_follow: boolean`, +`min_fan_rank_tier: string | null`).
5. **Builder-UI** (`types.ts` + `useEventForm.ts` + `EventFormModal.tsx`): Toggle „Nur Follower" + Select „Mindest-Fan-Rang" (NULL/„offen" + stammgast…vereinsikone — `zuschauer` NICHT anbieten = sinnlos). Felder bei `club_id`-leer mit Hinweis deaktiviert/ineffektiv (Spiegel `min_subscription_tier`).
6. **Eintritts-Consumer-i18n:** `follow_required` + `fan_rank_too_low` → DE+TR + `mapErrorToKey`.

**Entscheidung (CTO-Autonom):** Follower-Pflicht = **BOOLEAN** (`requires_follow`), nicht „X Follower". E-3 sagt „Follower-Pflicht" = ist der User Follower des Vereins, ja/nein. (Eine „min. X eigene Follower des Users"-Zahl ergäbe für ein Eintritts-Gate keinen Sinn.)

## 3. Betroffene Files

| File | Änderung | Begründung |
|---|---|---|
| `supabase/migrations/20260625210000_slice_384_event_entry_gates.sql` | NEU: 2 Spalten + CHECK + `rpc_lock_event_entry` CoR | Schema + Gates |
| `src/features/fantasy/services/events.mutations.ts` | createEvent params+insert · EDITABLE_FIELDS ×2 · LockEventEntryResult.error | Write-Pfad + Editier-Guard + Error-Typ |
| `src/types/` (DbEvent) | +2 Felder | Type-Wahrheit (sonst Cast lügt, S200-Klasse) |
| `src/components/admin/hooks/types.ts` | EventFormState + INITIAL_FORM_STATE + populateFromEvent | Builder-State |
| `src/components/admin/hooks/useEventForm.ts` | populate + buildCreatePayload + buildUpdatePayload | Form→Payload |
| `src/components/admin/EventFormModal.tsx` | 2 neue Felder (Toggle + Select) + Hinweis | Builder-UI |
| `src/features/fantasy/services/events.queries.ts` | Select-Cols falls explizit (boundLeagueId-Lehre S200/382) | sonst Feld immer null |
| `messages/de.json` + `messages/tr.json` | Builder-Labels + 2 Error-Keys | i18n DE+TR |
| Eintritts-Consumer (lockEventEntry-Error-Anzeige) + `mapErrorToKey` | 2 neue Keys | kein Raw-Code-Leak (J1/J3) |
| Test (`EDITABLE_FIELDS`-Count-Assertion) | +2 erwartete Felder | 380/382-CI-Rot-Klasse vermeiden |

## 4. Code-Reading-Liste (Pflicht VOR Code)

1. **LIVE `pg_get_functiondef('public.rpc_lock_event_entry(uuid,uuid)')`** — ✅ gelesen (D87). Baseline für CoR. **Vor Migration erneut frisch ziehen** (kein Re-Drift seit Lesen).
2. **LIVE `pg_get_functiondef('public.lock_event_entry(...)')`** — Wrapper-Signatur prüfen: ruft er `rpc_lock_event_entry(p_event_id, auth.uid())`? (Public-Wrapper-Pattern S035). Nur die INNERE RPC ändern, Wrapper unberührt — **verifizieren**.
3. `supabase/migrations/20260623230000_slice_356_exclusive_polls.sql` — ✅ gelesen. CHECK + Gate-Muster + fail-closed-Logik = Vorlage.
4. `src/features/fantasy/services/events.mutations.ts` — ✅ gelesen. createEvent insert-Keys, EDITABLE_FIELDS (upcoming/registering), LockEventEntryResult.
5. `src/components/admin/hooks/types.ts` + `useEventForm.ts` — ✅ gelesen. EventFormState, populateFromEvent, buildCreate/Update-Payload.
6. `src/components/admin/EventFormModal.tsx` — **lesen:** wo sitzen `min_subscription_tier`-Select + `max_per_club`-Input (Platform vs. Club-Block), `isFieldDisabled`-Nutzung, `SELECT_CLS`/Toggle-Pattern → 1:1 daneben einhängen.
7. `src/types/` DbEvent-Definition — **lesen:** exakter Pfad + ob `PLAYER_SELECT_COLS`-artige Select-Liste existiert (S200).
8. `src/features/fantasy/services/events.queries.ts` — **lesen:** zieht `select('*')` oder explizite Cols? (entscheidet ob queries.ts geändert werden muss — boundLeagueId-Lehre 382/S200).
9. Eintritts-Consumer: grep `lockEventEntry(` + `mapErrorToKey` — **lesen:** wo Error angezeigt wird (Fantasy-UI) + bestehendes Error-Key-Mapping (`event_full`/`insufficient_*`).
10. `db-invariants.test.ts` / events-Tests — **lesen:** wo EDITABLE_FIELDS-Count asserted wird (380/382 zogen upcoming/registering-Counts nach).

## 5. Pattern-References

- **S356** (Poll Fan-Rang-Gate) — Vorlage: Spalte + CHECK + fail-closed Gate VOR Geld. Diese Slice ist der Events-Spiegel.
- **S156-FAIL / CREATE OR REPLACE PATCH-AUDIT** (errors-db.md) — Baseline = LIVE `pg_get_functiondef`, NIE alte Migrationsdatei. Konstanten-/Guard-Erhalt post-apply per `ILIKE` asserten (auth-Guard, fee_config, min_tier, tickets/scout-Pfade alle erhalten).
- **S035 Public-Wrapper + Internal-RPC** — `lock_event_entry`-Wrapper injiziert `auth.uid()`; nur Inner-RPC anfassen.
- **S200 / boundLeagueId-Lehre (382)** — neue Event-Spalte → Read-Query-Select-Cols + DbEvent-Type + Mapper mitziehen, sonst immer `null` trotz DB-Wert.
- **EDITABLE_FIELDS-Count-Test (380/382)** — Feld-Addition zu upcoming/registering bricht Count-Assertion (nur in CI sichtbar) → Test mitziehen.
- **J1/J3 i18n-Key-Leak** — Service wirft/returnt Error-Codes; Consumer resolved via `te(mapErrorToKey(...))`, nie `setError(err.message)`.
- **business.md** — Builder-Labels user-facing („Nur Follower", „Mindest-Fan-Rang") DE+TR; keine Securities-/Glücksspiel-Begriffe (neutral, kein Risiko hier).

## 6. Acceptance Criteria (executable)

- **AC-1 [SCHEMA]** `information_schema.columns` zeigt `events.requires_follow` (boolean, NOT NULL, default false) + `events.min_fan_rank_tier` (text, nullable). **VERIFY:** SQL. **FAIL-IF:** Spalte fehlt / requires_follow nullable.
- **AC-2 [CHECK]** `min_fan_rank_tier` akzeptiert nur NULL ∪ 6-Tier. **VERIFY:** Insert `'bogus'` → 23514; `'ultra'` + NULL → ok (force-rollback). 
- **AC-3 [GATE-FOLLOW · HAPPY]** Event `requires_follow=true`, club-gebunden: Nicht-Follower → `{ok:false,error:'follow_required'}`, **Wallet/Tickets unverändert**; Follower → Eintritt ok. **VERIFY:** force-rollback Money-Smoke (JWT-sub-Impersonation). **FAIL-IF:** Geld bewegt bei Reject.
- **AC-4 [GATE-RANK · HAPPY]** Event `min_fan_rank_tier='legende'`: User mit `rank_tier='ultra'` (rank 2<3) → `fan_rank_too_low`; `'legende'`/`'vereinsikone'` (3/5≥3) → ok; **kein Rang (NULL)** → reject (fail-closed). Wallet unverändert bei Reject.
- **AC-5 [PATCH-AUDIT]** Live `pg_get_functiondef` nach apply enthält weiterhin: `auth_uid_mismatch`, `event_fee_config`, `min_subscription_tier`-Block, `min_tier`-Block, `scout_events_enabled`, beide `currency`-Pfade (tickets+scout), `event_entry_lock`. **VERIFY:** `ILIKE`-Checks. **FAIL-IF:** ein Patch fehlt (Silent-Revert).
- **AC-6 [NON-CLUB-NOOP]** Event ohne `club_id` mit gesetztem `requires_follow=true`/`min_fan_rank_tier` → Eintritt **nicht** geblockt (Gate no-op, Spiegel `subscription_required`). **VERIFY:** Smoke.
- **AC-7 [IDEMPOTENZ-ERHALT]** Bereits eingetretener User → `already_entered:true` (Gates kommen vor diesem Check, aber Re-Entry eines berechtigten Users bleibt idempotent). **VERIFY:** zweimal locken.
- **AC-8 [CREATE/EDIT]** Builder legt Event mit `requires_follow`+`min_fan_rank_tier` an (`.insert()` schreibt beide); `updateEvent` erlaubt beide Felder in upcoming/registering, blockt in running/ended. **VERIFY:** tsc + Service-Test + Live-Insert-Read.
- **AC-9 [TYPE/READ]** `DbEvent` trägt beide Felder; Read-Query liefert sie (nicht null trotz DB-Wert). **VERIFY:** grep Select-Cols + tsc.
- **AC-10 [i18n]** `follow_required` + `fan_rank_too_low` + Builder-Labels in DE+TR vorhanden, namespace-korrekt (kein `MISSING_MESSAGE`). **VERIFY:** namespace-aware Node-Check.
- **AC-11 [tsc/tests]** `pnpm exec tsc --noEmit` grün + `CI=true pnpm exec vitest run` grün (inkl. EDITABLE_FIELDS-Count nachgezogen).
- **AC-12 [UI post-Deploy]** Builder rendert beide Felder im Admin gegen bescout.net, 0 Console-Errors; Toggle+Select speichern. (Eintritts-Reject-Toast = Logik-verifiziert; Live-Walk braucht follower-/rang-loses Test-Konto = optional Folge-Verify.)

## 7. Edge Cases

| Fall | Erwartung |
|---|---|
| `requires_follow=true` + `club_id=NULL` | Gate no-op (kein Block) — AC-6 |
| `min_fan_rank_tier` gesetzt + `club_id=NULL` | Gate no-op |
| User ohne `fan_rankings`-Zeile (rank_tier NULL) | `fan_rank_tier_rank(NULL)=−1` < min → reject (fail-closed) |
| `min_fan_rank_tier='zuschauer'` (rank 0) | UI bietet nicht an; falls per DB gesetzt: jeder mit Rang≥0 erfüllt → effektiv nur „hat Rang-Zeile". Akzeptiert (CHECK erlaubt, wie Poll). |
| Beide Gates aktiv, Follower aber Rang zu niedrig | Follower-Gate passt, Rang-Gate rejected `fan_rank_too_low` (Reihenfolge: erst follow, dann rank) |
| Free-Event (`ticket_cost=0`) + Gate-Reject | Reject VOR Entry-Insert, kein `current_entries++`, kein Ticket/Wallet-Touch |
| `scout`-Currency-Event + Gate-Reject | Reject VOR Wallet-Lock |
| Bestehende Events (Spalten neu) | `requires_follow=false` default, `min_fan_rank_tier=NULL` → Verhalten unverändert (kein Backfill) |
| Stale `rank_tier` (Fan-Rang seit letztem Recalc gesunken) | stale-tolerant akzeptiert (Spiegel 356/343 — money-safe da Reject vor Geld; Recalc-Latenz bekannt) |
| `updateEvent` versucht Feld in `running` | EDITABLE_FIELDS blockt (nicht in running-Liste) |

## 8. Self-Verification Commands

```bash
# Live-Baseline frisch (vor Migration)
# SQL: SELECT pg_get_functiondef('public.rpc_lock_event_entry(uuid,uuid)'::regprocedure);
# SQL: SELECT pg_get_functiondef('public.lock_event_entry'...);  -- Wrapper-Signatur

# Post-apply PATCH-AUDIT (alle müssen >0)
# SQL: SELECT (def ILIKE '%auth_uid_mismatch%')::int + (def ILIKE '%event_fee_config%')::int
#        + (def ILIKE '%min_subscription_tier%')::int + (def ILIKE '%min_tier%')::int
#        + (def ILIKE '%scout_events_enabled%')::int + (def ILIKE '%event_entry_lock%')::int
#        + (def ILIKE '%follow_required%')::int + (def ILIKE '%fan_rank_too_low%')::int AS patch_score  -- erwartet 8
#      FROM (SELECT pg_get_functiondef('public.rpc_lock_event_entry(uuid,uuid)'::regprocedure) def) s;

# Read-Query zieht neue Spalten?
grep -n "min_subscription_tier\|select(" src/features/fantasy/services/events.queries.ts

# i18n namespace-aware (kein MISSING_MESSAGE)
node -e "const d=require('./messages/de.json'),t=require('./messages/tr.json'); for(const k of ['follow_required','fan_rank_too_low']) console.log(k, JSON.stringify(d).includes(k), JSON.stringify(t).includes(k));"

# EDITABLE_FIELDS-Count-Assertion finden (mitziehen)
grep -rn "EDITABLE_FIELDS\|toHaveLength\|upcoming.*length" src/**/__tests__/ src/lib/__tests__/

pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
```

## 9. Open Questions

- **CEO-Zone:** ✅ geklärt — Anil: Weg A (Türsteher zuerst), Follower + Fan-Rang. Keine offene CEO-Frage. (E-3a min-vom-Verein = nächster Slice, nicht hier.)
- **Autonom-Zone (CTO):** Follower = BOOLEAN (entschieden) · Gate-Reihenfolge follow→rank · Felder bei club_id-leer deaktiviert+Hinweis · Fan-Rang-Select bietet stammgast+ (kein zuschauer) · Migration-Timestamp `20260625210000`.
- **Pflicht-Klärung beim BUILD:** Wrapper `lock_event_entry`-Signatur live bestätigen (Code-Reading #2) — nur Inner-RPC ändern.

## 10. Proof-Plan

- **DB/Gate:** `worklog/proofs/384-money-smoke.txt` — force-rollback (`BEGIN…ROLLBACK`) via JWT-sub-Impersonation: AC-1..AC-7 (Schema, CHECK, beide Gates happy+reject, Wallet-unverändert-bei-Reject, non-club no-op, PATCH-AUDIT-Score=8).
- **Service/Type:** tsc + `vitest run` Output (AC-8/9/11).
- **i18n:** Node-Check-Output (AC-10).
- **UI:** Playwright gegen bescout.net (`jarvis-qa@bescout.net`) — Admin-Builder rendert Toggle+Select, 0 Console-Errors, Insert-Read-Roundtrip (AC-12). Screenshot `worklog/proofs/384-builder-gates.png`.

## 11. Scope-Out

- **E-3a min-X-vom-Verein** (Regel-Liste-Fundament, JSONB `lineup_rules`) = eigener nächster Slice (D107 §3b).
- **Alters-/Nationalitäts-/MV-/Positions-Regeln** = Folge-Slices (Regel-Liste).
- **Echtzeit-Treffer-Anzeige im Builder** („~X Nutzer erfüllen") = eigener UX-Slice (D107).
- **User-/Sponsor-Builder** = E-4/E-6.
- **Live-Walk des Eintritts-Reject** mit follower-/rang-losem Konto = optionaler Folge-Verify (Logik smoke-bewiesen).
- Kein Backfill bestehender Events; keine Änderung an Beträgen/Fees/Treasury.

## 12. Stage-Chain (geplant)

SPEC (dieses File) → IMPACT inline (Consumer grep-verifiziert in §3/§4) → BUILD (selbst, 1 Migration via `apply_migration` + Service/Type/UI/i18n, KEIN Worktree §3) → REVIEW (reviewer-Agent, Money-nah Pflicht) → PROVE (force-rollback-Smoke + tsc/vitest + i18n + UI-Playwright) → LOG.

## 13. Pre-Mortem (Money-nah → bewusst geführt)

1. **PATCH-AUDIT-Drift:** Body aus alter Datei statt Live → Silent-Revert (auth-Guard/fee/min_tier). **Mitigation:** Code-Reading #1 frisch + AC-5 ILIKE-Score=8.
2. **Falsche RPC geändert:** Wrapper `lock_event_entry` vs. Inner `rpc_lock_event_entry` verwechselt → Gate wirkt nicht. **Mitigation:** Code-Reading #2 Wrapper-Signatur live.
3. **Read-Spalte vergessen:** queries.ts zieht Cols nicht → `min_fan_rank_tier` immer null im Builder-Edit-View → Gate scheinbar wirkungslos. **Mitigation:** AC-9 + S200-Check.
4. **EDITABLE_FIELDS-CI-Rot:** Test-Count nicht nachgezogen → CI rot nach Push (380/382-Klasse). **Mitigation:** Code-Reading #10 + AC-11.
5. **Gate nach Geld statt davor:** Block-Block nach Wallet-Lock platziert → Geld bewegt trotz Reject. **Mitigation:** Position vor `already_entered`/advisory-lock fixiert + AC-3/4 „Wallet unverändert".
6. **i18n-Key-Leak:** `setError('follow_required')` zeigt Raw-Code statt Text. **Mitigation:** mapErrorToKey + AC-10 + Consumer-grep #9.
