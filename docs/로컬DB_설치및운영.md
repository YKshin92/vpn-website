# 로컬 PostgreSQL 설치 및 운영 기록

작성일: 2026-10-16 / 작업 2 완료

> 작업 3 업데이트: 아래 ‘테이블 없음·백엔드 미구현’은 설치 직후 기록이다. 현재는 가상 서버·고객·개별 키 스키마와 로컬 API가 구현되었고 앱에 해당 테이블 DML 권한을 추가했다. 최신 내용은 [로컬 백엔드 개발 및 검증](로컬백엔드_개발및검증.md)을 따른다. 홈페이지 연결과 백업 복원은 아직 미완료다.

## 설치 구성

| 항목 | 적용 값 |
| --- | --- |
| 버전 | PostgreSQL 17.11 / EDB Windows 설치 패키지 17.11-5 |
| 설치 경로 | `C:\Program Files\PostgreSQL\17` |
| 데이터 경로 | `C:\Program Files\PostgreSQL\17\data` |
| Windows 서비스 | `ieum-postgresql-17` |
| 서비스 계정 | 기본 제공 `NT AUTHORITY\NetworkService` |
| 시작 방식 | 수동 시작, 현재 실행 중 |
| DB 주소 | `127.0.0.1:5432` |
| 개발 DB | `ieum_vpn_dev` |
| DB 관리자 | `postgres` |
| 앱 계정 | `ieum_app` |
| 설치 구성요소 | 서버·명령줄 도구; pgAdmin·StackBuilder 제외 |
| 암호 인증 | SCRAM-SHA-256, IPv4 루프백만 허용; 나머지 네트워크 주소는 거부 |
| 백업 도구 | pg_dump·pg_restore 17.11 실행 확인 |

공식 [PostgreSQL Windows 안내](https://www.postgresql.org/download/windows/)가 연결하는 EDB 배포판을 사용했다. 패키지 메타데이터는 winget의 `PostgreSQL.PostgreSQL.17`에서 확인했다. 설치 파일 SHA-256과 메타데이터 일치를 확인하고 EnterpriseDB Corporation의 유효한 전자서명을 확인했다.

설치 파일 SHA-256: `612c7f5400a003aaffa0372cb273eed52278f93c680ab911eb9cb2229e329072`

다운로드 출처: `https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64.exe`

설치 옵션 참고: [EDB 명령줄 설치 옵션](https://www.enterprisedb.com/docs/supported-open-source/postgresql/installing/command_line_parameters/).

## 비밀번호와 연결 설정

관리자·앱 비밀번호는 서로 다르게 무작위 생성했다. 원문은 문서·저장소·명령 인자에 기록하지 않았다. 현재 사용자 Windows 암호화 방식으로 보호한 SecureString을 다음 로컬 파일에 저장했다.

`C:\Users\sesal\AppData\Local\IeumVPN\postgres-local\credentials.xml`

이 폴더는 현재 사용자·SYSTEM·Administrators만 접근하도록 설정했다. 파일은 현재 사용자·PC의 Windows 보호 기능에 의존하므로 다른 서버에 그대로 복사하여 자격증명을 복구하는 용도로 쓰지 않는다. 서버 이전 시 새 자격증명을 설정하고 백엔드의 연결 설정을 변경해야 한다. DB 백업과 별도로 비밀정보 복구·재설정 절차도 준비한다.

설치 중 사용한 임시 비밀번호 옵션 파일은 제거했음을 확인했다. 백엔드용 `.env.local`이나 연결 코드는 아직 생성하지 않았다. 다음 작업에서 로컬 연결 설정을 별도로 구성한다. 앱 계정으로 접속할 때 필요한 비밀이 아닌 값은 주소·포트·DB명·계정명이며 비밀번호는 위의 보호된 로컬 저장소에서만 취급한다.

앱 계정은 로그인·개발 DB CONNECT·public 스키마 USAGE만 갖는다. 관리자·DB 생성·역할 생성·복제·스키마 내 객체 생성 권한은 부여하지 않았다. 현재 고객 테이블이 없으므로 데이터 읽기·쓰기 권한도 아직 없다. 다음 스키마 작업에서 필요한 테이블 권한만 추가한다. 스키마 변경용 권한과 앱 실행 권한은 분리한다.

## 검증 결과

- 설치 프로그램 종료 코드 0.
- `ieum_app`으로 실제 개발 DB 접속 성공, 서버 주소 `127.0.0.1` 확인.
- 앱의 DB CREATE·public 스키마 CREATE 권한이 모두 false임을 확인.
- 앱에 superuser·createdb·createrole·replication 권한이 없음을 설치 스크립트에서 검사.
- 임시 검사 스키마·테이블에 표식 저장 → 신규 DB 서비스 재시작 → 표식 유지 확인.
- 임시 검사 스키마·테이블 제거 완료, 남은 검사 스키마 0개·업무 테이블 0개.
- `listen_addresses=127.0.0.1`, 실제 리스닝 주소도 `127.0.0.1:5432`만 확인.
- `password_encryption=scram-sha-256` 확인.
- 서비스 Running·시작 방식 Manual 확인.
- pg_dump·pg_restore 버전 출력 확인. 실제 백업·복원 시험은 작업 4에서 별도 승인 후 진행.

이 결과는 로컬 DB 설치 검증이다. 홈페이지·백엔드 연동, 고객 테이블·데이터, 인증, 실제 AWS·Outline·결제 연동은 완료되지 않았다.

## 시작·중지

PC 재부팅 후에는 수동으로 서비스를 시작해야 한다. 관리자 권한 PowerShell에서 다음 명령을 사용할 수 있다.

```powershell
Get-Service ieum-postgresql-17
Start-Service ieum-postgresql-17
Stop-Service ieum-postgresql-17
```

서비스 중지 시 홈페이지의 정적 화면은 영향을 받지 않지만 향후 DB에 연결하는 백엔드는 접속할 수 없게 된다. 데이터 디렉터리를 지우거나 설치 스크립트를 반복 실행하지 않는다. 스크립트는 기존 설치 경로가 있으면 덮어쓰지 않고 중단하도록 구성했다.

명령줄 도구는 시스템 PATH를 변경하지 않고 절대 경로로 사용했다. 예: `C:\Program Files\PostgreSQL\17\bin\psql.exe`.

## 설치 작업 파일과 재현 범위

- `tools/setup-local-postgres.ps1`: 승인된 초기 설치·계정 생성·권한·재시작 검증 스크립트. 버전·해시가 고정된 최초 설치용이며 업그레이드·재설정용이 아니다.
- `local-postgres-setup-result.json`: 비밀 값 없는 로컬 설치 결과. `.gitignore`에 제외 규칙 추가.
- 초기 비밀 폴더 ACL 명령의 SID 표기 문제로 설치 전 중단된 시도가 있었으며 수정 후 설치 성공. 실패 시에는 설치 프로그램을 실행하기 전에 중단했다.
- 설치·구성·검증은 Windows 권한 상승으로 수행했다. 추가 로컬 Windows 사용자를 만들지 않고 기본 제공 서비스 계정을 사용했다.

실제 설치 결과 파일과 비밀정보는 GitHub에 올리지 않았다. 사용자 요청에 따라 이번 작업 전체를 GitHub에 커밋·푸시·배포하지 않았다.

## 다음 작업 제안 — 작업 3

승인 후 Node.js·TypeScript 백엔드와 DB 연결 설정을 추가한다. 패키지 설치, 개발용 스키마 마이그레이션, 가상 고객·개별 가상 키 저장·조회 및 필요한 앱 데이터 권한 설정을 포함한다. DB 비밀번호는 브라우저에 전달하지 않는다. 실제 고객·키·AWS·결제와 관리자 운영 공개는 포함하지 않는다. 관리자 인증 전의 개발 API는 로컬에만 제공하고 실제 정보를 넣지 않는다.

구체적인 패키지·테이블·API 범위는 착수 계획에 제시하고 최종 승인받는다. 완료 시 저장·조회·재시작 유지·고객 간 동일 키 할당 거부를 검증하고 문서에 기록한다.
