# 가계부

혼자 쓰는 웹 가계부. React + TypeScript + Vite + Tailwind CSS, 데이터는 Supabase, 배포는 GitHub Pages.

## 기능
- 수입/지출 기록 (날짜, 금액, 카테고리, 결제수단, 메모), 필터와 메모 검색
- 대시보드: 월별 요약, 카테고리별·결제수단별 지출, 최근 6개월 추이 차트
- 카테고리별 월 예산과 사용률, 지난달 예산 복사
- 카테고리/결제수단 관리

## 폴더 구조
```
src/
  api/         Supabase 조회·저장 (TanStack Query 훅)
  auth/        로그인 화면과 로그인 상태 관리
  components/  여러 화면에서 쓰는 UI 조각
  hooks/       공용 훅 (선택한 달)
  lib/         타입, 포맷 함수, Supabase 클라이언트
  pages/       메뉴별 화면
supabase/schema.sql   DB 테이블과 보안 규칙
```

## 처음 설정

### 1. Supabase
1. SQL Editor → New query 에 `supabase/schema.sql` 전체를 붙여넣고 **Run**
2. Authentication → Users → **Add user → Create new user** 로 내 계정 생성 (**Auto Confirm User** 체크)
3. Authentication → Sign In / Providers → **Allow new users to sign up** 끄기 (다른 사람 가입 차단)
4. Project Settings → API Keys 에서 **Project URL** 과 **Publishable key** 확인

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
3. `main` 브랜치에 push 하면 자동 배포 → `https://<아이디>.github.io/<저장소명>/`

> Publishable key 는 공개되어도 되는 키예요. 데이터는 DB의 RLS 규칙이 로그인한 본인에게만 허용합니다.

## 명령어
| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 배포용 빌드 (`dist/`) |
| `npm run lint` | 코드 검사 |
| `npm run preview` | 빌드 결과 미리보기 |
