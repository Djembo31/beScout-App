-- Phase-4 compliance guard (ADR-028, BES-45)
-- Paid tournament entry requires MGA license (Phase 4 — NOT implemented yet).
-- This DB-level constraint prevents accidental paid tournament creation even if
-- the service layer guard is bypassed (e.g. direct DB insert by admin).
-- Covers both entry_fee (deprecated) and ticket_cost (current active column).

ALTER TABLE public.events
  ADD CONSTRAINT chk_tournament_no_paid_entry
  CHECK (NOT (type = 'tournament' AND (entry_fee > 0 OR ticket_cost > 0)));

COMMENT ON CONSTRAINT chk_tournament_no_paid_entry ON public.events
  IS 'Phase-4 gate: tournament events must have entry_fee=0 AND ticket_cost=0 until MGA license is obtained (ADR-028)';
