const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('dist');
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end('Invalid path');}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found');}
    const mime={'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.woff2':'font/woff2'};
    const type=mime[path.extname(file)]||'application/octet-stream';
    res.setHeader('Content-Type',type+(type.startsWith('text/')||type==='application/json'?'; charset=utf-8':''));res.end(data);
  });
}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
