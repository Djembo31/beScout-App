# Roadmap: BeScout Premium-Klasse

**Stand:** 2026-04-06
**Ziel:** App muss Geld verdienen. Premium-Qualitaet in jeder Hinsicht — UX, Features, Polish.

---

## Phase A: Kern-Features fertig bauen (PRIO 1)

Vier Features mit Backend-Code aber fehlendem UI. Ohne diese ist die App unvollstaendig.

### A1. Manager Command Center
**Was:** Eigene Seite fuer Fantasy-Management (Lineups, Events, Scoring-Uebersicht)
**Warum:** Einziges offenes Sprint-Feature. User brauchen einen Hub fuer Fantasy-Aktivitaeten.
**Status:** Nicht angefangen. Braucht /spec.
**Aufwand:** 1-2 Sessions

### A2. Scout Missions UI
**Was:** Mission-Cards, Progress-Anzeige, Claim-Flow
**Warum:** Backend komplett (RPCs, Services, Hooks). Missions sind der Engagement-Kern — taegliche Aufgaben die User zurueckbringen.
**Status:** Service existiert, UI fehlt komplett.
**Aufwand:** 1 Session
**Referenz:** Community-Page zeigt aehnliche Mission-Karten

### A3. Following Feed
**Was:** Social Feed mit Posts/Research/Bounties der gefolgten User
**Warum:** Social-Engagement. User sollen sehen was ihre Kontakte machen.
**Status:** Hooks existieren (`useFollowingFeed`). Community hat "Folge ich" Tab — pruefen ob angebunden.
**Aufwand:** 0.5 Session (evtl. schon teilweise verdrahtet)

### A4. Transactions History
**Was:** Liste aller Wallet-Transaktionen im Profil oder Wallet-Bereich
**Warum:** Transparenz. User muessen sehen wohin ihr Geld geht. Compliance-relevant.
**Status:** Hook existiert (`useTransactions`). UI fehlt.
**Aufwand:** 0.5 Session

---

## Phase B: Oekonomie + Balance (PRIO 2)

### B1. Mystery Box Oekonomie kalibrieren
**Was:** Drop-Raten in `mystery_box_config` richtig setzen
**Warum:** Platzhalter-Werte (50/28/15/5/2) sind nicht balanciert. Zu viel/wenig Rewards kaputtiert die Economy.
**Vorbereitung:** Benchmark-Recherche ist gemacht (Brawl Stars, Genshin Impact, Clash Royale). Session muss Raten + Betraege + evtl. Pity-System designen + 1000-Oeffnungen-Simulation laufen lassen.
**Aufwand:** 1 Session

### B2. Visual QA Equipment Lineup
**Was:** Equipment im Lineup Builder visuell testen
**Blocker:** Kein offenes Event aktuell. Entweder naechsten Spieltag abwarten oder Test-Event erstellen.
**Aufwand:** 15 min wenn Event da

---

## Phase C: Polish + Premium-Feeling (PRIO 3)

### C1. Stadium Noir detaillierte QA
**Was:** Jede Section der Home-Page auf 390px + 1440px pruefen
**Status:** Grob gesehen (sah gut aus), Section-by-Section noch ausstehend

### C2. Equipment Inventar Screen
**Was:** Eigener Screen wo User sein gesammeltes Equipment sehen kann (Typ, Rang, Anzahl, History)
**Status:** Optional — Equipment aktuell nur im Lineup-Picker sichtbar

### C3. Vorbestehende Test-Failures fixen
**Was:** ipo.test.ts Netzwerk-Error, EventDetailModal.test.tsx fehlende testids
**Status:** CI: Build + Lint success, Tests failure (nicht blockierend fuer Deploy)

### C4. Migration History aufraemen
**Was:** `supabase db push` Timestamp-Konflikte loesen
**Workaround:** `supabase db query --linked -f file.sql` funktioniert

---

## Empfohlene Reihenfolge fuer naechste Sessions

```
Session 1: A1 — Manager Command Center (/spec → build)
Session 2: A2 — Scout Missions UI (E2E)
Session 3: A3 + A4 — Following Feed + Transactions History (beide klein)
Session 4: B1 — Mystery Box Oekonomie kalibrieren
Session 5: C1-C4 — Polish Sprint (QA, Tests, Migration)
```

Jede Session startet mit: Handoff lesen → tsc check → offene Items pruefen → /spec wenn 3+ Files.

---

## Premium-Checkliste (was "Premium-Klasse" bedeutet)

| Bereich | Kriterium | Status |
|---------|-----------|--------|
| **UX** | Jeder Screen hat Loading + Empty + Error State | Teilweise |
| **UX** | Keine leeren Seiten, kein Flash of Content | Teilweise |
| **UX** | Mobile-First, Touch Targets 44px+ | Ja |
| **Design** | Stadium Noir konsistent auf allen Screens | Home ja, Rest pruefen |
| **Features** | Missions, Feed, Transactions E2E | Fehlt |
| **Features** | Manager Command Center | Fehlt |
| **Features** | Equipment im Lineup visuell verifiziert | Fehlt (kein Event) |
| **Gamification** | Mystery Box Premium Animation | Ja |
| **Gamification** | Equipment-System deployed | Ja |
| **Economy** | Drop-Raten kalibriert | Nein (Platzhalter) |
| **Compliance** | TradingDisclaimer auf allen Seiten | Pruefen |
| **i18n** | DE + TR vollstaendig | Pruefen |
| **Performance** | Kein Query-Wasserfall, staleTime korrekt | Teilweise |
| **Tests** | CI gruen | Nein (vorbestehende Failures) |
