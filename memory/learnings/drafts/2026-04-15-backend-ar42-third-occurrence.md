**2026-04-15 — RPC Column-Mismatch (AR-42 Pattern, 3rd occurrence)**

Observation: AR-51 J8 migration `expire_pending_orders` referenzierte `orders.filled_quantity` (falsch) statt `orders.filled_qty` (richtig, live-schema). `CREATE OR REPLACE FUNCTION` parst Body, validiert aber keine Column-Existenz. Migration applied OK, RPC crasht erst beim Call mit PG 42703. Silent ~9h im Cron bis Detection.

Pattern-Frequency:
- AR-42 (2026-04-14): `user_equipment.equipment_rank` vs `rank` — Equipment-Drops 6d tot
- AR-42b (2026-04-14): `transactions.amount_cents` vs `amount` — bCredits-Drops NIE live gewesen
- **XC-15 (2026-04-15): `orders.filled_quantity` vs `filled_qty` — Buy-Order-Expiry + Escrow-Release 9h tot**

Confidence: high

Actionable:
- Nach jedem `CREATE OR REPLACE FUNCTION` fuer einen callable RPC sollte ein Dry-Run-Call folgen (wo safe — z.B. idempotente oder read-only RPCs). Ein Call reicht um Column-Mismatch zu detecten.
- OpenAPI-Introspection (`GET /rest/v1/`) ist schnellster Live-Schema-Check ohne DDL-Access, funktioniert mit ServiceRole.
- Healing-Rule ergaenzen in common-errors.md Section "RPC INSERT Column-Mismatch": Explicit-Call-Test nach apply fuer neue/geaenderte RPCs, nicht nur pg_get_functiondef-Diff.

Gap in SKILL/Errors: Common-errors.md AR-42 Sektion warnt vor INSERT/UPDATE Column-Mismatch. XC-15 ist ein SELECT (FOR UPDATE) Column-Mismatch — gleicher Mechanismus, andere Syntax. Die Regel sollte explizit auf "JEDE Statement-Form die einen Column-Name referenziert" erweitert werden, nicht nur INSERT/UPDATE.
