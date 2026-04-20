# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087-096 (2026-04-22)

### 096 — Sentry.setUser GDPR-conservative (CEO-delegated)
- Sentry.setUser({id}) auf auth events, clear on logout
- beforeSend-Scrubber in allen 3 Sentry-configs (client/server/edge)
- Plain UUID only, NIE email/handle
- Proof: worklog/proofs/096-after.txt

### 095 — INV-32 trades Tighten — DEFERRED
- Rollout braucht 2-Phasen-Deploy mit Verify-Gap
- Consumer-Analyse + Proposed RPCs dokumentiert
- Nächste Session mit User execution

### 094 — INV-10 Fix: ipo_price Nachkalibrierung (CEO-approved)
### 093 — CI-Gate silent-fail-audit Baseline
### 092 — Silent-Catch Observability
### 091 — DB-Invariants INV-36/37/38 fix
### 090 — silent-fail-audit Precision v2
### 089 — allSettled Sweep
### 088 — Sentry Observability Util
### 087 — Upstream Silent-Fail Follow-Ups

## Open for Next Session

- **Slice 095 INV-32 trades tighten** (CEO-approved "a nur trades", needs 2-phase deploy with user-verify)
- **TURK-03 / useMarketData.floorMap flaky** — separate QA
- Slice B (post-094): Admin-UI-Warnung bei ipo-mv-drift
