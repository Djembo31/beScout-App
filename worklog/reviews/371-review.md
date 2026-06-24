# Slice 371 — Self-Review

**verdict: PASS (self-review)**
**type: UI Bug-Fix (money-nah), XS — Pattern-Wiederholung (performance.md invalidateQueries-nach-Writes)**

## Warum Self-Review
1 File, +6 Zeilen (2× `invalidateQueries({queryKey: qk.wallet.all})` + Kommentare + deps-Fix). Reine Cache-Invalidation — **keine** Money-Logik, kein RPC/Service/Migration berührt. Folgt exakt dem etablierten Trading-Pfad-Pattern (`invalidateWallet`).

## Checks
- tsc --noEmit clean ✅
- useCommunityActions.test.ts: 72/72 grün ✅
- `qk.wallet.all = ['wallet']` prefix-matcht `['wallet', userId]` (verifiziert in useWallet.ts-Doku) ✅
- handleUnlockResearch nutzt jetzt `queryClient` → deps-Array ergänzt (S170 exhaustive-deps-Trap) ✅
- Money-Pfad byte-identisch (git diff zeigt nur Cache-Calls) ✅

## Findings
- Keine. 

## Offen (kein Blocker)
- Live-Playwright AC1/AC2 (Header refresht sofort) erst nach Vercel-Deploy verifizierbar → nächste Session. Risiko minimal (Standard-Invalidation-Pattern, identisch zum Trading-Pfad der live funktioniert).
