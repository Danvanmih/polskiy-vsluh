(()=>{
'use strict';
const $=id=>document.getElementById(id);
function notify(message,options={}){
  const id=options.target||'pv-feedback-toast';
  let node=$(id);
  if(!node){
    node=document.createElement('div');
    node.id=id;
    node.className='pv-feedback-toast';
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    document.body.append(node);
  }
  node.textContent=String(message||'');
  node.dataset.kind=options.kind||'error';
  node.hidden=false;
  clearTimeout(node.pvTimer);
  if(!options.persistent)node.pvTimer=setTimeout(()=>{node.hidden=true},4500);
  return node;
}
function ask(title,description){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='pv-workspace-overlay';
    const dialog=document.createElement('div');
    dialog.className='pv-workspace-dialog';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    const h=document.createElement('h2');
    h.textContent=title;
    const p=document.createElement('p');
    p.textContent=description;
    const actions=document.createElement('div');
    actions.className='pv-workspace-dialog-actions';
    for(const [label,choice] of [['Отмена',false],['Подтвердить',true]]){
      const b=document.createElement('button');
      b.type='button';b.textContent=label;
      b.className=choice?'lab-primary':'lab-secondary';
      b.onclick=()=>{overlay.remove();resolve(choice)};
      actions.append(b);
    }
    dialog.append(h,p,actions);overlay.append(dialog);document.body.append(overlay);
    actions.querySelector('button').focus();
  });
}
window.PVNotice={show:notify,confirm:ask};
const section=$('texts'),documentPane=$('pv-text-document');
if(!section||!documentPane)return;
const hasVideo=/^[\w-]{11}$/.test(new URLSearchParams(location.search).get('video')||'');
function storage(){try{return JSON.parse(localStorage.getItem('pv-presentation-docs-v1')||'{}')}catch{return{}}}
function setTextMode(mode){
  const full=mode!=='phrases';
  $('pv-text-full-panel').hidden=!full;
  $('pv-text-phrases-panel').hidden=full;
  $('pv-text-mode-full').classList.toggle('selected',full);
  $('pv-text-mode-phrases').classList.toggle('selected',!full);
  $('pv-text-mode-full').setAttribute('aria-pressed',String(full));
  $('pv-text-mode-phrases').setAttribute('aria-pressed',String(!full));
}
$('pv-text-mode-full').addEventListener('click',()=>setTextMode('full'));
$('pv-text-mode-phrases').addEventListener('click',()=>setTextMode('phrases'));
function updateVisibility(){
  const id=$('text-video')?.value;
  const doc=id?storage()[id]:null;
  const onTexts=location.hash==='#texts';
  documentPane.hidden=!(onTexts&&doc?.text);
  document.body.classList.toggle('pv-text-empty',onTexts&&!doc?.text);
  document.body.classList.toggle('pv-text-open',onTexts&&!!doc?.text);
  const practiceFocused=(location.hash===''||location.hash==='#practice')&&hasVideo;
  document.body.classList.toggle('pv-test-focused',practiceFocused);
  document.body.classList.toggle('pv-test-library',!practiceFocused&&(location.hash===''||location.hash==='#practice'));
  const panel=document.querySelector('#practice .practice-panel');
  if(panel)panel.hidden=!practiceFocused;
  if(doc?.text&&onTexts){
    $('pv-text-name').textContent=doc.title||'Текст урока';
  }
}
window.addEventListener('hashchange',updateVisibility);
window.addEventListener('pageshow',updateVisibility);
const select=$('text-video');
if(select){
  select.addEventListener('change',updateVisibility);
  new MutationObserver(updateVisibility).observe(select,{childList:true});
}
setTextMode('full');
updateVisibility();
})();
