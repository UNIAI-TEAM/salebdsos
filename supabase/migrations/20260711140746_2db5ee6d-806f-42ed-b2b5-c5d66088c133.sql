-- Add batch_id to audit_logs so ZIP batches and other grouped operations can be filtered/cross-referenced quickly.
ALTER TABLE public.audit_logs ADD COLUMN batch_id text;

CREATE INDEX idx_audit_batch_id ON public.audit_logs(tenant_id, batch_id);