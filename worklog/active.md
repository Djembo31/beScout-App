# Active Slice

```
status: active
slice: 282b
stage: BUILD
spec: worklog/specs/282b-lhci-auth-fix.md
impact: skipped (kein src/ — Config + e2e-Script + GHA-Workflow)
proof: pending
review: pending
```

## Slice 282b — LHCI-Auth-Fix (M) — AKTIV

Lighthouse misst seit Slice 279 die /login-Page (alle 3 URLs auth-redirected). Fix: puppeteerScript-Login (jarvis-qa) + disableStorageReset + www-URLs + Artifact-Fix (include-hidden-files). Trigger: Anil 2026-06-12 „Weiter mit 282b".

## Slice 282 — Home von /api/players entkoppelt ✅ DONE (2026-06-11)

Headline: **Home-Transfer −4,2 MB (−65%)**. usePlayers() raus, 3 Mini-Quellen rein, 4 Children entkoppelt, totes IPO-Spotlight reaktiviert (D63-Intent). Review fing 2 MAJOR vor Live-Gang.

## Zuletzt

- **Slice 282** (2026-06-11) — Home-Payload-Decouple −4,2 MB (M, Review REWORK→geheilt).
- **Slice 282a** (2026-06-11) — Ops-Recovery (M, Self-Review PASS).
- **Slice 281** (2026-05-06) — Synthetic-Daily-GHA (XS).

Nächstes (Kandidaten):
- **Slice 282b** — LHCI-Auth-Fix (misst aktuell /login statt App-Pages!) + GHA-Artifact-Fix. Voraussetzung für echte Phase-3-Lighthouse-Gates.
- **Slice 283** — Cold-Start Phase 4 (Vercel Edge-Caching) per D70-Plan.
- Market-Entkopplung von /api/players (L-Slice, Server-Pagination) — größter verbleibender Payload-Hebel.
