'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const extensions={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(url.pathname==='/')target=path.join(root,'index.html');
 if(!(target===root||target.startsWith(root+path.sep))){res.writeHead(403);return res.end()}
 fs.readFile(target,(error,data)=>{if(error){res.writeHead(404);return res.end('Missing file')}
 res.writeHead(200,{'content-type':extensions[path.extname(target)]||'application/octet-stream'});res.end(data)})
});
const ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
async function colors(page,selector){
 return page.locator(selector).evaluate(el=>{
 const st=getComputedStyle(el);
 const background=st.backgroundColor,foreground=st.color;
 const p=getComputedStyle(el,'::placeholder');
 return {background,foreground,placeholder:p.color,theme:document.documentElement.dataset.theme}
 })
}
function luminosity(value){
 const numbers=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
 if(numbers.length!==3)return NaN;
 const channels=numbers.map(x=>{const u=x/255;return u<=.04045?u/12.92:Math.pow((u+.055)/1.055,2.4)});
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722
}
function contrast(a,b){const x=luminosity(a),y=luminosity(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{
 await ready;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const base='http://127.0.0.1:'+server.address().port;
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('pv-site-settings',JSON.stringify({theme:'dark',accent:'blue',scale:100,motion:true}));
  localStorage.setItem('pv-sidebar-hidden','1');
  localStorage.setItem('pv-presentation-docs-v1',JSON.stringify({'aCUlYCga1LA':{title:'Новый Курс В1. Урок 1',fileName:'Новый Курс В1. Урок 1.txt',text:'Tak zaczynamy naukę języka polskiego.\nKolejny dzień to nowa możliwość.',pairs:[]}}));
 });
 try{
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.locator('.pv-header-brand').waitFor();
  assert.equal(await page.locator('.quick-path').count(),0,'Old four-card path is removed');
  assert.equal(await page.locator('.pv-header-name').textContent(),'Польский вслух');
  await page.waitForTimeout(500);
  const hidden=await page.locator('.pv-header-name').evaluate(el=>getComputedStyle(el).opacity);
  assert.equal(hidden,'1','Collapsed desktop menu shows site name');
  await page.evaluate(()=>document.body.classList.remove('pv-sidebar-hidden'));
  await page.waitForTimeout(500);
  const opened=await page.locator('.pv-header-logo').evaluate(el=>getComputedStyle(el).opacity);
  assert.equal(opened,'1','Expanded desktop menu shows logo');
  assert.equal(await page.locator('.pv-header-name').evaluate(el=>getComputedStyle(el).opacity),'0');
  const search=page.locator('#search');
  if(await search.count()){const style=await colors(page,'#search');assert.ok(contrast(style.background,style.foreground)>=4.5,'Home search contrast '+JSON.stringify(style))}
  await page.goto(base+'/academy.html?video=aCUlYCga1LA',{waitUntil:'domcontentloaded'});
  await page.locator('#academy-viewer:not([hidden])').waitFor({timeout:25000});
  assert.equal(await page.locator('#academy-texts').isHidden(),true,'Text footer hidden during Video tab');
  await page.locator('[data-lesson-tab="text"]').click();
  assert.equal(await page.locator('#academy-texts').isVisible(),true,'Text footer shown on Text tab');
  assert.equal(await page.locator('#academy-document-footer').count(),0,'No extra document CTA');
  assert.equal(await page.locator('.academy-document-footer').count(),0,'No duplicated document footer');
  await page.locator('[data-lesson-tab="audio"]').click();
  assert.equal(await page.locator('#academy-texts').isHidden(),true,'Text CTA absent in Listen tab');
  await page.goto(base+'/learn.html?video=aCUlYCga1LA#practice',{waitUntil:'domcontentloaded'});
  await page.locator('.pv-header-brand').waitFor();
  await page.locator('.practice-panel:visible').waitFor({timeout:25000});
  await page.locator('.practice-panel .exercise').evaluate(el=>{
   const b=document.createElement('button');b.className='word-tile chosen';b.textContent='Nie ×';el.append(b);
  });
  const chosen=await colors(page,'.practice-panel .exercise .word-tile.chosen');
  assert.ok(contrast(chosen.background,chosen.foreground)>=4.5,'Chosen word contrast '+JSON.stringify(chosen));
  const input=await colors(page,'#reader-search');
  assert.ok(contrast(input.background,input.placeholder)>=4.5,'Reader input placeholder contrast '+JSON.stringify(input));
  const current=await colors(page,'.practice-controls .input-modes .mode-button.selected');
  assert.ok(contrast(current.background,current.foreground)>=4.5,'Selected mode contrast '+JSON.stringify(current));
  console.log('PASS: no home quick-path, responsive header identity, single Text CTA, dark color contrast', {chosen,input,current});
 }finally{await page.close();await browser.close();server.close()}
})().catch(err=>{console.error(err);server.close();process.exit(1)});
