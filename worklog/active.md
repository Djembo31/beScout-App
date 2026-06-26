# Active Slice

```
status: active
slice: 397
title: E-4b User-Events Builder-UI verkabeln (Teil 1: Erstellen + Credit-Eintritt sichtbar)
size: M
stage: LOG
spec: worklog/specs/397-user-events-builder-ui.md
impact: reuse worklog/impact/396-user-events-money-core.md §B/§F/§H + Explore-Map 2026-06-26 (E-4b-Fläche kartiert, kein neues impact-File)
build: DONE — 14 Files. Typ-Union 'user' (5 Lookups) + Service createUserEvent + Hook useCreateUserEvent (S371) + CreateEventModal-Rewrite + FantasyHeader-Gate-Öffnung + FantasyContent-Wiring + JoinConfirmDialog-Entkopplung (type==='user') + errorMessages 11 Codes + i18n DE/TR + NIT#1-Heal (ganze Credits). tsc grün, 6/6 Service-Test + 285 Fantasy-Tests grün, i18n-Parität OK.
proof: worklog/proofs/397-service-test.txt
proof-note: Service 6/6 + tsc0 grün. Live-Playwright AC-2/3/5 DB-Reconcile = post-Deploy (Vercel baut von main), NACH Push gegen bescout.net.
review: worklog/reviews/397-review.md (PASS, 3 NIT — NIT#1 geheilt, NIT#2/#3 bewusst belassen)
ceo: 3 Forks entschieden (2026-06-26): (1) Credit-Eintritt von PAID_FANTASY_ENABLED entkoppeln + sichtbar · (2) jeder eingeloggte User darf erstellen · (3) Split 397 (Erstellen+Eintritt) / 398 (Discovery+Pot-Preview+Cancel+Admin-Fee).
```

## Zuletzt

- **Slice 396** (2026-06-26) — User-Events Geld-Kern (E-4a), Money/CEO, DONE. RPCs `create_user_event`/`cancel_user_event`/`set_user_event_create_fee` live, aber 0 UI-Konsumenten (toter Geldkern).
- **Slice 395** (2026-06-26) — Lineup-Reject-Coverage komplett. DONE.

Nächstes: SPEC-Approval → /impact (E-4b-Fläche bereits kartiert, ggf. dünn) → BUILD → REVIEW (Pflicht, money-nah) → PROVE (Service-vitest + Live-Playwright) → LOG. Danach 398 (Discovery/Cancel/Admin-Fee).
