# Beta Smoke Suite — Spec

**Status:** draft, in Phase 1 Setup-Härtung (Task #6).
**Goal:** 10 kritische User-Flows gegen https://bescout.net als Post-Deploy-Check.

## Warum

Bis heute (2026-04-21) gab es **keine automatisierte Post-Deploy-Validation**. Der pnpm-Lockfile-Hotfix `d73dc235` hat gezeigt, dass **8 konsekutive Vercel-Deploys auf ERROR liefen** ohne dass wir es gemerkt haben — bescout.net lief auf Slice 113 während Slices 114-123 nicht live waren.

**Dieses Smoke-File schließt die Lücke.** Nach jedem Vercel-Deploy läuft die Suite gegen die Live-URL. Wenn ein Flow bricht → GH-Issue mit Label `beta-blocker` (Post-Deploy GHA, Task #7).

## Die 10 Flows

| # | Flow | Assertion (MVP, nicht deep) |
|---|---|---|
| 1 | `/home` unauth | Status < 500, body not empty |
| 2 | Login mit `jarvis-qa@bescout.net` | Redirect weg von `/login` |
| 3 | `/market` lädt | Tabs-Button "Kader" sichtbar |
| 4 | Market-Card interaktiv | Player-Link oder Card-Element im DOM |
| 5 | `/manager` Manager-Hub | `<main>` sichtbar |
| 6 | `/player/[id]` | Navigation, `<main>` sichtbar |
| 7 | `/fantasy/spieltag` | Status < 500, `<main>` sichtbar |
| 8 | `/community` | Status < 500, `<main>` sichtbar |
| 9 | `/missions` | Status < 500, `<main>` sichtbar |
| 10 | `/transactions` | Status < 500, `<main>` sichtbar |

## Explizit NICHT im Scope

- **State-altering Actions** (BuyModal Confirm, Lineup-Save, Order-Create) — Smoke darf Prod-Daten nicht verändern
- **Web-Vitals / LCP-Assertions** — separate Performance-Suite
- **Visual-Regression** — separate qa-visual-Agent
- **DB-Invariants** — läuft weiter in CI vitest
- **Multi-Locale-Check** — TR/DE Parität wird in Task #11 von echtem Native-Speaker validiert

## Technik

- **1 Test mit 10 `test.step()`-Calls** — shared browser context, Login nur einmal
- **`retries: 0`** — Smoke ist deterministisch, kein Flaking erwartet
- **Runtime-Ziel:** ≤ 180 Sek total
- **Unauthenticated Project** — eigener Login-Flow (Step 2), keine .auth-storage-state Abhängigkeit
- **Credentials via env:** `SMOKE_EMAIL`, `SMOKE_PASSWORD` (Defaults: jarvis-qa)

## Runbook

**Lokal gegen bescout.net:**
```
pnpm run test:smoke
```

**Lokal gegen localhost:**
```
npx playwright test beta-smoke --project=unauthenticated
```

**Post-Deploy (GHA):**
Automatisch nach Vercel-`deployment_status: success`. Siehe `.github/workflows/post-deploy-smoke.yml` (Task #7).

## Fail-Handling

- **CI fail:** GHA creates GitHub Issue mit Label `beta-blocker`, Titel mit Deploy-URL + failing step
- **Manual fail:** Playwright HTML-Report in `playwright-report/index.html` zeigt failing step + Screenshot

## Nächste Schritte

1. Task #6: diese Suite bauen ✅ (commit pending)
2. Task #7: Post-Deploy GHA workflow
3. Erster grüner Smoke-Run gegen bescout.net = "Phase 2 done"
