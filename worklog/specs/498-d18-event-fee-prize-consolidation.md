# Slice 498 — D-18 Full Consolidation: `events.entry_fee` + `events.prize_pool` DROP

**Slice-Type:** Migration (+ Service + UI) · **Größe:** L · **Scope:** §3 Money-adjacent + Schema-DROP auf heißer `events`-Tabelle · **CEO:** Anil „Full consolidation" (2026-07-01, AskUserQuestion)

## 1. Problem-Statement (Evidence: Live-DB + Grep)
`events` trägt zwei deprecated Money-Spalten neben ihren kanonischen Nachfolgern:
- **`entry_fee` (bigint cents)** ← ersetzt durch **`ticket_cost` (int) + `currency` ('tickets'|'scout')**. `create_user_event` schreibt `ticket_cost := p_entry_fee` UND `entry_fee := p_entry_fee` (Dual-Write, identischer Wert). Mapper liest `ticket_cost ?? entry_fee` → Fallback tot (ticket_cost NOT NULL). Live: nur 2 E2E-user-Events non-zero, `entry_fee == ticket_cost` (keine Divergenz).
- **`prize_pool` (bigint)** ← ersetzt durch **`reward_structure` (jsonb tiered %)** (+ dynamischer Pot aus `event_entries.fee_split`, S396). Live: **0 auf ALLEN 208 Events**. Mapper: `prizePool`/`guaranteed = centsToBsd(prize_pool)` = 0 überall; alle Prize-Displays zeigen „0 CR".

**Klasse:** D111-Krankheit (zweiter Weg, dual-geschrieben/dead-gelesen). P2-live (kein aktiver Bug), aber §0-Schnitt-Regel + CEO-Full-Entscheid → beide Spalten raus.

## 2. Lösungs-Design (Semantik-Mapping)
| Alt (DROP) | Kanonisch (bleibt) | Mapper-Änderung |
|---|---|---|
| `entry_fee` (cents) | `ticket_cost` + `currency` | `entryFeeCents: db.ticket_cost ?? 0` · `buyIn: currency==='scout' ? centsToBsd(ticket_cost) : (ticket_cost ?? 0)` (entry_fee-Fallback raus) |
| `prize_pool` | `reward_structure` (+ dynamischer Pot S396) | `prizePool`/`guaranteed`: **entfernen** (dead 0-Konzept) ODER minimal `0`. **Entscheidung: entfernen** (Full = Konzept raus; Displays zeigen ohnehin nur „0 CR" = bedeutungslos) |

**Prize-Display-Entscheid (Full):** die „Preisgeld: 0 CR"-Zeilen (page/AdminEventsTab/EventRow/ClubEventsSection) sind live bedeutungslos (immer 0, neues Modell = dynamisch/reward_structure) → entfernen. `FantasyEvent.prizePool`/`guaranteed` + `getEventAdminStats.totalPool` entfernen. **Prize-INFO bleibt via `rewardStructure` erhalten** (Verteilungs-%, das echte neue Konzept).

## 3. Betroffene Files (Impact-Map, grep-verifiziert)
**Writer (Dual-Write stoppen):**
- `create_user_event` RPC (live, Migration) — schreibt `entry_fee` → entfernen (S156 PATCH-AUDIT gg. Live-functiondef; nur die entry_fee-INSERT-Spalte raus, Rest byte-true)
- `events.mutations.ts:59,62` createEvent Direct-Insert — `entry_fee`/`prize_pool` raus
- `events.mutations.ts:262,298,301` copyEvent (SELECT + clone) — raus
- `app/api/cron/gameweek-sync/route.ts:1640,1689,1690` Event-Klon — `entry_fee`/`prize_pool` raus

**Reader (auf kanonisch umziehen):**
- `eventMapper.ts:35,36,37,38` — buyIn/entryFeeCents (entry_fee-Fallback raus); prizePool/guaranteed entfernen
- `fantasy/types.ts` `FantasyEvent` — `prizePool`/`guaranteed` Felder entfernen
- `events.queries.ts:25,38,126` — 3 SELECT-Listen: `entry_fee`, `prize_pool` raus
- `events.queries.ts:95-114` `getEventAdminStats` — `prize_pool`-SELECT + `totalPool` entfernen (Consumer prüfen)
- `page.tsx:340,349` — entry_fee-Fallback → ticket_cost; prize_pool-Display raus
- `ClubEventsSection.tsx:38,65,68` — `event.entry_fee`/`event.prize_pool` (Reader-Typ prüfen: mapped vs raw) → ticket_cost/currency-aware; prize-Zeile raus
- `AdminEventsTab.tsx:220,228,275` — entry_fee/prize_pool Displays
- `EventRow.tsx:62` — prize_pool Display
- `EventFormModal.tsx:707,721` — entry_fee/prize_pool Form-Felder + isFieldDisabled
- `useEventForm.ts:136,137,301,302,325` — entryFee/prizePool populate + payload
- `admin/hooks/types.ts:137,142` — SortField 'prize_pool' + Label
- `useAdminEventsData.ts:186,187` — prize_pool-Sort
- `events.mutations.ts:401,409,416,417` EDITABLE_FIELDS (upcoming/registering/late-reg/running) — entry_fee/prize_pool raus
- `types/index.ts:760,761` `DbEvent` — entry_fee/prize_pool Felder entfernen (LETZTER Schritt vor DROP)

**Tests (~10 Files):** events-v2.test, useEventForm.test, useAdminEventsData.test, useAdminEventsActions.test, AdminEventsTab.test, helpers.test, schema-contracts.test — Fixtures/Assertions mit entry_fee/prize_pool bereinigen.

## 4. Code-Reading-Liste (VOR Build)
1. **Live `pg_get_functiondef('create_user_event(...)')`** (D87, MONEY) — exakter entry_fee-INSERT + ticket_cost/currency-Setzung, PATCH-AUDIT-Baseline.
2. `fantasy/types.ts` FantasyEvent — welche Felder prizePool/guaranteed, welche Consumer (`grep prizePool|guaranteed`).
3. `ClubEventsSection.tsx` + `AdminEventsTab.tsx` + `EventRow.tsx` — Reader-Typ (mapped FantasyEvent vs raw DbEvent)? bestimmt ob `.entryFeeCents` (mapped) oder `.ticket_cost` (raw).
4. `getEventAdminStats` totalPool-Consumer (`grep totalPool`) — wo angezeigt, safe zu entfernen?
5. `events.mutations.ts` createEvent Insert-Shape + copyEvent — was NOT NULL bleibt nach DROP.
6. `page.tsx:340-349` nextEvent-Typ + formatPrize-Consumer.

## 5. Pattern-References
- S303/S368e/errors-frontend S280 (Removal deckt 5 Achsen: Code/DB/i18n/Tooling/Test-Fixtures — grep `__tests__` einschließen).
- S156 CREATE OR REPLACE PATCH-AUDIT (Money-RPC, Live-functiondef-Baseline, byte-true außer intendiert).
- database.md DROP COLUMN: vor DROP ALLE services + SSR supabaseAdmin-selects; NOT-NULL-Spalte.
- §0 Schnitt-Regel (Subtraktion first-class).

## 6. Acceptance Criteria (executable)
1. `grep -rn "entry_fee\b" src/ | grep -v __tests__ | grep -v "fantasy_entry_fee\|'entry_fee'\|entryFee\b"` → 0 events.entry_fee-Column-Refs (TX-Type 'entry_fee' bleibt, ist separat).
2. `grep -rn "prize_pool" src/ | grep -v __tests__` → 0.
3. Live: `create_user_event`-Smoke (force-rollback) → Event angelegt, `entry_fee`-Spalte existiert nicht mehr / wird nicht geschrieben; ticket_cost/currency korrekt.
4. Live-DB: `information_schema.columns WHERE table_name='events' AND column_name IN ('entry_fee','prize_pool')` → 0 rows (gedroppt).
5. tsc 0 · alle Event-Tests grün.
6. Live-Walk: Admin-Events-Tab + Club-Events-Section + Home nextEvent + user-Event-Erstellung rendern korrekt (kein „0 CR"-Prize-Rest, kein NaN, buyIn korrekt currency-aware).

## 7. Edge Cases
- entry_fee ≠ ticket_cost auf Alt-Rows? → Live: alle gleich (2 Events) ODER beide 0 → kein Backfill nötig; NOT NULL default 0 → DROP safe.
- currency='tickets' Event mit ticket_cost>0: buyIn = count (nicht cents) → Display darf nicht `fmtScout` (cents) nutzen. **Kritisch:** entry_fee-Direkt-Reader die `fmtScout(entry_fee)` machen (cents-Annahme) → auf currency-aware mapped `buyIn` umziehen, nicht blind ticket_cost.
- copyEvent/cron-Klon: NOT-NULL-Spalten nach DROP nicht mehr im Insert nötig (Defaults weg).
- EDITABLE_FIELDS: Admin editiert entry_fee/prize_pool nicht mehr → Form-Feld weg, kein toter Edit-Pfad.
- Alte deployte Chunks SELECTen entry_fee während DROP-Fenster → **2-Phasen-Pflicht** (Code-Deploy killt SELECTs ZUERST, dann DROP).

## 8. Self-Verification Commands
- `grep -rnE "\b(entry_fee|prize_pool)\b" src/ scripts/ | grep -v __tests__ | grep -v fantasy_entry_fee` (0 nach Wave 1)
- `npx tsc --noEmit` · `npx vitest run src/features/fantasy src/components/admin src/lib/services/__tests__/events-v2.test.ts`
- Live: `SELECT column_name FROM information_schema.columns WHERE table_name='events' AND column_name IN ('entry_fee','prize_pool')` (0 nach Wave 2)
- create_user_event force-rollback-Smoke (BEGIN; SELECT create_user_event(...); verify; ROLLBACK)

## 9. Open-Questions (Pflicht-Klärung vs Autonom)
- **Geklärt (CEO):** Full DROP beider Spalten. Prize-Display-Entfernung = autonom (live nur „0 CR", bedeutungslos; rewardStructure trägt die echte Prize-Info).
- **Autonom:** exakte Reader-Typ-Migration (mapped vs raw) pro Display.

## 10. Proof-Plan
- `worklog/proofs/498-*.txt`: (a) create_user_event PATCH-AUDIT-Diff (vorher/nachher functiondef), (b) force-rollback-Smoke, (c) `information_schema` post-DROP (0 rows), (d) tsc+vitest, (e) Live-Walk-Screenshots (Admin/Club/Home).

## 11. Scope-Out
- `ticket_cost`-currency-Overload (cents-bei-scout / count-bei-tickets) NICHT umbauen — bleibt kanonisch wie ist.
- `event_entries.fee_split` (S396 dynamischer Pot) unberührt.
- TX-Type `'entry_fee'` (Wallet-Ledger-Debit-Typ) unberührt — separates Konzept, NICHT die Spalte.
- D-09/D-29 (andere .limit-Caps) separat.

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (in Spec §3) → **Wave 1 BUILD** (Code: Reader/Writer/SELECTs/Type-außer-DbEvent, kein DROP) → tsc+vitest → REVIEW (Cold-Context, Money-RPC-Fokus) → Deploy → **Live-Verify Wave 1** (kein SELECT-Fehler, Displays korrekt) → **Wave 2 BUILD** (DbEvent-Type-Feld raus + DROP-Migration via apply_migration) → Deploy → Live-Verify (information_schema 0) → PROVE → LOG.

## 13. Pre-Mortem (5+)
1. **DROP vor Code-Deploy** → live SELECTs (events.queries) referenzieren tote Spalte → 400-Fehler, /fantasy tot. → **Mitigation: strikt 2-Phasen, DROP erst nach Wave-1-Deploy-Verify.**
2. **create_user_event PATCH-AUDIT-Miss** (S156) → Body-Rewrite verliert einen anderen Patch (Escrow/Guard) → Money-Bruch. → Live-functiondef-Baseline, byte-Diff nur entry_fee-Zeile, force-rollback-Smoke.
3. **currency-Overload-Falle:** entry_fee-Direkt-Reader (`fmtScout(entry_fee)`=cents) blind auf `ticket_cost` → bei currency='tickets' zeigt count als cents (falsch). → auf mapped currency-aware `buyIn` umziehen.
4. **prizePool/guaranteed-Consumer übersehen** → tsc-Fehler (Type-Feld weg) ODER Runtime-undefined. → `grep prizePool|guaranteed` vollständig VOR Type-Entfernung.
5. **Test-Fixtures mit entry_fee/prize_pool** (10 Files) → tsc/vitest rot nach DbEvent-Type-Entfernung. → Fixtures in Wave 1 mit-bereinigen (Removal-5.-Achse S375).
6. **getEventAdminStats.totalPool-Consumer** rendert undefined nach Entfernung. → Consumer-grep + mit-entfernen.
