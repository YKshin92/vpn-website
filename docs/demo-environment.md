# 가상 개발 환경

2026-10-14. 사용자 요청의 미확인 1~4번을 개발용 가상 값으로 채웠다. 실제 인프라 조사 결과가 아니다. 고객별 키 공유가 없다는 정책은 사용자 확인 사항이다. 데모는 고객당 키 하나를 배정하지만, 향후 한 고객에게 여러 개를 제공할지는 미확정이다.

| 항목 | 가상 값 |
| --- | --- |
| AWS 리전 | ap-northeast-1 (도쿄) |
| 인스턴스 | demo-outline-tokyo-01 |
| 현재 고정 IP | demo-outline-current / 192.0.2.10 |
| 교체 후보 IP | demo-outline-candidate / 192.0.2.20 |
| 키의 서버 주소·포트 | connect.vpn.example.test:18443 |
| DNS 업체 | mock-dns (로컬 가짜 어댑터용 이름) |
| A 레코드 | connect.vpn.example.test → 192.0.2.10 |
| TTL | 300초 |
| 기존 DNS 변경 주체 | manual-admin (가정) |
| 서버 ID | demo-server-01 |
| 가상 고객·키 | 5명 / 서로 다른 5개 |

.test 도메인과 문서 예시용 IP를 사용하며, 실제 AWS/DNS/Outline 호출은 없다. Outline 비밀번호는 DEMO 문자열로 생성하고 운영에 사용하지 않는다. 접속 URL은 ss:// 구조를 따르지만 실제 VPN 연결용이 아니다.

고객 상태: 활성 2명, 만료 1명, 결제대기 1명, 기간 미확인 1명. 결제대기 고객의 키는 비활성 예비 매핑이며, 실제 결제 전 키 발급을 뜻하지 않는다. 비활성 표시는 데모 상태일 뿐 Outline API의 정지 기능을 구현한 것이 아니다. 금액은 홈페이지와 동일한 예시 가격이며 확정 상품이 아니다.

설정과 고객 데이터: fixtures/demo/infrastructure.json, fixtures/demo/customers.json.

요약 확인: `node tools/demo-data.mjs`

가상 키 원문 확인: `node tools/demo-data.mjs --show-demo-keys`

로컬 테스트: `node --test tests/demo-data.test.mjs`

데이터 로더는 중복 고객/키/비밀번호, 실도메인, 실제 변경 허용, DNS 불일치, 비활성 고객의 키 활성화를 거부한다. 가상 기준 시각은 2026-10-14이며 자동 만료·키 삭제·결제·DB 저장은 수행하지 않는다. 현재 고객 홈페이지에는 이 데이터를 연결하지 않았다.

다음 개발은 이 fixture를 주입하는 IP 교체 시뮬레이터와 읽기 전용 Outline 가짜 어댑터로 진행할 수 있다.
