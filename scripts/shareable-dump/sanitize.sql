-- Turns a copy of the Service Hub database into one that can be handed to
-- another team: no account, no personal data, no secret, and nothing entered
-- through the site, which on a test platform is test data. What stays is what
-- the imports wrote: the Icecat catalogue, the repairers of the imported
-- datasets, the imported repair records, and the reference tables.
--
-- Run it on a disposable copy, never on production, in one transaction with
-- verify.sql: README.md.

\echo '1. Accounts, personal data and secrets: the tables stay, empty.'
TRUNCATE users, user_profiles, repairer_profiles, user_refresh_tokens,
         oauth_clients, oauth_authorization_codes, oauth_refresh_tokens,
         ownerships, repair_journeys, tutorial_subscriptions, survey_response,
         repairer_reports;
DO $$
BEGIN
  IF to_regclass('repairer_revisions') IS NOT NULL THEN
    TRUNCATE repairer_revisions;
  END IF;
END $$;

\echo '2. Catalogue: only what the Icecat import wrote.'
-- Properties and category links of a deleted device go with it (ON DELETE CASCADE).
DELETE FROM devices WHERE source IS DISTINCT FROM 'ICECAT';
-- Every photo was uploaded through the site, and its file is not in the database.
TRUNCATE device_photos, device_model_photos;
DELETE FROM device_models WHERE is_manual;
-- The counts and representatives of the models that lost variants, as
-- refreshModels() would leave them; a model left without variant goes.
UPDATE device_models m SET variant_count = c.n
  FROM (SELECT m2.id, count(d.device_id)::int AS n
          FROM device_models m2 LEFT JOIN devices d ON d.model_id = m2.id
         GROUP BY m2.id) c
 WHERE c.id = m.id AND m.variant_count <> c.n;
DELETE FROM device_models WHERE variant_count = 0;
UPDATE device_models m
   SET representative_device_id =
       (SELECT min(d.device_id) FROM devices d WHERE d.model_id = m.id)
 WHERE NOT EXISTS (SELECT 1 FROM devices d
                    WHERE d.device_id = m.representative_device_id
                      AND d.model_id = m.id);
-- Some Icecat links carry what identified the account that fetched them
-- (access, AccessKey, sessid, username): the link stays, those parameters go,
-- and so does a `?` or `&` they leave dangling.
UPDATE device_informational_properties
   SET property_value = regexp_replace(regexp_replace(property_value,
         '(?<=[?&])(access|accesskey|sessid|username)=[^&"\s]*&?', '', 'gi'),
         '[?&]+(?=["\s<]|$)', '', 'g')
 WHERE property_value ~* '[?&](access|accesskey|sessid|username)=';
UPDATE device_technical_properties
   SET property_value = regexp_replace(regexp_replace(property_value,
         '(?<=[?&])(access|accesskey|sessid|username)=[^&"\s]*&?', '', 'gi'),
         '[?&]+(?=["\s<]|$)', '', 'g')
 WHERE property_value ~* '[?&](access|accesskey|sessid|username)=';
DO $$
DECLARE n bigint;
BEGIN
  -- Left over from synchronize: no code reads it any more.
  IF to_regclass('device_embeddings') IS NOT NULL THEN
    DELETE FROM device_embeddings e
     WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.device_id = e."deviceId");
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'device_embeddings: % deleted', n;
  END IF;
END $$;

\echo '3. Repairers: only those of the imported datasets.'
-- Those added through the site, and the made-up shops of the first seed
-- migration, have no import id. Their device types go with them.
DELETE FROM repairers WHERE repairer_import_id IS NULL;

\echo '4. Repair records: only the imported datasets.'
DELETE FROM repair_records WHERE source IS DISTINCT FROM 'ImportedDataset';
-- Volunteers sometimes typed an e-mail address into the free text of those
-- datasets: the address goes, the record stays.
DO $$
DECLARE
  c record;
  n bigint;
  address constant text := '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}';
BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'repair_records'
              AND data_type IN ('text', 'character varying')
  LOOP
    EXECUTE format(
      'UPDATE repair_records SET %I = regexp_replace(%I, %L, ''[e-mail removed]'', ''gi'') WHERE %I ~* %L',
      c.column_name, c.column_name, address, c.column_name, address);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      RAISE NOTICE 'repair_records.%: % addresses removed', c.column_name, n;
    END IF;
  END LOOP;
END $$;

\echo '5. API catalogue: only the built-in entries.'
DELETE FROM api_tools WHERE NOT "isBuiltIn";

\echo '6. Who wrote, approved or reviewed what: cleared on the rows that stay.'
DO $$
DECLARE
  c record;
  n bigint;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('devices', 'created_by'), ('device_models', 'created_by'),
      ('repairers', 'created_by'), ('repairers', 'reviewed_by'),
      ('repairers', 'review_note'), ('repair_records', 'submittedByUserId'),
      ('api_tools', 'submitterUserId'), ('api_tools', 'approvedBy'),
      ('api_tools', 'rejectionReason')) v(t, col)
  LOOP
    -- Some exist only from the demo-data work on: skip those not there yet.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = c.t AND column_name = c.col);
    EXECUTE format('UPDATE %I SET %I = NULL WHERE %I IS NOT NULL', c.t, c.col, c.col);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      RAISE NOTICE '%.%: % cleared', c.t, c.col, n;
    END IF;
  END LOOP;
END $$;
