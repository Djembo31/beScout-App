# Slice 342 — Cold-Context-Review

**Verdict: PASS** (2 NIT, beide dokumentierte pre-existing Trade-offs).

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | communityPolls.ts notifyPollFollowers | `notifText('pollNew*')` ohne locale → DE-Template für ALLE Follower (auch TR). **Pre-existing aus Slice 336**, durch Extraktion sichtbarer. Batch-Pfad macht Per-Recipient-Locale unbequem. | Backlog: i18n-KEY in DB (notifications.i18n_key existiert) + Client-resolve. Kein 342-Blocker. |
| 2 | NIT | Chunk-Schleife | Partieller Fehler mid-chunk: Chunk 1 geschrieben, Chunk 2 wirft → manche Follower benachrichtigt. Korrekt als best-effort akzeptiert (Spec Edge #4). | OK as-is. |

## One-Line
Sauberer minimal-invasiver Storm→Batch-Fix über ein bestehendes getestetes Primitive, korrekt am `.in()`-Limit gechunkt, best-effort erhalten, echte Chunk-Count-Tests — mergebar.

## Verifizierte Prüfpunkte
- **CHUNK=100 ↔ `.in()`-Limit:** createNotificationsBatch's Pref-`.in('user_id',…)` bekommt ≤100 UUIDs (~4KB < 14KB). Bulk-INSERT hat kein `.in()`. Korrekt.
- **Off-by-one:** `i += CHUNK` + `slice(i,i+CHUNK)` → 100→1, 101→2 (100+1), 250→3 (100+100+50). Tests bestätigen.
- **best-effort:** notifyPollFollowers wirft → IIFE-try/catch fängt, `return result.poll_id` läuft synchron davor. AC-05 beweist throw.
- **Preferences + Push erhalten:** Pfad geht ausschließlich durch createNotificationsBatch (Pref-Filter `social` + firePush), kein Bypass.
- **Type:** `'poll_new' as const` valide NotificationType. i18n-Keys pollNewTitle/Body in de+tr vorhanden.
- **Tests:** vi.hoisted-Mock + mockReset, echte `mock.calls[i][0].length`-Asserts, kein sticky-false-green. 0/80/100/101/250 + Shape + throw abgedeckt.
- **Mega-Skala:** bounded sequenziell; True-Millionen (Serverless-Zeit) ehrlich als Scope-Out (Queue/Worker).

## time-spent
~9 min. Reviewer-Agent-ID: a8c8edad8398523f2.
