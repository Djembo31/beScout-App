---
name: Journey 4 — CEO Approvals Needed
description: 16 Items aus J4 Fantasy-Event Audits die 4 Approval-Triggers beruehren. 2 AKUT P0 (Cron + Security-Exploit). 6 weitere CRITICAL. CEO-Decision erforderlich.
type: project
status: pending-ceo-review
created: 2026-04-14
owner: CEO (Anil)
---

# Journey #4 — CEO Approval-Triggers

**16 Items** — **2 AKUT P0** + 6 CRITICAL + 7 HIGH + 1 MEDIUM.

**Beta-Status:**
- ✅ J4 Phase 2 Autonome Fixes: 6 Fixes durch (FIX-01..03 + FIX-12..14), Commits `3603c00` + `cae1f78`, tsc + vitest gruen (310+244 Tests).
- 🔴 **AKUT:** AR-26 (P0 Cron-Blocker), AR-27 (Security-Exploit LIVE-VERIFIZIERT + reverted)
- 🔴 14 weitere Items brauchen CEO-Decision.

---

## 🚨 AKUT P0 — SOFORT-ENTSCHEIDUNGEN

### AR-27 — `earn_wildcards` RPC Security-Exploit LIVE-VERIFIZIERT (CRITICAL, AKUT)

**Status:** Backend-Audit-Agent hat Exploit LIVE getestet + vollständig reverted:
- Anon-Client konnte `earn_wildcards` RPC aufrufen
- 99.999 Wildcards an User `bescout` geminted
- Test-Trace komplett rückgängig gemacht

**Root-Cause:** RPC `SECURITY DEFINER` ohne `REVOKE EXECUTE FROM anon, authenticated` Block. Nimmt `p_user_id` als Parameter (trust-client).

**Weitere betroffene RPCs (gleiche Struktur):**
- `spend_wildcards`
- `get_wildcard_balance`
- `refund_wildcards_on_leave`
- `admin_grant_wildcards` (durch `top_role='Admin'`-Check gemitigt, aber `p_admin_id`-Parameter brittle)

**CEO-Entscheidung:** **Sofort-Migration (Geld-relevant = Approval-Trigger #1 — aber AKUT).**

Fix-Migration:
```sql
-- Revoke from anon
REVOKE EXECUTE ON FUNCTION earn_wildcards(...) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION earn_wildcards(...) TO authenticated;
-- Add guard at RPC start
CREATE OR REPLACE FUNCTION earn_wildcards(p_user_id UUID, ...)
...
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;
  ...
```

**Aufwand:** ~45 Min fuer Migration + Verify auf 4 RPCs.

**Empfehlung (CTO):** **SOFORT durchziehen.** Anil muss approven, aber in der naechsten Session. Exploit ist bereits public (jeder Audit-Agent kann ihn finden).

---

### AR-26 — P0 Cron Multi-League Beta-Blocker (CRITICAL, AKUT)

**Problem (J4B-01):** `src/app/api/cron/gameweek-sync/route.ts:103` callt `getLeagueId()` = SINGLE env var (TFF 1. Lig). 134 Clubs in 7 Ligen → **114 Clubs bei `active_gameweek=1` forever**.

**Live-Beweis:** `events_per_league = {TFF1: 139}`, ZERO events in BL/PL/Serie A/LaLiga/SuperLig/BL2.

**Beta-Impact:** 7 Ligen live, 6 davon **nie automatisch gescored**. Beta-User in Bundesliga-Fantasy bekommen keine Punkte.

**CEO-Optionen:**
- **A (korrekt):** `activeLeagues`-Loop: Holt alle aktiven Ligen aus DB, iteriert durch `fetchGameweekFor(league)` + `scoreEventsFor(league)`. ~3-4h Aufwand inkl. Cron-Scheduling-Test.
- **B (quick):** Mehrere Cron-Routes: `gameweek-sync-bl`, `gameweek-sync-pl` etc. Weniger elegant aber einfacher.
- **C (Defer):** Beta nur mit TFF 1. Lig launchen, Multi-League Events post-Beta. Aber das widerspricht AR-5 J2 (Bulk-IPO-Launch fuer alle 7 Ligen).

**Empfehlung (CTO):** **A.** Beta-Blocker — ohne Fix sind 6 Ligen tot.

---

## Weitere CRITICAL Items (6)

### AR-28 — Migration-Drift 5 Fantasy-RPCs (CRITICAL)

**Problem (J4B-04):** 5 Fantasy-RPCs ohne Source im Repo:
- `save_lineup`
- `cron_process_gameweek`
- `reset_event`
- `resolve_gameweek_predictions`
- `calculate_sc_of_week`

**Wiederholung:** J1-AR-1, J2B-01, J3B-02, J4B-04 = **vierte Journey in Folge**.

**CEO-Empfehlung aus J3 (AR-12) war bereits:** Option B = Full-Sweep ueber ALLE public-Functions. J4 bestaetigt dringend.

**Fix:** `mcp__supabase__execute_sql(pg_get_functiondef)` fuer ALLE public RPCs → Backfill-Migrations. ~3-4h.

---

### AR-29 — 12 Events gescored mit pgs_count=0 (CRITICAL, Geld-Migration)

**Problem (J4B-07):** 12 Events haben `pgs_count=0` → phantom default-40 scores verteilt. Guard nur im Cron-Path, nicht im RPC.

**Impact:** User bekamen Rewards basierend auf fake-Scores.

**Fix:** Guard `IF pgs_count = 0 THEN RAISE 'no player game stats for this gameweek'` ins RPC + Reconciliation fuer die 12 betroffenen Events (Rewards zurueck?).

**CEO-Decision:** Ignorieren vs zurueckrechnen. Beta-User waren vermutlich nicht betroffen (Test-Daten).

---

### AR-30 — RLS Cross-User-Leak auf `lineups` (CRITICAL, Privacy)

**Problem (J4B-08):** Anon kann `lineups` lesen:
- `reward_amount` (Privacy)
- `captain_slot` (Competitive-Info)
- `slot_scores` (Competitive-Info)
- `equipment_map` (Game-Strategy)

**Pattern aus J3-AR-24 + common-errors.md:** own-all + public-whitelist Policy.

**Fix:** RLS-Policy umstellen. Public-Whitelist nur `event_id`, `user_id`, `total_score`, `rank` (fuer Leaderboard). Sensitive columns nur `auth.uid() = user_id`.

---

### AR-31 — Paid-Fantasy-Preview Feature-Flag (CRITICAL)

**Problem (B4, B6, B9, B18):** 6 UI-Touchpoints preview Phase-4-Features:
- CreateEventModal `buyIn`-Feld + Fee-Preview
- JoinConfirmDialog `$SCOUT`-currency-branch
- scoutEventsXxx Admin-Toggle
- benefitPremiumFantasy-String
- paid_fantasy Label
- prize_league/region_feat_prizeLeague

**Fix:** Feature-Flag `PAID_FANTASY_ENABLED=false` in env + Code-Paths gated. UI-Paths nicht rendern (nicht nur disabled).

**CEO-Decision:** Flag setzen + wo konkret? env vs Runtime-DB-Flag?

---

### AR-32 — Gluecksspiel-Vokabel-Sweep (CRITICAL)

**Problem (B1, B2, B3, B8):** Systemische Gluecksspiel-Vokabel:
- 9 DE-Keys + 8 TR-Keys
- `fantasyDesc`/`featureFantasyText`: "gewinne Credits-Preise"
- 12 `prize`/`prizePool`/`totalPrizes`/etc.
- 4 `winners24h`/`noWinnersToday`/`rewardTemplate_winner`/`event_winnerDesc`
- TR `kazan` im Fantasy-Kontext

**Fix:**
- "gewinne"→"sammle", "Preise"→"Belohnungen"
- "Prämie/Preisgeld/Preispool/Prize"→"Rewards/Belohnungen/Rewards-Pool"
- "Gewinner/gewonnen"→"Top-Platzierung/erhalten"
- TR "kazan"→"topla"/"al"

**Plus:** `business.md`-Erweiterung *"Fantasy-Gluecksspiel-Vokabel-Regel"* + CI Regex-Guard Pre-Commit: `grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json` filter fantasy.*-Keys.

**CEO-Decision:** Text-Vorschlage approven oder alternative Formulierung. **Beta-Blocker.**

---

### AR-33 — FantasyDisclaimer-Component (CRITICAL)

**Problem (B5):** 0 TradingDisclaimer-Treffer im gesamten Fantasy-Bereich. Fantasy zahlt echte Credits aus.

**Fix:**
- Neuer `FantasyDisclaimer`-Component basierend auf `fantasyContent` AGB-Text
- Integration: FantasyContent, EventDetailModal, EventSummaryModal, JoinConfirmDialog, CreateEventModal, OverviewPanel Reward-Block, LeaderboardPanel

**Disclaimer-Text (Vorschlag):**
> DE: *"Fantasy-Turniere sind Unterhaltungsangebote. In der Pilot-Phase kostenlos. Credits-Rewards werden nach Platzierung verteilt — nach alleinigem Ermessen, kein Anspruch, keine Garantie. Keine Gluecksspiel-Regulierung."*
> TR: analog

**CEO-Decision:** Text approven oder umformulieren. **Beta-Blocker.**

---

## HIGH Items (7)

### AR-34 — Multi-League Admin-Spieltag Architektur (HIGH)

**Problem:** `getLeagueId()` Single-Env-Var ist Architektur-Limitation. Admin-Panel ist monolithisch auf Ur-Liga.

**Fix-Vorschlag:** Admin-Event-Creation mit Liga-Selector, Cron mit activeLeagues-Loop (siehe AR-26). Langfristige Architektur-Aenderung.

**CEO-Empfehlung:** **In AR-26 Option A einschliessen** — kombinieren.

---

### AR-35 — `lock_event_entry` Fee-Split NO-OP (HIGH)

**Problem (J4B-05):** RPC berechnet fee_split aber verteilt NIE an Treasury. Phase-4 Readiness broken (wenn Paid Fantasy kommt).

**Fix:** Verteilung implementieren, Treasury-Wallet-Updates nach Fee-Split.

**Severity:** Aktuell kein Money-Flow, aber Code-Leak. Post-AR-31 Feature-Flag pruefen.

---

### AR-36 — Post-Event Reinvest-CTA (HIGH)

**Problem (B11):** EventSummaryModal "Aufstocken" → `/market?tab=kaufen` nach Gewinn = Gluecksspiel-Reinvestment-Zyklus.

**Fix:** CTA neutral (*"Schließen"* oder *"Zum Kader"*) statt *"Aufstocken"*. `strengthenPortfolio` umformulieren.

**CEO-Decision:** CTA-Text + ob ganz entfernt oder neutralisiert.

---

### AR-37 — Pari-mutuel-Darstellung ohne Disclaimer (HIGH)

**Problem (B12):** OverviewPanel "Platz 1 = 50% von 5.000 CR" = EU-Gaming-Terminologie. Ohne Disclaimer lesen User+Regulator identisch.

**Fix:** Inline-Disclaimer unter Reward-Verteilung: *"In der Pilot-Phase ausschließlich kostenlose Teilnahme. Credits-Verteilung nach Platzierung ist Community-Reward, kein Gewinn aus Einsatz."* — teilweise von AR-33 FantasyDisclaimer gedeckt.

---

### AR-38 — Creator-Fee 5% hardcoded ohne SSOT (HIGH)

**Problem (B18):** `CreateEventModal.tsx:55` `creatorFee = Math.round(buyIn * maxParticipants * 0.05)` — business.md Fee-Tabelle hat **KEINE Fantasy-Creator-Kategorie**.

**CEO-Optionen:**
- **A:** Code entfernen (Phase 1 hat keine Paid-Creator-Events) — siehe AR-31.
- **B:** business.md Fee-Tabelle erweitern (Phase-4-Commitment).

**Empfehlung:** **A** — parallel zu AR-31 entfernen.

---

### AR-39 — "Manager"-Rolle "Gewinne Events" (HIGH)

**Problem (B7):** `introDimensionsDesc:"Manager: Gewinne Fantasy-Events"`. Rolle als Gewinn-Maximierer definiert.

**Fix:** DE: *"Manager: Stelle Lineups auf und platziere dich in Fantasy-Events."* TR analog.

**Plus:** `business.md`-Kapitalmarkt-Glossar-Erweiterung analog J3-AR-17 (jetzt mit Manager, Prize/Prämie/Preisgeld, gewinnen, kazan).

---

### AR-40 — Trust-Client in `admin_grant_wildcards` (MEDIUM → HIGH)

**Problem (J4B):** `admin_grant_wildcards(p_admin_id, p_target, amount)` trust-client: jeder callen mit `p_admin_id = some_admin_uuid` und es pruefen nur `top_role='Admin'` of `p_admin_id`.

**Fix:** `auth.uid() = p_admin_id` Guard zusaetzlich + top_role-Check auf `auth.uid()`.

**Severity:** Eigentlich HIGH (vergleichbar mit AR-27), aber weniger kritisch weil top_role-Check existiert.

---

## MEDIUM Items (1)

### AR-41 — Fantasy-Services Error-Swallowing als Architektur dokumentieren (MEDIUM)

**Problem (J4B-22):** Fantasy-Services (`src/features/fantasy/services/*.ts`) swallowing Errors by DESIGN — geben `[]`/`null`/`0` zurueck statt zu werfen. Anders als `lib/services/` nach 2026-04-13 Hardening.

**Bestaetigt:** SessionStart-Hook nennt das als Architektur, NICHT Bug. Backend-Audit-Agent bestaetigt.

**Fix:** `beScout-backend` Skill + `SKILL.md` erweitern um Dokumentation dieser Divergenz. Healer warnen.

**CEO-Decision:** Trivial OK, aber dokumentieren damit keine zukuenftigen Audits das als Bug melden.

---

## CEO-Entscheidungspunkte (zusammengefasst)

| AR# | Trigger | Severity | CTO-Empfehlung |
|-----|---------|----------|----------------|
| **AR-27** | **AKUT Geld+Security** | **CRITICAL** | SOFORT REVOKE+Guards-Migration |
| **AR-26** | External Systems | CRITICAL | Option A activeLeagues-Loop |
| AR-28 | External Systems | CRITICAL | Full-Sweep aller public-RPCs (kombinieren mit J3-AR-12) |
| AR-29 | Geld-Migration | CRITICAL | Guard in RPC + ignore old 12 Events |
| AR-30 | Externe Systeme RLS | CRITICAL | own-all + public-whitelist |
| AR-31 | Architektur-Lock-In | CRITICAL | PAID_FANTASY_ENABLED=false Flag |
| AR-32 | Compliance-Wording | CRITICAL | Text-Sweep approven + CI-Guard |
| AR-33 | Compliance-Wording | CRITICAL | FantasyDisclaimer-Text approve |
| AR-34 | External Systems | HIGH | Mit AR-26 kombinieren |
| AR-35 | Geld-RPC | HIGH | Verteilung implementieren (post-AR-31) |
| AR-36 | Compliance-Wording | HIGH | CTA neutralisieren |
| AR-37 | Compliance-Wording | HIGH | In AR-33 FantasyDisclaimer integriert |
| AR-38 | Compliance-Architektur | HIGH | Option A (Code entfernen, in AR-31) |
| AR-39 | Compliance-Wording | HIGH | Glossar erweitern |
| AR-40 | Externe Systeme | HIGH | auth.uid() Guard |
| AR-41 | Post-Beta | MEDIUM | Skill dokumentieren |

**Beta-Blocker (muessen vor 50-Mann-Launch):** AR-27 (AKUT), AR-26, AR-28, AR-29, AR-30, AR-31, AR-32, AR-33.

**Schnellbahn-Kandidaten:** Wie J2/J3, wenn Anil "alle approved" sagt.

**Aufwand-Schaetzung:** 3-5 Sessions fuer alle 16 + AR-27 SOFORT (heute).

---

## Konsolidierung mit J1/J2/J3 Approvals

**Migration-Full-Sweep** (J3-AR-12 + J4-AR-28):
- 7 Offer/Liquidation-RPCs (J3)
- 5 Fantasy-RPCs (J4)
- **Full-Sweep** ueber alle public-Functions einmal → nachhaltig.

**Compliance-Glossar** (J3-AR-17 + J4-AR-32 + J4-AR-39):
- IPO → Erstverkauf (J2)
- Orderbuch → Angebots-Tiefe (J3)
- Trader/Manager (J3, J4)
- Portfolio/Handle clever (J3)
- am Erfolg beteiligen (J3)
- Prize/Gewinn/Preisgeld (J4)
- Preise gewinnen (J3, J4)
- **Ein business.md Kapitalmarkt-Glossar-Update deckt alles ab.**

**CI-Guards** (J3-AR-17 + J4-AR-32):
- Investment-Framing + Gluecksspiel-Vokabel Pre-Commit Hook.

**Security Audit (NEU J4):**
- J4-AR-27 `earn_wildcards` + J4-AR-40 `admin_grant_wildcards`
- **Empfehlung:** Full SECURITY DEFINER-Audit ueber ALLE RPCs. `grep 'SECURITY DEFINER' supabase/migrations/` → REVOKE-Block + auth.uid()-Guard pruefen.
