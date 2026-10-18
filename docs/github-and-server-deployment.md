# GitHub 사전 배포와 별도 서버 이전

대상 저장소는 https://github.com/YKshin92/vpn-website, 기본 브랜치는 main이다. 2026-10-18 사용자 요청으로 현재 개발 내용의 1차 체크포인트를 반영한다. [범위·검증·007 적용 대기](GitHub_1차업데이트_2026-10-18.md).

## GitHub Pages

1. 전용 저장소 준비. GitHub Free에서는 공개 저장소에서 Pages를 사용할 수 있다. 비공개 저장소는 계정 플랜의 Pages 지원 여부를 확인한다.
2. 홈페이지 소스·가상 fixture·테스트와 .github/workflows/pages.yml 업로드. 실제 자격증명·고객 데이터·키를 넣지 않는다.
3. 저장소 Settings → Pages → Build and deployment → Source를 GitHub Actions로 지정.
4. main 업데이트 또는 Actions에서 수동 실행.
5. 작업 성공 후 반환된 Pages URL에서 설치 가이드·모듈 로드·가상 주문·무료 체험 확인.

워크플로는 tools/package-public-site.mjs의 명시적 허용 목록을 .pages-preview에 복사한 아티팩트만 게시한다. 서버용 admin/key-admin HTML·JS·CSS는 Pages에서 제외한다. .openai/hosting.json, 설계 문서, 로컬 미리보기 도구는 웹 공개 폴더에 넣지 않는다. 현재 dist/demo-data.json은 의도적으로 공개하는 가상 데이터이며 실제 고객 데이터로 교체하면 안 된다. 데모 관리자 화면은 인증이 아니다. 고객/결제/체험 변경은 새로고침 시 초기화된다.

## 별도 서버로 이전

현재 웹사이트는 빌드가 필요 없는 정적 HTML/CSS/JS다. dist의 파일을 별도 서버의 정적 웹 루트에 업로드하고 HTTPS를 설정하면 된다. 파일과 fetch 경로가 상대 경로이므로 GitHub Pages의 저장소 하위 경로와 일반 웹 루트 모두 대응한다.

실제 로그인·결제·키 발급은 정적 파일 이전과 별도다. 현재 로컬 서버 측 관리자 인증·DB·AWS/Outline 연동과 키 제어 코드가 구현돼 있고 실제 PG와 고객 셀프서비스는 미연동이다. DB 006까지 적용했으며 007은 미적용이다. 별도 서버 이관과 실제 기능 상시 활성화는 운영 승인 후 진행한다. 아직 별도 서버를 생성하거나 DNS를 변경하지 않았다.

참고: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
