// Count-only site notification, never email/browser push. No content storage.
export function mountSupportNotice({node,api,role='customer',intervalMs=0,clock=globalThis,onAuthLoss=()=>{}}){
 if(!Number.isInteger(intervalMs)||intervalMs<0||(intervalMs>0&&intervalMs<1000))throw Error('invalid-notice-interval');
 let sequence=0,disposed=false,timer;const doc=node.ownerDocument;
 function clear(){node.hidden=true;node.textContent='';}
 async function refresh(){if(disposed||doc.hidden)return;const request=++sequence;try{const result=await api('/summary'),s=result?.summary;if(disposed||request!==sequence)return;if(!s||![s.unreadThreads,s.unreadMessages].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('invalid-summary');if(role==='administrator'&&(!Number.isSafeInteger(s.waitingAdmin)||s.waitingAdmin<0))throw Error('invalid-summary');node.textContent=role==='customer'?(s.unreadThreads?'문의 답변 '+s.unreadThreads:'1:1 문의'):'미답변 '+s.waitingAdmin+' · 새 메시지 '+s.unreadMessages;node.hidden=false;}catch(error){if(disposed||request!==sequence)return;clear();if(error?.status===401||error?.status===403){dispose();onAuthLoss();}}}
 const visibility=()=>{if(!doc.hidden)void refresh();};doc.addEventListener?.('visibilitychange',visibility);
 function dispose(){disposed=true;sequence++;if(timer)clock.clearInterval(timer);doc.removeEventListener?.('visibilitychange',visibility);clear();}
 if(intervalMs){if(intervalMs<1000)throw Error('invalid-notice-interval');timer=clock.setInterval(()=>{void refresh();},intervalMs);}
 return {ready:refresh(),refresh,dispose};
}
