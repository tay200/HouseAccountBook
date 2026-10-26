-- 즐겨찾기 거래: 자주 쓰는 거래(점심, 주유 …)를 저장해 두고 누르면 입력 폼을 채운다.
-- amount 를 비우면 금액만 매번 입력한다.

create table public.favorite_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  name text not null, -- 칩에 보일 이름
  type text not null check (type in ('income', 'expense')),
  kind text not null,
  amount bigint check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  memo text,
  tags text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  check (
    (type = 'income' and kind in ('fixed', 'extra')) or
    (type = 'expense' and kind in ('saving', 'fixed', 'variable'))
  )
);

grant select, insert, update, delete on public.favorite_transactions to authenticated;
alter table public.favorite_transactions enable row level security;
create policy "household rows" on public.favorite_transactions for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
