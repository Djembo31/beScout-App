# Slice 079 — Home Polish Findings

**Baseline:** 2026-04-19 late (post Slice 078 commit, before push)
**Tool:** Playwright MCP gegen bescout.net (jarvis-qa login)
**Viewports:** Desktop 1280×900, Mobile 393×852 (iPhone 16)
**User:** jarvis-qa@bescout.net — Jarvis QA, 225 Tickets, 12 Spieler

## Summary

13 Findings identifiziert: 1 CRITICAL (UX-Verwirrung), 3 HIGH (Daten-Bugs), 2 MED (Empty/Polish), 7 LOW (Details/Backend).

Kritischer Quick-Win: **F1 Hero-Label-Klarheit** — User weiß nicht was "5.476,73 CR" ist.

---

## Findings (priorisiert)

### 🔴 F1 CRITICAL — Hero-Number missverständlich
- **Was:** `HomeStoryHeader` zeigt groß "5.476,73 CR" — das ist Portfolio-Value (Holdings × Market-Value), nicht Wallet-Balance. Sidebar Top-Left zeigt "Guthaben 7.225 CR" (das ist die echte Balance).
- **Problem:** Label "SPIELERKADER" ist `text-white/25` — unlesbar. User sieht große gelbe Zahl und assoziiert "Geld".
- **Fix:**
  - Label `SPIELERKADER` → `SPIELERKADER-WERT` (eindeutig)
  - Opacity auf mind. `text-white/50` (WCAG)
  - Zweite Pill neben PnL/Holders: `Guthaben · {balance}` mit Coins-Icon
- **Impact:** User versteht auf einen Blick: Kader-Wert + Balance + PnL + Anzahl Spieler
- **Status:** to-fix

### 🟠 F2 HIGH — Duplicate Mission Cards
- **Was:** 2× identisch "Mission: Fantasy-Event beitreten" mit +55 CR / 0/1 UND +195 CR / 0/1
- **Vermutung:** Zwei Missions mit gleichem Titel aber unterschiedlicher Reward — entweder Copy-Paste-Fehler in Mission-Seed oder die Mission-Liste zeigt dupliziert
- **Fix:** Mission-Query dedupen nach Titel ODER Titel unterscheidbar machen (z.B. "Erstes Fantasy-Event" vs "5 Fantasy-Events")
- **Status:** to-investigate (braucht DB-Query auf `missions`-Tabelle)

### 🟠 F3 HIGH — Scout Activity Feed Repetition
- **Was:** 5× identisch "oksmoz2 hat ein Lineup eingereicht" hintereinander — unterschiedliche Daten (7.4.2026 / 7.4.2026 / 6.4.2026 / 5.4.2026 / 5.4.2026)
- **Problem:** User-Feed wirkt als hätte nur 1 User 5× das Gleiche gemacht — Bot-Eindruck
- **Fix:** Feed-Query dedupen per `DISTINCT ON (user_id, type)` + letzte 5 UNIQUE Aktionen
- **Status:** to-investigate (Feed-Service finden)

### 🟠 F4 HIGH — Console Errors: Backend RPC Timeouts
- **Was:**
  ```
  [Wallet] Balance fetch failed (attempt 3/3) — exhausted: Timeout
  [AuthProvider] Profile load failed after retry
  [AuthProvider] loadProfile RPC slow, using 3-query fallback
  ```
- **Impact:** User sieht Daten (dank Fallback) ABER 5-10s Ladezeit nach Login
- **Scope:** Nicht Home-spezifisch — betrifft AuthProvider + Wallet im Layout → alle Pages
- **Fix:** RPC Performance Analyse (EXPLAIN ANALYZE, Query-Optimierung)
- **Status:** deferred (separater Slice, Backend-Arbeit)

### 🟡 F5 MED — LastGameweekWidget Slots überwiegend leer
- **Was:** 7 Slot-Rows, nur 1 (M. Barton) hat Score "72", Rest zeigt "—"
- **Ursache:** Vermutlich echtes Szenario — Lineup war unvollständig oder Spieler haben nicht gespielt
- **Polish:** Empty-Slot-Darstellung "—" zu dezent. Besser: `—` grau + Tooltip "Nicht gespielt" oder Icon
- **Status:** to-polish

### 🟡 F6 MED — Mobile Bottom-Nav Artifact im fullPage-Screenshot
- **Was:** Sticky Bottom-Nav erscheint in der Mitte des fullPage-Screenshots (zwischen Missions und LastGameweekWidget)
- **Ursache:** Playwright fullPage-Screenshot-Compositing + position:sticky + scroll
- **Impact:** Wahrscheinlich **kein echter Bug**, nur Screenshot-Artefakt
- **Status:** verify-in-live (manuell testen, sonst ignorieren)

### 🟢 F7 LOW — "Meistbeobachtet" dünn besetzt (1 Spieler)
- **Was:** Nur "Burcu" als meistbeobachteter Spieler
- **Ursache:** Follower-Count zu wenig auf anderen Spielern
- **Polish:** Min 3 Players in Strip sonst Empty-State "Zeige dich was beliebt ist" CTA
- **Status:** to-polish

### 🟢 F8 LOW — "Meine Vereine" nur 1 Club + Entdecken-Button
- **Was:** Adana Demirspor als einziger Club
- **Polish:** OK (kein Bug), aber Button-Styling "Entdecken" wirkt wie Club-Entry (selbe Höhe) — Hierarchie unklar
- **Status:** to-polish

### 🟢 F9 LOW — Quick-Actions Cards kleiner Text
- **Was:** 5 Cards mit Icon + Label, Label ist `text-[10px] font-bold text-white/60`
- **Polish:** 10px ist klein für Mobile-Touch-Targets. Test: lesbar bei 393px?
- **Status:** to-verify

### 🟢 F10 LOW — Divider-Gradient Abstand
- **Was:** `divider-gradient` zwischen Hero-Bereich und Main-Column wirkt etwas eng
- **Status:** visual-review

### 🟢 F11 LOW — Mystery Box "GRATIS" Label
- **Was:** Gelber Button "GRATIS" auf der Mystery-Box-Card
- **Compliance-Check:** "Gratis" ist Gluecksspiel-Duden-nah? Eher "Kostenlos"?
- **Status:** business.md-check

### 🟢 F12 LOW — Global Movers Empty
- **Was:** "Serie A Meisterschaft" Event-Banner zeigt "Rewards-Pool 0 Credits" und "0/100 Teilnehmer"
- **Ursache:** Event ist neu oder keine Teilnehmer
- **Polish:** OK, aber "Rewards-Pool 0" wirkt unattraktiv
- **Status:** business.md-check, eventuell "Rewards-Pool wird aufgebaut" wenn < threshold

### 🟢 F13 LOW — Welcome Bonus Modal Trigger
- **Was:** `WelcomeBonusModal` rendert nur wenn `isNewUser && balanceCents > 0`. jarvis-qa hat Holdings, also `isNewUser=false`, Modal kommt nicht.
- **Status:** OK für diesen User, für neue User noch zu testen (Phase 5 — Welcome/Onboarding)

---

## Fix-Reihenfolge (Plan)

1. **F1** Hero-Label + Balance-Pill — UX-kritisch, User-sichtbar (1-2h)
2. **F2** Duplicate Mission Query-Dedup — Backend/Frontend (30-60min)
3. **F3** Scout Activity Feed Dedup — Backend Query (30-60min)
4. **F5** LastGameweekWidget Empty-Slot Polish — UI (15min)
5. **F7** Meistbeobachtet Min-3 Empty-State (15min)
6. **F8** Meine Vereine Hierarchy (15min)
7. **F11** "Gratis" → Compliance-Check (5min)
8. **F12** Rewards-Pool-Empty-State (15min)
9. **F4** RPC-Timeouts → separater Slice (Backend, deferred)
10. **F6** Screenshot-Artefakt verifizieren (5min)

**Geschätzte Session-Arbeit:** 4-6h für F1+F2+F3+F5+F7+F8+F11+F12 inkl. tsc/Tests/Deploy.

---

## Proof-Artefakte

- `079-baseline/home-desktop-1280.png` — Desktop Full-Page Baseline
- `079-baseline/home-mobile-393-de.png` — Mobile 393px DE Baseline
- `079-baseline/home-mobile-393-tr.png` — Mobile 393px TR Baseline (pending)
- `079-baseline/console-messages.txt` — Browser-Console Errors+Warnings
