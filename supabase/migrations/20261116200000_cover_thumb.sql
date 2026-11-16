-- Public thumbnail for the library card. The Drive file stays private.
alter table public.posts add column if not exists cover_thumb_url text;
