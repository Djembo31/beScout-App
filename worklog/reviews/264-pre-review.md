# Slice 264 Pre-Review (D62-Pattern)

**Verdict:** REWORK (4 P0, 4 P1, 4 P2)
**Spec:** `worklog/specs/264-action-required-stack.md`
**Time:** ~25 min

---

## P0 — must fix before BUILD

### P0-1 · useHomeData returnt KEIN `scopedActiveEvent` — Spec §2.7 falsch

`useHomeData.ts:141-144` deklariert `scopedActiveEvent` als lokales useMemo, returnt es aber NICHT (Z.284-309 Return-Block). Spec §2.7 behauptete „kein neuer Derive nötig" — falsch.

**Fix-Optionen:**
- (a) `scopedActiveEvent` zusätzlich exportieren — koppelt Stack an DbEvent-Type
- (b) `locksAtIso: scopedActiveEvent?.locks_at ?? null` als Primitive exportieren — entkoppelt, in Tests trivial mockbar

**CTO-Empfehlung:** **(b)** — Stack braucht nur 2 Primitives (gw, deadline-iso).

### P0-2 · Mount-Position-Annahme stimmt nicht mit page.tsx überein

Zwischen HomeStoryHeader und HomeSpotlight liegen 5 weitere Components (ScoutCardStats, BeScoutIntroCard, OnboardingChecklist, Founding-Upsell-Link, QuickActionPills). Spec sagte unscharf „zwischen Header und Spotlight".

**Fix:** Exakte Position spezifizieren — DIREKT nach `<HomeStoryHeader>` (Z.144), VOR `<ScoutCardStats>` (Z.151). Begründung: Pflicht-Action visuell höher priorisieren.

### P0-3 · TR-Wording „Hafta {n} {countdown} sonra başlıyor" gestelzt

Native-TR-Lese-Test zeigt: gestelzt, „sonra" steht falsch. Bessere Optionen:
- „Hafta {n} · {countdown} içinde" (parallel zu Slice 263 ManagerPill-Pattern „in {time}")
- „Hafta {n} · {countdown} kaldı" (= „verbleibend")

**CTO-Empfehlung:** „Hafta {n} · {countdown} içinde" für Konsistenz mit Slice 263. DE-Pendant: „Spieltag {n} · in {countdown}".

### P0-4 · `gw` defaultet zu 1 nicht null — defensive Decision pflicht

`useHomeData.ts:172` `const gw = scopedActiveEvent?.gameweek ?? 1;`. Wenn kein scopedActiveEvent: gw=1. Stack rendert null per heroMode-Guard, harmlos — aber wenn jemand später Stack ohne Guard nutzt, würde gw=1 als Lineup-Spieltag rendern.

**Fix:** Spec v2 EC-09 ergänzen: „heroMode === 'manager' AND scopedActiveEvent vorhanden — gw garantiert >= 1. Stack verlässt sich auf heroMode-Guard."

---

## P1 — clarify before BUILD

### P1-1 · URGENT_THRESHOLD_MS Shared-Helper-Extract empfohlen

Spec sagt Konstante reuse — aber unscharf ob lokal duplicaten oder shared. F-06-Pattern aus Slice 263 (`pickScopedEvent`-Extract) sagt: shared.

**Fix:** Spec v2 Decision I (NEU): URGENT_THRESHOLD_MS aus `helpers.tsx` exportieren. GameweekStatusBar refactoren um aus helpers zu importieren statt eigene Konstante. ActionRequiredStack importiert ebenfalls. Drift-Prevention.

### P1-2 · Doppelung mit ManagerBlock-Pills nicht ausreichend mitigiert

ManagerBlock.tsx Z.100-113 rendert Lineup-Pulse-Pill mit gleichem Link. Stack rendert dieselbe Action prominent darunter. Beide gold/pulse → konkurrieren visuell.

**Strategien:**
- (A) Pills aus ManagerBlock entfernen wenn Stack Card rendert — Hero wirkt leer
- (B) ManagerBlock-Pills downgraden — kein Pulse, neutrale Border. Stack übernimmt Aufmerksamkeit
- (C) Stack ersetzt nur Pills wenn URGENT (<6h) — Eskalation

**CTO-Empfehlung:** **(B)** für Phase-2-Start. Spec v2 Decision J (NEU) dokumentieren.

### P1-3 · AC-08 Captain-Card Tap → `/fantasy?tab=lineup` UX-schwach

Captain-Selection ist nach Spieler-Auswahl in der Lineup-Page. Kein Deep-Link existiert. UX-Compromise.

**Fix:** Spec v2 Decision dokumentieren: „Lineup-Tab Link, Backlog-Note Slice 264c für Captain-Deep-Link."

### P1-4 · Edge-Case fehlt — `status === 'running'` AND `now > locks_at`

Live-GW: `locks_at` in Vergangenheit, countdownMs=0. URGENT-Badge zeigt „NUR NOCH 0m" — irreführend (Lineup gelockt). Captain-Card sollte hidden sein wenn !hasCaptain bei Live-GW (nicht actionable).

**Fix:** EC-08 ergänzen: Bei `status === 'running'` AND `now > locks_at` → Stack komplett hidden.

---

## P2 — Polish

### P2-1 · Card-Style „prominent" zu vage

Konkretes Code-Snippet in Spec v2 §2.2 ergänzen analog Founding-Upsell-Link Pattern (page.tsx:160-173). Card-Höhe `min-h-[64px]`, Icon `size-5` in `size-10`-Container, Border-Color URGENT vs Default.

### P2-2 · AC-11 mt-6 entfernen — parent space-y-8 handles

`page.tsx:118` Wrapper hat `space-y-8 md:space-y-10`. Stack braucht kein explicit mt-6.

### P2-3 · TR „NUR NOCH" → „SADECE {countdown} KALDI" oder „SON {countdown}"

Anil-Vorab-Validation pflicht (siehe `feedback_tr_i18n_validation.md`).

### P2-4 · Long-String-Test in Proof-Plan ergänzen

PM-4-Mitigation visualisieren: 393px mit längstem TR-String.

---

## Was gut war

- Klare Scope-Out-Sektion §2.4 (Wildcard, Streak, Mission)
- Slice-Type=UI + Größe=S sauber klassifiziert
- 6 Pre-Mortem-Szenarien mit AC-Linkbacks
- Decision-Tabelle §9 explizit (D62-Pattern angekommen)
- D63-Phase-2-Konsistenz: Wildcard-Split ist die richtige Entscheidung
- Cascading-Logic konsistent mit Slice 262 ManagerBlock F-04

---

## CTO-Decision-Bias-Check (§9)

| # | Status | Note |
|---|--------|------|
| A (Wildcard SCOPE-OUT) | ✅ | Korrekt |
| B (locks_at statt starts_at) | ✅ | Korrekt — ABER GameweekStatusBar nutzt starts_at → Inkonsistenz: 2 verschiedene Countdowns. Spec v2 dokumentieren als bewusst (StatusBar=GW-Start für Awareness, Stack=Lineup-Deadline für Action) + Wording-Differentiator („startet in" vs „Deadline in") |
| C (URGENT_THRESHOLD_MS=6h reuse) | ⚠️ | Wert OK, Shared-Extract nötig — siehe P1-1 |
| D (Position) | ⚠️ | Zu unscharf — siehe P0-2 |
| E (Hidden bei beide erfüllt) | ✅ | Korrekt |
| F (Card-Style prominent) | ⚠️ | Style nicht spezifiziert — siehe P2-1 |
| G (TR-Wording inline) | ⚠️ | Gestelzt — siehe P0-3 |
| H (i18n-Sub-Namespace) | ✅ | Korrekt, 0 Konflikte |

---

## Spec-v2-Patches

1. **§2.7 (P0-1):** `useHomeData` Return erweitern um `locksAtIso: scopedActiveEvent?.locks_at ?? null`. Stack-Props: `{ heroMode, gw, hasLineup, hasCaptain, locksAtIso }`.
2. **§3 Files-Tabelle (P0-1):** +useHomeData.ts (Return-Edit), +helpers.tsx (URGENT_THRESHOLD_MS export — wenn Decision I), +GameweekStatusBar.tsx (-lokal, +import — wenn Decision I).
3. **§2.5 + AC-12 (P0-2):** Exakte Mount-Position: nach Z.144 `<HomeStoryHeader>`, VOR Z.151 `<ScoutCardStats>`.
4. **§9 Decision G + §10 (P0-3):** TR-Wording → „Hafta {n} · {countdown} içinde". DE-Pendant „Spieltag {n} · in {countdown}".
5. **§7 EC-08 (P1-4):** `status='running' AND now > locks_at` → Stack komplett hidden.
6. **§7 EC-09 (P0-4):** Stack rendert nur in heroMode==='manager' → gw garantiert >= 1.
7. **§9 Decision I (NEU, P1-1):** URGENT_THRESHOLD_MS shared in helpers.tsx, GameweekStatusBar-Refactor.
8. **§9 Decision J (NEU, P1-2):** ManagerBlock-Pills downgraden (kein Pulse, neutrale Border) wenn Action via Stack adressiert.
9. **§2.2 Visual-Spec (P2-1):** Konkretes Code-Snippet, analog Founding-Upsell-Link.
10. **§6 AC-11 (P2-2):** Entfernen.
11. **§9 Decision G TR-Urgent (P2-3):** „SADECE {countdown}" oder „SON {countdown}" statt „KALAN".
12. **§11 Proof-Plan (P2-4):** Long-TR-String-Screenshot ergänzen.
13. **§9 Decision K (NEU):** Countdown-Differentiator GameweekStatusBar (starts_at, „startet in") vs ActionRequiredStack (locks_at, „Deadline in") als bewusste Inkonsistenz dokumentieren.

---

**Empfehlung:** Spec v2 mit Patches 1-13. Bei Decision J (P1-2 ManagerBlock-Pill-Strategie) CTO-autonom (B) wählen. 4. D62-Pre-Review demonstriert Spec-Quality-Wert.
