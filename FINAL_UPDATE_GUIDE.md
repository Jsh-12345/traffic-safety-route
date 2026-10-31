# 전국 자료 마무리 수정

1. ZIP 안의 src, server, tests 폴더를 기존 프로젝트 폴더에 덮어씁니다.
2. SQL 재실행, 사고 데이터 재수집, 환경변수 추가는 필요하지 않습니다.
3. PowerShell에서 각각 한 줄씩 실행합니다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/*.test.js
git add src server tests FINAL_UPDATE_GUIDE.md
git commit -m "Finalize nationwide accident scoring and notices"
git push
```

4. Vercel에서 해당 커밋 배포가 Ready가 되면 사이트를 새로고침합니다.
5. 전국 자료 안내 문구, 서울·대전 경로 조회, 기록 결과보기를 확인합니다.

## 변경 사항
- 안내 문구를 전국 신호위반·중앙선침범 사고 다발지역 기준으로 변경했습니다.
- 전국 수집 완료 상태가 확인된 정상 응답의 0건은 위험점수 0점으로 계산하고 기록합니다. 0점은 실제 사고 위험이 없다는 뜻이 아닙니다.
- 전국 DB 조회가 불가능한 경우 대전 API로 대체하지 않습니다. 빠른 경로만 제공하고 데이터 준비/DB 설정 확인 안내를 표시합니다.
- 기존 저장 기록의 점수와 경로는 당시 결과로 유지됩니다.

빌드·린트·자동 테스트 35개 통과. 실제 사용자 DB나 배포 사이트에는 이번 파일이 아직 적용되지 않았습니다.
