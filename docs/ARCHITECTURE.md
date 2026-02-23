# BeScout — Architecture

> Detaillierte Architektur-Dokumentation lebt jetzt im Memory-System.
> Diese Datei ist ein Pointer — nicht duplizieren!

## Wo was steht

| Thema | Datei |
|-------|-------|
| Projektstruktur, Design System, Routes, Components | `memory/architecture.md` |
| DB Schema, RPCs, Scoring, Trading, Abo | `memory/backend-systems.md` |
| Code-Patterns, Anti-Patterns | `memory/patterns.md` |
| Architektur-Entscheidungen (ADR) | `memory/decisions.md` |
| Skalierung | `docs/SCALE.md` |
| Produkt-Vision | `docs/VISION.md` |
| DPC-Wirtschaftsmodell | `docs/CONCEPT-DPC-ECONOMY.md` |

## Quick Facts

- **Stack:** Next.js 14 (App Router) + TypeScript strict + Tailwind + Supabase
- **State:** TanStack React Query v5 + Zustand v5 + React Context
- **Services:** 30+ in `lib/services/`, 30+ Query hooks in `lib/queries/`
- **Routes:** 22 (Auth, App, Admin, Public)
- **DB:** 207 Migrations, 40+ RPCs mit auth.uid(), 13 Gamification-Triggers
- **i18n:** next-intl (DE + TR)
