# Slice 477 — D-26 Player-Domain Club-Identität (dbToPlayer FK-Resolve)

**Slice-Type:** Service
**Größe:** S
**Scope:** CTO-autonom (Display/Service, money-neutral, kein Security/RLS/Money-Path)
**Welle:** Mock→Pro Konsistenz-Batch (disease-register D-26)

---

## 1. Problem-Statement (mit Evidence)

`players.club` ist ein **stale Freitext-String**. Die Fantasy-/Fixture-/Scoring-Domäne wurde 422-425 auf `players.club_id` (FK → `clubs`) als Club-Wahrheit migriert; die **Player-Domäne liest weiterhin den Freitext** → falscher Club-Name + falsches Wappen.

**Live-DB-Evidence (`skzjfhvgccaeplydsunz`, 2026-06-30, dieser Session verifiziert):**
- **294 von 4472 gemappten Spielern (6,57 %)** haben `players.club` ≠ FK-aufgelösten `clubs.name`.
- Stichprobe = **echte Falsch-Clubs, keine Formatierung**: Amine Adli Freitext „Bournemouth" vs FK „Bayer Leverkusen"; Edson Álvarez „Fenerbahçe" vs „West Ham"; Sofyan Amrabat „Real Betis" vs „Fenerbahçe".
- **Selbst-widersprüchliche Karte (PlayerHero):** Liga-Badge wird bereits aus `club_id` abgeleitet (`players.ts:210-214` → `PlayerHero.tsx:192`), Club-Name+Wappen aber aus Freitext (`PlayerHero.tsx:70/210`). Adli → Karte zeigt „Bournemouth" (PL-Club) MIT **Bundesliga**-Badge. = sichtbar falsche Wahrheit auf dem Hauptflow.

**Priorität: P1** (sichtbar falsche Wahrheit, Hauptflow, CTO-autonom, kein Money/Security). Register: `disease-register.md` D-26.

## 2. Lösungs-Design

**EIN SSOT-Schnitt an der Mapper-Grenze.** `dbToPlayer` (`players.ts:198`) löst Liga schon FK-basiert auf (Z.210-214, Muster `db.club_id ? getClub(db.club_id)?.X : undefined`). Der Club-Name (Z.207 `club: db.club`) blieb Freitext — genau diese Inkonsistenz erzeugt die widersprüchliche Karte.

**Fix (Z.207):**
```ts
club: db.club_id ? (getClub(db.club_id)?.name ?? db.club) : db.club,
```
- `club_id` gesetzt + Cache ready → kanonischer FK-Name (round-trip: `getClub(club_id).name` ist selbst ein Cache-Key → `getClub(player.club)` in PlayerHero resolved danach garantiert das korrekte Wappen).
- `club_id` NULL **oder** Cache nicht ready → Fallback auf Freitext (graceful, exakt wie Liga heute undefined wird). Kein neues Muster, kein neues Risiko.

**Warum Mapper statt Komponente:** SSOT (CLAUDE.md §0.3 „ein Job pro Artefakt"). Eine Zeile heilt ALLE `dbToPlayer`-Konsumenten konsistent statt N Komponenten-Patches (= der „Teil-Heal" den das Register nennt). Folgt + vervollständigt das bestehende 326/422-425-Resolve-Muster im selben Mapper.

## 3. Betroffene Files + Cascade (= Impact-Analyse, Consumer-Grep durchgeführt)

| File | Änderung |
|------|----------|
| `src/lib/services/players.ts:207` | `club:`-Resolve via `club_id` (1 Zeile) |
| `src/lib/services/__tests__/players.test.ts` | AC-Verify: bestehender Test bleibt grün (Fallback-Pfad), ggf. neuer Test für FK-Resolve |

**Cascade (geheilt durch den EINEN Mapper-Fix — `dbToPlayer`/`dbToPlayers`-Konsumenten, grep-verifiziert):**
- `usePlayerDetailData.ts:125` → **PlayerHero** (Player-Detail-Karte)
- `lib/queries/players.ts:36/96/110/124` → Markt-Liste, ByIds, Global-Movers, Suche
- `useClubData.ts:70` → Club-Seiten-Spieler (inkl. IPO/ClubVerkaufSection)
- `useAdminPlayersState.ts` → Admin-Player-Tab
- `components/player/index.tsx:378` (`getClub(player.club)`) → Player-Card-Display

**Side-Effects:** keine. Reine Read-Mapper-Display-Auflösung. Kein Schema-/RPC-/RLS-/Cache-Key-Change. Money-neutral (Club-Name ist nirgends Geld-/Score-Input — Scoring/Fantasy nutzen `club_id` direkt).

## 4. Code-Reading-Liste (vor Code — DONE diese Session)

| # | File | Zweck / geprüfte Frage |
|---|------|------------------------|
| 1 | `src/lib/services/players.ts:198-214` | Mapper-Form; Liga bereits FK-resolved, Club nicht → Z.207 ist die EINE Stelle. ✓ |
| 2 | `src/lib/clubs.ts:162` (`getClub`) | Lookup über UUID/slug/name/short; `getClub(club_id).name` ist round-trip-sicher (Name ist selbst Cache-Key). ✓ |
| 3 | `src/components/player/detail/PlayerHero.tsx:70,181,210` | Konsumiert `player.club` für Logo (`getClub`) + Anzeige + TradingCardFrame → cascaded. ✓ |
| 4 | `src/lib/services/__tests__/players.test.ts:108-126` | Unit ohne Cache → `getClub`→null → Fallback `db.club`='Sakaryaspor' → Test bleibt grün. ✓ |
| 5 | `src/features/manager/components/kader/KaderTab.tsx:284`, `useLineupBuilder.ts:238`, `FantasyPlayerRow.tsx:81` | Kanonisches Muster `clubId ? getClub(clubId) : getClub(club)` (422-425) — mein Mapper-Fix ist die Service-seitige SSOT-Variante davon. ✓ |
| 6 | `grep '\.club\b' src/` | Konsumenten von `player.club`: Display (cascaded korrekt) + Such-Match (`MarketSearch:62`, `usePlayerTrading:536`) — FK-Name verbessert Suche, keine Regression. Separate Mapper (Watchlist/Home-Strips/Offers) = Scope-Out §11. ✓ |

## 5. Pattern-References

- **CLAUDE.md §0.3** „Ein Job pro Artefakt (SSOT)" — Mapper-Grenze ist die kanonische Auflösungs-Stelle.
- **errors-frontend.md S368b** „Display-Anker aus Source-of-Truth, nicht aus vergifteter denormalisierter Spalte" — exakt dieser Fall (`players.club` = stale Convenience-Spalte; FK = Wahrheit).
- **Slices 326/422-425** — die FK-Resolve-Migration der Liga/Fantasy-Domäne; dieser Slice schließt die Player-Domänen-Lücke desselben Musters.
- **errors-frontend.md J3+J4** „Multi-League Props-Propagation" — `club*` ↔ `league*` spiegelbildlich; Liga war FK, Club nicht → Inkonsistenz.

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** `dbToPlayer({club:'Bournemouth', club_id:<Leverkusen-uuid>})` mit ready Cache → `player.club === 'Bayer Leverkusen'`. VERIFY: Live-DB-Re-Query divergent-count + Unit mit gemocktem getClub. EXPECTED: FK-Name. FAIL-IF: Freitext.
- **AC-2 [FALLBACK]** `club_id` NULL → `player.club === db.club` (Freitext). VERIFY: Unit. EXPECTED: Freitext-Fallback.
- **AC-3 [CACHE-COLD]** `getClub` returnt null (Cache nicht ready, Unit-Default) → Fallback `db.club`. VERIFY: bestehender `players.test.ts:116` bleibt grün ('Sakaryaspor'). EXPECTED: PASS unverändert.
- **AC-4 [REGRESSION]** Alle `players.test.ts` + `usePlayerDetailData.test.ts` grün. VERIFY: `npx vitest run src/lib/services/__tests__/players.test.ts src/components/player`. EXPECTED: pass.
- **AC-5 [TYPES]** `npx tsc --noEmit` 0 Fehler.
- **AC-6 [LIVE-RENDER]** bescout.net Player-Detail eines divergenten Spielers (z.B. Adli) zeigt Club-Name == Liga-Land konsistent (Bayer Leverkusen + Bundesliga), Wappen = Leverkusen. VERIFY: Playwright/MCP gegen Prod nach Deploy. EXPECTED: konsistente Karte. FAIL-IF: „Bournemouth" + BL-Badge.

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| `club_id` NULL (84 Spieler live) | Fallback Freitext (AC-2) — keine Verschlechterung |
| Cache noch nicht geladen (Cold-Start) | Fallback Freitext, 1 Tick später korrekt (wie Liga heute) |
| `club_id` zeigt auf gelöschten Club (FK-orphan) | `getClub`→null → Fallback Freitext |
| Freitext == FK-Name (93,4 % der Fälle) | Idempotent, kein sichtbarer Change |
| Spieler ohne Club (frei) | `club_id` NULL → Freitext/leer wie bisher |
| `getClub(club_id).name` leer/`''` | `?? db.club` greift nur bei null/undefined, nicht bei `''` → unwahrscheinlich (clubs.name NOT NULL); falls leer → leerer Name (kein Crash) |

## 8. Self-Verification Commands

```bash
# Divergenz-Count Live (vor/nach konzeptuell — Fix ist Render, DB unverändert):
# (Beweist nur: Magnitude real; der Fix ändert Anzeige, nicht DB)
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/players.test.ts
npx vitest run src/components/player
grep -n "club: db" src/lib/services/players.ts   # verify exakt 1 geänderte Zeile
```
+ Live-DB (Proof): `SELECT count(*) ... WHERE p.club IS DISTINCT FROM c.name` (Magnitude-Beleg) + Playwright Player-Detail Adli.

## 9. Open-Questions

- **Autonom-Zone (CTO):** Mapper-Fix-Form, Test-Anpassung, Scope-Schnitt. → entschieden: Mapper-SSOT.
- **Keine Pflicht-Klärung / kein CEO-Scope:** money-neutral, kein Security, kein Wording (Club-Eigennamen, keine Compliance-Begriffe).

## 10. Proof-Plan

1. `worklog/proofs/477-player-club-identity.txt`: tsc-0 + vitest-Output (players + player-detail) + grep-Beleg 1-Zeilen-Change + Live-DB-Divergenz-Count (Magnitude).
2. Post-Deploy: Playwright-Screenshot bescout.net Player-Detail (divergenter Spieler) — konsistente Karte (Name == Liga, korrektes Wappen). `.png`.

## 11. Scope-Out (bewusst NICHT in diesem Slice)

- **Watchlist** (`watchlist.ts`-Mapper), **Home-Strips** (TrendingPlayers/TopMovers/MostWatched — eigene RPCs liefern `.club`-Freitext server-seitig), **OffersTab/Compare** (raw-DB-Rows). → eigene Folge-Slice (D-26-Rest), separate Mapper. Ehrlich geparkt im Register.
- **Kein Backfill** von `players.club` (Slice-114-Klasse verboten, errors-db S303; FK = Wahrheit, Freitext bleibt stale-aber-ungelesen). API-Key bleibt irrelevant (reiner Render-Heal).
- `players.club`-Spalten-DROP — separate Datenmodell-Entscheidung (Such-Match nutzt sie noch).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (inline §3, Consumer-Grep done) → BUILD (1 File + Test) → REVIEW (reviewer-Agent, S-Größe) → PROVE (vitest+tsc+DB-Count, Playwright post-Deploy) → LOG (+ disease-register D-26 Teil-geheilt, +errors-Pattern falls neu).

## 13. Pre-Mortem (optional bei S — kurz)

- **„Mapper-Fix bricht Such-Funktion"** → Nein: Suche matcht jetzt korrekten Club-Namen (Verbesserung), kein exakter-Freitext-Vertrag.
- **„Cache-Race zeigt kurz Freitext"** → akzeptiert, identisch zur bestehenden Liga-Auflösung; 1-Tick.
- **„Test bricht"** → geprüft: Fallback-Pfad hält `players.test.ts:116` grün.
- **„Andere Surfaces noch falsch → falsche Closure-Behauptung"** → ehrlich als Scope-Out §11 + Register-Teil-Heal protokolliert, nicht als „D-26 komplett".
