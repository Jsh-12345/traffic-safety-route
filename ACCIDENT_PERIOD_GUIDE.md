# 사고 데이터 기간 선택 적용

1. 이 ZIP의 내용물을 기존 traffic-safety-route 폴더에 덮어씁니다.
2. Supabase SQL Editor에서 supabase/route_analysis_period.sql 내용을 실행합니다. 새 분석 기록에 종료 연도를 저장하기 위한 변경입니다. 기존 단일 연도 기록은 그대로 읽을 수 있습니다.
3. PowerShell에서 프로젝트 폴더를 열고 아래를 한 줄씩 실행합니다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/*.test.js
git add src/App.jsx src/App.css src/LiveComparison.jsx src/RiskValue.jsx src/accidentPeriod.js src/AnalysisHistory.jsx src/analysisHistory.js src/restoreHistory.js supabase/route_analysis_period.sql tests/accidentPeriod.test.js ACCIDENT_PERIOD_GUIDE.md
git commit -m "Compare annual average route risk across selected years"
git push
```

4. 배포 후 같은 출발지·목적지에서 2024~2024와 2021~2024를 각각 분석합니다. 여러 해를 골랐을 때 후보별 표의 연평균 위험점수를 클릭하면 연도별 점수, 합계, 나눗수를 확인할 수 있습니다. 경로 후보와 예상 시간은 조회 시점에 달라질 수 있으므로 같은 후보를 비교합니다.
5. 로그인한 경우 기간과 점수가 저장 기록에 표시되는지 확인합니다. 지도 저장을 선택한 기록에서는 당시 결과도 다시 열 수 있습니다.

조회 가능한 연도는 2021~2024년입니다. 모든 해의 조회가 성공해야 위험점수가 계산됩니다. 조회에 실패한 해는 안내하고 이동시간 기준으로만 표시합니다. 정상 조회했지만 경로에 해당하는 지역이 없는 해는 0점으로 평균에 포함합니다. 기존 사고 데이터는 다시 수집할 필요가 없습니다.
