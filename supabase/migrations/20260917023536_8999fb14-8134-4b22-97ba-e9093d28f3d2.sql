INSERT INTO public.project_qr_codes (tenant_id, project_id, code, channel, label, is_active)
SELECT p.tenant_id, p.id, substr(replace(gen_random_uuid()::text,'-',''),1,8), 'general', 'QR chung', true
FROM public.projects p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.project_qr_codes q WHERE q.project_id = p.id);