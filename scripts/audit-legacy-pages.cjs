'use strict';
/* Read-only inventory of legacy, self-contained HTML documents.
 * This is not a malware verdict. It intentionally prints hostnames only,
 * never full URLs, queries, passwords, or tokens. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const files=[
  'ONAS/One night at scrath 0.6.html',
  'One night at scrath 0.4.html',
  'One night at scrath 0.6.html',
  'new 1.html','new 2.html','new 4.html','new 5.html'
];
for(const file of files){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const hosts=new Set([...source.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?::\d+)?(?:\/|$)/gi)].map(m=>m[1].toLowerCase()));
  const report={
    file,
    bytes:Buffer.byteLength(source,'utf8'),
    externalHosts:[...hosts].sort().slice(0,80),
    scripts:(source.match(/<script\b/gi)||[]).length,
    calls:{
      eval:(source.match(/\beval\s*\(/g)||[]).length,
      functionConstructor:(source.match(/\bnew Function\s*\(/g)||[]).length,
      fetch:(source.match(/\bfetch\s*\(/g)||[]).length,
      webSocket:(source.match(/\bWebSocket\s*\(/g)||[]).length,
      localStorage:(source.match(/\blocalStorage\b/g)||[]).length,
      serviceWorker:(source.match(/\bserviceWorker\b/g)||[]).length
    }
  };
  console.log(JSON.stringify(report));
}
