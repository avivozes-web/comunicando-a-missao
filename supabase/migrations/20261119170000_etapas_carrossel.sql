-- Carrossel, post leve e stories não são gravados nem editados:
-- etapas viram "Plano slide por slide" e "Confecção". Reel e vídeo continuam Gravar/Editar.
create or replace function public.is_video_format(fmt text)
returns boolean language sql immutable as $$ select fmt in ('reel', 'video') $$;

create or replace function public.step_prefix(st text, fmt text)
returns text language sql immutable as $$
  select case st
    when 'gravar' then case when public.is_video_format(fmt) then 'Gravar ' else 'Plano slide por slide do ' end
    when 'editar' then case when public.is_video_format(fmt) then 'Editar ' else 'Confecção do ' end
    when 'aprovar' then 'Aprovar a capa e a legenda do '
    else 'Postar ' end
$$;

create or replace function public.sync_post_tasks()
returns trigger language plpgsql as $$
declare
  fresh boolean;
  video boolean := public.is_video_format(new.format);
begin
  if public.post_is_placeholder(new.title) then
    return new;
  end if;
  fresh := tg_op = 'INSERT' or public.post_is_placeholder(old.title);

  if fresh then
    insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, step, origin_date, sort)
    values
      (public.step_prefix('gravar', new.format) || new.title, 'Isabelle', new.account, public.workday_before(new.scheduled_date - 3), public.status_reaches(new.status, 'gravado'), 'generated', new.id, 'gravar', public.workday_before(new.scheduled_date - 3), 80),
      (public.step_prefix('editar', new.format) || new.title, case when video then 'Bezalel' else 'Lídia + Isabelle' end, new.account, public.workday_before(new.scheduled_date - 2), public.status_reaches(new.status, 'editado'), 'generated', new.id, 'editar', public.workday_before(new.scheduled_date - 2), 81),
      ('Aprovar a capa e a legenda do ' || new.title, 'Lídia + Isabelle', new.account, public.workday_before(new.scheduled_date - 1), public.status_reaches(new.status, 'aprovado'), 'generated', new.id, 'aprovar', public.workday_before(new.scheduled_date - 1), 82),
      ('Postar ' || new.title, 'Lídia', new.account, new.scheduled_date, public.status_reaches(new.status, 'postado'), 'generated', new.id, 'postar', new.scheduled_date, 83)
    on conflict (post_id, step) where post_id is not null and step is not null
    do update set title = excluded.title, account = excluded.account, done = excluded.done;
    return new;
  end if;

  update public.tasks t
  set title = case
        -- Só renomeia se a tarefa ainda tem o nome automático (nome trocado à mão fica).
        when t.title = public.step_prefix(t.step, old.format) || old.title
        then public.step_prefix(t.step, new.format) || new.title
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

drop trigger if exists posts_sync_tasks on public.posts;
create trigger posts_sync_tasks after insert or update of title, scheduled_date, status, account, format on public.posts
for each row execute function public.sync_post_tasks();
