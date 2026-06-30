# Active Slice

```
status: in-progress
slice: 491
title: CLS systemisch — MissionHintList Höhen-Skeleton (reserve-then-collapse) entfernen, an no-skeleton angleichen
size: S
type: UI
welle: Mock→Pro W6 / Performance (CLS, measure-driven)
proof: worklog/proofs/491-missionhint-cls.txt
review: self-review (S, entfernt loading-Skeleton zum Angleich an 2 bestehende korrekte Sites; kein Money/Logik)
stage: LOG (deployed-pending: code done, Feld-CLS ~24h mit 490)
```

## Slice 491 — Problem (Code-verifiziert)
- `MissionHintList` (`components/missions/MissionHintList.tsx:30`) rendert **`null`** bei `isLoading` ODER `(hints.length===0 && contextHints.length===0)` → sehr häufig leer.
- Auf **3 Seiten** (home `page.tsx:51`, market `MarketContent:41`, community `page.tsx:38`) als dynamic-Import mit `loading: () => <div h-28 …>` geladen → der 112px-Skeleton kollabiert garantiert/häufig zu `null` (während des eigenen isLoading bzw. bei keinen Hints) → **reserve-then-collapse = CLS** (verschiebt alles darunter hoch). Gegenteil von Slice-116s Annahme: Höhen-Skeleton hilft nur, wenn die Komponente verlässlich Inhalt dieser Höhe rendert.
- **§0-Smell:** fantasy (`FantasyContent:45`) + manager (`ManagerContent:20`) laden DIESELBE Komponente bereits **ohne** loading-Skeleton (`{ ssr:false }`) = korrekt. „von-allem-zwei".
- **Beitrag zu:** home CLS 0,282 (490-Residual) + market CLS 0,194 + community.

## Lösung (chirurgisch, 3 Sites angleichen)
- home/market/community: `loading: () => <div h-28 …>` entfernen → nur `{ ssr: false }` (kanonisch = fantasy/manager). Kein Skeleton → kein reserve-then-collapse. Bei vorhandenen Hints erscheinen sie ohne Vor-Reservierung (kleinerer Shift als collapse-then-reappear; common-case null = 0 Shift). Market-Slice-116-Kommentar mit-korrigiert.

## Acceptance Criteria
- AC1: MissionHintList dynamic-Imports auf allen 5 Seiten identisch (kein loading-Skeleton).
- AC2: tsc 0. Funktion unverändert (Komponente rendert wie zuvor, nur kein 112px-Flash-Skeleton mehr).
- AC3 (Feld, ~24h): Sentry p75 CLS `/`+`/market`+`/community` — Beitrag dieses Fixes mitgemessen (zusammen mit 490).

## Scope-Out
- `SponsorBanner` (gleiche Anti-Pattern-Klasse, return null bei kein-Sponsor) → eigener Audit (null-Frequenz + Sites prüfen). · Hero-Residual (490, measure-gated). · Andere dynamic Height-Skeletons (Modals=fixed/Tab-Content=verlässlich → NICHT anfassen).

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(self, Pattern-Angleich) → PROVE(tsc + grep-Konsistenz + Feld ~24h mit 490) → LOG

---
## Vorheriger Slice 490 (DEPLOYED, Feld-Verifikation pending)
- Code live (a82b642f): Fork-Swap eliminiert. **In ~24h Sentry p75 CLS `/` prüfen** (war 0,282): <0,1 done · 0,1–0,2 Hero-Folge-Slice (heroMode/CTA-Banner auf dashboardReady). 491 trägt zur selben Messung bei.
