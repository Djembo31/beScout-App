# Slice 342 — Poll-Follower-Notify: Concurrency-Storm → gebündelte Batches

**Slice-Type:** Service
**Größe:** S
**CEO-Scope:** Nein — interne Skalen-/Robustheits-Härtung, kein Money/Wording/Schema. CTO-autonom.

---

## 1. Problem-Statement (Evidence)

Slice 339 entfernte den Follower-1000-Cap (`fetchAllFollowerIds` Range-Loop). Folge (339-Review-NIT#1): die Notify-IIFE in `createCommunityPoll` feuert jetzt `Promise.all(followerIds.map(uid => createNotification(...)))` über **alle** Follower gleichzeitig — jeder Call = 1 Preference-SELECT + 1 INSERT + 1 Push. Bei einem Mega-Club (polls.md §1: Galatasaray ~35 Mio) = Concurrency-Storm → Connection-Exhaustion / Serverless-Timeout. Vorher implizit auf 1000 gedeckelt; jetzt unbegrenzt.

`createNotificationsBatch` (notifications.ts:348) existiert bereits + ist getestet: 1 Bulk-INSERT + Batch-Preference-Filter in EINER `.in()`-Query + Push-Loop. ABER: die interne `.in('user_id', userIds)`-Preference-Query bricht selbst am PostgREST-~100-UUID/14KB-Limit (common-errors §1), wenn man ihr >100 IDs auf einmal gibt → darf nicht ungechunkt mit allen Followern aufgerufen werden.

---

## 2. Lösungs-Design

Notify-Pfad in exportierten `notifyPollFollowers(...)` extrahieren (Testbarkeit) + auf `createNotificationsBatch` in **100er-Chunks** umstellen:

```ts
export async function notifyPollFollowers(source, clubId, userId, pollId, question): Promise<void> {
  const followerIds = await fetchAllFollowerIds(source, clubId, userId);  // 339 Range-Loop bleibt
  if (followerIds.length === 0) return;
  const { createNotificationsBatch } = await import('@/lib/services/notifications');
  const { notifText } = await import('@/lib/notifText');
  const title = notifText('pollNewTitle');
  const body = notifText('pollNewBody', { name: question.slice(0, 60) });
  const CHUNK = 100;  // hält createNotificationsBatch's .in()-Pref-Query unter dem PostgREST-Limit
  for (let i = 0; i < followerIds.length; i += CHUNK) {
    await createNotificationsBatch(followerIds.slice(i, i + CHUNK).map(uid => ({
      userId: uid, type: 'poll_new', title, body, referenceId: pollId, referenceType: 'poll',
    })));
  }
}
```

Die IIFE in `createCommunityPoll` ruft nur noch `await notifyPollFollowers(...)` im bestehenden best-effort try/catch.

**Effekt:** N gleichzeitige Round-Trips → `ceil(N/100)` sequenzielle, gebündelte Batches (je 1 Pref-Query + 1 INSERT). Preference-Filter + Push bleiben (via createNotificationsBatch). best-effort erhalten.

---

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `src/lib/services/communityPolls.ts` | `notifyPollFollowers` (neu, exportiert) + IIFE ruft ihn auf; alte Promise.all-Notify raus | Storm → Batches |
| `src/lib/services/__tests__/communityPolls-followers.test.ts` | + Chunking-Tests notifyPollFollowers | beweist 100er-Batching |

---

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `src/lib/services/communityPolls.ts:131-150` — bestehende Notify-IIFE + best-effort-Wrapper. ✅ gelesen.
2. `src/lib/services/notifications.ts:348-396` `createNotificationsBatch` — Signatur (`BatchNotificationInput[]`), Pref-`.in()`, Bulk-INSERT, Push-Loop. ✅ gelesen → das `.in()` ist der Grund für CHUNK=100.
3. `src/lib/services/communityPolls.ts:69-102` `fetchAllFollowerIds` (339) — bleibt unverändert als Quelle. ✅ gelesen.
4. `src/lib/services/__tests__/communityPolls-followers.test.ts` — bestehendes Mock-Pattern (mockTable, sticky-queue). ✅ bekannt.
5. `NotificationType` enthält `'poll_new'` (notifications.ts TYPE_TO_CATEGORY). ✅ verifiziert → category 'social', Pref-gefiltert.

---

## 5. Pattern-References

- **common-errors.md §1** „`.in()` Chunking" (Slice 082/086): >100 UUIDs → silent fail. → CHUNK=100 hält createNotificationsBatch's Pref-`.in()` safe.
- **errors-frontend.md / 339** best-effort Follower-Notify: throw bricht Poll-Erstellung NICHT (try/catch in IIFE).
- **patterns** Slice-318 `createNotificationsBatch` (Bulk-INSERT + client-id für Push ohne SELECT-readback).

---

## 6. Acceptance Criteria

- **AC-01** [HAPPY] 250 Follower → `createNotificationsBatch` 3× aufgerufen (100+100+50). VERIFY: vitest mock fetchAllFollowerIds-Quelle (club_followers 100+100+50), assert batch-call-count + chunk-sizes.
- **AC-02** [EDGE] 0 Follower → `createNotificationsBatch` NICHT aufgerufen, kein Crash.
- **AC-03** [EDGE] ≤100 Follower → genau 1 Batch.
- **AC-04** [HAPPY] Batch-Items haben korrekte Shape (type='poll_new', referenceId=pollId, referenceType='poll', title/body gesetzt).
- **AC-05** [REGRESSION] createCommunityPoll resolved trotz Notify-Fehler (best-effort): notifyPollFollowers wirft → IIFE-catch fängt, poll_id zurück. tsc clean + bestehende communityPolls-Tests grün.

---

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | 0 Follower | kein Batch-Call |
| 2 | genau 100 | 1 Batch |
| 3 | 101 | 2 Batches (100 + 1) |
| 4 | createNotificationsBatch wirft in Chunk 2 | Fehler propagiert zu IIFE-catch; Chunk 1 bereits geschrieben (best-effort, akzeptiert) |
| 5 | source=club ohne clubId | fetchAllFollowerIds → [] → kein Batch |
| 6 | Mega-Club Millionen | sequenzielle Batches (bounded), kein Storm — aber Serverless-Zeit-Limit bleibt extreme-scale-Thema → Scope-Out |

---

## 8. Self-Verification Commands

```bash
grep -n "Promise.all" src/lib/services/communityPolls.ts   # → 0 (kein Storm mehr)
grep -n "createNotificationsBatch\|CHUNK" src/lib/services/communityPolls.ts
CI=true pnpm exec vitest run src/lib/services/__tests__/communityPolls
pnpm exec tsc --noEmit
```

---

## 9. Open-Questions

- **Autonom (CTO):** CHUNK-Größe (100, am `.in()`-Limit), Extraktion notifyPollFollowers, ob fetchAllFollowerIds bleibt (ja, Quelle).
- **Scope-Out:** True-Millionen-Skala in EINER Serverless-Invocation (Queue/Worker/Fan-out-RPC) — separat, falls je echter Mega-Club live geht. createNotificationsBatch-interne Selbst-Chunking-Härtung (andere Caller) — separat.

---

## 10. Proof-Plan

- vitest (notifyPollFollowers Chunking 250→3, 0→0, 100→1 + best-effort) → `worklog/proofs/342-vitest.txt`.
- grep-Beleg: kein Promise.all mehr; CHUNK=100 + createNotificationsBatch im Notify-Pfad. tsc clean.

---

## 11. Scope-Out

- Server-seitige Fan-out-RPC / Queue für True-Millionen (eigener Slice, falls Bedarf).
- createNotificationsBatch internes Auto-Chunking (andere Caller) — pre-existing, separat.
- Push-Delivery-Skalierung bei Millionen (Infra).

---

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: 1 Service-File, kein Contract-Change, Return unverändert) → BUILD → REVIEW (Cold-Context, S) → PROVE (vitest + grep + tsc) → LOG.

---

## 13. Pre-Mortem

1. **CHUNK zu groß → `.in()`-Limit:** >100 ids in createNotificationsBatch's Pref-Query → silent fail. → CHUNK=100 (≈4KB URL).
2. **best-effort-Regress:** notifyPollFollowers wirft → darf Poll-Erstellung nicht brechen. → bleibt in IIFE-try/catch; AC-05.
3. **Test-Mock fire-and-forget:** notifyPollFollowers ist jetzt exportiert + awaitbar → direkt testbar (nicht über die IIFE).
4. **Partieller Fehler mid-chunk:** Chunk 1 geschrieben, Chunk 2 wirft → einige Follower benachrichtigt, andere nicht. Akzeptiert (best-effort, wie vorher bei Promise.all-Teilfehler).
