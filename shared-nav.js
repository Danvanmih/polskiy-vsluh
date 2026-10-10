(()=>{'use strict';const menu=document.querySelector('#sidebar'),button=document.querySelector('.shared-menu-toggle'),list=document.querySelector('#shared-playlists');if(!menu)return;function updateActive(){
  const file=(location.pathname.split('/').pop()||'index.html');
  const hash=location.hash;
  let selected=null;
  if(file==='academy.html')selected='academy.html';
  else if(file==='audio.html')selected='audio.html';
  else if(file==='leaderboard.html')selected='leaderboard.html';
  else if(file==='learn.html')selected=hash==='#texts'?'learn.html#texts':hash==='#analytics'?'learn.html#analytics':hash==='#plan'?'learn.html#plan':'learn.html';
  else selected=hash==='#library'?'./#library':'./';
  menu.querySelectorAll('a.nav-item').forEach(link=>{
    const href=link.getAttribute('href');
    const on=href===selected;
    link.classList.toggle('active',on);
    if(on)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const expandable=selected==='learn.html#analytics'||selected==='learn.html#plan';
  if(expandable){
    const panel=menu.querySelector('[data-menu-panel="more"]');
    const toggle=menu.querySelector('[data-menu-toggle="more"]');
    if(panel&&toggle){panel.hidden=false;toggle.setAttribute('aria-expanded','true')}
  }
}
updateActive();window.addEventListener('hashchange',updateActive);button?.addEventListener('click',()=>{const on=menu.classList.toggle('shared-open');button.setAttribute('aria-expanded',String(on))});menu.addEventListener('click',e=>{if(e.target.closest('a'))menu.classList.remove('shared-open')});fetch('data/videos.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('missing');return r.json()}).then(d=>{const count=new Map();for(const v of d.videos||[])for(const id of v.playlistIds||[])count.set(id,(count.get(id)||0)+1);const playlists=(d.playlists||[]).filter(p=>count.get(p.id));list.replaceChildren();for(const p of playlists){const a=document.createElement('a');a.className='nav-item';a.href='./?playlist='+encodeURIComponent(p.id)+'#library';const name=document.createElement('span');name.textContent='▤ ';const title=document.createElement('span');title.textContent=p.title;title.style.flex='1';const n=document.createElement('small');n.textContent=count.get(p.id);a.append(name,title,n);list.append(a)}if(!playlists.length)list.textContent='Плейлисты пока не доступны'}).catch(()=>{list.textContent='Видео доступны в каталоге'})})();