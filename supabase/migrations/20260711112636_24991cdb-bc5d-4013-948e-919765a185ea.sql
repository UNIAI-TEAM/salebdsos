ALTER TABLE public.airdrop_shares REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.airdrop_shares;