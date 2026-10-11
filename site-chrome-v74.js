(()=>{
'use strict';
const internal=document.querySelector('.lab-layout,.academy-shell,.shared-layout,.pv-leaderboard-layout');
const home=document.querySelector('body>.shell');
const body=document.body;
const header=document.querySelector('.lab-top,.academy-top,.aud-header,.topbar,.pv-leaderboard-header');
if(header){
  body.classList.add('pv-chrome-74');
  if(home)body.classList.add('pv-chrome-home');
  else if(internal)body.classList.add('pv-chrome-inside');
  const siteLink=header.querySelector('.pv-header-brand');
  if(siteLink)siteLink.title='Польский вслух — на главную';
}
// Export/Import are data tools for the learning cabinet, not primary global navigation.
const exportButton=document.getElementById('export');
const importLabel=document.querySelector('.lab-top .lab-upload');
const analytics=document.getElementById('analytics');
if(exportButton&&importLabel&&analytics){
  const panel=analytics.querySelector('.lab-panel');
  if(panel){
    const toolbar=document.createElement('div');toolbar.className='pv-cabinet-tools';
    const h=document.createElement('h3');h.textContent='Резервная копия прогресса';
    const p=document.createElement('p');p.textContent='Экспортируй данные обучения или восстанови их из ранее сохранённого файла.';
    const actions=document.createElement('div');actions.className='pv-cabinet-tool-actions';
    actions.append(exportButton,importLabel);toolbar.append(h,p,actions);panel.append(toolbar);
  }
}
// Normal hash navigation should not let the browser focus and scroll into a section
// that will immediately become the only visible panel. Reset the actual scroll roots.
const sections=new Set(['practice','texts','analytics','plan','saved']);
function resetScroll(){
  const section=location.hash.slice(1);
  if(!sections.has(section))return;
  const root=[window,document.documentElement,document.body,
    document.querySelector('.lab-main'),
    document.querySelector('.lab-body'),
    document.querySelector('.shared-content'),
    document.querySelector('.content')];
  for(const node of root){if(!node)continue;try{node.scrollTo({top:0,left:0,behavior:'instant'})}catch{if('scrollTop' in node)node.scrollTop=0}}
}
if(document.querySelector('.lab-layout')){
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const schedule=()=>{resetScroll();requestAnimationFrame(()=>{resetScroll();requestAnimationFrame(resetScroll)})};
  window.addEventListener('hashchange',schedule);
  window.addEventListener('popstate',schedule);
  window.addEventListener('pageshow',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
}
})();
