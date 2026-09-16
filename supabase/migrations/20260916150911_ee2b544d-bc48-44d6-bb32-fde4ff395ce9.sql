INSERT INTO public.user_roles (tenant_id, user_id, role)
SELECT 'd7a0c1a3-8aae-4c5f-a84c-21b3ca96279b', '55a5edbd-3c71-4b57-94c4-7191f14b8554', 'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE tenant_id = 'd7a0c1a3-8aae-4c5f-a84c-21b3ca96279b'
    AND user_id = '55a5edbd-3c71-4b57-94c4-7191f14b8554'
    AND role = 'agent'
);

UPDATE public.profiles
SET default_tenant_id = 'd7a0c1a3-8aae-4c5f-a84c-21b3ca96279b',
    full_name = COALESCE(full_name, 'Sale SaleBDS')
WHERE user_id = '55a5edbd-3c71-4b57-94c4-7191f14b8554';