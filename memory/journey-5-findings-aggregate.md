---
name: Journey 5 — Aggregated Findings (Mystery Box)
description: Synthese aus 3 parallel Audits (Frontend/Backend/Business). Autonom-Fixable vs CEO-Approval. Mehrere LIVE-BROKEN Bugs aufgedeckt.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #5 — Aggregated Findings (Mystery Box)

**Total: 35 Findings — 8 CRITICAL + 12 HIGH + 10 MEDIUM + 5 LOW**

Quellen: [journey-5-frontend-audit.md](journey-5-frontend-audit.md) (12), [journey-5-backend-audit.md](journey-5-backend-audit.md) (13), [journey-5-business-audit.md](journey-5-business-audit.md) (10)

**Verteilung:**
- Frontend: 2C + 4H + 4M + 2L
- Backend: 3C + 5H + 3M + 2L
- Business: 3C + 3H + 3M + 1L

---

## 🚨 AKUT — 2 LIVE-BROKEN CRITICAL BUGS

### J5B-01 🚨 Equipment-Drops KOMPLETT KAPUTT seit 2026-04-08 (6 Tage broken!)

**Beweis:**
```sql
-- user_equipment source=mystery_box:
oldest_box_eq: 2026-04-07 00:41:42
newest_box_eq: 2026-04-08 11:02:27
after_fix_count: 0   -- ← KEINE Drops seit Fix-Migration 2026-04-11!
```

**Root Cause:** Live-RPC-Body `open_mystery_box_v2` (aus pg_get_functiondef):
```sql
INSERT INTO public.user_equipment (user_id, equipment_key, equipment_rank, source)
```
Tabelle hat Spalte `rank`, nicht `equipment_rank`. Fix-Migration `20260411114600` hat den Column-Namen falsch aufgenommen.

**Impact:** 
- Jeder Equipment-Drop wirft PG-Error `column "equipment_rank" does not exist`
- Der Error wird im RPC aufgefangen? → Nein, er propagiert.
- User sieht "Open Error" Toast. Modal wirft zurueck auf idle.
- 6 Tage live-broken, betrifft ~18% aller Drops (Equipment-Drop-Weight in Config).

**Fix-Owner:** Backend-Migration (CEO-Approval Trigger #1 Geld-relevant da Equipment = Reward). → **AR-43**

### J5B-08 🚨 Legacy 'uncommon' Rarity KANN `/inventory?tab=history` CRASHEN

**Beweis:** 
- 3 Rows in `mystery_box_results` mit `rarity='uncommon'` live
- `MysteryBoxRarity` Type: `'common' | 'rare' | 'epic' | 'legendary' | 'mythic'`
- `RARITY_CONFIG['uncommon']` = undefined
- `MysteryBoxHistorySection:93-135` nutzt `rarityCfg.bgClass`, `rarityCfg.textClass`, `rarityCfg.borderClass`, `rarityCfg.label_de` → TypeError

**Impact:**
- User mit 'uncommon'-History-Row ruft `/inventory?tab=history` auf → Render crasht.
- 3 Users (die Opens mit uncommon vor dem Type-Update hatten) können Inventory nicht öffnen.

**Fix-Owner:** Entweder Type-Erweiterung + RARITY_CONFIG['uncommon']-Entry (autonom fixable) ODER Migration UPDATE mystery_box_results SET rarity='rare' WHERE rarity='uncommon' (CEO-Approval Geld-Tabelle). → **AR-46**

---

## Cross-Audit Overlaps

| Bug | FE | BE | Business |
|-----|----|----|----------|
| Contract-Drift Equipment-Column | J5F-02 | J5B-01 | — |
| Race-Condition Daily-Cap | J5F-05 (staleTime 30s) | J5B-02 (keine Row-Lock) | — |
| Cosmetic Name-Display fehlt | J5F-06 | J5B-12 | J5Biz-09 |
| Rarity Label-DE-hardcoded | J5F-07 | — | — |
| bCredits/CR/Credits-Mix | J5F-08, J5F-10 | — | J5Biz-04 |
| Migration-Drift (Stub-Files) | — | J5B-04 | — |
| Disclaimer fehlt | — | — | J5Biz-02 |
| Drop-Rate-Transparenz | J5F-08 | J5B-10 | J5Biz-03 |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO)

### Group A — P0 Production-Fix + Type-Safety

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-01 | CRITICAL | `src/types/index.ts` | `MysteryBoxRarity` Type um `'uncommon'` erweitern (abwaertskompatibel fuer Legacy-Rows) | J5B-08 |
| FIX-02 | CRITICAL | `src/components/gamification/rarityConfig.ts` | `uncommon` Entry hinzufuegen (zwischen common und rare, sky-Theme) | J5B-08 |
| FIX-03 | HIGH | `src/components/gamification/MysteryBoxModal.tsx` | `isAnimating` auch auf Reduced-Motion-Branch anwenden (`preventClose` während RPC-Call) | J5F-03 |
| FIX-04 | HIGH | `src/lib/queries/mysteryBox.ts` | `staleTime: 0` fuer `useHasFreeBoxToday` Query | J5F-05 |
| FIX-05 | HIGH | `src/components/gamification/MysteryBoxModal.tsx` + `MysteryBoxHistorySection.tsx` | Rarity-Label locale-aware via `useLocale()` (nicht hardcoded `label_de`) | J5F-07 |
| FIX-06 | HIGH | `src/lib/services/mysteryBox.ts` (+ Modal caller) | `mapErrorToKey()` fuer RPC-Errors (`daily_free_limit_reached`, `Not enough tickets`) analog J1-J4 Pattern | J5B-13 |

### Group B — Cosmetic Display + Polish

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-07 | MEDIUM | `MysteryBoxModal.tsx:438` | Cosmetic-Name im RewardDisplay anzeigen (via `result.cosmetic_name ?? cosmetic_id`) — Service bereits returnt Name | J5F-06 |
| FIX-08 | MEDIUM | `MysteryBoxHistorySection.tsx:46` | Cosmetic-Historie: Cosmetic-Name statt generisches "Cosmetic" | J5F-06, J5Biz-09 |
| FIX-09 | MEDIUM | `MysteryBoxHistorySection.tsx:95` | Date-Format locale-aware (`useLocale()`) | J5F-09 |
| FIX-10 | MEDIUM | `MysteryBoxModal.tsx:28` REWARD_PREVIEW | i18n via `t('possibleRewards.common/rare/epic/legendary/mythic')` + Drop-Raten visible | J5F-08, J5Biz-03 |
| FIX-11 | LOW | `MysteryBoxModal.tsx:66-79` | `ResizeObserver` auf Canvas-Parent fuer Orientation-Change | J5F-11 |
| FIX-12 | LOW | `/home` Mystery Box Card | `<Card as="button">` oder role="button" + aria-label | J5F-12 |
| FIX-13 | MEDIUM | `MysteryBoxHistorySection.tsx` | `ticket_cost` anzeigen (Kosten-Transparenz) | J5Biz-06 |

### Group C — bCredits/Credits-Vokabel-Sweep (erweitert J4 AR-32)

| ID | Severity | Keys | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-14 | HIGH | `bcreditsEarned` DE/TR, REWARD_PREVIEW Text | "bCredits" → "Credits" einheitlich (parallel zu AR-32 J4-Schnellbahn) | J5F-08, J5Biz-04 |

**Total autonome Fixes: 14** (2 CRITICAL + 4 HIGH + 6 MEDIUM + 2 LOW)

**Healer-Strategie:**
- **Healer A (P0 Type-Fix + Money-Safety):** FIX-01 + FIX-02 (Type + RARITY_CONFIG), FIX-03 (preventClose), FIX-04 (staleTime), FIX-06 (i18n-mapping) — ~1.5h
- **Healer B (Locale + Display):** FIX-05, FIX-07, FIX-08, FIX-09, FIX-10 — ~2h
- **Healer C (Polish):** FIX-11, FIX-12, FIX-13, FIX-14 — ~1h

---

## CEO-Approval-Triggers (siehe `journey-5-ceo-approvals-needed.md`)

**7 CEO-Approval-Items:**

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-42** | **🚨 Geld-Migration** | **CRITICAL P0** | Mystery-Box Equipment-INSERT-Column-Fix (`equipment_rank` → `rank` in RPC-Body). 6 Tage live-broken, jeder Equipment-Drop crasht. (J5B-01) |
| **AR-43** | External Systems + Audit | CRITICAL | Migration-Drift 4 Stub-Files (2026-04-10/11 Mystery-Box-Fixes). **Fünfte Journey in Folge mit Migration-Drift.** Teil von Full-Sweep (AR-12 J3 + AR-28 J4). |
| **AR-44** | External Systems (Security) | HIGH | Mystery Box RPC REVOKE/GRANT-Reset bei `CREATE OR REPLACE`. Live anon=false (OK) aber nicht explizit in Migration → bei naechstem Redeploy vulnerable. Migration-Template-Regel. |
| **AR-45** | Geld-Migration | HIGH | DROP FUNCTION `open_mystery_box(boolean)` v1 Legacy. Live granted but unused. Saubere Codebase. |
| **AR-46** | Geld-Migration | CRITICAL | Mystery Box Legacy 'uncommon'-Rows (3 live) entweder backfillen auf 'rare' ODER `MysteryBoxRarity` Type + RARITY_CONFIG erweitern. Code-Pfad: `/inventory?tab=history` crasht fuer betroffene User. |
| **AR-47** | Compliance-Wording | CRITICAL | MysteryBoxDisclaimer-Component + Integration auf Modal + History-Section. Analog TradingDisclaimer + FantasyDisclaimer (J4-AR-33). Text-Draft braucht CEO-Sign-off. |
| **AR-48** | Compliance-Wording + App-Store | HIGH | Drop-Rate-Transparenz UI-exposed (Common 45% / Rare 30% / Epic 17% / Legendary 6% / Mythic 2%). App Store 3.1.1 zwingend fuer Submission. Plus: mystery_box_config RLS-Lock (derzeit public) → service_role only. |
| **AR-49** | Architektur-Lock-In | MEDIUM | Paid-Mystery-Box-Infrastruktur Feature-Flag `PAID_MYSTERY_BOX_ENABLED=false` analog `PAID_FANTASY_ENABLED`. paid-Path im RPC weiterhin da aber UI gated auf `hasFreeBox`. Phase 4-Readiness + business.md-Regel aktualisieren. |

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| No Forbidden-Words (gamble/bet/jackpot/lottery/fortune) | 0 Treffer im MB-Scope |
| Free-Daily-Only-UX in production | `handleOpen` nutzt `hasFreeBox` Gate |
| RPC auth-Guard | `v_uid IS NULL → RETURN error` |
| anon nicht grants auf open_mystery_box_v2 | LIVE verifiziert (anon=false) |
| RLS mystery_box_results SELECT own | Policy lives, auth.uid()=user_id |
| RLS user_equipment (SELECT, INSERT, UPDATE own) | Alle 3 Ops haben Policy |
| DE + TR i18n vollständig | 100% Coverage aller MB-Keys |
| `hasFreeBox` Realtime gate | `useHasFreeBoxToday` + invalidateQueries nach Open |
| No Double-Free-Opens historisch | GROUP BY user,day HAVING COUNT>1 = empty |
| Streak-Benefits nutzen MB-Discount | `streakBenefits.mysteryBoxTicketDiscount` live |

---

## LEARNINGS (Drafts)

1. **Fix-Migrations muessen REVOKE-Block erneuern** — `CREATE OR REPLACE FUNCTION` resetted Privileges. Jede Fix-Migration MUSS REVOKE-Block enthalten. **Neue common-errors.md Regel.** (J5B-03)
2. **Contract-Drift RPC-Body vs Table-Schema ist fatal** — Mystery-Box fix-migration hat Spalte falsch benannt (`equipment_rank` vs `rank`). 6 Tage Equipment-Pfad broken. **Common-errors.md Rule:** nach jeder RPC-Fix-Migration `\d+ target_table` pruefen und Body-Insert-Columns matchen. Audit-Pattern: SELECT auf mystery_box_config / user_equipment nach jeder fix-migration. (J5B-01)
3. **Stub-Migration-Files sind Migration-Drift 5. Journey** — J1+J2+J3+J4+J5. Full-Sweep ueber alle Migrations nicht optional. Stub-Policy: nur bei Admin-Only-Code ODER nach schriftlicher Genehmigung. (J5B-04)
4. **Race-Condition bei Daily-Cap** — `COUNT` + `INSERT` ohne Lock. Pattern fuer alle Cap-Limited-RPCs (nicht nur Mystery-Box): UNIQUE partial index erzwingt Idempotency. Beispiel: `UNIQUE (user_id, (opened_at::date)) WHERE ticket_cost=0`. (J5B-02)
5. **Legacy Enum-Values in Tabellen** — 'uncommon' war valid, ist nicht mehr Type. UI crasht bei Legacy-Row-Render. **Pattern:** alle Type-Enum-Aenderungen brauchen Backfill ODER erweitere Type-Union (nicht "reduce"). (J5B-08)
6. **Loot-Box-Regulierung steht vor der Tür** — App Store 3.1.1 + Belgian Gaming + DE JuSchG §10b. Drop-Rate-Transparenz + Minor-Protection + Keine-paid-Path-in-Prod sind **Beta-Gate**. (J5Biz-03)
7. **Disclaimer-Coverage faellt nicht automatisch auf neue Domains** — Mystery Box hat KEINEN Disclaimer, analog Fantasy. **CI-Guard-Vorschlag:** neue User-Facing-Pages ohne `*Disclaimer` = CI-Warning. (J5Biz-02)
8. **Client-generierte Fake-IDs als DB-Replacement** — `useHomeData.ts:224` `crypto.randomUUID()` statt DB-ID. Service soll echte ID returnen. Anti-Pattern. (J5F-01)
9. **Live-DB hat 0 bcredits-Drops trotz Legendary+Mythic Config** — Low-n statistisch OK (25 opens), aber implizit: hat paid-Path je bcredits returniert? Audit: `SELECT FROM transactions WHERE type='mystery_box_reward'` = 0 bzw. Error in past (CHECK Constraint). (J5B-05)

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (P0 Production-Fix):** FIX-01 + FIX-02 (Type+Config), FIX-04 (staleTime), FIX-06 (i18n-Leak)  — ~1h
- **Healer B (Display + Locale):** FIX-03, FIX-05, FIX-07, FIX-08, FIX-09, FIX-13 — ~1.5h
- **Healer C (Polish):** FIX-10, FIX-11, FIX-12, FIX-14 — ~1h

**CEO-Approvals (7 Items):** SOFORT AR-42 (Equipment-Drop-Bug 6 Tage broken), AR-46 (Crash-Potential), dann Rest. Analog J2/J3/J4 Schnellbahn.

**Reviewer-Pass nach Healer-Phase.**

**Notably LESS than J3 (62) oder J4 (71):** Mystery Box ist ein kleines Feature mit einfachem Scope. 35 Findings entsprechen Scope, keine "Multi-League Feld-Durchsetzung" noetig, keine kritischen Economy-Gaps ausser den 2 LIVE-BROKEN Bugs.
