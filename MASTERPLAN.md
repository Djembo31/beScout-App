# BeScout — MASTERPLAN

> **Das große Bild: wohin wir wollen + wo wir stehen.** Wird bei jedem Session-Start gezeigt (Hook).
> Begleiter: `TODO.md` (was als Nächstes, prio-geordnet) · `memory/session-handoff.md` (genauer Stand jetzt) · `docs/knowledge/` (was wir wissen).
> Pflege: bei Epic-Wechsel aktualisieren. Erledigte Epics nach unten („✅ Geschafft"), nicht löschen. KEIN Tages-Status hier (der lebt im Handoff).
> v1 — 2026-06-17, **gemeinsam mit Anil zu schärfen** (Reihenfolge/Scope korrigieren).

## 🎯 Vision
**B2B2C Fan-Engagement-Marktplatz für Fußballvereine.** Fans verdienen mit ihrem Fußball-Wissen; Vereine monetarisieren ihre Fanbase + binden sie. Alle 7 Ligen launch-ready. Beta ist LIVE.

## 🗺️ Epics (Reihenfolge = grobe Prio)

### ⏳ IN ARBEIT
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
- **E3 — Plattform-Treasury (BeScout-Topf), D96 — IM BAU:** Befund (live-verifiziert): **alle 6 Plattform-Fee-Anteile verbrennen** (Trading 3,5 % · IPO 10 % · Polls 20 % · Research 20 % · Bounty 5 % · P2P 2 %) → BeScout fängt 0 € eigener Fees auf, kein Plattform-Konto existiert. **Bau:** echtes Konto (Saldo+Ledger, Mirror 329) das Fees auffängt (REIN) + Monats-Liga & BeScout-Events finanziert (RAUS). Modell-Shift deflationär→zirkulär (Anil). Sequenz: **1 Fundament ✅ Slice 357** (`platform_treasury` Singleton + `platform_treasury_ledger` + 3 RPCs + Admin-Card; Single-Pot, Variante A, Topf live bei 0) → **2 Fees REIN Trading ✅ Slice 358** (`buy_player_sc`+`buy_from_order`→'trading', `accept_offer`→'p2p', voller Auffang 100 % D98, Zero-Sum live bewiesen) → **2b Fees REIN IPO ✅ Slice 360** (`buy_from_ipo`→'ipo', Δ=10 %, Zero-Sum bewiesen) → **2c Fees REIN Polls ✅ Slice 363** (`cast_community_poll_vote`→'poll', deckt beide source-Branches club+user, Δ=20 % je Vote, Zero-Sum bewiesen) **← NÄCHSTER: restliche Quellen REIN (Research/Bounty, je eigener Slice)** → 3 Monats-Liga e2e (Live-Standing+Cron+overall-Median-Fix) → 4 BeScout-Events → 5 Wettkampf-Darstellung + Ranking-Konsolidierung. Plan: `worklog/notes/358-platform-treasury-epic.md`.
- **E2 — S7 Tech-First-Aufräumen (D80):** Mockup-Reste, Dormant-Features, Brücken. Tracker `worklog/s7-phase3-remaining.md`. ⛔ players.club blockiert (API-Key). Nächste Pro-Stand-Karte: `worklog/notes/348-pro-stand-roadmap.md`. (Monthly-Liga-Board + Ranking-Konsolidierung wandern in E3 Slice 3/5.)

### ✅ GESCHAFFT (Auszug)
- Treasury RAUS-Kanäle komplett (329-332, alle live + verifiziert).
- Setup-Elite-Upgrade (D84), SHIP-Loop + Reviewer-Disziplin (D85).
- Beta-Launch live (Tester aktiv).

## 📍 Stand in einem Satz
Treasury-RAUS-Kanäle ✅ + Operating-System (E0) ✅ + **Polls-Geldmaschine komplett (333-337+343) ✅ live** + **Fan-Reward-Engine FRE-1/2/3/5 ✅ live** (344-347) + **Polls-Roadmap komplett (356)**. **E3 Plattform-Treasury (D96) IM BAU: Slice 1 Topf-Fundament ✅ (357) + Slice 2 Fees REIN Trading ✅ (358) + 2b IPO ✅ (360) + 2c Polls ✅ (363)** — Trading-Fees (Orderbuch + P2P) + IPO-Fee + Polls-Fee (beide source-Branches) fließen real in den Topf (voller Auffang 100 %, D98). **Nächster = restliche Fee-Quellen REIN (Research/Bounty, je eigener Slice).** Sequenz 1✅→2 Trading✅→2b IPO✅→2c Polls✅→2d Research/Bounty→3 Liga e2e→4 Events→5 Wettkampf-Darstellung. Plan `worklog/notes/358-platform-treasury-epic.md`.
