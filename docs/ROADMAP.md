# BeScout — Roadmap

> Letzte Aktualisierung: 13.02.2026 (nach Phase 6.5)
> Siehe `docs/VISION.md` für die vollständige Produktvision.

---

## Übersicht

```
ABGESCHLOSSEN:
  Phase 0: Frontend MVP (UI komplett)                    ✅ Fertig
  Phase 1: Polish & Refactoring                          ✅ Fertig
  Phase 2: Backend & Auth                                ✅ Fertig
  Phase 3: Core Features (Trading, Fantasy, Community)   ✅ Fertig
  Phase 4: Pilot Launch (Sakaryaspor)                    ✅ Tech fertig (Beta-Tester offen)
  Phase 5: Content Economy (Berichte, Paywall, PBT)      ✅ Fertig

AKTUELL UND GEPLANT:
  Phase 6: Club Tools (Dashboard, Multi-Club, Bounties)  ✅ Fertig (6.1-6.5)
  Phase 7: Scale (Galatasaray+, Abos, Creator)           ⬜ Geplant  ← NÄCHSTE
```

---

## Community-Strang (Übersicht über alle Phasen)

Die Community ist das Herzstück der Plattform. Hier die Evolution über alle Phasen:

```
Phase 3 ✅  Basis-Community
            ├── Posts (kostenlos, Upvote/Downvote)
            ├── Follower System (Follow/Unfollow)
            ├── Club Votes (BSD-Kosten, Ergebnisse)
            ├── Leaderboard (Scout Score Ranking)
            └── 5 Tabs (Für dich, Folge ich, Research⚠️, Abstimmungen, Leaderboard)

Phase 4 ✅  Community Polish
            ├── ✅ Kommentare / Replies unter Posts
            ├── ✅ Content-Kategorien (Analyse, Prediction, Meinung, News)
            └── ✅ Research-Tab LIVE (Berichte kaufen/verkaufen)

Phase 5 ✅  Content Economy — Community wird Marktplatz
            ├── ✅ Research-Tab LIVE: Berichte kaufen/verkaufen
            ├── ✅ Bericht-Erstellung (Spieler/Verein taggen, Kategorie wählen)
            ├── ✅ BSD-Paywall (Autor setzt Preis, Vorschau sichtbar, 80/20 Split)
            ├── ✅ Bewertungssystem (1-5 ★ für Berichte, nur nach Kauf)
            ├── ✅ Track Record auf Profil (Research-Calls mit Outcome + Hit-Rate)
            ├── ✅ Bericht-Marketplace (Sortierung, Kategorien, Call-Filter)
            ├── ✅ Bezahlte Polls (BSD-Teilnahmegebühr, 70/30 Split)
            ├── ✅ PBT + Fee Split (Trade 5%, IPO 85/10/5)
            └── ✅ Research-Kategorien (5 Typen, Filter, Club-Vorschau)

Phase 6 ✅  Club-Integration — Community trifft Verein
            ├── ✅ Club-Aufträge / Bounties (Verein beauftragt Analysen)
            ├── ✅ Fans reichen Berichte ein → Verein bewertet + bezahlt
            ├── ✅ Club kann Berichte von Top-Fans einholen + vergüten
            ├── ✅ Achievement: "Club Scout" (Auftrag abgeschlossen)
            └── ⬜ Moderation Tools (Club-Admins moderieren ihren Bereich)

Phase 7 ⬜  Scale — Community wird Ökosystem
            ├── Creator-Abos (Fans abonnieren andere Fans, BSD/Monat)
            ├── Trending Posts / Hot Takes (algorithmisch)
            ├── Recommendation Engine ("Ähnliche Analysen")
            ├── Content-Kategorien erweitert (Video, Statistik, Taktik)
            ├── Meldungen / Community-Moderation (Reports, Mute, Block)
            └── Verified Creator Programm (Top-Analysten bekommen Badge)
```

---

## Phase 0–3: Abgeschlossen ✅

### Phase 0: Frontend MVP ✅
Alle Seiten mit UI, Design System, Shared Components.

### Phase 1: Polish ✅
Fantasy Refactoring (3000→690 Zeilen), TypeScript strict (0 `any`), Mobile Responsive.

### Phase 2: Backend & Auth ✅
Supabase (PostgreSQL + Auth), 74 SQL-Migrationen, Service Layer (13 Services), In-Memory TTL Cache.

### Phase 3: Core Features ✅
- **Trading:** Buy/Sell/Cancel via atomare RPCs, ipo_price vs floor_price
- **IPO System:** Club-Verkauf von Spielerkarten
- **Fantasy:** Events, Lineups, Scoring v2, Leaderboard, Rewards, Pitch-Visualisierung
- **Community:** Posts (Upvote/Downvote), Club Votes, Follower, 5 Tabs
- **Reputation:** Scout Score (Trading/Manager/Scout), 18 Achievements, Level-Tiers, Leaderboard
- **Performance:** Timeouts, Memoization, Caching, Error Recovery, ErrorState UI

---

## Phase 4: Pilot Launch — Sakaryaspor ✅ (Tech fertig)

**Ziel:** 50 echte Beta-Tester, erste Engagement-Zahlen, Proof of Concept.

### 4.1 Fan-Akquise
- [x] Landing Page (erklärt BeScout, Invite-Flow) ✅
- [ ] 10 Beta-Tester einladen (Woche 1)
- [ ] 50 Beta-Tester erreichen (Woche 4)

### 4.2 Basis Club Dashboard (Read-Only) ✅
- [x] Club Revenue-Übersicht (DPC-Verkäufe, Vote-Einnahmen, Entry Fees) ✅
- [x] Fan-Metriken (registrierte Fans, aktive Fans, Top-Fans) ✅

### 4.3 Community Polish ✅
- [x] Kommentare / Replies unter Posts ✅
- [x] Content-Kategorien für Posts (Analyse, Prediction, Meinung, News) ✅
- [x] Research-Tab: LIVE (Berichte kaufen/verkaufen statt "Coming Soon") ✅

### 4.4 Feedback & Iteration
- [x] Feedback-Kanal (In-App Feedback-Modal + Tabelle) ✅
- [ ] Bug-Tracking + schnelle Fixes (laufend)
- [ ] KPI-Tracking: Registrierungen, Retention, BSD-Umsatz, Votes

### 4.5 Pilot-KPIs (Erfolgs-Kriterien)
- X Fans registriert
- Y BSD an DPC-Verkäufen
- Z Votes abgegeben
- Retention: wie viele kommen nach 1 Woche zurück?

---

## Phase 5: Content Economy ✅

**Ziel:** Fans können VERDIENEN, nicht nur ausgeben. Community wird zum Wissens-Marktplatz.

### 5.1 Research-Tab LIVE — Bericht-Marketplace ✅
- [x] Bericht-Erstellung: Titel, Inhalt, Spieler/Verein taggen, Kategorie wählen ✅
- [x] Kategorien: Spieler-Analyse, Transfer-Empfehlung, Taktik, Saisonvorschau, Scouting-Report ✅
- [x] Bericht-Übersicht: Sortierung nach Neueste, Top bewertet, Meistverkauft + Kategorie-Filter ✅
- [x] Spieler-/Verein-Tag: Berichte erscheinen auf der Spieler- UND Club-Detailseite ✅

### 5.2 Premium Posts / Paywall ✅
- [x] Autor setzt Preis für Bericht (1-100K BSD) ✅
- [x] Vorschau sichtbar (erste ~300 Zeichen), Rest hinter Paywall ✅
- [x] Käufer zahlt BSD → Autor verdient 80%, Plattform 20% (atomare RPC) ✅
- [x] Kauf-Counter sichtbar ✅
- [x] Kostenlose Posts bleiben weiterhin möglich ✅

### 5.3 Bewertungssystem ✅
- [x] Sterne-Bewertung für Berichte (1-5 ★, nur nach Kauf) ✅
- [x] Durchschnittsbewertung auf Bericht sichtbar ✅
- [x] "Top bewertet" Sortierung im Marketplace ✅
- [x] Bewertungs-Snippet: avg_rating + ratings_count ✅

### 5.4 Track Record (verifizierte Research-History) ✅
- [x] Preis-Snapshot bei Research-Erstellung (`price_at_creation`) ✅
- [x] Lazy auto-resolve: Bullish/Bearish/Neutral Calls nach 24h/7d Horizont ✅
- [x] Outcome-Badge auf ResearchCard (Korrekt/Falsch + Preisänderung %) ✅
- [x] Profil Research-Tab: Hit-Rate Summary + eigene Posts mit Outcome ✅

### 5.5 PBT + Fee Split ✅
- [x] `pbt_treasury` + `pbt_transactions` + `fee_config` Tabellen deployed ✅
- [x] Trade Fee → Split: 3.5% Plattform + 1.5% PBT + 0% Verein (konfigurierbar) ✅
- [x] IPO Fee → Split: 85% Club + 10% Plattform + 5% PBT ✅
- [x] PBT-Balance sichtbar auf Spieler-Detailseite ✅

### 5.6 Bezahlte Polls ✅
- [x] Fan erstellt Umfrage mit BSD-Teilnahmegebühr ✅
- [x] Ersteller bekommt 70%, Plattform 30% (atomare RPC) ✅
- [x] Ergebnisse öffentlich nach Ablauf ✅

### 5.7 Profil-Erweiterungen ✅
- [x] Trading-History öffentlich auf Profil ✅
- [x] Fantasy-Ergebnisse auf Profil (Platzierungen, Punkte, Rewards) ✅
- [x] Verifizierungs-Badge: "Verifizierter Scout" (>=5 Calls + >=60% Hit-Rate) ✅
- [ ] PBT-Prognose (verschoben — erst relevant bei mehr Trading-Volumen)

---

## Phase 6: Club Tools (Wochen 10–16) ✅ (6.1-6.5 fertig)

**Ziel:** Vereine managen sich selbst. Multi-Club Architektur. Ready für Galatasaray-Pitch.

### 6.1 Multi-Club Architektur ✅
- [x] `clubs` Tabelle in DB (Slug, Branding, Plan, Revenue-Split) ✅
- [x] `club_admins` Tabelle (welche User verwalten welchen Club) ✅
- [x] `club_id` FK auf Events, Votes, IPOs, Posts ✅
- [x] Routing: `/club/[slug]` (Fan-Seite), `/club/[slug]/admin` (Dashboard) ✅

### 6.2 Club Dashboard (Self-Service) ✅
- [x] Revenue Dashboard (DPC-Verkäufe, Votes, Entry Fees, Gebühren) ✅
- [x] Fan Analytics (aktive Fans, Retention, Top-Fans, Wachstum) ✅
- [x] IPO Management (erstellen, starten, beenden) ✅
- [x] Event Management (Fantasy Events erstellen) ✅
- [x] Vote Management (Abstimmungen erstellen) ✅
- [x] Einstellungen (Branding, Team-Verwaltung, Revenue-Split) ✅

### 6.3 Club-Aufträge / Bounties ✅
- [x] Verein erstellt Auftrag ("Analysiere U21-Spieler aus Liga X") ✅
- [x] Auftrag sichtbar im Community-Feed + auf Club-Seite ✅
- [x] Fans reichen Berichte ein (als Antwort auf den Auftrag) ✅
- [x] Verein bewertet + bezahlt Top-Berichte in BSD ✅
- [x] Achievement: "Club Scout" (Auftrag abgeschlossen) ✅
- [x] 2 Bounty-Missions (daily + weekly) ✅

### 6.4 Community-Moderation (Club-Level)
- [ ] Club-Admins können Posts in ihrem Bereich moderieren
- [ ] Pinned Posts (Club-Announcements)
- [ ] Community Guidelines pro Club

### 6.5 Success Fee + Liquidierung ✅
- [x] Verein setzt Success Fee Cap pro Spieler ✅
- [x] Verein triggert Liquidierung bei Vertragsablauf ✅
- [x] PBT-Distribution an DPC-Holder (proportional) ✅
- [x] Success Fee bleibt reserviert im PBT (Auszahlung in Phase 7) ✅
- [x] DPCs werden ungültig nach Liquidierung ✅
- [x] Trading-Guards (Frontend + Backend) für liquidierte Spieler ✅
- [x] Holder-Benachrichtigungen bei Liquidierung ✅

### 6.6 Galatasaray-Pitch vorbereiten
- [ ] Sakaryaspor Case Study mit echten Zahlen
- [ ] Galatasaray Mockup (Branding, Spieler)
- [ ] Revenue-Projektion
- [ ] Demo-Umgebung

---

## Phase 7: Scale (nach Galatasaray) ⬜

**Ziel:** Vollständige Plattform, mehrere Clubs, professionelle Features.

### 7.1 Missions / Quests ✅ (bereits in Phase 5 umgesetzt)
- [x] Tägliche Missionen (8 daily + 2 bounty daily) ✅
- [x] Wöchentliche Missionen (6 weekly + 1 bounty weekly) ✅
- [x] BSD-Rewards für abgeschlossene Missionen ✅
- [x] MissionBanner auf Home Page ✅
- [ ] Streak-Bonus (X Tage in Folge aktiv) — Post-Pilot

### 7.2 Club-Abos
- [ ] Fans abonnieren einen Club (X BSD/Monat)
- [ ] Vorteile: Early Access IPOs, exklusive Votes, Premium Events
- [ ] Verein verdient monatlich recurring

### 7.3 Creator-Abos & Monetarisierung
- [ ] Fans abonnieren andere Fans/Creator (X BSD/Monat)
- [ ] Zugang zu Premium-Content des Creators
- [ ] Creator verdient recurring
- [ ] Creator Dashboard (Einnahmen, Subscriber, Top Posts)
- [ ] Verified Creator Programm (Top-Analysten bekommen Badge + Sichtbarkeit)

### 7.4 Community Scale
- [ ] Trending Posts / Hot Takes (algorithmisch)
- [ ] Recommendation Engine ("Ähnliche Analysen", "Fans die X kauften...")
- [ ] Content-Kategorien erweitert (Video-Embed, Statistik-Widgets, Taktik-Board)
- [ ] Meldungen / Community-Moderation (Reports, Mute, Block per DB)
- [ ] Diskussions-Threads (verschachtelte Replies)

### 7.5 Notifications & Retention
- [ ] Push Notifications (Event Start, Vote Ende, Preis-Alert, neuer Bericht von Creator)
- [ ] Email Digest (wöchentliche Zusammenfassung)
- [ ] In-App Notifications
- [ ] "X hat deinen Bericht gekauft" Benachrichtigung

### 7.6 Weitere Ligen & Clubs
- [ ] Onboarding-Flow für neue Vereine
- [ ] Multi-Liga Navigation
- [ ] Liga-übergreifende Events
- [ ] Liga-spezifische Communities

---

## Entscheidungen (getroffen)

| Thema | Entscheidung | Status |
|-------|-------------|--------|
| Backend | Supabase (PostgreSQL + Auth + Realtime) | ✅ Umgesetzt |
| Auth | Supabase Auth (Email + OAuth) | ✅ Umgesetzt |
| State | React Context (AuthProvider, WalletProvider) | ✅ Umgesetzt |
| Caching | In-Memory TTL Cache | ✅ Umgesetzt |
| Scoring | Supabase RPC, kanonische Scores pro Spieler | ✅ Umgesetzt |
| Geld | BIGINT in Cents, atomare RPCs | ✅ Umgesetzt |
| Hosting | Vercel | Tendenz |
| Payments | Keins für Pilot | ✅ Entschieden |
| Realtime | Polling + Cache (Realtime später) | ✅ Entschieden |
| Plattform-Modell | B2B2C (Vereine = Kunden, Fans = Endnutzer) | ✅ Entschieden |
| Blockchain | Nein — zentrale DB, kein Crypto | ✅ Entschieden |
| Success Fee | Optional, vom Verein gesteuert, mit Cap | ✅ Entschieden |
| PBT | Automatisch aus Trading-Gebühren, proportionale Verteilung | ✅ Entschieden |
| Content Monetarisierung | BSD-Paywall für Berichte/Analysen | ✅ Entschieden |
| Club-Aufträge | Bounty-System (Club zahlt BSD für Analysen) | ✅ Entschieden |
| Community Moderation | Pilot: localStorage, Scale: DB + Club-Admins | ✅ Entschieden |
