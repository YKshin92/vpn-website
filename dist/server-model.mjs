export function createServerState(){return {originalIp:'192.0.2.10',candidateIp:'192.0.2.20',attachedIp:'192.0.2.10',dnsIp:'192.0.2.10',running:false,status:'ready',logs:[]};}
export async function runIpTest(state,{failure='',wait=async()=>{},onChange=()=>{}}={}){
  if(state.running)throw Error('이미 테스트가 진행 중입니다');
  if(state.status==='needs-review')throw Error('기존 작업을 확인하고 완료해 주세요');
  state.originalIp=state.attachedIp;
  if(state.attachedIp===state.candidateIp){const next=Number(state.attachedIp.split('.').at(-1))+10;if(next>250)throw Error('가상 IP 시험 범위를 모두 사용했습니다');state.candidateIp=`192.0.2.${next}`;}
  state.running=true;state.status='running';state.logs=[];
  const step=async(name,action)=>{state.logs.push(name+' · 진행 중');onChange();await wait();if(failure===name)throw Error(name+' 실패 (가상)');action();state.logs[state.logs.length-1]=name+' · 완료';onChange();};
  try{
    await step('신규 IP 확보',()=>{});
    await step('신규 IP 연결',()=>{state.attachedIp=state.candidateIp;});
    await step('서비스 확인',()=>{});
    await step('DNS 갱신',()=>{state.dnsIp=state.attachedIp;});
    await step('접속 검증',()=>{});
    state.status='success';state.logs.push('새 IP·DNS 유지 · 기존 IP 반환 및 키 변경 없음');
  }catch(error){state.logs.push(error.message);state.status=state.attachedIp===state.originalIp?'stopped':'needs-review';state.logs.push('추가 IP 할당과 자동 원복을 중단했습니다');}
  finally{state.running=false;onChange();}
}
export function recoverServer(state){if(state.running||state.status!=='needs-review')throw Error('확인이 필요한 작업만 완료할 수 있습니다');state.dnsIp=state.attachedIp;state.status='success';state.logs.push('관리자 가상 확인 · 현재 신규 IP에 DNS를 맞추고 유지');}
