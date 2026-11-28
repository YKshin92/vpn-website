// Policy documents (policies/*.md): a "# " title line, "## " headings, "- " list items and blank lines between
// paragraphs. Rendered with text nodes only, never as HTML, so a document can never inject markup.
export function parsePolicy(text){
 const lines=String(text??'').replace(/\r\n/g,'\n').split('\n'),blocks=[];let title='',para=[],list=null;
 const endPara=()=>{if(para.length){blocks.push({type:'p',text:para.join(' ')});para=[];}};
 const endList=()=>{if(list){blocks.push({type:'ul',items:list});list=null;}};
 for(const raw of lines){
  const line=raw.trim();
  if(!line){endPara();endList();continue;}
  if(line.startsWith('# ')&&!title&&!blocks.length&&!para.length&&!list){title=line.slice(2).trim();continue;}
  if(line.startsWith('## ')){endPara();endList();blocks.push({type:'h',text:line.slice(3).trim()});continue;}
  if(line.startsWith('- ')){endPara();(list??=[]).push(line.slice(2).trim());continue;}
  endList();para.push(line);
 }
 endPara();endList();return {title,blocks};
}
export function renderPolicy(doc,text){
 const {title,blocks}=parsePolicy(text),section=doc.createElement('section');
 for(const b of blocks){
  if(b.type==='ul'){const ul=doc.createElement('ul');for(const item of b.items){const li=doc.createElement('li');li.textContent=item;ul.append(li);}section.append(ul);}
  else{const n=doc.createElement(b.type==='h'?'h3':'p');n.textContent=b.text;section.append(n);}
 }
 return {title,section};
}
// The date a document takes effect, as written in it ("2026년 12월 1일부터 시행"), for "시행일" labels; the stored
// release date is only when the text was published (2026-11-06 4차, review item 2).
export function effectiveDate(text){const m=/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일부터 시행/.exec(String(text??''));if(!m)return null;const [y,mo,d]=[+m[1],+m[2],+m[3]];return mo>=1&&mo<=12&&d>=1&&d<=31?{year:y,month:mo,day:d,label:y+'년 '+mo+'월 '+d+'일',dotted:y+'.'+String(mo).padStart(2,'0')+'.'+String(d).padStart(2,'0')}:null;}
