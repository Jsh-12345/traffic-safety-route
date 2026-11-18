# SAFE ROUTE 회원가입·로그인 개선
1. ZIP의 src, supabase 폴더와 이 안내 파일을 기존 프로젝트에 덮어씁니다.
2. Supabase 프로젝트의 SQL Editor에서 supabase/signup_nickname.sql 전체를 붙여 넣고 Run을 누릅니다. 기존 닉네임 로그인에 쓰는 login_profiles 테이블이 이미 있어야 합니다.
3. PowerShell에서 아래 명령을 한 줄씩 실행합니다.

```powershell
npm.cmd run lint
npm.cmd run build
git add src/AuthGate.jsx src/AuthGate.css supabase/signup_nickname.sql SIGNUP_UPDATE_GUIDE.md
git commit -m "Add password visibility and signup nickname"
git push
```

4. Vercel 배포 완료 후 새 이메일로 가입을 시험합니다.
   - 가입 화면에서 닉네임을 입력합니다. 한글·영문·숫자·밑줄 2~20자이며 영문 대문자는 소문자로 처리됩니다.
   - 비밀번호 두 칸의 보기/숨기기가 각각 동작하고, 서로 다른 비밀번호를 입력하면 가입이 막히는지 확인합니다.
   - 두 입력을 일치시켜 가입한 뒤 이메일 확인을 완료합니다. 로그아웃한 다음 가입한 닉네임과 비밀번호로 로그인합니다.
   - 기존 닉네임과 충돌하면 다른 닉네임으로 가입합니다.
5. 계정 설정에서 기존 방식대로 닉네임을 바꿀 수 있습니다.
