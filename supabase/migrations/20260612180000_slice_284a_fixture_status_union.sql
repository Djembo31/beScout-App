-- Slice 284a (2026-06-12) — FixtureStatus-Union um 'postponed' + 'cancelled' erweitern.
--
-- Root-Cause FANT-14 (Punch-List 2026-06-12): sync-fixtures-future mapStatus schreibt
-- 'postponed'/'cancelled' (+ früher 'halftime'), der CHECK erlaubte aber nur 4 Werte
-- → tägliche Status-Updates failten SILENT (nur error_sample in cron_sync_log) →
-- 154 Geister-Fixtures blieben für immer 'scheduled', verlegte/abgesagte Spiele
-- erschienen als ewiges „Ausstehend ? - ?" im Spieltag.
--
-- Done-Semantik (Code-Seite, gleicher Slice): 'cancelled' zählt als GW-komplett
-- (Spiel findet nie statt), 'postponed' NICHT (wird nachgeholt, blockt Scoring
-- via dbTruthAllDone — bewusst). 'halftime' wird NICHT aufgenommen — mapStatus
-- normalisiert HT auf 'live'.

ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_status_check;
ALTER TABLE public.fixtures ADD CONSTRAINT fixtures_status_check
  CHECK (status = ANY (ARRAY['scheduled'::text, 'simulated'::text, 'live'::text, 'finished'::text, 'postponed'::text, 'cancelled'::text]));

COMMENT ON CONSTRAINT fixtures_status_check ON public.fixtures IS
  'Slice 284a: 6-Wert-Union. postponed=wird nachgeholt (zählt NICHT als GW-done), cancelled=findet nie statt (zählt als GW-done).';
