# Slice 335 — Event-Absage geld-sicher (cancel_event RPC + CHECK + Prize-Refund-Zweig)

**Slice-Type:** Migration + Service + UI
**Größe:** L
**CEO-Scope:** Ja — Money (Treasury-Refund + Teilnehmer-Erstattung). Scope vorab freigegeben (Anil 2026-06-18: „voll geld-sicher"). Money-Code → selbst, kein Agent (CLAUDE.md §3).

---

## 1. Problem-Statement (Evidence)

Der „Event absagen"-Knopf (`AdminEventsTab.tsx:212` → `handleStatusChange(ev.id, 'cancelled')` → `updateEventStatus` → `.update({status:'cancelled'})`) ist **broken**: `events_status_check` (live verifiziert) = `['upcoming','registering','late-reg','running','scoring','ended']` — **kein 'cancelled'** → jeder Klick failt mit `23514`.

**Zwei Geld-Lücken zusätzlich:**
1. **Preisgeld-Kaution:** Slice 331 escrowt `prize_pool` (type='club') in die Treasury; der Settle-Trigger `trg_events_prize_settle` kennt nur `status='ended'`. Slice 331 §3 sagt explizit: „Wird echtes Absagen je gebaut ('cancelled' in CHECK), gehört der Voll-Refund-Zweig in **jenen Slice**." → genau hier.
2. **Teilnehmer-Einsätze:** `cancel_event_entries`/`rpc_cancel_event_entries` (refund tickets/$SCOUT, löscht entries) existiert, ist aber **nirgends mit dem Absage-Knopf verdrahtet** (grep = 0 Consumer in src/) UND nur platform-admin-berechtigt (`top_role='Admin'`) — der Knopf sitzt aber im **Club**-Admin-Panel. → Teilnehmer würden bei Absage ihr Geld verlieren.

---

## 2. Lösungs-Design

**Eine atomare `cancel_event(p_event_id)`-RPC** (SECURITY DEFINER) bündelt alles in einer Transaktion:
1. Auth: `auth.uid()` = Club-Admin von `event.club_id` ODER Platform-Admin (Pattern wie `get_club_balance`, Slice 333).
2. Event `FOR UPDATE` laden (Race-Schutz gegen Doppel-Cancel).
3. Status-Guard: nur `IN ('upcoming','registering','late-reg')` (= `ALLOWED_TRANSITIONS`); sonst `not_cancellable`. Idempotenz: bereits 'cancelled'/'ended'/'running'/'scoring' → Fehler.
4. Teilnehmer-Erstattung: `PERFORM rpc_cancel_event_entries(p_event_id)` (interne, getestete Logik wiederverwenden — refund + entries löschen + current_entries=0).
5. `UPDATE events SET status='cancelled'` → feuert `trg_events_prize_settle` → **voller Kaution-Refund** in die Treasury (erweiterter 'cancelled'-Zweig).
6. Return `{success:true, refunded_count}` (Discriminated Union).
7. AR-44 REVOKE/GRANT.

**Trigger-Erweiterung** `trg_events_prize_settle`: zusätzlich zu 'ended' (Rest = pool − Σ rewards) den Zweig `status='cancelled'` → `v_refund = OLD.prize_pool` (voll, keine Auszahlung erfolgt); `prize_escrowed := false` bei ended ODER cancelled.

**Service:** `cancelEvent(eventId)` in `events.mutations.ts` (ruft `cancel_event`-RPC, Discriminated-Guard). UI: `handleStatusChange('cancelled')` → stattdessen `handleCancelEvent(ev)` mit **ConfirmDialog** (Money-destruktiv) → `cancelEvent`.

**Type:** `DbEvent.status` +'cancelled'.

---

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260618160000_slice_335_event_cancel.sql` | NEU: CHECK +'cancelled' · `trg_events_prize_settle` +cancelled-Zweig · `cancel_event`-RPC |
| `src/types/index.ts` | `DbEvent.status` +'cancelled' |
| `src/features/fantasy/services/events.mutations.ts` | `cancelEvent(eventId)`-Service (neue RPC) |
| `src/components/admin/hooks/useClubEventsActions.ts` | `handleCancelEvent` (Confirm-State + cancelEvent + refresh) |
| `src/components/admin/AdminEventsTab.tsx` | Absage-Knopf → handleCancelEvent + ConfirmDialog |
| `messages/de.json` + `messages/tr.json` | admin-Namespace: eventCancelConfirm* + eventCancelSuccess |

---

## 4. Code-Reading-Liste (Pflicht — erledigt)

1. ✅ `pg_get_constraintdef(events_status_check)` LIVE → kein 'cancelled'.
2. ✅ `20260617150000_slice_331_events_treasury_escrow.sql` — Escrow (INSERT) + Settle (status='ended') + Resync (prize_pool/type). §3 verweist Refund-Zweig explizit auf diesen Slice.
3. ✅ `pg_get_functiondef(rpc_cancel_event_entries)` LIVE — refund tickets (balance+) / scout (locked_balance−) + ticket_transactions/transactions + DELETE entries/holding_locks + current_entries=0. KEIN Status-Set, KEIN Auth-Check.
4. ✅ `cancel_event_entries`-Wrapper — platform-admin-only (`top_role='Admin'`).
5. ✅ `events.mutations.ts` — `updateEventStatus`, `EDITABLE_FIELDS.cancelled=[]`, `ALLOWED_TRANSITIONS` (upcoming/registering/late-reg→cancelled).
6. ✅ `useClubEventsActions.ts` `handleStatusChange` — mutex + mapErrorToKey + refreshEvents.
7. ✅ `DbEvent.status` (types:720) = ohne 'cancelled'.
8. ✅ `get_club_balance` (Slice 333) — Auth-Pattern club_admins + platform_admins.
9. ZU LESEN: `AdminEventsTab.tsx` ~200-225 (Knopf-Kontext, ConfirmDialog-Einbau) + bestehende ConfirmDialog-Nutzung.
10. ZU LESEN: `book_club_treasury`-Signatur (Slice 329) für Refund-Buchung im Trigger (bereits in 331 genutzt: `(club_id, direction, type, amount, ref, desc)`).

## 5. Pattern-References

- **errors-db.md** „transactions.type/status-CHECK-Drift" (Slice 330/332) — Status-Literal in Spalte mit CHECK schreiben → CHECK muss Wert kennen. Hier: events.status +'cancelled'.
- **errors-db.md** „Escrow-bei-INSERT + Settle-bei-status" (Slice 331) — der vorgesehene cancel-Refund-Zweig.
- **errors-db.md** „CREATE OR REPLACE FUNCTION PATCH-AUDIT" (Slice 156) — `trg_events_prize_settle` Body = live-Stand (331) + cancelled-Zweig, nicht neu erfinden.
- **database.md** AR-44 REVOKE/GRANT auf neuer RPC.
- **errors-frontend.md** ConfirmDialog statt native confirm (Money-destruktiv) + Modal preventClose bei isPending.
- **errors-db.md** Return-Shape Discriminated Union (Slice 168).

## 6. Acceptance Criteria

- **AC-01** [HAPPY] `events_status_check` enthält 'cancelled'. VERIFY: `pg_get_constraintdef` ILIKE '%cancelled%'.
- **AC-02** [HAPPY] `cancel_event` existiert, SECURITY DEFINER, anon=false/authenticated=true. VERIFY: pg_proc + has_function_privilege.
- **AC-03** [HAPPY] Club-Event mit Einsätzen + Kaution absagen → entries refunded (count>0), entries gelöscht, current_entries=0, prize voll zurück in Treasury, status='cancelled', prize_escrowed=false. VERIFY: BEGIN; … ROLLBACK; Smoke mit echtem club-Event.
- **AC-04** [EDGE] Absage eines 'running'/'ended' Events → `{success:false,error:'not_cancellable'}`, kein Geld bewegt. VERIFY: Smoke.
- **AC-05** [SECURITY] Nicht-Admin (auth.uid() fremd) → `not_authorized`, kein Refund. VERIFY: Smoke mit set role/claims.
- **AC-06** [HAPPY] Trigger 'cancelled'-Zweig refundet OLD.prize_pool voll (nicht minus rewards). VERIFY: Smoke Treasury-Delta = +prize_pool.
- **AC-07** [HAPPY] free Event (ticket_cost=0, prize_pool=0) absagen → refunded_count = #entries (0-Refund je), kein Treasury-Move, status='cancelled'. VERIFY: Smoke.
- **AC-08** [HAPPY] UI: Absage-Knopf → ConfirmDialog → cancelEvent → Event in pastEvents. VERIFY: Live-Playwright (oder tsc+Service-Test, da Modal gated).
- **AC-09** [I18N] eventCancelConfirm*/Success de+tr im admin-Namespace. VERIFY: node-Check.
- **AC-10** [HAPPY] DbEvent.status +'cancelled', tsc clean. VERIFY: tsc.

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | Event 'running'/'scoring'/'ended' | not_cancellable, kein Move |
| 2 | Event bereits 'cancelled' | not_cancellable (idempotent-safe) |
| 3 | Doppel-Cancel parallel | FOR UPDATE serialisiert; 2. sieht 'cancelled' → not_cancellable |
| 4 | prize_escrowed=false (Grandfathered/free) | kein Treasury-Refund, nur entries + status |
| 5 | 0 Teilnehmer | refunded_count=0, prize zurück, status='cancelled' |
| 6 | $SCOUT-Einträge | locked_balance entsperrt (rpc_cancel_event_entries) |
| 7 | Ticket-Einträge | tickets balance+ |
| 8 | type≠'club' (bescout/sponsor) club_id null | nur Platform-Admin; kein prize-Refund (mintet); entries+status ok |
| 9 | Nicht-Admin Aufruf | not_authorized |
| 10 | auth.uid() null (anon) | auth_required (REVOKE anon ohnehin) |

## 8. Self-Verification

```bash
mcp__supabase__execute_sql: SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='events_status_check';
mcp__supabase__execute_sql: SELECT has_function_privilege('anon', oid,'EXECUTE'), has_function_privilege('authenticated', oid,'EXECUTE') FROM pg_proc WHERE proname='cancel_event';
# Money-Smoke (BEGIN; … ROLLBACK;): club-Event anlegen (escrow), 1 Ticket-Entry, cancel_event, verify entries=0/treasury+/status; ROLLBACK.
node -e "const m=require('./messages/de.json'); console.log(m.admin?.eventCancelConfirmTitle ?? 'MISSING')"
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy/services src/components/admin/hooks
```

## 9. Open-Questions

- ✅ CEO erledigt: voll geld-sicher (Anil 2026-06-18).
- Autonom (CTO): RPC reuse rpc_cancel_event_entries vs inline (→ reuse, DRY+tested) · Confirm-Dialog-Wording · cancellable-Window = ALLOWED_TRANSITIONS · prize-Refund voll bei cancelled.

## 10. Proof-Plan

- DB: CHECK + cancel_event-Signatur + REVOKE → `worklog/proofs/335-schema.txt`.
- Money-Smoke (BEGIN;…ROLLBACK;): happy (entries refund + treasury + status) + not_cancellable + not_authorized → `worklog/proofs/335-money-smoke.txt`.
- Service/tsc: vitest + tsc → `worklog/proofs/335-vitest.txt`.
- UI: Live-Playwright (ConfirmDialog + Absage) ODER tsc+Service-Test wenn Konto-gated.

## 11. Scope-Out

- Keine Änderung an Entry-/Scoring-Logik, kein neues Currency-Handling.
- Kein automatisches Absagen (Cron) — nur manuelle Admin-Aktion.
- Non-club-Event-Treasury-Refund (die minten bewusst) — out, wie Slice 331.

## 12. Stage-Chain

SPEC → IMPACT (in Spec §3 erfasst: events-Consumer + Trigger) → BUILD (Migration → Type → Service → Hook → UI → i18n) → REVIEW (Cold-Context, Money-Fokus) → PROVE (Money-Smoke Rollback + tsc/vitest) → LOG.

## 13. Pre-Mortem (≥5)

1. **Doppel-Refund:** cancel_event ohne FOR UPDATE → 2 parallele Calls refunden 2×. → `SELECT … FOR UPDATE` + Status-Guard.
2. **Trigger-Body-Revert (Slice 156):** `trg_events_prize_settle` von 331-Stand ableiten, NICHT vom ersten Create — sonst 'ended'-Logik verloren. → Body = 331 live + cancelled-Zweig.
3. **Settle feuert nicht:** `UPDATE events SET status` muss die Spalte `status` ändern (Trigger BEFORE UPDATE OF status). Wenn rpc_cancel_event_entries vorher current_entries setzt — separate UPDATE, feuert status-Trigger NICHT (gut). Reihenfolge: refund zuerst, dann status. ✓
4. **Auth-Mismatch:** cancel_event muss CLUB-Admin erlauben (nicht nur top_role='Admin'), sonst Club-Admin kann nicht absagen. → club_admins OR platform_admins.
5. **prize voll vs Rest:** bei 'cancelled' KEINE rewards verteilt → voller OLD.prize_pool zurück (nicht pool−Σrewards, das wäre auch =pool, aber explizit). ✓
6. **CHECK-Drift Type:** DbEvent.status ohne 'cancelled' → tsc-Fehler bei Vergleichen/Mappings. → Type erweitern; Consumer (activeEvents/pastEvents kennen 'cancelled' schon).
7. **AR-44 Reset:** neue RPC ohne REVOKE → anon execute. → REVOKE/GRANT.
8. **rpc_cancel_event_entries Auth:** intern (kein Auth-Check) — cancel_event ist der Auth-Gate davor. PERFORM der internen, NICHT des platform-admin-Wrappers `cancel_event_entries`.
