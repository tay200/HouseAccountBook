# 가계부

웹 가계부. React + TypeScript + Vite + Tailwind CSS, 데이터는 Supabase, 배포는 GitHub Pages.

## 기능
| 메뉴 | 내용 |
|---|---|
| 대시보드 | 월 요약(수입·총지출·소비성·저축성·저축률), 소비성 지출 분석(예산·전월 대비), 변동지출 달력(무지출), 6개월 추이, 결제수단별·사람별 지출 |
| 거래 내역 | 수입(고정/부가)·지출(변동/고정/저축성) 기록, 대분류/소분류, 결제수단, 사람, 할인, 필터 |
| 예산 | 대분류별 월 예산과 사용률, 지난달 예산 복사 |
| 연간 리포트 | 월별 리포트, 재무 목표(월 저축액·저축률), 항목별·세부항목별·카드별·사람별 연간표 |
| 투자 | 계좌별 현황(합계 포함 체크), 보유 종목(직접 입력 + 매수 − 매도, 이동평균), 매수·매도 기록, 한국·미국 주식 현재가·환율 자동 조회(Edge Function) 또는 직접 입력 |
| 자산 · 부채 | 자산현황(기간별·위험 비율), 계좌, 예금, 적금, 대출(상환 스케줄), 부동자산, 연도별 순자산 |
| 통장 기록 | 공동통장·비상금처럼 입출금과 잔액만 따로 관리 |
| 설정 | 카테고리(2단계), 결제수단, 사람, 전체 데이터 CSV 백업 |

## 폴더 구조
```
src/
  api/         Supabase 조회·저장 (TanStack Query 훅). createTableApi = 테이블별 CRUD 훅 공장
  auth/        로그인 화면과 로그인 상태 관리
  components/  여러 화면에서 쓰는 UI 조각 (CrudTable = 공용 편집 표)
  hooks/       공용 훅 (선택한 달, 이름 찾기)
  lib/         타입, 포맷, 통계·금융·투자 계산 (*.test.ts = 자동 테스트)
               database.types.ts = DB 구조에서 자동 생성한 타입 (npm run gen:types)
  pages/       메뉴별 화면 (invest/, assets/ = 큰 화면을 나눈 부품)
supabase/
  migrations/  DB 변경 SQL (번호 순서대로 한 번씩 실행, 적용 기록은 DB 의 schema_migrations 표)
  functions/   Edge Function (현재가 조회)
scripts/db.mjs SQL 실행·migration 적용 도구
private/       개인 데이터 (Git 에 올라가지 않음)
```

## 처음 설정

### 1. Supabase
1. SQL Editor 에서 `supabase/migrations/` 의 SQL 을 **번호 순서대로** 실행
   (이미 쓰고 있는 DB 에 새 파일만 적용할 때는 아래 'DB 변경(migration) 적용' 참고)
2. Authentication → Users → **Add user** 로 내 계정 생성 (**Auto Confirm User** 체크)
3. Authentication → Sign In / Providers → **Allow new users to sign up** 끄기
4. Edge Function `stock-prices` 배포 (현재가 조회, 로그인한 사용자만 호출 가능):
   `npx supabase functions deploy stock-prices --project-ref <프로젝트ID> --use-api`
   (대시보드 Edge Functions → Via Editor 에 `supabase/functions/stock-prices/index.ts` 내용을 붙여넣어도 됨)
5. Project Settings → API Keys 에서 **Project URL** 과 **Publishable key** 확인

### 2. 내 PC에서 실행
```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev                  # http://localhost:5173
```

### 3. GitHub Pages 배포
1. 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 선택
2. Settings → Secrets and variables → Actions → **Variables** 탭에
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 등록
3. `main` 브랜치에 push 하면 자동 배포

### 4. 가계부 공유 (선택)
다른 계정이 내 가계부를 함께 쓰게 하려면 SQL Editor 에서:
```sql
insert into public.shares (owner_id, member_id) values (
  (select id from auth.users where email = '주인@이메일'),
  (select id from auth.users where email = '함께쓸@이메일'));
```

공유를 끝내려면 `delete from public.shares where member_id = (select id from auth.users where email = '함께쓸@이메일');`

> Publishable key 는 공개되어도 되는 키예요. 데이터는 DB의 RLS 규칙이 로그인한 본인에게만 허용합니다.

## 백업
- **설정 → 전체 데이터 내보내기**: 모든 표를 CSV(엑셀에서 열림)로 묶은 zip 을 내려받아요. 가끔 받아 두세요.
- 무료 플랜은 Supabase 쪽 자동 백업을 내려받기 어려우므로 이 파일이 유일한 백업이에요.

## DB 변경(migration) 적용
1. `supabase/migrations/` 에 다음 번호로 SQL 파일을 만든다 (예: `009_xxx.sql`)
2. `npm run db:migrate` — 아직 적용하지 않은 파일만 순서대로 실행하고 `schema_migrations` 에 기록한다
   (`node scripts/db.mjs --status` 로 남은 파일만 확인할 수도 있음)
3. 테이블·열이 바뀌었으면 `npm run gen:types` 로 `src/lib/database.types.ts` 를 다시 만든다
4. 데이터를 지우거나 덮어쓰는 SQL 은 먼저 백업을 받고 실행한다

## 명령어
| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 배포용 빌드 (`dist/`) |
| `npm run lint` | 코드 검사 |
| `npm test` | 계산(투자·예적금·대출·통계) 자동 테스트. 배포 전에 GitHub Actions 에서도 실행됨 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run db:migrate` | 새 migration 파일 적용 (환경변수 `SUPABASE_ACCESS_TOKEN` 필요) |
| `npm run gen:types` | DB 구조에서 TypeScript 타입 다시 만들기 (같은 토큰 필요) |
| `node scripts/db.mjs <파일.sql>` / `-e "SQL"` | Supabase 에 SQL 하나 실행 |
