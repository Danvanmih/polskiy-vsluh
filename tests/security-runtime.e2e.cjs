'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mjs':'text/javascript'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
});
function pdfFixture(){
  const stream='BT /F1 14 Tf 30 120 Td (Polski tekst do nauki przez cale zycie.) Tj ET';
  let out='%PDF-1.4\n',offsets=[0];
  const object=(n,body)=>{offsets[n]=Buffer.byteLength(out,'latin1');out+=n+' 0 obj\n'+body+'\nendobj\n'};
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 220] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
  object(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  object(5,'<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'\nendstream');
  const xref=Buffer.byteLength(out,'latin1');
  out+='xref\n0 6\n0000000000 65535 f \n';
  for(let i=1;i<=5;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  out+='trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(out,'latin1');
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:850}});
  const blocked=[];
  await page.addInitScript(()=>{
    window.__pvCspViolations=[];
    document.addEventListener('securitypolicyviolation',e=>{
      window.__pvCspViolations.push({directive:e.violatedDirective,url:e.blockedURI});
    });
  });
  try{
    for(const target of ['index.html','academy.html','learn.html','audio.html','leaderboard.html']){
      await page.goto(origin+'/'+target,{waitUntil:'domcontentloaded'});
      await page.locator('#sidebar').waitFor();
      await page.waitForTimeout(400);
      const violations=await page.evaluate(()=>window.__pvCspViolations||[]);
      for(const v of violations)if(/script-src|worker-src/.test(v.directive))blocked.push({target,...v});
      assert.equal(await page.locator('#sidebar').count(),1,'Main navigation missing: '+target);
    }
    assert.deepEqual(blocked,[],'CSP must not block required JavaScript or workers');
    await page.goto(origin+'/learn.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.JSZip==='function',{timeout:15000});
    await page.locator('#pv-practice-import').click();
    await page.locator('#pv-file').setInputFiles({
      name:'Новый Курс В1. Урок 1.pdf',
      mimeType:'application/pdf',
      buffer:pdfFixture()
    });
    await page.locator('#pv-add-file').click();
    await page.waitForURL(/video=aCUlYCga1LA/,{timeout:45000});
    assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('pv-presentation-docs-v1')||'{}').aCUlYCga1LA),true,'PDF not imported');
    const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv-presentation-docs-v1')).aCUlYCga1LA.text);
    assert.match(imported,/Polski tekst do nauki/,'PDF text extraction was lost');
    const pdfViolations=await page.evaluate(()=>window.__pvCspViolations||[]);
    assert.deepEqual(pdfViolations.filter(v=>/script-src|worker-src/.test(v.directive)),[],'CSP blocked new PDF.js module or worker');
    // Verify legacy Scratch content cannot read the learning site's localStorage.
    await page.goto(origin+'/onas-isolated.html',{waitUntil:'domcontentloaded'});
    const sandbox=page.locator('iframe[sandbox]');
    assert.equal(await sandbox.count(),1,'Isolated game frame missing');
    const perms=await sandbox.getAttribute('sandbox');
    assert.match(perms,/allow-scripts/);
    assert.doesNotMatch(perms,/allow-same-origin/);
    await page.frameLocator('iframe').locator('canvas').first().waitFor({timeout:30000});
    const storageAccess=await sandbox.evaluate(el=>{try{return el.contentWindow.localStorage.length}catch(e){return e.name}});
    assert.equal(storageAccess,'SecurityError','Legacy game must not access first-party storage');
    console.log('PASS: primary CSP, patched PDF import and isolated game sandbox');

  }finally{
    await page.close();await browser.close();server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exit(1)});
