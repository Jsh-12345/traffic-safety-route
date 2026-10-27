# 6~8차시: DB 연결 및 기록 확인

## 1. Supabase 테이블 생성

Supabase 프로젝트의 **SQL Editor → New query**에서 `supabase/schema.sql` 전체를 실행합니다. 사고지역과 가져오기 완료 표시 테이블은 읽기만 공개하고, 분석 기록은 로그인한 본인만 읽고 쓰고 삭제할 수 있습니다.

## 2. 사고 다발지역 가져오기

로컬 프로젝트의 `.env.local`에 기존 공공데이터 키 및 Supabase URL과 함께 `SUPABASE_SERVICE_ROLE_KEY`를 추가합니다. 이 키는 Supabase **Settings → API Keys**에서 확인하며, 비밀 키이므로 GitHub에 올리거나 `VITE_` 접두어를 붙이거나 Vercel 환경 변수에 입력하지 않습니다. `.env.local`은 Git에서 제외됩니다.

PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
npm.cmd run import:accidents
```

2021~2024년을 순서대로 가져오며 중복 ID는 갱신합니다. 한 연도만 시험하려면 `npm.cmd run import:accidents -- 2024`를 실행합니다. Supabase Table Editor의 `accident_hotspots`에서 가져온 행을 확인합니다. 인증키 승인이나 호출 한도 문제가 나면 오류를 확인하고 잠시 뒤 다시 실행합니다.

이후 `/api/accidents?year=2024`는 DB에 해당 연도 데이터가 있을 때 DB를 사용하고, 없거나 DB 조회가 실패하면 기존 공공데이터 API를 사용합니다. 재수집하려면 같은 명령을 다시 실행합니다. 데이터가 비어 있거나 오류가 나면 기존 행을 삭제하지 않습니다.

## 3. 분석 기록 저장 및 조회

GitHub에 코드가 반영되고 Vercel 배포가 끝나면 로그인 후 경로를 분석합니다. 결과 아래에 저장 안내가 뜨고 **이전 분석 결과**에 기록이 추가됩니다. 기록을 펼쳐 후보별 시간, 거리, 위험점수를 확인하고 삭제 버튼도 시험합니다.

저장되는 내용은 검색 시각, 지역 단위 출발지·목적지, 기준 연도, 안전 가중치, 후보별 수치, 추천 후보입니다. 정확한 주소·좌표·경로선은 저장하지 않아 과거 지도는 복원하지 않습니다. 지도에서 좌표만 선택해 주소가 없으면 `지역 미상`으로 저장됩니다.

다른 계정으로 로그인한 뒤 첫 계정의 기록이 보이지 않는지 확인합니다. 테이블이 없으면 `기록 저장 실패`가 표시되므로 먼저 1단계를 완료합니다.

## 4. GitHub 반영

파일을 프로젝트 폴더에 복사한 후 다음 명령을 사용합니다.

```powershell
git status
git add .env.example DB_SETUP_GUIDE.md api/accidents.js package.json scripts/import-accidents.js server/accidents.js server/accidentStore.js src/AnalysisHistory.jsx src/analysisHistory.js src/App.css src/App.jsx supabase/schema.sql tests/history.test.js vite.config.js
git commit -m "Add accident database and private route history"
git push
```

Vercel이 GitHub `main`을 자동 배포하는 경우 새 배포가 완료될 때까지 기다리고 위의 3단계를 확인합니다. 현재 Vercel에 이미 설정된 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `DATA_GO_KR_SERVICE_KEY`를 그대로 사용합니다.
