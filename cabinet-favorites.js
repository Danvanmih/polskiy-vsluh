(()=>{
'use strict';
const mount=document.getElementById('pv-favorite-results');
if(!mount)return;
const search=document.getElementById('pv-favorite-search');
const count=document.getElementById('pv-favorite-count');
let videos=[];
let loaded=false;
const storageKey='pv-saved';
function savedIds(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return new Set(Array.isArray(value)?value:[])}catch{return new Set()}}
function render(){
  if(!loaded){mount.textContent='Загружаем видео…';return}
  const q=(search.value||'').trim().toLocaleLowerCase('ru-RU');
  const saved=savedIds();
  const items=videos.filter(v=>saved.has(v.id)&&v.title.toLocaleLowerCase('ru-RU').includes(q));
  const total=videos.filter(v=>saved.has(v.id)).length;
  count.textContent=total+' '+(total===1?'видео':'видео');
  mount.replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='pv-favorite-empty';empty.textContent=total?'Не нашли видео по запросу. Попробуй изменить поиск.':'Пока нет избранных видео. Чтобы добавить урок, нажми ♡ на карточке в видеобиблиотеке.';mount.append(empty);return}
  for(const v of items){
    const card=document.createElement('article');card.className='pv-favorite-card';
    const img=document.createElement('img');img.loading='lazy';img.alt='';img.src='https://i.ytimg.com/vi/'+encodeURIComponent(v.id)+'/mqdefault.jpg';
    const body=document.createElement('div');body.className='pv-favorite-body';
    const title=document.createElement('h3');title.textContent=v.title;
    const buttons=document.createElement('div');buttons.className='pv-favorite-actions';
    const open=document.createElement('a');open.href='academy.html?video='+encodeURIComponent(v.id);open.textContent='Открыть урок';
    const remove=document.createElement('button');remove.type='button';remove.className='pv-favorite-remove';remove.textContent='Убрать из избранного';
    remove.setAttribute('aria-label','Убрать из избранного: '+v.title);
    remove.onclick=()=>{const current=savedIds();current.delete(v.id);try{localStorage.setItem(storageKey,JSON.stringify([...current]));render()}catch{window.PVNotice?.show('Не удалось обновить избранное. Проверьте хранилище браузера.')}};
    buttons.append(open,remove);body.append(title,buttons);card.append(img,body);mount.append(card)
  }
}
fetch('data/videos.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Каталог недоступен');return r.json()}).then(d=>{videos=(d.videos||[]).filter(v=>v.id&&v.title);loaded=true;render()}).catch(()=>{loaded=true;mount.textContent='Не удалось загрузить видеобиблиотеку. Обновите страницу.'});
search.addEventListener('input',render);
window.addEventListener('hashchange',()=>{if(location.hash==='#saved')render()});
window.addEventListener('storage',e=>{if(e.key===storageKey)render()});
})();
