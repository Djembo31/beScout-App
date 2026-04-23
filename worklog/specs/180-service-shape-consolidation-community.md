# Slice 180 — Service-Shape Consolidation: Community (Tier B2 Pilot)

**Typ:** S-Slice. Money-Path: Nein (community-domain). Pilot fuer Tier-B2-Migration.

---

## Ziel

Slice 174 lieferte `DomainError`-Foundation. Aktuell nutzen 33 Services das `{success, error}`-Discriminated-Union-Pattern. Slice 180 migriert **Community-Services** (posts + votes) auf typed `throw DomainError`. Schließt pre-existing INV-25 Test-Failure (`'vote_post_failed' not in KNOWN_KEYS`).

**Not-in-Scope:** Money-Services (trading, ipo, offers, liquidation, missions, clubSubscriptions) — separater Slice 180b mit expliziter CEO-Scope-Notiz.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/services/posts.ts` | Return-Shape `{success, error}` → throw DomainError. INV-25-Fix: `'vote_post_failed'` → `ConflictError` |
| 2 | `src/lib/services/votes.ts` | Return-Shape `{success, error}` → throw DomainError |
| 3 | Consumers von posts/votes | Inline-update: `if (!result.success)` → try/catch mit DomainError |
| 4 | Tests | `posts.test.ts`, `votes.test.ts` anpassen auf throw-Pattern |

---

## Acceptance Criteria

1. **A1** — `posts.ts` Public-API returnt Success-Data direkt oder wirft DomainError
2. **A2** — `votes.ts` Public-API analog
3. **A3** — Alle Consumer-Sites updated (grep `votePost\|createPost` + ähnliche)
4. **A4** — INV-25 Test-Failure gefixt (`vote_post_failed` wird `ConflictError` mit `code='conflict'` — bereits in KNOWN_KEYS)
5. **A5** — Bestehende Tests migriert, alle gruen
6. **A6** — tsc clean

---

## Proof

`worklog/proofs/180-service-shape.txt`

## Time

~45 min.
