# Slice 165 — votePost Service Silent-Cast Hardening

**Size:** S · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Bug-Hardening (adressiert Slice 160 Finding #2 MEDIUM latent)
**Reference:** `.claude/rules/common-errors.md` §1 Silent-Fails · `worklog/reviews/160-review.md` Finding #2

## Ziel

`votePost` Service-Cast `data as { upvotes: number; downvotes: number }` härten gegen latentes Silent-Fail-Risiko. Wenn RPC-Body `{success: false, error: '...'}` returnt (Guard-Failure), silent-cast auf undefined-Felder → UI-State-Breakage ohne Error-Toast.

## Hintergrund

Slice 160 Review Finding #2 (MEDIUM):
> `votePost` castet `data as { upvotes, downvotes }` ohne `success`-Discriminator-Check. Heutige Slice-160-Fix macht den Pfad in der Praxis unerreichbar (Client sendet nie mehr 0), aber sobald ein Dev oder ein neuer Caller einen anderen ungueltigen Wert uebergibt (z.B. `2`) oder die auth.uid()-Guard failt, returnt RPC `{success:false, error:'...'}` → `result.upvotes === undefined` → UI broken, kein Error-Toast.

RPC-Body-Shapes (Migration `20260404192000`):
- **Success:** `json_build_object('upvotes', v_up, 'downvotes', v_down)` → `{upvotes: N, downvotes: N}`
- **Error:** `json_build_object('success', false, 'error', '<msg>')` → `{success: false, error: '...'}`

Inkonsistente Discriminator-Shape: `success: true` fehlt im Success-Pfad. Discriminator ist effektiv das Vorhandensein von `upvotes`-Feld oder explizites `success: false`.

## Fix-Strategie

Pre-Cast-Guard:
```typescript
const result = data as { upvotes?: number; downvotes?: number; success?: boolean; error?: string };
if (result.success === false || typeof result.upvotes !== 'number') {
  throw new Error(result.error ?? 'vote_post_failed');
}
return { upvotes: result.upvotes, downvotes: result.downvotes ?? 0 };
```

Robust gegen beide Fehler-Pfade:
- RPC returnt `{success: false, error: '...'}` → explizite Guard-Rejection
- RPC returnt unerwartetes Shape (z.B. leer oder null) → `typeof upvotes !== 'number'` catcht

## Cross-Service-Audit (Dokumentation, nicht Fix)

Grep nach `return data as { ... }` in `src/lib/services/`:

| Service | Shape | Status | Handling |
|---------|-------|--------|----------|
| `posts.votePost` | `{upvotes, downvotes}` | **VULNERABLE** | Fix in Slice 165 |
| `posts.adminTogglePin` | `{success, is_pinned?, error?}` | OK (success-discriminator present) | Caller muss prüfen |
| `adRevenueShare` | `{success, ...}` | OK | Caller muss prüfen |
| `creatorFund` | `{success, ...}` | OK | Caller muss prüfen |
| `platformAdmin` | `{success, ...}` | OK | Caller muss prüfen |
| `votes.castVote` | `{success, total_votes, cost}` | OK | Caller muss prüfen |
| `fixtures.syncFixtures` | `{success, synced_count}` | OK | Caller muss prüfen |
| `referral.getInviter` | `{id, handle, display_name}` | **GREY** — RPC returnt NULL bei no-inviter (handled via null-check) | Not silent-cast-fail (explicit null path) |

Nur `votePost` hat kein success-Diskriminator-Feld im Cast-Type — also der aktive Vulnerability-Kandidat.

## Acceptance Criteria

1. `votePost` Service wirft `Error` wenn RPC-Response `{success: false}` returnt.
2. `votePost` Service wirft `Error` wenn `upvotes` kein number ist (defensive catch-all).
3. `result.upvotes` und `result.downvotes` sind garantiert `number` im Return-Type.
4. Bestehende Tests grün: `posts.service.test.ts` (falls existiert) + Community-Tests.
5. `tsc --noEmit` clean.
6. common-errors.md §1 Silent-Fails — neuer Entry "Silent-Cast ohne Discriminator-Check" mit vulnerability-Audit aus dieser Slice.

## Edge Cases

1. **RPC success-path returnt `{upvotes: 5, downvotes: 2}`** — `result.success === undefined` (nicht `false`), `typeof upvotes === 'number'` → durchlauf ✓
2. **RPC error-path returnt `{success: false, error: 'Ungueltiger vote_type'}`** — Guard wirft `Error('Ungueltiger vote_type')` ✓
3. **RPC returnt `null` (unerwartet)** — `result.upvotes === undefined` → Guard wirft `Error('vote_post_failed')` ✓
4. **RPC success-path returnt `{upvotes: 5}` (downvotes fehlt)** — `downvotes ?? 0` Fallback ✓

## Proof-Plan

- `npx tsc --noEmit` clean
- `npx vitest run src/components/community` grün
- Bestehende Tests die `votePost.mockResolvedValue({upvotes: 5, downvotes: 1})` nutzen, sollten weiterhin funktionieren (gleiche Shape).
- common-errors.md §1 Update verifiziert via grep.

## Scope-Out

- **Cross-Service-Fix**: Andere Services mit success-Discriminator sind out-of-Scope — Caller-Pflicht zu prüfen.
- **RPC-Shape-Unification**: RPC auf konsistenten `{success: true, data: {...}}`-Shape migrieren wäre cleaner, aber Migration-Drift-Risiko + andere Callers. Separater Slice.
- **referral-Handling**: Null-Path ist explizit handled, kein Silent-Cast-Fall.
