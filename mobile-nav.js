(()=>{'use strict';
 const aside=document.querySelector('#sidebar');
 const button=document.querySelector('#mobile-menu,.shared-menu-toggle,#academy-menu');
 if(!aside||!button)return;
 const mobile=matchMedia('(max-width:920px)');
 const scrim=document.createElement('div');scrim.className='pv-mobile-backdrop';scrim.hidden=true;document.body.append(scrim);
 function isOpen(){return aside.classList.contains('open')||aside.classList.contains('shared-open')}
 function sync(){const open=mobile.matches&&isOpen();scrim.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');if(open&&!history.state?.pvMobileDrawer)history.pushState({...history.state,pvMobileDrawer:true},'',location.href);else if(!open&&history.state?.pvMobileDrawer)history.back()}
 function close(){aside.classList.remove('open','shared-open');sync()}
 button.addEventListener('click',()=>requestAnimationFrame(sync));
 scrim.addEventListener('click',close);
 // Touch gestures: edge swipe right opens, swipe left from drawer closes.
 let start=null;
 document.addEventListener('touchstart',e=>{
   if(!mobile.matches||e.touches.length!==1)return;
   const touch=e.touches[0],open=isOpen();
   if(!open&&touch.clientX>35)return;
   if(open&&!e.target.closest('#sidebar,.pv-mobile-backdrop'))return;
   start={x:touch.clientX,y:touch.clientY,open};
 },{passive:true});
 document.addEventListener('touchend',e=>{
   if(!start||!mobile.matches){start=null;return}
   const gesture=start;start=null;
   const touch=e.changedTouches[0];if(!touch)return;
   const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
   if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.4)return;
   if(!gesture.open&&dx>0){aside.classList.add(document.body.querySelector('.shell')?'open':'shared-open');sync()}
   else if(gesture.open&&dx<0)close();
 },{passive:true});
 document.addEventListener('touchcancel',()=>{start=null},{passive:true});
 aside.addEventListener('click',e=>{if(e.target.closest('a:not([data-menu-toggle]),button[data-view],button[data-open-global-settings],button[data-open-login]'))requestAnimationFrame(close)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile.matches&&isOpen())close()});
 document.addEventListener('click',e=>{if(mobile.matches&&isOpen()&&!e.target.closest('#sidebar,#mobile-menu,.shared-menu-toggle,#academy-menu,.pv-mobile-backdrop'))close()});
 mobile.addEventListener?.('change',close);window.addEventListener('popstate',()=>{if(isOpen()){aside.classList.remove('open','shared-open');scrim.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Открыть меню')}});
 sync();
})();