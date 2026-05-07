-- CV storage migration
-- Run this in your Supabase SQL Editor

-- 1. Add cv_path column to candidates
alter table public.candidates
  add column if not exists cv_path text;

-- 2. Create the storage bucket (private — only service role can access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  10485760, -- 10 MB
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- 3. No public RLS policies needed — the app uses the service role key which bypasses RLS.
--    If you ever want to lock storage down further, add policies here.