# 후보별 위험 순위와 한글 오류 안내

1. ZIP을 기존 프로젝트 폴더에 풀어 덮어씁니다. 앞서 사고 자료 기간 선택 기능을 적용한 버전 위에 설치합니다.
2. PowerShell에서 아래 명령을 한 줄씩 실행합니다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/*.test.js
git add src/LiveComparison.jsx src/riskRanking.js src/koreanErrors.js src/App.jsx src/App.css src/AuthGate.jsx src/AnalysisHistory.jsx src/NicknameSettings.jsx src/PlaceInput.jsx src/MapSelector.jsx tests/feedbackPolish.test.js FEEDBACK_POLISH_GUIDE.md
git commit -m "Explain candidate risk ranks and localize error messages"
git push
```

3. 배포 후 경로 후보가 2개 이상인 구간을 분석합니다. 후보별 표에서 위험점수가 가장 낮은 후보에 1위가 붙는지 확인합니다. 동점은 공동 순위이며, 종합점수 기준 추천 순서와 다를 수 있습니다.
4. 로그인 화면에서 비밀번호를 틀리게 한 번 입력하고, 이메일·닉네임 또는 비밀번호를 확인하라는 한글 안내가 표시되는지 확인합니다.
5. 이번 변경을 위해 추가로 실행할 SQL은 없습니다.
