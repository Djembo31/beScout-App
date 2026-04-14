---
name: Journey 5 — CEO-Approvals Needed (Mystery Box)
description: CEO-Approval-Items AR-42 bis AR-49 aus Journey #5 Audit. Alle Items mit Impact, Empfehlung, Approval-Trigger. Nummeriert fortlaufend von J4 (AR-41).
type: project
status: pending-ceo
created: 2026-04-14
---

# Journey #5 — CEO-Approvals Needed

**7 AR-Items** (AR-42 bis AR-49) — alle aus Journey #5 Mystery Box Audit.

**Approval-Trigger-Erinnerung** (aus `operation-beta-ready.md`):
1. Geld-relevante DB-Migrations
2. User-Facing Compliance-Wording
3. Architektur-Lock-Ins
4. Externe System-Touchpoints

**Empfohlene Prio:**
1. **AR-42 🚨 AKUT** — Equipment-Drops 6 Tage live-broken
2. **AR-46 🚨** — Inventory-Crash fuer 'uncommon'-Legacy-User
3. **AR-47** — Mystery-Box-Disclaimer (User-Facing Compliance)
4. **AR-48** — Drop-Rate-Transparenz (App-Store-Pflicht)
5. **AR-43** — Migration-Drift Full-Sweep (Teil von AR-12/AR-28)
6. **AR-44** — Security-Hardening Template
7. **AR-45** — Legacy-Function-Cleanup
8. **AR-49** — Paid-Mystery-Box Feature-Flag

---

## AR-42 🚨 AKUT — Mystery-Box Equipment-INSERT Column-Fix (6 Tage LIVE-BROKEN)

**Trigger:** #1 Geld-Migration (Equipment = Reward)

**Problem:**
```
Live user_equipment source=mystery_box:
 - newest acquired_at: 2026-04-08 11:02:27   ← VOR Fix-Migration
 - after 2026-04-11 (fix-migration): 0 Rows
```

**Root Cause:** Live-RPC-Body `open_mystery_box_v2` (aus pg_get_functiondef extrahiert):
```sql
INSERT INTO public.user_equipment (user_id, equipment_key, equipment_rank, source)
VALUES (v_uid, v_eq_key, v_eq_rank, 'mystery_box');
```

Tabelle hat Spalte `rank` (aus Migration 20260406180000), NICHT `equipment_rank`. Die Fix-Migration `20260411114600_mystery_box_equipment_branch_fix.sql` hat den Column-Namen falsch gesetzt.

**Live-Impact:**
- Jeder Equipment-Drop (geschätzt ~18% der Opens basierend auf Config) crasht mit PG-Error
- User sieht "Open Error" Toast
- Wenn RPC-Fehler im Equipment-Branch → gesamter `mystery_box_results` INSERT wirft exception
- Daily-Cap oeffnet nicht → User kann mehrmals klicken (Resource-Waste)

**Empfehlung:**
Migration `20260414180000_mystery_box_equipment_rank_column_fix.sql`:
```sql
CREATE OR REPLACE FUNCTION public.open_mystery_box_v2(p_free boolean DEFAULT false)
-- ... (full body)
-- CHANGE: equipment_rank → rank in INSERT
INSERT INTO public.user_equipment (user_id, equipment_key, rank, source)
VALUES (v_uid, v_eq_key, v_eq_rank, 'mystery_box');
-- ... (rest)
```

**PLUS:** 
- REVOKE-Block (siehe AR-44)
- Vollstaendige-SQL-Dump in Migration-File (kein Stub)

**Approval-Entscheidung:**
- (A) **APPROVED** — Fix sofort ausrollen, Migration mit echtem SQL
- (B) Defer — User-Complaint abwarten (3 Equipment-Drops seit 6 Tagen im Normalfall, aber Legacy-High-Streak-User betroffen)

**Empfehlung: (A) — Production-Bug seit 6 Tagen, Fix ist trivial.**

---

## AR-43 — Migration-Drift Full-Sweep (5. Journey in Folge)

**Trigger:** #4 Externe System-Touchpoints + Audit

**Problem:** Lokal 6 Mystery-Box-Migrations, 4 sind Stubs:
```
20260410170000_mystery_box_daily_cap_and_price_change_7d.sql → STUB
20260411114500_mystery_box_daily_cap_opened_at_fix.sql → STUB
20260411114600_mystery_box_equipment_branch_fix.sql → STUB
20260411114700_mystery_box_ticket_source_fix.sql → STUB
```

Remote hat volle SQL mit unterschiedlichen Version-Namen (analog J1-J4). Lokale DB-Reset waere kaputt.

**Mega-Thema:** 5. Journey in Folge mit Migration-Drift-Finding (J1-AR-1, J2B-01, J3B-02, J4B-04, J5B-04). AR-12 (J3) + AR-28 (J4) fordern einen Full-Sweep. Mystery-Box-Migrations koennten in dieses Sweep-Ticket integriert werden.

**Empfehlung:**
- Integrate in AR-12/AR-28 Master-Ticket (jetzt AR-43: "Full Migration-Drift-Resolution")
- Jede Stub-Datei: `pg_get_functiondef()` / `pg_get_tabledef()` aus Live-DB dumpen, als Migration-File committen
- Rule in CLAUDE.md ergaenzen: "Stub-Migrations verboten — jede `apply_migration` MUSS vollstaendige SQL sein"

**Approval:** APPROVED (sauberer Full-Sweep, aber kein Beta-Blocker wenn alle Stubs bekannt sind)

---

## AR-44 — REVOKE/GRANT-Block als Migration-Template-Pflicht

**Trigger:** #4 External Systems + Security

**Problem:**
```sql
-- Fix-Migration 20260411114600_mystery_box_equipment_branch_fix
CREATE OR REPLACE FUNCTION open_mystery_box_v2(...)
  AS $$ ... $$;
-- NO REVOKE/GRANT BLOCK
```

`CREATE OR REPLACE FUNCTION` resetted Execute-Privileges auf Default (PUBLIC + authenticated + anon + service_role). Live-Check zeigt anon=false (moeglicherweise durch Supabase-Auto-Hook), aber ist nicht verlaesslich.

**Vergleich J4:** `earn_wildcards` Exploit war exakt dieses Pattern — ohne REVOKE-Block war anon-aufrufbar.

**Empfehlung:** 
- AR-42 Migration MUSS REVOKE+GRANT explizit haben
- **Template-Regel** in `.claude/rules/database.md`: "Jede CREATE OR REPLACE FUNCTION-Migration MUSS REVOKE+GRANT-Block am Ende haben"
- Audit-Script: `grep -L "REVOKE ALL ON FUNCTION" supabase/migrations/*.sql` auf alle Files mit `CREATE OR REPLACE FUNCTION`

**Approval:** APPROVED (parallel zu AR-42, im gleichen Migration-Commit)

---

## AR-45 — DROP FUNCTION open_mystery_box v1 Legacy

**Trigger:** #1 Geld-Migration (RPC-Cleanup)

**Problem:**
- `open_mystery_box(boolean)` v1 ist noch GRANT'd an authenticated + postgres + service_role
- Service nutzt nur v2 (`src/lib/services/mysteryBox.ts:24`)
- Kein Code-Konsument ruft v1 direkt auf
- **Risiko:** API-Integrator oder Legacy-Admin-Tool koennte v1 aufrufen und kriegt keinen Daily-Cap-Check
- Rename-Pattern wie in J2-AR-1 (calculate_dpc_of_week → calculate_sc_of_week via Alias + Drop)

**Empfehlung:**
Migration `20260414180100_drop_legacy_mystery_box_v1.sql`:
```sql
DROP FUNCTION IF EXISTS public.open_mystery_box(boolean);
```

**Approval:** APPROVED (low-risk, Cleanup, kein User-Impact)

---

## AR-46 🚨 — Mystery Box 'uncommon' Legacy-Rows Resolution

**Trigger:** #1 Geld-Migration (Legacy-Rows in Reward-Tabelle)

**Problem:**
```sql
SELECT rarity, COUNT(*) FROM mystery_box_results GROUP BY rarity:
 - common: 13, rare: 4, epic: 4, legendary: 1, uncommon: 3
```

`MysteryBoxRarity` Type: `'common' | 'rare' | 'epic' | 'legendary' | 'mythic'` — **'uncommon' fehlt**.

`RARITY_CONFIG['uncommon']` = undefined.

`MysteryBoxHistorySection:93` → `rarityCfg.bgClass` → TypeError → Inventory-History-Tab crasht.

**Betroffene User:** 3 Users mit 'uncommon'-History-Rows. Ruft einer davon `/inventory?tab=history` auf, crasht Seite.

**Zwei Optionen:**

**Option A: Backfill Migration** (kleinerer Code-Change):
```sql
UPDATE public.mystery_box_results SET rarity='rare' WHERE rarity='uncommon';
-- +optional: UPDATE CHECK-Constraint, remove 'uncommon' from CHECK
```
- Pro: Type bleibt clean, kein 'uncommon' UI
- Con: historische Daten modifiziert (Audit-Trail)

**Option B: Type-Erweiterung** (daten-erhaltend):
```ts
export type MysteryBoxRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
// + RARITY_CONFIG['uncommon'] Entry
```
- Pro: Daten-history erhalten
- Con: zukuenftige Rolls sollten 'uncommon' NIE mehr returnen (config hat es nicht)

**Empfehlung: Option B** — minimal invasive, preserves data, 3 Users betroffen aber Fix ist in Code (nicht DB).

**Ceo-Decision:** (A) oder (B) oder (defer=warten bis User-Complaint)

**Fix ist autonom-fixable wenn CEO (B) waehlt** (Healer kann Type+Config erweitern).

---

## AR-47 — MysteryBoxDisclaimer Component + Integration

**Trigger:** #2 User-Facing Compliance-Wording

**Problem:**
- `TradingDisclaimer` auf 6 Entry-Pages
- Fantasy-Disclaimer pending (J4-AR-33)
- Mystery-Box hat **NICHTS**
- Gambling-adjacent Mechanik (Zufalls-Reward) ohne User-Warnung

**Empfehlung:** 
- Neue Component `src/components/compliance/MysteryBoxDisclaimer.tsx` (analog TradingDisclaimer)
- Text-Draft DE:
  > "Mystery Box Belohnungen sind rein virtuelle Plattform-Inhalte ohne Geldwert. Drop-Raten basieren auf Zufall und koennen jederzeit angepasst werden. Keine Auszahlung, keine Uebertragung möglich. Nur für Nutzer ab 18 Jahren empfohlen."
- TR-Pendant: 
  > "Gizem Kutusu ödülleri tamamen sanal platform içeriğidir. Düşme oranları rastgeledir ve istendiği zaman ayarlanabilir. Nakit çekilemez, devredilemez. 18 yaş altı için önerilmez."
- Integration: MysteryBoxModal (unter Reward-Preview), MysteryBoxHistorySection (ueber Liste)

**Approval-Entscheidung:**
- (A) **APPROVED** — Text + Integration exakt wie Draft
- (B) Text-Revisionen vorgeben
- (C) Defer — post-Beta

**Empfehlung: (A)** — simpel, klar, Beta-Gate.

---

## AR-48 — Drop-Rate-Transparenz UI-Exposed (App-Store 3.1.1 Pflicht)

**Trigger:** #2 Compliance-Wording + #3 Architektur (App-Store-Submission-Readiness)

**Problem:**
- `mystery_box_config` hat Drop-Raten (Common 45%, Rare 30%, Epic 17%, Legendary 6%, Mythic 2%)
- RLS public SELECT (technisch lesbar), aber nirgendwo im UI sichtbar
- `REWARD_PREVIEW` (MysteryBoxModal.tsx:28) zeigt nur Reward-Typen, keine Raten

**Regulatorisches:**
- **Apple App Store Review Guidelines 3.1.1:** "Apps offering 'loot boxes' or other mechanisms that provide randomized virtual items for purchase must disclose the odds of receiving each type of item to customers prior to purchase"
- Relevant fuer iOS-App-Submission (Post-Beta-Roadmap)
- Auch fuer Google Play + China + Belgian Gaming Commission relevant

**Empfehlung:**
1. MysteryBoxModal REWARD_PREVIEW erweitern:
   ```
   Gewöhnlich (45%)   Tickets
   Selten (30%)       Tickets / Equipment R1
   Episch (17%)       Tickets / Equipment R1-R2
   Legendär (6%)      Tickets / Equipment R1-R3 / Credits
   Mythisch (2%)      Equipment R3-R4 / Credits
   ```
2. Drop-Raten dynamisch aus `mystery_box_config` laden (via neuen Service-Call)
3. Admin-Panel: Drop-Rate-Editor mit Preview
4. `mystery_box_config` RLS von public auf service_role restrict (verhindert User-Reverse-Engineering)

**Approval-Entscheidung:**
- (A) **APPROVED** — alle 4 Schritte
- (B) Nur (1) + (2), Admin-Panel + RLS post-Beta

**Empfehlung: (A)** — vollstaendig, aber Admin-Panel kann waves-artig nachgezogen werden.

---

## AR-49 — Paid-Mystery-Box Feature-Flag (analog PAID_FANTASY_ENABLED)

**Trigger:** #3 Architektur-Lock-In

**Problem:**
- RPC `open_mystery_box_v2` hat `IF NOT p_free THEN ... UPDATE user_tickets SET balance = balance - v_effective_cost`
- UI nutzt immer `hasFreeBox` (daily free), aber Paid-Path im RPC ist live
- `MYSTERY_BOX_BASE_COST = 15` noch in Frontend-Code
- Legacy 18 paid_opens in DB (vor Track C1 removed paid-UI)

**Analogie J4:** `PAID_FANTASY_ENABLED=false` + 6 UI-Touchpoints gated → paid-Fantasy-Features offline

**Risiko:** 
- Phase 4 (Paid Fantasy + Paid Mystery Box) braucht MGA-Lizenz
- Ohne Feature-Flag koennte zukuenftige Aenderung paid-Path aus Versehen aktivieren
- business.md-Regel: *NICHT BAUEN heisst auch NICHT VORBEREITEN*

**Empfehlung:**
- Env-Var `PAID_MYSTERY_BOX_ENABLED=false` (wie PAID_FANTASY_ENABLED)
- Frontend: `handleOpenMysteryBox` throws wenn `!featureFlag && !free`
- Backend: RPC-Guard am Anfang `IF NOT p_free AND NOT current_setting('app.paid_mystery_box_enabled', true)::boolean THEN RETURN error`
- Alternativ: paid-Path aus RPC komplett entfernen (destruktiver aber clean)
- Legacy 18 paid_opens als Historical-Data akzeptabel (vor Feature-Removal)
- business.md: neue Regel "Loot-Box-Regulierung + Paid-Opens Phase 4"

**Approval-Entscheidung:**
- (A) Feature-Flag hinzufuegen (erhalte paid-Path fuer Phase 4)
- (B) Paid-Path komplett entfernen (neue Migration, Rollback auf v1)
- (C) Defer — post-Beta

**Empfehlung: (A)** — konservativ, Phase-4-Ready, kleinster Change.

---

## Summary

| # | Item | Trigger | Severity | Aufwand |
|---|------|---------|----------|---------|
| AR-42 | 🚨 Equipment-Column-Fix | Geld-Migration | CRITICAL | 15 Min |
| AR-46 | 🚨 'uncommon' Legacy | Geld-Migration | CRITICAL | 10 Min (Option B) |
| AR-47 | MysteryBoxDisclaimer | Compliance-Wording | CRITICAL | 30 Min |
| AR-48 | Drop-Rate-Transparenz | Compliance + App Store | HIGH | 45 Min |
| AR-43 | Migration-Drift Sweep | External Systems | HIGH | 20 Min (Teil v. AR-28) |
| AR-44 | REVOKE-Block Template | Security | HIGH | 15 Min (mit AR-42) |
| AR-45 | DROP v1 Legacy | Cleanup | MEDIUM | 10 Min |
| AR-49 | Paid-MB Feature-Flag | Architektur | MEDIUM | 30 Min |

**Total Aufwand:** ~2.5 Stunden wenn alle APPROVED (Schnellbahn-Pattern wie J2/J3/J4).

**CEO-Schnellbahn-Kandidat:** JA — alle 8 Items haben klare Empfehlungen, CRITICAL-Items sind no-brainers (Production-Bugs), HIGH-Items sind Template-Hardening + App-Store-Pflicht.
