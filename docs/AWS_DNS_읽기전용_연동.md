# AWS·DNS 읽기 전용 조회

2026-10-17 / 작업 6 완료 / 실제 AWS 인증·관리자 HTTP 조회 대조 성공

## 최신 결과 — 실제 연동 검증 완료

후속 변경: 서버 조회를 카드 목록·선택 상세로 확장했다. IEUM_AWS_SERVER_TARGETS에 서버별 instance/domain 배열을 최대 10개 설정할 수 있으며 현재는 기존 실제 한 대만 조회한다. servers 배열·fleetStatus를 추가하고 단일 서버 필드도 유지한다. 자세한 범위는 [IP 변경 작업 실행기와 여러 서버 조회](IP변경_작업실행기.md)를 따른다.

사용자 로그인 완료 후 STS로 유효 인증을 확인하고 계정 끝 4자리 8290의 프로필을 로컬 관리자에 연결했다. 기대 계정 ID는 서버 실행 인수로 전달하며 전체 계정 ID·자격증명·토큰을 문서에 추가하지 않는다.

| 조회 항목 | 결과 |
| --- | --- |
| 인스턴스·리전 | vpnServer001 · ap-northeast-2 |
| 상태 | running |
| 연결된 고정 IP | vpnServer · 3.35.1.102 |
| Lightsail DNS | ieumvpn.link · 루트 A=3.35.1.102 |
| Route 53 공개 영역 | 해당 계정에서 동일 이름 영역 없음 |
| 공개 DNS | A=3.35.1.102, NS 4개가 Lightsail 영역과 일치 |
| 관리자 API | status=ok, dnsManager=lightsail/ns-match, ipMatch=true, changesAllowed=false |

관리자 화면을 새로고침한 뒤 ‘실제 서버 조회 → AWS·DNS 조회’를 누른다. 관리자 세션이 만료됐으면 기존 계정으로 다시 로그인한다. 현재 검증은 브라우저 시각 검증 대신 실제 HTTP → 관리자 세션 DB → AWS·DNS → 응답 경로로 수행했다.

처음 Node DNS의 기본 서버가 127.0.0.1로 잡혀 NS·A가 ECONNREFUSED로 실패했지만 Windows Resolve-DnsName은 성공했다. IEUM_DNS_SERVERS(쉼표로 구분한 IP 최대 4개)를 추가하고 해당 조회 Resolver에만 setServers를 적용했다. 실행 도구가 시작 시 기본 게이트웨이 인터페이스의 Windows IPv4 DNS를 읽는다. OS 설정·전역 Node DNS는 변경하지 않는다. 네트워크가 바뀌면 실행 설정도 다시 확인한다. Windows 이외 서버에서는 필요 시 환경 변수로 조회 DNS IP를 지정하거나 정상적인 기본 Resolver를 사용한다.

사용자 UAC 허용 후 PostgreSQL 서비스를 복구하고 tools/start-admin-aws-readonly.ps1로 관리자 서버를 실행했다. 초기 3초 확인은 연결 거부였으나 이후 리스닝·로그 확인과 실제 HTTP 검증이 성공했다. DB·백엔드는 자동 시작으로 바꾸지 않았다.

빌드·JS 문법 검사·기본 테스트 29개 통과. 실제 HTTP /admin 200, 익명 API 401, 임시 관리자 세션 API 200과 위 결과를 확인했다. 임시 검사 계정·세션을 제거했고 실제 사용자 계정을 유지했다. 실제 IP·DNS·IAM 변경·DB 스키마 변경·GitHub 반영은 없다.

재실행은 기존 ‘인증 준비와 실행’의 도구를 사용한다. 실제 의도한 계정 ID를 지정해야 하며 111122223333은 예시다. 세션이 만료되면 사용자 aws login이 필요하다. IAM 최소 권한 정책 부착 상태·쓰기 권한·세션 자동 갱신·중국에서의 연결은 이번 조회로 검증하지 않았다.

다음은 작업 7의 영속 작업 상태·중복 실행 방지·실패 대응·모의 검증 개발이다. 사용자 승인 전 착수하지 않는다. 아래 경과·대기 문구는 당시 기록이며 현재 상태는 이 최신 결과를 따른다.

## 후속 진행 — AWS CLI 설치 및 사용자 로그인 대기

사용자가 CLI 설치·사용자 콘솔 로그인·조회 검증 단계에 ‘진행해줘’로 승인했다. 공식 https://awscli.amazonaws.com/AWSCLIV2.msi를 다운로드해 Authenticode 유효 상태와 Amazon Web Services 게시자를 확인했다. 설치 종료 코드 0, C:\Program Files\Amazon\AWSCLIV2\aws.exe 존재 및 aws-cli/2.38.1 실행을 확인했다.

설치 파일 SHA-256: AD07F9ACD855F48AD016E63B2F0B4F87783C1B6524B86E966F4A6D21D01F524A. 설치 파일과 설치 로그는 Windows 임시 폴더에 두며 저장소에 추가하지 않았다.

사용자 인증을 위해 별도의 대화형 PowerShell 창에서 `aws login --profile ieum-readonly --region ap-northeast-2`를 시작했다. 로그인·MFA는 사용자가 직접 처리한다. 현재는 사용자 인증 완료 확인을 기다리며, 실제 AWS 계정 ID 확인·조회 프로필을 이용한 관리자 서버 재시작·실제 리소스 조회는 아직 수행하지 않았다. IP·DNS·IAM 정책 변경과 GitHub 반영은 없다.

아래 ‘현재 결과’ 및 인증 준비 설명의 CLI 미설치 문구는 조회 코드 구현 당시 기록이다. 최신 설치 상태는 이 후속 진행 기록을 따른다.

## 현재 결과

2026-10-17 재개: STS 조회에서 기존 인증 세션 만료를 확인해 같은 프로필로 새 로그인을 시작했다. 사용자 콜백의 인증 코드·토큰은 재사용하거나 문서에 저장하지 않았다. PostgreSQL 서비스와 3000번 백엔드도 중지 상태여서 기존 실행 복구를 요청했다. 현재 사용자 재인증·서비스 시작 완료 확인을 기다리며, 실제 조회 검증을 완료로 표시하지 않는다.

로그인 화면 미표시 후속 조치: 사용자가 브라우저·PowerShell 창이 보이지 않는다고 알려왔다. 기존 AWS 로그인 프로세스가 살아 있으나 창 제목이 없는 상태를 확인했다. 해당 작업에서 시작한 프로세스만 종료하고 출력이 확인되는 PTY에서 같은 프로필의 로그인을 다시 시작했다. CLI가 정식 AWS 인증 URL과 로컬 콜백 대기 상태를 출력했다. 앱 브라우저 열기 요청은 queued로 반환되어 화면 표시 성공으로 판단하지 않았고, 사용자에게 일회성 로그인 링크를 전달했다. 인증 URL·state·challenge·인증 코드는 문서에 보관하지 않는다. 사용자 인증 완료와 실제 리소스 조회는 계속 대기 중이다.

관리자 화면의 ‘실제 서버 조회’ 메뉴를 가상 IP 시험과 분리했다. 로그인한 관리자만 GET /api/admin/infrastructure를 호출할 수 있다. 서울의 vpnServer001과 ieumvpn.link를 대상으로 고정하며, 이번 단계에는 IP 할당·연결·해제·반환, DNS 수정 API가 없다.

이 PC에는 AWS CLI와 사용자·프로젝트 .aws 프로필이 확인되지 않았다. 사용자는 AWS 콘솔 로그인만 사용 중이라고 답변했다. 따라서 AWS 실제 계정·인스턴스·고정 IP·관리 영역을 API로 조회한 것은 아니다. 미설정 상태에서는 AWS·DNS SDK 조회를 실행하지 않고 미설정 안내를 반환한다.

별도의 읽기 전용 공개 DNS 확인에서 A 레코드 3.35.1.102와 다음 NS가 조회됐다. 현재 PC의 리졸버가 반환한 값이며 AWS 계정·현재 인스턴스 연결 또는 중국에서의 접속을 증명하지 않는다.

- ns-2030.awsdns-61.co.uk
- ns-959.awsdns-55.net
- ns-225.awsdns-28.com
- ns-1399.awsdns-46.org

## 구현과 판정 기준

- 공식 AWS SDK v3 3.1152.0, 서버 측 공유 프로필 fromIni 사용. 브라우저에 인증정보·원본 AWS 오류·ARN·비밀 경로를 반환하지 않는다.
- 명시적 활성화, 프로필 이름, 기대하는 12자리 AWS 계정 ID가 필요하다. STS 계정이 다르면 리소스·DNS 조회를 중단한다.
- Lightsail GetInstance·GetStaticIps는 ap-northeast-2, GetDomain은 글로벌 DNS API 리전 us-east-1에서 호출한다.
- Route 53 ListHostedZonesByName·GetHostedZone·ListResourceRecordSets로 대상과 이름이 일치하는 공개 영역과 루트 A·AAAA·CNAME을 읽는다. 비공개 영역은 제외한다.
- 고정 IP와 DNS 목록의 페이지를 처리하며 안전 상한을 넘으면 조회 오류로 남긴다.
- DNS NS·A는 Node Resolver로 조회한다. NS는 순서·대소문자·마지막 점을 정규화한 전체 집합으로 비교한다. 공개 A 중 현재 서버 IP가 포함되는지도 별도로 표시한다.
- 두 AWS DNS 제공자 조회가 완료됐거나 영역 부재가 확인되고, NS 일치 후보가 하나인 경우에만 해당 제공자와 ‘공개 NS 일치’를 표시한다. 권한 부족·조회 실패·중복 후보·NS 불일치는 미확인으로 남긴다.
- 공개 NS 일치는 캐시 영향을 받을 수 있는 관측 증거다. 실제 쓰기 권한이나 도메인 등록기관, 전 세계 전파 완료를 확정하지 않는다.
- 버튼을 누를 때 조회하며 같은 프로세스의 동시 요청은 합친다. 결과는 10초 동안 재사용한다. DB에는 조회 결과를 영속 저장하지 않는다.
- 기존 가상 시험의 후보 IP 표시에서 마지막 옥텟·증가 폭·문서용 IP 대역을 바로잡았다. 가상 실행과 실제 조회는 별도 경로다.

## 인증 준비와 실행

현재 CLI 설치·AWS 로그인·IAM 정책 생성·부착은 수행하지 않았다. 설치·인증 절차를 설명하고 승인받은 다음 연결 검증을 이어간다.

사용자가 콘솔 로그인만 사용하므로 AWS CLI 2.32.0 이상에서 지원하는 콘솔 임시 인증을 우선 검토한다. 승인 후 CLI를 설치하고 다음 명령으로 사용자가 직접 브라우저 로그인을 완료한다.

```powershell
aws login --profile ieum-readonly --region ap-northeast-2
```

로그인 계정의 권한을 그대로 사용하므로 **프로필 이름이 readonly라고 AWS 권한이 제한되는 것은 아니다.** 전용 IAM 사용자·역할에 조회 정책을 적용하는 방향을 권장한다. IAM 사용자·역할은 SignInLocalDevelopmentAccess 권한이 필요할 수 있다. IAM 생성·정책 부착 등 외부 변경은 별도 설명·승인 대상으로 둔다. 이번 앱은 인증 주체의 권한과 별개로 조회 명령만 구현한다.

필요한 조회 작업을 담은 tools/aws-readonly-policy.example.json은 검토용 예시이며 AWS에 적용하지 않았다. 리소스 ID를 아직 조회하지 못해 Resource는 *이다. 대상 확인 후 지원되는 작업의 리소스 범위를 좁혀야 한다. 기존 광범위 권한에 이 예시를 추가하는 것만으로 기존 권한이 축소되지는 않는다.

사용자 로그인 후 관리자가 의도한 AWS 계정 ID를 확인해 서버를 다시 실행한다. 아래의 111122223333은 예시다.

```powershell
npm.cmd run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-admin-aws-readonly.ps1 -AccountId 111122223333 -Profile ieum-readonly
```

기존 3000번 서버가 실행 중이면 해당 백엔드만 종료한 뒤 시작한다. 실행 도구는 기존 포트를 차지한 임의 프로세스를 자동 종료하지 않는다. 기존 DB 비밀정보는 tools/backend.ps1의 Windows 보호 파일에서 읽고, AWS 인증은 사용자 홈의 공유 프로필·로그인 캐시에서 읽는다. .env.example은 안내용이며 자동 로드하지 않는다.

SDK fromIni의 login_session 지원은 설치된 패키지 소스에서 확인했다. 실제 콘솔 로그인·토큰 갱신은 아직 검증하지 않았다. 세션 만료 시 사용자 재로그인이 필요하다. 인증 캐시·공유 자격증명 파일을 저장소나 이관 문서에 복사하지 않는다. 서버 이관 시 환경에 맞는 전용 역할·인증 방식을 다시 설정한다.

## 검증

- TypeScript 빌드·관리자 JS 문법 검사 통과.
- 기본 테스트 28개 통과: 기존 20개 + 조회 판정·미설정·계정 불일치·권한 부족·오류 비밀정보 제거·DNS 부분 실패 등 8개.
- DB 통합 Node 집계 19개 중 18개 통과·1개 건너뜀: 기존 관리자 계정이 있어 최초 등록 시험만 보존을 위해 생략했다. 미인증 AWS 조회 401, 인증된 조회 성공, 해당 경로 POST 미제공을 확인했다.
- 임시 테스트 계정·이력을 정리했고 기존 관리자 계정·가상 상태를 보존했다. DB 스키마 변경 없음.
- 기존 로컬 백엔드만 재시작해 적용했다. 실제 HTTP에서 /admin 200·새 메뉴 포함·health 정상, 익명 조회 401·임시 관리자 세션 조회 200·not-configured·changesAllowed=false를 확인했다. HTTP 검사 계정도 정리했다.
- 실제 AWS 응답·인증 갱신·전체 페이지 수집은 모의 로직 테스트만으로 검증 완료라고 보지 않는다. 인증 후 실제 응답과 화면 표시를 대조해야 한다.
- 기존 브라우저 도구의 로컬 URL 정책 제한 때문에 이번 화면의 실제 브라우저 시각 검증은 수행하지 않았다.

## 다음 확인 순서

1. 사용자 승인 후 AWS CLI 설치와 콘솔 브라우저 인증 준비.
2. 사용자가 로그인·MFA를 직접 완료하고 기대하는 AWS 계정 확인.
3. 실제 읽기 전용 조회, 권한 부족 여부·서버 IP·공개 DNS·영역 NS 대조.
4. 결과를 문서에 반영하고 작업 6 완료 여부 판단.
5. 그다음 작업 7의 실제 IP 변경 백엔드 범위 설명·승인. 실제 IP·DNS 변경 시험은 다시 별도 승인.

## 공식 근거

- [AWS 콘솔 자격증명으로 로컬 로그인](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html)
- [AWS SDK 자격증명 제공자](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-credential-providers.html)
- [Lightsail GetDomain의 글로벌 리전](https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-domain.html)
- [Route 53 SDK API](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/route-53/)
