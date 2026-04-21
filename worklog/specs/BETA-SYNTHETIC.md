# Synthetic User Suite — Spec

**Status:** Phase 3a, Task #17.
**Goal:** 3 Playwright-Profile als "automatisierte Pre-Tester", die die Lücke zwischen Smoke-Suite ("lädt die Seite?") und echten Menschen ("ist das UX ok?") schließen.

## Warum

- Smoke-Suite: 10 Flows, 13s, "lädt die Seite ohne 5xx" — für Deploy-Gate
- Synthetic Users: Full-Coverage aller 12 Entry-Pages + deep interactions, **Screenshots + Error-Collection** — für Regression + Visual-QA + TR-Review-Vorarbeit
- Echte Menschen: UX-Empathie, Wording, Emotion — **unersetzbar**, aber **nicht für alles nötig**

Synthetic **entlastet** die echten Tester: sie müssen nicht "Login funktioniert?" testen, sondern können sich auf **"würde ich das nutzen?"** konzentrieren.

## Die 3 Profile

### Profile A — Discovery (new-user perspective)
- Jarvis-qa logged in, läuft durch **12 Entry-Pages**
- Full-Page-Screenshot pro Page (1280×800 Desktop-Viewport)
- Console-Errors + Network-Failures erfasst
- **Output:** `qa-screenshots/synthetic/profile-a-discovery/*.png` + `report.md`

Pages: `/` · `/market` · `/manager` · `/fantasy` · `/community` · `/missions` · `/transactions` · `/founding` · `/inventory` · `/rankings` · `/airdrop` · `/profile`

### Profile B — Power User (deep interactions)
- Jarvis-qa → /market → click erstes Player-Card → /player/[id]
- Versucht BuyModal zu öffnen (UI-only, kein Confirm — keine Prod-DB-Writes)
- ESC → /manager → /fantasy → /missions → /transactions
- Screenshots pro Interaction-Step
- **Output:** `qa-screenshots/synthetic/profile-b-power/*.png` + `report.md`

### Profile C — TR Locale (i18n preview)
- Cookie `bescout-locale=tr` gesetzt vor Navigate
- Gleiche 12 Pages wie Profile A
- **Scrape aller visible Strings** (h1-h5, button, a, p, li, span.title, data-testid)
- Filter: Zahlen/Symbole raus, 3-200 Zeichen
- Dedupe in Set, sortiert als `tr-strings.txt`
- **Output:** `qa-screenshots/synthetic/profile-c-tr-locale/*.png` + `tr-strings.txt` + `report.md`

**TR-String-Dump ist Vorarbeit für Task #11 (Native-Speaker-Review):** Deutsch-Türkische Reviewer bekommen das file statt mühsam durch die UI zu scrollen.

## Explizit NICHT im Scope

- Signup-Flow (erzeugt fake Prod-User — separate Strategie nötig)
- State-altering Actions (BuyModal-Confirm, Order-Create, Lineup-Save) — Synthetic darf nicht Prod-Daten schreiben
- Performance-Assertions (LCP/CLS) — zukünftige Erweiterung
- Mobile-Viewport (375×667) — zukünftige Erweiterung
- Accessibility-Audit (axe-core) — zukünftige Erweiterung

## Technik

- **1 Spec-File mit 3 `test.describe`-Blocks** — `e2e/synthetic-users.spec.ts`
- **Eigenes Playwright-Project `synthetic`** — own login, kein storageState
- **`retries: 1`** (Default aus Root-Config) — 1 Retry bei Flakiness
- **Runtime-Ziel:** ~3-5 Min total (12 pages × 2s pro Profile × 3 Profile + overhead)
- **Keine Screenshots committed** (`qa-screenshots/` ist im `.gitignore`)

## Runbook

**Lokal gegen bescout.net:**
```bash
pnpm run test:synthetic
```

**Lokal gegen localhost:**
```bash
npx playwright test --project=synthetic
```

**Nach Run:**
- Screenshots in `qa-screenshots/synthetic/<profile>/*.png` anschauen
- `qa-screenshots/synthetic/<profile>/report.md` für Console-Errors
- `qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt` für TR-Review

## Integration (post-MVP)

- Noch NICHT in Post-Deploy-GHA — Synthetic ist lokal/On-Demand
- Nach erstem erfolgreichen Run: evtl. als wöchentliche GHA (nicht per Deploy, zu teuer)
- Als Regression-Gate bei Major-UI-Refactors: manuell vor Merge

## Nächste Schritte

1. Task #17: Spec schreiben ✅ (dieses File)
2. Task #17: Suite bauen ✅ (e2e/synthetic-users.spec.ts)
3. Task #17: Erster Live-Run gegen bescout.net — auf Screenshots + Reports prüfen
4. Task #8 (Phase 3b): Testplan für echte Menschen — nutzt TR-Strings-Dump aus Profile C als Review-Script
