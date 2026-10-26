-- 반복 거래 + 태그
--
-- recurring_rules: 관리비·보험·통신비·적금 이체처럼 매달 같은 날 나가는(들어오는) 거래의 규칙.
--   앱이 그 달의 '예정' 거래로 보여주고, [확인]을 누르면 실제 거래(transactions)가 된다.
--   확인해서 만든 거래는 recurring_id 로 규칙을 가리킨다 → 이번 달에 처리했는지 알 수 있다.
--   day 가 그 달 마지막 날보다 크면(31일 규칙의 2월) 마지막 날로 본다.
--
-- transactions.tags: 카테고리와 따로 붙이는 꼬리표 (예: {제주여행2026, 이사}).

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  memo text not null,
  type text not null check (type in ('income', 'expense')),
  kind text not null,
  amount bigint not null check (amount > 0), -- 실지출 (확인할 때 고칠 수 있음)
  category_id uuid references public.categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  day int not null default 1 check (day between 1 and 31),
  start_month date not null check (extract(day from start_month) = 1),
  end_month date check (extract(day from end_month) = 1), -- 비우면 계속
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  check (end_month is null or end_month >= start_month),
  -- 거래와 같은 규칙: 수입은 고정/부가, 지출은 저축성/고정/변동
  check (
    (type = 'income' and kind in ('fixed', 'extra')) or
    (type = 'expense' and kind in ('saving', 'fixed', 'variable'))
  )
);

grant select, insert, update, delete on public.recurring_rules to authenticated;
alter table public.recurring_rules enable row level security;
create policy "household rows" on public.recurring_rules for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));

-- 규칙을 지워도 이미 만든 거래는 남긴다
alter table public.transactions
  add column recurring_id uuid references public.recurring_rules (id) on delete set null,
  add column tags text[] not null default '{}';

create index transactions_recurring_idx on public.transactions (recurring_id) where recurring_id is not null;
-- 태그 검색용 (배열 안에 값이 있는지 빠르게 찾는 GIN 인덱스)
create index transactions_tags_idx on public.transactions using gin (tags);
