# 종합점수 계산 방식 변경

압축을 풀어 기간 선택 및 피드백 개선을 적용한 traffic-safety-route 프로젝트 폴더에 덮어씁니다. 추가 SQL이나 데이터 재수집은 필요 없습니다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/*.test.js
git add src/routeSafety.js src/analysisHistory.js src/LiveComparison.jsx tests/session5.test.js tests/fixedRouteScore.test.js FIXED_ROUTE_SCORE_GUIDE.md
git commit -m "Use fixed scales for route comparison scores"
git push
```

종합점수 = (예상 시간/30분) × (1−안전 비중) + (위험점수/100점) × 안전 비중. 여러 해를 선택하면 연평균 위험점수를 사용합니다. 기준값은 프로젝트의 비교 정책이며 상한이나 사고 확률이 아닙니다. 기존 저장 기록의 점수와 추천 경로는 당시 상태 그대로 표시됩니다.

확인 예시: 안전 우선 50%, 19.1분/77.5점인 후보와 21.4분/14.75점인 후보는 각각 약 0.706과 0.430입니다. 실제 조회 시간이 달라지면 숫자도 달라질 수 있습니다. 0%는 예상 시간이 가장 짧은 경로를, 100%는 위험점수가 가장 낮은 경로를 선택하는지 확인합니다.
