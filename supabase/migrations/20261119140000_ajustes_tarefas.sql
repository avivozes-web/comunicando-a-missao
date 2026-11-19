-- Ajustes de 19/11: apagar tarefa fixa, só "Postar" acompanha o post,
-- Tarefas e Semana ligadas, nada automático no fim de semana.

-- 1. Tarefa fixa apagada não volta: o dia apagado fica registrado.
create table if not exists public.fixed_task_skips (
  fixed_task_id uuid not null references public.fixed_tasks(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (fixed_task_id, day)
);
alter table public.fixed_task_skips enable row level security;
drop policy if exists fixed_task_skips_auth_all on public.fixed_task_skips;
create policy fixed_task_skips_auth_all on public.fixed_task_skips for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.fixed_task_skips to authenticated;

create or replace function public.remember_fixed_skip()
returns trigger language plpgsql as $$
begin
  if old.fixed_task_id is not null and old.origin_date is not null then
    insert into public.fixed_task_skips (fixed_task_id, day)
    values (old.fixed_task_id, old.origin_date)
    on conflict do nothing;
  end if;
  return old;
end;
$$;
drop trigger if exists tasks_fixed_skip on public.tasks;
create trigger tasks_fixed_skip before delete on public.tasks
for each row execute function public.remember_fixed_skip();

create or replace function public.materialize_fixed_tasks(p_from date, p_to date)
returns void language plpgsql as $$
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
    for ft in select * from public.fixed_tasks where active and wd = any (weekdays) loop
      insert into public.tasks (title, assignee, account, due_date, done, kind, fixed_task_id, origin_date, sort)
      select ft.title, ft.assignee, ft.account, d, false, 'fixed', ft.id, d, ft.sort
      where not exists (select 1 from public.tasks t where t.fixed_task_id = ft.id and t.origin_date = d)
        and not exists (select 1 from public.fixed_task_skips s where s.fixed_task_id = ft.id and s.day = d);
    end loop;
    d := d + 1;
  end loop;
end;
$$;

-- 4. Data calculada pelo sistema que cai em sábado ou domingo vai para a sexta antes.
create or replace function public.workday_before(d date)
returns date language sql immutable as $$
  select case extract(isodow from d)::int when 6 then d - 1 when 7 then d - 2 else d end
$$;

-- Passar tarefa atrasada não acontece no sábado nem no domingo.
create or replace function public.rollover_tasks(p_today date)
returns void language plpgsql as $$
begin
  if extract(isodow from p_today) in (6, 7) then
    return;
  end if;
  perform set_config('app.rollover', 'on', true);
  update public.tasks
  set due_date = p_today,
      rolled_from = coalesce(rolled_from, due_date)
  where done = false
    and due_date < p_today
    and kind in ('adhoc', 'generated');
  perform set_config('app.rollover', 'off', true);
end;
$$;

-- 2. Só a tarefa "Postar" acompanha a data do post. Gravar, editar e aprovar ficam onde estão.
-- Tarefa apagada não volta quando o post é salvo de novo.
create or replace function public.sync_post_tasks()
returns trigger language plpgsql as $$
declare
  fresh boolean;
begin
  if public.post_is_placeholder(new.title) then
    return new;
  end if;
  fresh := tg_op = 'INSERT' or public.post_is_placeholder(old.title);

  if fresh then
    insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, step, origin_date, sort)
    values
      ('Gravar ' || new.title, 'Isabelle', new.account, public.workday_before(new.scheduled_date - 3), public.status_reaches(new.status, 'gravado'), 'generated', new.id, 'gravar', public.workday_before(new.scheduled_date - 3), 80),
      ('Editar ' || new.title, 'Bezalel', new.account, public.workday_before(new.scheduled_date - 2), public.status_reaches(new.status, 'editado'), 'generated', new.id, 'editar', public.workday_before(new.scheduled_date - 2), 81),
      ('Aprovar a capa e a legenda do ' || new.title, 'Lídia + Isabelle', new.account, public.workday_before(new.scheduled_date - 1), public.status_reaches(new.status, 'aprovado'), 'generated', new.id, 'aprovar', public.workday_before(new.scheduled_date - 1), 82),
      ('Postar ' || new.title, 'Lídia', new.account, new.scheduled_date, public.status_reaches(new.status, 'postado'), 'generated', new.id, 'postar', new.scheduled_date, 83)
    on conflict (post_id, step) where post_id is not null and step is not null
    do update set title = excluded.title, account = excluded.account, done = excluded.done;
    return new;
  end if;

  update public.tasks t
  set title = case
        when old.title is distinct from new.title and t.title = (case t.step
          when 'gravar' then 'Gravar ' when 'editar' then 'Editar '
          when 'aprovar' then 'Aprovar a capa e a legenda do ' else 'Postar ' end) || old.title
        then (case t.step
          when 'gravar' then 'Gravar ' when 'editar' then 'Editar '
          when 'aprovar' then 'Aprovar a capa e a legenda do ' else 'Postar ' end) || new.title
        else t.title end,
      account = new.account,
      done = public.status_reaches(new.status, case t.step
        when 'gravar' then 'gravado' when 'editar' then 'editado'
        when 'aprovar' then 'aprovado' else 'postado' end),
      due_date = case
        when t.step = 'postar' and old.scheduled_date is distinct from new.scheduled_date then new.scheduled_date
        else t.due_date end,
      origin_date = case
        when t.step = 'postar' and old.scheduled_date is distinct from new.scheduled_date then new.scheduled_date
        else t.origin_date end,
      rolled_from = case
        when t.step = 'postar' and old.scheduled_date is distinct from new.scheduled_date then null
        else t.rolled_from end
  where t.post_id = new.id and t.step in ('gravar', 'editar', 'aprovar', 'postar');
  return new;
end;
$$;

-- 3. Mudar a data da tarefa "Postar" muda o dia do post (Tarefas e Semana usam a mesma data).
create or replace function public.postar_moves_post()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 1 or coalesce(current_setting('app.rollover', true), 'off') = 'on' then
    return new;
  end if;
  if new.step = 'postar' and new.post_id is not null and new.due_date is distinct from old.due_date then
    update public.posts set scheduled_date = new.due_date
    where id = new.post_id and scheduled_date is distinct from new.due_date;
  end if;
  return new;
end;
$$;
drop trigger if exists tasks_postar_moves_post on public.tasks;
create trigger tasks_postar_moves_post after update of due_date on public.tasks
for each row execute function public.postar_moves_post();
