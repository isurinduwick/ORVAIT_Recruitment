-- Add questions JSONB column to job_roles
-- Run this in your Supabase SQL Editor

alter table public.job_roles
  add column if not exists questions jsonb default '[]'::jsonb;
