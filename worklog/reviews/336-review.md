# Slice 336 — Cold-Context-Review (Money-near)

**Verdict: PASS** · time-spent: 9 min · reviewer-agent (cold context)

## Findings (beide NIT, kein Blocker)
| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|------------|
| 1 | NIT | migration §3 | `creator_earned` (Geld, pro echter Stimme) divergiert semantisch von `total_votes` (gewichtet) — bewusst (Spec §2), kein Bug. | Kommentar deckt es ab, kein Change. |
| 2 | NIT | communityPolls.ts Follower-Query | kein `.limit()` → bei >1000 Followern PostgREST-1000-cap (einige Follower kein Notify). Best-effort, kein Money, **gleicher Stand wie createEvent** (keine Regression). | Backlog post-Beta (`.range()`-Loop / server-Fan-out). |

## One-Line
Ja — Money-Branches byte-identisch zur Live-Baseline (333), Gewicht wirkt nachweislich nur auf Tally, Abo-Logik 1:1 aus cast_vote, alle 4 Notification-Sync-Punkte + AR-44 sauber.

## Bestätigte Achsen (Reviewer)
1. Money-Erhalt (156): Byte-Vergleich 333↔336 — alle Geld-Branches identisch (Wallet/Treasury/transactions/source-Routing/club-guard/cost=0-Pfad).
2. Gewicht ≠ Geld: weight nur Tally+total_votes+weight-Spalte; amount_paid/creator_share/platform_share = echte Stimme. Smoke: sub_wallet_delta=1000 (nicht 2000).
3. Abo-Logik exakt aus cast_vote; club_id-null-Guard (User-Poll weight 1); %-Konsistenz.
4. notifications_type_check +'poll_new' vollständig.
5. 4-Punkt-Sync (CHECK + Type + Icon/Color + TYPE_TO_CATEGORY) + i18n {name}-Param.
6. Follower-Notify best-effort (try/catch, Poll-Create unberührt); Spalten verifiziert.
7. AR-44 + Migration-Timestamp-Order (>335) korrekt.

## Backlog aus Review
- Follower-Notify `.limit()`-Härtung bei Mega-Clubs (NIT#2, = createEvent-Parität) → post-Beta, zusammen mit getPlayerNames-`.limit()` (Slice 334-NIT).
