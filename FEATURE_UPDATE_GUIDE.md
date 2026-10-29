# SAFE ROUTE 기능 업데이트 적용 순서

## 바뀐 기능
- 로그인 뒤 상단 '닉네임 설정하기'에서 2~20자 닉네임을 등록합니다. 다음부터 이메일 또는 닉네임과 기존 비밀번호로 로그인할 수 있습니다. 회원가입·이메일 확인·비밀번호 재설정은 기존 이메일 방식입니다. 영문 대소문자는 구분하지 않으며 중복 닉네임은 사용할 수 없습니다.
- 지도는 추천/선택 경로의 사고다발지역 근접 구간을 주황색으로 표시합니다. 초록은 수집 자료상 근접 지역이 없는 구간이며 안전 보장이 아닙니다. 다른 후보는 회색, 위험점수는 비교 막대로 표시합니다. 체크를 해제하면 기존 경로별 색상 비교로 돌아갑니다. 기존 추천 계산과 도로 좌표는 그대로입니다.
- 상세 위치 저장을 선택하면 당시 경로 좌표, 사고 자료, 후보 점수, 가중치를 함께 저장합니다. 이전 분석의 '결과 보기'에서 다시 조회하지 않고 당시 결과를 보여줍니다. 체크 해제 시 상세 데이터는 저장하지 않습니다.
- 예전 기록은 경로선이 없어 요약만 표시됩니다. 이전 좌표를 추측하거나 현재 길찾기를 과거 결과로 대신 표시하지 않습니다.

## 1. 파일 적용
압축 파일의 server, api, src, tests, supabase 폴더와 vite.config.js 등을 기존 프로젝트 폴더에 병합하고 같은 파일을 덮어씁니다.
실제 키가 담긴 .env.local은 이 압축에 없으며 삭제하거나 .env.example로 덮어쓰지 마세요.

## 2. Supabase SQL (배포 전)
프로젝트의 SQL Editor에서 새 쿼리를 만들고 supabase/nickname_snapshot.sql 내용을 전체 복사해 Run 합니다.
기존 사용자와 경로 기록을 삭제하지 않습니다. login_profiles, nickname_attempts 테이블과 route_analyses.snapshot 열을 추가합니다.
프로필은 본인만 읽고 변경할 수 있고 로그인 시도 제한 함수는 서버의 service_role만 실행할 수 있습니다. 기존 기록의 RLS 정책을 유지합니다.
실행 성공 여부는 실제 Supabase에서 확인해야 합니다.

## 3. 환경 변수
로컬 .env.local에 이미 사고 데이터 가져오기용으로 설정한 SUPABASE_SERVICE_ROLE_KEY를 그대로 사용합니다.
Vercel 프로젝트 Settings → Environment Variables에도 동일한 이름으로 서버 비밀 키를 추가합니다.
이 값은 Supabase의 service_role 또는 서버용 secret key입니다. 공개용 publishable key와 다릅니다.
절대로 VITE_ 접두사를 붙이지 말고 GitHub에 실제 값을 올리지 마세요.
기존 VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY(또는 VITE_SUPABASE_ANON_KEY)도 필요합니다.
환경 변수는 사용하는 Production 환경에 설정한 뒤 새 배포에 적용합니다.

## 4. 로컬 검증과 배포
PowerShell에서 프로젝트 폴더로 이동하고 한 줄씩 실행합니다.

    node --test tests/*.test.js
    npm.cmd run build
    npm.cmd run lint
    npm.cmd run dev

이메일로 로그인 → 닉네임 설정 → 로그아웃 → 닉네임과 같은 비밀번호로 로그인합니다.
중복 닉네임, 틀린 비밀번호, 상세 저장 체크/해제를 각각 시험합니다.
새 분석 후 이전 기록을 펼쳐 지도와 시간이 저장 시점 값인지 확인합니다.
과거 기록 지도는 펼친 당시의 기록값을 사용하며 현재 입력의 슬라이더 변경 영향을 받지 않아야 합니다.
다른 계정에서는 기존 계정의 기록과 닉네임 설정을 읽거나 수정할 수 없어야 합니다.

성공하면 변경 파일을 확인하고 커밋합니다. 아래 git add는 비밀 키 파일을 포함하지 않습니다.

    git status
    git add src api/nickname-login.js server/nicknameLogin.js supabase/nickname_snapshot.sql tests/features.test.js vite.config.js .env.example FEATURE_UPDATE_GUIDE.md
    git commit -m "Add nickname login and replayable route history"
    git push

Vercel 배포 완료 후 같은 검사를 배포 사이트에서 수행합니다.

## 확인 범위
로컬 자동 테스트 22개, production build, lint 통과.
Supabase의 새 SQL 및 실제 계정 로그인, Vercel 환경 변수 적용, 브라우저 실제 지도 검사는 적용 후 필요합니다.
닉네임별 로그인은 10분 동안 최대 10회로 제한합니다. 제한 시 이메일 로그인은 계속 이용할 수 있습니다.
