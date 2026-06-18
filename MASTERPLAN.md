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
  - ✅ **FRE-1 (Slice 344):** Fan-Rang-Leiter sichtbar + Perk-Katalog (Plattform-Default). Reine UI, live.
  - ⏳ **FRE-2 (nächster Slice):** Follow zählt als Einstiegssignal in `calculate_fan_rank`. **Money-nah** → /impact + Live-RPC zuerst + Anil-Design-Entscheidung.
  - ⬜ FRE-3 echtes Perk-Gate · FRE-4 Airdrop (Treasury-RAUS, Money) · FRE-5 Club-Konfig.

### ✅ E0 — Operating-System + Wissens-Basis (FERTIG)
- ✅ W1 Cockpit · ✅ W2 Wissens-Basis (Index/Governance D88/Migration D90/Cleanup) · ✅ W3 Hygiene (Binärstop + Vault-Archiv) · ✅ W3b cortex-Trio retired. Rest LOW/optional: W4 Historie-Rewrite, Root-Vault-Notizen-Reste.

### ⬜ ALS NÄCHSTES (E1 weiter)
- **E1 — Money/Reward-Modell (D83):** Treasury → Polls → Fan-Rewards.
  - ✅ Treasury-Fundament + RAUS-Kanäle (329 Ledger · 330 CSF · 330b Saldo · 331 Events · 332 Bounties).
  - ✅ **Polls (REIN-Geldmaschine, D86)** — größtes B2B-Stück. P1 (333) + P2 Discovery (334) + P3 soziale Schicht (336) + Fee 20/80 (337) alle live. Offen: P3c Fan-Rang + P4 (Teilnehmer-Auszahl, §7 offene Entscheidung). Roadmap in `docs/knowledge/domain/polls.md`.
  - ⬜ Fan-Reward-Engine (Verein belohnt treue Fans).
  - ⬜ Andere Event-Quellen (Plattform/Sponsor/User minten noch).
- **E2 — S7 Tech-First-Aufräumen (D80):** Mockup-Reste, Dormant-Features, Brücken. Tracker `worklog/s7-phase3-remaining.md`. ⛔ players.club blockiert (API-Key).

### ✅ GESCHAFFT (Auszug)
- Treasury RAUS-Kanäle komplett (329-332, alle live + verifiziert).
- Setup-Elite-Upgrade (D84), SHIP-Loop + Reviewer-Disziplin (D85).
- Beta-Launch live (Tester aktiv).

## 📍 Stand in einem Satz
Treasury-RAUS-Kanäle ✅ + Operating-System (E0) ✅ + **Polls-Geldmaschine komplett (333-337+343) ✅ live** + Event-Cancel (335) + Predictions-Removal (338). **Jetzt: Fan-Reward-Engine** — FRE-1 (Fan-Rang-Leiter, Slice 344) ✅ live, **FRE-2 (Follow zählt) als Nächstes** (Money-nah → /impact zuerst). Plan = D93.
