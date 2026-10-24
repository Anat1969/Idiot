-- מוקף: ספריית התוכן המשותפת. פרויקט cultura-GH, קידומת idiot_
create table if not exists public.idiot_library (
  id text primary key,
  kind text not null check (kind in ('profile', 'pair', 'goal')),
  data jsonb not null,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

-- הרשאות עריכה: אותם מפתחות ומיילים כמו ב-Faces, בטבלאות נפרדות
create table if not exists public.idiot_editor_keys (key_hash text primary key, note text, created_at timestamptz default now());
create table if not exists public.idiot_admins (email text primary key);
insert into public.idiot_editor_keys (key_hash, note) select key_hash, 'מועתק מ-faces' from public.faces_editor_keys on conflict do nothing;
insert into public.idiot_admins (email) select email from public.faces_admins on conflict do nothing;

create or replace function public.idiot_is_admin() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare k text;
begin
  if exists (select 1 from public.idiot_admins a where lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))) then
    return true;
  end if;
  begin
    k := current_setting('request.headers', true)::json->>'x-editor-key';
  exception when others then k := null;
  end;
  if k is null or length(k) < 16 then return false; end if;
  return exists (select 1 from public.idiot_editor_keys e where e.key_hash = encode(sha256(convert_to(k, 'UTF8')), 'hex'));
end; $$;

create or replace function public.idiot_can_edit() returns boolean
language sql stable security definer set search_path = public as $$ select public.idiot_is_admin() $$;

alter table public.idiot_library enable row level security;
alter table public.idiot_editor_keys enable row level security;
alter table public.idiot_admins enable row level security;

drop policy if exists idiot_library_read on public.idiot_library;
create policy idiot_library_read on public.idiot_library for select using (true);
drop policy if exists idiot_library_insert on public.idiot_library;
create policy idiot_library_insert on public.idiot_library for insert with check (public.idiot_is_admin());
drop policy if exists idiot_library_update on public.idiot_library;
create policy idiot_library_update on public.idiot_library for update using (public.idiot_is_admin()) with check (public.idiot_is_admin());
drop policy if exists idiot_library_delete on public.idiot_library;
create policy idiot_library_delete on public.idiot_library for delete using (public.idiot_is_admin());

revoke all on public.idiot_editor_keys, public.idiot_admins from anon, authenticated;
grant select on public.idiot_library to anon, authenticated;
grant insert, update, delete on public.idiot_library to anon, authenticated;
revoke execute on function public.idiot_is_admin() from public;
grant execute on function public.idiot_is_admin(), public.idiot_can_edit() to anon, authenticated;
