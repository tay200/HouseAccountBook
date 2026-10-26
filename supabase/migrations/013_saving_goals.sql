-- 모으기 목표: 특별비 적립(명절·자동차세처럼 쓸 돈)과 저축 목표(전세·차 구입)
--
--   kind   : sinking(쓸 돈 모으기) / goal(목표 모으기)
--   기간   : start_month ~ due_month. 월 필요액 = (목표 − 모은 돈) ÷ 남은 개월(이번 달 포함)
--   repeat_yearly : 기한이 지나면 다음 해 같은 기간으로 넘어간다 (명절, 자동차세 등)
--   모은 돈 : source 에 따라
--     manual  → saved_amount (직접 입력)
--     book    → 통장 기록(ledger_entries)에서 book 이름이 같은 통장의 잔액
--     account → 자산의 계좌(bank_accounts) 잔액

create table public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'goal' check (kind in ('sinking', 'goal')),
  target_amount bigint not null check (target_amount > 0),
  start_month date not null check (extract(day from start_month) = 1),
  due_month date not null check (extract(day from due_month) = 1),
  repeat_yearly boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'book', 'account')),
  saved_amount bigint not null default 0 check (saved_amount >= 0),
  book text,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp(),
  check (due_month >= start_month)
);

grant select, insert, update, delete on public.saving_goals to authenticated;
alter table public.saving_goals enable row level security;
create policy "household rows" on public.saving_goals for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
