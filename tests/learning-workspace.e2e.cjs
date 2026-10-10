'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  let target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(u.pathname==='/')target=path.join(root,'index.html');
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end();return}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Missing file');return}
    res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream'});
    res.end(data);
  });
});
const ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
function expect(condition,label){assert.ok(condition,label)}
(async()=>{
  await ready;
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1350,height:850}});
  const dialogs=[];
  page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()});
  try{
    // Text entrypoint from navigation: only two toolbar actions, no empty text cards.
    await page.goto(base+'/learn.html#texts',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-my-texts').waitFor({timeout:20000});
    expect(await page.locator('#pv-text-document').isHidden(),'No text document before a file is chosen');
    expect(await page.locator('#pv-text-actions button').count()===2,'Only import and My texts actions');

    // User flow: a file is selected in Tests, auto-identified by its real lesson title.
    await page.goto(base+'/learn.html',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-practice-import').waitFor();
    await page.locator('#pv-practice-import').click();
    await page.locator('#pv-file').setInputFiles({
      name:'Новый Курс В1. Урок 1.txt',mimeType:'text/plain',
      buffer:Buffer.from('Kto rano wstaje, ten ma więcej czasu na naukę.\nNauka języka polskiego pomaga nam rozmawiać codziennie.\nDzisiaj przeczytamy bardzo interesującą historię razem.','utf8')
    });
    await page.locator('#pv-add-file').click();
    await page.waitForURL(/video=aCUlYCga1LA/,{timeout:25000});
    await page.locator('#start-round').waitFor();
    expect(await page.locator('#pv-cloze').count()===0,'No duplicate cloze card below the test');
    expect(await page.locator('.practice-panel').isVisible(),'Only selected test is open');
    expect(await page.locator('#start-round').isEnabled(),'Imported Polish sentences enable a main training round');
    await page.locator('#start-round').click();
    await page.locator('#exercise .lab-pill').waitFor();
    if(await page.locator('#tile-submit').count()){
      await page.locator('#tile-submit').click();
      expect(await page.locator('#pv-inline-answer-error').isVisible(),'Empty word assembly has inline error');
    }
    expect(dialogs.length===0,'No browser-native alert/confirm in test workflow');

    // Text view opens original document, then switches to the same-card phrase view.
    await page.goto(base+'/learn.html?video=aCUlYCga1LA#texts',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-text-document:visible').waitFor();
    expect(await page.locator('#reader-content').innerText().then(s=>s.includes('języka polskiego')),'Actual imported text is readable');
    await page.locator('#pv-text-mode-phrases').click();
    expect(await page.locator('#pv-text-phrases-panel').isVisible(),'Switch to phrases in same card');
    expect(await page.locator('#pv-text-full-panel').isHidden(),'Full text hidden while viewing phrases');

    // Library from general menu remains a lightweight picker with one relevant action.
    await page.goto(base+'/learn.html#texts',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-my-texts').click();
    await page.locator('#pv-library-results .pv-library-item').first().waitFor();
    expect(await page.locator('#pv-library-results a').filter({hasText:'Открыть текст'}).count()===1,'Text cards have one text action');
    expect(await page.locator('#pv-library-results a').filter({hasText:'Начать тест'}).count()===0,'No test link in My texts');
    await page.locator('#pv-library-close').click();
    await page.goto(base+'/learn.html',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-library-launch').click();
    await page.locator('#pv-library-results .pv-library-item').first().waitFor();
    expect(await page.locator('#pv-library-results a').filter({hasText:'Начать тест'}).count()===1,'Test cards have only Start test');
    expect(await page.locator('#pv-library-results a').filter({hasText:'Открыть текст'}).count()===0,'No text action in tests');
    expect(dialogs.length===0,'No browser-native dialogs used by library and text flow');

    // Existing user presentations with mixed Russian/Polish on one slide are repaired automatically.
    await page.evaluate(()=>{
      const key='pv-presentation-docs-v1',store=JSON.parse(localStorage.getItem(key));
      const id='aCUlYCga1LA';
      store[id].text='Анна работает в маленьком магазине.Anna pracuje w małym sklepie.\\n\\nДрузья изучают польский каждый день.Przyjaciele uczą się polskiego każdego dnia.';
      store[id].pairs=[];delete store[id].parseVersion;
      localStorage.setItem(key,JSON.stringify(store));
      const progress=JSON.parse(localStorage.getItem('pv-learning-v1')||'{}');
      if(progress.pairs)delete progress.pairs[id];
      localStorage.setItem('pv-learning-v1',JSON.stringify(progress));
    });
    await page.goto(base+'/learn.html?video=aCUlYCga1LA#texts',{waitUntil:'domcontentloaded'});
    await page.locator('#pv-text-mode-phrases').waitFor();
    await page.locator('#pv-text-mode-phrases').click();
    await page.waitForFunction(()=>{
      const docs=JSON.parse(localStorage.getItem('pv-presentation-docs-v1')||'{}');
      return docs['aCUlYCga1LA']?.pairs?.length===2;
    });
    expect(await page.locator('#phrases .phrase').count()===2,'Existing presentation recovers exactly two bilingual phrase cards');
    expect(await page.locator('#phrases').innerText().then(s=>s.includes('Anna pracuje w małym sklepie.')),'Polish sentence shown');
    await page.goto(base+'/learn.html?video=aCUlYCga1LA#practice',{waitUntil:'domcontentloaded'});
    await page.locator('#start-round').waitFor();
    expect(await page.locator('#start-round').isEnabled(),'Recovered bilingual material enables original test');
    expect(await page.locator('#pv-cloze').count()===0,'No extra practice panel after migration');
    process.stdout.write('PASS: import, auto-lesson lookup, one training block, text switch, filtered library, inline validation, bilingual migration\n');
  }finally{await page.close();await browser.close();server.close()}
})().catch(err=>{console.error(err);server.close();process.exit(1)});
