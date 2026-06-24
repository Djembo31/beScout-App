# Active Slice

```
status: idle
slice: 367
title: ✅ DONE — E4 „Diamond Hands"-Cluster gefixt (Rename + Hold-Logik + Konfetti)
stage: LOG complete
size: S
slice-type: fix (i18n + Service-Logik + UI + DB-Data) — gamification, money-nah (Achievement-Kriterium)
spec: inline (siehe unten) + Findings worklog/notes/365-e2e-findings.md (T-3, Root-Cause verifiziert)
impact: skipped-light (Achievement-Kriterium härter, kann nicht über-minten; 4 Rename-Surfaces + 1 Service-Query + 1 UI-Gate)
proof: worklog/proofs/367-fix.txt (tsc EXIT 0 · vitest social 37/37 · DB-Row verifiziert · Root-Cause Live-DB)
review: worklog/reviews/367-review.md (reviewer-Agent PASS, 4 Findings non-blocking)
next: 368 ipo_price-Data-Drift (Money/CEO). Follow-ups aus 367-Review: F#1 „ohne zu verkaufen"-Semantik (Anil) · F#2 Regression-Tests Hold-Logik · F#3 DPC-Mastery-Leaderboard zeigt Mock-hold_days.
```

## Inline-Spec (Slice 367)

**Problem (T-3, HIGH, Live-verifiziert):** Nach echtem Kauf ploppte Achievement „Diamond Hands — Scout Card 30 Tage gehalten". 3 Defekte:
1. **Compliance:** „Diamond Hands" = verbotenes Meme-Coin-Wort (business.md). Anil-Entscheid: Rename → **„Treuer Sammler" / „Sadık Koleksiyoncu"** (Key `diamond_hands` bleibt code-intern).
2. **Logik-Bug:** vergeben sofort beim Kauf. Root-Cause: `social.ts` liest `dpc_mastery.hold_days` = **geseedete Mock-Daten** (live: 2472/2533 ≥30, Cluster 91/97/60, kein Trigger). → echte Halte-Dauer aus `holdings.created_at` (Positions-Eröffnung; Zombie-Rows bei qty=0 gelöscht → created_at = Start der aktuellen ununterbrochenen Position).
3. **UX:** Konfetti/Celebration bei Trading-Achievement verstößt gegen feedback_no_confetti. → Konfetti im AchievementUnlockModal für `category==='trading'` unterdrücken (Manager/Scout behalten Celebration).

**Betroffene Files:**
- `messages/de.json:3140` + `tr.json:3140` (`gamification.achievement.diamond_hands` — Modal-Quelle) → Rename. Desc bleibt (kein Meme-Wort).
- `src/lib/achievements.ts:48` label/label_tr → Rename; icon 💎→⏳ (Diamond-Assoziation raus).
- DB `achievement_definitions` (title/title_tr für Notification-Text) → Migration UPDATE.
- `src/lib/services/social.ts:428-436` → Hold-Days-Quelle umstellen.
- `src/components/gamification/AchievementUnlockModal.tsx:30` → `<Confetti active={open && achievement.category!=='trading'} />`.

**AC:**
1. Modal/Notification/Katalog zeigen „Treuer Sammler"/„Sadık Koleksiyoncu", nirgends mehr „Diamond Hands"/„Elmas Eller" (außer Key/i18n-Key).
2. `diamond_hands` qualifiziert NUR wenn eine Holding-Position ≥30 Tage ununterbrochen gehalten (created_at), nicht beim Kauf.
3. Konfetti erscheint NICHT bei trading-Achievements; bei manager/scout schon.
4. tsc grün + vitest social grün.

**Scope-Out:** breitere `dpc_mastery.hold_days`-Seed-Bereinigung (eigener Slice falls andere Consumer); andere Achievements; Push-500 (369).

**Self-Verify:** grep „Diamond Hands"/„Elmas Eller" in messages+src = 0 (außer Key); Live-DB `achievement_definitions` title check; vitest social.
```
