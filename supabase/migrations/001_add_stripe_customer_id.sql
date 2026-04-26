-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ytemurvflobeksxmidow/sql
alter table public.subscriptions add column if not exists stripe_customer_id text;
