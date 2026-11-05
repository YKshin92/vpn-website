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
