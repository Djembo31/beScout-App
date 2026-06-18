# Slice 337 — Self-Review (S, Money)

**Verdict: PASS (self-review)** — Begründung: 1-Zeilen-%-Änderung (`v_cost*70`→`*80`) an `cast_community_poll_vote`, dessen Body **byte-identisch** zur Slice-336-Live-Version ist (Cold-Context-PASS in 336). Kein neuer Control-Flow, keine neue Logik → kein Blindspot-Risiko, das ein Cold-Reviewer fangen würde. Money-Smoke beweist Verhalten live.

## Verifizierte Achsen
- **Geld-Korrektheit:** Money-Smoke creator_share=800 (80%), treasury_delta=800, platform-burn=200 (20% = cost−creator_share, kein zweiter Hardcode). ✓
- **Money-Branch-Erhalt (156):** Body = 336-Live + nur die `*80`-Zeile. Wallet-Abzug, Treasury/Wallet-Routing, transactions, weight-Logik, club-ohne-club_id-RAISE unverändert. ✓
- **Doc-SSOT-Konsistenz:** business.md-Fee-Tabelle (SSOT) + trading.md + polls.md §3/§9 + treasury.md + i18n de+tr alle 80/20; grep 0 stale Poll-70/30. ✓
- **AR-44:** REVOKE/GRANT auf cast renew. ✓
- **CEO-Fee-Change:** Anil-approved 20/80 (2026-06-18).

## Backlog (kein Blocker)
- `polls.md` §9 Current-State-Inventar ist über 333/334/336 hinaus breiter stale (z.B. „KEINE Erstellung" stimmt seit 333 nicht) — eigener Doku-Refresh-Slice empfohlen (E0-W2gov-Kopplung). 337 hat nur die Fee-%-Zeilen synchronisiert (in-scope).
