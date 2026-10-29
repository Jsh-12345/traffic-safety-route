# 화면 축소 · 지도 확대 · 기록 바로 열기

이 패치는 이전 safe-route-feature-update.zip 적용 이후 버전용입니다.
Supabase SQL과 Vercel 환경 변수의 추가 변경은 없습니다.

## 변경
- 전체 최대 폭 1280px, 여백·제목·카드 크기 축소, 상세 요약 카드는 접어서 표시.
- 결과 지도 기본 높이 약 280~410px(모바일 320px).
- '지도 크게 보기' 버튼으로 지도만 확대. '지도 닫기' 또는 Esc로 복귀.
- 결과 지도와 위치 선택 지도에서 마우스 휠 확대·축소 비활성화. +/- 버튼은 사용 가능.
- 지도 초기 표시 및 창 크기/확대 모드 변경 시 컨테이너 크기를 다시 계산해 경로 전체 자동 맞춤.
- 이전 기록의 '결과 보기'를 누르면 당시 출발지·목적지와 설정을 입력창에 넣고 저장된 지도·점수를 메인 결과로 표시. 길찾기 API를 재요청하지 않음.
- 새 검색 조건을 입력하면 저장 결과 표시를 종료. 기록 자체는 변경되지 않음.
- 경로선이 없는 옛 기록은 당시 저장된 장소/지역과 요약만 표시. 저장하지 않은 경로선은 복원할 수 없음.

## 적용
압축 파일의 src, tests 폴더를 기존 프로젝트에 병합하여 같은 파일을 덮어씁니다.

PowerShell에서 한 줄씩 실행:

    node --test tests/*.test.js
    npm.cmd run build
    npm.cmd run lint
    git add src/App.jsx src/App.css src/LiveComparison.jsx src/AnalysisHistory.jsx src/MapSelector.jsx src/restoreHistory.js tests/historyRestore.test.js COMPACT_MAP_GUIDE.md
    git commit -m "Compact layout and open saved routes in main view"
    git push

## 배포 후 확인
1. 새 상세 저장 기록을 생성한 뒤 출발지/목적지를 다른 값으로 바꿉니다.
2. 이전 기록 '결과 보기'를 누릅니다. 당시 입력값과 지도가 나타나고 저장 당시 시간·점수가 유지돼야 합니다.
3. 지도 위에서 휠을 굴려도 지도 배율이 바뀌지 않는지 봅니다.
4. 지도 크게 보기 → 닫기 또는 Esc. 각 크기에서 출발지와 목적지가 함께 보이는지 확인합니다.
5. 지도 +/- 버튼과 현재 위치 버튼도 확인합니다.

## 검증 범위
자동 테스트 24개, 빌드, lint 통과. 브라우저 설치 제한으로 실제 화면 조작 테스트는 실행하지 못했으며 적용 후 확인이 필요합니다.
