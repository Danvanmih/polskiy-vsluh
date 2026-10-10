'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const filepath=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!filepath.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(filepath,(err,data)=>{if(err){res.writeHead(404);res.end('Missing');return}res.writeHead(200,{'content-type':types[path.extname(filepath)]||'application/octet-stream'});res.end(data)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1365,height:850}});
 page.on('pageerror',error=>{if(!/YouTube|youtube/i.test(error.message))console.error('Page script warning:',error.message)});
 try{
  const pages=['learn.html','academy.html','audio.html','leaderboard.html'];
  let reference=null;
  for(const target of pages){
    await page.goto(origin+'/'+target,{waitUntil:'domcontentloaded'});
    await page.locator('#sidebar .brand').waitFor();
    await page.locator('.pv-header-trail .pv-header-name').waitFor();
    const links=await page.locator('#sidebar a.nav-item').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
    if(reference)assert.deepEqual(links,reference,'Sidebar link order changed: '+target);else reference=links;
    assert.ok(links.includes('./#library'),'Video catalog must remain accessible');
    assert.ok(links.includes('academy.html'),'Academy must remain accessible');
    assert.ok(links.includes('learn.html#texts'),'Texts must remain accessible');
    assert.equal(await page.locator('.pv-header-trail .pv-header-name').innerText(),'Польский вслух');
    assert.equal(await page.locator('#shared-playlists').count(),1);
    assert.equal(await page.locator('.pv-header-trail .pv-header-section').count(),1);
    const selected=await page.locator('#sidebar a.nav-item.active').count();
    assert.equal(selected,1,'Exactly one active link: '+target);
    const selector=target==='academy.html'?'a[href="academy.html"]':target==='audio.html'?'a[href="audio.html"]':target==='leaderboard.html'?'a[href="leaderboard.html"]':'a[href="learn.html"]';
    assert.equal(await page.locator('#sidebar '+selector).getAttribute('aria-current'),'page');
  }
  // Collapsing is remembered when navigating from one section to another.
  await page.goto(origin+'/academy.html',{waitUntil:'domcontentloaded'});
  await page.locator('#sidebar .pv-sidebar-close').click();
  assert.ok(await page.locator('body').evaluate(node=>node.classList.contains('pv-sidebar-hidden')),'Academy sidebar collapses');
  await page.goto(origin+'/learn.html',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('body').evaluate(node=>node.classList.contains('pv-sidebar-hidden')),'Collapse state persists across sections');
  await page.locator('body .pv-sidebar-reopen').click();
  assert.ok(!await page.locator('body').evaluate(node=>node.classList.contains('pv-sidebar-hidden')),'Sidebar reopens');
  // On mobile, academy uses the same drawer and all links remain functional.
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/academy.html',{waitUntil:'domcontentloaded'});
  const toggle=page.locator('#academy-menu');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#sidebar').evaluate(node=>node.classList.contains('shared-open')),true);
  await page.locator('#sidebar a[href="learn.html#texts"]').click();
  await page.waitForURL(/learn\.html#texts/,{timeout:15000});
  assert.equal(await page.locator('.pv-header-trail .pv-header-section').innerText(),'Мои тексты');
  console.log('PASS: 4 canonical sidebars, active links, branded headers, collapse persistence, mobile drawer and cross-section navigation');
 }finally{await page.close();await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
