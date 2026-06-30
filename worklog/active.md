# Active Slice

```
status: idle
slice: 489
title: 5xx-Status-Code-Audit — sync-contracts Leerdaten-als-500 → 200+skip (488 Reviewer #1) — DONE
size: XS
type: Tool
welle: Mock→Pro W6 / Observability (488-Folge)
proof: worklog/proofs/489-5xx-statuscode.txt
review: self-review (XS, Status-Code-Semantik, kein Money/Security/Logik-Change)
stage: LOG (done)
```

## Slice 489 — Problem (488 Reviewer-Finding #1, audit-verifiziert)
- Seit 488 captured `withLogger` jeden `status>=500`. **Systematischer Audit aller 64 `status:500`-Returns über 24 Routen:** die EINZIGE mis-modellierte Leerdaten-als-500-Stelle ist `admin/sync-contracts/route.ts:148-149` (`!clubs?.length` → „No clubs with api_football external ID"; `!extIds.length` → „No mapped players"). Leerdaten = nichts zu syncen = **kein Server-Fehler** → würde bei jedem leeren Run ein Sentry-Event erzeugen.
- Alle anderen 500er sind korrekt: Config-Guards (`*_KEY not configured` — feuert nur bei Fehl-Deploy, echtes Ops-Signal) + echte Supabase-Errors (`if (error)` — SOLLEN captured werden). `gameweek-sync:268` (`!activeLeagues` → 500) = Grenzfall „System ohne Ligen = kaputt" → bewusst lassen.

## Lösung (chirurgisch, 1 File, 2 Zeilen)
- `sync-contracts:148-149`: 500 → **200** mit Erfolgs-Shape (zeros) + `skipped:true` + reason. Semantisch korrekt: Sync lief, fand nichts, erfolgreich mit 0 Updates. Stoppt Noise + behebt Status-Code-Lüge.

## Acceptance Criteria
- AC1: `!clubs?.length` / `!extIds.length` → HTTP 200 (nicht 500), Shape `{message, skipped:true, apiCalls:0, totalMapped:0, contractsFound:0, updated:0, errors:[], preview:[]}`.
- AC2: Admin-UI-Consumer bricht nicht (kein hartes `status===500`-Handling, das Skip als Erfolg-mit-0 verträgt).
- AC3: tsc 0. grep: 0 verbleibende Leerdaten-als-500 in src/app/api.

## Scope-Out
- Config-Guard-500 (legitimes Signal). · Echte Supabase-Error-500 (korrekt). · web-vitals (separat).

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(self, XS) → PROVE(tsc+grep+consumer-check) → LOG
