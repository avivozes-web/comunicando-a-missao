-- Fábrica de Conteúdo: etapas novas e colunas de curso, roteiro, arquivo e vínculo com o post.
-- Already applied on the Comunicando a Missão project.

alter table public.ideas
  add column if not exists course text,
  add column if not exists script_url text,
  add column if not exists archived boolean not null default false,
  add column if not exists post_id uuid references public.posts(id) on delete set null;

alter table public.ideas drop constraint if exists ideas_course_check;
alter table public.ideas
  add constraint ideas_course_check
  check (course is null or course = any (array['FIMC'::text, 'Teologia'::text, 'Missiologia'::text, 'Portal'::text]));

alter table public.ideas drop constraint if exists ideas_status_check;
alter table public.ideas
  add constraint ideas_status_check
  check (status = any (array[
    'ideia'::text,
    'aprovada'::text,
    'roteiro_pronto'::text,
    'em_producao'::text,
    'pronto_postar'::text,
    'postado'::text,
    'rejeitada'::text
  ]));
