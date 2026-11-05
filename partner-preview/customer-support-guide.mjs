// FAQ-only guidance. No generated answer, conversation upload or external AI service.
export const supportTopics=[
 {id:'install',question:'앱은 어떻게 설치하나요?',answer:'Outline Client를 설치한 뒤 내 이용권에서 확인한 접속 키를 앱에 추가해 주세요. 홈페이지의 기기별 설치 안내에서 순서를 볼 수 있습니다. 현재 예시 키로는 실제 VPN에 연결할 수 없습니다.'},
 {id:'connect',question:'VPN이 연결되지 않아요',answer:'기기 인터넷 연결과 Outline 연결 상태, 이용권 만료 여부를 먼저 확인해 주세요. 문제가 계속되면 사용 기기·지역·통신망·오류 문구를 관리자에게 남겨 주세요. 중국의 접속 가능 여부는 현지 회선 확인이 필요하며 자동 안내로 확정할 수 없습니다.'},
 {id:'data',question:'추가 데이터는 언제까지 쓸 수 있나요?',answer:'추가 데이터는 현재 월간 주기에 사용하는 방식으로 준비 중입니다. 다음 주기에는 추가량이 이월되지 않고 기본 제공량으로 돌아갑니다. 실제 적용량과 초기화 시점은 관리자에게 확인해 주세요.'},
 {id:'payment',question:'결제·연장·환불을 문의하고 싶어요',answer:'결제 확인, 기간 연장, 환불 여부는 관리자 확인이 필요합니다. 문의에 상황을 남겨 주세요. 비밀번호·카드 정보·VPN 접속 키 전체는 보내지 마세요.'}
];
export function supportAvailability(now=new Date()){
 const time=new Date(now);if(!Number.isFinite(time.getTime()))throw Error('invalid-support-time');const kst=new Date(time.getTime()+9*3600000),day=kst.getUTCDay(),hour=kst.getUTCHours();
 const withinHours=day>=1&&day<=5&&hour>=9&&hour<18;
 return {withinHours,label:'월–금 09:00–18:00 · 한국시간',message:withinHours?'문의 내용을 남겨 주시면 확인 후 순서대로 답변드립니다.':'지금은 상담 운영시간 외입니다. 문의를 남겨 주시면 관리자가 확인 후 답변드립니다.'};
}
export function answerSupportQuestion(question){const normalized=String(question).trim().toLowerCase();const rules=[['install',/설치|install|앱.*추가/],['payment',/결제|환불|연장|pay|refund/],['data',/데이터|용량|초기화|data/],['connect',/연결|접속|connect/]];const topic=rules.find(([,pattern])=>pattern.test(normalized));return topic?supportTopics.find(item=>item.id===topic[0]):null;}
