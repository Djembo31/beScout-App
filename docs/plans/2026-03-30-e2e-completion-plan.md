# End-to-End Completion Plan — Systematische Luecken schliessen

> Erstellt: 2026-03-30 (Session 267)
> Trigger: Anil fragte "wo stehen wir software-technisch?"
> Befund: Gamification ~40% fertig, 6 tote Services, fehlende Side-Effects

---

## Wave 1 — Kritische Ketten (SOFORT)

### 1.1 recordLoginStreak() in Auth-Flow einbauen
**Problem:** `src/lib/services/streaks.ts` exportiert `recordLoginStreak()` aber es wird NIRGENDS aufgerufen. Streak-System ist komplett tot.
**Impact:** Streak Benefits RPCs (Session 267) sind wirkungslos — kein User baut je einen Streak auf.
**Fix:** In Auth-Provider oder Layout `recordLoginStreak(user.id)` aufrufen (fire-and-forget, einmal pro Session).
**File:** `src/components/providers/AuthProvider.tsx` oder `src/app/(app)/layout.tsx`
**Pattern:**
```typescript
// In AuthProvider nach erfolgreichem Login:
if (user?.id) {
  import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
    recordLoginStreak(user.id).catch(console.error);
  });
}
```
**Aufwand:** Tier 1 (5 Min)
**Acceptance:** `SELECT current_streak FROM user_streaks WHERE user_id = X` zeigt >= 1 nach Login

### 1.2 Gamification DB-Triggers erstellen
**Problem:** 7 Trigger existieren nur als Kommentare in Service-Files — nie als Migration erstellt.
**Impact:** Trader-Elo und Analyst-Elo updaten sich NIE, obwohl Missions/Achievements getrackt werden.

**Fehlende Triggers:**

| Trigger | Fires on | Action | Dimension |
|---------|----------|--------|-----------|
| `trg_fn_trade_refresh` | trades INSERT | +5 Trader Score | Trader |
| `trg_analyst_score_on_post` | posts INSERT | +10 Analyst Score | Analyst |
| `trg_analyst_score_on_research` | research_posts INSERT | +15 Analyst Score | Analyst |
| `trg_fn_research_unlock_gamification` | research unlocks | +5 Analyst Score | Analyst |
| `trg_fn_bounty_approved_analyst` | bounty approval | +20 Analyst Score | Analyst |
| `trg_fn_post_vote_gamification` | post_votes INSERT | +2 Analyst Score | Analyst |
| `trg_fn_follow_gamification` | user_follows INSERT | +1 Analyst Score | Analyst |

**Voraussetzung:** Pruefen ob `award_dimension_score()` RPC existiert oder ob Triggers direkt UPDATE auf user_stats machen.
**Fix:** 2-3 Migrations erstellen
**Aufwand:** Tier 3 (1h) — RPCs dumpen, Trigger-Logik verstehen, Migrations schreiben
**Acceptance:** Nach Trade: `SELECT trader_score FROM user_stats WHERE user_id = X` ist hoeher als vorher

### 1.3 Tote Services aufraeumen
**Problem:** 6 Service-Files mit 0 Imports in Production Code.

| Service | Aktion | Begruendung |
|---------|--------|-------------|
| `impressions.ts` | ENTFERNEN | Kein UI, kein Plan |
| `scoutNetwork.ts` | ENTFERNEN | Phase 2+, kein Pilot-Feature |
| `scoutScores.ts` | ENTFERNEN | Duplikat von Gamification 3D Elo |
| `leagues.ts` | ENTFERNEN | Nie benutzt, Club-basiert statt Liga-basiert |
| `pushSubscription.ts` | BEHALTEN (dokumentieren) | Infrastruktur ready, UI fehlt → Wave 3 |
| `streaks.ts` | INTEGRIEREN (1.1) | Muss in Auth-Flow rein |

**Aufwand:** Tier 2 (20 Min) — Files loeschen, Barrel-Exports bereinigen, Tests pruefen
**Acceptance:** `grep -r "impressions\|scoutNetwork\|scoutScores\|leagues" src/ --include="*.ts"` zeigt nur Test-Files

---

## Wave 2 — Side-Effects vervollstaendigen

### 2.1 Fehlende Notifications

| Aktion | Empfaenger | Service-File | Typ |
|--------|-----------|-------------|-----|
| Post Upvote | Author | posts.ts:votePost | `post_upvoted` |
| Research Rating | Author | research.ts:rateResearch | `research_rated` |
| IPO Kauf | Kaeufer | ipo.ts (nach buy) | `ipo_purchase_confirmed` |
| Fantasy Join | User | events.mutations.ts | `fantasy_joined` |

**Aufwand:** Tier 2 (30 Min pro Notification, 4x)
**Pattern:** Bestehende `createNotification()` Calls in anderen Services als Vorlage

### 2.2 Activity Log fuer Fantasy

| Aktion | action_type | Service-File |
|--------|-------------|-------------|
| Event beigetreten | `fantasy_event_joined` | events.mutations.ts |
| Lineup erstellt | `lineup_created` | lineups.mutations.ts |
| Lineup geaendert | `lineup_updated` | lineups.mutations.ts |
| Event verlassen | `fantasy_event_left` | events.mutations.ts |

**Aufwand:** Tier 2 (20 Min)
**Pattern:** `INSERT INTO activity_log (user_id, action, reference_id, reference_type)`

### 2.3 Fantasy Missions definieren

Aktuell gibt es KEINE Fantasy-Missions. Vorschlag:

| Mission Key | Trigger | Reward |
|-------------|---------|--------|
| `daily_fantasy_entry` | Event beitreten | 5 Tickets |
| `weekly_3_lineups` | 3 Lineups in einer Woche | 15 Tickets |
| `fantasy_top_3` | Top 3 Platzierung | 25 Tickets |
| `fantasy_perfect_captain` | Captain mit hoechstem Score | 10 Tickets |

**Aufwand:** Tier 3 (1h) — Mission-Definitionen + triggerMissionProgress Calls
**Voraussetzung:** Mission-System verstehen (wo werden Missions definiert?)

---

## Wave 3 — Polish

### 3.1 Noop-Handler in Community
- `CommunityFeedTab.tsx`: 4 optionale Handler mit `() => {}` Fallback
- Fix: `disabled` State statt silent noop
- **Aufwand:** Tier 1 (15 Min)

### 3.2 Push Notification UI
- Settings-Page: Toggle fuer Push Notifications
- Service Worker Registration in Layout
- **Aufwand:** Tier 3 (1h)
- **Voraussetzung:** VAPID Key in Env verifizieren

---

## Execution Order (naechste Session)

```
Wave 1.1: recordLoginStreak einbauen          → 5 Min  (KRITISCH — Streak-System tot ohne das)
Wave 1.3: Tote Services entfernen             → 20 Min (Cleanup)
Wave 1.2: Gamification Triggers               → 1h     (Elo-Scores muessen sich bewegen)
Wave 2.2: Fantasy Activity Logging            → 20 Min (Audit Trail)
Wave 2.1: Fehlende Notifications (Top 4)      → 2h     (User Engagement)
Wave 2.3: Fantasy Missions                    → 1h     (Engagement Loop)
Wave 3:   Polish (Community + Push)           → 1.5h   (Nice-to-have)
```

**Gesamt: ~6-7h verteilt auf 2-3 Sessions**

---

## Wie verhindern wir das in Zukunft?

### Checkliste fuer JEDES neue Feature (in workflow.md ergaenzen):
- [ ] Service aufgerufen? (nicht nur exportiert)
- [ ] Gamification-Trigger? (welche Dimension profitiert?)
- [ ] Notification? (wer muss informiert werden?)
- [ ] Activity Log? (ist die Aktion nachvollziehbar?)
- [ ] Mission-Progress? (gibt es eine passende Mission?)
- [ ] i18n? (alle User-sichtbaren Strings)
- [ ] Cross-Domain Impact? (cross-domain-map.md pruefen)

### "Dead Import" Check als Pre-Commit Hook
```bash
# Finde exportierte Funktionen mit 0 Imports
grep -r "export function\|export async function" src/lib/services/ | while read line; do
  fn=$(echo "$line" | grep -oP 'function \K\w+')
  count=$(grep -r "$fn" src/ --include="*.ts" --include="*.tsx" | grep -v "export" | grep -v "test" | wc -l)
  if [ "$count" -eq 0 ]; then echo "UNUSED: $fn in $line"; fi
done
```
