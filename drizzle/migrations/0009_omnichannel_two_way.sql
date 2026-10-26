ALTER TYPE public.conv_channel ADD VALUE IF NOT EXISTS 'messenger';
CREATE TABLE public.channel_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK (channel IN ('zalo','messenger')), account_id text NOT NULL, external_user_id text NOT NULL,
 lead_id uuid REFERENCES public.leads(id), conversation_id uuid NOT NULL REFERENCES public.conversations(id),
 last_inbound_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,channel,account_id,external_user_id)
);
GRANT SELECT ON public.channel_identities TO authenticated;
GRANT ALL ON public.channel_identities TO service_role;
ALTER TABLE public.channel_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY channel_identities_read ON public.channel_identities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c JOIN public.user_roles r ON r.tenant_id=c.tenant_id AND r.user_id=auth.uid() WHERE c.id=channel_identities.conversation_id AND c.tenant_id=channel_identities.tenant_id AND (r.role::text IN ('owner','admin','platform_admin') OR c.owner_user_id=auth.uid())));
CREATE TABLE public.channel_events (
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, channel text NOT NULL, account_id text NOT NULL,
 event_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,channel,account_id,event_id)
);
GRANT ALL ON public.channel_events TO service_role;
ALTER TABLE public.channel_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.ingest_channel_message(p_tenant uuid,p_channel text,p_account text,p_user text,p_event text,p_body text,p_name text,p_phone text,p_owner uuid,p_project uuid,p_attachment text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_identity public.channel_identities; v_lead public.leads; v_conv uuid; v_count integer; v_inserted integer; v_phone text; v_owner uuid; v_message uuid;
BEGIN
 IF p_channel NOT IN ('zalo','messenger') THEN RAISE EXCEPTION 'unsupported channel'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text,0));
 INSERT INTO public.channel_events(tenant_id,channel,account_id,event_id) VALUES(p_tenant,p_channel,p_account,p_event) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 IF v_inserted=0 THEN RETURN jsonb_build_object('duplicate',true); END IF;
 SELECT * INTO v_identity FROM public.channel_identities WHERE tenant_id=p_tenant AND channel=p_channel AND account_id=p_account AND external_user_id=p_user;
 IF v_identity.id IS NOT NULL THEN SELECT * INTO v_lead FROM public.leads WHERE id=v_identity.lead_id AND tenant_id=p_tenant AND deleted_at IS NULL; END IF;
 v_phone:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 IF v_phone LIKE '84%' THEN v_phone:='0'||substr(v_phone,3); END IF;
 IF length(v_phone)<9 THEN v_phone:=NULL; END IF;
 IF v_lead.id IS NULL AND v_phone IS NOT NULL THEN
 SELECT count(*) INTO v_count FROM public.leads WHERE tenant_id=p_tenant AND deleted_at IS NULL AND regexp_replace(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),'^84','0')=v_phone;
 IF v_count=1 THEN SELECT * INTO v_lead FROM public.leads WHERE tenant_id=p_tenant AND deleted_at IS NULL AND regexp_replace(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),'^84','0')=v_phone LIMIT 1; END IF;
 END IF;
 IF v_lead.id IS NULL THEN
 INSERT INTO public.leads(tenant_id,full_name,phone,source,status,owner_user_id,project_id,meta) VALUES(p_tenant,coalesce(nullif(p_name,''),CASE WHEN p_channel='zalo' THEN 'Khách Zalo' ELSE 'Khách Messenger' END),v_phone,p_channel,'new',p_owner,p_project,jsonb_build_object('channel_identity',true)) RETURNING * INTO v_lead;
 ELSIF v_lead.phone IS NULL AND v_phone IS NOT NULL THEN UPDATE public.leads SET phone=v_phone WHERE id=v_lead.id; END IF;
 v_owner:=coalesce(v_lead.owner_user_id,p_owner);
 v_conv:=v_identity.conversation_id;
 IF v_conv IS NULL THEN SELECT id INTO v_conv FROM public.conversations WHERE tenant_id=p_tenant AND lead_id=v_lead.id ORDER BY created_at LIMIT 1; END IF;
 IF v_conv IS NULL AND p_channel='zalo' THEN SELECT id INTO v_conv FROM public.conversations WHERE tenant_id=p_tenant AND contact_zalo_id=p_user LIMIT 1; END IF;
 IF v_conv IS NULL THEN
 INSERT INTO public.conversations(tenant_id,lead_id,project_id,owner_user_id,channel,contact_name,contact_phone,contact_zalo_id) VALUES(p_tenant,v_lead.id,v_lead.project_id,v_owner,p_channel::public.conv_channel,v_lead.full_name,coalesce(v_lead.phone,v_phone),CASE WHEN p_channel='zalo' THEN p_user ELSE NULL END) RETURNING id INTO v_conv;
 ELSE UPDATE public.conversations SET lead_id=v_lead.id,owner_user_id=v_owner,contact_phone=coalesce(contact_phone,v_lead.phone,v_phone),contact_name=coalesce(nullif(contact_name,''),v_lead.full_name) WHERE id=v_conv AND tenant_id=p_tenant; END IF;
 INSERT INTO public.channel_identities(tenant_id,channel,account_id,external_user_id,lead_id,conversation_id,last_inbound_at) VALUES(p_tenant,p_channel,p_account,p_user,v_lead.id,v_conv,now()) ON CONFLICT(tenant_id,channel,account_id,external_user_id) DO UPDATE SET lead_id=excluded.lead_id,conversation_id=excluded.conversation_id,last_inbound_at=excluded.last_inbound_at;
 INSERT INTO public.conversation_messages(tenant_id,conversation_id,channel,direction,body,sender_name,external_id,attachment_url,meta) VALUES(p_tenant,v_conv,p_channel::public.conv_channel,'in',p_body,coalesce(p_name,v_lead.full_name),p_event,p_attachment,jsonb_build_object('account_id',p_account)) RETURNING id INTO v_message;
 UPDATE public.conversations SET channel=p_channel::public.conv_channel,last_message_at=now(),last_message_preview=left(p_body,160),unread_count=unread_count+1,status='open' WHERE id=v_conv AND tenant_id=p_tenant;
 RETURN jsonb_build_object('duplicate',false,'conversationId',v_conv,'leadId',v_lead.id,'ownerUserId',v_owner,'messageId',v_message);
END $$;
REVOKE ALL ON FUNCTION public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text) TO service_role;