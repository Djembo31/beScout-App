# Review — Slice 478 (D-26b Holdings + Search Mapper Club-FK-Resolve)

**Self-Review** (XS, triviale Pattern-Wiederholung von Slice 477 — getClub(club_id)?.name ?? freetext; Muster + Round-Trip-Sicherheit in 477 vom Cold-Context-Reviewer validiert, hier 1:1 auf 2 weitere Mapper mit verfügbarem club_id angewandt). · 2026-06-30
**Verdict: PASS**

## Geprüft
1. **Korrektheit (holdingMapper):** `clubLookup` (Z.33) war bereits für die Liga-Auflösung berechnet — Reuse für den Namen ist null-redundant + folgt exakt dem bestehenden Muster im selben Mapper. Fallback `?? h.player.club ?? ''` greift nur bei null/undefined → Cache-cold/NULL club_id unverändert. ✓
2. **Korrektheit (search.ts):** `getClub(p.club_id)?.name ?? p.club` — club_id ist im Select (Z.80). getClub-Import ergänzt. Round-trip-sicher (getClub(club_id).name ist Cache-Key, 477-Beleg). ✓
3. **Eligibility-Wirkung:** useLineupBuilder:358-362 matcht `holding.club` (Name-Substring) gg. `specificClub` → FK-Name = kanonisch → korrektes Matching. Server `rpc_save_lineup` autoritativ → kein Money-Bug (Client-Preview-Korrektheit). ✓
4. **Test-Korrektheit:** search.test-Mock-Lücke (getClub fehlte → Import-Fehler → []) gefixt durch getClub-Lookup im Mock + AC-3-Assertion (FK überschreibt Freitext). holdingMapper.test: vi.hoisted getClub-Mock (Default-reset undefined → bestehende Tests sehen Fallback, unverändert) + 2 neue FK/Fallback-Tests. tsc 0, 14/14. ✓
5. **Scope-Out ehrlich:** watchlist/lineups.queries/offers/trading-movers haben KEIN club_id in der Row → Select/RPC-Change nötig → ehrlich als D-26c geparkt, NICHT als „D-26 komplett" behauptet. ✓
6. **§0-Schnitt-Regel:** kein neuer zweiter Weg — Freitext-Lese-Pfad in diesen 2 Mappern auf kanonisch (FK) umgestellt; Rest getrackt (D-26c).

## Findings
Keine. 2 Logik-Zeilen + 1 Import, identisches reviewer-validiertes Muster, money/score-neutral, Tests decken FK + Fallback ab.

## Anmerkung
Self-Review statt Cold-Context-Reviewer gewählt (workflow.md XS-Ausnahme: triviale Pattern-Wiederholung eines in 477 bereits voll reviewten Musters). Bei Money/Security wäre Reviewer Pflicht — hier Display/Client-Preview, nicht zutreffend.
