# Slice 133 — /clubs player-count (1000-row-cap) + Follow Optimistic

**Stand:** 2026-04-22
**Größe:** M (2 Files Core + 1 Test, eine Domain)
**CEO-Scope:** Nein (Bug-Fix, kein Money/Security/Breaking-Change)
**Priorität:** Beta-Blocker

---

## Ziel (ein Satz)

Auf `/clubs` zeigt jede Card die **echte** Spieler-Anzahl (z.B. Beşiktaş 20 statt 2, Alanyaspor 33 statt 7), und ein Follow-Klick aktualisiert „Deine Vereine" + Fans-Count **sofort** ohne sichtbare Latenz.

---

## Betroffene Files

| File | Was | Warum |
|---|---|---|
| `src/lib/services/club.ts` | `getClubsWithStats` refactor | PostgREST-1000-row-cap-Fix via `.range()`-Chunking für `players` + `club_followers` Queries |
| `src/components/providers/ClubProvider.tsx` | `toggleFollow` Optimistic Update | State sofort setzen, DB-Call im Hintergrund, on error revert |
| `src/app/(app)/clubs/page.tsx` | `handleToggleFollow`-Cleanup | Lokaler `setClubs`-Update läuft jetzt parallel zum Provider-Update (nicht mehr sequentiell nach 2 Roundtrips) |
| `src/lib/services/__tests__/club.test.ts` (NEU oder erweitert) | Chunking-Test | Unit-Test dass >1000 rows korrekt aggregiert werden (mock Supabase-Response) |

**Nicht betroffen:** RPC-Migration (Variant B) → bewusst vermieden, unnötiger Scope + Security-Review-Overhead für Beta-Blocker.

---

## Acceptance Criteria

1. **Card-Zahlen matchen DB:** Nach Deploy zeigt `/clubs` für Beşiktaş 20 Spieler, Alanyaspor 33, Galatasaray 35, Eyüpspor 47 (exakte DB-non-stale-Werte, SQL-Query im Proof).
2. **Service liefert alle Rows:** `getClubsWithStats({activeOnly:true})` returned ≥ 4200 distinct player-club-Tuples (aktuell: ~1000). Verifiziert via Test oder DB-Count-Vergleich.
3. **Follow-Click:** Button wechselt Label + `follower_count` steigt/fällt um 1 **innerhalb <50ms** (visuell „instant", keine Wartephase auf DB).
4. **„Deine Vereine" Section:** Erscheint sofort nach erstem Follow (Provider updated State optimistic, bevor DB-Call durch ist).
5. **Error-Recovery:** Wenn `toggleFollowClub` rejected, State wird zurückgerollt + `console.error` + (wenn Toast-Infrastruktur im Provider vorhanden) Error-Toast. Keine inkonsistente UI.
6. **Keine Regressions:** Auf `/club/[slug]` zeigt Kader-Tab weiterhin identische Zahl wie `/clubs`-Card für denselben Club (beide `activeOnly=true`).

---

## Edge Cases

1. **Exakt 1000 Rows Chunk:** `.range(0,999)` liefert 1000 rows — nächste Iteration mit `.range(1000,1999)` muss aufgerufen werden. Stop-Bedingung: `data.length < PAGE_SIZE`.
2. **0 Rows Total:** Kein Player in DB → Chunk-Loop läuft 1× mit leerem Result → `playerCounts` Map bleibt leer → alle Clubs `player_count: 0`. OK.
3. **Follow-Click während noch eine pending `toggleFollow` Promise läuft (Double-Click):** Provider muss Race-Protection haben oder State-Update ist idempotent.
4. **Network-Error mid-Chunk:** Throw sofort (wie Slice 082-Pattern), nicht teilweise ergebnis zurückgeben.
5. **Optimistic-Update bei Offline:** Wenn `toggleFollowClub` wegen Offline-Fehler rejected → Revert + Toast. User sieht kurzfristig Button-Change, dann Rücksprung.
6. **Parallel-Follow/Unfollow für DIFFERENT Club während Pending:** Beide müssen unabhängig voneinander bleiben (keine geteilte `isPending` global, sondern per-Club).
7. **Stale-Client-State nach Realtime-Update anderer Sessions:** Out-of-Scope (kein Realtime-Sync heute für `club_followers`). Ignorieren.
8. **Primary-Club-Switch bei Unfollow des aktiven Clubs:** Logik bleibt wie gehabt (`next = primary ?? followed[0] ?? null`). Nur der State-Update-Timing ändert sich.
9. **`follower_count` auf Card bei Race mit Provider-Update:** Der lokale `setClubs`-Update in `handleToggleFollow` setzt die Card-Zahl, Provider-Optimistic setzt „Deine Vereine"-Section. Beide laufen jetzt parallel, nicht sequentiell.
10. **`>1000 club_followers` in Zukunft:** Chunking gilt auch für den Follower-Query (aktuell ~15 Rows, aber future-proof).

---

## Proof-Plan

1. **DB-Query-Beweis:** `SELECT c.name, COUNT(*) FILTER (WHERE p.mv_source != 'transfermarkt_stale') FROM clubs c LEFT JOIN players p ON p.club_id = c.id GROUP BY c.id LIMIT 20` → `worklog/proofs/133-db-truth.txt`
2. **Service-Test:** `npx vitest run src/lib/services/__tests__/club.test.ts` → `worklog/proofs/133-service-chunking.txt` (Test deckt >1000 rows Szenario)
3. **Type-Check:** `npx tsc --noEmit` → clean
4. **Live-Playwright gegen bescout.net** (nach Deploy): Screenshot `/clubs` mit korrekten Zahlen → `worklog/proofs/133-clubs-page.png`
5. **Follow-UX Screenshot:** Before-Klick + During-Klick + After-Klick (Fans +1, „Deine Vereine" enthält neuen Club) → `worklog/proofs/133-follow-flow.png`
6. **Before/After Delta Screenshot:** Screenshot von heute (kaputt) + nach Deploy (korrekt) nebeneinander als Bilder → `worklog/proofs/133-before-after.md`

---

## Scope-Out (NICHT in diesem Slice)

- **RPC-Migration** (Variant B `rpc_clubs_with_stats`) — Post-Beta-Optimization, nicht nötig für Fix
- **Realtime-Sync** für `club_followers` (Cross-Session Live-Update)
- **Pagination der Club-Liste** (alle 134 Clubs auf einmal bleibt OK bei Card-Layout)
- **Refactor von `/club/[slug]`** (bereits korrekt via `usePlayersByClub(clubId, true)` — nur `/clubs`-Page betroffen)
- **Neue i18n-Keys** (keine User-Text-Änderung)
- **Stale-Filter-Toggle-UI** (Nutzer kann nicht manuell "auch stale zeigen" — out of scope)

---

## Risiken + Mitigation

| Risiko | Mitigation |
|---|---|
| Chunking-Logik-Bug (Off-by-one, Infinite-Loop) | Unit-Test + `if (data.length < PAGE_SIZE) break` als klare Stop-Bedingung |
| Provider-Optimistic breakt existierende `/club/[slug]`-Page | `useClubActions.ts` hat eigene lokale State-Logik → nicht vom Provider abhängig für follower_count. Provider-Change transparent für Detail-Seite |
| Race-Condition bei Double-Click | Per-Club `togglingId` bleibt (verhindert parallelen Toggle für denselben Club) |
| Chunk-Query läuft länger (4-5 roundtrips) | Messbar via Playwright nach Deploy — sollte trotzdem <500ms total sein bei ~4200 rows |

---

## Implementation-Sketch

**`club.ts` — `getClubsWithStats`:**
```ts
async function fetchAllInChunks<T>(
  buildQuery: (offset: number, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery(offset, pageSize);
    if (error) throw new Error(String(error));
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

// Replace `.limit(10000)` with range-based chunking for both players + club_followers.
```

**`ClubProvider.tsx` — `toggleFollow`:**
```ts
const toggleFollow = useCallback(async (clubId, clubName) => {
  if (!user) return;
  const currently = followedClubs.some(c => c.id === clubId);
  const targetClub = ... ; // resolve from cache (sync lookup via getClub)
  // Optimistic
  const nextFollowed = currently
    ? followedClubs.filter(c => c.id !== clubId)
    : [...followedClubs, targetClub];
  setFollowedClubs(nextFollowed);
  setPrimaryClub(nextFollowed[0] ?? null);
  try {
    await toggleFollowClub(user.id, clubId, clubName, !currently);
  } catch (err) {
    // Revert on error
    setFollowedClubs(followedClubs);
    setPrimaryClub(followedClubs[0] ?? null);
    throw err;
  }
  // Activate/deactivate active-club logic unverändert
});
```

---

## Estimated Time

- Service-Refactor + Test: 20 Min
- Provider Optimistic: 10 Min
- Manual smoke gegen bescout.net nach Deploy: 5 Min
- **Gesamt: 35-45 Min**
