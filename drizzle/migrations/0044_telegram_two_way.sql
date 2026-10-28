ALTER TYPE public.conv_channel ADD VALUE IF NOT EXISTS 'telegram';
ALTER TABLE public.channel_identities DROP CONSTRAINT IF EXISTS channel_identities_channel_check;
ALTER TABLE public.channel_identities ADD CONSTRAINT channel_identities_channel_check CHECK (channel IN ('zalo','messenger','telegram'));
CREATE TABLE public.telegram_bot_bindings (bot_id text PRIMARY KEY, tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id), key_digest text NOT NULL, enabled boolean NOT NULL DEFAULT true);
GRANT ALL ON public.telegram_bot_bindings TO service_role;
ALTER TABLE public.telegram_bot_bindings ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text)'::regprocedure) INTO definition;
IF position('''zalo'', ''messenger''' in definition)=0 AND position('''zalo'',''messenger''' in definition)=0 THEN RAISE EXCEPTION 'unexpected ingest definition'; END IF;
definition:=replace(replace(definition,'''zalo'', ''messenger''','''zalo'', ''messenger'', ''telegram'''),'''zalo'',''messenger''','''zalo'',''messenger'',''telegram''');
definition:=replace(definition,'ELSE ''Khách Messenger''','WHEN p_channel=''telegram'' THEN ''Khách Telegram'' ELSE ''Khách Messenger''');
EXECUTE definition;
END $$;