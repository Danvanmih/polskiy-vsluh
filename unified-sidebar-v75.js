/* Shared sidebar v75: a single navigation structure across the site. */
(()=>{
'use strict';
const sidebar=document.getElementById('sidebar');
if(!sidebar)return;
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const home=page==='index.html';
const oldFooter=sidebar.querySelector('.side-bottom')?.outerHTML||'';
const oldLogin=sidebar.querySelector('.login-trigger')?.outerHTML||'<button type="button" class="nav-item login-trigger" data-open-login><span>♙</span> Войти <span class="menu-chevron">↗</span></button>';
const expanded={};
for(const name of ['playlists','more']){
  const node=sidebar.querySelector('[data-menu-panel="'+name+'"]');
  expanded[name]=node?!node.hidden:false;
}
const navHome=home?
  '<button type="button" class="nav-item" data-view="all"><span>◫</span> Обзор</button><button type="button" class="nav-item" data-view="latest"><span>◷</span> Новые видео</button>':
  '<a class="nav-item" href="./"><span>◫</span> Обзор</a><a class="nav-item" href="./?view=latest"><span>◷</span> Новые видео</a>';
sidebar.classList.add('pv-unified-sidebar');
sidebar.innerHTML=`
<a class="brand" href="./"><span class="brand-icon">P<span>·</span></span><span>polski<span class="brand-accent">w</span>słuch<small>ПОЛЬСКИЙ ВСЛУХ</small></span></a>
<div class="side-caption">НАВИГАЦИЯ</div>
<nav class="nav" aria-label="Главное меню">${navHome}</nav>
<nav class="nav playlist-area" aria-label="Плейлисты">
<button type="button" class="nav-item nav-expand" data-menu-toggle="playlists" aria-expanded="false"><span>▤</span> Плейлисты <span class="menu-chevron">⌄</span></button>
<div class="compact-subnav" data-menu-panel="playlists" hidden><div id="${home?'playlist-nav':'shared-playlists'}"><span class="side-loading">Загрузка плейлистов…</span></div></div>
</nav>
<div class="side-caption side-caption-extra">РАЗДЕЛЫ</div>
<nav class="nav compact-sections">
<a class="nav-item" href="academy.html"><span>▣</span> Учебная программа</a>
<a class="nav-item" href="learn.html"><span>✦</span> Тренажёры</a>
<a class="nav-item" href="learn.html#texts"><span>▤</span> Тексты уроков</a>
<a class="nav-item" href="audio.html"><span>♫</span> Аудиотека</a>
<button type="button" class="nav-item nav-expand" data-menu-toggle="more" aria-expanded="false"><span>▦</span> Мой учебный кабинет <span class="menu-chevron">⌄</span></button>
<div class="compact-subnav" data-menu-panel="more" hidden>
<a class="nav-item" data-active-page="analytics" href="learn.html#analytics">▥ Моя аналитика</a>
<a class="nav-item" data-active-page="plan" href="learn.html#plan">◷ Учебный план и режим</a>
<a class="nav-item" data-active-page="saved" href="learn.html#saved">♡ Избранное</a>
</div></nav>
<nav class="nav leaderboard-nav"><a class="nav-item" href="leaderboard.html"><span>🏆</span> Таблица лидеров</a></nav>
<div class="sidebar-tools"><button type="button" class="nav-item" data-open-global-settings><span>⚙</span> Настройки</button>${oldLogin}</div>
${oldFooter}
`;
function active(){
 const hash=location.hash;
 const params=new URLSearchParams(location.search);
 let target=page==='academy.html'?'academy.html':page==='audio.html'?'audio.html':page==='leaderboard.html'?'leaderboard.html':null;
 if(page==='learn.html')target=['#texts','#analytics','#plan','#saved'].includes(hash)?'learn.html'+hash:'learn.html';
 const sub=['learn.html#analytics','learn.html#plan','learn.html#saved'].includes(target);
 for(const item of sidebar.querySelectorAll('a.nav-item,button[data-view]')){
  const isHomeOverview=home&&item.dataset.view==='all'&&params.get('view')!=='latest'&&!params.has('playlist');
  const isHomeLatest=home&&item.dataset.view==='latest'&&params.get('view')==='latest';
  const selected=item.getAttribute('href')===target||isHomeOverview||isHomeLatest;
  item.classList.toggle('active',selected);
  if(selected)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
 }
 if(sub){
  const panel=sidebar.querySelector('[data-menu-panel="more"]');
  panel.hidden=false;
  sidebar.querySelector('[data-menu-toggle="more"]').setAttribute('aria-expanded','true');
 }
}
for(const name of ['playlists','more']){
 const panel=sidebar.querySelector('[data-menu-panel="'+name+'"]');
 panel.hidden=!expanded[name];
 sidebar.querySelector('[data-menu-toggle="'+name+'"]').setAttribute('aria-expanded',String(expanded[name]));
}
active();
window.addEventListener('hashchange',active);
window.addEventListener('popstate',active);
})();
