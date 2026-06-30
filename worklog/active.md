# Active Slice

```
status: in-progress
slice: 492
title: CLS systemisch (2) — SponsorBanner Höhen-Skeleton entfernen (0 aktive Sponsoren → immer null)
size: S
type: UI
welle: Mock→Pro W6 / Performance (CLS, measure-driven)
proof: worklog/proofs/492-sponsorbanner-cls.txt
review: self-review (S, Angleich an 5 bestehende no-skeleton-Sites; DB-belegt always-null; kein Money/Logik)
stage: LOG (deployed-pending: code done, Feld-CLS ~24h mit 490/491)
```

## Slice 492 — Problem (DB + Code-verifiziert)
- **Live-DB: `active_sponsors = 0`** (21 total, alle inaktiv) → `SponsorBanner` (`:92 if (!sponsor) return null`) rendert **immer null**.
- Auf **5 Sites** als dynamic mit `loading: () => <div h-16 …>` (64px) geladen: home `page.tsx:39`, community `:35`, club `ClubContent:20`, kader `KaderTab:24`, marktplatz `MarktplatzTab:36` → 64px-Skeleton kollabiert **garantiert** zu null = reserve-then-collapse-CLS bei JEDEM Load.
- **§0-Smell:** 5 weitere Sites (LeaderboardPanel/HistoryTab/SpieltagTab/ProfileView/OffersTab) laden dieselbe Komponente bereits **ohne** Skeleton = korrekt. 5-vs-5 von-allem-zwei.
- **Beitrag zu:** CLS `/` 0,282 + `/community` + `/market` (+ club/kader).

## Lösung (5 Sites angleichen)
- Die 5 `loading: h-16`-Sites → nur `{ ssr: false }` (kanonisch = die anderen 5). Identisch zu S491 (MissionHintList). Pattern errors-frontend **S491**.

## Acceptance Criteria
- AC1: alle 12 SponsorBanner dynamic-Sites loading-Skeleton-frei.
- AC2: tsc 0. Render unverändert (immer null bei 0 Sponsoren; bei künftiger Aktivierung erscheint Banner ohne Vor-Reservierung).
- AC3 (Feld, ~24h): mit 490+491 gemessen.

## Scope-Out
- 21 inaktive Sponsoren = Produkt/Daten-Frage (nicht anfassen; null-Render ist korrekt). · Hero-Residual 490 (measure-gated).

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(self) → PROVE(tsc + grep + Feld ~24h) → LOG

---
## Pending Feld-CLS-Check (in ~24h, Sentry org bescout / de.sentry.io / dataset spans, p75(measurements.cls) by transaction)
- **490** (Home-Fork) + **491** (MissionHintList) + **492** (SponsorBanner) zusammen. War: `/` 0,282 · `/market` 0,194 · `/community` 0,065.
- `/` <0,1 → 490 done; sonst Hero-Folge-Slice (heroMode/CTA-Banner auf dashboardReady).
