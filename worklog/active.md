# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Slice 267 KOMPLETT (S EMERGENCY): Map-Persist-Korruption Heal. 3-Layer-Fix (Persist-Filter + Defensive Reconstruction + Buster-Bump). Spieltag + Manager wieder funktional. Knowledge: `errors-frontend.md` "Map/Set-typed React-Query-Data Anti-Pattern" + `memory/feedback_root_cause_eifer.md` neuer Default-Standard. Commit `e53e7b22`.

## Beta-Day-3 Status

- **App stabil:** Slice 267 verifiziert via tsc + 50/50 vitest. Live deployed auf bescout.net.
- **Beta-Tester unblocked:** Pesmerga + 3rd Tester (cloud) können testen sobald sie hard-refreshen.
- **Cold-Start UX bleibt offen:** Wallet+Tickets erscheinen erst nach Refresh — UX-Bug, kein Crash. Ursache: Provider-Cascade sequentiell (Smoking-Gun #3 nur teil-gefixt durch Slice 264).

## Backlog (Anil-Priorisierung)

- **Option A (15-30 min):** Map-Audit — restliche 8 Map-returnende Services präventiv mit defensiver Reconstruction sichern (analog useFixtureDeadlines). Layer-4-Filter schützt sie schon, aber bei SSR-Hydrate-Race nicht. Defensive Härtung.
- **Option B (Beta-Tester live):** App ist stabil, Pesmerga + 3rd Tester einladen, Sentry-Watch aufdrehen, Echtzeit-Feedback sammeln. Slice 267 Heal ist gut genug für Beta-Day-3.
- **Option C (Slice 268 Provider-Cascade-Refactor):** Echter Cold-Start-Fix (Stagger queries / RSC Auth-Hydrate). 4-6h, Reviewer-Pflicht. Riskant ohne Tester-Feedback ob es überhaupt nötig ist.
