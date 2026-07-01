# Review — Slice 493 (/club Hero ins SSR-HTML via players-Prefetch)

**Reviewer:** cold-context (SSR/Hydration-Fokus) · **time-spent:** 18min · **verdict: REWORK**

## Kern-Fund (CRITICAL) — live-verifiziert (Primary bestätigt via curl)
Der SSR-Gate ist `if (authLoading || loading)` (`ClubContent.tsx:178`) — **nicht nur `loading`**. Per Slice-472-Design ist `AuthProvider.loading = (initialUser == null)` (`AuthProvider.tsx:172`, Kommentar Z.169 „logged out → SSR skeleton, exactly as before"). Für **ausgeloggte** Besucher (die von AC4 gemessene Zielgruppe) liefert `getServerUser()` null → `initialUser=null` → `authLoading=true` beim SSR → `ClubContent` rendert server-seitig **weiter `ClubSkeleton`**, egal ob `players` geprefetcht ist. → Stadion-`<Image>` NICHT im SSR-HTML → der 1486ms render-delay bleibt.

**Primary-Verifikation (curl aktuelle prod, ausgeloggt /club/galatasaray):** 24× `animate-pulse` (Skeleton), **0× `<img stadium>`** im SSR-HTML. Bestätigt: SSR = Skeleton, nicht Hero. Die 493-Wirkungsthese (players-Prefetch → Hero im SSR) ist für anon FALSCH.

## Findings
| # | Sev | Ort | Issue |
|---|-----|-----|-------|
| 1 | CRITICAL | ClubContent:178 + AuthProvider:172 | `authLoading`-Term übersehen → 493 erreicht AC4 nicht (anon SSR = Skeleton). Fix = authLoading für server-bestätigt-anon entkoppeln ODER Option 2 (Bild server-rendern). |
| 2 | MEDIUM | page.tsx:66 vs useClubData:29 | Club-Prefetch-Key = `bySlug(slug, undefined)` (anon). Eingeloggter Client nutzt `bySlug(slug, userId)` → clubLoading true → auch eingeloggt Skeleton. 493-Nutzen eingeloggt ~0. Vorbestehend (471/472). |
| 3 | LOW | page.tsx:95 | `await prefetchQuery(players)` blockt Server-Response = additive TTFB + größerer dehydrate-State, für anon der trotzdem Skeleton zeigt = Kosten ohne SSR-Nutzen. Row-Schätzung korrigieren: `.eq('club_id')` → ~25-40 Kader-Rows (nicht 400-700). |

## PASS-Punkte (der Diff selbst ist sauber)
- Hydration-Parität: Server-Key == Client-Key, Shape via derselben `getPlayersByClubId` = byte-identisch. getClub-Modul-Cache server leer == client leer beim Hydration-Zeitpunkt → beide `db.club`-Fallback → kein #418.
- Row-Parität: `players_select` = `{public}`/`qual=true` → admin==anon.
- **Kein Key-Leak:** supabaseAdmin nur in page.tsx; players.ts `import type` (erased) + Default Browser-Client.
- prefetchQuery wirft nicht → still degrade. Bestands-Caller (2-arg) unberührt, tsc 0.
- DI-Param = mustergültige §0-SSOT (eine Query-Def, kein Replika-Drift).

## Learning (→ errors-frontend, Primary persistiert)
**SSR-LCP-Prefetch-Slices müssen ALLE Gate-Terme gegen den SSR-Zustand prüfen, nicht nur den Daten-Lade-Term.** `if (authLoading || dataLoading) return <Skeleton/>` wird durch Daten-Prefetch nur SSR-render-fähig, wenn `authLoading` beim SSR ebenfalls false ist. Seit 472 ist `AuthProvider.loading = (initialUser==null)` → für **ausgeloggte** Besucher true beim SSR. Cheap-Proof = **view-source (curl) des SSR-HTML im Ziel-Auth-Zustand** (Skeleton vs Hero), nicht nur ein Live-LCP-Trace. Verwandt S474/S476.

## Fazit
Technisch sauber/hydration-sicher/SSOT-korrekt, aber Kern-These greift nicht (authLoading). Nicht als „done" loggen. Echter Fix = authLoading-Entkopplung für server-bestätigt-anon (Option 1 literal) ODER Stadion-Bild server-rendern (Option 2, auth-frei).

---

# Review R2 — nach Korrektur (Auth-Gate-Decouple) · verdict: PASS (bedingt Live-Walk) · 22min

**Fix umgesetzt:** (1) `getServerAuthState` (`cache()`, `{user,resolved}`) + delegierender `getServerUser`; (2) `page.tsx` `ssrConfirmedAnon = resolved && user===null` → Prop; (3) `ClubContent`-Gate `(authLoading && !ssrConfirmedAnon) || loading`; (4) players-Prefetch (R1).

**Verdict PASS** — der Decouple ist konstruktiv hydration-sicher, schließt die authLoading-Lücke korrekt. Kein Fall regressiert, kein neuer #418-Vektor, kein Token-/Cross-Request-Leak.

**Gate-Korrektheit (4 Fälle verifiziert):** (a) anon SSR: `(true&&false)||false`=false → PublicClubView+Hero+`<img>` (NEU) · (b) anon Client: ssrConfirmedAnon stabil → durchgängig false → kein Skeleton-Flash, konsistent SSR · (c) authed SSR: `false||true`(club-key-mismatch)=true → Skeleton (unverändert) · (d) authed Client: unverändert. **0 Regression.**

**`resolved`-Discriminator reicht:** transienter getUser-Fehler bei eingeloggtem User → resolved=false → ssrConfirmedAnon=false → Skeleton (fail-safe = heute). Einziger Server-anon-vs-Client-authed-Vektor = stale localStorage → aber post-hydration setState-Swap (kein Hydration-Zeit-#418) UND pre-existing S472. **Kein NEUER Content-Swap.**

**cache() request-scoped** → kein Cross-Request-Leak (§3), layout+page teilen 1 getUser()-Roundtrip. **Kein Token-Leak** (nur user id/email/metadata + boolean). **Nur layout+club-page** nutzen die Helper (grep) → keine andere Seite betroffen.

**Findings:** #3 MEDIUM pre-existing (authed SSR bleibt Skeleton, club-key-mismatch — getrackt, kein Blocker) · #5 live-verify (Row-Parität SSR-Player-Count == anon-Client-Count).

**KRITISCH — curl notwendig aber NICHT hinreichend:** curl (anon, ohne Cookies) beweist nur „ist `<img stadium>` im SSR-HTML" (LCP-Win). Der echte Done-Gate = **Live-Walk** (dies ist der ERSTE Server-Render von PublicClubView+ClubHero, S476-Klasse):
1. **Ausgeloggt** Browser, Console offen (SW/Cache `bescout-v4` zuerst clearen, S474-Falle): Scan #418/#423/#425 + MISSING_MESSAGE; Hero paintet sofort, kein Flash.
2. **Eingeloggt** /club: Skeleton→authed, kein PublicClubView-Leak (Fall c/d).
3. **DE + TR** anon-SSR, kein Missing-Key.
4. **Row-Parität:** SSR-Player-Count == anon-Client-Count nach Hard-Reload.

**Learning (positiv, wiederverwendbar):** Auth-Gate-Decouple via `{user,resolved}`-Discriminator — server-confirmed-anon (`resolved && user===null`) als serialisierter boolean-Prop entkoppelt `authLoading` NUR für beweisbar-anon SSR; transiente Fehler fallen fail-safe auf Skeleton → kein #418. Sauberer als Option 2 (Bild auth-frei server-rendern), weil der ganze Public-Hero in den SSR kommt. → errors-frontend Ergänzung zu S474/476: ein SSR-Slice der einen client-only-Subtree ERSTMALS server-rendert braucht Live-Walk BEIDER Auth-Zustände als DoD (curl beweist nur HTML-Präsenz, nicht Hydration-Integrität).
