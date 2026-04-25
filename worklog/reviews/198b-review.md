# Slice 198b — Combined Track Reviews (pre Cold-Context-Reviewer)

**Status:** Self-reviews aller 3 Tracks. Cold-Context Opus reviewer-Agent wird Combined-Final-Review schreiben (verdict-Section unten ergaenzen).

---

## Track A — UX-Rest Top-5 (Self-Review PASS)

**File:** `worklog/reviews/198b-track-a-review.md` (separate)
**Closed:** 5/5 — UX #1 Home retry, #3 Market loading per-section, #7 EventSummaryModal preventClose-cleanup, #8 CreateEventModal preventClose-cleanup, #10 PostReplies Skeleton.
**Verify:** tsc clean, 181 tests passed (148 market + 27 useHomeData + 6 PostReplies).

---

## Track B — FM-UI Top-5 (Self-Review PASS, partial)

**Closed:** 3/6 — fm 2.3 Lineup-Score-Projection, fm 4.6 IPO-Banner, fm 5.3 Volume-Histogramm.
**Skipped (begruendet):**
- fm 1.3 In-Lineup-Filter — Forbidden-Files (KaderToolbar/KaderTab Wave-1-locked)
- fm 2.4 Difficulty-Indikator — Backend-data fehlt (FantasyEvent kein difficulty-Feld)
- fm 5.4 Set-Price-Alert — Hook ist `@deprecated` (J10 FIX-15 server-side Watchlist-Migration)
**Verify:** tsc clean, 99 PriceChart + 14 fantasy event-tabs tests passed.

---

## Track C — Fantasy + Brand Top-5 (Self-Review PASS, partial)

**File:** `worklog/proofs/198b-track-c-fantasy-brand.md` (proof)
**Closed:** 3/5 — F-12 Sticky-Countdown, C-04 Predictions-Limit-Hint, Brand #11 PitchView Token.
**Skipped (begruendet, Backend-Aggregat-RPC fehlt):**
- C-05 Top-Predictor-Leaderboard — `predictions GROUP BY user_id` braucht neuer SECURITY DEFINER RPC
- K-02 Most-Owned-Players-pro-Club — `holdings`-RLS blockiert cross-user reads, neuer Aggregat-RPC noetig
**Verify:** tsc clean, 133/133 fantasy tests passed, Compliance-Audit clean.

---

## Combined Bilanz

| Track | Closed | Skipped | Total |
|-------|--------|---------|-------|
| A UX | 5 | 0 | 5 |
| B FM-UI | 3 | 3 | 6 |
| C Fantasy+Brand | 3 | 2 | 5 |
| **Total** | **11** | **5** | **16** |

Punch-Liste: 48/98 → **59/98 closed (~60%)**.

**Skip-Patterns:**
- 4× Backend-Aggregat-RPC noetig (C-05, K-02, fm 2.4 Difficulty, fm 1.3 In-Lineup-Filter)
- 1× Deprecated-Hook (fm 5.4 — server-side Watchlist hat es ersetzt)

---

## Cold-Context-Reviewer Verdict (pending)

Wird vom reviewer-Agent gefuellt nach Combined-Review.
