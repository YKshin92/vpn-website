// FAQ-only guidance. No generated answer, conversation upload or external AI service.
// Answers match what the site does now (2026-11-06 3차, review item 23).
export const supportTopics=[
 {id:'install',question:'앱은 어떻게 설치하나요?',answer:'Outline 앱을 설치한 뒤 내 이용권의 [키 복사]로 접속 키를 복사해 앱에 추가하세요. 홈페이지 "설치 방법"에서 기기별 순서를 볼 수 있어요.'},
 {id:'connect',question:'VPN이 연결되지 않아요',answer:'내 이용권의 "연결이 안 돼요"를 열어 순서대로 해 보세요: 키 다시 추가 → 다른 VPN 끄기 → Wi-Fi와 모바일 데이터 바꾸기 → 앱 업데이트. 그래도 안 되면 기기·통신망·오류 문구를 적어 문의를 남겨 주세요.'},
 {id:'stopped',question:'키가 멈췄다고 나와요',answer:'내 이용권 맨 위의 상태를 확인하세요. "기간 만료"면 기간을 연장하고, "데이터 소진"이면 10GB를 추가하면 같은 키로 바로 다시 연결돼요. "일시 정지"는 관리자가 멈춘 상태라 문의를 남겨 주세요.'},
 {id:'data',question:'추가 데이터는 언제까지 쓸 수 있나요?',answer:'매달 100GB가 기본이고, 부족하면 내 이용권의 "데이터 추가"에서 10GB(3,000원)씩 바로 늘릴 수 있어요. 추가한 데이터는 이번 사용 주기가 끝나면 사라지고, 다음 주기는 다시 100GB로 시작해요.'},
 {id:'payment',question:'결제·연장·환불을 문의하고 싶어요',answer:"기간 연장은 내 이용권에서 신청한 뒤 안내된 계좌나 QR로 입금하고 '입금했어요'를 누르면, 담당자가 확인해서 남은 기간에 더해 드려요. 상담 시간 밖에 입금해도 담당자가 확인해서 반영해요. 단순 변심 환불은 없어요. 회사 사정(장애로 계속 제공하기 어려울 때·운영 중단·중복/잘못된 결제)이면 환불해요. 입금했는데 반영이 안 됐다면 입금 수단·금액·입금자명을 문의에 남겨 주세요. 비밀번호·VPN 접속 키 전체는 보내지 마세요."},
 {id:'password',question:'비밀번호를 잊었어요',answer:'로그인 화면의 "비밀번호 재설정"에서 가입한 ID와 이메일을 입력하면 받은 인증 코드로 새 비밀번호를 정할 수 있어요. ID가 기억나지 않으면 "ID 찾기"를 쓰세요.'}
];
export function supportAvailability(now=new Date()){
 const time=new Date(now);if(!Number.isFinite(time.getTime()))throw Error('invalid-support-time');const kst=new Date(time.getTime()+9*3600000),day=kst.getUTCDay(),hour=kst.getUTCHours();
 const withinHours=day>=1&&day<=5&&hour>=9&&hour<18;
 return {withinHours,label:'월–금 09:00–18:00 · 한국시간',hours:'월–금 09:00–18:00',short:withinHours?'보통 오늘 안에 답변드려요':'지금은 상담 시간이 아니에요',message:(withinHours?'지금 문의하시면 보통 오늘 안에 답변드려요':'지금은 상담 시간이 아니에요 · 문의를 남겨 주시면 다음 평일에 답변드려요')+' · 답변이 오면 \'1:1 문의\'에 숫자로 표시돼요'};
}
export function answerSupportQuestion(question){const normalized=String(question).trim().toLowerCase();const rules=[['password',/비밀번호|password|로그인/],['stopped',/멈|정지|만료|stopped|paused/],['install',/설치|install|앱.*추가/],['payment',/결제|환불|연장|pay|refund/],['data',/데이터|용량|초기화|data/],['connect',/연결|접속|connect/]];const topic=rules.find(([,pattern])=>pattern.test(normalized));return topic?supportTopics.find(item=>item.id===topic[0]):null;}
