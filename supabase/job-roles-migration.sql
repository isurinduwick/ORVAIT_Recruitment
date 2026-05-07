-- Job roles migration
-- Run this in your Supabase SQL Editor

create table if not exists public.job_roles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.job_roles enable row level security;

alter table public.candidates
  add column if not exists job_role_id uuid references public.job_roles(id) on delete set null;

create index if not exists candidates_job_role_idx on public.candidates(job_role_id);
