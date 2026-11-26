-- Refuses a copy that still holds something sanitize.sql should have taken
-- out, and one whose schema has grown since this list was written: a table or
-- a column nobody has classified fails, so that a new field holding personal
-- data cannot leave unnoticed. Changes nothing. README.md says how to run it.

DO $$
DECLARE
  -- Emptied by sanitize.sql: accounts, personal data, secrets, uploads.
  emptied text[] := '{users,user_profiles,repairer_profiles,user_refresh_tokens,
    oauth_clients,oauth_authorization_codes,oauth_refresh_tokens,ownerships,
    repair_journeys,tutorial_subscriptions,survey_response,repairer_reports,
    repairer_revisions,device_photos,device_model_photos}';
  -- Kept, with every column they may have. A column missing from the copy is
  -- fine (production can be behind dev); one missing from this list is not.
  kept jsonb := jsonb_build_object(
    'api_tools', '{id,name,shortDescription,fullDescription,websiteUrl,baseApiUrl,category,logoUrl,tags,isPubliclyAccessible,requiresAccount,requiresApiKey,authType,authDetails,pricingModel,pricingDetails,pricingUrl,documentationUrl,swaggerUrl,openApiSpecUrl,apiVersion,supportedFormats,endpoints,status,rejectionReason,submitterUserId,approvedBy,approvedAt,createdAt,updatedAt,isBuiltIn,isCommunity}'::text[],
    'device_categories', '{id,name,urn,unukey,is_electrical,ifixit_wikiid}'::text[],
    'device_category_device_link', '{devicesDeviceId,deviceCategoriesId}'::text[],
    'device_category_translations', '{id,locale,translated_name,category_id}'::text[],
    'device_embeddings', '{id,deviceId,deviceUrn,deviceText,embedding,updatedAt,primaryCategoryName,deviceBrand,deviceModel}'::text[],
    'device_informational_properties', '{property_id,property_name,property_value,device_id}'::text[],
    'device_model_categories', '{model_id,category_id}'::text[],
    'device_models', '{id,brand,name,key,variant_count,representative_device_id,has_manufacturer_variant,created_at,updated_at,is_manual,colours,created_by,is_demo,source}'::text[],
    'device_technical_properties', '{property_id,property_name,property_value,deviceDeviceId}'::text[],
    'devices', '{device_id,ean,serial_number,manufacturer,brand,model,device_type,source,urn,import_id,import_date,source_id,product_code,model_id,variant_label,is_refurbished,variant_parts,created_by,is_demo}'::text[],
    'migrations', '{id,timestamp,name}'::text[],
    'permission', '{id,name}'::text[],
    'repair_categories', '{id,slug,name}'::text[],
    'repair_category_device_mappings', '{id,deviceCategoryId,deviceCategoryName,repair_category_id}'::text[],
    'repair_category_translations', '{id,locale,translated_name,category_id}'::text[],
    'repair_records', '{id,partnerId,partnerProductCategory,productCategory,productCategoryId,brand,modelType,yearOfManufacture,productAge,problem,problemTag,repairStatus,repairBarrier,repairSolution,solutionTag,repairFeasibility,repairExplanation,groupIdentifier,eventDate,dataProvider,country,submittedByUserId,recordDate,updatedAt,source,issueSeverity,issueDuration,visualCondition,usageIntensity,issues}'::text[],
    'repairer_devices', '{repairer_device_id,device_type,repairer_id}'::text[],
    'repairers', '{repairer_id,repairer_import_id,name,description,address,country,postal_code,city,website,email,phone,latitude,longitude,source,partner_type,created_by,is_demo,status,review_note,reviewed_by,reviewed_at,created_at}'::text[],
    'roles', '{id,name}'::text[],
    'roles_permissions_permission', '{rolesId,permissionId}'::text[],
    'survey', '{id,title,triggerKey,questions,createdAt,updatedAt}'::text[]);
  -- Must be NULL on every row left.
  authors text[][] := '{{devices,created_by},{device_models,created_by},
    {repairers,created_by},{repairers,reviewed_by},{repairers,review_note},
    {repair_records,submittedByUserId},{api_tools,submitterUserId},
    {api_tools,approvedBy},{api_tools,rejectionReason}}';
  -- Text kept on purpose, or too large to scan: the repairers' published
  -- contacts, and the Icecat properties and what was derived from them.
  unscanned text[] := '{repairers,device_technical_properties,
    device_informational_properties,device_embeddings}';
  rules text[] := ARRAY[
    'devices not from Icecat => SELECT count(*) FROM devices WHERE source IS DISTINCT FROM ''ICECAT''',
    'devices with a serial number => SELECT count(*) FROM devices WHERE coalesce(serial_number, '''') <> ''''',
    'models created by hand => SELECT count(*) FROM device_models WHERE is_manual',
    'models whose count is wrong => SELECT count(*) FROM device_models m WHERE variant_count <> (SELECT count(*) FROM devices d WHERE d.model_id = m.id)',
    'models without variant => SELECT count(*) FROM device_models WHERE variant_count = 0',
    'models whose representative is not theirs => SELECT count(*) FROM device_models m WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.device_id = m.representative_device_id AND d.model_id = m.id)',
    'repairers not imported => SELECT count(*) FROM repairers WHERE repairer_import_id IS NULL',
    'repair records not imported => SELECT count(*) FROM repair_records WHERE source IS DISTINCT FROM ''ImportedDataset''',
    'API entries not built in => SELECT count(*) FROM api_tools WHERE NOT "isBuiltIn"',
    'links naming an account => SELECT (SELECT count(*) FROM device_informational_properties WHERE property_value ~* ''[?&](access|accesskey|sessid|username)='') + (SELECT count(*) FROM device_technical_properties WHERE property_value ~* ''[?&](access|accesskey|sessid|username)='')'];
  failures text[] := '{}';
  rule text;
  r record;
  n bigint;
  i int;
BEGIN
  -- Every table is classified.
  FOR r IN SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
              AND table_name::text <> ALL (emptied) AND NOT kept ? table_name::text
  LOOP
    failures := failures || format('table %s is not classified', r.table_name);
  END LOOP;

  -- Every column of a kept table is known.
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND kept ? table_name::text
              AND NOT (column_name::text = ANY (ARRAY(
                SELECT jsonb_array_elements_text(kept -> table_name::text))))
  LOOP
    failures := failures || format('column %s.%s is not classified', r.table_name, r.column_name);
  END LOOP;

  -- Emptied tables are empty.
  FOR r IN SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name::text = ANY (emptied)
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', r.table_name) INTO n;
    IF n > 0 THEN
      failures := failures || format('%s still has %s rows', r.table_name, n);
    END IF;
  END LOOP;

  -- Nobody is named on what stays.
  FOR i IN 1 .. array_length(authors, 1) LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = authors[i][1]
         AND column_name = authors[i][2]);
    EXECUTE format('SELECT count(*) FROM %I WHERE %I IS NOT NULL',
                   authors[i][1], authors[i][2]) INTO n;
    IF n > 0 THEN
      failures := failures || format('%s.%s is set on %s rows', authors[i][1], authors[i][2], n);
    END IF;
  END LOOP;

  -- Nothing marked as demo data.
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND column_name IN ('is_demo', 'isDemo')
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE %I', r.table_name, r.column_name) INTO n;
    IF n > 0 THEN
      failures := failures || format('%s has %s demo rows', r.table_name, n);
    END IF;
  END LOOP;

  -- Only imported data, and models consistent with their variants.
  FOREACH rule IN ARRAY rules LOOP
    EXECUTE split_part(rule, ' => ', 2) INTO n;
    IF n > 0 THEN
      failures := failures || format('%s: %s', split_part(rule, ' => ', 1), n);
    END IF;
  END LOOP;

  -- No e-mail address left in the text that was not kept on purpose.
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND kept ? table_name::text
              AND table_name::text <> ALL (unscanned)
              AND data_type IN ('text', 'character varying', 'json', 'jsonb', 'ARRAY')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I::text ~* %L', r.table_name, r.column_name,
      '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}') INTO n;
    IF n > 0 THEN
      failures := failures || format('%s.%s holds an e-mail address on %s rows', r.table_name, r.column_name, n);
    END IF;
  END LOOP;

  IF array_length(failures, 1) > 0 THEN
    RAISE EXCEPTION E'Not shareable:\n  %', array_to_string(failures, E'\n  ');
  END IF;
  RAISE NOTICE 'Shareable: every check passed.';
END $$;
