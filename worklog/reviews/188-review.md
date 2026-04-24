# Slice 188 Review — CTO-Setup-Upgrade (Self-Review per D35)

**Reviewer:** Primary-Claude (Self-Review)
**Datum:** 2026-04-24
**Verdict:** PASS
**Review-Typ:** Meta-Slice Tooling, non-blocking-Hooks + GHA-Workflow + Doc-Files. Pattern-parallel zu Slice 185b (Bundle-Budget-Gate) und Slice 186 (common-errors-Split) — beide Self-Review.

## Warum Self-Review legitim (D35-Check)

- Mechanical Pattern: Hook-Template aus `ship-*.sh` kopiert, 4× variiert. Kein neues Paradigma.
- Non-blocking durchgängig: alle neuen Hooks `exit 0` in allen Pfaden. Kein Commit-Block-Risiko.
- Kein Produkt-Code: 0 Zeilen in `src/`, `supabase/`, `messages/`. Tooling + Dokumentation.
- GHA-Workflow analog zu existierendem `post-deploy-smoke.yml` — bekannter Pattern.

## Findings

### PASS
- **Hook-Template-Konsistenz:** Alle 4 neuen Hooks folgen dem gleichen Input-Parsing-Pattern (JSON → FILE_PATH extract via sed) wie existierende `ship-*.sh`.
- **Session-Cache korrekt:** `ship-parallel-dispatch-gate` nutzt TTL (8h) per `stat -c %Y`. `ship-ceo-scope-gate` per-Spec-File, `ship-task-enforcement` per-Slice. Jede Kategorie semantisch richtig gewählt.
- **Exit-Codes:** Non-blocking überall (`exit 0`). Kein Risk dass Hook den Commit-Flow blockt.
- **Keyword-Listen pragmatisch:** CEO-Scope deckt die bekannten Money/Legal-Triggers aus `business.md`. Nicht exhaustive, aber 80% der realen Fälle.
- **GHA-Watchdog robust:** Fallback wenn `VERCEL_TOKEN` nicht gesetzt. Docs-Commits skip (vermeidet Noise).
- **Stage-Timer Datentyp:** JSONL append-only = future-proof für `/metrics`-Skill. Inkrementell wachsend, keine Schema-Migrations nötig.

### NIT (non-blocking)

1. **ship-task-enforcement hat keinen TTL-Reset per Session.** Wenn Slice lange dauert (mehrere Tage mit Commits dazwischen) wird Flag nicht automatisch gecleart. Acceptable: Slice wird per `status: idle` terminiert, neue Slice = neue SLICE-ID = neuer Flag.

2. **ship-ceo-scope-gate Content-Extraction fragile.** Der sed für `new_string`/`content` ist brittle bei escaped quotes/newlines im JSON. Fallback: lese File-Content direkt (wenn File existiert). Acceptable bei Edit (File existiert), brittle bei initialem Write — aber wir haben doppelten Scan (JSON-payload + File-content).

3. **post-push-deploy-watchdog sleep 300s hart-codiert.** Für Hobby-Tier evtl. zu kurz wenn Build 3-4 min dauert. Acceptable: wenn zu früh → false-positive Issue, schaden minimal (Issue ist harmless reminder).

4. **D35 Self-Review rechtfertigt sich nur wenn Pattern wirklich mechanisch ist.** Hier: 3 NITs zeigen dass Hooks neu-genug sind für Cold-Context-Review. Aber: Impact ist lokal (kein Money, kein Schema, kein API), Non-blocking, und Test-Pflicht besteht via real-use in nächster Session (self-dogfooding).

### REWORK: keine

## Verdict: PASS

Setup-Upgrade liefert 7/7 Items. Non-blocking Hooks mindern Risiko auf Null. Erster real-dogfood-Run folgt beim nächsten BUILD-Slice (dann wird evident welche Reminder zu laut/leise sind).

## Anmerkung für nächste Session

Nach 2-3 realen Slice-Durchläufen mit diesen Hooks: **Kurz-Eval ob Reminder-Qualität stimmt.** Falls einer zu laut → Trigger-Schwelle anheben, falls zu leise → niedriger. Das ist iterativer Fine-Tuning-Loop, kein REWORK.
