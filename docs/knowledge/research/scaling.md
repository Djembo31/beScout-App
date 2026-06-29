---
title: Skalierungs-Architektur — Schwellen, Migrations-Pfad, Service-Interfaces
created: 2026-06-29
updated: 2026-06-29
status: active
tags: [scaling, architektur, supabase, redis, realtime, kosten, service-interfaces, infra]
consult_when: Skalierung, Performance-Grenze, Supabase-Limit (~50K User / 500 Realtime-conn), Trading-Engine/Scoring-Worker auslagern, Redis/Queue/WebSocket-Migration, Kosten-Projektion, Service-Interface-Verträge (TradingService/ScoringService/WalletService), JETZT-tun-vs-Overengineering
---

# Skalierungs-Architektur

> **Kanonische Scaling-Heimat** (konsolidiert 2026-06-29 aus `docs/SCALE.md` → git-History, Slice 448 K2.3-D).
> **Ehrliche Analyse:** Was trägt bis wann, was muss wann geändert werden. **Niedrige Prio bei aktuell ~128 Usern** — die Schwellen liegen weit weg. Der Wert *heute* = die richtigen Interfaces sauber halten, damit ein späterer Tausch billig ist.
> **Wording-Heilung:** Quell-Doc nutzte BSD/DPC + einen „Mock/useState"-Ist-Stand → geheilt auf Credits/Scout Card; der Ist-Stand ist heute **Supabase live** (≈300 Migrationen, kein Mock mehr).

## Realitäts-Check — wo stehen wir

| | Aktuell (~128 User) | Pilot-Ziel (1K) | Wachstum (10K-100K) | Scale (1M+) |
|---|---|---|---|---|
| Daten | **Supabase live** | Supabase | Supabase + Cache | eigene Cluster |
| State | TanStack Query | Supabase | + Redis | Microservices |
| Trading | DB-Matching (RPC) | DB-Matching | Queue (BullMQ) | Rust/Go Engine |
| Realtime | Supabase Realtime | Supabase (500 conn) | Ably/Pusher | eigener Cluster |

**Die Wahrheit:** Supabase trägt bis ~50.000 User. 99 % der Startups scheitern aber nicht an der Technik, sondern erreichen die 50K nie. → **Richtig bauen für 50K, vorbereitet sein für 1M+** — nicht andersrum.

## Die 5 kritischen Systeme & ihre Grenzen

**1 · Trading-Engine.** Im Kern eine Börse (Order-Matching, atomare Transaktionen, Echtzeit-Preise). Pilot: DB-Matching reicht. 100K: Redis-Orderbook-Cache (Top 50 Bids/Asks) + BullMQ-Matching-Queue + Read-Replicas. 1M: eigene Matching-Engine (Rust/Go) + Event-Driven (Kafka/NATS) + CQRS. *Jetzt richtig:* Orderbuch als eigenständigen Service *denken*, alle Trades über einen zentralen Ausführungspfad, Transaktions-Log ab Tag 1 (jede Credit-Bewegung geloggt — ist gebaut), Preis-Berechnung als isolierte Funktion.

**2 · Fantasy-Scoring.** Batch-Job, kein Request-Response: bei Spieltag-Ende potenziell 100K+ Lineups gleichzeitig. Pilot: sequenziell (~10s). 100K: parallele Worker (Railway/Fly), Queue-Batches (~30s). 1M: K8s-Worker-Pool, partitioniert je Event, pre-computed Player-Scores (materialized views), Leaderboard via Redis Sorted Sets. *Jetzt richtig:* Scoring als reine Funktion ohne Side-Effects, Player-Performance getrennt von Lineup-Daten, Event-Ergebnis als eigene Tabelle (nicht inline). → koppelt an D113 (fixture-gebundene Scores) + [domain/fantasy.md](../domain/fantasy.md).

**3 · Echtzeit (WebSocket/Realtime).** Preis-Ticker, Live-Scores. Supabase Realtime limitiert auf **500-10K concurrent/Projekt**. 100K: eigener WebSocket-Server + Redis Pub/Sub + Channel-Scoping (`/prices`, `/events/{id}`). 1M: Ably/Pusher oder eigener Cluster. *Jetzt richtig:* Realtime als abstrakten Layer (`useRealtimePrice(playerId)`) bauen — dahinter Polling/Realtime/WebSocket austauschbar; Client graceful degraden (WebSocket → SSE → Polling); nicht alles realtime (Preise ja, Portfolio-Wert 30s cached). → relevant für Krankheit D-03 (Client-only-Architektur, `worklog/notes/disease-register.md`).

**4 · Datenbank-Design.** Schlechtes Schema ist später kaum fixbar. *Jetzt richtig (alles teils gebaut):* Geld als **BIGINT cents** (kein Float) · alle Geldflüsse als atomare Transaktionen · denormalisierte Stats als Read-Cache, aber per Trigger/Cron sync halten (vgl. Drift-Krankheit D-19) · `balance_after` im Ledger für Audit · `UNIQUE(user_id, player_id)` gegen Concurrency-Dupes · `PARTITION BY RANGE` für trades/transactions/lineups · CHECK-Constraints auf DB-Ebene.

**5 · Sicherheit & Finanzsystem.** Virtuelles Geld → jeder Bug = User verliert Credits, jede Race = Geld dupliziert. *MUSS ab Tag 1:* ACID/SERIALIZABLE für alle Geldflüsse · Optimistic Locking auf Orders · Idempotency-Keys (doppelte Requests ≠ doppelte Trades) · Rate-Limiting · append-only Audit-Log (kein DELETE) · RLS (User sieht nur eigene Holdings/Orders/Transactions, keine „alle Balances"-Route).

## Service-Interfaces — jetzt definieren, Implementierung später tauschbar

Der Hebel ist nicht die Implementierung, sondern saubere Verträge. Skizze:

```typescript
interface TradingService {
  placeOrder(o: NewOrder): Promise<Order>;
  cancelOrder(id: string): Promise<void>;
  getOrderbook(playerId: string): Promise<Orderbook>;
  executeMatch(buy: Order, sell: Order): Promise<Trade>;
}
interface ScoringService {
  calculatePlayerScore(playerId: string, gw: string): Promise<number>;
  scoreLineup(l: Lineup, scores: Map<string, number>): Promise<number>;
  scoreEvent(eventId: string): Promise<EventResult>;
}
interface WalletService {
  getBalance(userId: string): Promise<WalletBalance>;
  credit(userId: string, amount: number, reason: string): Promise<Transaction>;
  debit(userId: string, amount: number, reason: string): Promise<Transaction>;
}
```

## JETZT-tun vs. Overengineering

- **✅ Tun** (kostet nichts extra, spart Monate): Geld als BIGINT cents · alle DB-Ops als Transaktionen · API-Layer zwischen Frontend/DB (Frontend ruft nie direkt die DB) · abstrakte Data-Access-Layer · trades/transactions partitionieren ab Tag 1 · Idempotency-Keys · Event-Denken („Trade executed" als Event).
- **❌ NICHT tun** (Overengineering für jetzt): Microservices · Kubernetes · Kafka · eigene Matching-Engine · Multi-Region · GraphQL. Monolith + Vercel + Supabase trägt bis 100K.

## Kosten-Projektion (Größenordnung)

| Phase | User | Stack | ~Kosten/Mo |
|---|---|---|---|
| Pilot | 100-1K | Vercel + Supabase Pro + Vercel KV | ~$50 |
| Wachstum | 10K-100K | + Upstash Redis + BullMQ/Railway + Ably | ~$300-1.000 |
| Scale | 1M+ | K8s (AWS/GCP) + PG-Cluster + Redis-Cluster + Kafka | ~$3-10K |

**TL;DR:** Jetzt Supabase + Vercel, Interfaces sauber. Bei 10K: Redis + Scoring-Worker auslagern. Bei 100K: Realtime auf Ably + Read-Replicas. Bei 1M: Trading-Engine in Rust/Go, eigene Infra. Das Frontend (Next.js/React) skaliert problemlos — die Grenzen kommen *alle* vom Backend.
