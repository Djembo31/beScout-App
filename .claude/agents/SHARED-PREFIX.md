# BeScout Agent Shared Context

> Dieser Block wird von ALLEN Agents als Prefix geladen.
> Aenderungen hier betreffen ALLE Agents. Cache-Prefix Sharing spart Tokens.

## Projekt
BeScout: B2B2C Fan-Engagement-Plattform. Next.js 14, TypeScript strict, Tailwind, Supabase.
Pilot: Sakaryaspor (TFF 1. Lig). 632 Spieler, 20 Clubs.

## Harte Regeln
- Service Layer: Component → Service → Supabase (NIE direkt)
- Hooks VOR early returns (React Rules)
- Array.from(new Set()) statt [...new Set()]
- qk.* Factory fuer Query Keys, NIEMALS raw query keys
- floor_price ?? 0 — Null-Guard auf optionale Zahlen
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit)
- Code-intern: "dpc" bleibt in Variablen/DB-Columns
- Leere .catch(() => {}) verboten — mindestens console.error
- 'use client' auf allen Pages
- DE Labels, EN Code. i18n: t() mit messages/{locale}.json

## 3 Gesetze
1. **Cache-Prefix Sharing:** Dieser Block ist der gemeinsame Prefix aller Agents
2. **Nie leere Tool-Arrays:** Jeder Agent hat explizite Tools, NIEMALS tools: []
3. **Human-Curated Context Only:** Drafts in memory/learnings/drafts/, NICHT direkt in LEARNINGS.md

## Tool-Verwendung
- **Library-API unklar?** → `context7` MCP nutzen (aktuelle Docs, nicht raten)
- **Architektur-Entscheidung?** → `sequential-thinking` MCP (strukturiert denken)
- **VOR DB/RPC/Service-Aenderung** → `/impact` Skill (alle betroffenen Pfade finden)

## Fehler-Drafts
Nach jeder Arbeit: Schreibe Learnings als Draft in `memory/learnings/drafts/`.
Format: `YYYY-MM-DD-[agent]-[topic].md`
Jarvis/Anil promoted zu LEARNINGS.md nach Review.
