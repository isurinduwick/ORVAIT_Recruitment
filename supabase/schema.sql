-- Generic Recruitment Portal — Recruitment Questionnaire Schema
-- Paste into Supabase SQL Editor and run.

create extension if not exists "pgcrypto";

create table if not exists public.candidates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  token         uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  submitted_at  timestamptz,
  expires_at    timestamptz,
  status        text not null default 'invited'
                check (status in ('invited','in_progress','submitted','expired')),
  expected_salary       numeric,
  expected_salary_currency text default 'LKR',
  salary_notes  text,
  attitude_rating   int check (attitude_rating between 1 and 5),
  knowledge_rating  int check (knowledge_rating between 1 and 5),
  shortlisted   boolean,
  admin_notes   text
);

create index if not exists candidates_status_idx on public.candidates(status);

create table if not exists public.responses (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  question_id   text not null,
  answer        text,
  auto_score    int,
  created_at    timestamptz not null default now(),
  unique (candidate_id, question_id)
);

create index if not exists responses_candidate_idx on public.responses(candidate_id);

-- RLS: we'll use the service role on the server for all reads/writes,
-- and deny everything from the client by default. Candidates reach their
-- questionnaire through a server action that verifies the token.
alter table public.candidates enable row level security;
alter table public.responses  enable row level security;

-- No public policies. The service role bypasses RLS automatically.