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
