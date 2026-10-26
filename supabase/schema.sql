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
  role text not null default '' check (char_length(role) <= 60),
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
grant select (id, name, role, group_name, x, y, mix, traits, created_at, updated_at) on public.idiot_results to anon, authenticated;
grant insert (name, role, group_name, x, y, mix, traits, token_hash) on public.idiot_results to anon, authenticated;
grant delete on public.idiot_results to anon, authenticated;

create or replace function public.idiot_result_update(p_id uuid, p_token text, p_name text, p_role text, p_group text, p_x real, p_y real, p_mix jsonb, p_traits jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.idiot_results set name = p_name, role = coalesce(p_role, ''), group_name = coalesce(p_group, ''), x = p_x, y = p_y, mix = p_mix, traits = p_traits, updated_at = now()
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
revoke execute on function public.idiot_result_update(uuid, text, text, text, text, real, real, jsonb, jsonb), public.idiot_result_delete(uuid, text) from public;
grant execute on function public.idiot_result_update(uuid, text, text, text, text, real, real, jsonb, jsonb), public.idiot_result_delete(uuid, text) to anon, authenticated;

-- קבוצות שכל אחד פותח, וחברות בכמה קבוצות
alter table public.idiot_results add column if not exists groups text[] not null default '{}' check (cardinality(groups) <= 10);
grant select (groups), insert (groups) on public.idiot_results to anon, authenticated;
create table if not exists public.idiot_groups (
  name text primary key check (char_length(btrim(name)) between 1 and 40),
  about text not null default '' check (char_length(about) <= 200),
  created_at timestamptz not null default now()
);
alter table public.idiot_groups enable row level security;
create policy idiot_groups_read on public.idiot_groups for select using (true);
create policy idiot_groups_insert on public.idiot_groups for insert with check (true);
create policy idiot_groups_delete on public.idiot_groups for delete using (public.idiot_is_admin());
grant select on public.idiot_groups to anon, authenticated;
grant insert (name, about) on public.idiot_groups to anon, authenticated;
grant delete on public.idiot_groups to anon, authenticated;
create or replace function public.idiot_result_save(p_id uuid, p_token text, p_name text, p_role text, p_groups text[], p_x real, p_y real, p_mix jsonb, p_traits jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.idiot_results set name = p_name, role = coalesce(p_role, ''), groups = coalesce(p_groups, '{}'), group_name = coalesce(p_groups[1], ''),
    x = p_x, y = p_y, mix = p_mix, traits = p_traits, updated_at = now()
  where id = p_id and token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and pg_column_size(p_mix) < 2000 and pg_column_size(p_traits) < 2000;
  return found;
end; $$;
revoke execute on function public.idiot_result_save(uuid, text, text, text, text[], real, real, jsonb, jsonb) from public;
grant execute on function public.idiot_result_save(uuid, text, text, text, text[], real, real, jsonb, jsonb) to anon, authenticated;

-- הוספה, הוצאה והעברה של אנשים בין קבוצות
create or replace function public.idiot_result_set_groups(p_id uuid, p_groups text[])
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if cardinality(coalesce(p_groups, '{}')) > 10 then return false; end if;
  if exists (select 1 from unnest(coalesce(p_groups, '{}')) g where char_length(btrim(g)) not between 1 and 40) then return false; end if;
  update public.idiot_results set groups = coalesce(p_groups, '{}'), group_name = coalesce(p_groups[1], ''), updated_at = now() where id = p_id;
  return found;
end; $$;
revoke execute on function public.idiot_result_set_groups(uuid, text[]) from public;
grant execute on function public.idiot_result_set_groups(uuid, text[]) to anon, authenticated;

-- תפקידים שמשתמשים מוסיפים
create table if not exists public.idiot_roles (
  id text primary key default ('c-' || replace(gen_random_uuid()::text, '-', '')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  why text not null default '' check (char_length(why) <= 300),
  needs jsonb not null check (jsonb_typeof(needs) = 'object' and pg_column_size(needs) < 1000),
  created_at timestamptz not null default now()
);
alter table public.idiot_roles enable row level security;
create policy idiot_roles_read on public.idiot_roles for select using (true);
create policy idiot_roles_insert on public.idiot_roles for insert with check (true);
create policy idiot_roles_delete on public.idiot_roles for delete using (public.idiot_is_admin());
grant select on public.idiot_roles to anon, authenticated;
grant insert (name, why, needs) on public.idiot_roles to anon, authenticated;
grant delete on public.idiot_roles to anon, authenticated;
-- המומחה לתפקידים (פונקציית Edge idiot-role): למה כל תכונה ברמה שלה, ומי ניתח.
-- ai = מודל שפה, auto = מאגר הידע (knowledge.ts) כשהמודל לא זמין, manual = סומן ביד. רק הפונקציה (service role) כותבת reasons ו-source.
alter table public.idiot_roles add column if not exists reasons jsonb not null default '{}'::jsonb;
alter table public.idiot_roles add column if not exists source text not null default 'manual';
alter table public.idiot_roles drop constraint if exists idiot_roles_source_check;
alter table public.idiot_roles add constraint idiot_roles_source_check check (source in ('manual','ai','auto'));
