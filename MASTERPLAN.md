# BeScout — MASTERPLAN

> **Das große Bild: wohin wir wollen + wo wir stehen.** Wird bei jedem Session-Start gezeigt (Hook).
> Begleiter: `TODO.md` (was als Nächstes, prio-geordnet) · `memory/session-handoff.md` (genauer Stand jetzt) · `docs/knowledge/` (was wir wissen).
> Pflege: bei Epic-Wechsel aktualisieren. Erledigte Epics nach unten („✅ Geschafft"), nicht löschen. KEIN Tages-Status hier (der lebt im Handoff).
> v1 — 2026-06-17, **gemeinsam mit Anil zu schärfen** (Reihenfolge/Scope korrigieren).

## 🎯 Vision
**B2B2C Fan-Engagement-Marktplatz für Fußballvereine.** Fans verdienen mit ihrem Fußball-Wissen; Vereine monetarisieren ihre Fanbase + binden sie. Alle 7 Ligen launch-ready. Beta ist LIVE.

## 🗺️ Epics (Reihenfolge = grobe Prio)

### ⏳ IN ARBEIT
- **E1 — Polls-Geldmaschine: P1-P3 + Fee FERTIG (Slices 333-337, 2026-06-18).** Offen nur noch **P3c — Fan-Rang** (aktivieren als Gewicht/Auszahl-Anteil) + Live-UI-Verifikationen (gated). Nächster Slice = Anil-Wahl (siehe `TODO.md`).
  - ✅ **P1 (Slice 333):** Erstellung + Quellen-Identität (`source`) + Treasury-REIN-Routing (`poll_revenue`) + Follower-Tor 50.
  - ✅ **P2 (Slice 334):** `player_id`-Anker + Discovery (Anker-Chip-Filter + Suche Verein/Spieler über alle Feed-Typen). DB live verifiziert.
  - ✅ **P3 (Slice 336):** Follower-Reichweite-Notify + Abo-2×-Gewicht bei Paid-Polls. (Fan-Rang → P3c deferred.)
  - ✅ **Fee 20/80 (Slice 337):** Verein behält 80 %. ✅ **Event-Cancel geld-sicher (Slice 335).** ✅ **Predictions-Removal (Slice 338).**

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
Treasury-RAUS-Kanäle ✅ + Operating-System (E0) ✅ + **Polls-Geldmaschine P1-P3 + Fee (Slices 333-337) ✅ live** + Event-Cancel geld-sicher (335) + Predictions-Removal (338). Als Nächstes: **Anil-Wahl** — Polls P3c Fan-Rang · Live-UI-Verifikationen · kleine Backlog-Härtung · E0 Welle 4 (Historie).
