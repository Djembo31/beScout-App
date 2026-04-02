---
description: Test-Konventionen fuer vitest Unit Tests und Playwright E2E
globs: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*"]
---

## Unit Tests (vitest)
- Test-Dateien neben Source: `Component.test.tsx` neben `Component.tsx`
- Oder in `__tests__/` Ordner im gleichen Verzeichnis
- Naming: `describe('[Component/Service]')` → `it('should [verhalten]')`
- KEIN Snapshot-Testing (zu fragil, zu wenig Aussagekraft)

## Was testen
- Services: Jede exportierte Funktion, Happy Path + Error Case
- Hooks: Return-Werte, Loading States, Error States
- Utils: Reine Funktionen, Edge Cases (null, 0, leerer String)
- NICHT testen: Tailwind Classes, Layout, rein visuelle Aenderungen

## Test-Writer Agent
- Sieht NIEMALS Implementation — nur Spec/Interface
- Schreibt Tests VOR Implementation (TDD)
- Tests muessen ERST FEHLSCHLAGEN, dann Implementation

## DB/RPC Tests
- IMMER gegen echte Daten testen (keine Mocks fuer DB)
- Nach neuer Tabelle: Smoke Test mit `SELECT COUNT(*)`
- RLS: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`

## Ausfuehren
- `npx vitest run` — alle Tests
- `npx vitest run src/lib/services/` — nur Services
- `npx vitest --watch` — Watch Mode fuer Development
- `npx tsc --noEmit` — IMMER zusammen mit Tests ausfuehren
