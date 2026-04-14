---
name: Journey 4 — Aggregated Findings (Fantasy-Event)
description: Synthese aus 3 parallel Audits fuer Fantasy-Event-Teilnahme. Autonom-Fixable vs CEO-Approval. AKUT-SECURITY-EXPLOIT gefunden und reverted.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #4 — Aggregated Findings (Fantasy-Event-Teilnahme)

**Total: 71 Findings — 19 CRITICAL + 26 HIGH + 19 MEDIUM + 7 LOW**

Quellen: [journey-4-frontend-audit.md](journey-4-frontend-audit.md) (27), [journey-4-backend-audit.md](journey-4-backend-audit.md) (23), [journey-4-business-audit.md](journey-4-business-audit.md) (21)

**Verteilung:**
- Frontend: 7C + 10H + 7M + 3L
- Backend: 6C + 9H + 6M + 2L
- Business: 6C + 7H + 6M + 2L

---

## 🚨 AKUT P0 — SICHERHEITSEXPLOIT LIVE VERIFIZIERT

### J4B-02 `earn_wildcards` RPC anon-aufrufbar (LIVE EXPLOITED + REVERTED)

**Status:** Backend-Audit hat Exploit live getestet:
- Anon client konnte RPC `earn_wildcards` aufrufen
- 99.999 Wildcards an `bescout` user geminted
- Test-Trace komplett reverted

**Root-Cause:** RPC ist `SECURITY DEFINER`, hat KEIN `REVOKE EXECUTE FROM anon, authenticated` Block, nimmt `p_user_id` als Parameter (trust-client).

**Weitere betroffen:** `spend_wildcards`, `get_wildcard_balance`, `refund_wildcards_on_leave`, `admin_grant_wildcards` (letztere durch top_role-Check gemitigt aber mit p_admin_id-Parameter brittle).

**Empfehlung:** **Migration SOFORT** (CEO-Approval fuer Geld-Migration, aber akut) — `REVOKE EXECUTE ON FUNCTION earn_wildcards(...) FROM anon; GRANT EXECUTE TO authenticated; ADD auth.uid() = p_user_id GUARD.`

**Flagged als AR-27 in CEO-Approvals.**

---

## Cross-Audit Overlaps

| Bug | FE | BE | Business |
|-----|----|----|----------|
| Multi-League Type-Gap FantasyEvent/Holdings | J4F-01..05 | J4B-14 | — |
| Gluecksspiel-Vokabel (gewinne/Preise/prize/Gewinner) | J4F-Compl | — | B1, B2, B3, B8, B15, B17 |
| Paid-Fantasy-Preview $SCOUT-currency | J4F-Compl | J4B-17 | B4, B6, B9, B18 |
| Disclaimer-Gap Fantasy | J4F-Discl | — | B5 |
| i18n-Key-Leak submitLineup | J4F-10 | J4B-16 | — |
| preventClose fehlt Fantasy-Modals | J4F-06..09 | — | — |
| `CR`-Kuerzel systemisch | J4F-14 | — | B16 |
| "Spieler kaufen" Fantasy Empty-State | J4F-15 | — | B10 |
| Manager-Rolle "Gewinne Events" | — | — | B7 |
| Post-Event Reinvest-CTA | — | — | B11 |
| Native alert/confirm × 6 | J4F-11..14 | — | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO)

### Group A — P0 i18n-Key-Leak + Modal Safety

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-01 | CRITICAL | `useFantasyActions`/`submitLineup` caller | mapErrorToKey+te() fuer submitLineup errors (J1/J2/J3 Pattern) | J4F-10 |
| FIX-02 | HIGH | FantasyEventModal / EventDetailModal | preventClose={submitting} × 4 Modals | J4F-06..09 |
| FIX-03 | HIGH | Ersetze `alert()`/`confirm()` durch Modal oder Toast | 6 Stellen laut Audit | J4F-11..14 |

### Group B — i18n Wording-Sweep (Gluecksspiel-Vokabel raus)

Braucht ggf. Anil-Review pro String (User-Facing Compliance-Trigger!). Kandidat fuer Schnellbahn wenn Anil approved.

| ID | Severity | Keys | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-04 | CRITICAL | `fantasyDesc`, `fantasyTitle`, `featureFantasyText` | "gewinne Credits-Preise" → "sammle Credits-Belohnungen" | B1, B2 |
| FIX-05 | CRITICAL | `prize`, `prizePool`, `totalPrizes`, `prizeLabel`, `tablePrize`, `rewardLabel`, `thReward`, `prizePoolLabel`, `prizeMoneyLabel`, `prizePreview` | "Prämie/Preisgeld/Preispool" → "Rewards/Rewards-Pool" | B3 |
| FIX-06 | HIGH | `winners24h`, `noWinnersToday`, `rewardTemplate_winner`, `event_winnerDesc` | "Gewinner" → "Top-Platzierung" | B8 |
| FIX-07 | HIGH | `buyPlayer` (Fantasy-Picker Empty) | "Spieler kaufen" → "Scout Card holen" | B10 |
| FIX-08 | MEDIUM | `wonScout`, `totalEarned` | "Gewonnene Credits" → "Erhaltene Credits" | B15 |
| FIX-09 | MEDIUM | 15+ `CR`-Renders | "CR" → "Credits" systemisch | B16 |

**ACHTUNG:** FIX-04..08 = User-Facing Compliance-Wording → CEO-Approval-Trigger #2. Pendant zu AR-15/16 aus J3. Braucht Anil-Sign-off bevor Texte finalisiert werden.

### Group C — Fantasy Disclaimer Component

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-10 | CRITICAL | `src/components/compliance/FantasyDisclaimer.tsx` (neu) | Component analog TradingDisclaimer mit Fantasy-Text basierend auf `fantasyContent` AGB | B5 |
| FIX-11 | CRITICAL | FantasyContent + EventDetailModal + EventSummaryModal + JoinConfirmDialog + CreateEventModal + OverviewPanel + LeaderboardPanel | FantasyDisclaimer einbetten (7 Stellen) | B5 |

**Disclaimer-Text braucht Anil-Sign-off** (User-Facing Compliance).

### Group D — Multi-League Type-Erweiterung

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-12 | CRITICAL | `types/index.ts FantasyEvent`, `UserDpcHolding` | `leagueShort`/`leagueLogoUrl`/`leagueCountry` optional hinzufuegen | J4F-01 |
| FIX-13 | CRITICAL | Fantasy Event Services + Mapper | Liga-Fields aus joins (events.league_id → leagues) propagieren | J4F-01..05 |
| FIX-14 | CRITICAL | EventDetailHeader, GwHeroSummary, PlayerPicker + 1 weitere Site | LeagueBadge einbetten (analog J3 Multi-League-Pattern) | J4F-02..05 |

**Cross-Dependencies:** FIX-13 ggf. RPC-Aenderung → CEO-Approval bei Service-Change (AR-34).

### Group E — Polish

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-15 | MEDIUM | Hardcoded LEAGUES-Array Fantasy-Filter | Dynamic aus DB laden | J4F |
| FIX-16 | MEDIUM | Skeleton statt Loader2 (Initial-Load) | Pattern J3 | J4F |
| FIX-17 | MEDIUM | `creatorName:'Du'` hardcoded | i18n-Key | J4F |
| FIX-18 | MEDIUM | Score-Tier labelDe-only | TR Locale | J4F |
| FIX-19 | LOW | Formation-Fallback-String, Emoji-Flag inline, silent gameweek-fetch-fail | J4F-LOW | J4F |

**Total autonome Fixes: 19** (6 CRITICAL + 8 HIGH + 5 MEDIUM + 1 LOW-Gruppe).

**Healer-Strategie:**
- **Healer A (P0 Money + Modals):** FIX-01 (i18n-Key-Leak), FIX-02 (preventClose × 4), FIX-03 (alert/confirm ersetzen) → schnell, low-risk
- **Healer B (Multi-League Types):** FIX-12, FIX-13, FIX-14 — Type-Erweiterung + LeagueBadge Integration
- **Healer C (FantasyDisclaimer + i18n-Sweep):** FIX-04..11 → braucht CEO-Text-Approval fuer user-facing Wording. Deferred bis Anil.
- **Polish (FIX-15..19):** separater Healer oder post-Beta.

---

## CEO-Approval-Triggers (siehe journey-4-ceo-approvals-needed.md)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-26** | External Systems | **CRITICAL P0** | P0 Cron Multi-League — `route.ts:103` `getLeagueId()` single env var. 114 Clubs in 6 Ligen nicht synced. activeLeagues-Loop PFLICHT. (J4B-01) |
| **AR-27** | **🚨 AKUT Geld + Security** | **CRITICAL P0** | `earn_wildcards`/`spend_wildcards`/`get_wildcard_balance`/`refund_wildcards_on_leave` RPCs anon-aufrufbar. LIVE-EXPLOIT verifiziert. REVOKE+Guards Migration SOFORT. (J4B-02) |
| **AR-28** | External Systems + Audit | CRITICAL | Migration-Drift 5 Fantasy-RPCs: `save_lineup`, `cron_process_gameweek`, `reset_event`, `resolve_gameweek_predictions`, `calculate_sc_of_week`. (J4B-04) |
| **AR-29** | Geld-Migration | CRITICAL | 12 Events gescored mit `pgs_count=0` (phantom default-40 scores). Guard nur im Cron, nicht im RPC. (J4B-07) |
| **AR-30** | Externe Systeme (RLS) | CRITICAL | `lineups` anon-readable: `reward_amount`, `captain_slot`, `slot_scores`, `equipment_map` leak. Privacy + Competitive-Info. (J4B-08) |
| **AR-31** | Architektur-Lock-In | CRITICAL | Paid-Fantasy-Preview-Infrastruktur LIVE (6 UI-Touchpoints): `buyIn`-Feld + `$SCOUT`-currency-branch + `scoutEventsEnabled` + `benefitPremiumFantasy` + `paid_fantasy` + `prize_league`. Feature-Flag `PAID_FANTASY_ENABLED=false` + alle Paths gated. (B4, B6, B9, B18) |
| **AR-32** | Compliance-Wording | CRITICAL | Gluecksspiel-Vokabel-Sweep: "Prize/Prämie/Preisgeld/Preispool/gewonnen/Gewinner" systemisch. 12 Keys DE + 8 TR. Plus business.md-Erweiterung *Fantasy-Gluecksspiel-Vokabel-Regel*. (B1, B2, B3, B8) |
| **AR-33** | Compliance-Wording | CRITICAL | FantasyDisclaimer-Component-Text approven + 7 Integration-Points. Basierend auf `fantasyContent` AGB. (B5) |
| **AR-34** | External Systems | HIGH | Multi-League Admin-Spieltag Architektur: `getLeagueId()`→activeLeagues-Loop, RPC-Parameter, Cron-Scheduling. Abhaengigkeit AR-26. |
| **AR-35** | Geld-RPC | HIGH | `lock_event_entry` berechnet fee_split aber verteilt NIE an Treasury. Phase-4 Readiness broken. (J4B-05) |
| **AR-36** | Compliance-Wording | HIGH | Post-Event Reinvest-CTA `EventSummaryModal`: "Aufstocken" → /market — Gluecksspiel-Reinvestment-Zyklus. business.md-Regel erweitern. (B11) |
| **AR-37** | Compliance-Wording | HIGH | Pari-mutuel-Darstellung `OverviewPanel` "Platz 1 = 50%" ohne Phase-1-Disclaimer — EU-Gaming-Definition. (B12) |
| **AR-38** | Compliance-Architektur | HIGH | Creator-Fee 5% hardcoded `CreateEventModal:55` OHNE business.md Fee-Split-Tabelle-Eintrag. Entfernen oder business.md erweitern. (B18) |
| **AR-39** | Compliance-Wording | HIGH | "Manager: Gewinne Fantasy-Events" Rollen-Framing (B7). business.md-Glossar-Erweiterung (J4-Learning 7). |
| **AR-40** | Externe Systeme | MEDIUM | TrustClient-Admin in `admin_grant_wildcards` (mit p_admin_id brittle). Sollte `auth.uid()` + top_role-Check statt Parameter. (J4B) |
| **AR-41** | Post-Beta | MEDIUM | Fantasy-Services Error-Swallowing als Architektur dokumentieren in `SKILL.md` — Nicht autofixen, UI-Kontrakt. (J4B-22, aus SessionStart bestaetigt) |

**16 CEO-Approval-Triggers** — davon **2 AKUT P0** (AR-26 Cron-Blocker, AR-27 Security-Exploit), 6 weitere CRITICAL.

---

## Post-Beta (nicht Beta-Blocker)

- Native alert/confirm Ersatz (FIX-03) — Beta-Blocker, aber Fix-first
- Creator-Economy hardcoded Fees (AR-38 — aber legal-review)
- Dashboard-Metrik "wonScout" (B15 → FIX-08)
- Emoji-Flag/Skeleton/Formation-Fallback (J4F-LOW)
- TR "puan kazan" (B21 → FIX-04 erweitern)
- Leaderboard-Framing (B20)

---

## VERIFIED OK (Live-DB 2026-04-14)

| Check | Beweis |
|-------|--------|
| GeoGate `free_fantasy` TR-inklusive | Phase 1 korrekt |
| `paid_fantasy` Gate `all false ausser FULL` | Korrekt aber UI-Paths umgehen |
| `buyInPilotHint` disabled Input | OK Compliance-Gate |
| `fantasyContent` AGB-Disclaimer | OK isoliert (B19) |
| Anon-Write blocked auf Fantasy-Tables | blocked |
| `admin_grant_wildcards` rejected non-admins | top_role-Check active |
| Event-Oversell | 0 |
| Orphan-Lineups | 0 |
| Scout-Events-Feature-Flag guarded | OK admin-only |
| Supply-Invariant tier_bonus | green |
| 25+ weitere Checks | siehe journey-4-backend-audit.md |

---

## LEARNINGS (Drafts)

1. **Fantasy-Services Error-Swallowing-Architektur bestaetigt** — NICHT als Bug fixen, UI-Kontrakt. `SKILL.md` erweitern, Healer warnen.
2. **P0 Security Exploit-Pattern:** SECURITY DEFINER RPCs MUST `REVOKE EXECUTE FROM anon` + `auth.uid() = p_user_id` Guard. Audit: `grep -rn 'CREATE.*SECURITY DEFINER' supabase/migrations/` → REVOKE-Block checken. **Neue common-errors.md Regel**.
3. **Multi-League Type-Gap:** FantasyEvent/UserDpcHolding hatten `club*` aber KEIN `league*`. Gleiches Pattern wie J3 Player-Type → TradingCardFrame. Regel: Jedes Type mit `club*` Field MUSS spiegelbildlich `league*` haben.
4. **Paid-Fantasy-Preview-Infrastruktur:** 6 verschiedene UI-Touchpoints preview Phase-4-Features. business.md-Regel: *NICHT BAUEN heisst auch NICHT VORBEREITEN*. Feature-Flag Pflicht.
5. **Disclaimer-Coverage faellt nicht automatisch auf neue Domains:** J1/J2/J3 hatten Trading-Disclaimer. Fantasy hat **0 Treffer**. CI-Guard: neue User-Facing-Pages ohne `*Disclaimer` = CI-Warning.
6. **`$SCOUT`-Ticker systematisch:** J3-B8 + J4-B4 = User-Face ist verseucht mit `$SCOUT`. Audit: `grep -rn "\\$SCOUT" src/ messages/`. business.md-Rule konsequent durchsetzen.
7. **"gewinnen + Preise"-Systemfehler:** 9 DE-Keys + 8 TR-Keys = Produkt-DNA Verbesserung. Analog J3 "Spieler kaufen"-Systemfehler. Pre-Commit Hook: `grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json` filter fantasy.*-Keys.
8. **Migration-Drift 5. Journey in Folge** (J1-AR-1, J2B-01, J3B-02, J4B-04): Pattern systematisch. Full-Sweep ueber alle public-Functions nicht optional, sondern **zwingend vor Beta-Launch** (AR-12/J3 + AR-28/J4 kombinieren).

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (quick wins):** FIX-01 (i18n-Leak), FIX-02 (preventClose × 4), FIX-03 (alert/confirm raus) — ~1h
- **Healer B (Multi-League Types):** FIX-12, FIX-13, FIX-14 — Type-Erweiterung + LeagueBadge ~2h
- **Healer C (DEFERRED bis CEO):** FIX-04..11 + FantasyDisclaimer — Compliance-Text-Approval

**CEO-Approvals (16 Items):** SOFORT AR-27 (Security Exploit), AR-26 (Cron-Blocker), dann Rest. Analog J2/J3 Schnellbahn.

**Reviewer-Pass nach Healer-Phase.**
