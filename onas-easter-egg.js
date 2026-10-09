(()=>{'use strict';
const GAME=new URL('ONAS/One%20night%20at%20scrath%200.6.html',new URL('.',document.currentScript?.src||location.href)).href;
const HOLD_MS=15000;
let sequence='',lastKeyAt=0,holding=false,holdTimer=0,startY=0,lastY=0,dialog=null,restoreFocus=null;
const settingsOpen=()=>{const o=document.querySelector('.global-overlay');return !!o&&!o.hidden&&document.getElementById('global-title')?.textContent==='Настройки сайта'};
const coarse=()=>matchMedia('(pointer:coarse)').matches;
function cancelHold(){clearTimeout(holdTimer);holdTimer=0;holding=false;document.querySelector('.pv-onas-indicator')?.classList.remove('active')}
function closeDialog(){if(!dialog)return;dialog.remove();dialog=null;restoreFocus?.focus?.();restoreFocus=null}
function launch(){closeDialog();const tab=window.open(GAME,'_blank','noopener,noreferrer');if(!tab){location.assign(GAME)}}
function promptGame(){cancelHold();if(dialog)return;restoreFocus=document.activeElement;dialog=document.createElement('div');dialog.className='pv-onas-confirm';dialog.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="pv-onas-title"><h2 id="pv-onas-title">Открыть ONAS?</h2><p>Секретная игра найдена. Запустить One Night at Scratch 0.6?</p><div><button type="button" data-onas="yes">Да</button><button type="button" data-onas="no">Нет</button></div></section>';document.body.append(dialog);dialog.addEventListener('click',e=>{const b=e.target.closest('[data-onas]');if(b?.dataset.onas==='yes')launch();else if(b||e.target===dialog)closeDialog()});dialog.querySelector('[data-onas="no"]').focus()}
document.addEventListener('keydown',e=>{if(dialog){if(e.key==='Escape'){e.preventDefault();closeDialog()}return}if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||!matchMedia('(pointer:fine)').matches)return;const target=e.target;if(target?.closest?.('input,textarea,select,[contenteditable="true"]')){sequence='';return}const now=Date.now();if(now-lastKeyAt>2500)sequence='';lastKeyAt=now;if(!/^[A-Z]$/.test(e.key)){sequence='';return}sequence=(sequence+e.key).slice(-4);if(sequence==='ONAS'){sequence='';promptGame()}});
function bind(){const modal=document.querySelector('.global-modal');if(!modal||modal.dataset.onasBound)return;modal.dataset.onasBound='1';const marker=document.createElement('div');marker.className='pv-onas-indicator';marker.setAttribute('aria-live','polite');marker.textContent='Секрет найден · удерживай 15 секунд';modal.append(marker);
const atBottom=()=>modal.scrollHeight-modal.scrollTop-modal.clientHeight<=10;
modal.addEventListener('touchstart',e=>{cancelHold();if(!coarse()||!settingsOpen()||e.touches.length!==1)return;startY=lastY=e.touches[0].clientY},{passive:true});
modal.addEventListener('touchmove',e=>{if(!coarse()||!settingsOpen()||e.touches.length!==1){cancelHold();return}lastY=e.touches[0].clientY;const pull=startY-lastY;if(!holding&&atBottom()&&pull>=45){holding=true;marker.classList.add('active');holdTimer=setTimeout(()=>{if(holding&&settingsOpen())promptGame()},HOLD_MS)}else if(holding&&(!atBottom()||pull<25))cancelHold()},{passive:true});
for(const event of ['touchend','touchcancel'])modal.addEventListener(event,cancelHold,{passive:true});
const obs=new MutationObserver(()=>{if(!settingsOpen())cancelHold()});obs.observe(document.querySelector('.global-overlay')||modal,{attributes:true,attributeFilter:['hidden']});
}
if(document.body){bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true})}else document.addEventListener('DOMContentLoaded',()=>{bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true})},{once:true});
})();