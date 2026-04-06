# Mystery Box Premium — Star Drops Upgrade

**Datum:** 2026-04-06
**Status:** SPEC PHASE — Review durch Anil
**Autor:** Claude (Spec), Anil (Requirements)

---

## 1.1 Current State — Feature Inventory

### User-sichtbare Features

| # | Feature | Beschreibung | Status |
|---|---------|-------------|--------|
| F1 | Mystery Box öffnen | 15 Tickets (Streak-Discount), gibt Tickets oder Cosmetic | Live |
| F2 | Free Mystery Box | 1x/Woche ab 30-Tage-Streak | Live |
| F3 | Rarity Preview | Drop-Tabelle im Modal sichtbar (45/30/15/8/2%) | Live |
| F4 | Reward Display | Rarity-Badge + Ticket-Anzahl oder "Cosmetic unlocked" | Live |
| F5 | Opening Animation | 1.5s CSS Shake → sofort Reveal | Live (Basic) |
| F6 | Box History | `getMysteryBoxHistory()` — letzte 20 Öffnungen | Backend only |
| F7 | Alte Chips (Legacy) | 4 Fantasy-Booster (Triple Captain, Wildcard etc.) via Tickets | Live — **WIRD ERSETZT** |
| F8 | Wallet (CR / bCredits) | Balance in TopBar + SideNav als "CR" | Live |
| F9 | Streak Benefits | Tägliche Tickets, Fantasy-Bonus, Free Box, Ticket-Discount | Live |

### File Inventory

| # | File | Lines | Rolle | Aktion |
|---|------|-------|-------|--------|
| 1 | `src/components/gamification/MysteryBoxModal.tsx` | 321 | UI Modal | **REWRITE** |
| 2 | `src/lib/services/mysteryBox.ts` | 71 | Service Layer | **ENHANCE** |
| 3 | `src/lib/queries/mysteryBox.ts` | 18 | React Query Hook | **ENHANCE** |
| 4 | `src/types/index.ts` | ~50 | Types | **ENHANCE** |
| 5 | `src/lib/chips.ts` | 99 | Legacy Chip Defs | **DEPRECATED** (nicht löschen in dieser Session) |
| 6 | `src/features/fantasy/services/chips.ts` | 116 | Legacy Chip Service | **DEPRECATED** (nicht löschen in dieser Session) |
| 7 | `src/components/gamification/ChipSelector.tsx` | 276 | Legacy Chip UI | **DEPRECATED** (nicht löschen in dieser Session) |
| 8 | `src/lib/streakBenefits.ts` | 90 | Streak → Free Box | **NONE** |
| 9 | `src/app/(app)/hooks/useHomeData.ts` | ~40 | Box Handler | **ENHANCE** |
| 10 | `src/app/(app)/page.tsx` | ~10 | Home Page render | **MINOR** |
| 11 | `src/app/(app)/missions/page.tsx` | ~15 | Missions Page render | **MINOR** |
| 12 | `src/components/gamification/DailyChallengeCard.tsx` | ~20 | CTA Button | **NONE** |
| 13 | `src/lib/services/wallet.ts` | 156 | Wallet Service | **NONE** |
| 14 | `src/lib/services/tickets.ts` | 100 | Ticket Service | **NONE** |
| 15 | `src/app/globals.css` | ~20 | CSS Animations | **ENHANCE** |
| 16 | `messages/de.json` | ~20 | i18n DE | **ENHANCE** |
| 17 | `messages/tr.json` | ~20 | i18n TR | **ENHANCE** |

### Data Flow (aktuell)

```
DailyChallengeCard [CTA Button]
  → setShowMysteryBox(true) [page state]
    → MysteryBoxModal [open prop]
      → handleOpenMysteryBox() [useHomeData / missions page]
        → openMysteryBox(free?) [service]
          → supabase.rpc('open_mystery_box', { p_free })
            → Returns: { ok, rarity, reward_type, tickets_amount, cosmetic_key }
          → triggerMissionProgress(['open_mystery_box', 'daily_activity'])
        → invalidateQueries(qk.tickets.balance, qk.cosmetics.user)
        → localStorage week tracker (free box)
      → MysteryBoxResult displayed in Modal
```

### Data Flow (NEU — nach Upgrade)

```
DailyChallengeCard [CTA Button]
  → setShowMysteryBox(true) [page state]
    → MysteryBoxModal [open prop]
      → handleOpenMysteryBox() [useHomeData / missions page]
        → openMysteryBox(free?) [service]
          → supabase.rpc('open_mystery_box_v2', { p_free })
            → Returns: { ok, rarity, reward_type,
                         tickets_amount?,
                         equipment_type?, equipment_rank?,
                         bcredits_amount?,
                         cosmetic_key? }
            → RPC-intern:
                reward_type='equipment' → INSERT user_equipment
                reward_type='bcredits'  → UPDATE wallets.balance
                reward_type='tickets'   → credit_tickets()
                reward_type='cosmetic'  → INSERT user_cosmetics
          → triggerMissionProgress(['open_mystery_box', 'daily_activity'])
        → invalidateQueries(qk.tickets, qk.cosmetics, qk.wallet, qk.equipment)
        → localStorage week tracker (free box)
      → 3-Phasen Premium Animation
      → Reward Display (Equipment-Card / bCredits-Zahl / Ticket-Zahl)
```

### Shared State

| Store/Query | Key | Consumers |
|-------------|-----|-----------|
| React Query | `qk.tickets.balance(uid)` | MysteryBoxModal, ChipSelector, DailyChallengeCard, TopBar, SideNav |
| React Query | `qk.cosmetics.user(uid)` | MysteryBoxModal (invalidation), Profile cosmetics |
| React Query | `qk.mysteryBox.history(uid)` | useMysteryBoxHistory hook |
| React Query | `qk.wallet(uid)` | TopBar, SideNav — **NEU: invalidieren bei bCredits-Drop** |
| React Query | `qk.equipment.inventory(uid)` | **NEU** — Equipment-Inventar |
| localStorage | `bescout-free-box-week` | Home page, Missions page (free box tracker) |

### External Links to Mystery Box

| File | Line | Context |
|------|------|---------|
| `src/app/(app)/page.tsx` | 36, 390-402 | Dynamic import + render |
| `src/app/(app)/missions/page.tsx` | 32, 171-183 | Dynamic import + render |
| `src/components/gamification/DailyChallengeCard.tsx` | 29, 74-88, 240-254 | CTA buttons |
| `src/app/(app)/hooks/useHomeData.ts` | 18, 198-220 | Service import + handler |
| `e2e/bots/ai/actions.ts` | 324 | E2E bot action |
| `scripts/mission-definitions-expanded.sql` | — | Mission: 'open_mystery_box' |

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals

1. **Premium Animation** — Mystery Box Opening auf Brawl Stars Star Drops Niveau (Anticipation → Burst → Celebration), Rarity-abhängige visuelle Intensität
2. **Neues Equipment-System** — 5 positionsbasierte Ausrüstungen (Feuerschuss, Bananen Flanke, Eiserne Mauer, Katzenauge, Kapitän) mit Rängen R1-R4, sammelbar im Inventar, anlegbar an Lineup-Spieler
3. **Erweiterter Reward Pool** — Mystery Box droppt Tickets, Equipment (R1-R4) oder bCredits (= Wallet CR) je nach Stufe
4. **5 Rarity-Stufen** — Common → Mythic mit klarem Reward-Mapping
5. **Sound-Ready** — Audio-Hooks vorbereiten (kein Sound implementieren, aber Callback-API bereit)
6. **Legacy-Chips deprecated** — Alte Chips (Triple Captain etc.) werden durch Equipment-System ersetzt, altes System bleibt erstmal im Code (Cleanup = separate Session)

### Non-Goals

- Legacy-Chips löschen (bleibt erstmal parallel, Cleanup separat)
- Equipment im Lineup anlegen (kommt in nächster Session — "Chip-Erweiterung")
- Fantasy-Scoring-Integration (Equipment-Multiplikator auf Spieltag-Bewertung — separate Session)
- Shop für Mystery Boxes
- Sound-Files/Audio implementieren
- 3D/WebGL Animationen

### Anti-Requirements

- KEIN Framer Motion oder neue Animation-Library — CSS Keyframes + Canvas
- KEIN neues DB-Feld "currency" in wallets — bCredits = wallets.balance (nur UI-Label)
- KEINE Änderung an Streak-Benefits-Logik
- KEINE Löschung von altem Chip-Code (nur deprecated markieren)
- Equipment-Multiplikatoren (x1.05 etc.) werden in DB gespeichert, aber NICHT in dieser Session in Fantasy-Scoring integriert

---

## Equipment-System Design

### 5 Equipment-Typen

| Equipment | Key | Position | Beschreibung |
|-----------|-----|----------|-------------|
| Feuerschuss | `fire_shot` | ATT (Stürmer) | Boost auf Stürmer-Bewertung |
| Bananen Flanke | `banana_cross` | MID (Mittelfeld) | Boost auf Mittelfeld-Bewertung |
| Eiserne Mauer | `iron_wall` | DEF (Abwehr) | Boost auf Abwehr-Bewertung |
| Katzenauge | `cat_eye` | GK (Torwart) | Boost auf Torwart-Bewertung |
| Kapitän | `captain` | ALL | Boost auf einen beliebigen Spieler |

### 4 Ränge (identisch für alle Typen)

| Rang | Key | Multiplikator | Effekt |
|------|-----|--------------|--------|
| R1 | 1 | x1.05 | +5% Spieltag-Bewertung |
| R2 | 2 | x1.10 | +10% Spieltag-Bewertung |
| R3 | 3 | x1.15 | +15% Spieltag-Bewertung |
| R4 | 4 | x1.25 | +25% Spieltag-Bewertung |

### Drop-Logik

Bei Equipment-Drop: **zufällig** aus allen 5 Typen, Rang durch Stufe bestimmt.

### DB-Design

```sql
-- Equipment-Definitionen (config-driven, erweiterbar)
CREATE TABLE equipment_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,           -- 'fire_shot', 'banana_cross', etc.
  name_de TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  description_de TEXT,
  description_tr TEXT,
  position TEXT NOT NULL,             -- 'ATT', 'MID', 'DEF', 'GK', 'ALL'
  icon TEXT,                          -- lucide icon name
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rang-Multiplikatoren (config-driven)
CREATE TABLE equipment_ranks (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL UNIQUE,       -- 1, 2, 3, 4
  multiplier NUMERIC(4,2) NOT NULL,   -- 1.05, 1.10, 1.15, 1.25
  label TEXT NOT NULL                 -- 'R1', 'R2', 'R3', 'R4'
);

-- User-Inventar (gesammelte Equipment-Stücke)
CREATE TABLE user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  equipment_key TEXT NOT NULL,        -- FK to equipment_definitions.key
  rank INTEGER NOT NULL,              -- 1-4
  source TEXT NOT NULL,               -- 'mystery_box', 'achievement', 'admin_grant'
  equipped_player_id UUID,            -- NULL = im Inventar, SET = an Spieler angelegt
  equipped_event_id UUID,             -- NULL = nicht aktiv, SET = für dieses Event
  acquired_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Mystery Box Stufen-Mapping

### Struktur (fix)

| Stufe | Rarity | Mögliche Reward-Typen |
|-------|--------|-----------------------|
| 1 | Common | Tickets |
| 2 | Rare | Tickets ODER Equipment R1 |
| 3 | Epic | Tickets, Equipment R1 ODER R2 |
| 4 | Legendary | Tickets, Equipment R1-R3 ODER bCredits |
| 5 | Mythic | Equipment R3-R4 ODER bCredits |

### Ökonomie (SEPARAT — eigene Session)

Die folgenden Werte werden in einer **separaten Ökonomie-Session** designed:
- Drop-Wahrscheinlichkeit pro Stufe (%, z.B. Brawl Stars: 50/28/15/5/2)
- Reward-Gewichtung INNERHALB jeder Stufe (z.B. Common: 70% wenig Tickets, 25% viel Tickets, 5% Bonus)
- Ticket-Beträge pro Stufe (Ranges)
- bCredits-Beträge pro Stufe (Ranges in cents)
- Pity/Mercy-System (Soft-Pity wie Genshin? Duplikat-Schutz wie Brawl Stars?)
- Duplikat-Handling (Equipment das User schon hat → Fallback-Reward?)

**Referenz-Recherche:** Brawl Stars Star Drops, Genshin Impact Wish, Clash Royale Lucky Chests — dokumentiert in separatem Research-Doc.

### Technisches Design (diese Session)

Alle Werte kommen aus der **`mystery_box_config` DB-Tabelle** — komplett config-driven:

```sql
CREATE TABLE mystery_box_config (
  id SERIAL PRIMARY KEY,
  rarity TEXT NOT NULL,                    -- 'common', 'rare', 'epic', 'legendary', 'mythic'
  drop_weight INTEGER NOT NULL DEFAULT 1,  -- relative Gewichtung (nicht %)
  reward_type TEXT NOT NULL,               -- 'tickets', 'equipment', 'bcredits'
  reward_weight INTEGER NOT NULL DEFAULT 1,-- Gewichtung innerhalb der Stufe
  min_value INTEGER,                       -- Tickets: Anzahl, bCredits: cents, Equipment: min Rang
  max_value INTEGER,                       -- Tickets: Anzahl, bCredits: cents, Equipment: max Rang
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Beispiel-Rows (Platzhalter — echte Werte aus Ökonomie-Session):**
```
common,  50, tickets,    1, 5,     15
rare,    28, tickets,    3, 15,    40
rare,    28, equipment,  1, 1,     1     -- R1
epic,    15, tickets,    2, 40,    100
epic,    15, equipment,  2, 1,     2     -- R1 oder R2
legendary, 5, tickets,  1, 100,   250
legendary, 5, equipment, 2, 1,    3     -- R1-R3
legendary, 5, bcredits, 1, 5000,  20000
mythic,  2, equipment,  3, 3,     4     -- R3-R4
mythic,  2, bcredits,   2, 20000, 50000
```

**RPC liest diese Tabelle** und entscheidet per Weighted Random. Keine Zahlen hardcoded im Code.
Die Ökonomie-Session füllt/justiert nur die Config-Rows — kein Code-Deployment nötig.

---

## 1.3 Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| F1 | Mystery Box öffnen | MysteryBoxModal (basic) | MysteryBoxModal (premium rewrite) | **REWRITE** |
| F2 | Free Mystery Box | useHomeData + localStorage | Unchanged | **NONE** |
| F3 | Rarity Preview | Hardcoded REWARD_PREVIEW (5 tiers) | Neues Mapping: 5 Stufen mit Equipment + bCredits | **REPLACE** |
| F4 | Reward Display | Tickets + Cosmetic | + Equipment Card + bCredits Gold-Zahl | **ENHANCE** |
| F5 | Opening Animation | CSS Shake 1.5s (inline) | 3-Phase Premium (Canvas particles + CSS) | **REPLACE** |
| F6 | Box History | Service + Hook | + neue reward_types + equipment columns | **ENHANCE** |
| F7 | Legacy Chips | ChipSelector + 4 Booster-Typen | **DEPRECATED** — Equipment-System ersetzt | **DEPRECATE** |
| F8 | Wallet (CR) | TopBar + SideNav | Unchanged (bCredits = CR) | **NONE** |
| F9 | Streak Benefits | streakBenefits.ts | Unchanged | **NONE** |
| F10 | Equipment-System | *NEU* | DB + Types + Service + Inventar | **CREATE** |

---

## 1.4 Blast Radius Map

### Change 1: MysteryBoxResult Type erweitern

`reward_type: 'tickets' | 'cosmetic'` → `'tickets' | 'cosmetic' | 'equipment' | 'bcredits'`

Neue Felder: `equipment_type?: string`, `equipment_rank?: number`, `bcredits_amount?: number`

**Direct consumers:**
- `src/lib/services/mysteryBox.ts:3` — import type
- `src/lib/queries/mysteryBox.ts:2` — import type
- `src/components/gamification/MysteryBoxModal.tsx:8` — import type
- `src/app/(app)/hooks/useHomeData.ts:209-217` — constructs MysteryBoxResult

**Impact:** Service muss neue Felder parsen. Modal muss Equipment/bCredits rendern. useHomeData muss neue Felder durchreichen + zusätzliche Query-Invalidation (wallet, equipment).

### Change 2: Neuer Type MysteryBoxRarity

`'common' | 'rare' | 'epic' | 'legendary' | 'mythic'` (separater Type, CosmeticRarity bleibt unverändert)

**Direct consumers:** Nur MysteryBoxResult.rarity + MysteryBoxModal RARITY_CONFIG. CosmeticRarity und alle Cosmetic-Consumer bleiben unberührt.

### Change 3: mystery_box_results Tabelle erweitern

Neue Columns: `equipment_type TEXT`, `equipment_rank INTEGER`, `bcredits_amount BIGINT`

**Impact:** `getMysteryBoxHistory` SELECT erweitern. open_mystery_box RPC rewrite.

### Change 4: Neue Tabellen (equipment_definitions, equipment_ranks, user_equipment)

**Impact:** Komplett neu — kein bestehender Code betroffen. Nur neue Service + Hook + Types nötig.

### Change 5: open_mystery_box RPC rewrite → open_mystery_box_v2

**Impact:** Service Layer ruft neuen RPC-Namen auf. Alter RPC bleibt (kein DROP). Neue Response-Shape.

### Change 6: MysteryBoxModal komplett rewrite

**Consumer-Impact:** Props-Interface bleibt kompatibel. Home page + Missions page müssen KEINE Änderung machen (gleicher dynamic import, gleiche Props).

### Change 7: Query Invalidation erweitern

Aktuell: `qk.tickets.balance` + `qk.cosmetics.user`
Neu: + `qk.wallet(uid)` (bei bCredits) + `qk.equipment.inventory(uid)` (bei Equipment)

**Impact:** `useHomeData.ts:handleOpenMysteryBox` + `missions/page.tsx:handleOpenMysteryBox` — beide müssen zusätzliche Invalidations basierend auf reward_type machen.

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | **RPC-Parity:** `open_mystery_box` RPC nicht in Migrations → neue Migration könnte Konflikte erzeugen | Neuer RPC-Name `open_mystery_box_v2`. Alter bleibt bestehen. Kein Konflikt. |
| 2 | **Equipment ohne Scoring:** User sammelt Equipment, kann es aber nicht anlegen/nutzen weil Fantasy-Integration fehlt | Klar kommunizieren: Equipment-Inventar sichtbar, Anlegen kommt in nächster Session. UI zeigt "Bald verfügbar" Badge. |
| 3 | **Animation blockiert UI:** Canvas-Partikel auf schwachen Geräten | `prefers-reduced-motion` respektieren. Max 50 Partikel. Canvas nur für Burst (0.5s). requestAnimationFrame mit Cleanup. |
| 4 | **bCredits-Inflation:** Mystery Box gibt zu viel CR → Wallet-Inflation | Beträge aus DB-Config (`mystery_box_config` Tabelle). Economy-Team kann ohne Deploy anpassen. |
| 5 | **Cosmetics verschwinden:** Neues Stufen-Mapping erwähnt keine Cosmetics | Cosmetics bleiben als Bonus-Drop bei Stufe 3+ (RPC entscheidet). Kein Breaking Change. |
| 6 | **Tests brechen:** MysteryBoxResult Type-Erweiterung | Tests in derselben Wave wie Type-Änderung updaten. |
| 7 | **DB CHECK Constraint:** `mystery_box_results.rarity` blockt 'mythic' oder neue reward_types | Migration prüft + erweitert CHECK Constraints explizit. |
| 8 | **Equipment-Tabelle ohne RLS:** User sieht/manipuliert Equipment anderer User | RLS Policies für SELECT (own), INSERT (via RPC only), UPDATE (via RPC only). Smoke-Test nach Migration. |

---

## 1.6 Invarianten + Constraints

### Invarianten (NICHT ändern)

1. **Ticket-Kosten:** 15 Tickets (minus Streak-Discount) — identisch
2. **Free Box Logik:** 1x/Woche ab 30-Tage-Streak via localStorage — identisch
3. **Streak Benefits:** `streakBenefits.ts` unverändert
4. **Wallet Balance:** Darstellung als "CR" in TopBar/SideNav — unverändert
5. **Mission Tracking:** `triggerMissionProgress(['open_mystery_box', 'daily_activity'])` — bleibt
6. **Props-Interface:** MysteryBoxModal Props kompatibel (open, onClose, onOpen, ticketBalance, hasFreeBox, ticketDiscount)
7. **Legacy Chips:** Alter Code bleibt funktional (deprecated, nicht gelöscht)

### Constraints

- Max 10 Files pro Wave
- Keine neuen npm Dependencies
- CSS + Canvas only (kein Framer Motion, kein Lottie, kein WebGL)
- `prefers-reduced-motion` muss respektiert werden
- Equipment-Typen + Ränge aus DB (config-driven, erweiterbar ohne Code-Änderung)
- bCredits-Beträge aus DB-Config (nicht hardcoded)
- RPC idempotent (doppelter Call = keine doppelte Belohnung)
- Neuer RPC-Name (`open_mystery_box_v2`) — alter RPC nicht droppen

---

## 1.7 Akzeptanzkriterien

### AC1: Mystery Box öffnen
```
GIVEN: User hat 15+ Tickets
WHEN: User öffnet Mystery Box
THEN: 3-Phasen-Animation (Anticipation ~1.5s → Burst ~0.5s → Celebration ~1.5s)
  AND: Rarity-Glow zeigt Seltenheit VOR dem Reveal
  AND: Reward korrekt angezeigt (Tickets, Equipment, oder bCredits)
  AND: Ticket-Balance korrekt abgezogen
  AND NOT: Animation blockt UI
```

### AC2: Equipment als Reward
```
GIVEN: User öffnet Box, Stufe 2+ → Equipment-Drop
WHEN: Reveal zeigt Equipment
THEN: Equipment-Name + Rang angezeigt (z.B. "Feuerschuss R1")
  AND: Position-Icon sichtbar (ATT/MID/DEF/GK/ALL)
  AND: Equipment erscheint im User-Inventar (user_equipment Tabelle)
  AND: Equipment-Typ ist zufällig aus allen 5 Typen
```

### AC3: bCredits als Reward
```
GIVEN: User öffnet Box, Stufe 4+ → bCredits-Drop
WHEN: Reveal zeigt bCredits
THEN: CR-Betrag mit Gold-Styling angezeigt
  AND: Wallet-Balance steigt sofort (query invalidation)
  AND: Betrag im konfigurierten Range (DB-Config)
```

### AC4: Rarity-abhängige Animation
```
WHEN: Common (Stufe 1) → dezente Animation, wenige Partikel, kurzer Glow
WHEN: Rare (Stufe 2) → mehr Partikel, farbiger Glow
WHEN: Epic (Stufe 3) → Purple Burst, viele Partikel
WHEN: Legendary (Stufe 4) → Gold-Burst, Screen-Shake, lange Celebration
WHEN: Mythic (Stufe 5) → Rainbow/Gold-Explosion, maximale Partikel, Screen-Flash
```

### AC5: Reduced Motion
```
GIVEN: prefers-reduced-motion aktiv
WHEN: User öffnet Mystery Box
THEN: Keine Partikel, kein Shake, kein Canvas
  AND: Sofortiger Reveal mit Fade-In
  AND: Reward korrekt angezeigt
```

### AC6: Stufen-Mapping
```
GIVEN: mystery_box_config Tabelle ist befüllt
THEN: RPC liest Config und entscheidet per Weighted Random
  AND: Stufe 1 gibt NUR Tickets
  AND: Stufe 2 gibt Tickets ODER Equipment R1
  AND: Stufe 3 gibt Tickets, Equipment R1 ODER R2
  AND: Stufe 4 gibt Tickets, Equipment R1-R3 ODER bCredits
  AND: Stufe 5 gibt Equipment R3-R4 ODER bCredits
  AND: Alle Werte (Raten, Beträge, Gewichte) aus DB — nicht hardcoded
  AND: Änderung der Config = sofortige Wirkung ohne Code-Deploy
```

**Hinweis:** Konkrete Drop-Raten, Beträge und Gewichtungen werden in einer separaten Ökonomie-Session designed (Benchmark: Brawl Stars, Genshin, Clash Royale).

### AC7: Free Box + Streak Discount
```
GIVEN: 30+ Tage Streak, diese Woche noch keine Free Box
THEN: "Gratis Mystery Box!" sichtbar
  AND: Kein Ticket-Abzug
  AND: Gleiche Animation + Rewards
  AND: Nach Öffnung → kostenpflichtig
```

### AC8: Equipment-Inventar
```
GIVEN: User hat Equipment via Mystery Box erhalten
WHEN: User prüft sein Inventar
THEN: Equipment sichtbar mit Typ, Rang, Positions-Badge, Acquired-Datum
  AND NOT: Equipment anderer User sichtbar (RLS)
```

---

## SPEC GATE Checklist

- [x] Current State komplett (jedes Feature nummeriert)
- [x] Migration Map für JEDES Feature ausgefüllt
- [x] Blast Radius für jede Änderung gegreppt (7 Changes)
- [x] Pre-Mortem mit 8 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien für 8 User-Flows
- [x] Equipment-System vollständig designed (5 Typen, 4 Ränge, DB-Schema)
- [x] Offene Design-Frage geklärt (zufälliger Typ-Drop, Inventar-System)
- [ ] **Anil hat die Spec reviewed und abgenommen**

---

## PHASE 2: PLAN

---

### Wave 1: DB + Types (Infra)

**Zweck:** Datenbank-Fundament legen. Kein UI, kein Behavior Change.

#### Task 1.1: Migration — Equipment-Tabellen + mystery_box erweitern

**File:** `supabase/migrations/2026MMDD_mystery_box_equipment.sql` (CREATE)
**Blast Radius:** Kein bestehender Code betroffen (nur neue Tabellen + ALTER)

**Steps:**
1. `equipment_definitions` Tabelle mit 5 Seed-Rows (fire_shot, banana_cross, iron_wall, cat_eye, captain)
2. `equipment_ranks` Tabelle mit 4 Seed-Rows (R1-R4, Multiplikatoren 1.05/1.10/1.15/1.25)
3. `user_equipment` Tabelle mit RLS (SELECT own, INSERT/UPDATE via RPC only)
4. `mystery_box_config` Tabelle mit Platzhalter-Rows (Gewichte TBD in Ökonomie-Session)
5. ALTER `mystery_box_results`: ADD COLUMN `equipment_type TEXT`, `equipment_rank INTEGER`, `bcredits_amount BIGINT`
6. CHECK Constraint auf `mystery_box_results.rarity` erweitern um 'mythic'
7. CHECK Constraint auf `mystery_box_results.reward_type` erweitern um 'equipment', 'bcredits'
8. RLS Policies für alle neuen Tabellen
9. `open_mystery_box_v2` RPC:
   - Liest `mystery_box_config` für Weighted Random
   - Bestimmt Rarity (Stufe 1-5) → dann Reward-Typ innerhalb der Stufe
   - reward_type='tickets' → `credit_tickets()`
   - reward_type='equipment' → INSERT `user_equipment` (zufälliger Typ aus `equipment_definitions`)
   - reward_type='bcredits' → UPDATE `wallets.balance`
   - reward_type='cosmetic' → INSERT `user_cosmetics` (Legacy, bleibt möglich)
   - INSERT `mystery_box_results` (mit neuen Columns)
   - Returns: `{ ok, rarity, reward_type, tickets_amount?, equipment_type?, equipment_rank?, equipment_name_de?, equipment_name_tr?, bcredits_amount?, cosmetic_key?, cosmetic_name? }`
10. Verify: `SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('user_equipment', 'equipment_definitions', 'equipment_ranks', 'mystery_box_config')`

**DONE means:**
- [ ] 4 neue Tabellen existieren mit korrekten Constraints
- [ ] Equipment-Definitionen geseeded (5 Typen)
- [ ] Equipment-Ränge geseeded (4 Ränge mit Multiplikatoren)
- [ ] mystery_box_results hat 3 neue nullable Columns
- [ ] mystery_box_config hat Platzhalter-Rows
- [ ] RLS auf allen Tabellen mit korrekten Policies
- [ ] open_mystery_box_v2 RPC deployed + getestet mit echten Daten
- [ ] Alter open_mystery_box RPC NICHT gedroppt

#### Task 1.2: Types erweitern

**File:** `src/types/index.ts` (MODIFY)
**Blast Radius:** MysteryBoxResult Consumers (4 Files — werden in Wave 5 angepasst)

**Steps:**
1. Neuer Type: `MysteryBoxRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'`
2. Neuer Type: `EquipmentType = 'fire_shot' | 'banana_cross' | 'iron_wall' | 'cat_eye' | 'captain'`
3. Neuer Type: `EquipmentPosition = 'ATT' | 'MID' | 'DEF' | 'GK' | 'ALL'`
4. Neuer Type: `DbEquipmentDefinition = { id, key: EquipmentType, name_de, name_tr, description_de?, description_tr?, position: EquipmentPosition, icon?, active, created_at }`
5. Neuer Type: `DbEquipmentRank = { id, rank: number, multiplier: number, label: string }`
6. Neuer Type: `DbUserEquipment = { id, user_id, equipment_key: EquipmentType, rank: number, source: string, equipped_player_id?, equipped_event_id?, acquired_at }`
7. `MysteryBoxResult` erweitern: `rarity` → `MysteryBoxRarity`, `reward_type` → `| 'equipment' | 'bcredits'`, neue optionale Felder `equipment_type?, equipment_rank?, bcredits_amount?`
8. Verify: `npx tsc --noEmit` (wird Fehler zeigen in Consumers — erwartet, werden in Wave 5 gefixt)

**DONE means:**
- [ ] Alle neuen Types exportiert
- [ ] MysteryBoxResult erweitert
- [ ] CosmeticRarity NICHT verändert
- [ ] tsc zeigt NUR erwartete Fehler in MysteryBoxModal + mysteryBox service (reward_type Union mismatch)

---

### Wave 2: Equipment Service + Hooks

**Zweck:** Service Layer für Equipment-Inventar. Kein UI.

#### Task 2.1: Equipment Service

**File:** `src/lib/services/equipment.ts` (CREATE)
**Blast Radius:** Keiner (komplett neu)

**Steps:**
1. `getEquipmentDefinitions()` — SELECT aus `equipment_definitions` WHERE active
2. `getEquipmentRanks()` — SELECT aus `equipment_ranks` ORDER BY rank
3. `getUserEquipment(userId)` — SELECT aus `user_equipment` mit JOIN auf `equipment_definitions` + `equipment_ranks`
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] 3 Funktionen exportiert
- [ ] Korrekte Types (DbEquipmentDefinition, DbUserEquipment)
- [ ] tsc clean (keine neuen Fehler)

#### Task 2.2: Query Hooks + Keys

**Files:** `src/lib/queries/equipment.ts` (CREATE), `src/lib/queryKeys.ts` (MODIFY)
**Blast Radius:** queryKeys — prüfen dass kein Key kollidiert

**Steps:**
1. Query Keys: `qk.equipment.definitions()`, `qk.equipment.ranks()`, `qk.equipment.inventory(userId)`
2. `useEquipmentDefinitions()` — staleTime 5min (statisch)
3. `useEquipmentRanks()` — staleTime 5min (statisch)
4. `useUserEquipment(userId)` — staleTime 30s, enabled: !!userId
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] 3 Hooks exportiert
- [ ] Query Keys in qk.* Factory
- [ ] tsc clean

---

### Wave 3: Animation Engine

**Zweck:** Wiederverwendbares Particle System + CSS Keyframes. Kein Modal-Rewrite.

#### Task 3.1: Particle System

**File:** `src/components/gamification/particles.ts` (CREATE)
**Blast Radius:** Keiner (komplett neu, kein Export nach außen)

**Steps:**
1. `ParticleSystem` Klasse:
   - `constructor(canvas: HTMLCanvasElement, config: ParticleConfig)`
   - `burst(count, color, origin)` — einmaliger Partikel-Ausstoß
   - `glow(color, intensity, duration)` — pulsierender Glow-Ring
   - `destroy()` — Cleanup, cancelAnimationFrame
2. `ParticleConfig` Type: `{ maxParticles: number, gravity: number, fadeRate: number }`
3. Rarity-spezifische Presets:
   - Common: 8 Partikel, white/40, kurz
   - Rare: 20 Partikel, sky-400, mittel
   - Epic: 35 Partikel, purple-400, lang
   - Legendary: 50 Partikel, gold, Screen-Flash
   - Mythic: 50 Partikel, gold + rainbow cycle, Screen-Flash + verlängert
4. `prefers-reduced-motion` Check: wenn aktiv, alle Methoden sind no-ops
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] ParticleSystem Klasse mit burst/glow/destroy
- [ ] 5 Rarity-Presets
- [ ] Reduced Motion Support
- [ ] tsc clean
- [ ] Kein npm Dependency

#### Task 3.2: CSS Keyframes + Rarity Config

**Files:** `src/app/globals.css` (MODIFY), `src/components/gamification/rarityConfig.ts` (CREATE)
**Blast Radius:** globals.css — bestehende Animationen NICHT ändern

**Steps:**
1. Neue Keyframes in globals.css:
   - `@keyframes mystery-anticipation` — Pulsierender Glow, wachsend (1.5s)
   - `@keyframes mystery-burst` — Scale 1→1.5→0 + opacity flash (0.5s)
   - `@keyframes mystery-celebrate` — Bounce + Glow-Pulse (1.5s)
   - `@keyframes mystery-shake-premium` — Intensiverer Shake als aktuell (1.5s)
   - `@keyframes mystery-screen-flash` — Overlay white→transparent (0.3s)
2. `rarityConfig.ts` — Farben, Timings, Partikel-Counts pro Rarity:
   ```ts
   export const RARITY_CONFIG: Record<MysteryBoxRarity, {
     label_de: string; label_tr: string;
     color: string; glowColor: string;
     bgClass: string; textClass: string; borderClass: string;
     particleCount: number; celebrationDuration: number;
     screenFlash: boolean; haptic: boolean;
   }>
   ```
3. Position-Farben für Equipment Display (bestehende Tokens: emerald=GK, amber=DEF, sky=MID, rose=ATT)
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] 5 neue Keyframes in globals.css
- [ ] Bestehende Keyframes (scale-pop, shimmer, confetti-fall) unverändert
- [ ] RARITY_CONFIG mit 5 Stufen exportiert
- [ ] Position-Farben wiederverwendet (keine neuen Tokens)
- [ ] tsc clean

---

### Wave 4: Modal Rewrite

**Zweck:** MysteryBoxModal.tsx komplett ersetzen. Hauptarbeit.

#### Task 4.1: MysteryBoxModal Premium

**File:** `src/components/gamification/MysteryBoxModal.tsx` (REWRITE)
**Blast Radius:** Props-Interface bleibt kompatibel → Home + Missions page brauchen KEINE Änderung

**Steps:**
1. Gleiche Props wie aktuell: `open, onClose, onOpen, ticketBalance, hasFreeBox, ticketDiscount`
2. State Machine erweitern: `'idle' | 'anticipation' | 'burst' | 'revealed' | 'celebration'`
3. Phase 1 — Anticipation (~1.5s):
   - Box-Icon pulsiert mit `mystery-anticipation` Keyframe
   - Rarity-Glow erscheint (Farbe aus rarityConfig, verrät Seltenheit)
   - Canvas-Partikel sammeln sich zum Zentrum
   - Haptic Vibration (Navigator.vibrate, wenn verfügbar)
4. Phase 2 — Burst (~0.5s):
   - `mystery-burst` Keyframe auf Box-Icon
   - Canvas `burst()` mit rarity-spezifischer Partikelzahl
   - Screen-Flash bei Legendary/Mythic (`mystery-screen-flash` Overlay)
   - Box-Icon wechselt zum Reward-Icon
5. Phase 3 — Celebration + Reveal (~1.5s):
   - `mystery-celebrate` auf Reward-Card
   - Rarity-Badge mit `anim-scale-pop`
   - Reward-spezifischer Content:
     - **Tickets:** Ticket-Icon + Anzahl (Gold-Zahl, mono font)
     - **Equipment:** Equipment-Name + Rang-Badge + Position-Icon + Glow in Positions-Farbe
     - **bCredits:** CR-Icon + Betrag (Gold-Zahl, large) + "Wallet aufgeladen"
     - **Cosmetic:** Sparkles-Icon + Name (Legacy, bleibt)
6. Idle State:
   - Reward Preview Tabelle (5 Stufen mit möglichen Rewards — aus rarityConfig, nicht hardcoded Prozente)
   - Kosten-Anzeige (Tickets)
   - Free Box Badge
   - Open Button
7. Actions: "Schließen" + "Nochmal öffnen" (wie aktuell)
8. Canvas ref + useEffect für ParticleSystem lifecycle (create on mount, destroy on unmount)
9. `prefers-reduced-motion`: Skip Anticipation + Burst → direkt zu Reveal mit Fade
10. Inline `<style jsx>` entfernen — alle Keyframes jetzt in globals.css
11. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] 5-State State Machine funktional
- [ ] 3-Phasen-Animation für alle 5 Rarity-Stufen
- [ ] Equipment-Reward korrekt dargestellt (Name, Rang, Position)
- [ ] bCredits-Reward korrekt dargestellt (Betrag, Gold-Styling)
- [ ] Ticket-Reward weiterhin funktional
- [ ] Cosmetic-Reward weiterhin funktional
- [ ] Canvas-Partikel mit Cleanup
- [ ] Reduced Motion funktional
- [ ] Props-Interface unverändert
- [ ] Kein inline `<style jsx>` mehr
- [ ] tsc clean

---

### Wave 5: Wire + i18n

**Zweck:** Service Layer anpassen, Handler verdrahten, i18n. Alles verbinden.

#### Task 5.1: Mystery Box Service updaten

**File:** `src/lib/services/mysteryBox.ts` (MODIFY)
**Blast Radius:** useHomeData + missions page (beide rufen openMysteryBox auf)

**Steps:**
1. `openMysteryBox()`: RPC-Name → `open_mystery_box_v2`
2. Return-Type erweitern: `equipmentType?, equipmentRank?, equipmentNameDe?, equipmentNameTr?, bcreditsAmount?`
3. `getMysteryBoxHistory()`: SELECT erweitern um `equipment_type, equipment_rank, bcredits_amount`
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Service ruft v2 RPC auf
- [ ] Alle neuen Felder korrekt gemappt
- [ ] History Query erweitert
- [ ] tsc clean

#### Task 5.2: Handler + Query Invalidation

**Files:** `src/app/(app)/hooks/useHomeData.ts` (MODIFY), `src/app/(app)/missions/page.tsx` (MODIFY)
**Blast Radius:** Home page + Missions page — beide nutzen handleOpenMysteryBox

**Steps:**
1. `handleOpenMysteryBox` in useHomeData: MysteryBoxResult-Konstruktion erweitern (neue Felder durchreichen)
2. Conditional Query Invalidation:
   - Immer: `qk.tickets.balance`
   - Bei equipment: `qk.equipment.inventory(uid)`
   - Bei bcredits: Wallet-Query invalidieren
   - Bei cosmetic: `qk.cosmetics.user(uid)` (wie bisher)
3. Missions page: Gleiche Anpassung (Handler ist dort dupliziert)
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Beide Handler erweitert
- [ ] Conditional Invalidation funktional
- [ ] Keine Breaking Changes in Props-Durchreichung
- [ ] tsc clean

#### Task 5.3: i18n Keys

**Files:** `messages/de.json` (MODIFY), `messages/tr.json` (MODIFY)
**Blast Radius:** Keiner (nur neue Keys)

**Steps:**
1. Neue Keys im `gamification` Namespace:
   - Equipment-Namen: `equipmentFireShot`, `equipmentBananaCross`, `equipmentIronWall`, `equipmentCatEye`, `equipmentCaptain`
   - Equipment-Ränge: `equipmentRank1`-`equipmentRank4`
   - Reward-Labels: `rewardEquipment`, `rewardBcredits`, `bcreditsEarned`
   - Rarity-Labels: `rarityCommon`, `rarityRare`, `rarityEpic`, `rarityLegendary`, `rarityMythic`
   - Equipment-Positionen: `positionAtt`, `positionMid`, `positionDef`, `positionGk`, `positionAll`
   - Inventar: `equipmentInventory`, `equipmentComingSoon`
2. Verify: JSON valid

**DONE means:**
- [ ] Alle Keys in DE + TR vorhanden
- [ ] JSON valid (kein Trailing Comma etc.)
- [ ] Bestehende Keys unverändert

#### Task 5.4: Tests updaten

**Files:** `src/components/gamification/__tests__/MysteryBoxModal.test.tsx` (MODIFY), `src/lib/services/__tests__/smallServices.test.ts` (MODIFY)
**Blast Radius:** Nur Test-Files

**Steps:**
1. MysteryBoxModal Tests: Neue reward_types testen (equipment, bcredits)
2. Service Tests: v2 RPC Mock, neue Felder
3. Verify: `npx vitest run src/components/gamification src/lib/services`

**DONE means:**
- [ ] Bestehende Tests grün (angepasst)
- [ ] Neue Tests für Equipment + bCredits Rewards
- [ ] vitest clean

---

### Wave 6: Polish + QA

**Zweck:** Visuelles Feintuning, Edge Cases, Verification.

#### Task 6.1: Visual QA

**Steps:**
1. Playwright Screenshots 390px (Mobile):
   - Mystery Box idle state
   - Each rarity animation (Common → Mythic)
   - Equipment reward display
   - bCredits reward display
   - Free Box state
2. Playwright Screenshots 1440px (Desktop):
   - Same flows
3. Reduced Motion: Verify alle Animationen deaktiviert
4. Edge Cases:
   - Öffnen mit genau 15 Tickets (0 danach)
   - Öffnen mit 14 Tickets (Button disabled)
   - Free Box + danach kostenpflichtig
   - Doppelklick auf Open Button (Idempotenz)
   - Netzwerk-Fehler während Opening

**DONE means:**
- [ ] 390px Screenshots sehen gut aus
- [ ] 1440px Screenshots sehen gut aus
- [ ] Reduced Motion funktional
- [ ] Edge Cases bestanden
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` clean

#### Task 6.2: E2E Bot updaten

**File:** `e2e/bots/ai/actions.ts` (MODIFY)
**Blast Radius:** E2E Tests

**Steps:**
1. Line 324: RPC-Name → `open_mystery_box_v2`
2. Verify: E2E Bot kann Box öffnen

**DONE means:**
- [ ] E2E Bot nutzt v2 RPC
- [ ] Bot kann Box öffnen ohne Fehler

---

### Wave-Übersicht

| Wave | Files | Shippbar? | Abhängigkeit |
|------|-------|-----------|-------------|
| 1: DB + Types | 2 | Ja (Backend only) | — |
| 2: Equipment Service | 3 | Ja (Backend only) | Wave 1 |
| 3: Animation Engine | 3 | Ja (kein Consumer) | — |
| 4: Modal Rewrite | 1 | Ja (gleiche Props) | Wave 3 |
| 5: Wire + i18n | 6 | Ja (alles verbunden) | Wave 1, 2, 4 |
| 6: Polish + QA | 2 | Ja (final) | Wave 5 |

**Parallelisierung möglich:** Wave 2 + Wave 3 können parallel laufen (keine Abhängigkeit).

**Gesamtumfang:** ~17 Files, 6 Waves, davon 2 parallelisierbar.

---

### PLAN GATE Checklist

- [x] Jede Wave eigenständig shippbar
- [x] Max 10 Files pro Wave (max = 6 in Wave 5)
- [x] Move und Change in getrennten Waves (Wave 1 = Infra, Wave 4 = UI)
- [x] Jeder Task hat "DONE means" Checkliste
- [x] Agent-Tasks klar spezifiziert (Wave 2, 3 = eigenständig, klar definiert)
- [ ] **Anil hat den Plan reviewed**
