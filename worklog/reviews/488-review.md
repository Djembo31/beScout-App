# Slice 488 Review — Sentry-Blindspots: withLogger 5xx-Capture + push-Cleanup

**Reviewer:** Cold-Context reviewer-agent · **Date:** 2026-07-01 · **time-spent:** 22 min

## Verdict: PASS (minor CONCERNS — shippable now, 1 tracked follow-up)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MED | `cron/*` + `admin/sync-contracts/route.ts:148-149` | **Benign / mis-modeled 5xx → Sentry-Noise.** Net captured jeden `status>=500`. (a) config-guards `'API_FOOTBALL_KEY not configured'` (Prod konfiguriert → 0 Noise; fehlt → 1 Event/Run = legitimes Signal); (b) `sync-contracts` 500 für `'No clubs…'`/`'No mapped players'` = Leerdaten-als-500 → echtes Noise bei leerem Run. | **Kein Merge-Blocker** (admin-manuell, low-freq). Follow-up: 64-5xx-Audit, Leerdaten-500 → 200+skip/4xx reklassifizieren. → TODO P2. |
| 2 | LOW | `apiLogger.ts:90,95` | Body-`error`-String → Sentry-Titel un-redacted; `redactPgDetail` greift nur auf `DomainError.cause`, nicht auf `new Error(bodyMsg)`. Aktuelle Routen nutzen `error.message` (kein PG-detail) → low Risk. | Forward-Regel: rohe PG-`detail` nie in Response-Body. (Keine Code-Änderung jetzt.) |
| 3 | LOW | `apiLogger.ts:95-99` | 5xx-`captureError` im outer try; würfe es (Sentry-SDK-Fehler, ~nie), fängt outer catch → 5xx-Response ginge verloren. | Optional defensiv eigenes try/catch. Nicht erforderlich (§1 Simplicity → skip). |
| 4 | Nitpick | `apiLogger.ts:95` | `new Error(bodyMsg)` → Stack zeigt auf apiLogger (Route hat Original-Error per `return` verworfen). Inhärent; richtiger Fix = Routen werfen (push tut das jetzt). | So lassen. |

## Kritisch geprüft (verifiziert, nicht behauptet)
- **Doppel-Capture UNMÖGLICH:** wirft Handler → `const response` (Z.62) nie zugewiesen → Z.79-Block unerreichbar → direkt `catch`. Returnt Handler → try läuft durch, catch nie. + `grep captureError src/app/api` = 0 nach push-Removal (push war verifiziert die einzige Stelle). `pushSender.ensureVapid` captured, aber degrade-to-skip (kein 500-Return) → keine Überschneidung.
- **`response.clone().json()` korrekt:** clone vor Caller-Read (withLogger = äußerster Wrapper), Original-Stream unberührt an Caller (Z.109). non-JSON/leer → `.json()` wirft → catch → `http_<status>`. clone() selbst im try.
- **push-Caller ungebrochen:** `firePush` (notifications.ts:197-211) client-Pfad = `fetch().catch(console.error)`, liest weder status/json/ok; `fetch` rejected nur bei Netzwerk-Fehler. 500-HTML vs 500-JSON egal. Server-Pfad ruft `sendPushToUser` direkt (umgeht /api/push). Sole-Caller via Slice 318. `request.json()`-Wurf erst NACH Auth-Check → nur authed Garbage könnte 1 Event erzeugen (vernachlässigbar).
- **§0 Schnitt-Regel erfüllt:** push-inline-captureError (S369-Einzelfix) = alter Weg, ersatzlos entfernt; withLogger = kanonischer SSOT, erweitert (kein 2. Mechanismus). push läuft jetzt über den **reicheren** Throw-Pfad (voller Original-Error+Stack) → Konsolidierung MIT Qualitätsgewinn.
- **Performance:** `await clone().json()` vollständig in `if (status>=500)`; Happy-Path = 1 Integer-Vergleich.
- **ctx-Shape korrekt:** `{route, requestId, extra:{status}}` matcht CaptureContext.
- **Tests decken ACs:** 5xx-mit-Body / http_-Fallback / 2xx+4xx-kein-Capture (Schleife) / Throw-unverändert.

## One-Line
Mechanisch korrekt, gut begründet; kritische Risiken real ausgeschlossen — ein Senior merged das. Einzige offene Sache: erwartbares 5xx-Noise (mis-modellierte Status-Codes), als P2-Follow-up getrackt.
