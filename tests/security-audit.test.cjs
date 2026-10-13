'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['index.html','learn.html','academy.html','audio.html','leaderboard.html'];
test('no main page displays a misleading VK-like login or asks for password',()=>{
  for(const page of pages){
    const html=read(page);
    assert.doesNotMatch(html,/<input\b[^>]*type\s*=\s*["']password["']/i,page);
    assert.doesNotMatch(html,/<button[^>]*data-open-login[^>]*>[^<]*(?:Войти|Авторизоваться через VK)/i,page);
    assert.match(html,/Локальный профиль/,page);
  }
});
test('PDF.js is configured with the mitigation for CVE-2024-4367',()=>{
  const code=read('presentation-import.js');
  assert.match(code,/getDocument\(\{\s*data:\s*await file\.arrayBuffer\(\),\s*isEvalSupported:\s*false\s*\}\)/);
  assert.match(code,/doc\.numPages\s*>\s*500/);
  assert.match(code,/extracted\s*>\s*250000/);
  assert.match(code,/files\.length\s*>\s*500/);
  assert.match(code,/totalXml\s*>\s*32000000/);
});
test('YouTube thumbnail URL is derived from validated video ID',()=>{
  const code=read('audio-youtube-catalog.js');
  assert.match(code,/\.filter\(v=>\/\^\[\\w-\]\{11\}\$\/\.test\(v\.id\)\)/);
  assert.match(code,/i\.ytimg\.com\/vi\/'\+encodeURIComponent\(v\.id\)/);
  assert.doesNotMatch(code,/v\.thumbnail\s*\|\|/);
});
test('visitor safety explanation is linked and does not claim certification',()=>{
  assert.match(read('index.html'),/href="security\.html"/);
  const html=read('security.html');
  assert.match(html,/GitHub Pages/);
  assert.match(html,/пароль VK/);
  assert.match(html,/не является независимым сертификатом безопасности/);
});
test('GitHub workflow does not embed a hardcoded YouTube API credential',()=>{
  const yml=read('.github/workflows/sync-youtube.yml');
  assert.match(yml,/secrets\.YOUTUBE_API_KEY/);
  assert.doesNotMatch(read('scripts/sync_youtube.py'),/AIza[0-9A-Za-z_-]{35}/);
});

const cspPages=['index.html','academy.html','learn.html','audio.html','leaderboard.html'];
test('every main page has a restrictive CSP without inline scripts or eval',()=>{
  for(const page of cspPages){
    const html=read(page);
    const match=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(match,'Missing CSP: '+page);
    assert.match(match[1],/object-src 'none'/);
    assert.match(match[1],/base-uri 'self'/);
    assert.match(match[1],/script-src 'self'/);
    assert.doesNotMatch(match[1],/script-src[^;]*'unsafe-inline'/);
    assert.doesNotMatch(match[1],/script-src[^;]*'unsafe-eval'/);
  }
});
test('ZIP dependency is bundled; PDF dependency is patched and matched to worker',()=>{
  const html=read('learn.html');
  assert.match(html,/src="vendor\/jszip-3\.10\.1\.min\.js"/);
  assert.doesNotMatch(html,/src="https:\/\/cdn\.jsdelivr\.net\/npm\/jszip/);
  assert.doesNotMatch(html,/pdf\.js\/3\.11\.174/);
  const pdf=read('presentation-import.js');
  assert.match(pdf,/pdf\.js\/4\.2\.67\/pdf\.min\.mjs/);
  assert.match(pdf,/pdf\.js\/4\.2\.67\/pdf\.worker\.min\.mjs/);
  assert.doesNotMatch(pdf,/pdf\.js\/3\.11\.174/);
  assert.ok(read('vendor/jszip-3.10.1.min.js').length>90000);
});
test('donation hosts are matched as full domains, not a substring',()=>{
  const code=read('academy.js');
  assert.match(code,/const host=u\.hostname\.toLowerCase\(\)/);
  assert.match(code,/trusted\.some\(d=>host===d\|\|host\.endsWith\('\.'\+d\)\)/);
  assert.doesNotMatch(code,/filter\(u=>\/boosty/);
});
test('catalog thumbnails are derived from canonical YouTube video IDs',()=>{
  assert.doesNotMatch(read('site.js'),/const img=x\.thumbnail\|\|/);
  assert.doesNotMatch(read('academy.js'),/v\.thumbnail\|\|/);
  assert.doesNotMatch(read('cabinet-favorites.js'),/img\.src=v\.thumbnail\|\|/);
});
test('workflow token permissions and action references are pinned',()=>{
  for(const path of ['test-lesson-resolver','test-learning-workspace','test-header-theme','test-site-navigation','security-audit']){
    const yml=read('.github/workflows/'+path+'.yml');
    assert.match(yml,/permissions:\s*\n\s*contents: read/);
    assert.doesNotMatch(yml,/uses: actions\/(?:checkout|setup-node|setup-python)@v\d/);
  }
  for(const path of ['sync-youtube','sync-phrases']){
    const yml=read('.github/workflows/'+path+'.yml');
    assert.match(yml,/permissions:\s*\n\s*contents: read/);
    assert.match(yml,/\n\s*permissions:\s*\n\s*contents: write/);
    assert.doesNotMatch(yml,/uses: actions\/(?:checkout|setup-node|setup-python)@v\d/);
  }
});

test('legacy ONAS is opened through an opaque-origin iframe with noopener',()=>{
  const launcher=read('onas-easter-egg.js');
  const sandbox=read('onas-isolated.html');
  assert.match(launcher,/new URL\('onas-isolated\.html'/);
  assert.match(launcher,/link\.rel='noopener noreferrer'/);
  assert.match(sandbox,/sandbox="allow-scripts/);
  assert.doesNotMatch(sandbox,/allow-same-origin/);
});
