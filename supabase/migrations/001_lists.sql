-- Each person's parchi lists. The whole list (picks, quantities, brands,
-- custom items and categories) is stored as JSON in `data`.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Monthly ration' check (char_length(name) between 1 and 60),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_user_id_created_at_idx on public.lists (user_id, created_at);
alter table public.lists enable row level security;
create policy "Owners read their lists" on public.lists for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners add their lists" on public.lists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their lists" on public.lists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners delete their lists" on public.lists for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.lists from anon;
grant select, insert, update, delete on public.lists to authenticated;

create function public.lists_limit_per_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.lists where user_id = new.user_id) >= 50 then
    raise exception 'You can keep up to 50 lists.';
  end if;
  return new;
end;
$$;
revoke execute on function public.lists_limit_per_user() from public, anon, authenticated;
create trigger lists_limit_per_user before insert on public.lists for each row execute function public.lists_limit_per_user();
