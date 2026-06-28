# BeScout — MASTERPLAN

> **Das große Bild: wohin wir wollen + wo wir stehen.** Wird bei jedem Session-Start gezeigt (Hook).
> Begleiter: `TODO.md` (was als Nächstes, prio-geordnet) · `memory/session-handoff.md` (genauer Stand jetzt) · `docs/knowledge/` (was wir wissen).
> Pflege: bei Epic-Wechsel aktualisieren. Erledigte Epics nach unten („✅ Geschafft"), nicht löschen. KEIN Tages-Status hier (der lebt im Handoff).
> v1 — 2026-06-17, **gemeinsam mit Anil zu schärfen** (Reihenfolge/Scope korrigieren).

## 🎯 Vision
**B2B2C Fan-Engagement-Marktplatz für Fußballvereine.** Fans verdienen mit ihrem Fußball-Wissen; Vereine monetarisieren ihre Fanbase + binden sie. Alle 7 Ligen Ziel-Standard.
**⚠️ Beta ABGEBROCHEN (2026-06-26, D111):** zu viele Fehler, nichts lief vernünftig zusammen. **Aktueller Nordstern = Mock→Pro-Programm:** ganze Codebase auf Profi-/Sorare-Niveau (Architektur/System-Design/Patterns), Domäne für Domäne. Feature-Bau + Liga pausiert. Sommerloch = Tiefenarbeit-Fenster. Re-Launch erst NACH dem Programm.

## 🗺️ Epics (Reihenfolge = grobe Prio)

### ⏳ IN ARBEIT — E-MOCK2PRO (Nordstern seit 2026-06-26, D111)
**Beta abgebrochen → ganze Codebase auf Profi-/Sorare-Niveau, Domäne für Domäne.** Bestandsaufnahme aller 7 Domänen ✅ (`worklog/notes/mock2pro-audit.md`), finaler 7-Wellen-Plan ✅ (`worklog/notes/mock2pro-plan.md`). **3 Grund-Ursachen:** Teil-Konsolidierung („von allem zwei") · Datenmodelle ohne erzwungene Integrität (Aufstellung/Scores) · Client-only-Architektur (Cold-Start). Fundament solide — es fehlt Durchsetzung „eine Quelle" + 2 Datenmodell-Fixes + 1 Architektur-Hebel.

**7-Wellen-Status** (Anil: Domäne für Domäne komplett). *Genauer laufender Stand = `memory/session-handoff.md` (einzige Stand-Quelle).*

| Welle | Domäne | Status | Slices |
|-------|--------|--------|--------|
| 1 | Trading [Money] | ✅ KOMPLETT (e2e bewiesen) | 403-418 |
| 2 | Spieltag/Scoring [Money] | ✅ KOMPLETT (inkl. GW-Fork) | 419-429 |
| 3 | Events/Aufstellung [Money] | ⬜ offen (Lineup-Datenmodell-Fork, CEO) | — |
| 4 | Follow | ⬜ offen | — |
| 5 | Geld/State | ⬜ offen | — |
| 6 | Performance | ⬜ offen | — |
| 7 | Design | ⬜ offen (zuletzt) | — |

- **⏳ Post-Deploy offen:** 428b `DROP clubs.active_gameweek` (nach Vercel-Verify) + 427 AC-06 Live-Screenshot.
- **➡️ NÄCHSTER (CEO-Vorlagen, NICHT autonom):** (1) Ranking-Konsolidierung `scout_scores`↔`user_stats` · (2) Welle 3 Events/Aufstellung.
- **🟥 ZUERST (Anil 2026-06-28):** Prozess-Elite-Optimierung (Slice 430, Tracker-Overhead) — Feature pausiert. Einstieg `worklog/notes/process-elite-prep.md`.

### ⏸️ PAUSIERT (Pivot D111 — Feature-Bau ruht bis Mock→Pro durch)
- **E1 — Money/Reward: Polls-Geldmaschine FERTIG (333-337+343), jetzt Fan-Reward-Engine.** Verein belohnt treue Fans (Treasury §8). Design-Alignment + 5 Festlegungen + Slice-Kette = **D93**. Namens-Klarheit: Engine-Schritte = **FRE-1 … FRE-5** (Teil des E1-Epics).
  - ✅ **Polls komplett:** P1 (333) Erstellung+REIN-Routing · P2 (334) Discovery · P3 (336) Follower+Abo-Gewicht · Fee 20/80 (337) · P3c (343) Fan-Rang→Poll-Stimmgewicht. Plus Event-Cancel (335) + Predictions-Removal (338).
  - ✅ **FRE-1 (Slice 344):** Fan-Rang-Leiter sichtbar + Perk-Katalog. Reine UI, live.
  - ✅ **FRE-2 (Slice 345):** Follow zählt als Einstiegssignal in den Fan-Rang (+5, monoton) + Recalc-Trigger. Money-nah, Abo-Floor (D92) intakt.
  - ✅ **FRE-3 (Slice 346):** Exklusive Vereins-Beiträge ab Fan-Stufe + gesperrte Vorschau (🔒). RLS-Lese-Gate + Teaser-RPC (Content-Maskierung). Security: kein Content-Leak.
  - ✅ **FRE-5 (Slice 347):** Club-konfigurierbare Fan-Rang-Schwellen (pro-Club Score→Tier, Recalc-on-Save, Club-Admin-Gate). Money-nah. Schutz-Grenze: Gewicht-Mapping bleibt global. Reviewer PASS, Live-Proof.
  - ⏸️ **FRE-4 Airdrop = verschoben auf die echte-Coin-Phase** (Phase 3 nach CASP). Verein zahlt keine $SCOUT-Airdrops (ADR-026 „post-Pilot"). Aktive Fan-Reward-Engine damit für jetzt **abgeschlossen (FRE-1/2/3/5)**. Siehe D93-Update.

### ✅ E0 — Operating-System + Wissens-Basis (FERTIG)
- ✅ W1 Cockpit · ✅ W2 Wissens-Basis (Index/Governance D88/Migration D90/Cleanup) · ✅ W3 Hygiene (Binärstop + Vault-Archiv) · ✅ W3b cortex-Trio retired. Rest LOW/optional: W4 Historie-Rewrite, Root-Vault-Notizen-Reste.

### ⬜ ALS NÄCHSTES
- **E1 — Money/Reward-Modell (D83):** Treasury → Polls → Fan-Rewards.
  - ✅ Treasury-Fundament + RAUS-Kanäle (329 Ledger · 330 CSF · 330b Saldo · 331 Events · 332 Bounties).
  - ✅ **Polls (REIN-Geldmaschine, D86) KOMPLETT** — P1 Erstellung (333) · P2 Discovery (334) · P3 Follower/Abo (336) · Fee 20/80 (337) · P3c Fan-Rang→Stimmgewicht (343) · **P3c-(b) exklusive Treue-Umfragen `min_fan_rank_tier` (356)** live. (c) Abo-Early-Access gestrichen (Anil), P4 Auszahl-Idee verworfen. **356 heilte zudem einen Live-Fee-Bug: 343 hatte 337s 80/20 still auf 70/30 revertiert → zurück auf CEO-approved 80/20.**
  - ✅ **Fan-Reward-Engine für aktuelle Phase abgeschlossen** — FRE-1/2/3/5 live; FRE-4 Airdrop auf echte-Coin-Phase verschoben (D93).
  - ⬜ Andere Event-Quellen (Plattform/Sponsor/User minten noch) + optionaler neuer Treasury/REIN-Block.
- **E3 — Plattform-Treasury (BeScout-Topf), D96 — IM BAU:** echtes Konto (Saldo+Ledger, Mirror 329) das Fees auffängt (REIN) + Monats-Liga & BeScout-Events finanziert (RAUS). Modell-Shift deflationär→zirkulär (Anil). Plan: `worklog/notes/358-platform-treasury-epic.md`.
  - ✅ **1 Fundament (357)** — `platform_treasury` Singleton + Ledger + 3 RPCs + Admin-Card (Single-Pot, Variante A).
  - ✅ **2 Fees REIN KOMPLETT (5/5 + P2P), voller Auffang 100 % (D98), Zero-Sum je Quelle:** Trading (358) · IPO (360) · Polls (363) · Research (364) · Bounty (365).
  - ✅ **3 Monats-Liga RAUS (376)** — `close_monthly_liga` zahlt zero-sum aus Topf + Deckungs-Check + Genesis-Seed 500k, manueller Trigger.
  - ✅ **4 BeScout-Events RAUS (377)** + ✅ **4b special-Events RAUS (378)** — Event-Trigger um Topf-Escrow erweitert (Spiegel 331), je 8/9 force-rollback-Zero-Sum.
  - ⬜ **NÄCHSTER: 5 Wettkampf-Darstellung + Ranking-Konsolidierung.** (⏸ Liga-Cron + Live-Standing-Board; `sponsor`/`creator`-Quellen minten weiter.)
- **E2 — S7 Tech-First-Aufräumen (D80):** Mockup-Reste, Dormant-Features, Brücken. Tracker `worklog/s7-phase3-remaining.md`. ⛔ players.club blockiert (API-Key). Nächste Pro-Stand-Karte: `worklog/notes/348-pro-stand-roadmap.md`. (Monthly-Liga-Board + Ranking-Konsolidierung wandern in E3 Slice 3/5.)
- **E4 — Money-Modell-Glattzug + Mock→Pro E2E-Härtung (D99) — NEU, 2026-06-24:** Ausgelöst durch den Slice-365-E2E-Durchlauf: **ein einziger echter Trade** deckte systemischen Drift + mehrere Bugs auf → Beleg, dass „Mock→Pro" eine **gezielte Härtungs-Welle** braucht, nicht nur Feature-Bau. Zwei Arbeitsströme:
  - **(a) Money-Modell-Doku auf D99 ausrichten** ✅ **DONE:** Schritt 1 D99-OFFEN ratifiziert (b52e8b09: Naming „Credits"/$SCOUT=ICO-Coin · Phasen 1/2/3 · CASP=schnellster sicherer Weg · Pricing 1 Card=MV/1.000 Credits, kein 100×-Widerspruch) + Schritt 2 Doc-Glattzug (Slice 366, eba47650: ~40 Stellen + Skills + SYSTEM-DESIGN, messages $SCOUT/BSD=0, tsc grün). SSOT = **D99**. Plan-Anker `worklog/notes/366-e4-money-model-cleanup-epic.md`.
  - **(b) E2E-Sweep „Fees REIN" zu Ende + Bugs fixen:** ① Trading ✅ → ② IPO ✅ → ③ Poll ✅ → ④ Research ✅ → ⑤ Bounty ✅ — **🎯 KOMPLETT (Slice 370):** alle 5 Fee-Quellen live in den Topf bewiesen (SUM 2462 Cents, Zero-Sum je Quelle, Doppel-Approve money-safe reject), 0 Fee-Booking-Bugs, kein Prod-Code (Verify via Seed+RPC-Impersonation), Proof `370-fees-rein-sweep.txt`. Funde in `worklog/notes/365-e2e-findings.md`: ✅ **T-3 „Diamond Hands"** (Slice 367, Rename+Hold-Logik+Konfetti). · **P-4 `ipo_price`-Drift → REFRAMED zu Slice 368 „Scout-Card-Wertanzeige" (D100):** alte Prämisse („MV/10 nachziehen") **verworfen** — `ipo_price` = Vereins-Eintrittspreis (MV-entkoppelt), „Drift" ist KEIN Bug. ✅ **368a DONE** (Kanon: D100 + treasury §1b + trading.md) · ✅ **368b DONE** (RewardsTab-Anzeige-Wahrheit: Einstieg←Erst-IPO/„—", CSF €→Credits) · ✅ **368c DONE** (Floor manipulationssicher: Preis-Band min=Anker÷3/max=×3 via `get_price_floor=cap/9`, Lowball→`minPriceExceeded` live-bewiesen; `floorSource`-Sublabel quellen-ehrlich; Floor-Labels→„Marktpreis"; Money-Pfad unberührt; Sybil-Ring=eigener Slice; AC7 Playwright post-Deploy offen). Spec `docs/plans/2026-06-24-scout-card-value-model-spec.md`. · Offen: **T-2** `/api/push 500` (369) · **T-1** Cold-Start leerer Markt (Produkt-Entscheid) · **M-5** Money-Modell-Drift = D99/E4(a) ✅.

- **E5 — Event-/Creator-/BeScout-Liga-Modell (D104) — Zielbild abgestimmt:** „Creator"=Oberbegriff (BeScout/Verein/User/Sponsor): jeder zahlt Pot + kassiert Eintritts-Einnahmen, BeScout immer mit Anteil. BeScout-Liga gratis, pro Liga gebunden + Wertung pro Liga UND global. Anker: `worklog/notes/event-creator-liga-epic.md` + **D104/D105/D106/D107/D108**.
  - ✅ **E-1 Liga-Bindung Aufstellung (380)** + ✅ **E-1b Picker-Vorfilter + Club-Admin-Picker (382)**.
  - ✅ **E-2a BeScout-Saison Rename + Pro-Liga-Anzeige (381, D105)** + ✅ **E-2b Pro-Liga-Payout (383)** — `liga_reward_config` pro Liga, zero-sum aus Topf.
  - ✅ **E-3 Türsteher (384) + Regel-Fundament (385)** + **Regelsatz KOMPLETT:** age (386) · min/max-per-position (388/390) · mv min/max (389/390) · nationality-iso (391) · nation_in + max_per_nation (392).
  - ✅ **Lineup-Reject-Coverage komplett (393/394/395)** — regel-spezifische Toasts DE/TR.
  - ✅ **E-4 User-Events end-to-end (396 Geld-Kern D108 · 397 Builder-Wiring · 398 i18n-Fix · 399 Cancel/Admin/Discovery)** — Pot=Σ Eintritte, Zero-Sum bewiesen.
  - ✅ **E-7 creator-Cleanup (400)** — deprecated Typ `creator` über 11 Flächen entfernt.
  - ⬜ **NÄCHSTER: Backlog** — E-5 Ticket-Events · E-6 Creator/Sponsor-Flow (L, Money/CEO) · E-7-Rest Freiform-Reward-Editor · S7-Aufräumen. (E3 Slice 5 Ranking-Konsolidierung ⊂ E-2.)

### ✅ GESCHAFFT (Auszug)
- Treasury RAUS-Kanäle komplett (329-332, alle live + verifiziert).
- Setup-Elite-Upgrade (D84), SHIP-Loop + Reviewer-Disziplin (D85).
- Beta-Launch live (Tester aktiv).

## 📍 Stand
**Laufender Stand lebt in `memory/session-handoff.md` (einzige Stand-Quelle) — NICHT hier duplizieren** (D111-Lehre auf Meta-Ebene, Slice 430). Wellen-Status oben in der Tabelle (Epic E-MOCK2PRO).

**Ein-Satz-Fixpunkt:** Beta abgebrochen (D111) → Mock→Pro-Programm. Welle 1 (Trading) + Welle 2 (Spieltag/Scoring) e2e KOMPLETT (403-429). Geld-/Event-Maschine (E3 Treasury REIN 5/5 + RAUS 3/3 · E5 Events bis Slice 400) GEBAUT + bewiesen — im Programm nur konsolidiert/gehärtet, nicht neu gebaut. Nächster: Ranking-Konsolidierung / Welle 3 (CEO-Vorlagen). **Aktuell ZUERST: Prozess-Elite-Optimierung (Slice 430).**
