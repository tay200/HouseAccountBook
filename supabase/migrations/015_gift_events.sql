-- 경조사비 장부: 누구에게 얼마를 보냈고 받았는지 (결혼·장례·돌잔치 등)
--
--   counterpart    : 상대방 이름
--   relation       : 관계 (친구, 직장, 친척 …) 자유 입력
--   direction      : give(보냄) / receive(받음)
--   member_id      : 우리 쪽 누구와 관련된 일인지 (비우면 공동)
--   transaction_id : 보낼 때 '가계부 지출로도 기록'을 고르면 함께 만든 거래.
--                    거래를 지워도 장부 기록은 남는다.

create table public.gift_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  date date not null,
  counterpart text not null,
  relation text,
  event_type text not null default 'wedding'
    check (event_type in ('wedding', 'funeral', 'first_birthday', 'birthday', 'etc')),
  direction text not null check (direction in ('give', 'receive')),
  amount bigint not null check (amount > 0),
  member_id uuid references public.members (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

create index gift_events_user_date_idx on public.gift_events (user_id, date);

grant select, insert, update, delete on public.gift_events to authenticated;
alter table public.gift_events enable row level security;
create policy "household rows" on public.gift_events for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
