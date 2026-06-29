---
title: Equipment Inventar v2 + Realtime Following Feed
created: 2026-04-08
updated: 2026-06-29
status: active
tags: [equipment, mystery-box, realtime, inventory]
consult_when: Equipment, Mystery-Box, Scoring-Boost, Chips, Equipment-Realtime, Live-Sync
verified-against: src/components/inventory/EquipmentSection.tsx @ 2026-06-17
---

> ⚠️ Migriert aus memory/ (Stand 2026-04-08/09) — Inhalt nicht gegen Juni-Realität (Slices 329-332) re-verifiziert.

# Equipment Inventar v2 + Realtime Following Feed (2026-04-08/09)

> Verdichtet aus Session-Handoff 2026-04-08→09 + Retros 20260409-004110..010005. AutoDream Run #6.

## Was wurde gebaut

Doppel-Sprint: Equipment Inventar v2 (Collection UI) + Realtime-Upgrade des Following Feed.

| Commit | Inhalt |
|--------|--------|
| d71975a | feat(inventory): equipment pokedex + stats + consumed history + manager shortcuts |
| 76003b1 | docs(memory): mystery box drop rates v1 confirmed final |
| 6ee9629 | fix(manager): show EquipmentShortcut in Aufstellen empty states |
| 7ddac0b | feat(social): live scout activity feed via supabase realtime |
| 41c0218 | test(e2e): QA script for realtime following feed |
| 32c4248 | docs(memory): realtime + react query pattern + close session handoff |
| 66dda23 | docs(database): document migration workflow + registry drift |

## Equipment Inventar v2

### Key Files
```
src/components/inventory/EquipmentSection.tsx         ← Pokédex-Matrix + Stats-Header + Filters
src/features/manager/components/EquipmentShortcut.tsx ← Shortcut-Badge in Manager Tabs
src/features/manager/components/aufstellen/AufstellenTab.tsx ← Early-Return-Fix
src/features/manager/components/kader/KaderTab.tsx    ← Early-Return-Fix
src/lib/queries/equipment.ts                          ← includeConsumed param + qk.equipment.inventoryAll
src/lib/services/equipment.ts                         ← Service Layer Erweiterung
messages/de.json + messages/tr.json                   ← Neue i18n Keys
```

### Features
- **Stats-Header:** Items · Typen X/5 · Hoechster Rang · Aktiv (gold-accented bei Rang/equipped > 0)
- **Pokédex-Matrix (Alle):** 20 Slots = 5 Typen x 4 Raenge. Owned = farbig + Equipped-Badge. Missing = dashed-border + Lock-Icon.
- **Verbraucht-View:** `includeConsumed` Service-Param + separater Query-Key (`qk.equipment.inventoryAll`), grayscale cards mit "N× verwendet" Badge.
- **Filter/Sort:** Position-Chips (Alle/GK/DEF/MID/ATT/Universal), Sort-Dropdown. Matrix-Mode hat fixen Reihenfolge (kein Sort).
- **Manager Shortcut:** `EquipmentShortcut.tsx` in Aufstellen + Kader Tabs (inkl. Empty-State-Fix — fehlte initial in beiden early-return-Branches).

### Lernpunkte
- Vor dem Bauen pruefen ob Screen/Component schon existiert — Inventory Screen war bereits unter `/inventory?tab=equipment`. Discovery erspart Duplikation.
- Early-Return Branches exhaustiv abdecken: nicht nur Haupt-Render, auch alle `if (!data) return` Zweige benoetigen die neue Komponente.

## Realtime Following Feed

### Key Files
```
src/components/social/FollowingFeedRail.tsx           ← Gold-Pill + pendingCount UI
src/lib/queries/social.ts                              ← useFollowingFeed: channel + throttle
supabase/migrations/20260408220000_activity_log_realtime.sql ← REPLICA IDENTITY + publication
e2e/qa-realtime-feed.ts                               ← Playwright QA: service-role INSERT Test
```

### Architektur
- **Supabase Realtime respektiert RLS** — cross-user SELECT-Policy (aus B2 e61be4a) filtert serverseitig. Kein Client-Filter noetig.
- **Throttle-2s-Window** — first event starts timer, subsequent events buffern OHNE Timer-Reset. Verhindert stetiges Debounce-Verschieben bei stetigem Traffic.
- **`invalidateQueries` + `keepPreviousData`** — statt `setQueryData` (Realtime-Payload enthaelt keine Profile-Joins). `keepPreviousData` ist globaler Default in `queryClient.ts:11` → flicker-free ohne Extra-Opt-in.

### Muster (wiederverwendbar)
Pattern #21 in `memory/patterns.md` dokumentiert: vollstaendiges Template fuer Live-Feed-Features.

## Migration Registry Drift

### Diagnose (Commit 66dda23)
3 gleichzeitige Bugs in `schema_migrations`:
1. `apply_migration` stempelt mit Aufruf-Zeitpunkt, nicht File-Timestamp → 7 Mismatches
2. 7 "Ghost" Rows mit `name=null, statements=null`
3. ~17 Legacy-Files mit 8-stelligem Datum-Prefix nie registriert

### Entscheidung
Surgical Repair bewusst NICHT durchgefuehrt — jeder neue `mcp__supabase__apply_migration` Call fuehrt Bug 1 erneut ein. Stattdessen: Workflow-Regel in `.claude/rules/database.md` ("NIE `db push`, IMMER `mcp__supabase__apply_migration`").

Vollstaendige Diagnose: `~/.claude/projects/C--bescout-app/memory/reference_migration_workflow.md`

## Mystery Box Economy v1 Final

Drop-Raten aus Migration `20260407120000` analysiert. Anil bestaetigt (A/A/A auf alle 3 Kalibrierungs-Fragen). Status: final, keine neue Migration noetig.

## Test-Status

- `tsc --noEmit`: CLEAN
- Playwright Live QA bescout.net: alle Features verifiziert
- Realtime E2E: `qa-realtime-feed.ts` — service-role INSERT → Pill zeigt Count → Click refetcht
- `ipo.test.ts`: 36 tests passed, `EventDetailModal.test.tsx`: 14 tests passed

## Typen + Ränge — SSOT-Pointer (Slice 450 K2.4)

Die 5 Equipment-Typen (Namen, Position-Eignung) + 4 Ränge (Scoring-Multiplikator, Range ~1.05x–1.25x) sind **DB-kanonisch** in `equipment_definitions` + `equipment_ranks`. Bewusst **nicht hier als Prosa gepflegt** (Drift-Schutz; README-Regel „DB-ableitbar → auf Live-Quelle zeigen, nicht duplizieren"). Die frühere `wiki/equipment-system.md`-Dublette ist nach K2.4 gelöscht (→ git-History); für konkrete Namen/Multiplikator-Werte die DB-Tabellen abfragen.
