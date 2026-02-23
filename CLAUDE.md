# BeScout - Project Intelligence

> Auto-loaded by Claude Code at session start. Single Source of Truth for project rules.
> For current state → `memory/current-sprint.md`. For deep knowledge → topic files in `memory/`.

## Projekt

BeScout ist eine **B2B2C Fan-Engagement- und Monetarisierungsplattform** für Fußballvereine.
Clubs sind **aktive Händler** (wie Amazon Seller Central) — sie verkaufen DPCs an Fans, starten Events/Votes,
verteilen $SCOUT-Credits und verkaufen Werbeflächen an ihre Sponsoren. Fans verdienen $SCOUT durch Trading,
Fantasy-Turniere, Scout Reports und Club-Aufträge. Kein Blockchain — zentrale Datenbank.

**4 Säulen:** Club Liquidity Tool (DPC-IPO) | Fan Engagement Monetization (Votes/Polls 70/30) | External Scout Workforce | Fantasy Tournaments
**Pilot:** Sakaryaspor (TFF 1. Lig). **Ziel:** TFF 1. Lig komplett (18-20 Clubs), dann Süper Lig.
**Firmensitz:** Malta Ltd. (geplant). **Regulierung:** MiCA €1M Exemption → CASP → MGA Gaming.

Siehe `docs/VISION.md` für Produktvision, `docs/BeScout_Context_Pack_v8.md` für Business-Kontext.

## Tech Stack

- **Framework:** Next.js 14 (App Router, `src/`)
- **Sprache:** TypeScript (strict)
- **Styling:** Tailwind CSS (Dark Mode only)
- **Icons:** lucide-react
- **State:** React Context (Auth, Club, Wallet) + TanStack React Query v5 + Zustand v5
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Auth:** Supabase Auth (Email + Google + Apple + Magic Link)
- **i18n:** next-intl (Cookie `bescout-locale`, Messages in `messages/{locale}.json`)

## Business-Regeln (JEDE Zeile Code muss das beachten!)

### Licensing-Phasen (ADR-028: "Legal Minimum First")
Features die eine Lizenz brauchen werden NICHT gebaut bevor die Phase erreicht ist:
- **Phase 1 (jetzt):** DPC Trading (BSD-Credits), Free Fantasy, Votes/Polls, Events, Scout Reports — LIVE
- **Phase 3 (nach CASP):** $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- **Phase 4 (nach MGA):** Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- **Kill-Switch:** BSD-Sales müssen bei €900K automatisch stoppen (noch nicht implementiert)

### Sales-Tier Feature-Gates (noch nicht implementiert, erst bei Club-Deal)
3 Pakete: Başlangıç (30 Spieler, 2 Ads, 100K BSD) | Profesyonel (50, 5, 500K) | Şampiyon (∞, 10+, 2M)
→ Details in `memory/business-context.md`

### Wording-Compliance (MiCA/CASP — KRITISCH!)
- **NIEMALS:** Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- **IMMER:** Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- **$SCOUT** = "Platform Credits" (nicht Kryptowährung, nicht Coin, nicht Investment Token)
- **DPC** = "Digital Player Contract" (nicht Spieleranteil, nicht Ownership)
- **Disclaimers** auf JEDER Seite mit $SCOUT/DPC (6 Stellen implementiert, ADR-024)

### Geofencing-Tiers (implementiert, Flag OFF)
- `TIER_FULL` (Rest EU): Alles | `TIER_CASP` (EU ohne Gaming): Trading ja, Paid Fantasy nein
- `TIER_FREE` (DE/FR/AT/UK): Free only | `TIER_RESTRICTED` (TR): Content + Free Fantasy only
- `TIER_BLOCKED` (USA/China/OFAC): Kein Zugang

### Closed Economy (Phase 1)
- BSD = geschlossener Kreislauf. KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange
- Kein Withdrawal-Feature bauen. Kein Fiat-Auszahlungs-Flow. Auch nicht versteckt.
- Club-Balance Withdrawal nur als B2B-Invoicing (Fiat, nicht $SCOUT)

## Kern-Konventionen

### Spieler-Darstellung
Verwende **immer** `PlayerDisplay` aus `@/components/player/PlayerRow`:
- `variant="compact"` → Listen, Rankings, Holdings (~55px)
- `variant="card"` → Grids, Transferliste (~170px)
- `PlayerPhoto` aus `player/index.tsx` — NIEMALS inline img+fallback
- L5-Tokens: `getL5Color()`/`getL5Hex()`/`getL5Bg()` aus `player/index.tsx`

### Code-Patterns
- `'use client'` auf allen Pages (Client Components)
- **Supabase NIE in Components** → immer Service Layer (`lib/services/`)
- Types zentral in `src/types/index.ts`
- Shared UI in `src/components/ui/index.tsx`
- `cn()` für classNames, `fmtScout()` für Zahlen (deutsch: 1.000)
- Trading via Supabase RPCs (atomare DB-Funktionen)
- Cache-Invalidation nach Writes via `invalidateTradeData()` / `invalidate(prefix)`

### Benennungen
- Deutsche UI-Labels (Buttons, Überschriften)
- Englische Code-Variablen und Funktionsnamen
- Englische Kommentare

## Scale-Regeln

- Geld IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `Array.from(new Set(arr))` statt `[...new Set(arr)]` (strict TS)
- `Array.from(map.keys()).forEach()` statt `for..of` (strict TS)
- Nie direkt Supabase in Components → Data Access Layer

## Bekannte Issues

- Push: VAPID Public Key muss noch in Vercel gesetzt werden
- Club-Abo: Auto-Renew braucht Cron (noch nicht eingerichtet)
- API-Football: Account + Key in `.env.local`, dann Admin-Mapping (~30 Min)
- Fantasy Presets nur localStorage (Pilot-Entscheidung)
- Mute/Block nur localStorage (50 User, kein DB nötig)
- BSD Kill-Switch bei €900K: noch nicht implementiert
- KYC-Integration: braucht Malta Ltd (Sumsub/Veriff)
- Sales-Tier Feature-Gates: noch nicht implementiert (erst bei Club-Deal)
- Fan Pass / In-App Purchase: braucht Native App

## Workflow

### Session-Protokoll (PFLICHT!)

**Start:**
1. MEMORY.md + current-sprint.md automatisch lesen
2. Bei Bedarf: Topic-Files (`errors.md`, `patterns.md`, `decisions.md`)
3. TODO.md/STATUS.md prüfen

**Während:**
4. Shared Components nutzen, Types in types/index.ts, Service Layer
5. Cache-Invalidation nach Writes, deutsche Labels
6. Neuer Fehler → `errors.md` | Neue Entscheidung → `decisions.md` | Neues Pattern → `patterns.md`

**Ende (PFLICHT!):**
7. `memory/sessions.md` updaten (Session-Nr, Datum, was gemacht, gelernt)
8. `memory/current-sprint.md` updaten (letzter Stand, nächste Priorität)
9. `memory/MEMORY.md` Snapshot updaten (Migrations, Status)
10. Topic-Files updaten wenn neues Wissen
11. TODO.md/STATUS.md aktualisieren
12. `npx next build` zur Verifikation

## Memory-System (`memory/`)

| File | Inhalt |
|------|--------|
| `MEMORY.md` | Auto-loaded: Snapshot, Top-30 Fehler, Topic-Index |
| `current-sprint.md` | Auto-loaded: Letzter Stand, nächste Priorität, Blocker |
| `architecture.md` | Projektstruktur, Design System, Component Map, Routes |
| `backend-systems.md` | DB Schema, RPCs, Scoring, Trading, Abo-System |
| `decisions.md` | ADR mit Kontext + Begründung |
| `patterns.md` | Code-Patterns, Anti-Patterns |
| `errors.md` | Error Journal + Quick-Reference (alle bekannten Fehler) |
| `sessions.md` | Session-Historie (letzte 5 detailliert) |
| `sessions-archive.md` | Komprimierte Historie + Audit + Engagement Waves |
| `business-context.md` | Sales-Tiers, Licensing-Phasen, Geofencing, Feature-Gaps |
| `user-prefs.md` | Anils Arbeitsweise + Prioritäten |

## Referenzen

- `docs/VISION.md` — Produktvision und Fan-Ökonomie
- `docs/TODO.md` — Aktueller Task
- `docs/ROADMAP.md` — Gesamtplan
- `docs/STATUS.md` — Detaillierter Fortschritt (Migration-Tabelle)
- `docs/SCALE.md` — Skalierungsarchitektur und DB-Schema
- `docs/BeScout_Context_Pack_v8.md` — Business Master-Dokument (4 Säulen, Token, Marketplace)
- `docs/Sales Angebote.md` — Sales Playbook (3 Pakete, Founding Partner, Target-Clubs)
- `docs/BeScout_Licensing_Roadmap_v1.docx` — Lizenz-Kaskade (Malta → CASP → MGA, €312K gesamt)
