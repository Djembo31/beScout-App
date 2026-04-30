# Slice 259 — Service Worker Cache-Pollution Heal (EMERGENCY P0)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Tool (Service Worker) · **Scope:** CTO (Bug-Fix, Security-adjacent) · **Datum:** 2026-04-30

---

## 1. Problem Statement

Anil (User-Report 2026-04-30 Beta-Day-2): "Initial Load funktioniert schrott — jedes Mal Refresh nötig damit App lädt. Nach Refresh OK." 3rd Tester kommt gleich → muss vor Signup live sein.

**Root-Cause-Deep-Dive identifiziert 7 Smoking-Guns**, der **mit Abstand größte Hebel** ist:

`public/sw.js:36-56` macht stale-while-revalidate-Caching für `*.supabase.co/rest/v1/*` GET-Requests mit **URL als alleinigem Cache-Key**. Authorization-Header (JWT) ist NICHT Teil des Keys. Konsequenzen:

1. Anon-Response wird nach Login weiter-serviert → User sieht leere Daten beim ersten Laden
2. Cross-User-Pollution möglich (User A's `/rest/v1/wallets?user_id=eq.X` cached → bei User B serviert wenn URL matches)
3. **Genau das „Refresh fixt"-Symptom**: 1. Load serviert stale cached, background-fetch füllt Cache, 2. Load = fresh

**Gleichzeitig:** latenter Privacy/Security-Bug. RLS schützt zwar serverseitig, aber Client-Cache leakt Daten zwischen Auth-States.

**Wer betroffen, wie oft?** ALLE User auf erstem Visit nach Login + alle Returning-User mit altem SW-Cache. = 100% der Beta-Tester. Aktuell: Anil + Pesmerga + 3rd Tester (gleich).

## 2. Lösungs-Design (Architektur)

**Vor:** SW serviert REST-API-Responses aus Cache (URL-Key) → cross-auth-pollution + stale-on-first-load.

**Nach:** SW serviert REST-API-Responses NICHT mehr aus Cache. TanStack Query (Client-Memory-Cache mit JWT-Awareness via Supabase-Client) übernimmt komplett. SW behält nur:
- Static-Asset-Cache (`_next/static/*`, Icons, Logo)
- Offline-Fallback-Page
- Push-Notifications

**Cache-Bump:** `bescout-v3 → bescout-v4`, `bescout-api-v1` komplett removed. Activate-Handler löscht ALLE alten Caches inkl. `bescout-api-v1`.

**Migration:** Existing User mit alter SW-Version: `skipWaiting()` + `clients.claim()` bewirken automatischen Takeover beim nächsten Visit. Push-Subscriptions überleben (in Browser-Push-Manager, nicht in Cache-Storage).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `public/sw.js` | EDIT | Remove Supabase-REST-Cache-Block, bump CACHE_NAME, cleanup activate-handler |

**Konsumenten:** Nur RootLayout `Script id="sw-register"` registriert SW. Kein TS-Import-Pfad — public/-File. Keine Test-File. Keine Caller in src/.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `public/sw.js` (current) | Baseline-Verstand | Welche Cache-Strategien sind aktiv? Push-Handler intakt halten. |
| `src/app/layout.tsx:65-69` | SW-Register-Logik | `serviceWorker.register('/sw.js')` — Standard-Register, kein Update-Mechanismus zusätzlich. |
| `.claude/rules/errors-frontend.md` Section "Tailwind data-* Variants" | Sanity-Check | Nicht direkt relevant aber: keine Tailwind-Drift in SW (nur Browser-API). |
| `.claude/rules/errors-infra.md` "Two-lockfile drift" | Bypass-Awareness | Nicht relevant — public/sw.js geht nicht durch lockfile. |

## 5. Pattern-References

- **errors-db.md "PostgREST nested-select Auth-Race"** — Slice 192/193 dokumentiert dass JWT-Awareness clientseitig kritisch ist. SW-Cache verletzt das fundamental.
- **decisions.md D40-D43** (Slice 192/193 Defense-in-Depth) — Auth-State und Data-Cache MÜSSEN consistent sein. SW-Cache war ein blind-spot dort.
- **performance.md "Query Performance"** — `getWallet()` NICHT cachen (RLS-Race-Condition). SW machte das aber unbewusst für ALLE PostgREST-Queries.

## 6. Acceptance Criteria

```
AC-01: [SECURITY] SW cached keine Supabase-REST-Responses mehr
  VERIFY: grep -c "supabase.co" public/sw.js
  EXPECTED: 0
  FAIL IF: > 0 (Cache-Logic für Supabase irgendwo zurückgeblieben)

AC-02: [REGRESSION] Static-Asset-Caching funktioniert weiter
  VERIFY: grep -c "STATIC_CACHE_PATTERNS" public/sw.js
  EXPECTED: ≥ 2 (definition + usage)
  FAIL IF: 0 (versehentlich entfernt)

AC-03: [REGRESSION] Push-Notification-Handler intakt
  VERIFY: grep -c "addEventListener('push'" public/sw.js
  EXPECTED: 1
  FAIL IF: 0

AC-04: [REGRESSION] Offline-Fallback-Page weiter aktiv
  VERIFY: grep -c "/offline.html" public/sw.js
  EXPECTED: ≥ 2 (APP_SHELL + navigation-handler)
  FAIL IF: < 2

AC-05: [DEPLOY] Cache-Name gebumpt für Force-Update bei existing Users
  VERIFY: grep "CACHE_NAME" public/sw.js
  EXPECTED: 'bescout-v4'
  FAIL IF: 'bescout-v3' (alter Name) oder anderer

AC-06: [CLEANUP] Alter API-Cache 'bescout-api-v1' wird im activate-handler gelöscht
  VERIFY: Activate-Handler löscht ALLE Caches die nicht aktuelles CACHE_NAME sind
  EXPECTED: caches.keys().then(...filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  FAIL IF: API_CACHE_NAME-Whitelist im Filter zurückgeblieben

AC-07: [LIVE-VERIFY] Post-Deploy auf bescout.net: keine Supabase-REST-Calls mit "(ServiceWorker)" als Source in Network-Tab
  VERIFY: Chrome DevTools → Network → reload → Filter "supabase.co/rest/v1" → Source-Spalte
  EXPECTED: Alle Requests "fetch" (kein "(ServiceWorker)")
  FAIL IF: Mindestens 1 Request mit "(ServiceWorker)" — Cache greift noch
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | First-Visit | User mit altem SW v3 + bescout-api-v1 cache | localStorage cached old data | Activate-Handler löscht beim Update | Cache-Bump + Catch-All-Filter |
| 2 | Returning-User | SW v4 schon installiert | Cache leer für Supabase | Direct-Fetch, TanStack Query handhabt | Standard-Path |
| 3 | Push-Subscription | User hat aktive Push-Sub | Subscription überlebt | Push-Manager-State unabhängig vom Cache | Kein Mitigation nötig |
| 4 | Offline-First-Load | User offline beim ersten Visit | offline.html serviert | navigation-handler-fallback intakt | Behalten |
| 5 | _next/static-Chunks | Beim Update fehlen Chunks evtl. | Old chunks nicht mehr gecached | Browser fetcht von CDN, Vercel-Cache hält | Standard PWA-Update-Flow |
| 6 | Race: User mid-load wenn SW-Update | Tab offen während Deploy | skipWaiting + clients.claim takeover | Standard PWA-Pattern, kein Custom-Code nötig | Existing |
| 7 | Privacy-Reaudit | User A logged-in, User B logs in same browser | Auth-State-Switch | Kein Cross-User-Leak weil kein Cache | FIX-Effekt |

## 8. Self-Verification Commands

```bash
# Local checks
grep -c "supabase.co" public/sw.js  # Expected: 0 (AC-01)
grep -c "rest/v1" public/sw.js  # Expected: 0
grep "CACHE_NAME = " public/sw.js  # Expected: 'bescout-v4'
grep -c "API_CACHE_NAME" public/sw.js  # Expected: 0

# Integrity
grep -c "addEventListener('push'" public/sw.js  # Expected: 1
grep -c "addEventListener('notificationclick'" public/sw.js  # Expected: 1
grep -c "STATIC_CACHE_PATTERNS" public/sw.js  # Expected: ≥ 2
grep -c "/offline.html" public/sw.js  # Expected: ≥ 2

# Build
pnpm exec tsc --noEmit  # Should be no-op for public/, but verify global tsc clean

# Post-Deploy (manuelle Verifikation gegen bescout.net)
# 1. Chrome incognito → bescout.net → DevTools Application → Service Workers
#    → "bescout-v4" should be active
# 2. Application → Cache Storage → only "bescout-v4" present (no "bescout-api-v1")
# 3. Network tab → reload → Filter "supabase.co" → no "(ServiceWorker)" Source
```

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung:** keine — SW-Pollution ist eindeutig Bug. Anil hat volle Autorität gegeben.

**Autonom-Zone (Claude entscheidet):**
- Genaue Position des `caches.delete()`-Patterns
- Comment-Style im SW
- Cache-Name-Versioning-Schema (`v3` → `v4`)

**Nicht-Autonom (Anil-Pflicht — keiner triggert hier):**
- Money-Path: nicht betroffen
- RLS-Policy: nicht betroffen
- business.md-Wording: nicht betroffen

## 10. Proof-Plan

| Schritt | Artefakt |
|---------|----------|
| Pre-Edit | `worklog/proofs/259-sw-pre-edit.txt` (cat public/sw.js mit grep-Counts) |
| Post-Edit AC-Audit | `worklog/proofs/259-ac-audit.txt` (alle 6 Audit-Greps mit Result) |
| Local Build | `worklog/proofs/259-build.txt` (`pnpm exec tsc --noEmit` clean) |
| Post-Deploy | Manueller Live-Verify gegen bescout.net → Notiz in `worklog/proofs/259-live-verify.md` |

## 11. Scope-Out

Explizit NICHT in Slice 259:

- **AuthProvider sessionStorage → localStorage** → Slice 260 (P1, ~2h, separater Risk-Track)
- **TanStack Query persist-client** → Slice 261 oder Post-Beta (P2, RootLayout-Touch zu riskant Beta-Day-2)
- **Server-Component Auth-Hydrate (`get_auth_state` im RSC)** → Slice 261 oder Post-Beta
- **Middleware-Optimierung (public-route-bail-out)** → Post-Beta-Backlog
- **Welcome-Bonus + ActivityLog in `requestIdleCallback`** → Slice 260 mitnehmen
- **`registration.update()` explicit** → nicht nötig, `skipWaiting + clients.claim` reicht für Force-Takeover

## 12. Stage-Chain (geplant)

```
SPEC (this file)
  → IMPACT skipped (Begründung: 1 File public/, kein src/lib/services/, kein RPC, kein Schema-Change)
  → BUILD (sw.js edit + AC-Audit-Run)
  → REVIEW (reviewer-Agent — auch wenn S-Slice mit klarem Pattern, weil Security-adjacent)
  → PROVE (AC-Audit + Build + Post-Deploy Live-Verify)
  → LOG (commit + push + log.md + active.md → idle)
```

## 13. Pre-Mortem (5 Szenarien — S-Slice optional aber EMERGENCY-Slice mit Live-Tester-Risk → ich mach's)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Static-Cache-Pattern versehentlich mit-entfernt → JS-Chunks brechen | LOW | HIGH (App lädt nicht) | Sehr genau diff-en, AC-02 prüft | Live-Verify Schritt 2 |
| 2 | `clients.claim()` triggert weißen Flash bei Tab-mid-load | LOW | MED (UX-Hick, kein Datenverlust) | Standard-PWA-Pattern, keine Sonderbehandlung | User-Report |
| 3 | Push-Notif-Handler accidentally removed | LOW | MED (Push funktioniert nicht) | AC-03 prüft, Code-Block bewusst nicht angefasst | Push-Test post-Deploy |
| 4 | Old SW pollutiert weiter weil neue SW nicht aktiviert wird | LOW | HIGH (Bug nicht gefixt) | `skipWaiting()` + `clients.claim()` + Cache-Bump | Live-Verify Schritt 1: SW-Version |
| 5 | Vercel-Deploy schlägt fehl (Build-Error) | VERY-LOW | HIGH (Bug nicht live) | tsc local clean, public/sw.js geht nicht durch tsc | Vercel-Dashboard |

---

## Compliance-Check

- $SCOUT-Wording: nicht betroffen
- IPO-Begriff: nicht betroffen
- TR-Glücksspiel-Vokabel: nicht betroffen
- Asset-Klasse-Framing: nicht betroffen
- Disclaimer: nicht betroffen
- Money-Path: nicht betroffen

→ Compliance-Check skipped (Slice ist reine Infrastruktur).

## TR-Wording-Vorab

Nicht relevant — kein User-facing-Text.

## Open Risiko

**Risiko:** Service Worker Update-Race bei Tab-offen-mid-Deploy könnte zu kurzem White-Flash führen. **Mitigation:** Standard-PWA-Pattern via `skipWaiting + clients.claim` (existing). **Mitigation 2:** Anil + Pesmerga sind aktuell offline (laut Tester-State); Worst-Case nur 3rd Tester der eh frisch lädt.

**Confidence:** HIGH. Bug ist eindeutig identifiziert, Fix ist additiv-subtraktiv (kein neuer Code, nur Removal), AC-Liste ist greppbar.
