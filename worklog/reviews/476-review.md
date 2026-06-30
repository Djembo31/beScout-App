# Review — Slice 476 /club Dual-Build-Fix (self-review)

**Typ:** self-review (S, SSR/RSC-Architektur; kein Money/Security) · **Datum:** 2026-06-30

## Kontext
Live-Walk (im Rahmen 475) fand /club/[slug] komplett kaputt (Error-Boundary). Dev-Repro un-minifiziert: HydrationBoundary (legacy-Build, im Server-Component importiert) ↔ QueryClientProvider (modern-Build) = zwei React-Contexts → »No QueryClient set« → Page-Crash seit Slice 471, undetektiert.

## Selbst-Check
- **Root-Cause korrekt isoliert:** Component-Stack zeigt explizit `build/legacy/HydrationBoundary` vs `build/modern/QueryClientProvider`. Klassischer @tanstack-Next.js-Dual-Build-Mismatch bei Server-Component-Import.
- **Fix = kanonisch:** HydrationBoundary gehört in ein 'use client'-Modul (resolved modern, matcht Provider). `dehydrate()` bleibt server-seitig (braucht den Prefetch-Client; Output ist build-agnostisches JSON). 471-Prefetch erhalten, kein Funktionsverlust.
- **Dev-Beweis:** »No QueryClient set« nach dem Fix VERSCHWUNDEN (Root-Cause adressiert). Rest-Dev-Fehler = HMR-Stale (Neu-Datei mid-session, ERR_NETWORK_IO_SUSPENDED) — Prod-Build clean, daher Prod-Verify als definitives Gate.
- **Money/Security:** nicht berührt. Reine RSC/Provider-Verdrahtung.
- **Honesty-Lehre:** 474-„Prod-Walk grün" war unvollständig — /club (die EINZIGE Page mit 471-HydrationBoundary, bypasst AuthGuard) nicht gewalkt. Bei SSR-Arbeit ALLE strukturell-verschiedenen Page-Typen walken, nicht nur die offensichtlichen.

## Verdict (self): PASS für Merge. tsc 0 · Dev: „No QueryClient set" weg. **Gate = Prod-Verify** (/club lädt Content, kein Error-Boundary, Console clean).

## Learning (Knowledge — nach Prod-Bestätigung in errors-frontend.md)
- **Bug-Klasse:** @tanstack/react-query `HydrationBoundary`/`dehydrate` DIREKT in einem RSC-Server-Component importieren resolved zum `build/legacy`, der Client-`QueryClientProvider` zu `build/modern` → zwei Context-Instanzen → »No QueryClient set« → Page-Crash. Fix: HydrationBoundary in 'use client'-Wrapper; `dehydrate()` darf server-seitig bleiben (JSON-Output). **Detektions-Lehre:** der Bug ist nur im un-minifizierten Component-Stack sichtbar (Import-Pfade `build/legacy` vs `build/modern`) — Prod-Console zeigt nur minifiziertes #418/#422. **Prozess-Lehre:** SSR-Slices MÜSSEN jeden strukturell-distinkten Page-Typ im Live-Walk abdecken (/club hat 471-HydrationBoundary + bypasst AuthGuard = eigener Typ, von home/market/fantasy/player nicht abgedeckt).
