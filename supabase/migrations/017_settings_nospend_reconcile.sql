-- 큰 지출 기준(설정), 월 무지출 목표, 잔액 맞추기 기록

-- ─────────────────────────────────────────────
-- 가계부 설정: 가계부(주인)마다 1줄
--   big_spend_threshold: 이 금액 이상인 변동지출을 '큰 지출'로 강조
-- ─────────────────────────────────────────────
create table public.app_settings (
  user_id uuid primary key default public.my_owner_id() references auth.users (id) on delete cascade,
  big_spend_threshold bigint not null default 100000 check (big_spend_threshold > 0),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.app_settings to authenticated;
alter table public.app_settings enable row level security;
create policy "household rows" on public.app_settings for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));

-- ─────────────────────────────────────────────
-- 연도별 재무 목표에 '월 무지출 목표 일수' (0 = 목표 없음)
-- ─────────────────────────────────────────────
alter table public.goals add column no_spend_target int not null default 0 check (no_spend_target between 0 and 31);

-- ─────────────────────────────────────────────
-- 잔액 맞추기 기록: 실제 금액과 그때 장부 금액을 남긴다
--   target = book    : 통장 기록의 통장(book) 잔액을 date 기준으로 맞춤
--   target = payment : 결제수단(카드)의 한 달 사용액을 카드사 금액과 대조. date = 그 달 1일, 달마다 1줄
-- ─────────────────────────────────────────────
create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  target text not null check (target in ('book', 'payment')),
  book text,
  payment_method_id uuid references public.payment_methods (id) on delete cascade,
  date date not null,
  actual bigint not null,   -- 실제 잔액 / 카드사 이용금액
  recorded bigint not null, -- 그때 장부(가계부) 금액
  memo text,
  created_at timestamptz not null default clock_timestamp(),
  check ((target = 'book' and book is not null) or (target = 'payment' and payment_method_id is not null and extract(day from date) = 1)),
  -- 카드 대조는 결제수단·달마다 1줄 (통장 기록은 payment_method_id 가 비어 있어서 여러 줄 가능)
  unique (user_id, payment_method_id, date)
);

grant select, insert, update, delete on public.reconciliations to authenticated;
alter table public.reconciliations enable row level security;
create policy "household rows" on public.reconciliations for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
