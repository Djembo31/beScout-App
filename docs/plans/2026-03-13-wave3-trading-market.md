# Wave 3: Trading & Market Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trending-Tab im Markt befuellen, Top-Mover-Widget auf Home, Bulk-Sell im Bestand.

**Architecture:**
- Trending Tab: nutzt bereits gefetchte `useTrendingPlayers(8)` Daten, rendert mit `DiscoveryCard variant="trending"`
- Top Movers: filtert Holdings nach groesstem `change24h`, zeigt als horizontale Scrollreihe auf Home
- Bulk Sell: Checkbox pro BestandPlayerRow + Batch-Sell-Modal mit Zusammenfassung

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind, React Query, Zustand (marketStore)

**Note:** Portfolio P&L Summary existiert bereits (ManagerBestandTab lines 232-267). Limit Orders benoetigen Backend-Matching-Engine — deferred auf spaetere Phase.

---

### Task 1: Trending Tab im Markt

Replace EmptyState placeholder with actual trending player grid.

### Task 2: Top Movers Widget auf Home

Show user's portfolio top daily movers (biggest % changes in holdings).

### Task 3: Bulk Sell im Bestand

Multi-select + batch sell for holdings.
