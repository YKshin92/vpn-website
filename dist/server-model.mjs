export function createServerState() {
  return { originalIp:'192.0.2.10', candidateIp:'192.0.2.20', attachedIp:'192.0.2.10', dnsIp:'192.0.2.10', running:false, status:'ready', logs:[] };
}
export async function runIpTest(state, {failure='', wait=async()=>{}, onChange=()=>{}}={}) {
  if(state.running) throw Error('이미 테스트가 진행 중입니다');
  if(state.attachedIp!==state.originalIp) throw Error('먼저 기존 IP로 복구해 주세요');
  state.running=true; state.status='running'; state.logs=[];
  const step=async(name,action)=>{state.logs.push(name+' · 진행 중');onChange();await wait();if(failure===name)throw Error(name+' 실패 (가상)');action();state.logs[state.logs.length-1]=name+' · 완료';onChange();};
  try {
    await step('신규 IP 확보',()=>{});
    await step('신규 IP 연결',()=>{state.attachedIp=state.candidateIp;});
    await step('연결 상태 확인',()=>{});
    await step('기존 IP 복구',()=>{state.attachedIp=state.originalIp;});
    state.status='success';
  } catch(error) {
    state.logs.push(error.message);
    if(failure==='기존 IP 복구')state.status='needs-recovery';
    else {state.attachedIp=state.originalIp;state.status='rolled-back';state.logs.push('기존 IP 유지·복구 완료');}
  } finally {state.running=false;onChange();}
}
export function recoverServer(state){if(state.running)throw Error('테스트 진행 중');state.attachedIp=state.originalIp;state.status='recovered';state.logs.push('관리자 가상 원복 완료');}
