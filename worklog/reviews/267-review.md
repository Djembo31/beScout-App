# Code-Review — Slice 267 Realtime-Live-Score

**Reviewer:** reviewer-Agent (Cold-Context, Read-Only)
**Date:** 2026-05-03
**Verdict:** **CONCERNS** — Code BUILD-konform, commit + merge OK. **Anil-Action-Items für DoD-Closure: Migration apply + Wave 3 Tests + Pre-Migration-Verify + curl-Proof.**
**Code-Diff:** `b0f2ba90..HEAD` (Foundation → Wave 1 Backend → Wave 2 Frontend → Hook-Refactor + SpieltagTab Wire-Up)

## Summary

Die Implementierung der drei Layer (Migration + Cron + Realtime-Subscription/UI) folgt der Spec v3 sauber, alle 10 F-Patches der Pre-Review sind im Code reflektiert, und der Hook-Refactor von TanStack-Query zu Subscription-only ist die richtige Architektur-Entscheidung gewesen (löst den State-Mismatch mit SpieltagTab). Code-Quality ist hoch — defensive null-strict-equality (Slice 265-Lehre), stable Callback-Refs, idempotente Migration, F-05 Idempotency-Lock sauber integriert.

**Drei Lücken bleiben:** (1) Wave 3 Tests fehlen komplett (Spec §3 Files-Tabelle Z.157-158 zugesagt). (2) Migration noch nicht applied (Anil-Pflicht). (3) Pre-Migration AC-16 Verify fehlt im Proof-Folder. Plus 2 MINOR-Findings.

## Spec-Conformance per AC (18 ACs)

| AC | Code-Status | Pending |
|----|---|---|
| AC-01-03 (DB-Schema) | ⏳ Migration-File OK | apply via mcp__supabase |
| AC-04-05 (Cron + Realtime) | ⏳ Code-OK | runtime-Test post-Deploy |
| AC-06-08 (UI Live-Render) | ✅ | — |
| AC-09 (defensive null) | ✅ `typeof minute === 'number'` | — |
| AC-10 (Polling-Fallback) | ✅ | — |
| AC-11-12 (i18n DE/TR) | ✅ | — |
| AC-13 (Mobile 393px) | ⏳ Code-OK | Playwright-Proof |
| AC-14 (Memory-Leak-frei) | ✅ removeChannel-Cleanup | — |
| AC-15 (Regression) | ✅ | — |
| AC-16 (league_id NULL Pre-Verify) | ⚠️ **F-NEW-01 OPEN** | SQL-query + Proof-File |
| AC-17 (Idempotency-Lock) | ✅ `.neq('status', 'finished')` | — |
| AC-18 (Cron <30s p95) | ⏳ pending runtime | — |

**Total:** 11 ✅ · 6 ⏳ Pending Migration/Runtime/Proof · 1 ⚠️ Open AC-16

## F-Patches Verifikation (Pre-Review v3 → Code)

| F | v3-Patch | Code | Status |
|---|---|---|---|
| F-01 | spieltag.liveLabel neu | DE/TR Z.3869, separater Namespace | ✅ |
| F-02 | jq/python i18n-Audit | 6/6 keys grep-bestätigt | ✅ |
| F-03 | AC-16 Pre-Migration-Verify | **kein Proof-File** | ⚠️ **F-NEW-01** |
| F-04 | D54 DoD je Layer | Migration pending, Tests fehlen | ⚠️ **F-NEW-02 + F-NEW-04** |
| F-05 | Idempotency-Lock | `route.ts:252` `.neq('status', 'finished')` | ✅ |
| F-06 | 3-State-Branch FixtureDetailModal | `:520-571` isLive>isSimulated>scheduled | ✅ |
| F-07 | Canonical = features-Pfad | `subscribeFixtureUpdates` in features-service | ✅ |
| F-08 | channel.subscribe-callback Polling | `useLiveFixtures:60-67` | ✅ |
| F-09 | AC-18 maxDuration | default 300s erbt | ✅ |
| F-10 | Pre-Mortem #1 D36 | N/A für Code | ✅ |

**Total:** 8 ✅ · 2 ⚠️ Pending

## Architektur-Bewertung

### useLiveFixtures-Refactor (Post-Merge von Primary-Claude) — PASS

Wave 2's TanStack-Query-Hook hätte State-Mismatch mit SpieltagTab's `useState<Fixture[]>` produziert. Der Subscription-only-callback-Pattern-Refactor ist die richtige Entscheidung:

- ✅ Stable Callback-Refs (`useLiveFixtures:46-51`) verhindert re-subscribe-Storms
- ✅ removeChannel-Cleanup erfüllt AC-14
- ✅ useEffect-deps `[leagueId]` only — Callbacks via ref
- ✅ isPolling-State tracked, Konsument entscheidet wie pollen

### SpieltagTab-Wire-Up — PASS mit MINOR (F-NEW-03)

- ✅ `setFixtures`-Bridge (`SpieltagTab:79-85`) patcht in-place via findIndex+spread
- ✅ 'finished'-Trigger löst loadFixtures für Bucket-Resort
- ✅ Polling-Fallback `setInterval` mit deps-array korrekt
- ⚠️ MINOR: loadFixtures sync-call ohne await im finished-branch (Race-Risiko bei 2 parallelen finished-Events) — praktisch unmöglich bei 1-Cron-pro-Min

### D54 Build-without-Wire — Layer-by-Layer

| Layer | Status |
|-------|--------|
| Migration | ⚠️ File geschrieben, nicht applied |
| Service (subscribeFixtureUpdates) | ✅ konsumiert in useLiveFixtures |
| Cron (vercel.json) | ⚠️ registered, pending curl-Proof |
| UI (3 Components) | ✅ alle in SpieltagTab Render-Tree |
| Hook (useLiveFixtures) | ✅ konsumiert in SpieltagTab |
| i18n (DE+TR) | ✅ |
| Type (DbFixture-Erweiterung) | ✅ tsc-clean |
| Tests | ⚠️ **NICHT geschrieben** (F-NEW-04) |

**Verdict:** Slice ist **noch nicht D54-konform** weil Migration apply + Tests offen sind.

## Findings (post-BUILD)

### F-NEW-01 [P1] AC-16 Pre-Migration-Verify nicht dokumentiert
- **Location:** kein `worklog/proofs/267-pre-migration-verify.txt`
- **Issue:** Spec AC-16 + IMPACT §12 verlangen `SELECT COUNT(*) FROM fixtures WHERE league_id IS NULL` muss `0` sein vor Apply. Bei `>0`: Realtime-Filter `league_id=eq.X` schließt rows silent aus → AC-15 Regression.
- **Fix:** Vor `mcp__supabase__apply_migration`: SQL ausführen + Output als Proof speichern.

### F-NEW-02 [P1] Migration noch nicht applied
- **Location:** `supabase/migrations/20260503120000_slice_267_fixtures_realtime.sql`
- **Issue:** AC-01-03/05/09 alle pending. Ohne Apply: REPLICA IDENTITY noch 'd', publication ohne fixtures, Cron-UPDATE schlägt fehl.
- **Fix:** Anil/Primary-Claude post-Merge via `mcp__supabase__apply_migration`.

### F-NEW-04 [P1] Wave 3 Tests fehlen komplett
- **Location:** kein `FixtureCard.test.tsx`, kein `subscribeFixtureUpdates`-Test
- **Issue:** Spec §3 + §13b DoD verlangen vitest-Cases für Live-Render + service-mock.
- **Fix:** Test-Writer-Agent dispatchen oder Tests in Slice 267-tests Follow-up.

### F-NEW-05 [P2] FixtureDetailModal.test deckt Live-Branch nicht ab
- **Location:** `src/components/fantasy/spieltag/__tests__/FixtureDetailModal.test.tsx`
- **Issue:** Existing Test hat 'finished' + 'scheduled' Cases, aber **keinen** für status='live'.
- **Fix:** Test-Case ergänzen — `makeFixture({ status: 'live', minute: 67 })`.

### F-NEW-06 [P2] cron_sync_log `gameweek: 0`-Sentinel
- **Location:** `route.ts:85`
- **Issue:** `cron_sync_log.gameweek` NOT NULL, `0` als „global" Sentinel akzeptabel + dokumentiert (mirror gameweek-sync), aber Sentry-Dashboard liest "Spiele Spieltag 0".
- **Fix:** Akzeptiert + active.md-Notes-Patch. Future-Slice: cron_sync_log.gameweek nullable.

### F-NEW-07 [P2] FixtureDetailModal Doppel-Pulse-Animation
- **Location:** `FixtureDetailModal.tsx:526 + 539`
- **Issue:** Score-Container UND LIVE-Badge haben beide `motion-safe:animate-pulse` — visuelle Doppelung.
- **Fix-Vorschlag:** Pulse nur auf LIVE-Badge belassen. Stil-Frage, nicht blockend.

### F-NEW-09 [MINOR] qk.fixtures.live ohne Konsument (orphan)
- **Location:** `keys.ts:250`
- **Issue:** Key definiert (Spec-konform) aber niemand nutzt ihn nach Hook-Refactor (callback-only).
- **Fix:** JSDoc-Kommentar korrigieren auf „reserved — not yet consumed (Hook is callback-only, may consume in 267b)".

### F-NEW-03 / F-NEW-08 / F-NEW-10 [MINOR] — Stil/Konsistenz, nicht blockend

## Spec-Self-Audit (Slice 234 Lesson)

| Item | Status |
|---|---|
| Spec §3 Files-Tabelle vs Code | ⚠️ DRIFT: Polling-Logic lebt in SpieltagTab, nicht im Hook (Spec sagte „Polling-Fallback wenn Realtime fail" im Hook) |
| AC-Numbering vs Code | ✅ alle 18 ACs reflektiert |
| Spec §13b DoD checklist | ⚠️ DRIFT: Tests fehlen → DoD nicht erfüllt |
| Pattern-References | ✅ Slice-265 typeof-Pattern korrekt |
| Pre-Mortem-Mitigations | ✅ #2/#3/#6/#7 alle adressiert |

## Compliance-Check

- ✅ KEIN $SCOUT/Money-Wording
- ✅ KEIN IPO-Begriff
- ✅ „LIVE"/„CANLI" neutral, kein gewinn/kazan-Drift
- ✅ KEIN Asset-Klasse-Framing
- ✅ business.md-konform durch und durch

## Positive Highlights

1. Defensive null-strict-equality (Slice 265-Lehre internalisiert)
2. F-05 Idempotency-Lock sauber als `.neq('status', 'finished')`
3. Idempotente Migration mit `IF NOT EXISTS` + DO-Block
4. Stable Callback-Refs im Hook (kein re-subscribe-Storm)
5. Ausführliche JSDoc-Doku in `subscribeFixtureUpdates`
6. logSilentCatch im Cron (Slice-088-Pattern konsistent)
7. `Array.from(new Set(...))` statt Spread (strict-TS)
8. Q2-C-Adaptive Pre-Check spart API-Quota
9. Helper getStatusAccent('live')-Variant mit motion-reduce-Hinweis
10. Type-Erweiterung backward-compat (alle 19 Konsumenten tolerant)

## Open / Pending (Anil-Pflicht-Action-Items für DoD-Closure)

1. **Pre-Migration-Verify (F-NEW-01):** SQL → `worklog/proofs/267-pre-migration-verify.txt`
2. **Migration apply (F-NEW-02):** `mcp__supabase__apply_migration` + Verify → `267-db-schema.txt`
3. **Wave 3 Tests (F-NEW-04):** FixtureCard.test + subscribeFixtureUpdates-Test
4. **Cron-curl-Proof:** post-Deploy curl → `267-cron-execution.txt`
5. **Realtime-WS-Frame-Screenshot:** Chrome DevTools → `267-realtime-ws-frame.png`
6. **UI-Playwright-Screenshot 393px:** `267-spieltag-live-mobile.png`
7. **Modal-Screenshot:** `267-modal-live.png`
8. **F-NEW-09 Cleanup:** JSDoc-Kommentar in `keys.ts:250` korrigieren

## Recommended Action

**CONCERNS → Commit + Merge OK mit explicit Notes-Patch in `worklog/active.md`.**

Code-Quality hoch. Slice ist „BUILD-fertig" aber **nicht D54-fertig** ohne 2 P1-Items (Migration + Tests). Empfehlung:

- **Jetzt commit + merge:** Backend + Frontend Code Production-bereit.
- **Notes-Patch in active.md:** „D54-Open: Migration pending apply (Anil), Wave 3 Tests deferred → vor LOG-Stage nachholen."
- **Vor LOG-Stage:** Migration applied + AC-16 Pre-Verify + Cron-curl-Proof + Wave 3 Tests müssen alle grün sein.

**FAIL** wäre Slice nicht — Architektur ist solide, Compliance-clean.
**REWORK** auch nicht — kein Code muss umgeschrieben werden.

## Time-Spent

~38 min (Spec v3 + IMPACT v2 + Pre-Review re-read · Migration + Cron + Service + Hook + 3 UI-Files + helpers + Type · 6 Knowledge-Base-Sektionen scan · i18n DE+TR verify · 2 Test-Files · vercel.json · footballApi-Type · grep-Audit über 4 Files für F-NEW-09).

## Knowledge-Promotion-Kandidaten

1. **errors-frontend.md (potentiell):** „Hook-Refactor von TanStack-Query auf Subscription-only-callback bei State-Mismatch mit Konsument-useState" — Slice 267 Pattern.
2. **common-errors.md (potentiell):** „qk.{namespace}.{key}-Definition ohne Konsument" — Pre-Commit-Hook-Idee: grep nach Key-Konsument vor Commit.
3. **Pre-Review-Process-Win:** Pre-Review v2→v3 hat alle 10 Findings vor BUILD adressiert. Post-BUILD-Findings sind alle „neu entstanden" (Tests, Migration, Proofs) — D62 Pre-Review-Pattern wirkt nachweislich.
