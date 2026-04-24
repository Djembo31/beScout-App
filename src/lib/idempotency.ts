/**
 * Slice 178d — Idempotency-Key Generator + Composition-Hook.
 *
 * Supporting primitives fuer die Slice-178-Integration in Money-Path-RPCs
 * (Slices 178, 178a-c, 178e-a..e). RPCs akzeptieren optionalen
 * `p_idempotency_key TEXT DEFAULT NULL` — bei gleichem Key innerhalb 300s
 * returnt die RPC die gecachte Response statt ein zweites Mal Wallet/Holdings
 * zu modifizieren (Schutz gegen Network-Retry auf Mobile/3G).
 */

/**
 * Generiert einen Idempotency-Key via crypto.randomUUID() mit optionalem
 * Namespace-Prefix fuer Debug-Zwecke (z.B. `'trade.buy:abc-123'`).
 *
 * Stable-Pattern: Der Key muss ueber die gesamte in-flight-Mutation inkl.
 * React Query Retries konstant bleiben. Fuer useMutation: entweder
 * `useSafeIdempotentMutation` (auto-managed lifecycle) oder per-caller
 * Ref-Management.
 */
export function newIdempotencyKey(namespace?: string): string {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return namespace ? `${namespace}:${uuid}` : uuid;
}
