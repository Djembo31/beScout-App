# Slice 298 — /club + /clubs Contract-Level Lifecycle-E2E (Demo-Step-8)

**Slice-Type:** Tool (E2E test infra)
**Größe:** M
**CEO-Scope:** Nein (Test-Infra, CTO-Domain — kein src/**-Runtime-Change, kein Money/Security)
**Datum:** 2026-06-13

---

## 1. Problem-Statement

Demo-Step-8 aus dem Stabilization-Track (Handoff 2026-06-13): Nach Slice 293 (Fantasy Lifecycle E2E) und den Page-Contract-Tests 295 (`/clubs`) + 297 (`/club/[slug]` Tab-Split) fehlt der **E2E-Layer obendrauf** gegen Live-Prod für die Club-Pages.

Evidence:
- `e2e/club.spec.ts` ist konditionaler Render-Smoke (`if (await X.isVisible())` ohne `else`-Fail → kann nicht fehlschlagen — exakt der Anti-Pattern den Slice 293 für /fantasy geschlossen hat).
- Slice 297 AC-5 (Mobile-393px-Tab-Split) wurde manuell per Playwright-MCP verifiziert, aber es gibt keinen wiederholbaren E2E-Regression-Guard.
- `testing.md` „Contract-Level E2E gegen Live-Prod (Slice 293)" nennt explizit: „Blueprint reusable für /club, /clubs Lifecycle-E2Es (Demo-Step 8)."

## 2. Lösungs-Design

Neuer Spec `e2e/club-lifecycle.spec.ts` nach dem **Slice-293-Contract-Pattern**: assert die *Struktur* (auth+geo erreichbar, Daten-Pfad resolved, kein Error-Early-Return, kein i18n-Leak, kein Crash, Mobile-Overflow ≤1px) — NICHT volatile Werte (welche Clubs, welche Spieler, welche Scores). Deterministisch über jeden Backend-State.

Zwei Tests in einem describe-Block (1 browser-context je Test, own-login wie 293):
- **Test A — /clubs Discovery-Contract:** erreichbar, Liga-Filter rendert (Slice-286-Cold-Load-Regression-Anker), Daten-Pfad resolved (Club-Card sichtbar, kein ErrorState), kein Leak, Mobile.
- **Test B — /club/[slug] Detail-Contract:** public erreichbar, 4 Tabs (Slice-297-Tab-Split-Anker), Tab-Walk aktiviert via `aria-selected`, kein ErrorState, kein Leak, kein Crash, Mobile-393px (Slice-297-AC-5-Regression-Anker).

Verkabelung analog 293: eigenes playwright-Projekt `club-lifecycle` + `test:club-lifecycle`-Script + non-blocking nightly-Step (`if: always()` + `continue-on-error: true`).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `e2e/club-lifecycle.spec.ts` | NEU — 2 Contract-Tests |
| `playwright.config.ts` | +1 Projekt `club-lifecycle` (testMatch) |
| `package.json` | +1 Script `test:club-lifecycle` |
| `.github/workflows/nightly-audit.yml` | +1 non-blocking Step (mirror fantasy-lifecycle Z.356-363) |

Kein src/**-Runtime-Change.

## 4. Code-Reading-Liste (DONE vor Spec-Approval)

| File | Zweck | Befund |
|------|-------|--------|
| `e2e/fantasy-lifecycle.spec.ts` | Blueprint-Pattern | 8 ACs, own-login, contract-not-value, retries:1, pageerror-collector, i18n-leak-regex, exact:true für Error-Absence |
| `e2e/helpers.ts` | login/overlay-Helper | `loginViaUI`, `dismissOverlays`, `CLUB_SLUG='sakaryaspor'` vorhanden |
| `e2e/club.spec.ts` | bestehender Smoke | konditional, role="tab"-basiert (`getByRole('tab')`) |
| `playwright.config.ts` | Projekt-Verkabelung | fantasy-lifecycle Z.50-55 als Vorlage |
| `src/components/ui/TabBar.tsx` | Active-Tab-Anker | **accentColor=clubColor → aktiver Tab via Inline-Style, NICHT `text-gold`. Anker = `aria-selected="true"` + role="tab"/"tablist"** |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | Tab-Definition | `TABS` = uebersicht/spieler/spielplan/mehr; `<TabBar accentColor={clubColor}>`; KEIN Disclaimer (Compliance via 294-Metadata-Unit-Test) |
| `src/app/(app)/clubs/page.tsx` | Discovery-Anker | h1=`clubs.discoverTitle`, `<LeagueScopeHeader>`, Skeleton/ErrorState/EmptyState, Club-Cards mit Link `/club/[slug]` |
| `src/components/ui/index.tsx` ErrorState | Error-Absence-Anker | default `common.errorLoadFailed` = „Daten konnten nicht geladen werden." (MIT Punkt) — beide Pages nutzen ErrorState |
| `.github/workflows/nightly-audit.yml:356-363` | nightly-Verkabelung | fantasy-lifecycle Step mit `if: always()` + `continue-on-error: true` |

## 5. Pattern-References

- **testing.md „Contract-Level E2E gegen Live-Prod (Slice 293)"** — 6-Element-Contract (auth+geo / compliance / data-path-resolved / no-crash / no-i18n-leak / mobile). /club hat keinen Disclaimer → Compliance-Element entfällt hier (294 deckt Meta-Wording ab).
- **Slice 293 Review F-2** — `{ exact: true }` bei Error-Absence-Check (Periode-Varianten `common.errorLoadFailed` MIT vs `fantasy.dataLoadFailed` OHNE Punkt).
- **Slice 282b Falle #1/#2** — `finalDisplayedUrl`/pathname-strict-equals statt page.url() nach domcontentloaded (client-side Auth-Redirect nach Hydration).
- **Slice 282a** — `first()`-Locator-Click auf live-re-rendernden Listen → instabil; href extrahieren + `goto` statt `click` für Render-Walks. (Hier: Tab-Switch ist stabil, Card-Nav via goto vermeidbar — wir navigieren direkt zu `/club/sakaryaspor`.)
- **Slice 286** — Liga-Filter (`LeagueScopeHeader`) Cold-Load-Race; /clubs Filter-Button-Presence ist ein Regression-Anker.
- **Slice 297 AC-5** — Mobile-393px 4-Tab kein-Overflow (dieser E2E macht den manuellen Verify wiederholbar).

## 6. Acceptance Criteria

**Test A — /clubs Discovery:**
- AC-A1 [HAPPY] `goto('/clubs')` status<500, pathname strict-equals `/clubs` (kein Auth/Geo-Redirect), `main` visible. FAIL-IF redirect zu /login.
- AC-A2 [HAPPY] Liga-Filter sichtbar: `[data-testid=league-scope-header]` ODER mind. 1 Liga/Country-Filter-Button im Header (Slice-286-Anker). FAIL-IF 0 Buttons (Cold-Load-Race-Regression).
- AC-A3 [DATA-PATH] Mind. 1 Club-Card gerendert (Link `a[href*="/club/"]` sichtbar) UND ErrorState absent (`getByText('Daten konnten nicht geladen werden.', {exact:true})` count 0). Beweist Query resolved, NICHT „Daten existieren" (Skeleton-weg + Error-absent).
- AC-A4 [I18N] kein raw i18n-Key-Leak in `main` (Pattern inkl. `clubs|fanWishes`-Namespaces).
- AC-A5 [MOBILE] 393px: `documentElement.scrollWidth - clientWidth ≤ 1`.

**Test B — /club/[slug] Detail:**
- AC-B1 [HAPPY] `goto('/club/sakaryaspor')` status<500, pathname strict-equals `/club/sakaryaspor` (public, kein Redirect), `main` visible.
- AC-B2 [STRUCTURE] 4 Tabs `role="tab"` mit Namen Übersicht/Spieler/Spielplan/Mehr sichtbar (beweist Skeleton resolved + Slice-297-Tab-Split live). FAIL-IF „Mehr"-Tab fehlt (297-Regression).
- AC-B3 [DATA-PATH] ErrorState absent (exact). 
- AC-B4 [WALK] jeder der 4 Tabs: click → `aria-selected="true"` UND ErrorState bleibt absent (kein Crash beim Switch).
- AC-B5 [I18N] kein raw i18n-Key-Leak (Pattern inkl. `club`-Namespace).
- AC-B6 [MOBILE] 393px: 4 Tabs erreichbar + `documentElement` Overflow ≤1px (Slice-297-AC-5-Regression-Anker).
- AC-B7 [NO-CRASH] 0 uncaught `pageerror` über den ganzen Walk. (Hinweis: `[AuthProvider] Profile load failed` ist ein **console.error**, kein `pageerror` — wird NICHT erfasst; bei own-login ohnehin abwesend.)

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| Vercel Cold-Start nach Deploy | retries:1 + nightly-Warm-Up fängt 15-30s Boot |
| 0 offene Clubs in gewählter Liga | /clubs zeigt EmptyState → AC-A3 würde failen; **Mitigation:** kein Liga-Filter gesetzt (Default = alle), Sakaryaspor ist immer aktiv |
| Club-Card live-re-render (Most-Owned-Batch lädt nach) | wir clicken keine Card (goto direkt), kein 282a-Stale-Click |
| Tab-Switch während Realtime-Update | Tab-Switch ist lokaler State (kein Netzwerk), stabil |
| Anon-Session (kein Login) | own-login wie 293 → AuthProvider-Error abwesend; /club ist trotzdem public |
| i18n-Leak in nicht-gelistetem Namespace | best-effort (293-Caveat), Pattern deckt club/clubs/common/errors/meta/fanWishes |
| ErrorState-Text Periode-Drift | `exact:true` mit Punkt-Variante (common.errorLoadFailed) |
| Mobile-Sub-Pixel | `≤ 1` Toleranz (293-Pattern) |

## 8. Self-Verification Commands

```bash
# Lokal gegen Prod (own-login):
pnpm run test:club-lifecycle
# Erwartung: 2 passed (Test A + Test B)

# Projekt-Verkabelung:
grep -n "club-lifecycle" playwright.config.ts package.json .github/workflows/nightly-audit.yml
# Erwartung: 1 Projekt + 1 Script + 1 nightly-Step
```

## 9. Open-Questions

- **Autonom-Zone (CTO):** Test-Struktur, Anker-Wahl, Verkabelung. Mirror von 293.
- **Keine Pflicht-Klärung / keine CEO-Zone** — Anil hat Demo-Step-8 direkt beauftragt; reine Test-Infra.

## 10. Proof-Plan

`worklog/proofs/298-club-lifecycle.txt`: `test:club-lifecycle`-Output (2 passed) gegen bescout.net + Verkabelungs-Grep.

## 11. Scope-Out

- Kein Hard-Gate jetzt — non-blocking nightly bis mehrere grüne Runs (Promotion später, analog 293 §11).
- Kein Ersatz von `e2e/club.spec.ts` (bleibt als lokaler authenticated-Smoke; out-of-scope).
- Kein /club/[slug]/admin (eigener Auth-Pfad).
- Keine Compliance-Disclaimer-Assertion für /club (kein Disclaimer im Component; 294 deckt Meta-Wording).
- Kein TR-Locale-Run (Pattern ist Locale-agnostisch via role/aria; DE-Anker reichen).

## 12. Stage-Chain (geplant)

SPEC → IMPACT skipped (kein Service/RPC/Schema/Query-Key — reine E2E-Infra) → BUILD → REVIEW (reviewer-Agent) → PROVE (test:club-lifecycle gegen Prod) → LOG.

## 13. Pre-Mortem (M — optional, kurz)

1. **Tab-Active-Anker falsch (`text-gold`):** wäre False-Negative — abgefangen durch Code-Reading (TabBar nutzt Inline-Style bei accentColor → `aria-selected`). ✅
2. **Liga-Filter-Selector zu spezifisch:** `data-testid` evtl. nicht vorhanden → Fallback auf Button-Count im Header. In BUILD verifizieren welcher Anker live existiert.
3. **EmptyState statt Cards** wenn Default-Liga-Scope leer: Mitigation = kein Filter (alle Clubs), Sakaryaspor immer da.
4. **Cold-Start-Flake:** retries:1 + non-blocking nightly.
5. **i18n-Leak-Regex False-Positive** auf deutschen Satz mit Punkt+Kleinbuchstabe: 293-Pattern (`\b...\.[a-z][a-zA-Z]{2,}\b`) ist tight; gleiches Risiko/Mitigation wie 293.
