<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-24 13:40)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 10
- fe1bd24a docs(decision): D99 — $SCOUT-Phasenmodell (SSOT) + Money-Modell-Drift-Inventur + E4 Cleanup-Epic
- f297a361 feat(treasury): Bounty-Fee REIN in Plattform-Topf (Slice 365, E3-2e) — Fees-REIN KOMPLETT 5/5
- bb7d8f34 docs(spec): Slice 365 Bounty-Fee REIN — BUILD-ready Spec + Resume-Anker (E3-2e)
- 95022eda feat(treasury): Research-Fee REIN in Plattform-Topf (Slice 364, E3-2d)
- bf27dc5a chore(handoff): Resume-Anker auf Slice 364 Research-Fee REIN (363 done)
- 59b10862 docs(knowledge): 4 verify-drift Findings abgeräumt (re-verify nach Slice 338/363)
- 14af7fc9 docs(knowledge): polls.md — 20%-Plattform-Anteil fließt seit Slice 363 in den Topf (D88)
- 7d029401 feat(treasury): Polls-Fee REIN in Plattform-Topf (Slice 363, E3-2c)
- 2022a7ca docs(spec): Slice 363 Polls-Fee REIN — BUILD-ready Spec + Resume-Anker (E3-2c)
- f2a3ef78 chore(worklog): active.md auf Slice 362 (Resume-Anker)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle. HEAD = Slice 365 (Bounty-Fee REIN). Letzte Money-Feature-Baseline = Slice 365 (E3-2e).** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn gitignored. **CI grün, Push normal.** Alles committet & gepusht.

> **Session 2026-06-24 (Forts.):** 365 Bounty-Fee REIN ✅ (E3-2e, **LETZTE Fee-Quelle**) — `approve_bounty_submission(uuid,uuid,text)`→`book_platform_treasury('credit','bounty',v_platform_fee,v_sub.bounty_id,'Bounty-Fee')`, inline NACH Einreicher-Payout + Status-Updates VOR finalem success-RETURN, `IF v_platform_fee>0`-Guard. `v_platform_fee` global berechnet → **EINE Buchung deckt alle 3 Zahlungspfade** (user/club-escrow/club-nonescrow). Doppelbuchung ausgeschlossen: `trg_bounties_settle` bei 'completed' bewegt kein Geld (nur Flag). Fee-Konstante `(v_reward*500)/10000`=5 % verbatim (S356), Header bewusst OHNE `SET search_path` (Original erhalten, `no_search_path_drift`-Assert), AR-44 anon=false. Force-Rollback-Smoke PASS (Pfad 1 user_bounty: Topf +50, Zero-Sum 950+50, 1 Ledger-Row, Rollback sauber). Reviewer PASS (1 NIT optional/nicht umgesetzt). treasury.md §10 + Epic-Note + MASTERPLAN + TODO reconciled.

## 🎯 E3 Slice 2 „FEES REIN" KOMPLETT (5/5 Quellen + P2P)
> Trading (358) · IPO (360) · Polls (363) · Research (364) · **Bounty (365)** + P2P (358). **ALLE** Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98, je Zero-Sum live bewiesen). Topf live jetzt bei **35 Cents** (1 echter Trade aus dem E2E-Durchlauf, source 'trading').

## ⚠️ NEUE PRIO (Anil, 2026-06-24) — E4 Money-Modell-Glattzug + Mock→Pro-E2E-Härtung (D99). **HIER KNÜPFT ANIL AN.**

**Auslöser:** Wir haben begonnen, alle 5 Fee-Quellen per **echtem E2E auf bescout.net** durchzuspielen (jarvis kauft real). **Schon der erste Trade (① Trading) deckte massig Drift + Bugs auf** → Beleg, dass „Mock→Pro" eine gezielte Härtungs-Welle braucht. Anil-Ansage: erst sauber glattziehen, alles im Plan, dann gezielt fixen.

**① Trading ✅ live bewiesen:** Topf 0→35 Cents (3,5 % von 1000). Funde:
- 🔴 **T-3 „Diamond Hands"-Achievement** (HIGH): verbotenes Meme-Coin-Wort (business.md) + **Logikbug** (sofort beim Kauf vergeben statt nach 30 Tagen) + Konfetti-auf-Trade (no-confetti-Regel). Screenshot `365e2e-1-trading-diamondhands.png`.
- 🟡 **T-2** `POST /api/push → 500` beim Kauf · 🟢 **T-1** Cold-Start leerer Markt (0 IPOs/0 Orders → neuer User kann nichts kaufen) · 🔴 **P-4** `ipo_price`-MV-Drift (Douglas MV 500K = 10 statt ~500 Credits; Top-Spieler korrekt).

**🟣 M-5 = systemischer Money-Modell-Drift → geklärt als D99.** Lange Anil-Diskussion: $SCOUT-Einheiten/Phasen-Modell war über ~40 Doc-Stellen widersprüchlich (BSD/$SCOUT/Credits, Faktor-100-€, Phasen 1/3/4 vs 1/2, CASP-Strategie-Konflikt).

**→ D99 (`memory/decisions.md`) = neue SSOT, decided (Kern):**
- Pilot/Beta: $SCOUT/Credits = **wertloses Spielgeld, kein €-Wert**, nicht kauf-/auszahlbar. Echter Coin-Wert **erst ICO** (nach Lizenz).
- Echtes Geld rein nur via **Founder-Pässe** (kein Gewinnversprechen).
- €-Bezug = **ICO-Zeit, nicht heute** (überall so markieren, user-facing nie €).
- **Early-Adopter-Bonus diskretionär:** Aktivität jetzt mitloggen, beim ICO **nach Ermessen** in Token würdigen — **nie vorab versprechen** (sonst Finanzinstrument).

**SCHRITT 1 (Anil zuerst): D99-OFFEN-Punkte ratifizieren** — KEIN Doc-Massen-Edit vorher:
- **Naming:** user-facing „Credits" (CTO-Empfehlung, Compliance) vs „$SCOUT" überall (Anils Bauchgefühl)? + „BSD" deprecaten + Code-Vokabular vereinheitlichen.
- Einheiten-Vokabular (intern cent / Anzeige Credits=cents/100) · Phasen-Nummerierung 1/3/4↔1/2 · CASP-Strategie (scout-launch-strategie.md vs Phasen-Docs) · Card-Pricing-Fairness (MV/1.000 vs 10%/10.000-Cards).

**SCHRITT 2:** Doku auf D99 glattziehen — Checkliste `worklog/notes/365-money-model-drift-inventory.md` (~40 Stellen, 5 Kategorien, gruppiert).
**SCHRITT 3:** E2E-Sweep zu Ende: ② IPO → ③ Poll → ④ Research → ⑤ Bounty (je Seed + echter UI-Trigger, Bug-Jagd) + Funde fixen. Stand/Methode: `worklog/notes/365-e2e-findings.md`. Browser war als jarvis-qa eingeloggt; Seed-Muster (place_sell_order etc.) im Findings-File.

**Geseedete Live-Artefakte (E2E ①, permanent):** demo-admin 4 Cards Douglas Willian, jarvis 1 Card, 1 Trade-Tx, Pot 35 Cents.

## ➡️ DANACH (zurückgestellt): E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal)
- `close_monthly_liga` zahlt Rewards per `debit` aus dem Topf (statt Minting) + Deckungs-Check + Idempotenz. Lebt heute, mintet 34.000/Mt, 0 Snapshots. UI: Live-Standing + Cron + `overall`-Median-Fix. Preflight `357-preflight-monthly-leaderboard.md`. Plan `358-platform-treasury-epic.md`. Money-Muster: Live-`pg_get_functiondef` VOR Spec (D87).

## ✅ SESSION 2026-06-24 — Slice 357 E3-1 Topf-Fundament (Money, CEO-Scope)
- **Slice 357** — Plattform-Treasury Topf-Fundament. Mirror Club-Treasury 329 minus tenant-id, Single-Pot. Tabellen + 3 RPCs + Append-only-Trigger (329 wiederverwendet) + RLS 0-Policies + Service +2 Fn + AdminTreasuryTab-Card + i18n DE+TR. **Topf live bei 0, kein Backfill.**
- **Money-Smoke grün:** Buchungskette 1000/1500/1200 (kein Race), append/delete/bad-source/no-auth alle geblockt, RLS/Grants verifiziert. Reviewer **PASS** (2 NIT accepted). 9 Service-Tests grün. Proofs `worklog/proofs/357-*`.
- **DISTILL D97** (ARCHITECTURE): Topf-Saldo = SUM-on-read (Variante A, kohärent mit Club-Treasury) statt gecachter Saldo (B); Revisit B bei Millionen Ledger-Zeilen (Lock-Row existiert → lokaler Umstieg). CEO-approved.
- **Offen:** UI-Card Playwright-Verify gegen bescout.net **nach Deploy** (Vercel baut von main) — noch nicht abgenommen.

## ✅ SESSION 2026-06-23 (Abend) — Slice 356 Exklusive Treue-Umfragen + Money-Heal
- **Slice 356** — Exklusive Treue-Umfragen (`community_polls.min_fan_rank_tier`-Tor): create-Param (nur source='club'), Vote-Guard VOR Wallet (fail-closed), Service `viewer_locked` pro Poll/Betrachter (multi-club), Card-Schloss-Teaser + Create-Selector, i18n DE+TR. Silent-Fail-Fix: `castCommunityPollVote` wirft jetzt bei !success (vorher false-success-Toast). → **Polls-Roadmap KOMPLETT** ((c) Abo-Early-Access von Anil gestrichen).
- **🔴 Live-Money-Heal (Reviewer-Fund, Anil-approved):** Poll-Fee lief seit Slice 343 fälschlich **70/30** statt CEO-approved **80/20** (343 rekonstruierte Body aus `slice_336`-Datei statt Live → 337-Patch still revertiert). Zurück auf 80/20, live-verifiziert (creator_share=800 bei cost=1000). Pattern → errors-db.md (PATCH-AUDIT muss **Konstanten** prüfen, nicht nur Präsenz).
- **Reviewer:** REWORK→geheilt (`worklog/reviews/356-review.md`). **Proof:** `356-rpc.txt` + `356-money-smoke.txt` (Reject→Wallet unverändert; Pass→80/20) + 27 vitest.
- **Prozess:** TR-i18n-Abnahme-Regel (`feedback_tr_i18n_validation`) auf Anil-Wunsch entfernt — TR-Strings nicht mehr vor Commit zeigen.
- DISTILL geprüft: Learnings in errors-db.md (Konstanten-Audit) + polls.md (Feature). Kein neuer `D<n>` nötig (Bug-Fix-/Feature-Klasse, kein Strategiewechsel).

## ✅ SESSION 2026-06-23 (Fortsetzung) — Workflow-Effizienz + 349-Heilung
- **Slice 352** — Workflow-Effizienz #1+#2+#3: `ship-status-gate.sh` log.md-Injection 5→1; Ops/Tooling-Slice-Spur in `workflow.md`; **`errors-frontend.md` → Navigator (78 Z., always-loaded) + `errors-frontend-detail.md` (on-demand, non-matching glob)**. Anil-Alignment: path-scopen verworfen (.tsx-Kollaps = Safety-Regression).
- **Slice 353** — `errors-db.md` (787→73) + `errors-infra.md` (538→66) gleiche Navigator-Mechanik (2 Parallel-Agents). **DISTILL D95** (Navigator+Detail-Architektur). 3 Domains: ~90% weniger always-loaded Context/Edit, 0 Pattern-Verlust.
- **Slice 354** — **349 Live-Verify fand Prod-Bug + gefixt:** Club-Fan-Board „Treueste Fans" war im **Error-State** — `getClubFanLeaderboard` Embed `profiles!inner` ohne FK `fan_rankings→profiles` (FK ging nur auf auth.users). Fix = additiver FK→profiles (Migration `20260623210000`, kanonisch=scout_scores), 0 src/-Änderung, Re-Verify 38 Fans live PASS. **349 jetzt voll-DONE.** Plus **Stale-Tracker-Prävention** (s.u.).

## 🛡️ STALE-TRACKER-KLASSE ABGESTELLT (Slice 354 — Anil-Auftrag)
- **Ursache:** Epic-Sub-Tracker (`s7-phase3-remaining.md`, `348-pro-stand-roadmap.md`) werden von KEINEM Close-Out-Ritual angefasst → driften (348/349 waren nicht abgehakt).
- **Fix (3-teilig):** (1) `.husky/pre-commit` `[TRACKER-RECONCILE]`-Reminder feuert bei „neuer ## NNN in log.md gestaged" (non-blocking, weil semantisch); (2) `workflow.md` LOG-Step „Tracker-Kopplung"; (3) `s7-phase3-remaining.md` Stand-Quellen-Header + `reconciled-through-slice: 354`.
- **Heißt für nächste Session:** beim Slice-LOG erinnert der Hook an MASTERPLAN/TODO/s7-Tracker — reconcilen, nicht ignorieren (außer reine Doku/Meta-Slices).

## 🎯 NÄCHSTER TRACK (Anil-Wahl, frei fortsetzbar)
- **(A) Polls-Reste:** exklusive Treue-Umfragen (`min_fan_rank`) · Abo-Early-Access (kleine Money-Slices).
- **(C) S7-Aufräumen** (Block-SSOT `worklog/s7-phase3-remaining.md`): Monthly-Liga-Board (tot) · `scout_scores`↔`user_stats`-Konsolidierung · Dormant-Hygiene (Research/Voting/Creator-Fund/Wildcard) · Bridges (46). ⛔ `players.club` blockiert (API-Football-Key — Anil-Action).

## 📦 ÄLTERE SESSION 2026-06-23 (Vormittag) — 348/350/351
- **Slice 348** — `csf_multiplier` komplett raus (Code+RPC+Spalte), 0 Money-Effekt (liquidate_player proportional_v3 seit 330).
- **Slice 350** — CI-grün + Push-Fix (D94: Pre-Push=schneller Gate, volle Tests=CI). **Slice 351** — Knowledge-Coupling-Gate (D45).

## ⚙️ NEUE WORKFLOW-REALITÄT (D94 — wichtig!)
- **Push geht wieder normal** (kein `--no-verify` nötig). Falls ein Push doch mal „failed to push some refs" zeigt ohne `remote:`-Meldung: das ist der Transport-Bruch — `git push --no-verify` als Notfall, dann Pre-Push-Hook-Laufzeit prüfen.
- **Pre-Push prüft nur noch `audit:silent-fail:check`** (~5s). Volle Tests laufen in CI (test-job). Ein echter Testfehler erscheint jetzt in CI (~2,5 min + Mail = echtes Signal), nicht mehr lokal vor Push. Bei money-/komplexen Slices ggf. `CI=true pnpm exec vitest run` bewusst lokal fahren vor Push.
- **Bei neuem Silent-Fail-HIGH/MEDIUM:** `.audit-baseline.json` bewusst nachziehen (Report-Diff: neuer echter Bug fixen vs. bestehend re-baseline), sonst CI rot bei JEDEM Push. Pattern in `errors-infra.md` (Slice 350).

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

## 🎯 NÄCHSTER ARBEITSBLOCK
- ✅ **Erledigt diese Session:** 349 Live-Verify (+ Prod-FK-Bug gefixt, 354) UND alle 3 Workflow-Effizienz-Tracks (352/353). → aktueller offener Stand steht oben unter „🎯 NÄCHSTER TRACK" (Polls-Reste ODER S7-Aufräumen).
- **Slice 351 Gate aktiv:** Knowledge-Content ändern → `updated:`=heute Pflicht; neue `D<n>` → INDEX-Range mitziehen (sonst pre-commit blockt).
- **FRE-4 Airdrop bleibt deferred** (echte-Coin-/CASP-Phase, D93). Nicht resurrecten.
- Quellen: Treasury-WIE `docs/knowledge/domain/treasury.md`; Polls-WIE `docs/knowledge/domain/polls.md`; Score/Fan-Rank-WIE `docs/knowledge/domain/reward-ranking.md`. Pre-Push/CI-Realität: **D94** + `errors-infra.md` (Slice 350).

## 🧮 FAN-RANG-MECHANIK (kurz, für nächste Polls-/csf_multiplier-Slices) — Quelle: live `calculate_fan_rank`
- total_score 0–100 = event×0,30 + dpc×0,25 + abo×0,20 + community×0,15 + streak×0,10, +ELO-Boost (Login-Streak), **+5 Follow (FRE-2)**, cap 100.
- Tier-Schwellen sind seit **FRE-5 / Slice 347 club-konfigurierbar** (`club_fan_rank_thresholds`), Default: Stammgast 10 · Ultra 25 · Legende 40 · Ehrenmitglied 55 · Vereinsikone 70. Tier-Lineal DB-seitig = `fan_rank_tier_rank(text)` (0..5).
- **Recalc-Latenz:** Event-Scoring/Cron + (Un)Follow-Trigger + Schwellen-Save-Recalc (FRE-5). Weiterhin KEIN Trigger auf Abo/Holdings. Bei neuem money-/zugangs-relevantem Gate → recalc-on-read oder Recalc-on-save prüfen (D92-Familie).

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

> Crash-Recovery-Blöcke 2026-06-23 (3×) entfernt — Recovery erfolgreich in Folge-Session, Phase-A-Hygiene committet.

## ⚠ CRASH RECOVERY (20260623-161717)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161717.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161717.diff`

## ⚠ CRASH RECOVERY (20260623-161808)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161808.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161808.diff`

## ⚠ CRASH RECOVERY (20260623-161858)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161858.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161858.diff`

## ⚠ CRASH RECOVERY (20260623-163226)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-163226.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-163226.diff`

## ⚠ CRASH RECOVERY (20260623-163548)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-163548.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-163548.diff`

## ⚠ CRASH RECOVERY (20260623-164821)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-164821.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-164821.diff`
