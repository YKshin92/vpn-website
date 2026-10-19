// Availability is advisory; account creation always checks uniqueness again.
export function mountUsernameCheck({input,button,result,api}){
 let checked='',sequence=0,busy=false;
 const normalized=()=>input.value.toLowerCase();
 function display(message,kind=''){result.textContent=message;result.className='field-feedback'+(kind?' '+kind:'');input.setAttribute('aria-invalid',kind==='error'?'true':'false');}
 function invalidate(){sequence++;checked='';input.setCustomValidity('');display('ID 입력 후 중복 확인을 눌러주세요');button.disabled=false;button.textContent='중복 확인';busy=false;}
 input.addEventListener('input',invalidate);button.disabled=false;invalidate();
 button.onclick=async()=>{
  if(busy)return;const value=normalized(),current=++sequence;
  if(!/^[a-z0-9_]{3,32}$/.test(value)){checked='';input.setCustomValidity('');display('영문·숫자·밑줄 3~32자로 입력해 주세요','error');input.focus();return;}
  busy=true;button.disabled=true;button.textContent='확인 중';display('사용 가능한 ID인지 확인하고 있습니다');
  try{const response=await api('check-username',{username:value});if(current!==sequence||normalized()!==value)return;
   checked=response.available?value:'';input.setCustomValidity('');display(response.available?'사용할 수 있는 ID입니다':'이미 사용 중인 ID입니다 다른 ID를 입력해 주세요',response.available?'success':'error');
  }catch{if(current===sequence){checked='';input.setCustomValidity('');display('ID를 확인하지 못했습니다 잠시 후 다시 시도해 주세요','error');}}
  finally{if(current===sequence){busy=false;button.disabled=false;button.textContent='중복 확인';}}
 };
 return {ensure(){if(checked&&checked===normalized())return true;display('가입 전에 ID 중복 확인을 진행해 주세요','error');input.focus();return false;}};
}
