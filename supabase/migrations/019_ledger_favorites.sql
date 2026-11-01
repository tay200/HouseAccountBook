-- 통장 기록 즐겨찾기: 자주 쓰는 입출금(월급 입금, 관리비 …)을 저장해 두고 누르면 입력 폼을 채운다.
-- 통장(book)마다 따로 보인다. amount 를 비우면 금액만 매번 입력한다.

create table public.ledger_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  book text not null,
  name text not null check (length(trim(name)) > 0), -- 칩에 보일 이름
  direction text not null check (direction in ('in', 'out')),
  amount bigint check (amount > 0),
  member_id uuid references public.members (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

grant select, insert, update, delete on public.ledger_favorites to authenticated;
alter table public.ledger_favorites enable row level security;
create policy "household rows" on public.ledger_favorites for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
