# BeScout Pilot Sprint Plan

> Ziel: In 4 Wochen echte User in einer geschlossenen Beta.
> Constraint: Solo + Claude. Kein Team. Jede Stunde zählt.

---

## Ehrliche Bestandsaufnahme

### Was wir HABEN ✅
- Vollständiges Frontend (7 Seiten)
- Einheitliches Design System
- Fantasy Lobby UI (PokerStars-Style)
- Marktplatz UI (Orderbook, IPO)
- Spieler-Detail, Club, Community Pages

### Was uns FEHLT für echte User ❌
- Login / Registrierung
- Echte Datenbank (statt Mock-Daten)
- Echtes Trading (Buy/Sell mit Balance-Check)
- Echtes Fantasy Scoring
- Echte Spieler-Daten (Stats, Performances)
- BSD Wallet System

### Was wir STREICHEN für den Pilot ✂️
- Community Page (kommt später)
- Club Governance / Voting (kommt später)
- PBT Treasury Ausschüttung (kommt später)
- Success Fee System (kommt später)
- IPO System (kommt später – Pilot startet mit fertigen DPCs)
- Multi-Liga (nur EIN Club/Liga für Pilot)
- Creator Events (nur BeScout-Events für Pilot)
- Profil-Page Polish (Minimal reicht)

---

## Die Pilot-Formel

```
1 Club (z.B. Sakaryaspor) × 25 Spieler × 50 Beta-Tester
= Geschlossene Beta mit einer funktionierenden Wirtschaft

Jeder User bekommt:
- 10.000 BSD Startkapital (virtuell)
- Kann DPCs kaufen/verkaufen
- Kann an Fantasy Events teilnehmen
- Kann Ranglisten sehen
```

---

## Woche 1: Fundament 🏗️

### Tag 1-2: Supabase Setup
```
□ Supabase Projekt erstellen (Free Tier reicht für Pilot)
□ Database Schema anlegen (vereinfachte Version)
□ Row Level Security Policies
□ Supabase Auth aktivieren (Email + Google)
```

**Vereinfachtes Pilot-Schema (nur das Nötigste):**

```sql
-- 1. Spieler (manuell befüllt, ~25 Einträge)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,         -- GK, DEF, MID, ATT
  club TEXT DEFAULT 'Sakaryaspor',
  age INT,
  shirt_number INT,
  -- Stats (manuell aktualisiert nach jedem Spieltag)
  matches INT DEFAULT 0,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  perf_l5 INT DEFAULT 50,
  -- DPC & Preis
  dpc_total INT DEFAULT 10000,
  dpc_available INT DEFAULT 5000,  -- Was kaufbar ist
  floor_price INT DEFAULT 100,     -- In BSD-Cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Wallets (automatisch bei Registrierung)
CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INT NOT NULL DEFAULT 1000000, -- 10.000 BSD in Cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Holdings (wer hat welche DPCs)
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_id UUID NOT NULL REFERENCES players(id),
  quantity INT NOT NULL DEFAULT 0,
  avg_buy_price INT DEFAULT 0,
  UNIQUE(user_id, player_id)
);

-- 4. Marktplatz Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_id UUID NOT NULL REFERENCES players(id),
  side TEXT NOT NULL,              -- 'buy' oder 'sell'
  price INT NOT NULL,             -- BSD-Cents
  quantity INT NOT NULL,
  status TEXT DEFAULT 'open',     -- open, filled, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Trade-Log
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  price INT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Fantasy Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'registering',
  gameweek INT,
  entry_fee INT DEFAULT 0,
  prize_pool INT DEFAULT 0,
  max_entries INT DEFAULT 100,
  starts_at TIMESTAMPTZ,
  locks_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lineups
CREATE TABLE lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  slot_gk UUID REFERENCES players(id),
  slot_def1 UUID REFERENCES players(id),
  slot_def2 UUID REFERENCES players(id),
  slot_mid1 UUID REFERENCES players(id),
  slot_mid2 UUID REFERENCES players(id),
  slot_att UUID REFERENCES players(id),
  total_score INT,
  rank INT,
  UNIQUE(event_id, user_id)
);

-- 8. Transaktionslog (Audit)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tag 2-3: Auth + Data Layer
```
□ Login/Register Page bauen
□ Auth Context (useUser Hook)
□ Protected Routes (Redirect wenn nicht eingeloggt)
□ Data Access Layer erstellen:
  - src/lib/supabase.ts (Client)
  - src/lib/services/players.ts
  - src/lib/services/wallet.ts
  - src/lib/services/trading.ts
  - src/lib/services/fantasy.ts
```

**Data Access Pattern:**
```typescript
// src/lib/services/players.ts
import { supabase } from '../supabase';

export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name');
  if (error) throw error;
  return data;
}

export async function getPlayerById(id: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

### Tag 3-4: Spieler-Daten einspeisen
```
□ 25 Sakaryaspor-Spieler manuell in DB eintragen
□ Basis-Stats aus öffentlichen Quellen (Transfermarkt, Sofascore)
□ DPC-Preise: Starter festlegen (basierend auf Marktwert)
□ Seed-Script erstellen für schnelles Reset
```

**Spieler-Daten Quelle für Pilot (LÖSUNG):**
```
Für 25 Spieler eines Clubs brauchst du KEINE API.

1. Transfermarkt.de → Kader, Alter, Position, Marktwert
2. Sofascore.com → Matches, Goals, Assists, Ratings
3. Manuell in eine JSON/CSV → Supabase Import

Nach jedem Spieltag (1x pro Woche):
→ Du updatest die Stats manuell (15 Min Aufwand)
→ Oder: Einfaches Scraping-Script für Sofascore
```

---

## Woche 2: Kern-Loop 1 – Trading 💰

### Tag 5-6: DPC Kaufen/Verkaufen
```
□ "Verpflichten" Button → echte Order in DB
□ Balance-Check vor Kauf
□ Einfaches Matching: Buy-Order matched gegen günstigstes Sell-Angebot
□ Holdings-Update nach Trade
□ Wallet-Update nach Trade (Atomic Transaction!)
□ Trade-Log Eintrag
```

**Vereinfachtes Matching (Pilot-Version):**
```typescript
// Kein komplexes Orderbook – einfach: Marktpreis kaufen/verkaufen
async function buyDPC(userId: string, playerId: string, quantity: number) {
  // 1. Cheapest sell order finden
  // 2. Balance checken
  // 3. In einer Transaction:
  //    - Seller: Holdings -qty, Wallet +amount
  //    - Buyer: Holdings +qty, Wallet -amount
  //    - Order: status → filled
  //    - Trade-Log Eintrag
  //    - Transaction-Log für beide
}
```

### Tag 7-8: Marktplatz-Seite Live-Daten
```
□ Market Page: Mock-Daten → Supabase Queries
□ Player Detail: echte Stats aus DB
□ Portfolio: echte Holdings anzeigen
□ Home Dashboard: echtes BSD Balance, echte Holdings
□ Preis-Updates: Floor Price aus aktiven Orders berechnen
```

---

## Woche 3: Kern-Loop 2 – Fantasy ⚽

### Tag 9-10: Events & Lineups
```
□ Event erstellen (Admin-Only oder vorgeseeded)
□ Event-Lobby: echte Events aus DB
□ Lineup-Builder: echte Spieler aus DB
□ Lineup speichern in DB
□ DPC-Lock: Holdings.locked_qty updaten
□ Entry Fee: BSD abziehen
```

### Tag 11-12: Scoring
```
□ Admin-UI: Spieler-Scores nach Spieltag eintragen
□ Scoring-Funktion: Lineup Score berechnen
□ Rangliste erstellen
□ Rewards verteilen (BSD an Top-Platzierungen)
□ DPC-Unlock nach Event-Ende
```

**Pilot-Scoring (einfach):**
```typescript
// Du gibst nach jedem Spieltag manuell Scores ein (0-100 pro Spieler)
// Die Lineup-Scores werden automatisch berechnet

async function scoreEvent(eventId: string) {
  // 1. Alle Lineups für dieses Event laden
  // 2. Für jeden Spieler in jedem Lineup: Score aus player_gameweek_scores
  // 3. Summe = Lineup Score
  // 4. Ranking erstellen
  // 5. Top 30% bekommen anteilig den Prize Pool
}
```

---

## Woche 4: Polish & Launch 🚀

### Tag 13-14: Kritische Fixes
```
□ Error Handling (was passiert bei Netzwerk-Fehler?)
□ Loading States (Skeleton Screens)
□ Mobile: Grundlegend benutzbar (muss nicht perfekt sein)
□ Balance-Anzeige in TopBar (live)
□ Logout funktioniert
```

### Tag 15-16: Beta-Launch
```
□ Landing Page mit Invite-Code
□ 25 Spieler in DB seeden
□ 3 Test-Events erstellen
□ 5 Startpreise festlegen
□ 10 Beta-Tester einladen (Freunde, Familie, Football-Fans)
□ Feedback-Kanal (WhatsApp Gruppe oder Discord)
□ Du spielst selbst mit und beobachtest
```

---

## Was JEDE Seite im Pilot können muss

### Home Dashboard (/): ✅ UI fertig → Backend anbinden
- [x] UI Layout
- [ ] Echtes BSD Balance aus Wallet
- [ ] Echte Holdings aus DB
- [ ] Echte Market Movers (nach 24h Change sortiert)
- [ ] Nächstes Event aus DB

### Market (/market): ✅ UI fertig → Backend anbinden
- [x] UI Layout
- [ ] Spielerliste aus DB
- [ ] Echtes "Verpflichten" (Buy Order)
- [ ] Echtes "Verkaufen" (Sell Order)
- [ ] Floor Price aus aktiven Orders
- [ ] Eigene Orders anzeigen/canceln

### Fantasy (/fantasy): ✅ UI fertig → Backend anbinden
- [x] UI Layout
- [ ] Events aus DB
- [ ] Lineup-Builder mit echten Spielern
- [ ] Lineup speichern
- [ ] DPC-Lock
- [ ] Scoring (Admin-triggered)
- [ ] Rangliste

### Player Detail (/player/[id]): 🔶 UI teilweise → Ausfüllen + Backend
- [x] Grundlayout
- [ ] Echte Stats aus DB
- [ ] Preis-Info (Floor, 24h Change)
- [ ] Kauf-Button funktional

### Login (/login): ❌ NEU
- [ ] Email + Passwort
- [ ] Google Login
- [ ] Registrierung
- [ ] Auto-Redirect wenn eingeloggt

### Profil (/profile): Minimal reicht
- [ ] Name, Email
- [ ] BSD Balance
- [ ] Holdings-Übersicht
- [ ] Logout Button

### NICHT im Pilot:
- ~~Community Page~~ → Link entfernen oder "Kommt bald"
- ~~Club Governance~~ → Nur Anzeige, keine Votes
- ~~IPO System~~ → Alle DPCs sind bereits verfügbar
- ~~PBT Treasury~~ → Anzeige only, keine Ausschüttung

---

## Spieler-Daten: Der pragmatische Weg

Für den Pilot mit 1 Club brauchst du KEINE bezahlte API:

### Einmalig (30 Min):
1. Gehe auf transfermarkt.de → Sakaryaspor Kader
2. Kopiere: Name, Alter, Position, Trikotnummer, Marktwert
3. Gehe auf sofascore.com → Sakaryaspor
4. Kopiere: Matches, Goals, Assists, Rating

### Wöchentlich (15 Min nach jedem Spieltag):
1. Sofascore öffnen → Sakaryaspor Match
2. Ratings notieren (wird zum L5/Performance Score)
3. In Supabase Dashboard updaten oder kleines Admin-Script

### Später (wenn mehr Clubs dazukommen):
- SportMonks API (~€15/Monat) hat TFF 1. Lig Daten
- Oder: Automatisiertes Scraping von Sofascore

---

## Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|--------|-------------------|---------------|
| Supabase Auth Probleme | Mittel | Backup: einfaches Email+Password mit JWT |
| Trading-Bugs (Geld verschwindet) | Hoch | Transactions + Balance-After Logging, Admin kann resetten |
| Scoring falsch | Mittel | Manuelles Override möglich, transparente Score-Anzeige |
| Keiner traded | Hoch | Seed-Orders einstellen (du als "Market Maker") |
| Mobile unbenutzbar | Mittel | Pilot auf Desktop fokussieren, Mobile = "beta" |

---

## Täglicher Arbeitsrhythmus (Solo + Claude)

```
Morgens:  Task aus diesem Plan nehmen
          → Claude Code Session (1-2 Stunden)
          → Testen im Browser
          → Commit

Abends:   Nächsten Task vorbereiten
          → TODO.md updaten
          → Bugs notieren

Wochenende: Spieltag-Daten aktualisieren
            → Scoring durchführen
            → User-Feedback lesen
```

---

## Launch Checklist (Tag 16)

```
□ 25 Spieler in DB mit aktuellen Stats
□ Login/Registrierung funktioniert
□ Jeder neue User bekommt 10.000 BSD
□ DPC Kaufen/Verkaufen funktioniert
□ Portfolio zeigt echte Holdings
□ 3 Fantasy Events sind erstellt
□ Lineup-Builder funktioniert
□ Scoring-Funktion ist getestet
□ Mobile: zumindest lesbar (kein Layout-Bruch)
□ Error-Handling: App crashed nicht bei Fehlern
□ 10 Beta-Tester haben Invite-Link
□ Feedback-Kanal ist eingerichtet
□ Du hast selbst 1 Stunde als User gespielt
```
