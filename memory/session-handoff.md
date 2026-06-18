<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 17:58)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 3 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
?? worklog/audits/knowledge-2026-06-18.md
```

## Session Commits: 9
- 0ed07dd9 docs(session-end): Handoff-Anker auf FRE-4 (Airdrop), Fan-Reward-Engine FRE-1/2/3 live
- d3c4f561 feat(db): Slice 346 — FRE-3 Exklusive Vereins-Beiträge (Fan-Rang-Gate + 🔒-Vorschau)
- 027b4cdf feat(db): Slice 345 — FRE-2 Follow zählt als Fan-Rang-Einstiegssignal (+5)
- d4ff6795 docs(plan): offene Punkte aufgenommen — D93 Fan-Reward-Engine + TODO/MASTERPLAN
- 6e53a770 docs(log): Slice 344 LOG + Live-Proof (Fan-Rang-Leiter, E1.1)
- 4afd47e6 feat(gamification): Slice 344 — Fan-Rang-Leiter sichtbar + Perk-Katalog (E1.1)
- a7853e6a docs(decision): D92 — MAX-Floor beim Subsumieren eines Live-Perks (Slice 343 DISTILL) + Handoff-Anker
- b77c1b43 feat(db): Slice 343 — Polls P3c Fan-Rang → Stimmgewicht (MAX mit Abo-Floor)
- 27e0a121 docs(session-end): Handoff-Auto-Block aktualisiert (Stop-Hook)

## Stale Worktrees: 1 (cleanup candidates)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = Slice 347 (`b2ff32ba` + docs). `worklog/active.md` = idle. **Fan-Reward-Engine FRE-1/2/3/5 (Slices 344/345/346/347) alle DONE — live + gepusht/applied.** **FRE-4 Airdrop verschoben auf echte-Coin-Phase** (Anil 2026-06-18: Verein zahlt keine $SCOUT-Airdrops, war Übergangs-Mechanik; D93-Update). Polls-Geldmaschine (333-337+343) komplett.

## ✅ ZULETZT FERTIG: FRE-5 / Slice 347 (Club-konfigurierbare Fan-Rang-Schwellen, Money-nah)
- Neue Tabelle `club_fan_rank_thresholds` (1 Zeile/Club, monotoner CHECK, 4-Op-RLS Writes-nur-via-RPC). Fehlende Zeile = Plattform-Default 10/25/40/55/70.
- `calculate_fan_rank`-Rewrite gegen **Live-Baseline (D87)** — nur Tier-CASE liest Config; alle Patches erhalten (Follow +5, ELO, csf). Helper `get_club_fan_rank_thresholds` (Default-Single-Source). Write-RPC `set_club_fan_rank_thresholds` (Club-Admin ODER `top_role='Admin'`-Gate, Validierung, **Sofort-Recalc aller Club-Fans** = Money-Tally-Frische).
- Frontend: AdminFansTab Config-UI (5 Inputs, Live-Validierung), FanRankLadder dynamische Schwellen, `getFanRankByScore` entfernt. Service get/set + DEFAULT. i18n DE+TR (9 Keys, namespace-geprüft).
- **Schutz-Grenze:** Gewicht-Mapping Tier→Faktor bleibt GLOBAL (Club verschiebt nur, wer qualifiziert).
- Reviewer PASS (Finding #1 Platform-Admin-Gate gefixt). Proof: Backend AC1-AC8 live + UI-Playwright AC9/AC10 (0 Console-Errors). `worklog/proofs/347-thresholds-smoke.txt`, `e2e/qa-347-fanrank-thresholds.ts`.
- **NÄCHSTES Money-Stück = Anil-Wahl:** Polls-Reste (b exklusive Treue-Umfragen · c Abo-Early-Access) ODER neuer Treasury/REIN-Block. NICHT Airdrop (Coin-Phase). Backlog: csf_multiplier-Removal (D93) · recalculateFanRank swallow→throw.

## ✅ ZULETZT FERTIG: FAN-REWARD-ENGINE FRE-1/2/3 (2026-06-18) — Plan = **D93**
„E1" im MASTERPLAN = ganzes Money-Epic; die Fan-Reward-Engine ist ein Teil davon, Schritte = **FRE-1…FRE-5**.
- **FRE-1 / Slice 344** (`4afd47e6`+`6e53a770`): Fan-Rang-**Leiter sichtbar** + Perk-Katalog (`fanRankPerks.ts`, Mirror Poll-Gewicht 343). Reine UI. Liegt auf Club-Page Tab **„Mehr"** (RevealSection). Live-Proof bescout.net.
- **FRE-2 / Slice 345** (`027b4cdf`): **Follow zählt** (+5 in `calculate_fan_rank`, monoton, cap 100) + Trigger `club_followers_recalc_fan_rank` (best-effort, sofort-Recalc). Money-nah (Fan-Rang→Poll-Gewicht); Abo-Floor (D92) live intakt. Force-rollback-Smoke grün.
- **FRE-3 / Slice 346** (`d3c4f561`): **Exklusive Vereins-Beiträge** ab Fan-Stufe + gesperrte Vorschau (🔒). **RLS-SELECT-Policy auf `posts` ersetzt** (war `USING(true)`) → Fan-Rang-Lese-Gate; `get_club_news_teasers` (SECURITY DEFINER) maskiert content. Neu: `fan_rank_tier_rank(text)` (Mirror FAN_RANK_TIERS), `posts.min_fan_rank_tier`. Kein Content-Leak (Row-Hide + Maskierung), Live-RLS-Smoke grün, Community-Feed + Club-Page post-Deploy regress-frei. Feature **ruhend** bis erste exklusive News (0 club_news live).

## 🎯 NÄCHSTER SLICE = FRE-4 (AIRDROP) — Anil: „frische Session starten"
- **FRE-4 = Airdrop:** Club belohnt Top-Treue-Fans gezielt mit **$SCOUT aus dem Treasury** (Treasury §8, letzter offener RAUS-Kanal §7). **Größter Money-Schritt der Engine** → **/impact ZUERST + Live-`pg_get_functiondef` (D87) + CEO-Scope**. Muster wiederverwenden: Escrow/Ledger 331/332, **D92 MAX-Floor**, `book_club_treasury`/Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE`. Offene Design-Frage für Anil: wer ist eligible (Top-N nach total_score? ab Tier X? Follower auch?) + Betrag/Verteilung.
- **FRE-5 = Club-Konfigurierbarkeit** der Perks (später).
- Plan/Begründung: **D93** in `memory/decisions.md`. Treasury-WIE: `docs/knowledge/domain/treasury.md` §7-§9.

## 🧮 FAN-RANG-MECHANIK (kurz, für FRE-4/5) — Quelle: live `calculate_fan_rank`
- total_score 0–100 = event×0,30 + dpc×0,25 + abo×0,20 + community×0,15 + streak×0,10, +ELO-Boost (Login-Streak), **+5 Follow (FRE-2)**, cap 100.
- Tier-Schwellen (im RPC, „für Pilot abgesenkt"): Stammgast 10 · Ultra 25 · Legende 40 · Ehrenmitglied 55 · Vereinsikone 70. Tier-Lineal DB-seitig = `fan_rank_tier_rank(text)` (0..5).
- **Recalc-Latenz:** nur nach Event-Scoring/Cron + jetzt bei (Un)Follow (FRE-2-Trigger) — KEIN Trigger auf Abo/Holdings. Bei money-/zugangs-relevanter Nutzung → recalc-on-read erwägen (D92-Familie).

## 🔧 BACKLOG (aus FRE-Reviews, je eigener kleiner Slice)
- **csf_multiplier raus** aus `calculate_fan_rank` (D83/D93) — kein Money-Effekt (gedeckelt/wirkungslos).
- Teaser-RPC `get_club_news_teasers` oberes LIMIT-Cap (`LEAST(...,50)`) — 346-NIT#3.
- `posts`-INSERT-Policy `club_admins`-Härtung (Nicht-Admin kann club_news mit fremder club_id einfügen) — pre-existing, 346-Scope-Out.
- cross-user Batch-Notify ohne locale → DE für alle (342-NIT#1, seit 336).
- TR-i18n-Unidiomatik (kein Commit-Blocker; nur Compliance hart).

**Muster:** Money-nah/Schema → **/impact + Live-functiondef ZUERST (D87)**. UI/Service → Mobile 393px + DE/TR namespace-aware (333-Falle: Live-Render-Console auf MISSING_MESSAGE prüfen). Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND + EINFACH — jede Antwort an Anil startet mit 1-3 Sätzen Klartext VOR Tools, keine Abkürzungs-/Tabellen-Wände, bei Zögern STOPP+erklären** (`feedback_teaching_mode`, 4× gemahnt). **Abhängige FE-Arbeit NICHT in Worktree-Agent dispatchen bevor Backend committed ist** (FRE-3-Lehre: Agent blockte, weil uncommitted Service nicht im Worktree).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 20/80.
- **`calculate_fan_rank`-Body lebt NUR live** — `20260330_streak_benefits_rpcs.sql` ist stale, NIE als Baseline (errors-db.md PATCH-AUDIT, FRE-2-Lehre).

## ⚠️ STOLPERFALLEN
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Engine braucht ihn NICHT).
2. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
3. **RLS posts SELECT** ist seit 346 ein Fan-Rang-Gate (war `USING(true)`) — bei künftigen posts-Read-Änderungen beachten: öffentliche Beiträge = `min_fan_rank_tier IS NULL`-Zweig.
