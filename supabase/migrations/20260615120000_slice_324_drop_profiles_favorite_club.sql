-- Slice 324 — profiles.favorite_club String→UUID (S7 Phase-3, Vorlage-Migration, D80)
-- favorite_club_id (FK→clubs) ist die Wahrheit; favorite_club (denormalisierter Name) ist Drift-Quelle.
-- Der Name wird ab Slice 324 überall aus favorite_club_id via Club-Cache abgeleitet (getClub(id).name).
-- Schritt 1: 9 String-only-Zeilen (favorite_club gesetzt, favorite_club_id NULL) backfillen
--            (alle 9 haben einen eindeutigen clubs.name-Match → verlustfrei).
-- Schritt 2: denormalisierte String-Spalte droppen.
-- Reihenfolge: Code (referenziert favorite_club nicht mehr) ist vor dieser Migration deployed.

UPDATE public.profiles p
SET favorite_club_id = (SELECT c.id FROM public.clubs c WHERE c.name = p.favorite_club LIMIT 1)
WHERE p.favorite_club IS NOT NULL AND p.favorite_club_id IS NULL;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS favorite_club;
