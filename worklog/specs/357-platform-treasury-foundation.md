# Slice 357 — Plattform-Treasury Topf-Fundament (E3-1)

**Slice-Type:** Migration + Service + UI (cross-domain, Money-Infra)
**Größe:** L
**CEO-Scope:** JA — Money-Infra + neue SECURITY-DEFINER-RPCs + neue Money-Tabelle (§3). Epic CEO-approved via **D96**.
**Epic:** E3 Plattform-Treasury (BeScout-Topf), Slice 1 von 5. Plan-Anker: `worklog/notes/358-platform-treasury-epic.md`.

> Hinweis Nummerierung: Die notes-Files `357-…`/`358-…` sind Planungs-Notizen (Ordner `notes/`), kein Slice-Counter. Letzter echter Slice-Spec = 356 → dieser Slice = **357**.

---

## 1. Problem-Statement (mit Evidence)

**Befund (Live-verifiziert 2026-06-23, alle 6 Fee-RPCs via `pg_get_functiondef`, D87 — siehe `docs/knowledge/domain/treasury.md` §10 + D96):** Der **Plattform-Anteil JEDER Fee-Quelle wird verbrannt** — dem Zahler abgezogen, auf KEIN Konto gebucht, weg aus dem Umlauf. PBT-Anteile → `pbt_treasury` ✅, Club-Anteile → `club_treasury_ledger` ✅, **nur der Plattform-Anteil verbrennt überall.** Es existiert **kein Plattform-Konto** (live nur `club_treasury_ledger` per-Club + `pbt_treasury`). BeScout fängt damit technisch **0 €** seiner eigenen Fees auf.

| Quelle | Plattform-% | RPC | heute |
|---|---|---|---|
| Trading | 3,5 % | `buy_player_sc` | 🔥 `trades.platform_fee` notiert, nicht gebucht |
| IPO | 10 % | `buy_from_ipo` | 🔥 `trades.platform_fee` notiert, nicht gebucht |
| Polls | 20 % | `cast_community_poll_vote` | 🔥 `community_poll_votes.platform_share` notiert |
| Research | 20 % | `unlock_research` | 🔥 `research_unlocks.platform_fee` notiert |
| Bounty | 5 % | `approve_bounty_submission` | 🔥 nicht mal notiert |
| P2P | 2 % | `accept_offer` | 🔥 `trades.platform_fee` notiert |

**Entscheidung D96:** Plattform-Treasury als echtes Konto bauen (Saldo + append-only Ledger, Mirror Club-Treasury 329). Modell-Shift deflationär → zirkulär. **Diese Slice (E3-1) baut NUR das leere Fundament** — die Fee-Ströme REIN kommen in Slice 2 (eine Quelle/Slice, Trading zuerst), RAUS (Monats-Liga/BeScout-Events) in Slice 3/4. Der Topf startet bei **0**.

## 2. Lösungs-Design

Spiegelbild des Club-Treasury-Fundaments (Slice 329/329b/330b), nur **Single-Pot** (kein per-Club):

1. **Lock-Anker `platform_treasury`** — Singleton-Tabelle (genau 1 Row, `id boolean PK DEFAULT true CHECK (id)`). Reiner Serialisierungspunkt: `PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE` ersetzt das `clubs … FOR UPDATE` aus `book_club_treasury`. Direkter Mirror des bewährten Row-Lock-Patterns (kein magischer Advisory-Lock-Key — discoverable + self-documenting "der Topf").
2. **Ledger `platform_treasury_ledger`** — append-only, Spalten wie `club_treasury_ledger` aber **ohne `club_id`** und **`source` statt `type`** (Fee-Quellen-Dimension): `id, direction(credit|debit), source, amount(>0), balance_after, reference_id, description, created_at`.
3. **Append-only** — Wiederverwendung des bestehenden generischen `public.prevent_treasury_ledger_mutation()` (GUC `bescout.allow_treasury_mutation`) als BEFORE UPDATE/DELETE-Trigger (DRY, identisch zu 329).
4. **RPC `book_platform_treasury(p_direction, p_source, p_amount, p_ref, p_desc) → bigint`** — exakter Mirror von `book_club_treasury` minus `club_id`. Saldo = `SUM(CASE direction credit/debit)` unter dem Singleton-Row-Lock (race-frei, S329-Pattern). REVOKE-only (Trigger/Definer-RPCs rufen als Owner).
5. **Read-RPC `get_platform_balance() → json`** — Platform-Admin-guarded, `{success, balance, total_in, total_out}`. Read-only (kein Lock nötig).
6. **Read-RPC `get_platform_treasury_ledger(p_limit) → jsonb`** — Platform-Admin-guarded Kontoauszug, Mirror `get_club_treasury_ledger`.
7. **RLS** — `ENABLE RLS + 0 Policies + REVOKE ALL FROM anon, authenticated` auf beiden Tabellen (Cron-Only/Definer-Only-Pattern, `database.md`). Kein Client-Direktzugriff.
8. **Service** (`platformAdmin.ts`) — `getPlatformTreasuryBalance()` + `getPlatformTreasuryLedger(limit)`. Neuer Type `DbPlatformLedgerEntry` (`source` statt `type`).
9. **UI** (`AdminTreasuryTab.tsx`) — neue Card „Plattform-Topf (BeScout)" mit Saldo-StatCard + REIN/RAUS-Totals + Kontoauszug-Liste. Empty-State („noch keine Buchungen — Fees fließen ab Slice 2 ein"). DE+TR.

**Kein Backfill:** verbrannte Fees wurden nie gebucht → kein historischer Saldo rekonstruierbar. Topf startet sauber bei 0 (anders als 329, das Eröffnungssalden aus `trades.club_fee` aggregierte).

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/2026XXXX_slice_357_platform_treasury_foundation.sql` | NEU | Tabellen + 3 RPCs + Trigger + RLS |
| `src/types/index.ts` | +`DbPlatformLedgerEntry` + `PlatformTreasuryBalance` | Service-Shapes |
| `src/lib/services/platformAdmin.ts` | +2 Funktionen | Saldo + Kontoauszug lesen |
| `src/lib/services/__tests__/platformAdmin.test.ts` | +Tests (falls existent) ODER neu | Service-Shape-Tests |
| `src/app/(app)/bescout-admin/AdminTreasuryTab.tsx` | +Plattform-Topf-Card | Admin-Sichtbarkeit (DoD) |
| `messages/de.json` + `messages/tr.json` | +i18n-Keys `bescoutAdmin.platformPot*` | DE+TR |

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ erledigt

| # | File | Zweck | Befund |
|---|------|-------|--------|
| 1 | **Live `pg_get_functiondef('book_club_treasury')`** (D87) | RPC-Blueprint | ✅ SUM-Pattern + `clubs FOR UPDATE` + REVOKE-only verifiziert |
| 2 | Live `pg_get_functiondef('get_club_treasury_ledger')` | Read-RPC-Blueprint | ✅ Admin-Guard (`club_admins OR platform_admins`) + jsonb_agg + `LIMIT GREATEST(LEAST(p_limit,200),1)` |
| 3 | `migrations/…_slice_329_club_treasury_ledger.sql` | Tabelle+RLS+Trigger+Grants-Vorlage | ✅ `ENABLE RLS + REVOKE + 0 Policies`, generischer `prevent_treasury_ledger_mutation` |
| 4 | `migrations/…_slice_329b_treasury_balance_sum.sql` | balance_after race-frei (SUM unter Lock) | ✅ v2 = `SUM(CASE direction)` statt last-row |
| 5 | Live `club_treasury_ledger` columns + CHECK | Schema-Mirror | ✅ direction(credit/debit), type-enum, amount>0, balance_after |
| 6 | Live `pg_policies WHERE tablename='club_treasury_ledger'` | RLS-Stand | ✅ 0 Policies (Definer-Only) |
| 7 | `src/lib/services/platformAdmin.ts` `getTreasuryStats` | Service-Integrationspunkt | ✅ AdminTreasuryTab konsumiert `getTreasuryStats`, nicht club.ts |
| 8 | `src/app/(app)/bescout-admin/AdminTreasuryTab.tsx` | UI-Erweiterungspunkt | ✅ StatCard/Card/FlowRow-Pattern, `fmt(cents/100)`, `useTranslations('bescoutAdmin')` |
| 9 | `src/lib/services/club.ts` `getClubTreasuryLedger` | Service-Mirror | ✅ `supabase.rpc(...)` + `throw` + `as DbTreasuryLedgerEntry[]` |
| 10 | `src/types/index.ts` `DbTreasuryLedgerEntry` | Type-Mirror | ✅ direction/type/amount/balance_after/description/created_at |
| 11 | Live `platform_admins` existiert + `get_club_balance`-Grants | Auth-Guard + Grant-Muster | ✅ platform_admins existiert; Grants `authenticated+postgres+service_role` |

## 5. Pattern-References

- **S329 Bank-Ledger `balance_after`: SUM unter Row-Lock** (`errors-db.md` „Bank-Ledger") — NIE last-row via created_at/id; SUM(CASE direction) unter `FOR UPDATE`.
- **S329 SUM(bigint)=numeric Cast-Trap** — `COALESCE(SUM(x),0)::bigint`, `NULL::uuid`.
- **D39 Trigger+GUC Append-Only** — `prevent_treasury_ledger_mutation` Wiederverwendung.
- **AR-44 REVOKE/GRANT** (`database.md`) — `CREATE OR REPLACE` resettet Privilegien; REVOKE PUBLIC/anon/authenticated, gezielt GRANT.
- **RLS Cron-Only-Table** (`database.md`, S197d) — ENABLE RLS + 0 Policies = bewusstes Pattern, kein „fehlende Policy".
- **Return-Shape Discriminated Union** (S168) — `get_platform_balance` Success `{success:true,…}`.
- **S354 `*!inner`-Embed = Live-Render-Verify** — hier nicht relevant (keine PostgREST-Embeds), aber UI-Card 1× live gegen bescout.net verifizieren.
- **S330 transactions.type/CHECK 4-File-Sync** — hier kein `transactions`-Write; `source`-CHECK lebt nur in dieser Tabelle, kein Cross-File-Sync nötig.

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** `platform_treasury` + `platform_treasury_ledger` existieren. VERIFY: `SELECT to_regclass('public.platform_treasury_ledger')` → not null. FAIL-IF: null.
- **AC-2 [HAPPY]** Singleton-Row existiert genau 1×. VERIFY: `SELECT count(*) FROM platform_treasury` → 1. Zweiter INSERT scheitert. FAIL-IF: ≠1 oder zweiter INSERT erlaubt.
- **AC-3 [HAPPY]** `book_platform_treasury('credit','trading',1000,…)` → returnt 1000, fügt 1 Ledger-Row mit `balance_after=1000`. VERIFY: Money-Smoke (BEGIN/ROLLBACK).
- **AC-4 [HAPPY]** Mehrere Buchungen in 1 TX: credit 1000 → credit 500 → debit 300 ⇒ balance_after-Kette 1000/1500/1200, `get_platform_balance().balance=1200`. VERIFY: Money-Smoke Zero-Sum. FAIL-IF: balance_after race (gleicher prev gelesen).
- **AC-5 [GUARD]** `book_platform_treasury(_,_,0,…)` und `(_,_,NULL,…)` → RETURN NULL, kein Ledger-Insert. VERIFY: Smoke + `count(*)` unverändert.
- **AC-6 [GUARD]** `direction` außerhalb (credit|debit) und `amount<=0` werden vom CHECK geblockt. VERIFY: erwarteter 23514-Error im Smoke.
- **AC-7 [SECURITY]** `get_platform_balance()` als anon/unautorisiert → `auth_required`/`not_authorized`. VERIFY: Guard-Body + Grant-Listing. FAIL-IF: anon kann lesen.
- **AC-8 [SECURITY]** `platform_treasury_ledger` 0 Policies + REVOKE anon/authenticated. VERIFY: `SELECT policyname,cmd FROM pg_policies WHERE tablename='platform_treasury_ledger'` → leer; `has_table_privilege('anon','platform_treasury_ledger','SELECT')` → false.
- **AC-9 [GUARD]** UPDATE/DELETE auf Ledger-Row ohne GUC → Exception. VERIFY: Smoke `UPDATE … → 'append_only'`.
- **AC-10 [HAPPY]** `get_platform_treasury_ledger(5)` → jsonb-Array neueste-zuerst, ≤5. VERIFY: Smoke nach 3 Buchungen → 3 Rows DESC.
- **AC-11 [UI]** AdminTreasuryTab rendert Plattform-Topf-Card mit Saldo (0 initial) + Empty-State Kontoauszug. VERIFY: tsc + Playwright post-Deploy gegen bescout.net (DE+TR).

## 7. Edge Cases

| # | Case | Verhalten |
|---|------|-----------|
| 1 | amount = 0 / NULL | RETURN NULL, no-op (AC-5) |
| 2 | amount < 0 | CHECK `amount>0` blockt (23514); RPC nimmt nur positive + direction trägt Vorzeichen |
| 3 | direction = 'foo' | CHECK blockt |
| 4 | source nicht im Enum | CHECK blockt (23514) — bewusst, neue Quelle = CHECK-Erweiterung im jeweiligen Slice |
| 5 | 2 parallele Buchungen | Singleton-Row-Lock serialisiert → korrekte balance_after-Kette |
| 6 | Leerer Topf | `get_platform_balance().balance=0` (COALESCE), Ledger jsonb `[]` |
| 7 | UPDATE/DELETE Ledger | Trigger-Exception (Append-Only), Bypass nur via `SET LOCAL bescout.allow_treasury_mutation` |
| 8 | Singleton Doppel-INSERT | PK `id=true` + CHECK → ON CONFLICT DO NOTHING in Migration; zweiter manueller INSERT scheitert |
| 9 | get_platform_balance ohne auth | `auth_required` Exception |
| 10 | get_*_ledger p_limit NULL/0/>200 | `GREATEST(LEAST(COALESCE(p_limit,50),200),1)` clamped |
| 11 | UI lädt vor RPC-Deploy | Service wirft → Card zeigt Error/0 (kein Crash); getrennter try |

## 8. Self-Verification Commands

```bash
# Schema da?
# SELECT to_regclass('public.platform_treasury'), to_regclass('public.platform_treasury_ledger');
# RPC-Signaturen + Body
# SELECT pg_get_functiondef('public.book_platform_treasury(text,text,bigint,uuid,text)'::regprocedure);
# SELECT pg_get_functiondef('public.get_platform_balance()'::regprocedure);
# CHECK-Drift
# SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='platform_treasury_ledger'::regclass;
# RLS
# SELECT policyname,cmd FROM pg_policies WHERE tablename IN ('platform_treasury','platform_treasury_ledger');
# Grants
# SELECT has_table_privilege('anon','platform_treasury_ledger','SELECT');  -- false erwartet
# Money-Smoke (BEGIN; … ROLLBACK;) — Zero-Sum credit/debit, balance_after-Kette, append-only-Exception
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/platformAdmin.test.ts
# Migration-AR-44-Audit
grep -q "REVOKE EXECUTE" supabase/migrations/*slice_357*.sql
```

## 9. Open-Questions

- **CEO-Zone (auf Slice 2 vertagt, NICHT in dieser Slice):** „voller Auffang vs. Teil-Burn/Cap" (ADR-026-Inflations-Schutz) ist erst relevant wenn Fees tatsächlich REIN fließen. Slice 1 baut den leeren Topf — die Buchungs-Policy entscheidet Slice 2.
- **Autonom-Zone (CTO, entschieden):** (a) Lock-Anker = Singleton-Tabelle statt Advisory-Lock (Mirror 329, discoverable). (b) Spalte `source` statt `type` (Plan-Wording). (c) `source`-CHECK enthält schon alle 8 bekannten Werte der Epic-Sequenz (6 REIN + 2 RAUS), kommentiert nach Slice — vermeidet CHECK-Churn über Slice 2-4. (d) Kein Backfill.
- **Klärung erledigt:** `platform_admins`-Tabelle existiert live (Guard-Basis bestätigt).

## 10. Proof-Plan

- `worklog/proofs/357-money-smoke.txt` — BEGIN/ROLLBACK: credit/credit/debit balance_after-Kette + get_platform_balance + append-only-Exception + amount=0-no-op.
- `worklog/proofs/357-rpc.txt` — `pg_get_functiondef` der 3 RPCs + CHECK-defs + RLS/Grants-Listing.
- `worklog/proofs/357-vitest.txt` — Service-Tests grün.
- `worklog/proofs/357-ui.png` — Playwright AdminTreasuryTab Plattform-Topf-Card (post-Deploy, DE+TR) — als post-Deploy markiert.

## 11. Scope-Out

- **NICHT** Fee-Ströme REIN buchen (Slice 2 — eine Quelle/Slice, Trading zuerst).
- **NICHT** Monats-Liga/BeScout-Events RAUS aus Topf (Slice 3/4).
- **NICHT** den bestehenden „platformFeesBurned"-Stat ändern (gehört zu Slice 2, wenn Burn → Topf umgestellt wird).
- **NICHT** Cron/Auszahlung/Deckungs-Check (Slice 3).
- **NICHT** Withdrawal/EUR-Cash-out (Phase 2).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — neue isolierte Tabellen, 0 bestehende Consumer; Integrationspunkte in §3/§4 kartiert) → BUILD (selbst, Money §3) → REVIEW (reviewer-Agent Pflicht, Money) → PROVE (Money-Smoke + RPC + vitest + UI-post-Deploy) → LOG (+ treasury.md §10 „Bau-Stand" updaten = Wissens-Kopplung E0-W2gov).

## 13. Pre-Mortem (L-Pflicht, ≥5)

1. **balance_after-Race** — zwei Buchungen lesen gleichen prev-SUM → Saldo falsch. → Singleton-Row-Lock VOR SUM (S329b exakt gespiegelt); Money-Smoke AC-4 beweist Kette.
2. **SUM(bigint)=numeric Signatur-Fail** — `book_platform_treasury(…, SUM(x), …)` failt. → in dieser Slice kein SUM-als-Argument (Buchung nimmt skalaren p_amount); interner SUM ist `bigint`-Aggregat in Variable, kein Funktions-Argument. Risiko niedrig, dennoch `::bigint` wo aggregiert.
3. **AR-44 vergessen** — `CREATE OR REPLACE` öffnet PUBLIC → anon kann RPC rufen. → REVOKE-Block für alle 3 RPCs + grep-Gate in §8 + Reviewer prüft.
4. **RLS missverstanden** — Reviewer/Audit flaggt „0 Policies = Leck". → Kommentar im Migration-File „Cron/Definer-Only-Pattern (S197d)", AC-8 beweist anon=false.
5. **Singleton kaputt** — mehrere Rows möglich → Lock-Anker uneindeutig. → `id boolean PK DEFAULT true CHECK(id)` erzwingt Max-1-Row; `ON CONFLICT DO NOTHING` beim Seed.
6. **UI-Crash bei fehlendem RPC** (Deploy-Race Migration↔Frontend) → getrennter try/catch in Card, Saldo-Default 0, kein Tab-Crash (Edge 11).
7. **i18n-Key-Leak** — neue Card-Keys nur DE → TR sieht DE/MISSING. → DE+TR gleichzeitig, namespace-aware (`bescoutAdmin`).
