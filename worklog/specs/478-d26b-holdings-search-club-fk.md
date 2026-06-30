# Slice 478 — D-26b Holdings + Search Mapper Club-FK-Resolve

**Slice-Type:** Service
**Größe:** XS (triviale Pattern-Wiederholung von Slice 477; 2 Mapper, je 1 Logik-Zeile, `club_id` bereits in Row)
**Scope:** CTO-autonom (Display + Fantasy-Eligibility-Preview; Server `rpc_save_lineup` autoritativ → kein Money-Bug)
**Welle:** Mock→Pro Konsistenz-Batch (disease-register D-26b)

---

## 1. Problem-Statement (Evidence)
477 heilte `players.club`-Freitext im `dbToPlayer`-Mapper. **Reviewer S477 Finding #2 (priorisiert):** der **Holdings-Mapper** (`holdingMapper.ts:41 club: h.player.club`) bleibt stale → das Fantasy-Event-Requirement-Gate (`useLineupBuilder.ts:358-362`) matcht `holding.club.toLowerCase().includes(specificClub)` gegen den Freitext → divergenter Spieler (Adli FK „Bayer Leverkusen", Freitext „Bournemouth") matcht ein „aus Bayer Leverkusen"-Requirement **falsch** (eligibility-affecting, nicht nur kosmetisch). `search.ts:96` (⌘K-Overlay via `spotlightSearch`) trägt dieselbe stale Freitext-Zuweisung.

Beide Mapper haben `club_id` bereits in der Row → derselbe triviale 477-Fix anwendbar.

## 2. Lösungs-Design
Identisches SSOT-Muster wie 477 (`getClub(club_id)?.name ?? freetext`):
- **`holdingMapper.ts:41`** — `clubLookup` ist Z.33 **bereits berechnet** (für die Liga). → `club: clubLookup?.name ?? h.player.club ?? ''`. Null-Reuse, kein neuer getClub-Call.
- **`search.ts:96`** — `club: getClub(p.club_id)?.name ?? p.club` (getClub-Import prüfen/ergänzen).
Graceful Fallback bei NULL `club_id` ODER Cache-cold (identisch zu 477).

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/features/fantasy/mappers/holdingMapper.ts:41` | `club:` via bestehendes `clubLookup?.name` (1 Zeile) |
| `src/lib/services/search.ts:96` | `club:` via `getClub(p.club_id)?.name` (1 Zeile + ggf. Import) |
| ggf. Tests der beiden Mapper | Verify grün / FK-Resolve-Test |

## 4. Code-Reading-Liste (DONE)
1. `holdingMapper.ts:33,41` — `clubLookup = club_id ? getClub : null` schon da (Liga), nur Name auf Freitext. ✓
2. `useLineupBuilder.ts:358-362` — Eligibility-Gate liest `holding.club`-Namen (substring-match gg. `specificClub`) → Fix heilt es. ✓
3. `search.ts:80,96-97` — Select hat `club_id`; mappt `club: p.club, clubId: p.club_id`. ✓
4. `SearchOverlay.tsx:9` — Konsument von `spotlightSearch` (⌘K). ✓
5. Slice 477 — kanonisches Muster + Reviewer-Round-Trip-Beleg (getClub(club_id).name ist Cache-Key). ✓

## 5. Pattern-References
- Slice 477 (D-26 Player-Domäne) — exakt dieses Muster, Reviewer PASS.
- errors-frontend.md S368b (Display-Anker aus Source-of-Truth).
- CLAUDE.md §0.3 (ein kanonischer Wert pro Mapper-Feld).

## 6. Acceptance Criteria
- **AC-1** `holdingMapper` mit `club_id`+ready Cache → `holding.club` = FK-Name. VERIFY: Unit (getClub gemockt). 
- **AC-2** NULL `club_id` / Cache-cold → Freitext-Fallback. VERIFY: Unit.
- **AC-3** `search.ts` mit `club_id` → FK-Name; sonst Fallback. VERIFY: Unit/tsc.
- **AC-4** tsc 0 + bestehende Mapper-Tests grün.
- **AC-5** Eligibility-Logik-Trace: divergenter Spieler matcht jetzt das korrekte `specificClub`-Requirement (Code-Trace + ggf. Unit).

## 7. Edge Cases
NULL club_id → Freitext · Cache-cold → Freitext · club_id orphan → Freitext · freetext==FK → idempotent · clubLookup.name leer → Freitext (`??` greift nur null/undefined).

## 8. Self-Verification
```bash
npx tsc --noEmit
npx vitest run src/features/fantasy/mappers src/lib/services/__tests__
grep -n "club:" src/features/fantasy/mappers/holdingMapper.ts src/lib/services/search.ts
```

## 9. Open-Questions
Keine Pflicht-Klärung / kein CEO-Scope (Display + Client-Preview, money-neutral). Autonom-Zone: Fix-Form.

## 10. Proof-Plan
`worklog/proofs/478-d26b-holdings-search.txt`: tsc 0 + vitest + grep 2-Zeilen-Change + Eligibility-Trace.

## 11. Scope-Out (→ D-26c)
**Kein `club_id` in Row → Select-/RPC-Change nötig (separater Slice, Impact-Analyse auf Consumer):** `watchlist.ts:123` · `lineups.queries.ts:161` · `offers.ts:43` · `trading.ts:410` (getGlobalMovers/Trending = RPC liefert nur Freitext). + Player-Detail Cold-Load-Cache-Race (S286, separat).

## 12. Stage-Chain
SPEC → BUILD (2 Files) → REVIEW (self-review, XS triviale 477-Wiederholung; Pattern + Round-Trip schon in 477 reviewer-validiert) → PROVE (vitest+tsc+Trace) → LOG (+ Register D-26b Teil-geheilt, D-26c angelegt).

## 13. Pre-Mortem (kurz)
- „Eligibility-Match bricht" → Nein, FK-Name == kanonischer `specificClub` (beide aus Club-Liste); Fix richtet Holding-Seite auf Kanon aus.
- „search.ts kein getClub-Import" → beim Build prüfen + ergänzen.
- „holdingMapper-Test asserted Freitext" → wie 477: Fallback hält Cache-cold-Tests grün; FK-Test mit Mock.
