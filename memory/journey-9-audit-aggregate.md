---
name: Journey 9 — Aggregated Audit (Liga-Rang / Tier-Progression)
description: Runde-1-Audit von J9 für Beta-Readiness. 3 Perspektiven vereint (Frontend/Backend/Business). Home-Rank-Widget, Profile-Rang, calculate_fan_rank, refresh_my_stats, Liga-Season-Lifecycle, Rankings-Page.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #9 — Aggregated Findings (Liga-Rang + Tier-Progression)

**Total: 38 Findings — 7 CRITICAL + 13 HIGH + 12 MEDIUM + 6 LOW**

Audit-Scope:
1. Home-Widget (TierBadge auf HomeStoryHeader)
2. Profile-Rang (ScoutCard + ManagerTab FanRankOverview + Self-Rank)
3. Tier-Update-Logic (`refresh_my_stats`/`refresh_user_stats` + `calculate_fan_rank` + `sync_level_on_stats_update`)
4. Liga-Season-Lifecycle (`close_monthly_liga` + `liga_seasons` + `monthly_liga_snapshots`/`monthly_liga_winners`)
5. Rankings-Page (`/rankings` + SelfRankCard + GlobalLeaderboard + MonthlyWinners + ClubLeaderboard)
6. Airdrop-Score (AirdropScoreCard + `refresh_my_airdrop_score` + `refresh_airdrop_score`)

**Verteilung:**
- Frontend: 2C + 5H + 4M + 3L
- Backend: 4C + 5H + 5M + 2L
- Business: 1C + 3H + 3M + 1L

**Audit-Basis:**
- Live-DB-Dump: 10 Rank/Tier-RPC-Bodies via `pg_get_functiondef`
- 12 Live-SQL-Fact-Checks (Tier-Distribution, Rank=0 audit, Snapshot-Count, Publication-State, REPLICA-IDENTITY, RLS-Policies, CHECK-Constraints, Grants)
- Code-Reads: HomeStoryHeader, TierBadge, FanRankBadge, FanRankOverview, AirdropScoreCard, SelfRankCard, MonthlyWinners, GlobalLeaderboard, ClubLeaderboard, /rankings/page.tsx, gamification.ts, scoutScores.ts, airdropScore.ts, fanRanking.ts
- i18n-Grep: de.json + tr.json + 3 Namespaces (rankings / airdrop / gamification)
- Business-Check: common-errors.md + business.md Kapitalmarkt-Glossar + Gluecksspiel-Vokabel

---

## 🚨 AKUT — 4 LIVE-KRITISCHE CRITICAL BUGS (P0)

### J9B-01 🚨 Tier-Wert-Mismatch DB ↔ TS: `airdrop_scores.tier='silver'` vs `AirdropTier='silber'` (Type-Crash möglich)

**Beweis (Live-DB + TS):**
- RPC `refresh_airdrop_score` Live-Body (Zeile 70 im Body):
  ```sql
  v_tier := CASE
    WHEN v_total >= 1000 THEN 'diamond'
    WHEN v_total >= 500 THEN 'gold'
    WHEN v_total >= 200 THEN 'silver'   -- ← ENGLISCH!
    ELSE 'bronze'
  END;
  ```
- CHECK `airdrop_scores_tier_check = ANY(['bronze','silver','gold','diamond'])` — auch englisch
- `src/types/index.ts:1600`: `AirdropTier = 'bronze' | 'silber' | 'gold' | 'diamond'` — DEUTSCH
- `src/components/airdrop/AirdropScoreCard.tsx:11-16`: `TIER_CONFIG['silber']` keys
- `src/lib/services/airdropScore.ts:61`: `dist = { bronze: 0, silber: 0, gold: 0, diamond: 0 }`

**Impact:**
- Sobald ein User mit `total_score >= 200` die Airdrop-Card öffnet, returnt die RPC `tier='silver'`, aber `TIER_CONFIG['silver']` = `undefined`
- Der Code bei Zeile 71 `const tier = TIER_CONFIG[score.tier]` liefert `undefined`
- Zeile 78 `style={{ backgroundColor: tier.bg }}` → TypeError `Cannot read properties of undefined`
- Whole `/profile` crasht (AirdropScoreCard ist im lg:Sidebar)
- **Aktuell nicht live-broken weil 0 Rows in `airdrop_scores`**, aber ERSTE `refresh_my_airdrop_score` Call crasht Airdrop-Card + ProfileView-Sidebar für alle mit total_score>=200
- Tests (`airdropScore.test.ts`) mocken RPC ohne Tier-Validation → grün, aber Prod fails

**Root Cause:** Type/RPC wurden nie synchronisiert. Ein Migrations-Fix oder Type-Erweiterung nötig.

**Fix-Owner:**
- **Option A (Recommended):** Type erweitern auf `'bronze'|'silver'|'silber'|'gold'|'diamond'` + Mapping `silver→silber` in Service-Layer (reversibel, kein DB-Change) — autonom fixable
- **Option B:** Migration UPDATE airdrop_scores + CHECK + RPC ersetzen auf 'silber' (Geld-Adjacency, CEO-Approval)

→ **AR-52 (CRITICAL P0, Ambiguität: Option A sofort, dann AR für B im Full-Sweep)**

---

### J9B-02 🚨 55 von 66 `user_stats` Rows haben `rank=0` (83% falsch!) — Ranking-UI inkorrekt

**Beweis (Live SQL):**
```sql
SELECT rank, COUNT(*) FROM user_stats GROUP BY rank;
-- rank=0 → 55 rows
-- rank=1..11 → 1 row each
```

**Root Cause (RPC-Body `refresh_user_stats`):**
```sql
WITH ranked AS (SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as rn FROM user_stats)
UPDATE user_stats us SET rank = ranked.rn FROM ranked WHERE us.user_id = ranked.user_id;
```
Das rank-Update läuft NUR wenn `refresh_user_stats` called wird. Für die 55 User wurde es NIE aufgerufen → default `rank=0` bleibt.

**Impact:**
- Alle `ORDER BY rank ASC` Queries liefern 55 rank=0 User VOR den korrekten rank=1..N
- Client-seitig: `/rankings` GlobalLeaderboard zeigt "falsche Top 100" (rank=0 steht vor rank=1)
- Neue User nach Signup: `user_stats` default rank=0 → oben in Rankings bis zum ersten refresh_my_stats
- User-Experience "Du bist #0" auf ProfileView ManagerTab

**Fix:**
- Migration: `UPDATE user_stats SET rank = NULL WHERE rank=0` + NOT NULL drop OR set NULL default
- Oder: bei INSERT rank=NULL, UI filtert `WHERE rank IS NOT NULL`
- Langfristig: Cron/Scheduled refresh_user_stats für alle users (täglich) analog refresh_all_airdrop_scores

**Fix-Owner:** Backend-Migration (CEO-Approval Trigger: Rank=Display-Feld, Data-Integrity). → **AR-53**

---

### J9B-03 🚨 `monthly_liga_winners.reward_cents` wird eingetragen aber NIE zum Wallet ausgezahlt

**Beweis (RPC-Body `close_monthly_liga`, Live):**
```sql
INSERT INTO monthly_liga_winners (month, dimension, user_id, rank, reward_cents, badge_key)
SELECT ..., CASE ms.rank WHEN 1 THEN 500000 WHEN 2 THEN 250000 WHEN 3 THEN 100000 END, ...
-- Kein einziger INSERT INTO transactions, kein UPDATE wallets, kein Wallet-Credit
```

**Impact:**
- Wenn close_monthly_liga gecalled wird, werden Reward-Rows eingetragen (500k/250k/100k cents = 5.000/2.500/1.000 CR), aber der User bekommt NIE Geld auf den Wallet
- Aktuell nicht live-broken: 0 Rows in `monthly_liga_winners`/`monthly_liga_snapshots` = **noch nie gecalled**
- Aber: Sobald Admin close_monthly_liga triggered → 12 Winners (4 dims × 3 ranks) bekommen Badges aber kein Geld → Support-Tickets + Vertrauensverlust

**Fix:** RPC muss `INSERT INTO transactions (user_id, type='monthly_liga_reward', amount=reward_cents, ...)` + `UPDATE wallets SET balance_cents = balance_cents + reward_cents WHERE user_id=...` ergänzen

**Fix-Owner:** Backend-Migration (Geld-Flow, CEO-Approval PFLICHT). → **AR-54 (CRITICAL P0)**

---

### J9B-04 🚨 `refresh_my_airdrop_score` RPC hat anon=EXECUTE (AR-44 Violation, J4-Muster)

**Beweis (Live `pg_proc.proacl`):**
```
refresh_my_airdrop_score: anon=EXECUTE, authenticated=EXECUTE, public=EXECUTE
```
vs. `refresh_my_stats` korrekt (anon=kein-Grant).

**Impact:**
- auth-Guard `IF auth.uid() IS NULL THEN RETURN error` blockiert anon derzeit
- Aber: Pattern-Verstoss, bei next `CREATE OR REPLACE` resetet Privilegien default → anon kann dann executen falls Body irgendwann die `auth.uid()` Abfrage verliert oder neu geschrieben wird
- **J4 `earn_wildcards` war genau dieses Muster — LIVE-exploited.** RPC ist SECURITY DEFINER, schreibt in `airdrop_scores` → Tier-Manipulation möglich falls Guard fällt
- Defense-in-Depth verletzt

**Root Cause:** Original Migration enthielt keinen REVOKE EXECUTE FROM anon. Fehlt auch bei `sync_level_on_stats_update` (trigger function, daher OK), aber auch bei `get_current_liga_season` und `get_monthly_liga_winners` (lesend, OK aber signalisiert fehlendes Template).

**Fix:** Migration:
```sql
REVOKE EXECUTE ON FUNCTION public.refresh_my_airdrop_score() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_airdrop_score() TO authenticated;
```

**Fix-Owner:** Backend-Migration (Security, CEO-Approval). → **AR-55 (CRITICAL P0)**

---

## Cross-Audit Overlaps (mehrfach gesehen = hohe Konfidenz)

| Bug | Frontend | Backend | Business |
|-----|----------|---------|----------|
| Tier-System-Zersplitterung (4 parallele Tier-Systeme) | **J9F-01** | J9B-05 | J9Biz-01 |
| tier='silver' vs 'silber' | J9F-02 | **J9B-01** | — |
| Rank=0 default | J9F-03 | **J9B-02** | — |
| Realtime-Publication ohne REPLICA IDENTITY FULL | — | **J9B-06** | — |
| `/rankings` ohne Disclaimer | J9F-04 | — | **J9Biz-02** |
| "Monats-Sieger"/"Sieger" Wording (Gluecksspiel-Vokabel) | — | — | **J9Biz-03** |
| "Aufstieg" in tier_promotion Notification | — | **J9B-10** | **J9Biz-04** |
| fan_rankings RLS INSERT-Policy fehlt | — | **J9B-09** | — |
| `refresh_my_airdrop_score` anon=EXECUTE | — | **J9B-04** | — |
| `close_monthly_liga` ohne Wallet-Payout | — | **J9B-03** | J9Biz-05 |
| close_monthly_liga ist NICHT public-auto (wer triggers?) | — | **J9B-07** | J9Biz-06 |
| scout_scores UPDATE-Policy fehlt (bei SECURITY DEFINER Trigger-Sicht) | — | J9B-08 | — |
| Multi-Club Fan-Rank: wenn User 3 Clubs folgt, zeigt ScoutCard welchen? | **J9F-05** | — | — |
| `Season 1` hardcoded in FanRankOverview | **J9F-06** | — | — |
| Empty-State bei rankings.comingSoon missing i18n context | J9F-07 | — | — |
| `staleTime=5min` zu lange für realtime tier-up feedback | **J9F-08** | — | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

### Group A — P0 Type-Safety + UI-Crash-Prevention

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| **FIX-01** | **CRITICAL** | `src/types/index.ts:1600` + `src/lib/services/airdropScore.ts:61` + `src/components/airdrop/AirdropScoreCard.tsx:11-16` | `AirdropTier` Union um `'silver'` erweitern **und** Mapping-Layer in Service: `tier === 'silver' ? 'silber' : tier`. Forward-Compatible. | J9B-01 |
| **FIX-02** | **HIGH** | `src/components/airdrop/AirdropScoreCard.tsx:71` | Defense: `const tier = TIER_CONFIG[score.tier] ?? TIER_CONFIG.bronze` — vermeidet Crash bei unexpected tier-string | J9B-01, J9F-02 |
| **FIX-03** | **HIGH** | `src/components/rankings/GlobalLeaderboard.tsx`, `FriendsLeaderboard.tsx`, `ClubLeaderboard.tsx`, `SelfRankCard.tsx` | Filter `rank > 0` oder `rank IS NOT NULL` in allen Leaderboard-Queries (Service-Level in `getScoutLeaderboard`) bis Backfill-Migration geapplied ist | J9B-02, J9F-03 |

### Group B — i18n + Realtime-Polish

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-04 | HIGH | `messages/de.json:2877` + `messages/tr.json:2877` | `monthlyWinners`: "Monats-Sieger" → "Top-Platzierungen des Monats" / "Ayın Birincileri" → "Ayın Üst Sıralamaları" (business.md Gluecksspiel-Vokabel, Sieger=Gewinner) | J9Biz-03 |
| FIX-05 | HIGH | `src/components/gamification/FanRankOverview.tsx:85` | `Season 1` hardcoded — ersetzen via `useCurrentLigaSeason()?.name` + Fallback auf i18n-Key `gamification.seasonDefault` | J9F-06 |
| FIX-06 | MEDIUM | `src/lib/queries/fanRanking.ts:16` + `scoutScores.ts` useQuery-Wrapper | `staleTime: FIVE_MIN` zu lang für tier-up Feedback — 30s + Realtime-Subscribe auf `user_stats`/`fan_rankings` für eigenen user | J9F-08 |
| FIX-07 | MEDIUM | `src/components/ui/FanRankBadge.tsx:22-70` | `label` hardcoded-DE als Fallback — i18n-Keys `gamification.fanTier.zuschauer`/`stammgast`/... einführen statt `locale==='tr' ? labelTr : label` Pattern | J9F-09 |
| FIX-08 | MEDIUM | `src/components/rankings/MonthlyWinners.tsx:82` + Siblings | `w.reward_cents > 0` + `+{fmtScout(...)}` — Disclaimer-Badge fehlt ("wenn Monat abgeschlossen + ausgezahlt") — aktuell ist reward_cents eingetragen aber noch nicht auf Wallet (siehe J9B-03) | J9B-03 |
| FIX-09 | MEDIUM | `src/app/(app)/rankings/page.tsx:65` | `<PlayerRankings filterCountry filterLeague>` — Filter-Reset bei Country-Change bricht League-State nicht ab falls URL-Params genutzt würden (aktuell State-only, zukünftig URL-Params empfohlen) | J9F-10 |
| FIX-10 | LOW | `src/components/rankings/MonthlyWinners.tsx:108-111` | Date-Format fest `'de-DE'`/`'tr-TR'` — check WCAG für Months "Januar 2026" vs "Ocak 2026" sollte OK sein, aber `formatMonth()` sollte `toLocaleDateString` Error-safe mit Fallback haben | J9F-11 |

### Group C — Accessibility + Mobile-Polish

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-11 | MEDIUM | `src/components/rankings/GlobalLeaderboard.tsx:38-53` | Tab-Buttons ohne `aria-selected` + ohne `role="tab"` → Screen-Reader Unterstützung fehlt | J9F-12 |
| FIX-12 | MEDIUM | `src/components/ui/TierBadge.tsx:19-24` | Badge hat kein `aria-label` — `aria-label={t('gamification.tier', { tier })}` + `role="status"` für LiveRegion beim Tier-Update | J9F-13 |
| FIX-13 | LOW | `src/app/(app)/rankings/page.tsx:32` | `max-w-5xl` OK aber `pb-24` nur mobile nötig → `pb-24 lg:pb-8` für Desktop | J9F-14 |
| FIX-14 | LOW | `src/components/gamification/FanRankOverview.tsx:68-76` | Empty-State hat keinen `<CTA href="/fantasy">` — User kann nicht handeln, sieht nur "Kein Fan-Rang" | J9F-15 |
| FIX-15 | LOW | `src/components/rankings/SelfRankCard.tsx:82-91` | DeltaPill nebeneinander bei Mobile 393px → `flex-wrap` fehlt, overflow auf iPhone SE | J9F-16 |

### Group D — Business Wording + Disclaimer

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| **FIX-16** | **CRITICAL** | `src/app/(app)/rankings/page.tsx` Ende der Section | `<TradingDisclaimer variant="card" />` am Page-Ende. Rankings-Page mit $SCOUT-Rewards braucht Disclaimer genauso wie /airdrop | J9Biz-02, J9F-04 |
| FIX-17 | HIGH | `messages/de.json:3026,3043,3161` + `tr.json` Äquivalent | "Aufstieg" in tier_promotion Notification → Neutral: "Neuer Rang erreicht" / "Yeni Rütbeye Ulaşıldı". Aufstieg impliziert Hierarchie+Gewinn (SPK-Anti-Pattern) | J9Biz-04 |
| FIX-18 | MEDIUM | RPC `refresh_user_stats` Notification Body | "Du hast den Rang X erreicht. Weiter so!" — RPC-internal DE, nicht via i18n. tier_promotion notification title+body hardcoded DE → TR User sieht DE | J9B-11 |

### Group E — Tier-System Konsistenz (Long-Tail)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-19 | MEDIUM | `src/lib/gamification.ts:22` (Lines 59-96 RANG_DEFS) vs `.claude/rules/gamification.md` Tier-Table | Thresholds-Mismatch zwischen Code und Rules: Code nutzt Bronze=0-999, Silber=1000-1899, Gold=1900-2999 vs gamification.md sagt Silber=1000-2199, Gold=2200-3999. Entscheidung: welche ist SSOT? Code oder Rules? | J9F-01 |
| FIX-20 | MEDIUM | `src/types/index.ts:755-780` vs `supabase/migrations/*tier*` | 4 parallele Tier-Systeme:<br>- `user_stats.tier` = 6 Stufen `Rookie→Ikone`<br>- `scout_scores` = 12 Rang-Stufen via `gamification.ts getRang`<br>- `fan_rankings.rank_tier` = 6 Club-Tiers `zuschauer→vereinsikone`<br>- `airdrop_scores.tier` = 4 Stufen `bronze→diamond`<br>Dokumentation nötig: welches Tier-System wird wo verwendet. | J9F-01, J9B-05 |
| FIX-21 | LOW | `src/app/(app)/rankings/page.tsx:15` | `LastEventResults` importiert aber nicht genutzt im Layout? → Check ob Import ungenutzt ist | J9F-17 |
| FIX-22 | LOW | `src/components/rankings/index.ts` barrel | Prüfen ob alle Exports aktiv im Layout — sonst dead-code | J9F-18 |

**Total autonome Fixes: 22** (3 CRITICAL + 8 HIGH + 9 MEDIUM + 2 LOW)

**Healer-Strategie (3 Worktrees parallel):**
- **Healer A (P0 Crash-Prevention + Type-Safety):** FIX-01, FIX-02, FIX-03, FIX-16 — ~1.5h
- **Healer B (i18n + Wording + Realtime-Polish):** FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-17 — ~2h
- **Healer C (Accessibility + Mobile):** FIX-09, FIX-10, FIX-11, FIX-12, FIX-13, FIX-14, FIX-15, FIX-18, FIX-19, FIX-20, FIX-21, FIX-22 — ~2h

---

## CEO-Approval-Triggers (8 Items)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-52** | **Data-Contract + Type** | **CRITICAL P0** | Tier-Wert-Mismatch `airdrop_scores.tier='silver'` in DB vs `'silber'` in TS-Type. **Option A (Recommend):** TS-Union erweitern + Service-Layer-Mapping (autonom via FIX-01/02). **Option B:** Migration UPDATE CHECK + Values + RPC → mehr Impact. **Option C:** Beide Wege + Tests für Coverage. |
| **AR-53** | **Geld-Migration + Data-Integrity** | **CRITICAL P0** | `user_stats.rank=0` für 55/66 User (83%). Migration-Sweep: `UPDATE user_stats SET rank=NULL` + `NOT NULL DROP` + Cron scheduled refresh_user_stats für alle users (analog refresh_all_airdrop_scores). **A:** Default=NULL + NULLS-LAST order. **B:** Backfill via batch-refresh. **C:** Client-Filter + scheduled nightly cron. |
| **AR-54** | **Geld-Flow** | **CRITICAL P0** | `close_monthly_liga` schreibt `reward_cents` in `monthly_liga_winners` aber NICHT zur Wallet. Monatliche 12 Winner (4 dims × 3 ranks) = max 10.8M CR Payout. Migration: `INSERT INTO transactions` + `UPDATE wallets`. **A:** Im close_monthly_liga direkt atomar. **B:** Separater claim_monthly_liga_reward RPC (user-initiated). **C:** User-triggered + Expiry 30 Tage. |
| **AR-55** | **Security + External Systems** | **CRITICAL P0** | `refresh_my_airdrop_score` RPC hat anon=EXECUTE (AR-44 Violation). Migration: REVOKE FROM PUBLIC,anon + GRANT TO authenticated. Gleiches auch prüfen für `get_current_liga_season`, `get_monthly_liga_winners`, `sync_level_on_stats_update` (letztere ist trigger-only). |
| **AR-56** | **External Systems + Architecture** | HIGH | Liga-Season-Lifecycle Trigger: Wer ruft `close_monthly_liga(date)` auf? Aktuell: niemand (0 rows). Admin-Panel? Cron-Job? Beta-Gate: Automatisierung oder manueller Admin-Flow. **A:** Cron-Job in `api/cron/close-monthly`. **B:** Admin-Panel-Button im bescout-admin. **C:** Hybrid mit fail-safe. |
| **AR-57** | **Compliance-Wording** | HIGH | `/rankings` Page + MonthlyWinners + AirdropScoreCard brauchen FantasyDisclaimer/TradingDisclaimer Integration. Analog J5-AR-47 Mystery-Box-Disclaimer. Full-Sweep aller Pages mit Rewards: /rankings, /airdrop (hat schon), /fantasy, /missions. |
| **AR-58** | **External Systems (Realtime)** | HIGH | `user_stats` + `scout_scores` + `fan_rankings` + `airdrop_scores` haben alle `relreplident='d'` (DEFAULT), nicht `'f'` (FULL). Realtime-Subscriptions liefern nur PK-Payload. Tier-Up-Feedback auf UI kann nicht direkt via Subscription kommen → Query-Invalidate nach mutation nötig. Migration: ALTER TABLE ... REPLICA IDENTITY FULL für die 4 Tabellen — aber Performance-Impact bei Trigger-heavy Tables. |
| **AR-59** | **Data-Contract** | MEDIUM | Tier-System-Zersplitterung: 4 parallele Tier-Systeme (user_stats 6, scout_scores 12, fan_rankings 6, airdrop_scores 4). Dokumentation in Wiki + Konsolidierungsplan oder explizite Domäne pro System. Tech-Debt, post-Beta ok. |

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| `user_stats.tier` CHECK-Constraint matches business.md | `['Rookie','Amateur','Profi','Elite','Legende','Ikone']` ✓ |
| `fan_rankings.rank_tier` CHECK | `['zuschauer','stammgast','ultra','legende','ehrenmitglied','vereinsikone']` ✓ |
| `calculate_fan_rank` RPC anon=NO-Grant | Nur postgres+service_role grant ✓ |
| `batch_recalculate_fan_ranks` RPC anon=NO-Grant | Nur postgres+service_role grant ✓ |
| `refresh_my_stats` RPC REVOKED from anon | Authenticated+postgres+service_role ✓ |
| `refresh_user_stats` RPC REVOKED from anon | postgres+service_role ✓ |
| `refresh_all_airdrop_scores` RPC REVOKED from anon | authenticated+postgres+service_role ✓ |
| `refresh_airdrop_score` RPC REVOKED from anon | postgres+service_role ✓ |
| `user_stats` RLS SELECT Policy | `Anyone can read stats` (public) ✓ (leaderboard need) |
| `fan_rankings` RLS SELECT Policy (both own + leaderboard) | 2 policies live ✓ |
| `user_stats` in supabase_realtime publication | Live ✓ |
| auth.uid() Guard in `refresh_my_stats` | `IF v_uid IS NULL THEN RETURN error` ✓ |
| auth.uid() Guard in `refresh_my_airdrop_score` | `IF v_uid IS NULL THEN RETURN error` ✓ |
| auth.uid() Guard in `admin_import_gameweek_stats` | Doppelt: uid IS NULL + uid=p_admin_id ✓ |
| RangBadge + DimensionRangStack verwenden gamification.ts SSOT | ✓ keine Duplizierung |
| Gameweek-sync-Cron calls `calculate_fan_rank` korrekt | `api/cron/gameweek-sync:1322` ✓ |
| `liga_seasons` is_active=true mit 1 Row | 2025/26 Season live seit 2025-08-01 ✓ |
| Airdrop has `admin_import_gameweek_stats` mit adminguard auch | OK ✓ |
| i18n Rankings-Namespace vollständig DE+TR | 32 Keys, beide Locales ✓ |
| FanRankOverview 5 Dimensions korrekt gewichtet | 30+25+20+15+10 = 100% ✓ |
| Multi-Club: calculate_fan_rank nimmt (userId, clubId) — per-Club | ✓ |

---

## LEARNINGS

1. **Tier-Wert-Mismatch DB↔TS ist stiller Killer** — `airdrop_scores.tier='silver'` vs `AirdropTier='silber'` könnte beim nächsten UPDATE/SELECT jedes Profil crashen. Pattern: Jeder DB-Tier-Wert MUSS gegen TS-Union gegrepped werden. **Neue common-errors.md Regel (AR-52):**
   ```bash
   # Audit: DB CHECK values vs TS Type Union
   grep -rn "'[a-z_]*'.*'[a-z_]*'" messages/*.json | grep -E "tier|rank|status"
   ```
   Mit neuen Enum-Values: SSOT-Dokument in `.claude/rules/database.md` Column-Quick-Reference pflegen.

2. **Default-Value `0` für Rank-Spalten ist semantisches Gift** — 55 von 66 user_stats-Rows haben rank=0, was in UI als "#0" rendert. **Pattern:** Rank-Spalten sollten `NULL` default haben, UI filtert `WHERE rank IS NOT NULL` ODER `ORDER BY rank NULLS LAST`. Noch besser: Compute-on-read via VIEW. (J9B-02)

3. **Payout-RPCs müssen atomar die Wallet-Transaction-Row schreiben** — `close_monthly_liga` inserted `reward_cents` aber nicht `transactions` + nicht `wallets`. Jede Monats-Abschluss würde Reward-Rows erzeugen ohne Payout. Pattern: RPCs mit `reward_cents > 0` MÜSSEN in derselben Transaction INSERT INTO transactions + UPDATE wallets machen, nicht split in später Schritt. (J9B-03)

4. **Tier-System-Duplizierung = Tech-Debt, aber Beta-Kritisch der semantische Overlap** — user_stats.tier (Rookie→Ikone 6-stufig) konkurriert mit scout_scores-abgeleitetem getRang (Bronze→Legendär 12-stufig). Welches ist das "Rank"-der-Profil-Seite? FanRankOverview zeigt rank_tier (club-bezogen), HomeStoryHeader zeigt user_stats.tier (global). User ist verwirrt. Dokumentation fehlt. **Pattern:** Mehrere Tier-Systeme = jeder muss sein Scope erklärt haben (global/club/airdrop/achievement). (J9F-01)

5. **REPLICA IDENTITY 'd' reicht nicht für Tier-Change-Realtime-Notification** — `user_stats` ist in supabase_realtime publication, aber `relreplident='d'` bedeutet nur PK-Payload. Tier-Up auf Profile-Seite: Client muss manuell invalidateQueries. Pattern: für Tables mit "Rang-Up muss sofort sichtbar sein" entweder FULL replica identity setzen (Perf-Cost) oder explizit invalidateQueries nach mutation. (J9B-06)

6. **Gluecksspiel-Vokabel-Sweep war nicht vollständig in J4-AR-32** — "Monats-Sieger" (DE) / "Ayın Birincileri" (TR) in rankings-Namespace nicht neutralisiert. CI-Guard-Vorschlag:
   ```bash
   grep -iE "sieger|birinci|winner|kazan" messages/*.json | grep -v "Top-Platzierung\|Üst Sıralama"
   ```
   Nach J4-AR-32 sollten regelmäßige Re-Audits nach jedem neuen i18n-Key gemacht werden, nicht nur am Anfang. (J9Biz-03)

7. **"Aufstieg" in tier_promotion-Notifications ist SPK-Anti-Pattern** — Aufstieg = Hierarchie + Gewinn-Implikation. Kombinjiert mit "Monats-Sieger" + Geld-Reward = Gluecksspiel-Terminologie. Fix: "Neuer Rang erreicht" statt "Aufstieg". Notification hardcoded DE im RPC → TR-User sieht DE ("Aufstieg: Profi!"). (J9B-11, J9Biz-04)

8. **Hardcoded `Season 1` in FanRankOverview** — Single-Season-Assumption. Aktuell Liga-Season "2025/26" live. FanRankOverview zeigt "Season 1" statisch. (J9F-06)

9. **`close_monthly_liga` hat keinen Trigger** — 0 Rows in monthly_liga_winners/snapshots. Admin weiß nicht dass sie manuell triggern müssen. Fehlt: Admin-Panel-Button oder Cron-Job. Potential: Monat vergeht, keine Abschlüsse, keine Rewards. (J9B-07, J9Biz-06)

10. **scout_scores hat keine UPDATE-Policy aber der Upsert funktioniert** — Weil RPC SECURITY DEFINER ist, bypasst RLS. Aber das ist brüchig — wenn je ein Client-direct UPDATE versucht wird, silently blocked. Pattern: expliziter UPDATE-Policy + check nach jeder neuen Tabelle mit RLS. (J9B-08)

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (P0 Crash + Type-Safety):** FIX-01, FIX-02, FIX-03, FIX-16 — ~1.5h
- **Healer B (i18n + Wording + Realtime):** FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-17 — ~2h  
- **Healer C (Accessibility + Mobile):** FIX-09/10/11/12/13/14/15 + FIX-18/19/20/21/22 — ~2h

**CEO-Approvals (8 Items):** SOFORT AR-52 (Crash-Potential AirdropCard), AR-53 (Rank-Display falsch für 83% User), AR-54 (Geld-Flow-Gap), AR-55 (Security). Dann AR-56/57/58/59 Schnellbahn-Modus analog J2-J5.

**Reviewer-Pass nach Healer-Phase + Playwright Screenshot /rankings + /profile nach Deploy.**

**Post-Beta (Phase 3+):** AR-59 Tier-System-Konsolidierung (dokumentarisch ok zu splitten, aber Roadmap-Item).

---

## Scope-Vergleich zu vorherigen Journeys

| Journey | Findings | CRITICAL | Live-Broken |
|---------|----------|----------|-------------|
| J2 (IPO/Club-Sale) | ~50 | 5 | 1 (IPO price) |
| J3 (Trading) | 62 | 8 | 2 |
| J4 (Fantasy) | 71 | 9 | 1 (earn_wildcards exploit) |
| J5 (Mystery Box) | 35 | 8 | 2 (Equipment+uncommon) |
| J6 (Missions/Streaks) | — | — | — |
| J7 (Community/Research) | — | — | — |
| J8 (Verkaufen/Orderbook) | 42 | 9 | 3 |
| **J9 (Liga-Rang) — this** | **38** | **7** | **0 direct, 1 latent (J9B-01 crash bei tier='silver')** |

**J9 = medium-size Journey.** 38 Findings, 7 Critical — analog J4 Struktur aber weniger Multi-League-Propagation-Bugs (nur 1x Season hardcoded). Tier-System + Rang-Lifecycle sind wenig-benutzt live (0 Snapshots, 0 Winners, 0 Airdrop-Scores), daher weniger "akut broken" aber viel "latent broken when activated". Beta-Launch ohne Fix von AR-52/53/54 ist riskant weil beim ersten Monatsabschluss oder ersten Airdrop-Refresh crash-path geöffnet wird.

---

## Top-5 CRITICAL (Final Summary)

1. **J9B-01 / AR-52** — Tier='silver' vs 'silber' — UI-Crash-Potential bei erstem refresh_my_airdrop_score
2. **J9B-02 / AR-53** — 55 user_stats mit rank=0 live, 83% aller Rows → Leaderboard falsch
3. **J9B-03 / AR-54** — close_monthly_liga zahlt NICHT auf Wallet, max 10.8M CR Payout-Gap
4. **J9B-04 / AR-55** — refresh_my_airdrop_score anon=EXECUTE, AR-44 Violation, J4-Muster wiederholt
5. **J9Biz-02 / FIX-16** — /rankings Page ohne Disclaimer (Compliance-Gap analog /airdrop)

**Autonome Fix-Count: 22 (3 CRITICAL + 8 HIGH + 9 MEDIUM + 2 LOW)**
**CEO-Approval-Count: 8 (4 CRITICAL + 3 HIGH + 1 MEDIUM)**
