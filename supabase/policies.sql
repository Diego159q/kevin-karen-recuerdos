-- ============================================================
-- kevin-karen-recuerdos · Seguridad y datos
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (proyecto real).
-- ============================================================

-- 1) Columna para miniaturas (usada por las grillas)
alter table public.wedding_memories
  add column if not exists thumb_url text;

-- 2) Realtime: permite que la app reciba INSERT/UPDATE/DELETE en vivo
--    (requiere que la tabla esté en la publicacion)
alter publication supabase_realtime add table public.wedding_memories;

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
--    El bucket es PUBLICO para lectura (las URLs public_url se usan en la galeria).
--    Subida anonima permitida (los invitados suben sin login).
--    Borrado SOLO con sesion de admin (authenticated).

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
