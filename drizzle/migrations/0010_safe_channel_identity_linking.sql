CREATE OR REPLACE FUNCTION public.ingest_channel_message(p_tenant uuid,p_channel text,p_account text,p_user text,p_event text,p_body text,p_name text,p_phone text,p_owner uuid,p_project uuid,p_attachment text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_identity public.channel_identities; v_lead public.leads; v_conv uuid; v_inserted integer; v_owner uuid; v_message uuid;
BEGIN
 IF p_channel NOT IN ('zalo','messenger') OR nullif(p_account,'') IS NULL OR nullif(p_user,'') IS NULL OR nullif(p_event,'') IS NULL THEN RAISE EXCEPTION 'invalid identity'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text,0));
 IF p_owner IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=p_tenant AND user_id=p_owner) THEN RAISE EXCEPTION 'invalid owner'; END IF;
 IF p_project IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects WHERE tenant_id=p_tenant AND id=p_project AND deleted_at IS NULL) THEN RAISE EXCEPTION 'invalid project'; END IF;
 INSERT INTO public.channel_events(tenant_id,channel,account_id,event_id) VALUES(p_tenant,p_channel,p_account,p_event) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 IF v_inserted=0 THEN RETURN jsonb_build_object('duplicate',true); END IF;
 SELECT * INTO v_identity FROM public.channel_identities WHERE tenant_id=p_tenant AND channel=p_channel AND account_id=p_account AND external_user_id=p_user;
 IF v_identity.id IS NOT NULL THEN
  SELECT id INTO v_conv FROM public.conversations WHERE id=v_identity.conversation_id AND tenant_id=p_tenant AND lead_id IS NOT DISTINCT FROM v_identity.lead_id;
  IF v_conv IS NULL THEN RAISE EXCEPTION 'inconsistent identity'; END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id=v_identity.lead_id AND tenant_id=p_tenant AND deleted_at IS NULL;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'linked profile unavailable'; END IF;
 ELSE
  INSERT INTO public.leads(tenant_id,full_name,source,status,owner_user_id,project_id,meta) VALUES(p_tenant,coalesce(nullif(p_name,''),CASE WHEN p_channel='zalo' THEN 'Khách Zalo' ELSE 'Khách Messenger' END),p_channel,'new',p_owner,p_project,jsonb_build_object('channel_identity',true,'identity_review_required',true)) RETURNING * INTO v_lead;
 END IF;
 v_owner:=v_lead.owner_user_id;
 IF v_conv IS NULL THEN
  INSERT INTO public.conversations(tenant_id,lead_id,project_id,owner_user_id,channel,contact_name,contact_phone,contact_zalo_id,meta) VALUES(p_tenant,v_lead.id,v_lead.project_id,v_owner,p_channel::public.conv_channel,v_lead.full_name,v_lead.phone,CASE WHEN p_channel='zalo' THEN p_user ELSE NULL END,jsonb_build_object('identity_review_required',true)) RETURNING id INTO v_conv;
 END IF;
 INSERT INTO public.channel_identities(tenant_id,channel,account_id,external_user_id,lead_id,conversation_id,last_inbound_at) VALUES(p_tenant,p_channel,p_account,p_user,v_lead.id,v_conv,now()) ON CONFLICT(tenant_id,channel,account_id,external_user_id) DO UPDATE SET last_inbound_at=excluded.last_inbound_at;
 INSERT INTO public.conversation_messages(tenant_id,conversation_id,channel,direction,body,sender_name,external_id,attachment_url,meta) VALUES(p_tenant,v_conv,p_channel::public.conv_channel,'in',p_body,coalesce(nullif(p_name,''),v_lead.full_name),p_event,p_attachment,jsonb_build_object('account_id',p_account)) RETURNING id INTO v_message;
 UPDATE public.conversations SET owner_user_id=v_owner,contact_name=v_lead.full_name,contact_phone=v_lead.phone,project_id=v_lead.project_id,last_message_at=now(),last_message_preview=left(p_body,160),unread_count=coalesce(unread_count,0)+1,status='open' WHERE id=v_conv AND tenant_id=p_tenant;
 RETURN jsonb_build_object('duplicate',false,'conversationId',v_conv,'leadId',v_lead.id,'ownerUserId',v_owner,'messageId',v_message);
END $$;
REVOKE ALL ON FUNCTION public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_channel_message(uuid,text,text,text,text,text,text,text,uuid,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.link_channel_profile(p_tenant uuid,p_conversation uuid,p_lead uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_conv public.conversations; v_lead public.leads; v_admin boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text,0));
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=p_tenant AND user_id=auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE tenant_id=p_tenant AND user_id=auth.uid() AND role::text IN ('owner','admin','platform_admin')) INTO v_admin;
 SELECT * INTO v_conv FROM public.conversations WHERE tenant_id=p_tenant AND id=p_conversation FOR UPDATE;
 SELECT * INTO v_lead FROM public.leads WHERE tenant_id=p_tenant AND id=p_lead AND deleted_at IS NULL FOR UPDATE;
 IF v_conv.id IS NULL OR v_lead.id IS NULL OR (NOT v_admin AND (v_conv.owner_user_id IS DISTINCT FROM auth.uid() OR v_lead.owner_user_id IS DISTINCT FROM auth.uid())) THEN RAISE EXCEPTION 'not authorized'; END IF;
 UPDATE public.conversations SET lead_id=v_lead.id,contact_name=v_lead.full_name,contact_phone=v_lead.phone,owner_user_id=v_lead.owner_user_id,project_id=v_lead.project_id,meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('identity_review_required',false) WHERE id=p_conversation AND tenant_id=p_tenant;
 UPDATE public.channel_identities SET lead_id=v_lead.id WHERE conversation_id=p_conversation AND tenant_id=p_tenant;
 INSERT INTO public.audit_logs(tenant_id,user_id,action,entity,entity_id,diff) VALUES(p_tenant,auth.uid(),'conversation.link','conversations',p_conversation,jsonb_build_object('previous_lead_id',v_conv.lead_id,'lead_id',v_lead.id));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.link_channel_profile(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_channel_profile(uuid,uuid,uuid) TO authenticated;