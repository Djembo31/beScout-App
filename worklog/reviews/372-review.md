# Slice 372 — Review (Cold-Context-Reviewer)

**Verdict: PASS** · time-spent: 11 min · 2026-06-24

## Verdict-Begründung
Sauberer, minimal-invasiver Money-Pfad-UI-Fix. Einziger realer Loop-Vektor durch `balanceStale`-dep-Konstanz während `isFetching` architektonisch ausgeschlossen; Fehlerfall fail-safe (Button bleibt disabled, kein RPC-Spam). Money-Logik byte-identisch, i18n DE+TR vorhanden, einziger Runtime-Consumer = BuyModal.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (Nit) | BuyModal.tsx:78-80 | 30s-Re-Stale: verbleibt User >30s + Re-Render (Qty-Tippen) nach Refetch, gibt es legitim 1 weiteren Refetch. **Gewolltes Verhalten** (Balance muss für Money-Confirm frisch sein), kein Bug. AC5 „max 1 Refetch" gilt für idle-Phase. | Kein Fix — dokumentiert. |
| 2 | INFO | BuyModal.tsx:61 | `useWallet()` 2× in BuyForm gemountet (zusätzlich zu useIsBalanceFresh-internem). Bei Doppel-BuyForm 4 Instanzen — React-Query dedupt via Query-Key, kein Extra-Traffic. | Kein Fix — funktional sauber. |

## Fokus-Fragen beantwortet
1. **Refetch-Loop:** Kein Endlos-Loop. refetch → isFetching true → isBalanceFresh false → balanceStale bleibt **konstant true** → dep unverändert → kein Re-Fire. Nach Erfolg flippt balanceStale→false (Guard `if`). refetch v5 referenz-stabil. ✅
2. **Money-Safety:** Byte-identisch. Nur `query.refetch` (read-only) exponiert. Buchungspfad unangetastet. ✅
3. **Edge:** balanceCents null → balanceStale false, kein Refetch. Fetch-Fehler → Button bleibt disabled (fail-safe, kein Kauf auf falscher Balance), Effect feuert nicht erneut → kein RPC-Spam. Doppel-BuyForm → Query-Key-dedupe. ✅
4. **Fehler-Maskierung:** Bei dauerhaftem Fehler bleibt „Saldo wird aktualisiert…" + disabled = sichere Richtung. Error-State war auch vor 372 nicht im BuyForm gerendert → kein Regression. ✅
5. **Exhaustive-deps:** `[balanceStale, refetchWallet]` korrekt. Andere useWallet-Consumer lesen nur balanceCents → additive Interface-Erweiterung bricht keinen. ✅

## Spec-Coverage
AC1-AC6 alle adressiert (AC1/AC2/AC5 live zu beweisen in PROVE).

## Learning für Knowledge-Capture
**Pattern-Kandidat (errors-frontend.md):** „Zeitbasiertes Freshness-Gate ohne aktiven Recovery-Trigger hängt für immer" — analog S283. Regel: Jedes `Date.now()-dataUpdatedAt < X`-Gate, das einen Flow blockiert, MUSS einen Auslöser haben, der bei Stale aktiv refetcht (useEffect auf Stale-Flag, dep-stabil, In-Flight-dedup via Query-Key). S268/S110 führten die Gate-Mechanik ein, definierten aber nie den Recovery-Pfad — 372 schließt die Lücke.
