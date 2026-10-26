DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text)'::regprocedure) INTO definition;
 definition := replace(definition, 'CASE WHEN p_channel=''zalo'' THEN p_user ELSE NULL END,jsonb_build_object', 'NULL,jsonb_build_object');
 EXECUTE definition;
END $$;
COMMENT ON COLUMN public.conversations.contact_zalo_id IS 'Legacy sender field; new omnichannel messages resolve account-scoped recipients through channel_identities, never this field.';