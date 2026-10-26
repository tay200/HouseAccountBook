-- 예산 이월: 켠 대분류는 같은 해 1월부터 지난달까지 (예산 − 소비성 지출)을 쌓아 이번 달 예산에 더한다.
-- 남은 돈은 늘리고, 초과한 돈은 줄인다. 매년 1월에 새로 시작한다. (계산은 앱에서)
alter table public.categories add column rollover boolean not null default false;
