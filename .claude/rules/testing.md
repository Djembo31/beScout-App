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

## Visual QA / Playwright
- Bei Multi-Page-Refactors: starte QA mit der Page die am MEISTEN Aenderungen erwartet — die faellt am schnellsten um und zeigt Integration-Gaps
- Default-Tab Pages (z.B. `/profile` zeigt standardmaessig einen Tab): explizit durch alle Tabs klicken, `fullPage` Screenshot deckt nur den Default ab
- Deep-Link Tab-Params NIE raten — immer Component-Source pruefen fuer den echten URL-Param-Namen
- qa-visual Agent hat KEINE Playwright MCP Tools — nutze `npx tsx e2e/qa-*.ts` mit `@playwright/test` chromium API. Template: `e2e/screenshot-home.ts`
- jarvis-qa Password: `e2e/mystery-box-qa.spec.ts:5` (nicht in .env.local)
