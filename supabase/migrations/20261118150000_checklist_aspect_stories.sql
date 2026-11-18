-- Checklist padrão em post novo (e no que estiver vazio),
-- proporção pelo formato, e tarefa de Stories na mesma conta do post.

create or replace function public.aspect_for_format(fmt text)
returns text
language sql
immutable
as $$
  select case fmt
    when 'reel' then '9:16'
    when 'stories' then '9:16'
    when 'video' then '16:9'
    when 'carrossel' then '4:5'
    when 'post_leve' then '4:5'
    else null
  end;
$$;

create or replace function public.programado_label(fmt text, tm time)
returns text
language sql
immutable
as $$
  select case
    when tm is not null then 'Programado ' || to_char(tm, 'FMHH24') || 'h' || to_char(tm, 'MI')
    when fmt in ('carrossel', 'post_leve') then 'Programado 12h07'
    when fmt in ('reel', 'video') then 'Programado 12h05'
    else 'Programado'
  end;
$$;

create or replace function public.default_post_checklist(
  fmt text,
  tm time,
  ig text default null,
  wa text default null,
  status text default 'ideia',
  has_cover boolean default false
)
returns jsonb
language plpgsql
immutable
as $$
declare
  ig_done boolean := coalesce(length(trim(ig)), 0) > 0;
  wa_done boolean := coalesce(length(trim(wa)), 0) > 0;
  arte_done boolean := public.status_reaches(coalesce(status, 'ideia'), 'arte_pronta');
  video_done boolean := public.status_reaches(coalesce(status, 'ideia'), 'aprovado');
  prog_done boolean := tm is not null or public.status_reaches(coalesce(status, 'ideia'), 'pronto');
  quero_done boolean := coalesce(status, 'ideia') = 'postado';
  ig_label text := 'Legenda do Instagram aprovada'
    || case when ig_done then ' (' || length(ig) || ' caracteres)' else '' end;
  prog_label text := public.programado_label(fmt, tm);
  items jsonb := '[]'::jsonb;
begin
  if fmt in ('reel', 'video') then
    items := items
      || jsonb_build_array(jsonb_build_object('done', video_done, 'label', 'Vídeo aprovado'))
      || jsonb_build_array(jsonb_build_object('done', has_cover, 'label', 'Capa'))
      || jsonb_build_array(jsonb_build_object('done', ig_done, 'label', ig_label))
      || jsonb_build_array(jsonb_build_object('done', wa_done, 'label', 'Legenda do WhatsApp'))
      || jsonb_build_array(jsonb_build_object('done', prog_done, 'label', prog_label))
      || jsonb_build_array(jsonb_build_object('done', quero_done, 'label', '1º comentário QUERO'));
  elsif fmt = 'stories' then
    items := items
      || jsonb_build_array(jsonb_build_object('done', arte_done, 'label', 'Arte aprovada'))
      || jsonb_build_array(jsonb_build_object('done', wa_done, 'label', 'Legenda do WhatsApp'))
      || jsonb_build_array(jsonb_build_object('done', prog_done, 'label', prog_label));
  else
    -- carrossel, post_leve e qualquer formato novo no mesmo padrão do carrossel
    items := items
      || jsonb_build_array(jsonb_build_object('done', arte_done, 'label', 'Arte aprovada'))
      || jsonb_build_array(jsonb_build_object('done', ig_done, 'label', ig_label))
      || jsonb_build_array(jsonb_build_object('done', wa_done, 'label', 'Legenda do WhatsApp'))
      || jsonb_build_array(jsonb_build_object('done', prog_done, 'label', prog_label))
      || jsonb_build_array(jsonb_build_object('done', quero_done, 'label', '1º comentário QUERO'));
  end if;
  return items;
end;
$$;

create or replace function public.ensure_post_defaults()
returns trigger
language plpgsql
as $$
begin
  new.aspect := public.aspect_for_format(new.format);
  if new.checklist is null or new.checklist = '[]'::jsonb then
    new.checklist := public.default_post_checklist(
      new.format,
      new.scheduled_time,
      new.legenda,
      new.legenda_whatsapp,
      new.status,
      (new.cover_url is not null or new.cover_thumb_url is not null)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists posts_defaults on public.posts;
create trigger posts_defaults
before insert or update on public.posts
for each row execute function public.ensure_post_defaults();

update public.posts
set checklist = public.default_post_checklist(
  format,
  scheduled_time,
  legenda,
  legenda_whatsapp,
  status,
  (cover_url is not null or cover_thumb_url is not null)
)
where checklist is null or checklist = '[]'::jsonb;

update public.posts
set aspect = public.aspect_for_format(format)
where aspect is distinct from public.aspect_for_format(format);

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
      account = new.account,
      note = case
        when new.account = 'missao' and (note is null or note = 'puxar para a matrícula 2027')
          then 'puxar para a oferta / oração'
        when new.account = 'escola' and (note is null or note = 'puxar para a oferta / oração')
          then 'puxar para a matrícula 2027'
        else note
      end,
      due_date = case when rolled_from is null then new.scheduled_date else due_date end,
      origin_date = coalesce(origin_date, new.scheduled_date)
  where post_id = new.id
    and title like 'Stories: %';

  if not found then
    insert into public.tasks (title, assignee, account, due_date, done, kind, post_id, origin_date, note, sort)
    values (
      'Stories: ' || new.title,
      'Lídia + Isabelle',
      new.account,
      new.scheduled_date,
      false,
      'adhoc',
      new.id,
      new.scheduled_date,
      case when new.account = 'missao' then 'puxar para a oferta / oração' else 'puxar para a matrícula 2027' end,
      55
    );
  end if;
  return new;
end;
$$;

drop trigger if exists posts_stories_task on public.posts;
create trigger posts_stories_task
after insert or update of status, title, scheduled_date, format, account
on public.posts
for each row execute function public.ensure_stories_task();

update public.tasks t
set account = p.account,
    note = case
      when p.account = 'missao' and (t.note is null or t.note = 'puxar para a matrícula 2027')
        then 'puxar para a oferta / oração'
      else t.note
    end
from public.posts p
where t.post_id = p.id
  and t.title like 'Stories: %'
  and t.account is distinct from p.account;
