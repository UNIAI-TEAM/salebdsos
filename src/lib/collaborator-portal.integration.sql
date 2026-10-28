-- Rollback-only security regression: no permanent accounts, roles, or test rows.
BEGIN;
INSERT INTO public.sales_collaborators(tenant_id,code,full_name,owner_user_id,portal_user_id)
SELECT tenant_id,'QA-PORTAL-SECURITY','Other CTV',owner_user_id,'11111111-2222-4333-8444-555555555555' FROM public.sales_collaborators WHERE code='QA-PORTAL-2852';
-- QA profile must have one approved 60,000,000 commission and a 20,000,000 payment.
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT portal_user_id FROM public.sales_collaborators WHERE code='QA-PORTAL-2852'),'role','authenticated')::text,true);
DO $$ DECLARE w jsonb; a uuid; b uuid; denied boolean:=false; BEGIN
 w:=public.collaborator_portal_workspace();
 IF jsonb_array_length(w->'referrals')<>1 OR (w->'referrals'->0->>'commission_amount')::numeric<>60000000 OR (w->'referrals'->0->>'paid')::numeric<>20000000 THEN RAISE EXCEPTION 'Own ledger mismatch'; END IF;
 IF w::text LIKE '%Other CTV%' OR w::text LIKE '%owner_user_id%' OR w::text LIKE '%contract_id%' THEN RAISE EXCEPTION 'Private projection leak'; END IF;
 a:=public.collaborator_portal_submit('Retry customer','0909888854','','','aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
 b:=public.collaborator_portal_submit('Retry customer','0909888854','','','aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
 IF a<>b THEN RAISE EXCEPTION 'Retry duplicate'; END IF;
 BEGIN PERFORM public.collaborator_portal_submit('Duplicate phone','0909888854','','','aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff'); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Duplicate phone accepted'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"11111111-2222-4333-8444-555555555555","role":"authenticated"}',true);
DO $$ DECLARE w jsonb; denied boolean:=false; BEGIN
 w:=public.collaborator_portal_workspace();
 IF jsonb_array_length(w->'referrals')<>0 OR jsonb_array_length(w->'payments')<>0 THEN RAISE EXCEPTION 'Other CTV reads referrals or payments'; END IF;
 BEGIN PERFORM 1 FROM public.collaborator_referrals; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Raw ledger exposed'; END IF;
 denied:=false;
 BEGIN PERFORM public.collaborator_workspace((SELECT (current_setting('request.jwt.claims')::jsonb->>'sub')::uuid)); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CRM workspace exposed'; END IF;
END $$;
UPDATE public.sales_collaborators SET status='paused' WHERE portal_user_id='11111111-2222-4333-8444-555555555555';
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN PERFORM public.collaborator_portal_workspace(); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Paused CTV retains access'; END IF;
END $$;
ROLLBACK;