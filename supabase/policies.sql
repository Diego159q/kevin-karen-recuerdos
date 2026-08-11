-- ============================================================
-- kevin-karen-recuerdos · Seguridad y datos (version reforzada)
-- Ejecutar en el SQL Editor de Supabase (idempotente: puede
-- re-ejecutarse sin errores).
-- ============================================================

-- 1) Columnas que la app espera (thumb_url faltaba -> causaba el 400)
alter table public.wedding_memories
  add column if not exists thumb_url text,
  add column if not exists created_at timestamptz default now();

-- 2) Realtime: agregar SOLO si aun no esta en la publicacion
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wedding_memories'
  ) then
    alter publication supabase_realtime add table public.wedding_memories;
  end if;
end $$;

-- 3) ROW LEVEL SECURITY en la tabla
alter table public.wedding_memories enable row level security;

drop policy if exists "Lectura publica" on public.wedding_memories;
create policy "Lectura publica"
  on public.wedding_memories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Subida anonima" on public.wedding_memories;
create policy "Subida anonima"
  on public.wedding_memories
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Moderacion admin" on public.wedding_memories;
create policy "Moderacion admin"
  on public.wedding_memories
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Borrado admin" on public.wedding_memories;
create policy "Borrado admin"
  on public.wedding_memories
  for delete
  to authenticated
  using (true);

-- 4) STORAGE (bucket: wedding-memories)
drop policy if exists "Subida anonima de archivos" on storage.objects;
create policy "Subida anonima de archivos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'wedding-memories');

drop policy if exists "Lectura publica de archivos" on storage.objects;
create policy "Lectura publica de archivos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'wedding-memories');

drop policy if exists "Borrado admin de archivos" on storage.objects;
create policy "Borrado admin de archivos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'wedding-memories');

-- 5) Forzar que PostgREST relea el esquema (limpia el 400 del select=*)
notify pgrst, 'reload schema';
