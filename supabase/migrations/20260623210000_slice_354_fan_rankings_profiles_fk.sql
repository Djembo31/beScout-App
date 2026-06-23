-- Slice 354 — fan_rankings.user_id FK → profiles (PostgREST-Embed-Fix)
--
-- Bug (Live-Playwright-Verify Slice 349): Das Club-Fan-Treue-Board ("Treueste Fans")
-- rendert auf /club/<slug> Tab "Mehr" einen Error-State ("Daten konnten nicht geladen
-- werden"). Ursache: getClubFanLeaderboard nutzt den PostgREST-Embed
-- `profiles!inner(handle, avatar_url)`. Der braucht einen FK fan_rankings→profiles,
-- damit PostgREST die Relation auflösen kann. fan_rankings.user_id FKt aber nur auf
-- auth.users (verletzt database.md "neue Tabellen: FK auf profiles"). → PostgREST
-- "could not find a relationship" → Service wirft → Board-Error-State.
-- tsc/Unit-Tests grün (Mock), nur Live-Render fängt es.
--
-- Fix: zusätzlichen FK auf profiles ergänzen (kanonisches Muster, identisch zu
-- scout_scores). Bestehender auth.users-FK bleibt (harmlos/transitiv, profiles.id
-- FKt selbst auth.users). Verifiziert: 37 Zeilen, 0 Orphans ohne Profil.
-- Additiv, keine Funktion → kein REVOKE/GRANT-Block nötig (AR-44 N/A).

ALTER TABLE public.fan_rankings
  ADD CONSTRAINT fan_rankings_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
