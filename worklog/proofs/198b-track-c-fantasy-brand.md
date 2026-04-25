# Slice 198b Track C — Proof

## Closed Items
- F-12 Sticky-Countdown — `src/features/fantasy/components/event-detail/EventDetailHeader.tsx`
- C-04 Predictions-Limit-Hint — `src/components/fantasy/PredictionsTab.tsx` + `messages/{de,tr}.json`
- Brand #11 PitchView Token — `src/features/fantasy/components/lineup/PitchView.tsx`

## Skipped Items
- C-05 Top-Predictor Leaderboard — neuer SECURITY DEFINER RPC erforderlich (RLS-protected predictions). Backlog Slice 199.
- K-02 Most-Owned Players — neuer SECURITY DEFINER RPC erforderlich (holdings-RLS blocks cross-user reads). Backlog Slice 199.

## Verifikation

### tsc --noEmit
```
EXIT=0
```

### vitest src/components/fantasy
```
Test Files  15 passed (15)
     Tests  133 passed (133)
   Duration  29.96s
```

### Compliance Audit
```bash
$ git diff messages/de.json messages/tr.json | grep -E "^\+" | \
    grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b|kazan"
EXIT=1   # = no matches, clean
```

### Code-Diff Summary
```
 messages/de.json                                                       |  2 ++
 messages/tr.json                                                       |  2 ++
 src/components/fantasy/PredictionsTab.tsx                              | 14 ++++++++++----
 src/features/fantasy/components/event-detail/EventDetailHeader.tsx     | 21 ++++++++++++++++++++-
 src/features/fantasy/components/lineup/PitchView.tsx                   |  4 ++--
 5 files changed, 35 insertions(+), 8 deletions(-)
```

## Implementation Notes

### F-12 Sticky-Countdown
- Sticky bar (`position: sticky; top: 0`) im EventDetailHeader, oberhalb der Status-Badge-Zeile.
- Negative `-mx-4 md:-mx-5 -mt-4 md:-mt-5` hebt Dialog-Body-Padding auf, sodass Bar full-width pinned bleibt.
- backdrop-blur-xl auf bg-bg-main/95 — bewirkt klar-lesbaren Pin-State waehrend scrolling.
- Hide-Logic: `event.status !== 'ended'` (kein "0d 0h 0m" auf abgeschlossenen Events).
- Inline-Countdown im Meta-Row entfernt (nur wenn ended sichtbar) — vermeidet Doppelung.

### C-04 Predictions-Limit-Hint
- Compliance-clean Wording: "Max. 5 Tipps pro Spieltag — Qualität über Quantität" (DE) /
  "Haftada max. 5 tahmin — sayıdan çok kalite önemli" (TR).
- Doppelte Discoverability: Title-Tooltip auf 5/5-Badge UND visible `<p>` darunter.
- Kein "gewinn"/"prämie"/"kazan"-Stamm.

### Brand #11 PitchView Token
- Z235 `bg-black/40` → `bg-bg-main/40` (Score-Badge-Background)
- Z238 `bg-black/30` → `bg-bg-main/30` (Default-Player-Slot-Background)
- bg-bg-main = `#0a0a0a` (tailwind.config.ts), identisch zu black aber Token-konsistent.
