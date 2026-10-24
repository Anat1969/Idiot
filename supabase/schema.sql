-- מוקף: ספריית התוכן המשותפת. פרויקט cultura-GH, קידומת idiot_
create table if not exists public.idiot_library (
  id text primary key,
  kind text not null check (kind in ('profile', 'pair', 'goal', 'role')),
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

-- המפה הכללית: כל מי שאבחן את עצמו, מכל מכשיר. קריאה וכתיבה פתוחות, עדכון רק מהמכשיר שיצר (מפתח), מחיקה לעורכת
create table if not exists public.idiot_results (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  group_name text not null default '' check (char_length(group_name) <= 40),
  x real not null check (x between -1 and 1),
  y real not null check (y between -1 and 1),
  mix jsonb not null default '{}'::jsonb,
  traits jsonb not null default '{}'::jsonb,
  token_hash text not null check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.idiot_results enable row level security;
drop policy if exists idiot_results_read on public.idiot_results;
create policy idiot_results_read on public.idiot_results for select using (true);
drop policy if exists idiot_results_insert on public.idiot_results;
create policy idiot_results_insert on public.idiot_results for insert with check (pg_column_size(mix) < 2000 and pg_column_size(traits) < 2000);
drop policy if exists idiot_results_delete on public.idiot_results;
create policy idiot_results_delete on public.idiot_results for delete using (public.idiot_is_admin());
revoke all on public.idiot_results from anon, authenticated;
grant select (id, name, group_name, x, y, mix, traits, created_at, updated_at) on public.idiot_results to anon, authenticated;
grant insert (name, group_name, x, y, mix, traits, token_hash) on public.idiot_results to anon, authenticated;
grant delete on public.idiot_results to anon, authenticated;

create or replace function public.idiot_result_update(p_id uuid, p_token text, p_name text, p_group text, p_x real, p_y real, p_mix jsonb, p_traits jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.idiot_results set name = p_name, group_name = coalesce(p_group, ''), x = p_x, y = p_y, mix = p_mix, traits = p_traits, updated_at = now()
  where id = p_id and token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and pg_column_size(p_mix) < 2000 and pg_column_size(p_traits) < 2000;
  return found;
end; $$;
create or replace function public.idiot_result_delete(p_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.idiot_results where id = p_id and token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  return found;
end; $$;
revoke execute on function public.idiot_result_update(uuid, text, text, text, real, real, jsonb, jsonb), public.idiot_result_delete(uuid, text) from public;
grant execute on function public.idiot_result_update(uuid, text, text, text, real, real, jsonb, jsonb), public.idiot_result_delete(uuid, text) to anon, authenticated;
