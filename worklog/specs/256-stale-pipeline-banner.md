# Slice 256 — StalePipelineBanner (Cron-Health UI-Sentinel)

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI · **Scope:** CTO · **Datum:** 2026-04-29

---

## 1. Problem Statement

Slice 255 baute Detection (`audit:cron-health` Daily, `cron_sync_log`-Freshness + `leagues.active_gameweek`-Drift). Aber: **die Detection läuft nur in CI/GHA**, nicht auf bescout.net selbst. Wenn Vercel-Cron 7+ Tage tot ist (Slice 254-Repro), sehen User stille-stale Daten — TFF1 zeigt GW=28 statt GW=38, Topspiel "BEENDET" statt "kommend", CountryBar 1 Pille statt 6 — und denken "Platform kaputt".

Beta-Tester ohne diese Sicht halten BeScout für unzuverlässig (Trust-Verlust). Ein **User-facing-Banner** auf /fantasy + /market kommuniziert "Daten möglicherweise veraltet — wir aktualisieren gerade" und verwandelt silent-fail in transparent-Honesty.

**Wer betroffen?** ALLE eingeloggten User auf /fantasy + /market wenn Cron drift hat — Beta-Tester explizit. Häufigkeit: bei jedem Cron-Ausfall (Slice 254 Frequenz: 1x in 30 Tagen, aber 7+ Tage Effekt → kritisch).

**Evidence:** Slice 255 active.md "Stale-Pipeline-Indicator-Banner → Slice 256" (defered Item 5). Reviewer 255 Backlog P2.

## 2. Lösungs-Design (Architektur)

**3-Layer:**
1. **Service** `getCronHealthStatus()` — anon-readable Detection-Logic, mirrors `scripts/cron-health-check.ts` Layer 2 (DB-state-drift). Liest `leagues` (active_gameweek, max_gameweeks, name, country) + `fixtures` (status, gameweek, home_club_id) via anon-Supabase. Returns `{ healthy: boolean, drifts: Drift[] }`.
2. **Hook** `useCronHealth()` — TanStack Query mit `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false`. Query-Key `qk.system.cronHealth`.
3. **Banner** `StalePipelineBanner` — Render-NULL wenn `!data || data.healthy || dismissed`. Sonst: Amber/Yellow Card mit AlertTriangle-Icon, Text + Dismiss-X. Per-Session-Dismiss via `sessionStorage` (Key `bescout-stale-pipeline-dismissed-v1`).

**Severity-Gate:** Nur HIGH-Drifts (≥2 GW oder allFinished+notAdvanced+drift>=2) triggern Banner. MEDIUM/INFO werden in `data.healthy: true` mapped (silent für User, weiter in CI sichtbar). Vermeidet Wochenend-Noise (Mid-GW Saturday-finished is normal).

**Datenfluss:**
```
[Page Mount] → useCronHealth → getCronHealthStatus → supabase.from('leagues')+'fixtures'
            → returns { healthy, drifts }
            → StalePipelineBanner render-decision
              ├─ healthy=true → null
              ├─ dismissed (sessionStorage) → null
              └─ HIGH drift → render Card
```

**Mounted in:**
- `FantasyContent.tsx` — über `<LeagueScopeHeader>` (über sticky-header)
- `MarketContent.tsx` — über `<MissionHintList context="trading" />` (über tab-content)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/services/cronHealth.ts` | NEU | Detection-Logic anon-readable (Layer 1) |
| `src/lib/queries/cronHealth.ts` | NEU | TanStack Hook (Layer 2) |
| `src/lib/queries/keys.ts` | EDIT | qk.system.cronHealth Query-Key registrieren |
| `src/components/system/StalePipelineBanner.tsx` | NEU | UI-Banner Component |
| `src/app/(app)/fantasy/FantasyContent.tsx` | EDIT | Mount Banner über LeagueScopeHeader |
| `src/features/market/components/MarketContent.tsx` | EDIT | Mount Banner über MissionHintList |
| `messages/de.json` | EDIT | 3 i18n-Keys system.stalePipeline.* |
| `messages/tr.json` | EDIT | 3 i18n-Keys system.stalePipeline.* |

**Vor diesem Slice greppt man:** `grep -rn "qk.system" src/lib/queries/keys.ts` — neuer Namespace muss frisch sein. `grep -rn "system\." messages/de.json` — Namespace existiert evtl. schon.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/cron-health-check.ts` | Detection-Logic-Vorlage | `checkLeagueActiveGwDrift()` Slice 255 Heal-Variante (allFinished+notAdvanced+drift>=2) |
| `src/components/missions/MissionBanner.tsx` | Banner-Pattern-Vorbild | Loading/Error/Empty States, lucide-react-Icons, Tailwind-Klassen für Dark-UI Card |
| `src/lib/queries/keys.ts` | qk-Struktur | Wie sind Namespaces aufgeteilt? Existiert qk.system schon? |
| `src/app/(app)/fantasy/FantasyContent.tsx` | Mount-Spot | Wo sitzt LeagueScopeHeader, was kommt davor? |
| `src/features/market/components/MarketContent.tsx` | Mount-Spot | MissionHintList-Position, Layout-Boundaries |
| `.claude/rules/errors-frontend.md` | Bekannte Fallen | i18n-Key-Leak via raw-error-message, Hooks-vor-early-return |
| `.claude/rules/ui-components.md` | Banner-States-Standard | Loading/Error/Empty-States Pflicht, Mobile 393px touch-targets |

## 5. Pattern-References

- `errors-frontend.md` "Hooks VOR early returns" — Banner muss Hooks unconditional callen vor render-NULL-decision
- `errors-frontend.md` "Missing i18n-Key bei neuer CTA-Component" (Slice 198) — bei jedem neuen `t('system.stalePipeline.X')` MUSS Key in DE+TR existieren
- `errors-frontend.md` "Polish-Audit Pre-Existing-Code-Drift" (Slice 200a) — vor Mount in FantasyContent/MarketContent: greppen ob ähnlicher Banner schon existiert
- `errors-db.md` "PostgREST 1000-row cap" (Slice 078) — fixtures-Query mit clubIds.length≥10 ist sicher (max 7 Ligen × 20 clubs = 140 IDs, weit unter cap)
- `decisions.md` D52 "locker starten, iterativ tightenen" — Severity-Gate HIGH-only ist Phase-1, Severity-Tuning post-Beta
- `ui-components.md` "States: Loading/Error/Empty/Loaded" — Banner braucht **kein** Loading-State (silent während Fetch ist OK), kein Error-State (graceful-fail = healthy=true)

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Cron healthy → Banner unsichtbar
  VERIFY: bescout.net /fantasy mit jarvis-qa Login, post-Cron-Run (alle Ligen advanced)
  EXPECTED: Page rendert, kein Banner über LeagueScopeHeader
  FAIL IF: Banner sichtbar trotz healthy

AC-02: [DRIFT-DETECTION] Cron drift → Banner sichtbar
  VERIFY: Mock-Drift in dev-DB (UPDATE leagues SET active_gameweek = 28 WHERE name = 'TFF 1. Lig'),
          dann /fantasy laden
  EXPECTED: Amber-Banner mit Title + Message sichtbar oben
  FAIL IF: Banner unsichtbar trotz drift

AC-03: [DISMISS] Per-Session-Dismiss persistiert
  VERIFY: Banner sichtbar → X-Button klicken → /market navigieren
  EXPECTED: Banner auf /market unsichtbar (sessionStorage hat dismissed=true)
  FAIL IF: Banner trotz Dismiss erneut sichtbar während Session

AC-04: [DISMISS-RESET] Session-Reload zeigt Banner wieder
  VERIFY: Banner dismissed → Browser-Tab schließen + neu öffnen → /fantasy
  EXPECTED: Banner wieder sichtbar (sessionStorage geleert)
  FAIL IF: Dismiss persistiert über Session-Boundary

AC-05: [I18N-DE] Deutsche Strings ohne Glücksspiel/Securities-Vokabular
  VERIFY: locale=de, Banner sichtbar
  EXPECTED: "Daten möglicherweise veraltet" Title, "Wir aktualisieren gerade die Spielwoche-Daten — kann ein paar Minuten dauern" Message
  FAIL IF: "Investment", "ROI", "kazanmak", "Gewinn" oder andere business.md-Verbote

AC-06: [I18N-TR] Türkische Strings business.md-konform
  VERIFY: locale=tr, Banner sichtbar
  EXPECTED: TR-Übersetzung neutral, kein "kazan*"/"yatırım"/"kar"
  FAIL IF: TR-String raw-DE oder Glücksspiel-Vokabel

AC-07: [MOBILE] Mobile 393px Touch-Target Dismiss
  VERIFY: Chrome-DevTools 393px-viewport, Banner sichtbar, Dismiss-Button klicken
  EXPECTED: Dismiss-Button min-h-44px, kein viewport-overflow
  FAIL IF: Touch-Target <44px oder horizontal-overflow

AC-08: [GRACEFUL-FAIL] Service-Error → kein Banner
  VERIFY: Service throws (z.B. Supabase down), Hook returnt error
  EXPECTED: Banner unsichtbar (treat-as-healthy), kein Error-Toast
  FAIL IF: Error-Banner sichtbar oder Page-Crash
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Service | leagues query failed | Supabase 500 | `{ healthy: true, drifts: [] }` graceful-fail | try-catch, return healthy on error |
| 2 | Service | leagues empty (kein Cron-Drift weil keine Liga aktiv) | 0 active leagues | `{ healthy: true, drifts: [] }` | leagues.length === 0 → healthy |
| 3 | Service | Liga ohne fixtures (Pre-Season) | activeGwFixtures.length === 0 | Skip Liga, kein drift | `if (!activeGwFixtures.length) continue` |
| 4 | Service | activeGameweek === maxGameweeks (Saison-End) | dbActiveGw == maxGw | Kein drift, Saison vorbei | `if (allFinished && dbActiveGw < maxGw)` Guard |
| 5 | Hook | Race: User logged out während Fetch | userId null | Hook disabled? Nein — Banner braucht keinen User (public data) | enabled: true unconditional |
| 6 | Banner | sessionStorage nicht verfügbar (Privacy-Mode) | `window.sessionStorage` throws | Banner silent-render-NULL (no crash), dismiss-no-op | try-catch um sessionStorage-Calls |
| 7 | Banner | Locale-Switch während Banner sichtbar | `useLocale()` ändert sich | Banner re-renders mit neuen Strings, dismiss-state bleibt | useTranslations natürlich reactive |
| 8 | Mount | SSR — kein sessionStorage | `typeof window === 'undefined'` | Banner null-render-SSR-safe | useState init-fn mit window-check |

## 8. Self-Verification Commands

```bash
# Pflicht
npx tsc --noEmit
pnpm exec vitest run src/lib/services/__tests__/cronHealth.test.ts || echo "no test yet"
pnpm exec vitest run src/components/system/__tests__/StalePipelineBanner.test.tsx || echo "no test yet"

# Audits (pre-commit)
pnpm run audit:type-truth
pnpm run audit:wiring:check
pnpm run audit:i18n  # DE/TR-Parity prüfen

# Live-Verify post-Deploy
# Chrome-DevTools-MCP: navigate bescout.net/fantasy, screenshot
# Mock-Drift in Supabase-MCP: UPDATE leagues SET active_gameweek = 28 WHERE id = '<TFF1>'
# Re-Verify: Banner sichtbar, Dismiss funktioniert, sessionStorage-Reset auf Reload

# Wiring-Verify (D54)
grep -rn "StalePipelineBanner" src/  # mind. 2 Mounts (FantasyContent + MarketContent)
grep -rn "getCronHealthStatus" src/  # mind. 1 Konsument (useCronHealth)
grep -rn "useCronHealth" src/  # mind. 2 Konsumenten (FantasyContent + MarketContent via Banner)
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Anil-Direktive "voller Entscheidungsgewalt".

**Autonom-Zone (CTO entscheidet):**
- Banner-Position: über LeagueScopeHeader (sichtbar above-fold), nicht unter MissionHintList (würde sub-fold sein)
- Severity-Gate: HIGH-only Phase-1, MEDIUM-Tuning post-Beta (D52-Pattern)
- Dismiss-Persistence: sessionStorage (per-session) statt localStorage (perpetual) — Banner soll bei jedem neuen Browser-Start wieder sichtbar sein
- Banner-Color: Amber (#f59e0b-style), nicht Rot (Catastrophe-Signal vermeiden, soft-warning Tonalität)
- Service-Layer: anon-Supabase direkt in Service (KEIN API-Route nötig, leagues+fixtures sind public-readable)
- Test-Strategie: Component-Test (StalePipelineBanner) + Service-Test (cronHealth) als XS-Coverage, kein E2E (Live-Verify ist Proof)

**Nicht-Autonom-Zone:** Keine Money-Path / RLS-Drift in diesem Slice.

## 10. Proof-Plan

| Artefakt | Pfad | Inhalt |
|----------|------|--------|
| **Live-Verify-Proof** | `worklog/proofs/256-live-verify.md` | 4 Phasen: (1) Healthy-Pre-Mock kein Banner, (2) Mock-Drift via Supabase-MCP, (3) Banner sichtbar Screenshot, (4) Dismiss-Persistence cross-page Screenshot |
| **Component-Test-Output** | `worklog/proofs/256-vitest.txt` | StalePipelineBanner.test.tsx Output |
| **Mobile-Screenshot** | `worklog/proofs/256-mobile-393px.png` | Chrome-DevTools-MCP 393px viewport, Banner + Dismiss-Touch-Target |
| **Wiring-Audit** | inline in LOG | `grep -c "StalePipelineBanner" src/` ≥ 2 |

## 11. Scope-Out

- **F-4 cron_health aggregate-Step in nightly-audit.yml** → Slice 257 (Hardening-Bundle, separate Process-Domäne)
- **F-8 keyName-Regex-Escape** → Slice 257 (Hardening-Bundle)
- **D60 Hook ship-verify-completeness-gate.sh** → Slice 257 (Hardening-Bundle)
- **MEDIUM-Severity-Drift Display** → post-Beta (D52 Iteration nach 5+ Wochen False-Positive-freie Operation)
- **Banner auf /clubs, /rankings, /manager** → optional post-Beta (Beta-Fokus ist /fantasy + /market wo Cron-Drift sichtbar wird)
- **Cron-Pipeline-Reanimation-Self-Heal** → CTO-Backlog (Detection ist da, Auto-Heal ist eigene Investigation)

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — kein DB/RPC/Service-Layer-Cross-Cutting; nur 2 Components mounten neu) →
BUILD → REVIEW (self-review D35 — Pattern-Wiederholung MissionBanner Slice 161) →
PROVE → LOG
```

**IMPACT-Skip-Begründung:** Service liest existing Tables (leagues + fixtures) read-only. Hook ist neuer qk-Eintrag (additiv). Banner ist neue Component. 2 Mount-Edits sind isoliert. Kein RLS, kein Schema-Change, kein Money-Path.

**Self-Review-Begründung:** Pattern-Wiederholung MissionBanner.tsx (Slice 161 Loading/Error/Empty + lucide-Icons + Tailwind-Card-Style). Cold-Context-Reviewer-Agent würde nur "Pattern korrekt angewandt" sagen.

## 13. Pre-Mortem (optional bei S-Slice)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Banner zeigt False-Positive (drift detected obwohl Cron läuft, z.B. Mid-GW Saturday-finished) | LOW | mittel (User-Verwirrung) | Severity-Gate `allFinished + notAdvanced + drift>=2` (Slice 255 Heal) | Live-Smoke-Run gegen prod-DB nach Beta-Start |
| 2 | sessionStorage-Quota-Exceeded (sehr unwahrscheinlich aber möglich) | VERY-LOW | niedrig | try-catch, Banner zeigt sich dann immer | Sentry-Tracking auf SecurityError im setItem |
| 3 | i18n-Key-Leak (Slice 198 Pattern) wenn TR-Key fehlt | LOW | niedrig | audit:i18n DE/TR-Parity-Check pre-commit | Hook im pre-commit catched |
| 4 | Hook feuert auf jedem Mount → unnötige Network-Calls | LOW | niedrig | staleTime: 5min limitiert auf 1 Call alle 5min | Network-Tab-Audit im Live-Verify |
| 5 | Banner-Race: Mount → Healthy-data → Dismiss-Click → Re-Mount → Banner kurz visible | LOW | niedrig | Render-NULL via dismissed-state-priority vor data-check | Local-Test in DevTools |

---

## Compliance-Check

- $SCOUT-Wording-Drift? **Nein** — Banner-Wording ist tech-status, kein Money-Vokabular.
- IPO-Begriff user-facing? **Nein**.
- TR-Glücksspiel-Vokabel? **Wird in TR-Wording-Vorab geprüft**.
- Asset-Klasse-Framing? **Nein**.
- Disclaimer? **Nein** — kein $SCOUT/DPC im Banner.

## TR-Wording-Vorab

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `system.stalePipeline.title` | "Daten möglicherweise veraltet" | "Veriler güncel olmayabilir" | ✓ neutral, kein kazan*/yatırım |
| `system.stalePipeline.message` | "Wir aktualisieren gerade die Spielwoche-Daten — kann ein paar Minuten dauern." | "Maç haftası verileri güncelleniyor — birkaç dakika sürebilir." | ✓ neutral |
| `system.stalePipeline.dismiss` | "Schließen" | "Kapat" | ✓ neutral, existing in messages |

**Anil-Pflicht-Review:** TR-Strings sind direkte Übersetzungen ohne Eigeninterpretation. Bei Beta-Verify-Pass ein Native-Speaker-Review beauftragen (Anil-Action-Item).

## Open Risiko

False-Positive-Risk in der Drift-Detection — wenn Saturday alle Fixtures "finished" sind aber Sonntag noch kommt (Slice 255 Pre-Heal-Bug). Mitigation: Slice-255-Heal-Logic ist live-verified, gleicher Code-Pfad. Wenn doch False-Positive auftritt, kann Banner via sessionStorage-Dismiss schnell weggeklickt werden — kein User-Block.
