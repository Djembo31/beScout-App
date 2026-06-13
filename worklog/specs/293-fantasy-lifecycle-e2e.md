# Slice 293 — Deterministic Fantasy Lifecycle E2E

**Status:** SPEC · **Größe:** M · **Slice-Type:** Tool (E2E-Test) · **Scope:** CTO · **Datum:** 2026-06-13

> Anknüpfung an Hermes' Page-Contract-Audits (S1–S3, Slices 288/289/292). Jede auditierte Page landete „demo-yellow" mit demselben Caveat: **kein deterministisches Page-Contract-E2E gegen echte Event-/Gameweek-Daten** — nur konditionaler Render-Smoke + breiter Smoke. Dieser Slice schließt den Caveat für `/fantasy` (Demo-Path Step 7, P0).

---

## 1. Problem Statement

`e2e/fantasy.spec.ts` ist konditionaler Render-Smoke: **jede Assertion** hängt an `if (await X.isVisible())` und fällt auf `expect(body).not.toBeEmpty()` zurück. Der Test **kann nicht fehlschlagen** — verschwindet ein Tab, ein Disclaimer, oder bricht der Daten-Pfad, bleibt er grün.

Evidence:
- `worklog/audits/2026-06-13/page-contract-fantasy-club.md` §/fantasy „E2E status": _„this audit did not find a deterministic Fantasy lifecycle e2e asserting join/lineup/results across real event states."_
- Slice 288/289 Audits: identischer E2E-Caveat für `/market`, `/player`, `/home`, `/manager` → wiederkehrendes Muster (5×), das alle Pages auf „yellow" statt „green" hält.
- `e2e/fantasy.spec.ts:20,31,38,44,52,63,81,86` — 8× `if (await … .isVisible())` ohne `else`-Fail.

**Betroffen:** Demo-Confidence für /fantasy (P0 Demo-Path-Step). Regression in Fantasy-Tabs/Disclaimer/Daten-Pfad bliebe in CI unsichtbar.

## 2. Lösungs-Design (Architektur)

**Neuer deterministischer Lifecycle-Spec gegen bescout.net** (nicht localhost — `feedback_no_local_qa`), der den **Contract** prüft (stabil über volatile Gameweek-Daten), nicht volatile Werte:

1. **Auth + Geo erreichbar** — Login (own-login wie beta-smoke, `jarvis-qa@bescout.net`), `/fantasy` lädt ohne `/login`-Redirect und ohne GeoGate-Block-Screen, `main` sichtbar.
2. **Compliance-Contract** — `FantasyDisclaimer` sichtbar.
3. **Tab-Contract** — alle 4 Tabs (Spiele/Spieltag, Events, Mitmachen, Ergebnisse) sichtbar + klickbar (deterministisch, kein `if`).
4. **Daten-Pfad verkabelt** — `FantasySkeleton` verschwindet UND `FantasyError` erscheint nicht → der Events-Query hat resolved. Das ist die eigentliche Demo-Confidence-Frage.
5. **Per-Tab-Content-Contract** — nach Klick rendert jeder Tab einen tab-spezifischen stabilen Anker (kein „body not empty"); Anker werden beim Code-Reading aus den Tab-Components extrahiert.
6. **Quality-Gate** — keine uncaught Page-Exceptions (`page.on('pageerror')`), kein roher i18n-Key-Leak in sichtbarem Text.
7. **Mobile** — 393px: Tabs erreichbar, kein horizontaler Overflow.

Warum „Contract" statt „echte Event-Werte": Ein E2E, das „Event X mit Score Y" asserted, ist gegen Live-Prod flaky (Gameweek-State bewegt sich). Contract-Assertions (Struktur existiert, Daten-Pfad resolved, keine Errors) sind deterministisch UND beantworten die Demo-Confidence-Frage.

**Auth-Strategie:** Own-Login (kein `storageState`/`demo-fan` aus dem `authenticated`-Projekt), weil (a) provable gegen Prod mit echtem Prod-Account, (b) spiegelt den bewährten `beta-smoke`-Pattern, (c) kein Setup-Dependency-/Demo-Account-auf-Prod-Risiko.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `e2e/fantasy-lifecycle.spec.ts` | NEU | Deterministischer Lifecycle-Contract-Spec |
| `e2e/helpers.ts` | EDIT | Shared `loginViaUI(page, email, pw)` + ggf. `collectPageErrors` extrahieren (DRY mit beta-smoke-Login) |
| `playwright.config.ts` | EDIT | Neues Projekt `fantasy-lifecycle` (own-login, kein storageState, läuft gegen Prod) |
| `package.json` | EDIT | `test:fantasy-lifecycle` Script + Wiring in nightly-audit (Trigger = Tool-DoD) |
| `.github/workflows/nightly-audit.yml` | EDIT (TBD BUILD) | Non-blocking recurring Trigger (kein Deploy-Gate) — final entschieden beim Code-Reading |

**Vor diesem Slice greppt man:** `grep -rn "FantasyDisclaimer\|FantasySkeleton\|FantasyError\|mainTab" src/app/(app)/fantasy src/components/fantasy` — stabile Anker + Tab-Labels verifizieren.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `e2e/beta-smoke.spec.ts` | Login-Pattern + Determinismus-Gold-Standard | Wie own-login, `status<500`, `main`-visible, `retries:1` Cold-Start? |
| `e2e/fantasy.spec.ts` | Bestehende (zu ersetzende) Smoke | Welche Tab-Labels/Selektoren genau? Welche `if`-Anti-Patterns? |
| `e2e/helpers.ts` | Helper-Inventar | Was ist schon da (`waitForApp`, `expectToast`)? Wohin `loginViaUI`? |
| `playwright.config.ts` | Projekt-/baseURL-Verkabelung | Wie ist `smoke`/`synthetic` als own-login-Projekt gebaut? |
| `src/app/(app)/fantasy/FantasyContent.tsx` | Tab-State + Anker | `store.mainTab`-Werte, `FantasyDisclaimer`-Platzierung, `FantasySkeleton`/`FantasyError`-Bedingungen, Tab-Button-Labels (DE) |
| `src/components/fantasy/event-tabs/*Tab.tsx` (Spieltag/Events/Mitmachen/Ergebnisse) | Per-Tab stabile Anker | Welches stabiles Element/Heading pro Tab als deterministischer Anker? |
| `src/app/(app)/fantasy/page.tsx` | GeoGate | `feature="free_fantasy"` — wie sieht Block-Screen aus (falls restricted)? |
| `.claude/rules/testing.md` „Click auf first()-Locator" (Slice 282a) | Bekannte Falle | href+goto statt click auf live-re-rendernde Listen; `vi.resetModules`-Flakiness (n/a hier) |
| `.claude/rules/errors-infra.md` „Cold-Start-Warm-Up" + „LHCI Auth" | Bekannte Falle | `finalDisplayedUrl == requestedUrl`-Verify; Cold-Boot-Retry |
| `.github/workflows/nightly-audit.yml` | Trigger-Wiring | Wo passt der neue Test-Step rein (non-blocking)? |

## 5. Pattern-References

- `testing.md` „Click auf first()-Locator live-re-rendernder Listen" (Slice 282a) — falls Tab-Inhalte Links zu Live-Listen haben: href+goto, nicht click.
- `errors-infra.md` „Cold-Start-Warm-Up vor Smoke-Suite" (Slice SO-4) — Prod-Lambda-Cold-Boot; `retries:1` + ggf. Warm-Up.
- `errors-infra.md` „LHCI Auth-Fix" Falle #2 (Slice 282b) — Client-side-Auth: Login-State **nicht** via `page.url()` direkt nach domcontentloaded prüfen (Redirect kommt nach Hydration); `waitForURL` weg von /login.
- `errors-frontend.md` „Missing i18n-Key bei neuer CTA" — AC-07 i18n-Leak-Gate prüft genau diese Klasse runtime.
- `business.md` — /fantasy hat FantasyDisclaimer-Pflicht; AC-02 macht das zur Regression-Guard.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] Auth+Geo: /fantasy erreichbar nach Login
  VERIFY: PLAYWRIGHT_BASE_URL=https://bescout.net pnpm exec playwright test --project=fantasy-lifecycle
  EXPECTED: nach Login goto /fantasy → URL bleibt /fantasy (kein /login-Redirect), main sichtbar, kein GeoGate-Block-Text
  FAIL IF: Redirect zu /login ODER GeoGate-Restricted-Screen ODER main nicht sichtbar in 15s

AC-02: [COMPLIANCE] FantasyDisclaimer sichtbar
  VERIFY: gleicher Run, Step "disclaimer"
  EXPECTED: FantasyDisclaimer-Element/Text sichtbar auf /fantasy
  FAIL IF: Disclaimer fehlt (Compliance-Regression)

AC-03: [HAPPY] 4 Tabs deterministisch präsent
  EXPECTED: getByRole button Spiele/Spieltag, Events, Mitmachen, Ergebnisse alle visible (kein if-guard)
  FAIL IF: ein Tab-Button fehlt

AC-04: [LOADING→CONTENT] Daten-Pfad verkabelt
  EXPECTED: FantasySkeleton verschwindet < 20s UND FantasyError nicht sichtbar
  FAIL IF: Skeleton bleibt hängen ODER FantasyError-Retry-Screen erscheint

AC-05: [HAPPY] Tab-Walk mit tab-spezifischem Anker
  EXPECTED: Klick auf jeden der 4 Tabs → tab-spezifischer stabiler Anker sichtbar (kein "body not empty")
  FAIL IF: ein Tab rendert FantasyError ODER zeigt keinen Anker

AC-06: [REGRESSION] Keine uncaught Page-Exceptions
  EXPECTED: page.on('pageerror') sammelt 0 Einträge über den gesamten Walk
  FAIL IF: ≥1 uncaught Exception

AC-07: [I18N] Kein roher i18n-Key-Leak
  EXPECTED: sichtbarer body-Text matcht NICHT /(fantasy|events|manager|common|errors|meta)\.[a-z][a-zA-Z]{2,}/
  FAIL IF: roher Key sichtbar (z.B. "fantasy.spieltag")

AC-08: [MOBILE] 393px erreichbar, kein Overflow
  EXPECTED: viewport 393×852 → main sichtbar, 4 Tabs erreichbar (scroll), scrollWidth ≤ clientWidth + 1
  FAIL IF: horizontaler Overflow ODER Tab nicht erreichbar
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Login | Cold-Start Lambda | erster goto 15-30s | retry:1 fängt transient ab | `retries:1` + ggf. Warm-Up (SO-4) |
| 2 | Auth | Client-side Redirect nach Hydration | `page.url()` zeigt kurz /fantasy dann /login | `waitForURL(!/login)` + Cookie/main-Check | Slice 282b Falle #2 |
| 3 | Daten | 0 offene Events in aktueller GW | Skeleton→leer statt Events | AC-04 prüft Skeleton-weg + kein Error (NICHT „Event existiert") | Contract- statt Wert-Assertion |
| 4 | Daten | Events-RPC 200 mit leerem Array | NewUserTip / Tab-Empty-State | gilt als „resolved" (kein FantasyError) | AC-04 trennt resolved von error |
| 5 | Tab | Tab-Inhalt enthält Live-Liste mit Links | first()-click instabil | Anker = Heading/Container, kein Link-Click | Slice 282a |
| 6 | Geo | jarvis-qa in TIER_RESTRICTED? | GeoGate free_fantasy block | free_fantasy ist in TR erlaubt (TIER_RESTRICTED = Content+Free-Fantasy) → kein Block erwartet | business.md Geofencing-Tier-Tabelle |
| 7 | i18n | legit Text mit Punkt ("z.B. 3.5") | AC-07 false-positive | Regex nur auf namespace-prefix-Keys, nicht beliebige Punkte | enge Regex |
| 8 | Modal | WelcomeBonus/Cookie blockt | Overlay über Tabs | dismissModals vor Assertions | beta-smoke-Pattern |

## 8. Self-Verification Commands

```bash
# Pflicht:
pnpm exec tsc --noEmit

# Slice-spezifisch (gegen Prod — das IST der Proof):
PLAYWRIGHT_BASE_URL=https://bescout.net pnpm exec playwright test --project=fantasy-lifecycle --reporter=list

# Anti-Pattern-Audit: keine konditionalen Assertions im neuen Spec
grep -nE "if \(await .*isVisible\(\)\)" e2e/fantasy-lifecycle.spec.ts   # erwartet: nur in dismissModals-Helper, NICHT in Assertions

# Tab-Label/Anker-Verify vor Build:
grep -rn "mainTab\|FantasyDisclaimer\|FantasySkeleton\|FantasyError" src/app/\(app\)/fantasy/FantasyContent.tsx
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Account (`jarvis-qa@bescout.net`) + baseURL-Konvention + Determinismus-Strategie sind aus beta-smoke etabliert.

**Autonom-Zone (CTO):**
- Genaue tab-spezifische Anker (aus Code-Reading der Tab-Components).
- Ob `fantasy.spec.ts` ersetzt oder ergänzt wird (Tendenz: belassen als lokaler Render-Smoke, neuer Spec ist die Prod-Contract-Wahrheit; alter Spec als Backlog-Hardening-Notiz).
- Wo genau in `nightly-audit.yml` der Step landet (non-blocking).
- Ob ein expliziter Warm-Up-Step nötig ist (abhängig von Cold-Start-Verhalten beim ersten Run).

**Nicht-Autonom-Zone:** keine Money-/RLS-/Wording-Berührung.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| E2E-Test (Tool) | `PLAYWRIGHT_BASE_URL=https://bescout.net pnpm exec playwright test --project=fantasy-lifecycle --reporter=list` Output (alle ACs grün) nach `worklog/proofs/293-fantasy-lifecycle-e2e.txt` |
| Anti-Pattern-Verify | `grep -nE "if \(await .*isVisible" e2e/fantasy-lifecycle.spec.ts` → 0 in Assertion-Pfaden, im Proof dokumentiert |

**Verboten:** „tsc clean" allein, „läuft lokal".

## 11. Scope-Out

- **`/club/[slug]` + `/clubs` Lifecycle-E2E** → eigener Folge-Slice (Demo-Step 8). Dieser Slice ist /fantasy-fokussiert.
- **Echte join/leave/submitLineup-Mutation gegen Prod** → Scope-Out: schreibt echte Daten in Prod-DB (Test-Pollution, Idempotency-Risiko). Contract-Level-E2E ohne Money-/State-Mutation. Mutation-E2E ggf. gegen Staging post-Beta.
- **Post-Deploy-Gate-Integration (Deploy-Blocker)** → Scope-Out: nur non-blocking nightly-Trigger, damit ein flaky Prod-Run keinen Deploy blockt. Gate-Promotion erst nach Stabilitäts-Nachweis (mehrere grüne Runs).
- **`fantasy.spec.ts`-Hardening** (if-guards entfernen) → Backlog-Notiz, nicht in diesem Slice.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: Test-Only, kein Service/RPC/Schema/Query-Key-Touch) → BUILD → REVIEW (reviewer-Agent) → PROVE (Prod-Run-Output) → LOG
```

IMPACT skipped-Begründung: kein `src/lib/services`, keine Migration, keine Query-Keys, kein Cross-Domain-Contract-Change. Reiner E2E-Test + Config/Script-Wiring.

## 13. Pre-Mortem (optional bei M — hier kurz, 5 Szenarien)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Flaky gegen Prod-Cold-Start → false-red blockt nichts (nightly) aber rauscht | MED | niedrig | `retries:1` + non-blocking nightly + ggf. Warm-Up | Master-Tracker #25-Klasse |
| 2 | jarvis-qa-Account in restricted Region → GeoGate-Block → AC-01 rot | LOW | mittel | Edge-Case #6: free_fantasy in TR erlaubt; Account ist Prod-QA-Standard | erster Run zeigt's sofort |
| 3 | Tab-Anker driftet (i18n/Label-Rename) → AC-05 rot | MED | niedrig | Anker auf robuste role+name, nicht CSS-Klassen | Test-Fail mit klarer Message |
| 4 | AC-07 i18n-Regex false-positive auf legit Text | MED | niedrig | enge namespace-prefix-Regex (Edge #7) | Review + erster Run |
| 5 | „Deterministisch" wird zu strikt → bricht bei legit-leerer GW | MED | mittel | AC-04/Edge #3+4: Contract (resolved) statt Wert (Event existiert) | Spec-Review fängt's |

---

## Open Risiko (kurz, ehrlich)

Hauptrisiko: Determinismus-Balance gegen Live-Prod-Daten. Mitigation = Contract-Assertions (Struktur/Daten-Pfad-resolved/keine-Errors) statt Wert-Assertions (konkrete Events/Scores). Wenn ein Run trotzdem flaky ist, bleibt er non-blocking (nightly), kein Deploy-Gate.
