# Review — Slice 474 Wallet/Tickets cached-placeholder SSR-safe (self-review)

**Typ:** self-review (XS-S, SSR-Hydration-Timing; Money-DISPLAY-Hook aber kein Money-LOGIC-Change) · **Datum:** 2026-06-30

## Kontext
Der 472-Live-Walk-Blocker (#418/#423 auf jeder authed Page) wurde per CEO-genehmigtem Dev-Repro un-minifiziert lokalisiert: `»Expected server HTML to contain a matching text node for "12.501,47"«` = Wallet-Balance im SideNav. `useWallet`/`useUserTickets` lasen den localStorage-Mirror synchron als `placeholderData` → seit 472 (userId server-seitig präsent) divergiert der First-Render (Server undefined → Skeleton, Client cached). 473 (leagueScope) war eine korrekte, aber tangentiale SSR-Härtung — DIES ist die Ursache.

## Änderung
1. NEU `useCachedPlaceholder.ts` — SSOT-Hook, liest Cache post-mount-gated (hydrated-flag).
2. `useWallet.ts` + `tickets.ts`: useMemo-readCached → useCachedPlaceholder.

## Selbst-Check
- **SSR-Korrektheit:** First-Render Server==Client (beide undefined→Skeleton) → kein Mismatch. **Live in Dev bewiesen** (clean restart + SW/Cache-clear): /market + /home Console #418/#423-frei, Wallet rendert „12.501,47" korrekt post-Hydration (kein Skeleton-Stuck). = der definitive Funktionsbeweis (Reviewer 472-F1: nur Live-Walk clearbar).
- **Money-Path (§3-adjazent):** KEIN Logic-Change. Nur Placeholder-TIMING (Cache 1 Tick später). `dataUpdatedAt` bleibt 0 für placeholderData → `useIsBalanceFresh` unverändert → BuyModal-Confirm-Gate intakt. queryFn/writeCached/Mutation-Helper/setWalletBalance unberührt. Balance-WERT unverändert.
- **Schnitt-Regel (§0):** EIN neuer SSOT-Hook ersetzt die duplizierte useMemo-readCached-Logik an beiden Stellen — kein zweiter Weg, sondern Konsolidierung. readCached/writeCached/cachedQuery unverändert.
- **Vollständigkeit:** `readCached` ist typ-beschränkt auf `bs_wallet`|`bs_tickets` → nur 2 Konsumenten (Wallet+Tickets), beide gefixt. Kein Whack-a-Mole. React-Query-Persist scheidet aus (beide in USER_SCOPED_DOMAINS).
- **Tests:** useCachedPlaceholder 2/2 (First-Render-undefined-Regressionsguard + uid-undefined-no-read) · useWallet 18/18 · tsc 0.

## Verdict (self): PASS für Merge. **Gate = Prod-Walk** (Console #418-frei über home/market/player/fantasy/club + LCP-Win messbar + 2-Account-Switch). Dev-Beweis bereits grün.

## Learning (Knowledge — nach Prod-Bestätigung in errors-frontend.md)
- **Bug-Klasse:** „Server-Auth-Seed (472) macht userId server-präsent → JEDE `userId`-gated, synchron-localStorage-lesende `placeholderData`/`initialData` divergiert beim First-Render → #418." Der `useMemo`-statt-`useState`-Schutz (S268) galt NUR solange userId server-seitig undefined. Fix-Pattern: post-mount-gated Cache-Read (`useCachedPlaceholder`). **Diagnose-Lehre:** der un-minifizierte Mismatch steckt im Next.js-Dev-Error-Overlay (`nextjs-portal` shadowRoot, „Expected server HTML…"), NICHT in der minifizierten Prod-Console — Dev-Repro ist der schnellste Weg zum exakten Text-Node. **Falle:** localhost hat eigenen Service-Worker + Cache (`bescout-v4`) → nach Code-Change SW+Cache clearen + hard-reload, sonst rendert der Client alte Chunks gegen frische SSR (Mismatch bleibt scheinbar bestehen).
