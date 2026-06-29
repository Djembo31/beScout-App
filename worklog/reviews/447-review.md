# Slice 447 Review — K2.3 Welle C: Legal/Sales-Kanonisierung

**verdict: PASS** (Cold-Context reviewer-Agent, business/legal-sensibel)

## Findings (alle LOW)

| # | Severity | Location | Issue | Disposition |
|---|----------|----------|-------|-------------|
| 1 | LOW | legal §5 ↔ treasury §6 | `calculate_success_fee`-Pseudocode (CONCEPT-DPC §11) nicht explizit nach treasury.md migriert, lebt in git-History. Kern-Mathe (CSF-Formel) ist in treasury.md erhalten, Rechner als „offen" getrackt. | **Akzeptiert** als bewusster git-History-Drop (Rechner ungebaut; bei Bau aus git ziehen). |
| 2 | LOW | legal Front-matter | Kein `verified-against`, obwohl §5.3 eine Live-System-Claim trifft. | **Weggelassen** — Doc ist primär Legal-Register (kein Code-Doc); §5.3 deferiert inline explizit auf treasury.md als Wahrheit. |
| 3 | LOW | legal §5.1 | CSF-Formel im Vertrags-§2 algebraisch identisch zu treasury.md (Defer-Hinweis gesetzt). | **Belassen** — Vertragsklausel muss eigene Formel tragen (Reviewer: akzeptabel). |
| 4 | LOW (out-of-scope) | `product-map.md:55` | Pre-existing Drift: Polls „70/30" vs. kanonisch 80/20 (`polls.md`, Slice 356). Beide neuen Files sauber. | **Gemeldet als Smell** → eigener Mini-Slice (nicht in Welle C reingezogen, Scope-Disziplin). |

## Verifizierte Fokus-Punkte
1. **Compliance ✅** — beide Files als „internes Register" markiert; alle Investment/BSD/Profit-Treffer in Negations-/Verbots-/Legal-Argumentations-Kontext, kein user-facing-Leak.
2. **Money ✅** — max 10.000 SC = 10 % MV, 1 SC = MV/100.000 (konsistent treasury.md §4/§5); „500/300 Cards" GANZ raus (grep=0); CSF-Mechanik nur Pointer.
3. **success_fee_platform_bps ✅** — korrekt als offene CEO-Frage (§5.3), treasury.md realisiert keinen Plattform-CSF-Schnitt (CSF 100 % an Holder, D83).
4. **Vollständigkeit ✅** — alle Recon-Welle-C-Soll-Punkte gelandet (Howey/E-Geld/Glücksspiel/Vertrag/Lizenz-Matrix/Anwalts-Fragen/Setup-Fees/Objections/Ziel-Clubs).
5. **Front-matter + INDEX ✅** — 6 Felder, updated heute, 2 INDEX-Einträge.
6. **Veraltete Fakten geheilt ✅** — Sakaryaspor→7 Ligen (D1), Phasen 1/2/3 (D99), Tranchen superseded (D83).

**Schnitt-Regel §0 ✅** — alle 4 Quell-Docs gelöscht, 0 dangling Live-Ref, Modell-Konsolidierung (kein Append).

**One-Line:** Saubere compliance-korrekte Konsolidierung; Geld-Zahlen 1:1 zu treasury.md/D83/D100; nur Nitpicks offen — mergebar.
