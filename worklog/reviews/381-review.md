# Review — Slice 381 (E-2a: BeScout-Saison — Begriffs-Umzug + Pro-Liga-Ranglisten-Anzeige)

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · **Datum:** 2026-06-25 · **time-spent:** ~14 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `LeagueScopeHeader.tsx:99` (×2 auf /rankings) | Pro-Liga-Modus mountet zweite `LeagueScopeHeader` → zwei DOM-Knoten mit identischem `data-testid="league-scope-header"`. Kein Runtime-Bug (beide lesen denselben `useLeagueScope`-SSOT, synchron), aber Playwright-Selektoren via testid mehrdeutig. | Bei testid-getriebenen Proofs Locator scopen (`.first()`/`.last()`). Optional künftig `testIdSuffix`-Prop. Kein Merge-Blocker. |
| 2 | NIT | Spec §2 vs. Code | Spec-TR-Tabelle nennt `rankings.seasonScore`-Label; Component nutzt es nicht (Score steht label-los rechts mit `seasonEventCount` darunter). Kein dead key in messages (nie angelegt) → nur Spec-Drift. | Harmlos; Display ist im Trophy-Card-Kontext eindeutig. |

**Beide NITs akzeptiert, non-blocking.** NIT #1 in PROVE berücksichtigt (Locator gescoped).

## One-Line
Ja — ein Senior merged das: chirurgischer Rename + read-only SEC-DEFINER-RPC mit korrektem AR-44-Grant-Block, throw-statt-swallow im Service, vollständige States, DE+TR komplett + namespace-korrekt; offene Punkte kosmetisch.

## Verifizierte Punkte (Auszug)
- **RPC:** SEC DEFINER + STABLE + AR-44 (REVOKE PUBLIC+anon / GRANT authenticated), Live-ACL `{postgres,authenticated,service_role}` kein anon. Aggregat korrekt (is_liga_event+ended+league-Filter, COALESCE SUM, INNER JOIN profiles = kein Geist, ROW_NUMBER 3-stufiger Tie-Break, JSONB-Return gegen S270d, p_limit-Clamp).
- **Money/Security:** 0-Money (read-only), kein PII-Leak (Public-Profil-Projektion, S095-Boundary).
- **Frontend:** throw-statt-swallow (S371), enabled-Guard Pro-Liga-ohne-Liga, States vollständig (Pick→Loading→Error→Empty→List, isError+isLoading beide destrukturiert S283), Mobile 393px (flex-shrink-0 Pills, tabular-nums, locale-aware), a11y (role=tablist/tab/aria-selected). Doppel-Header SSOT-synchron, kein State-Drift/Doppel-Fetch.
- **Rename:** nur Nutzer-Wettbewerb; Fußball-Liga-Strings (modeLiga/modeLeague/leagueLabel/clubLeagueLabel/leagueFilter/fieldLeague) unverändert; Namespaces korrekt (EventCardView=fantasy, ScoutCard=profile), kein MISSING_MESSAGE (S333).
- **Compliance:** TR konform (kein kazan*/yatırım/ödül), unverfänglich.

## Knowledge
Kein neuer Bug-Pattern. Bestätigtes Positiv-Pattern (read-only Cross-User-Aggregat = SEC-DEFINER + Public-Projektion + JSONB-Return + AR-44) bereits in errors-db dokumentiert. Kein Draft nötig.
