# Slice 497 Review — D-08 getSystemStats „Scout Total" uncapped

**Typ:** self-review (§3 Money — aber **display-only/read, keine Money-Mutation**; Semantik-Parität DB-bewiesen)
**Verdict:** PASS

## Change
`src/lib/services/platformAdmin.ts` — `getSystemStats`: der gecappte Client-SUM `wallets.select('balance').limit(5000)` → `supabase.rpc('get_treasury_stats')`; `totalBsdCirculation = Number(total_circulating_cents ?? 0)`.

## §3 Money-Prüfung (Rigor)
- **Semantik-Parität bewiesen (D87, live `pg_get_functiondef`):** `total_circulating_cents = COALESCE((SELECT SUM(balance) FROM public.wallets), 0)` — **byte-identisch** zur alten Semantik (`wallets.reduce((s,w)=>s+balance)` = SUM(balance)). Kein Wert-Drift, nur uncapped + server-seitig.
- **Keine Money-Mutation:** rein lesend (Display-Metrik „Scout Total"). Kein INSERT/UPDATE, keine Fee, keine Balance-Änderung, kein RLS/Grant-Touch. Zero-Sum-irrelevant.
- **Cap-Bug real (common-errors PostgREST-1000-cap = MONEY-CRITICAL):** `.limit(5000)` ist KEIN Override → Cap ~1000. Latent (128 Wallets heute, undercount=0), falsch ab >1000.
- **Auth safe:** `get_treasury_stats` = SECDEF, gated auf `platform_admins`. Einziger Consumer von `getSystemStats` = `BescoutAdminContent` (Platform-Admin-Dashboard, `/bescout-admin` middleware-gated auf platform_admins) → Caller ist immer Admin → RPC authorisiert. Nicht-Admin erreicht die Funktion nie.
- **Precision:** 850.935.524 « 2^53 (Number.MAX_SAFE_INTEGER 9e15); Total-Circulation bleibt lange safe. Alt-Pfad nutzte ebenfalls JS-Number-reduce → keine Regression. `Number(... ?? 0)` deckt jsonb-number UND -string ab.
- **Graceful degrade erhalten:** RPC-Fehler → `.rpc()` rejected nicht (returns {data:null,error}) → treasuryRes.fulfilled, data=null → totalBsdCirculation=0 (wie alt bei wallets-Fail). logSilentRejects unverändert.

## Consumer / Scope
- **Einziger Consumer:** `BescoutAdminContent.tsx` (import + display :63 + call :272). SystemStats-Shape unverändert (`totalBsdCirculation: number`) → 0 Consumer-Impact.
- **§0-Subtraktion:** der gecappte Client-SUM (zweiter Weg zur Circulation-Zahl neben `get_treasury_stats`) ist entfernt → EINE kanonische Quelle. D-08 im Register → geheilt.
- **Scope-Out sauber:** D-09 (getTreasuryStats-Fallback-Cap, nur RPC-Ausfall-Branch) + volume24h `.limit(5000)` (24h-Trades <1000) NICHT angefasst — kein Misch-Commit.

## Verifikation
- tsc --noEmit: exit 0
- vitest platformAdmin-treasury.test.ts: 9/9 (getSystemStats hat keinen eigenen Test; Shape/Consumer via tsc gedeckt)
- Live: Admin „Scout Total" == Treasury-Tab „circulating" post-Deploy (beide total_circulating_cents) — siehe proof 497.
