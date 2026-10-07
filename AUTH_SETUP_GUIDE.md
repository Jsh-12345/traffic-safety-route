# Safe Route 로그인 기능 적용

이 ZIP은 기존 `traffic-safety-route` 프로젝트에 추가하는 **수정 파일 모음**입니다. 기존 폴더를 삭제하지 말고 ZIP 안의 파일을 `package.json`이 있는 프로젝트 폴더에 같은 경로로 덮어쓰세요. `src` 폴더는 병합합니다.

## 1. 설치와 로컬 설정

PowerShell에서 프로젝트 폴더로 이동한 다음 다음 명령을 실행합니다.

```powershell
npm.cmd install
```

Supabase에서 새 프로젝트를 만듭니다. Project URL과 **publishable key**를 확인합니다. `secret` 또는 `service_role` 키는 사용하지 않습니다. 기존 `.env.local`의 카카오·공공데이터 키는 유지하고 다음 두 줄을 추가합니다.

```text
VITE_SUPABASE_URL=https://본인프로젝트.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=본인의_publishable_key
```

`.env.local`은 Git에서 제외됩니다. `VITE_` 변수는 브라우저에 포함되므로 publishable key만 넣습니다. Supabase 값이 없으면 기존 경로 분석 화면이 그대로 열리며, 두 값을 모두 넣으면 로그인 화면이 먼저 나타납니다.

## 2. Supabase 이메일 설정

Supabase Dashboard의 **Authentication → Providers**에서 Email 인증이 활성화되어 있는지 확인합니다. **Authentication → URL Configuration**에서 Site URL을 실제 Vercel 배포 주소(예: `https://본인프로젝트.vercel.app`)로 설정하고, Redirect URLs에 `http://localhost:5173/**`와 실제 배포 주소를 추가합니다. 이메일 확인을 사용하는 경우 사용자는 확인 메일 링크를 누른 후 로그인할 수 있습니다.

Supabase 기본 이메일 발송 서비스는 시험용으로 제한이 있습니다. 회원가입 메일이 오지 않는다면 Dashboard의 이메일 발송 제한과 수신 가능한 주소를 확인하고, 여러 사람이 사용하려면 별도 SMTP 설정을 검토합니다.

## 3. 로컬 확인

```powershell
npm.cmd run dev
```

`http://localhost:5173/`에서 회원가입 → 이메일 확인 → 로그인 → 경로 분석 → 로그아웃 → 다시 로그인 순서로 시험합니다. 비밀번호 재설정 메일과 새 비밀번호 설정도 확인합니다.

## 4. GitHub와 Vercel

실제 키가 커밋되지 않도록 먼저 확인합니다.

```powershell
git check-ignore .env.local
git status
```

`git status`에 `.env.local`이 없어야 합니다. 그다음:

```powershell
git add .
git commit -m "Add Supabase email authentication"
git push
```

Vercel 프로젝트의 **Settings → Environment Variables**에서 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 Production에 추가하고 **Redeploy**합니다. 설정 후 새로 배포된 주소에서 기능을 다시 확인합니다. 환경 변수 변경은 과거 배포에 소급 적용되지 않습니다.

## 구현 범위

이 기능은 Supabase Auth로 회원가입·이메일 확인·로그인 상태 유지·로그아웃·비밀번호 재설정을 제공합니다. 로그인 화면은 프론트엔드 접근을 제어하지만 `/api/places`, `/api/directions`, `/api/accidents`의 호출을 서버에서 인증하는 기능은 아직 없습니다. 로그인하지 않은 사람의 API 직접 호출까지 막으려면 서버 함수에서 사용자 토큰 검증과 요청량 제한을 별도로 구현해야 합니다. 개인별 경로 기록 저장도 이후 DB 단계입니다.
