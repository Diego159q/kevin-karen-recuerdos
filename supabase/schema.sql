-- Ejecuta este archivo en Supabase SQL Editor.
-- Crea el bucket, tabla y politicas necesarias para la app de recuerdos.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-memories',
  'wedding-memories',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.wedding_memories (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  table_name text default 'Sin mesa',
  relation text default 'Invitado',
  moment text not null,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('image', 'video')),
  mime_type text,
  size_bytes bigint,
  public_url text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.wedding_memories enable row level security;

drop policy if exists "Public can read wedding memories" on public.wedding_memories;
create policy "Public can read wedding memories"
on public.wedding_memories
for select
to anon, authenticated
using (true);

drop policy if exists "Public can insert wedding memories" on public.wedding_memories;
create policy "Public can insert wedding memories"
on public.wedding_memories
for insert
to anon, authenticated
with check (true);

-- Practico para la primera version. En produccion conviene proteger delete con login real.
drop policy if exists "Public can delete wedding memories" on public.wedding_memories;
create policy "Public can delete wedding memories"
on public.wedding_memories
for delete
to anon, authenticated
using (true);

drop policy if exists "Public can read wedding memory files" on storage.objects;
create policy "Public can read wedding memory files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'wedding-memories');

drop policy if exists "Public can upload wedding memory files" on storage.objects;
create policy "Public can upload wedding memory files"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'wedding-memories');

-- Practico para la primera version. En produccion conviene proteger delete con login real.
drop policy if exists "Public can delete wedding memory files" on storage.objects;
create policy "Public can delete wedding memory files"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'wedding-memories');

create index if not exists wedding_memories_created_at_idx
on public.wedding_memories (created_at desc);

create index if not exists wedding_memories_moment_idx
on public.wedding_memories (moment);
