# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Slice 268 KOMPLETT (M, Slice-265-done-right): Cold-Start Cache-Mirror Wallet+Tickets

3-Layer-Architektur (Helper-Module + Hook-Augmentation + AuthProvider-Sync), Slice-265-Anti-Patterns kategorisch vermieden, Money-Path-Schutz vitest-verifiziert (AC-09), 59/59 Tests grün. Process-Innovation: Reviewer-VOR-BUILD-Stage zum ersten Mal architektonisch durchgezogen — Spec-Reviewer fand 3 MINORs vor Code, Code-Reviewer fand 1 CONCERN inline geheilt. Knowledge-Capture: patterns.md #45 + errors-frontend.md TanStack-Decision-Tree + D62 PROCESS-Entry. Commit `17d0c5b8`.

## Beta-Day-3 Status

Vercel deployt jetzt. **Anil-Action-Pflicht** post-Deploy (5-Step Mobile-Safari Inkognito Live-Verify):

1. **Cold-Start warm-cache (AC-01):** Login → Wallet/Tickets sichtbar → Tab schließen → neuer Tab → bescout.net → Wallet+Tickets erscheinen INSTANT (<200ms), kein Skeleton-Pulse
2. **Cold-Start no-cache (AC-02):** DevTools → Application → Clear site data → Hard-Refresh → Skeleton während 4-9s, dann Wallet erscheint normal
3. **User-Switch (AC-03):** User-A logout → User-B login (selber Tab) → User-B sieht NIEMALS User-A's Werte (auch nicht für 1 Frame)
4. **SIGNED_OUT (AC-04):** Login → DevTools localStorage zeigt bs_wallet_<uid>+bs_tickets_<uid> → Logout-Klick → Slots SOFORT entfernt
5. **Sentry-Watch:** 30s nach Cold-Start-Test → 0 neue Errors

Bei PASS auf alle 5 → Beta-Tester (Pesmerga, 3rd Tester) live → Beta-Day-3 ready.
