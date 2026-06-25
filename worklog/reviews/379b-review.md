# Review — Slice 379b (self-review, XS UI conditional-render)

**Verdict: PASS**

Self-review begründet: XS, reine Anzeige-Korrektur eines Hinweis-Gates. Bedingung 1:1 gegen
Live-RPC `approve_bounty_submission` verifiziert (D87), kein Money-Flow berührt, 3-Zweig-Test deckt
alle Fälle deterministisch. Money-RPC byte-unberührt.

## Geprüft
- **Bedingung == RPC-Debit-Zweig:** Hinweis zeigt iff `!is_user_bounty && !treasury_escrowed` —
  exakt der einzige Pfad, in dem die RPC das Admin-Wallet (`p_admin_id`) debitiert. User-Bounty
  (Creator zahlt) + escrowed-Club-Bounty (Topf zahlt) → kein Admin-Debit → Hinweis versteckt.
- **TODO-Notiz war ungenau** (`is_user_bounty || !treasury_escrowed`) — Live-RPC-Lesung korrigierte
  das (hätte bei User-Bounties fälschlich gezeigt). Beleg dafür, warum D87 (functiondef VOR Fix) gilt.
- **Daten-Verfügbarkeit:** `treasury_escrowed` zu DbBounty-Type + beiden Service-Selects ergänzt
  (`getBountiesByClub`/`getAllActiveBounties`) → Feld ist im `viewBounty` present, kein `undefined`-Loch.
  Default-Verhalten safe: fehlt das Feld (undefined) → `!undefined`=true → bei Club-Bounty Hinweis
  gezeigt (konservativ = der belastende Fall, kein Money-Risiko durch falsches Verstecken).
- **Kein Money-Seam:** scheinbare Inkonsistenz (completed Bounty escrowed=false trotz Escrow-Pfad)
  durch `trg_bounties_settle` (status→completed setzt escrowed=false) aufgelöst — Approval-Zeitpunkt
  ist escrowed=true. UI zeigt nur open-Bounties.
- **Regress:** 59 bounties-Service-Tests + 17 AdminBountiesTab-Tests grün, tsc 0.

## Findings
- LOW (Scope-Out, dokumentiert): escrowed-/user-Fall zeigt jetzt GAR keinen Finanzierungs-Hinweis.
  Optional schöner: neutraler „aus dem Vereins-Topf gedeckt"-Text (bräuchte DE+TR-Strings + Anil-Wording).
  Bewusst weggelassen — Bug war „irreführender Wallet-Hinweis", Minimal-Fix = ihn korrekt gaten.
- Kein weiterer Fund.
