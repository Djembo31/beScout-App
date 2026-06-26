-- Slice 391 — nationality-Normalisierung: generierte Spalte players.nationality_iso
-- SQL-Port von src/lib/utils/countryNameToIso.ts (Single-Source des Mappings; bei Map-Änderung BEIDE pflegen).
-- normalize_nationality IMMUTABLE → erlaubt GENERATED ALWAYS STORED. Nicht-destruktiv (nationality bleibt),
-- zero-drift (DB rechnet ISO automatisch), zero-trigger, zero-backfill. CEO-Entscheid Anil 2026-06-26.
-- normalizeKey-Parität: lower + Whitespace raus; Diakritika + Interpunktion BLEIBEN (Map führt beide Formen).

CREATE OR REPLACE FUNCTION public.normalize_nationality(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN ''
    -- ISO-2-Pass-through (die im Mapping geführten Codes)
    WHEN upper(btrim(p)) IN ('TR','DE','NG','GH','GM','GN','IL','KG','MK','NL','RU','BA','CL')
      THEN upper(btrim(p))
    -- GB-Subdivision-Pass-through
    WHEN upper(btrim(p)) ~ '^GB-(ENG|SCT|WLS|NIR)$' THEN upper(btrim(p))
    ELSE COALESCE(
      (SELECT m.iso FROM (VALUES
        -- Europe (EN)
        ('albania','AL'),('armenia','AM'),('austria','AT'),('azerbaijan','AZ'),('belgium','BE'),
        ('bosniaandherzegovina','BA'),('bosnia-herzegovina','BA'),('bulgaria','BG'),('croatia','HR'),
        ('cyprus','CY'),('czechia','CZ'),('czechrepublic','CZ'),('denmark','DK'),('estonia','EE'),
        ('faroeislands','FO'),('finland','FI'),('france','FR'),('georgia','GE'),('germany','DE'),
        ('greece','GR'),('hungary','HU'),('iceland','IS'),('ireland','IE'),('republicofireland','IE'),
        ('italy','IT'),('kosovo','XK'),('latvia','LV'),('lithuania','LT'),('luxembourg','LU'),
        ('malta','MT'),('moldova','MD'),('montenegro','ME'),('netherlands','NL'),('northmacedonia','MK'),
        ('macedonia','MK'),('norway','NO'),('poland','PL'),('portugal','PT'),('romania','RO'),
        ('russia','RU'),('serbia','RS'),('slovakia','SK'),('slovenia','SI'),('spain','ES'),
        ('sweden','SE'),('switzerland','CH'),('turkey','TR'),('türkiye','TR'),('turkiye','TR'),('ukraine','UA'),
        -- United Kingdom subdivisions
        ('england','GB-ENG'),('scotland','GB-SCT'),('wales','GB-WLS'),('northernireland','GB-NIR'),
        ('unitedkingdom','GB'),('uk','GB'),('britain','GB'),('greatbritain','GB'),
        -- Africa (EN)
        ('algeria','DZ'),('angola','AO'),('benin','BJ'),('burkinafaso','BF'),('cameroon','CM'),
        ('capeverde','CV'),('caboverde','CV'),('centralafricanrepublic','CF'),('chad','TD'),('congo','CG'),
        ('congodr','CD'),('drcongo','CD'),('democraticrepublicofthecongo','CD'),('democraticrepublicofcongo','CD'),
        ('republicofthecongo','CG'),('coted''ivoire','CI'),('côted''ivoire','CI'),('ivorycoast','CI'),
        ('egypt','EG'),('equatorialguinea','GQ'),('gabon','GA'),('gambia','GM'),('thegambia','GM'),
        ('ghana','GH'),('guinea','GN'),('guinea-bissau','GW'),('guineabissau','GW'),('kenya','KE'),
        ('libya','LY'),('malawi','MW'),('mali','ML'),('morocco','MA'),('mozambique','MZ'),('niger','NE'),
        ('nigeria','NG'),('senegal','SN'),('sierraleone','SL'),('southafrica','ZA'),('southsudan','SS'),
        ('eswatini','SZ'),('swaziland','SZ'),('tanzania','TZ'),('togo','TG'),('tunisia','TN'),('uganda','UG'),
        ('zambia','ZM'),('zimbabwe','ZW'),
        -- Americas (EN)
        ('argentina','AR'),('brazil','BR'),('canada','CA'),('chile','CL'),('colombia','CO'),('costarica','CR'),
        ('curaçao','CW'),('curacao','CW'),('dominicanrepublic','DO'),('ecuador','EC'),('elsalvador','SV'),
        ('guadeloupe','GP'),('haiti','HT'),('honduras','HN'),('jamaica','JM'),('martinique','MQ'),
        ('mexico','MX'),('panama','PA'),('paraguay','PY'),('peru','PE'),('puertorico','PR'),('suriname','SR'),
        ('trinidadandtobago','TT'),('unitedstates','US'),('usa','US'),('unitedstatesofamerica','US'),
        ('uruguay','UY'),('venezuela','VE'),
        -- Asia & Oceania (EN)
        ('australia','AU'),('bangladesh','BD'),('china','CN'),('hongkong','HK'),('india','IN'),
        ('indonesia','ID'),('iran','IR'),('iraq','IQ'),('israel','IL'),('japan','JP'),('jordan','JO'),
        ('kazakhstan','KZ'),('kuwait','KW'),('korearepublic','KR'),('southkorea','KR'),('korea,republicof','KR'),
        ('northkorea','KP'),('korea,democraticpeople''srepublicof','KP'),('kyrgyzstan','KG'),('lebanon','LB'),
        ('malaysia','MY'),('myanmar','MM'),('newzealand','NZ'),('pakistan','PK'),('palestine','PS'),
        ('philippines','PH'),('qatar','QA'),('saudiarabia','SA'),('singapore','SG'),('srilanka','LK'),
        ('syria','SY'),('taiwan','TW'),('tajikistan','TJ'),('thailand','TH'),('turkmenistan','TM'),
        ('unitedarabemirates','AE'),('uae','AE'),('uzbekistan','UZ'),('vietnam','VN'),('yemen','YE'),
        -- Europe (DE)
        ('albanien','AL'),('armenien','AM'),('aserbaidschan','AZ'),('belgien','BE'),('bosnienundherzegowina','BA'),
        ('bulgarien','BG'),('dänemark','DK'),('daenemark','DK'),('deutschland','DE'),('estland','EE'),
        ('färöer','FO'),('faeroeer','FO'),('finnland','FI'),('frankreich','FR'),('georgien','GE'),
        ('griechenland','GR'),('irland','IE'),('island','IS'),('italien','IT'),('kasachstan','KZ'),
        ('kroatien','HR'),('lettland','LV'),('litauen','LT'),('luxemburg','LU'),('mazedonien','MK'),
        ('nordmazedonien','MK'),('moldawien','MD'),('niederlande','NL'),('norwegen','NO'),('polen','PL'),
        ('rumänien','RO'),('rumaenien','RO'),('russland','RU'),('schweden','SE'),('schweiz','CH'),
        ('serbien','RS'),('slowakei','SK'),('slowenien','SI'),('spanien','ES'),('tschechien','CZ'),
        ('tschechischerepublik','CZ'),('türkei','TR'),('tuerkei','TR'),('ungarn','HU'),('weißrussland','BY'),
        ('weissrussland','BY'),('belarus','BY'),('zypern','CY'),('österreich','AT'),('oesterreich','AT'),
        -- Africa (DE)
        ('ägypten','EG'),('aegypten','EG'),('algerien','DZ'),('äthiopien','ET'),('aethiopien','ET'),
        ('demokratischerepublikkongo','CD'),('elfenbeinküste','CI'),('elfenbeinkueste','CI'),('kamerun','CM'),
        ('kapverde','CV'),('kap-verde','CV'),('kongo','CG'),('libyen','LY'),('marokko','MA'),('mosambik','MZ'),
        ('republikkongo','CG'),('simbabwe','ZW'),('südafrika','ZA'),('suedafrika','ZA'),('tunesien','TN'),
        ('sambia','ZM'),
        -- Americas (DE)
        ('argentinien','AR'),('brasilien','BR'),('dominikanischerepublik','DO'),('kanada','CA'),
        ('kolumbien','CO'),('kuba','CU'),('mexiko','MX'),('vereinigtestaaten','US'),('vereinigtestaatenvonamerika','US'),
        -- Asia & Oceania (DE)
        ('australien','AU'),('indien','IN'),('indonesien','ID'),('jordanien','JO'),('katar','QA'),
        ('korea,demokratischevolksrepublik','KP'),('nordkorea','KP'),('korea,republik','KR'),('südkorea','KR'),
        ('suedkorea','KR'),('libanon','LB'),('neuseeland','NZ'),('philippinen','PH'),('saudi-arabien','SA'),
        ('saudiarabien','SA'),('syrien','SY'),('vereinigtearabischeemirate','AE'),('tadschikistan','TJ'),
        ('usbekistan','UZ'),('mauritius','MU')
      ) AS m(k, iso)
      WHERE m.k = lower(regexp_replace(btrim(p), '\s+', '', 'g'))),
      ''
    )
  END
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_nationality(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_nationality(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.normalize_nationality(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_nationality(text) TO service_role;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS nationality_iso TEXT
  GENERATED ALWAYS AS (public.normalize_nationality(nationality)) STORED;

CREATE INDEX IF NOT EXISTS idx_players_nationality_iso
  ON public.players (nationality_iso) WHERE nationality_iso <> '';
