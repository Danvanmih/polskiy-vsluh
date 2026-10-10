(()=>{'use strict';
 const aside=document.querySelector('#sidebar');
 const button=document.querySelector('#mobile-menu,.shared-menu-toggle,#academy-menu');
 if(!aside||!button)return;
 const mobile=matchMedia('(max-width:920px)');
 const scrim=document.createElement('div');scrim.className='pv-mobile-backdrop';scrim.hidden=true;document.body.append(scrim);
 function isOpen(){return aside.classList.contains('open')||aside.classList.contains('shared-open')}
 function sync(){const open=mobile.matches&&isOpen();scrim.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')}
 function close(){aside.classList.remove('open','shared-open');sync()}
 button.addEventListener('click',()=>requestAnimationFrame(sync));
 scrim.addEventListener('click',close);
 aside.addEventListener('click',e=>{if(e.target.closest('a:not([data-menu-toggle]),button[data-view],button[data-open-global-settings],button[data-open-login]'))requestAnimationFrame(close)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile.matches&&isOpen())close()});
 document.addEventListener('click',e=>{if(mobile.matches&&isOpen()&&!e.target.closest('#sidebar,#mobile-menu,.shared-menu-toggle,#academy-menu,.pv-mobile-backdrop'))close()});
 mobile.addEventListener?.('change',close);
 sync();
})();