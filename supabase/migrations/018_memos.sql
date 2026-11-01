-- 메모: 고정비 리스트, 용돈 입금 계좌처럼 부부가 같이 보는 글을 게시판처럼 적어 둔다.
-- pinned = 맨 위에 고정. updated_at 은 앱이 저장할 때 함께 보낸다 (최근 고친 순서 정렬용).

create table public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  content text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index memos_user_order_idx on public.memos (user_id, pinned desc, updated_at desc);

grant select, insert, update, delete on public.memos to authenticated;
alter table public.memos enable row level security;
create policy "household rows" on public.memos for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
