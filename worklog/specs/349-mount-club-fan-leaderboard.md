# Slice 349 — Club-Fan-Treue-Board mounten (W2-B)

**Slice-Type:** UI
**Größe:** S
**S-Slice:** true (reine UI, kein Money/Security/Schema)

---

## 1. Problem-Statement (mit Evidence)

`getClubFanLeaderboard` (`src/lib/services/fanRanking.ts`) + `useClubFanLeaderboard` (`src/lib/queries/fanRanking.ts`) sind gebaut + per Vitest getestet, haben aber **0 UI-Consumer** (grep: nur Service/Query/Tests). Dokumentiert als **W2-B „Club-Fan-Treue-Board ist TOT"** in `docs/knowledge/domain/reward-ranking.md` + Pro-Stand-Roadmap Phase D / „Club-Fan-Board mounten". Anil-Wahl 2026-06-23: schneller sichtbarer Pro-Gewinn.

→ Ziel: Die Top-Fans-Rangliste eines Vereins auf der Club-Page sichtbar machen (Top-Treue-Fans nach `total_score`, mit Handle/Avatar/Tier).

## 2. Lösungs-Design

Neue Präsentations-Komponente `ClubFanLeaderboard` (analog bestehender `ClubLeaderboard` für Scout-Scores), die `useClubFanLeaderboard(clubId)` nutzt und eine Rangliste rendert. Mount im Club-Page-Tab „Mehr" direkt nach `FanRankOverview` (thematische Paarung: „dein Fan-Rang" → „die treuesten Fans des Vereins").

- Render-Vorlage: `src/components/rankings/ClubLeaderboard.tsx` (Card + States + scrollbare Liste + Rang# + CosmeticAvatar + Self-Highlight + Profil-Link).
- Tier-Anzeige via `FanRankBadge` (size sm) statt Scout-`RangScorePill`; zusätzlich `total_score` (font-mono).
- **Empty-Verhalten:** Bei 0 Fans (nicht-loading) → Komponente rendert `null` (kein leeres Karten-Rauschen auf den vielen Clubs ohne Fans; das Board erscheint nur wo es echten Inhalt hat).

## 3. Betroffene Files

- `src/components/gamification/ClubFanLeaderboard.tsx` (NEU) — neben `FanRankOverview`.
- `src/app/(app)/club/[slug]/ClubContent.tsx` — Mount im „Mehr"-Tab nach FanRankOverview (~Z547).
- `messages/de.json` + `messages/tr.json` — gamification-Namespace: Titel + Empty-Key (Empty nur falls wir doch eine Empty-Zeile zeigen; bei null-Render entfällt der Empty-Key → nur Titel-Key nötig).

## 4. Code-Reading-Liste (erledigt während Investigation)

1. `src/lib/queries/fanRanking.ts` ✅ — `useClubFanLeaderboard(clubId, limit=50)`, staleTime 5min, enabled !!clubId.
2. `src/lib/services/fanRanking.ts` `getClubFanLeaderboard` ✅ — Return `(DbFanRanking & { profile: { handle; avatar_url } })[]`, sortiert total_score desc, throw on error.
3. `src/components/rankings/ClubLeaderboard.tsx` ✅ — Render-Pattern (Card/States/Liste/Self-Highlight/Link).
4. `src/components/gamification/FanRankOverview.tsx` ✅ — Mount-Nachbar, FanRankBadge-Nutzung.
5. `src/app/(app)/club/[slug]/ClubContent.tsx` ✅ — „Mehr"-Tab-Struktur (`tab==='mehr'`), RevealSection, FanRankOverview @delay=50, userId/clubId/club.name vorhanden.
6. RLS `pg_policies fan_rankings` ✅ — `fan_rankings_select_leaderboard` qual=true → Board liest alle Zeilen.
7. Live-Daten `fan_rankings` ✅ — Sakaryaspor 37 Fans (alle mit Handle), sonst 0.

## 5. Pattern-References

- **errors-frontend.md „Dead-Wrapper / Build-without-Wire" (D54):** dies ist die Aktivierungs-Seite davon — tote Brücke mounten.
- **ui-components.md States:** Loading-Skeleton, Empty (hier: null), Error+Retry alle implementieren.
- **CosmeticAvatar / FanRankBadge / Card / ErrorState** aus `@/components/ui` bzw. gamification (bestehende Bausteine).
- **performance.md:** Hook hat bereits 5min staleTime + limit(50) — kein 1000-cap-Risiko (Clubs ≪ 1000 Fans).

## 6. Acceptance Criteria

- **AC1** `ClubFanLeaderboard` rendert für Sakaryaspor (`/club/sakaryaspor`, Tab „Mehr") eine Rangliste mit ≥1 Fan, Top-Fan oben, Rang-Nummer + Handle + Tier-Badge + total_score. VERIFY: Playwright gegen bescout.net.
- **AC2** Self-Highlight: eigene Zeile (wenn eingeloggt + im Board) visuell hervorgehoben (gold). VERIFY: Playwright (jarvis-qa-Account, falls im Board) ODER Code-Review der Bedingung.
- **AC3** Loading zeigt Skeleton/Spinner (kein Layout-Jump), Error zeigt ErrorState + Retry. VERIFY: Code-Review + (Loading) Playwright-Slow.
- **AC4** Empty (Club ohne Fans) → Komponente rendert `null` (kein leeres Karten-Rauschen). VERIFY: Playwright auf einem 0-Fans-Club (z.B. ein Bundesliga-Club) → Board-Card absent.
- **AC5** Mobile 393px: kein horizontaler Overflow, Touch-Targets ≥44px (Profil-Link-Zeilen). VERIFY: Playwright 393px.
- **AC6** i18n DE+TR: Titel + ggf. Texte, kein MISSING_MESSAGE in Console. VERIFY: Live-Render-Console-Scan.
- **AC7** `pnpm exec tsc --noEmit` grün + neue Vitest für die Komponente grün. VERIFY: tsc + vitest.

## 7. Edge Cases

| # | Fall | Erwartung |
|---|------|-----------|
| 1 | Club mit 0 Fans | Komponente rendert null (kein Empty-Card) |
| 2 | anon Besucher | Board sichtbar (public RLS), kein Self-Highlight |
| 3 | eingeloggter Fan im Board | eigene Zeile gold-hervorgehoben |
| 4 | Fan ohne Profil (handle null) | `profiles!inner`-Join droppt die Zeile serverseitig → erscheint nicht (ok) |
| 5 | sehr viele Fans (>Viewport) | scrollbare Liste `max-h` + `scrollbar-hide` |
| 6 | Query-Error | ErrorState + Retry, kein Crash |
| 7 | clubId undefined | Hook disabled, Komponente rendert null (Guard) |
| 8 | gleicher total_score | stabile Reihenfolge egal (kein Money), Anzeige tolerant |

## 8. Self-Verification Commands

```bash
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/gamification/__tests__/ClubFanLeaderboard.test.tsx
grep -rn "ClubFanLeaderboard" src/   # Mount-Verkabelung verifizieren (≥1 Consumer)
# i18n-Keys vorhanden (namespace-aware):
node -e "const m=require('./messages/de.json'); console.log(m.gamification?.<key> ?? 'MISSING')"
```
Playwright: `QA_BASE_URL=https://bescout.net npx tsx e2e/qa-349-fan-board.ts` (oder qa-Template) — Tab „Mehr" auf /club/sakaryaspor, Screenshot desktop + 393px, Console-Scan.

## 9. Open Questions
- **Pflicht-Klärung:** keine (UI, CTO-Scope). Design-Default: Empty→null, Mount nach FanRankOverview.
- **Autonom-Zone:** exakte Icon-/Titel-Wahl, Anzahl sichtbarer Zeilen, ob `display_name` (gibt es nicht im Return → Handle).

## 10. Proof-Plan
- `worklog/proofs/349-fan-board.*`: Playwright-Screenshot Sakaryaspor „Mehr"-Tab (Board mit Fans) desktop + 393px + Console-clean; vitest-Output; tsc clean; grep-Mount-Beleg.

## 11. Scope-Out
- Keine DB/RPC/Schema-Änderung (Hook + Service existieren).
- Kein neuer Query-Key (qk.fanRanking.leaderboard existiert).
- Keine Änderung an FanRankOverview / Scout-ClubLeaderboard.
- Keine Paginierung über limit(50) hinaus (Clubs ≪ 50 relevante Top-Fans in Beta).
- `display_name` nicht nachrüsten (Return liefert nur handle).

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (inline) → BUILD (Komponente + Mount + i18n + Vitest) → REVIEW (Cold-Context) → PROVE (Playwright bescout.net + vitest + tsc) → LOG.

## 13. Pre-Mortem (S, knapp)
1. **RLS blockt Leaderboard** → bereits verifiziert (qual=true). ✓
2. **Datenform-Mismatch** (nested `profile` vs flat) → Service gibt `profile.handle`/`profile.avatar_url`; Komponente liest nested. Code-Review-Punkt.
3. **Leeres Card-Rauschen auf 0-Fan-Clubs** → null-Render bei empty.
4. **MISSING_MESSAGE** (i18n) → Live-Console-Scan (333-Falle: namespace-aware prüfen).
5. **Mobile-Overflow** durch lange Handles → `truncate` auf Handle-Span.
