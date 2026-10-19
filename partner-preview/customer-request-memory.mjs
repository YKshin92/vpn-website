// Only opaque request IDs and flow metadata survive a reload in this tab.
export function requestMemory(storage, now=()=>Date.now()) {
 const key='ieum.local.pending.v1', ttl=10*60*1000;
 const valid=v=>v&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)&&['signup','find-id','reset-password'].includes(v.kind)&&Number.isFinite(v.at)&&v.at<=now()&&now()-v.at<ttl;
 return {
  read(){try{const v=JSON.parse(storage?.getItem(key)??'null');if(valid(v))return {id:v.id,kind:v.kind,at:v.at};storage?.removeItem(key);}catch{}return null;},
  save(id,kind){const v={id,kind,at:now()};if(!valid(v))return;try{storage?.setItem(key,JSON.stringify(v));}catch{}},
  clear(){try{storage?.removeItem(key);}catch{}}
 };
}
