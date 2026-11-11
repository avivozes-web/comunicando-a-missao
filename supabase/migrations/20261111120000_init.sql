-- Comunicando a Missão
-- Apply this file first in the Supabase SQL editor, then supabase/seed.sql.
-- Authenticated team members can read and write. Bots use the service role, which bypasses RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Planning
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('escola', 'missao')),
  title text not null,
  format text not null check (format in ('reel', 'carrossel', 'stories', 'post_leve', 'video')),
  status text not null default 'ideia' check (status in ('ideia', 'roteiro', 'gravado', 'editado', 'arte_pronta', 'aprovado', 'postado')),
  scheduled_date date not null,
  scheduled_time time,
  aspect text,
  legenda text,
  cover_url text,
  drive_url text,
  checklist jsonb not null default '[]'::jsonb,
  note text,
  date_tag text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('escola', 'missao')),
  title text not null,
  body text not null default '',
  format text not null default 'carrossel',
  tags text[] not null default '{}',
  status text not null default 'ideia' check (status in ('ideia', 'aprovada', 'rejeitada', 'publicada')),
  suggested_date date,
  heart boolean not null default false,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fixed_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text not null default '',
  weekdays int[] not null,
  account text check (account in ('escola', 'missao')),
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text not null default '',
  account text check (account in ('escola', 'missao')),
  due_date date not null,
  done boolean not null default false,
  kind text not null default 'adhoc' check (kind in ('fixed', 'adhoc', 'generated')),
  rolled_from date,
  origin_date date,
  post_id uuid references public.posts (id) on delete cascade,
  fixed_task_id uuid references public.fixed_tasks (id) on delete cascade,
  step text check (step in ('gravar', 'editar', 'aprovar', 'postar')),
  badge text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tasks_post_step_uidx
  on public.tasks (post_id, step)
  where post_id is not null and step is not null;

create unique index tasks_fixed_origin_uidx
  on public.tasks (fixed_task_id, origin_date)
  where fixed_task_id is not null and origin_date is not null;

create index tasks_due_idx on public.tasks (due_date);
create index posts_date_idx on public.posts (scheduled_date);

create table public.year_months (
  year int not null,
  month int not null check (month between 1 and 12),
  theme text,
  campaign boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (year, month)
);

create table public.year_dates (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  label text not null,
  detail text,
  kind text not null default 'data' check (kind in ('data', 'escola', 'missao', 'pausa')),
  event_date date,
  created_at timestamptz not null default now()
);

create table public.narrative (
  id int primary key default 1 check (id = 1),
  body text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Metrics (written by bots; the app reads them)
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('escola', 'missao')),
  kind text not null check (kind in ('semanal', 'mensal')),
  period_start date not null,
  period_end date not null,
  title text not null,
  subtitle text,
  pdf_url text,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (account, kind, period_start)
);

create table public.follower_snapshots (
  account text not null check (account in ('escola', 'missao')),
  snapshot_date date not null,
  arroba text not null,
  nome text not null default '',
  primary key (account, snapshot_date, arroba)
);

create table public.followers (
  account text not null check (account in ('escola', 'missao')),
  arroba text not null,
  nome text not null default '',
  seguidores int,
  seguindo int,
  posts int,
  privado boolean not null default false,
  bio text,
  nicho text,
  ficha_em date,
  primary key (account, arroba)
);

create table public.follower_events (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('escola', 'missao')),
  event_date date not null,
  kind text not null check (kind in ('entrou', 'saiu')),
  arroba text,
  nome text,
  note text
);

create index follower_events_date_idx on public.follower_events (account, event_date desc);

create table public.goal_days (
  account text not null check (account in ('escola', 'missao')),
  day date not null,
  total int,
  entraram int,
  sairam int,
  saldo int,
  fonte text,
  status text,
  meta_dia numeric,
  meta_semana int,
  acumulada int,
  foco text,
  primary key (account, day)
);

create table public.goal_config (
  account text primary key check (account in ('escola', 'missao')),
  alvo int not null,
  data_alvo date not null,
  inicio date not null,
  base int not null,
  base_data date not null,
  rampa jsonb not null default '[]'::jsonb,
  checkpoints jsonb not null default '[]'::jsonb,
  funil jsonb,
  posts_metricas jsonb not null default '[]'::jsonb,
  link_insights jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.link_taps (
  account text not null check (account in ('escola', 'missao')),
  day date not null,
  periodo text not null default '',
  toques int,
  fonte text,
  primary key (account, day, periodo)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger ideas_touch before update on public.ideas
  for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger narrative_touch before update on public.narrative
  for each row execute function public.touch_updated_at();
create trigger year_months_touch before update on public.year_months
  for each row execute function public.touch_updated_at();
create trigger goal_config_touch before update on public.goal_config
  for each row execute function public.touch_updated_at();

create or replace function public.status_reaches(st text, need text)
returns boolean
language sql
immutable
as $$
  select coalesce(array_position(array['ideia','roteiro','gravado','editado','arte_pronta','aprovado','postado'], st), 0)
       >= coalesce(array_position(array['ideia','roteiro','gravado','editado','arte_pronta','aprovado','postado'], need), 99);
$$;

create or replace function public.post_is_placeholder(title text)
returns boolean
language sql
immutable
as $$
  select title ~* '(a definir|tema a definir|nenhum marcado|sem tema)';
$$;

-- Each real post gets gravar / editar / aprovar / postar, walking backward from the publish date.
create or replace function public.sync_post_tasks()
returns trigger
language plpgsql
as $$
begin
  if public.post_is_placeholder(new.title) then
    return new;
  end if;

  insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, step, origin_date, sort)
  values
    ('Gravar ' || new.title, 'Isabelle', new.account, new.scheduled_date - 3, public.status_reaches(new.status, 'gravado'), 'generated', new.id, 'gravar', new.scheduled_date - 3, 80),
    ('Editar ' || new.title, 'Bezalel', new.account, new.scheduled_date - 2, public.status_reaches(new.status, 'editado'), 'generated', new.id, 'editar', new.scheduled_date - 2, 81),
    ('Aprovar a capa e a legenda do ' || new.title, 'Lídia + Isabelle', new.account, new.scheduled_date - 1, public.status_reaches(new.status, 'aprovado'), 'generated', new.id, 'aprovar', new.scheduled_date - 1, 82),
    ('Postar ' || new.title, 'Lídia', new.account, new.scheduled_date, public.status_reaches(new.status, 'postado'), 'generated', new.id, 'postar', new.scheduled_date, 83)
  on conflict (post_id, step) where post_id is not null and step is not null
  do update set
    title = excluded.title,
    account = excluded.account,
    origin_date = excluded.origin_date,
    due_date = case when public.tasks.rolled_from is null then excluded.due_date else public.tasks.due_date end,
    done = excluded.done,
    sort = excluded.sort;

  return new;
end;
$$;

create trigger posts_sync_tasks
  after insert or update of title, scheduled_date, status, account
  on public.posts
  for each row execute function public.sync_post_tasks();

create or replace function public.materialize_fixed_tasks(p_from date, p_to date)
returns void
language plpgsql
as $$
declare
  d date;
  ft record;
  wd int;
begin
  if p_from is null or p_to is null or p_to < p_from then
    return;
  end if;
  d := p_from;
  while d <= p_to loop
    wd := extract(isodow from d);
    for ft in
      select * from public.fixed_tasks
      where active and wd = any (weekdays)
    loop
      insert into public.tasks (title, assignee, account, due_date, done, kind, fixed_task_id, origin_date, sort)
      select ft.title, ft.assignee, ft.account, d, false, 'fixed', ft.id, d, ft.sort
      where not exists (
        select 1 from public.tasks t
        where t.fixed_task_id = ft.id and t.origin_date = d
      );
    end loop;
    d := d + 1;
  end loop;
end;
$$;

-- One-shot tasks (avulsas and the ones a post generates) move to today if they were left open.
-- The weekday routine is created again each morning, so those rows are not rolled.
create or replace function public.rollover_tasks(p_today date)
returns void
language plpgsql
as $$
begin
  update public.tasks
  set due_date = p_today,
      rolled_from = coalesce(rolled_from, due_date)
  where done = false
    and due_date < p_today
    and kind in ('adhoc', 'generated');
end;
$$;

grant execute on function public.materialize_fixed_tasks(date, date) to authenticated;
grant execute on function public.rollover_tasks(date) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: only signed-in users. The service role bypasses these policies.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'posts', 'ideas', 'tasks', 'fixed_tasks', 'year_months', 'year_dates',
    'narrative', 'reports', 'follower_snapshots', 'followers', 'follower_events',
    'goal_days', 'goal_config', 'link_taps'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_auth_all', t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage: cover images. Authenticated upload, public read.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capas',
  'capas',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists capas_select_public on storage.objects;
drop policy if exists capas_insert_auth on storage.objects;
drop policy if exists capas_update_auth on storage.objects;
drop policy if exists capas_delete_auth on storage.objects;

create policy capas_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'capas');

create policy capas_insert_auth
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'capas');

create policy capas_update_auth
  on storage.objects for update
  to authenticated
  using (bucket_id = 'capas')
  with check (bucket_id = 'capas');

create policy capas_delete_auth
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'capas');
