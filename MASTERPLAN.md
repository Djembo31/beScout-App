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
  - ✅ **Polls (REIN-Geldmaschine, D86)** — P1 Erstellung (333) · P2 Discovery (334) · P3 Follower/Abo (336) · Fee 20/80 (337) · P3c Fan-Rang→Stimmgewicht (343) live. Offen nur P3c-Reste: exklusive Treue-Umfragen (`min_fan_rank`) + Abo-Early-Access; P4 Auszahl-Idee verworfen.
  - ✅ **Fan-Reward-Engine für aktuelle Phase abgeschlossen** — FRE-1/2/3/5 live; FRE-4 Airdrop auf echte-Coin-Phase verschoben (D93).
  - ⬜ Andere Event-Quellen (Plattform/Sponsor/User minten noch) + optionaler neuer Treasury/REIN-Block.
- **E2 — S7 Tech-First-Aufräumen (D80):** Mockup-Reste, Dormant-Features, Brücken. Tracker `worklog/s7-phase3-remaining.md`. ⛔ players.club blockiert (API-Key). Nächste Pro-Stand-Karte: `worklog/notes/348-pro-stand-roadmap.md`.

### ✅ GESCHAFFT (Auszug)
- Treasury RAUS-Kanäle komplett (329-332, alle live + verifiziert).
- Setup-Elite-Upgrade (D84), SHIP-Loop + Reviewer-Disziplin (D85).
- Beta-Launch live (Tester aktiv).

## 📍 Stand in einem Satz
Treasury-RAUS-Kanäle ✅ + Operating-System (E0) ✅ + **Polls-Geldmaschine komplett (333-337+343) ✅ live** + Event-Cancel (335) + Predictions-Removal (338). **Fan-Reward-Engine FRE-1/2/3/5 alle ✅ live** (344/345/346/347); FRE-4 Airdrop verschoben auf Coin-Phase (D93). Nächstes Money-Stück = Polls-Reste (b/c) oder neuer Treasury/REIN-Block. Plan = D93.
