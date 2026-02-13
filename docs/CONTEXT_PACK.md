# BeScout Context Pack
> Paste diese Datei in Claude Code, ChatGPT, oder Gemini um sofort Kontext zu haben.
> Letzte Aktualisierung: 09.02.2026

## Was ist BeScout?
Fantasy-Football-Plattform für die TFF 1. Lig (türkische 2. Liga). User kaufen DPCs (Digital Player Cards), handeln sie auf einem Marktplatz und setzen sie in Fantasy Events ein. Währung: BSD (BeScout Dollar). Kein Blockchain. Pilot-Phase mit virtuellem Geld.

## Tech Stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Lucide Icons · Supabase (PostgreSQL + Auth + Realtime) · Vercel Hosting

## Pilot-Scope (4 Wochen)
- 1 Club: Sakaryaspor, 25 Spieler
- 50 Beta-Tester, 10.000 BSD Startkapital pro User
- 2 Kern-Loops: DPC Trading + Fantasy Events
- NICHT im Pilot: Community, Club Governance, IPO, PBT Ausschüttung, Multi-Liga

## Aktueller Sprint
→ Siehe STATUS.md für den tagesaktuellen Stand

## Design-Regeln (nicht verhandelbar)
- Dark Mode only, Background: #0a0a0a
- Primary/Gold: #FFD700 (Preise, CTAs)
- Positions: GK=emerald, DEF=amber, MID=sky, ATT=rose
- UI-Sprache: Deutsch
- Code-Sprache: Englisch
- Geld IMMER als INT in Cents (nie Float)
- Shared Components nutzen: `PlayerDisplay` (compact/standard/detailed)
- Alle Geld-Operationen als atomare DB Transactions

## Projektstruktur
```
src/
├── app/           # Pages (Home, Fantasy, Market, Club, Player, Profile, Login)
├── components/    # UI (ui/), Player (player/), Layout (layout/)
├── lib/           # supabase.ts, services/, utils.ts, mock-data.ts
└── types/         # index.ts (alle TypeScript Types)
docs/
├── PILOT-SPRINT.md   # 4-Wochen-Plan Tag für Tag
├── TODO.md           # Aktueller Task
├── ROADMAP.md        # Gesamtplan Phase 0→4
├── SCALE.md          # DB-Schema, Skalierungsarchitektur
├── ARCHITECTURE.md   # System-Überblick, Service Interfaces
├── COMPONENTS.md     # Component Library Doku
└── WORKFLOW.md       # Arbeitsweise mit Claude Code
```

## Wichtigste Types
```typescript
Player: { id, first, last, pos (GK|DEF|MID|ATT), club, age, ticket,
          stats: { matches, goals, assists },
          perf: { l5, l15, season },
          prices: { floor, change24h, history7d },
          dpc: { float, circulation, onMarket, owned } }

Wallet: { user_id, balance (INT cents) }
Order:  { user_id, player_id, side (buy|sell), price, quantity, status }
Lineup: { event_id, user_id, slot_gk, slot_def1..2, slot_mid1..2, slot_att, total_score, rank }
```

## Für das Modell: Was wird gerade bearbeitet?
[Hier den aktuellen Task reinkopieren, z.B.:]
"Supabase Setup + Login Page. Schema aus PILOT-SPRINT.md umsetzen."
