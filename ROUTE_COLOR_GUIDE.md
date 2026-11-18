# 5회차: 친구 피드백 반영

## 적용
ZIP의 src, tests 폴더와 이 안내 파일을 기존 traffic-safety-route 폴더에 덮어씁니다.
SQL, 환경변수 변경이나 데이터 재수집은 필요 없습니다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/*.test.js
git add src/LiveComparison.jsx src/routeAppearance.js tests/routeAppearance.test.js ROUTE_COLOR_GUIDE.md
git commit -m "Distinguish recommended route colors from other candidates"
git push
```

Vercel에서 배포가 Ready가 되면 사이트를 새로고침합니다.

## 확인 순서
1. 출발지와 목적지를 검색 결과에서 선택하고 실제 경로를 분석합니다.
2. '모든 경로 한눈에 보기'에서 추천 배지가 붙은 후보가 파란색 굵은 실선인지 확인합니다. 다른 후보는 초록색 얇은 점선입니다.
3. 빠른 경로(안전 가중치 0%)와 안전 우선(100%)을 번갈아 선택합니다. 추천 후보가 바뀌면 파란색으로 표시되는 경로도 바뀌어야 합니다.
4. 두 조건에서 같은 후보가 추천되는 경우 색상이 유지되는 것이 정상입니다. 후보별 점수와 추천 배지를 함께 확인합니다.
5. 후보 버튼을 눌러도 파란색이 뜻하는 '현재 추천 경로'는 유지됩니다. 선택한 다른 후보는 초록색과 흰 테두리로 강조합니다. 공유 도로에서는 파란 추천 선이 위에 표시됩니다.
6. '선택 경로 위험 구간 보기'는 별도 모드입니다. 주황은 사고 다발지역 반경과 겹치는 구간, 초록은 수집 자료에서 근접 지역이 없는 구간이며 안전 보장이 아닙니다.
7. 지도 크게 보기와 이전 기록 결과 보기에서도 표시를 확인합니다. 이전 기록은 당시 저장된 추천 후보를 파란색으로 표시합니다.

## 검증 범위
빌드·린트·자동 테스트 37개 통과. 실제 배포 사이트의 시각적 확인은 위 순서로 진행합니다.
