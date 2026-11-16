-- Rodada da Isabelle em 16/11. Safe to run on the database created by the init migration.

alter table public.posts add column if not exists legenda_whatsapp text;
alter table public.posts add column if not exists ready_checks jsonb not null default '{}'::jsonb;

alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check
  check (status in ('ideia', 'roteiro', 'gravado', 'editado', 'arte_pronta', 'aprovado', 'pronto', 'postado'));

alter table public.tasks add column if not exists note text;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  idea_id uuid references public.ideas (id) on delete cascade,
  body text not null,
  author text not null default '',
  kind text not null default 'ajuste' check (kind in ('ajuste', 'resposta', 'nota')),
  created_at timestamptz not null default now(),
  constraint post_comments_target_chk check (post_id is not null or idea_id is not null)
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists post_comments_idea_idx on public.post_comments (idea_id, created_at);

create table if not exists public.report_actions (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('escola', 'missao')),
  report_id uuid references public.reports (id) on delete set null,
  body text not null,
  basis text,
  action_date date not null,
  sort int not null default 0,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_actions_account_idx on public.report_actions (account, action_date);

create unique index if not exists tasks_stories_from_post_uidx
  on public.tasks (post_id)
  where post_id is not null and title like 'Stories: %';

create or replace function public.status_reaches(st text, need text)
returns boolean
language sql
immutable
as $$
  select coalesce(array_position(array['ideia','roteiro','gravado','editado','arte_pronta','aprovado','pronto','postado'], st), 0)
       >= coalesce(array_position(array['ideia','roteiro','gravado','editado','arte_pronta','aprovado','pronto','postado'], need), 99);
$$;

create or replace function public.ensure_stories_task()
returns trigger
language plpgsql
as $$
begin
  if new.format not in ('reel', 'carrossel', 'video') or public.post_is_placeholder(new.title) then
    return new;
  end if;
  if new.status <> 'aprovado' then
    return new;
  end if;

  update public.tasks
  set title = 'Stories: ' || new.title,
      due_date = case when rolled_from is null then new.scheduled_date else due_date end,
      origin_date = coalesce(origin_date, new.scheduled_date)
  where post_id = new.id
    and title like 'Stories: %';

  if not found then
    insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, origin_date, note, sort)
    values (
      'Stories: ' || new.title,
      'Lídia + Isabelle',
      'escola',
      new.scheduled_date,
      false,
      'adhoc',
      new.id,
      new.scheduled_date,
      'puxar para a matrícula 2027',
      55
    );
  end if;
  return new;
end;
$$;

drop trigger if exists posts_stories_task on public.posts;
create trigger posts_stories_task
  after insert or update of status, title, scheduled_date, format
  on public.posts
  for each row execute function public.ensure_stories_task();

alter table public.post_comments enable row level security;
alter table public.report_actions enable row level security;

drop policy if exists post_comments_auth_all on public.post_comments;
create policy post_comments_auth_all on public.post_comments
  for all to authenticated using (true) with check (true);

drop policy if exists report_actions_auth_all on public.report_actions;
create policy report_actions_auth_all on public.report_actions
  for all to authenticated using (true) with check (true);

revoke all on public.post_comments from anon;
revoke all on public.report_actions from anon;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.report_actions to authenticated;
