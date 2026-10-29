create table if not exists public.zalo_site_verifications (
  code text primary key check (code ~ '^[A-Za-z0-9_-]{8,80}$'),
  tenant_id uuid not null,
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);
revoke all on public.zalo_site_verifications from anon, authenticated;
grant all on public.zalo_site_verifications to service_role;
create index if not exists zalo_site_verifications_tenant_idx on public.zalo_site_verifications(tenant_id);
alter table public.zalo_site_verifications enable row level security;