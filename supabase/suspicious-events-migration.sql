-- Suspicious events (proctoring) table
-- Run this in your Supabase SQL Editor

create table if not exists public.suspicious_events (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  event_type    text not null,
  detail        text,
  occurred_at   timestamptz not null default now()
);

create index if not exists suspicious_events_candidate_idx
  on public.suspicious_events(candidate_id);

create index if not exists suspicious_events_occurred_idx
  on public.suspicious_events(occurred_at);

-- Service role bypasses RLS; deny everything from the public/anon client
alter table public.suspicious_events enable row level security;
