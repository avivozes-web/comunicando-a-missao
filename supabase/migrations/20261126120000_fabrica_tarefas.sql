-- Fábrica: datas de gravar/editar viram tarefas; post novo só gera "Postar";
-- títulos "Postar o vídeo/carrossel"; dono da edição Isabelle + Bezalel;
-- vínculo da tarefa com o cartão da Fábrica (idea_id).

alter table public.ideas
  add column if not exists record_date date,
  add column if not exists edit_date date;

alter table public.tasks
  add column if not exists idea_id uuid references public.ideas(id) on delete set null;

create unique index if not exists tasks_idea_step_unique
  on public.tasks (idea_id, step)
  where idea_id is not null and step is not null;

create or replace function public.step_prefix(st text, fmt text)
returns text language sql immutable as $$
  select case st
    when 'gravar' then case when public.is_video_format(fmt) then 'Gravar ' else 'Plano slide por slide do ' end
    when 'editar' then case when public.is_video_format(fmt) then 'Editar ' else 'Confecção do ' end
    when 'aprovar' then 'Aprovar a capa e a legenda do '
    when 'postar' then case
      when fmt in ('reel', 'video') then 'Postar o vídeo: '
      when fmt = 'carrossel' then 'Postar o carrossel: '
      when fmt = 'stories' then 'Postar o stories: '
      when fmt = 'post_leve' then 'Postar o post leve: '
      else 'Postar: '
    end
    else 'Postar: '
  end
$$;

create or replace function public.step_assignee(st text, fmt text)
returns text language sql immutable as $$
  select case st
    when 'gravar' then 'Isabelle'
    when 'editar' then case when public.is_video_format(fmt) then 'Isabelle + Bezalel' else 'Lídia + Isabelle' end
    when 'aprovar' then 'Lídia + Isabelle'
    else 'Lídia'
  end
$$;

-- Post novo só cria a tarefa de postar, no dia do post. Gravar e editar
-- entram só quando a Isabelle coloca a data na Fábrica.
create or replace function public.sync_post_tasks()
returns trigger language plpgsql as $$
begin
  if public.post_is_placeholder(new.title) then
    return new;
  end if;

  if tg_op = 'INSERT' or public.post_is_placeholder(old.title) then
    insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, step, origin_date, sort)
    values (
      public.step_prefix('postar', new.format) || new.title,
      'Lídia',
      new.account,
      new.scheduled_date,
      public.status_reaches(new.status, 'postado'),
      'generated',
      new.id,
      'postar',
      new.scheduled_date,
      83
    )
    on conflict (post_id, step) where post_id is not null and step is not null
    do update set title = excluded.title, account = excluded.account, done = excluded.done,
                  due_date = excluded.due_date, origin_date = excluded.origin_date;
    return new;
  end if;

  update public.tasks t
  set title = case
        when t.title = public.step_prefix(t.step, old.format) || old.title
          or t.title = ('Postar ' || old.title)
        then public.step_prefix(t.step, new.format) || new.title
        else t.title end,
      account = new.account,
      done = case
        when t.step = 'postar' then public.status_reaches(new.status, 'postado')
        else t.done end,
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

-- Datas de gravar e de editar no cartão da Fábrica viram tarefa nesses dias.
create or replace function public.upsert_idea_step_task(p_idea public.ideas, p_step text, p_due date)
returns void language plpgsql as $$
declare
  fmt text := coalesce(p_idea.format, 'carrossel');
  updated integer;
begin
  if p_due is null then
    return;
  end if;

  update public.tasks
  set title = public.step_prefix(p_step, fmt) || p_idea.title,
      account = p_idea.account,
      due_date = p_due,
      origin_date = p_due,
      idea_id = p_idea.id,
      post_id = coalesce(post_id, p_idea.post_id),
      rolled_from = null
  where step = p_step
    and (
      idea_id = p_idea.id
      or (p_idea.post_id is not null and post_id = p_idea.post_id)
    );

  get diagnostics updated = row_count;
  if updated > 0 then
    return;
  end if;

  insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, idea_id, step, origin_date, sort)
  values (
    public.step_prefix(p_step, fmt) || p_idea.title,
    public.step_assignee(p_step, fmt),
    p_idea.account,
    p_due,
    false,
    'generated',
    p_idea.post_id,
    p_idea.id,
    p_step,
    p_due,
    case p_step when 'gravar' then 80 when 'editar' then 81 else 82 end
  );
end;
$$;

create or replace function public.sync_idea_date_tasks()
returns trigger language plpgsql as $$
begin
  if new.archived then
    return new;
  end if;

  perform public.upsert_idea_step_task(new, 'gravar', new.record_date);
  perform public.upsert_idea_step_task(new, 'editar', new.edit_date);

  if new.post_id is not null then
    update public.tasks
    set idea_id = new.id
    where post_id = new.post_id and idea_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists ideas_sync_date_tasks on public.ideas;
create trigger ideas_sync_date_tasks
after insert or update of title, format, account, record_date, edit_date, post_id, archived
on public.ideas
for each row execute function public.sync_idea_date_tasks();

-- Atualiza o nome automático das tarefas de postar que ainda estão no formato antigo.
update public.tasks t
set title = public.step_prefix('postar', p.format) || p.title
from public.posts p
where t.post_id = p.id
  and t.step = 'postar'
  and t.title = 'Postar ' || p.title;

-- Dono da edição nos vídeos: Isabelle + Bezalel, só onde ainda estava só Bezalel.
update public.tasks t
set assignee = 'Isabelle + Bezalel'
from public.posts p
where t.post_id = p.id
  and t.step = 'editar'
  and t.assignee = 'Bezalel'
  and public.is_video_format(p.format);
