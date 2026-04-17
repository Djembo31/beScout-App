# Slice 015 — B1 Logout React Query Cache Clear

## Ziel

Nach jedem User-State-Verlust (nicht nur explizitem `SIGNED_OUT`) wird der React Query Cache geleert, damit auf Re-Login keine Fremd-Daten mehr sichtbar sind.

## Hintergrund

Flow-Audit Flow 15 markierte "React Query Cache nicht explizit geleert" als Restrisiko GELB. Der Code hat inzwischen (Commit `9ca17bd8`, React-Query-Migration) einen `setTimeout(() => queryClient.clear(), 0)` **nur** fuer `event === 'SIGNED_OUT'`. Das deckt den expliziten Logout-Knopf in `SideNav.tsx:57-60` und den Stale-Session-Recovery-Pfad in `onboarding/page.tsx:210` (`signOut()` feuert immer SIGNED_OUT).

Nicht gedeckt ist der **Silent-Expire-Pfad**:
- User 1 eingeloggt, cached in `sessionStorage`.
- Token silent expired (z.B. Netzwerk-down, Refresh fehlgeschlagen, Admin-Revoke).
- AuthProvider: `onAuthStateChange` feuert `INITIAL_SESSION` mit `session=null` waehrend `hadCachedUser=true`.
- Grace-Period-Timer laeuft 3s → ruft `clearUserState(event)` mit `event !== 'SIGNED_OUT'`.
- `ssClear()` loescht sessionStorage. `queryClient.clear()` laeuft **nicht**.
- User 2 loggt sich ein im selben Tab → `SIGNED_IN` → `loadProfile(u.id)` → Queries sehen Cache-Hits aus User 1.

## Betroffene Files

| File | Zeilen | Aenderung |
|------|--------|-----------|
| `src/components/providers/AuthProvider.tsx` | 252-255 | `queryClient.clear()` unbedingt, nicht mehr an `event === 'SIGNED_OUT'` gated |

Ein File, eine Edit, keine neuen Imports.

## Nicht betroffen

- `src/lib/services/auth.ts` — `signOut()` bleibt wie es ist (duenner Wrapper).
- `src/components/layout/SideNav.tsx` — `handleLogout` bleibt wie es ist (kein zusaetzlicher `queryClient.clear()`-Aufruf; AuthProvider uebernimmt).
- `src/app/(auth)/onboarding/page.tsx:210` — Stale-Session-Recovery triggert `signOut()` → `SIGNED_OUT`-Event → Cache wird weiterhin gecleart.

## Acceptance Criteria

1. `queryClient.clear()` laeuft bei **jedem** Aufruf von `clearUserState(event)`, unabhaengig vom `event`-Wert.
2. `clearUserState` wird weiterhin nur aus diesen Pfaden aufgerufen:
   - `event === 'SIGNED_OUT'` (expliziter Logout)
   - Grace-Period-Timer-Expire (`hadCachedUser && !initialDone` → 3s Timeout)
   - Sonstiger `session=null`-Fall in `onAuthStateChange`-Branch (kein cached user, kein SIGNED_OUT)
3. `queryClient.clear()` laeuft **nicht** bei `TOKEN_REFRESHED` (dort weiter `invalidateQueries()`).
4. `queryClient.clear()` laeuft **nicht** waehrend der Grace-Periode (nur nach Expire).
5. `npx tsc --noEmit` clean.
6. Bestehende Tests gruen: `npx vitest run src/lib/__tests__/ src/lib/services/__tests__/ src/lib/auth/`.
7. Keine anderen Verhaltensaenderungen (Login-Pfad, Session-Restore, TOKEN_REFRESHED, SIGNED_IN).

## Edge Cases

1. **Explizit-Logout** (SideNav-Button): signOut() → SIGNED_OUT → clearUserState('SIGNED_OUT') → queryClient.clear() laeuft. **Unveraendert.**
2. **Stale-Session-Recovery** (onboarding, FK-Error): signOut() → SIGNED_OUT. **Unveraendert.**
3. **Silent-Token-Expire** bei App-Start: Cached user vorhanden, INITIAL_SESSION=null → Grace 3s → expire → clearUserState. **Neu: queryClient.clear() laeuft.**
4. **Admin-Revoke** bei aktiver Session: Supabase feuert `SIGNED_OUT` irgendwann (per Realtime-Auth-Channel). Dann SIGNED_OUT-Pfad. **Unveraendert.**
5. **Doppel-Logout-Klick**: setTimeout(0) ist idempotent, `queryClient.clear()` auf leerem Cache ist no-op. **Unveraendert.**
6. **Erster Page-Load ohne Session** (kein cached user): INITIAL_SESSION=null, `hadCachedUser=false` → kein grace-period, `clearUserState` wird sofort aufgerufen. Jetzt laeuft `queryClient.clear()` auch hier — aber Cache ist nach Fresh-Boot leer, ebenfalls no-op. Safe.
7. **TOKEN_REFRESHED wegen Expired**: `session.user` gesetzt, `setUser(u)` + `invalidateQueries()`. `clearUserState` wird nicht aufgerufen. **Unveraendert.**
8. **Network-Offline beim SignOut**: `supabase.auth.signOut()` clearto local token auch offline → `SIGNED_OUT` feuert → Pfad unveraendert.
9. **Tab-Wechsel waehrend Logout**: setTimeout(0) queued auf Event-Loop der aktuellen Tab — Tab-Wechsel unterbricht das nicht.
10. **Logout auf Admin-Panel** mit laufender Mutation: Mutation wird via queryClient.clear() abgebrochen/verworfen. Acceptable — auf Logout sollen In-Flight-Requests nicht weiterlaufen.

## Proof-Plan

- `worklog/proofs/015-diff.txt` — `git diff` der 1-File-Aenderung (Kontext rundherum).
- `worklog/proofs/015-tsc.txt` — `npx tsc --noEmit` Output (erwartet: leer).
- `worklog/proofs/015-flow-trace.md` — Code-Flow-Trace: 6 Logout-Szenarien, je Trigger → onAuthStateChange-Branch → clearUserState-Aufruf → Cache-Clear-Entscheidung. Vorher/Nachher-Vergleich.
- `worklog/proofs/015-tests.txt` — `npx vitest run` auf Auth-relevante Tests (auth/rls-checks, db-invariants). Erwartet: alle gruen.

**Kein Playwright-E2E** — Grace-Period-Expire + Token-Expire sind schwer reproduzierbar ohne Test-Harness fuer Supabase-Auth-Events. Der Code-Flow-Trace dient als Equivalent zum Test.

## Scope-Out

- **SessionStorage-Clear robust gegen quota** (Flow 15 zweites Restrisiko) — separater Slice.
- **Confirmation-State cleared nicht bei Navigation-Away** (Flow 15 drittes Restrisiko) — separater Slice.
- **Unit-Test fuer AuthProvider clearUserState** — React-Integration, Mock-Supabase-Auth-Events, separater Slice (grosse Infrastruktur).
- **`router.push('/login')` VOR signOut-complete in SideNav** — theoretischer Race, aber `setTimeout(0)` sub-ms schnell in Praxis. Nicht in Scope.
- **`useRequireProfile` bei Session-Loss** — redirect-logic-seitig, separater Slice.
- **Weitere Flow-Audit-Restrisiken B2-B5** — separate Slices.

## Slice-Klassifikation

- **Groesse:** S (1 File, 1-File-Edit, ~3 Zeilen veraendert inkl. Kommentar)
- **CEO-Scope:** Per Matrix waere "Session-Management" CEO. **Explizit freigegeben** via Briefing (`memory/next-session-briefing-2026-04-17-late.md` + Commit `f0c9bdc7`): "B1 | CTO-autonom". Keine weitere Approval noetig.
- **Risiko:** Niedrig — Verhalten wird enger (aggressiveres Cache-Clearing), kein zusaetzlicher State-Machine-Branch, kein neuer API-Call.
