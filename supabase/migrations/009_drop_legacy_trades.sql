-- 예전 매매 테이블(trades) 삭제
-- 007 에서 stock_holdings + stock_trades 로 데이터를 옮긴 뒤 화면에서는 더 이상 쓰지 않는다.
-- 지우기 전 내용은 private/ 폴더에 백업해 두었다 (공개 저장소에는 올리지 않음).
drop table if exists public.trades;
