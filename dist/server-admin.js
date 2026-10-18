// The old browser-only server dialog has been replaced by the authenticated local workspace.
export function mountServerControls(admin){
  const button=document.createElement('button');button.className='outline small';button.textContent='관리자 로그인 →';
  button.onclick=()=>{if(['127.0.0.1','localhost'].includes(location.hostname))location.assign('http://127.0.0.1:3000/admin');else button.textContent='로컬 개발 환경에서 사용할 수 있습니다';};
  admin.querySelector('h2').after(button);
}
