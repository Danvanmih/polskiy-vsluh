(()=>{'use strict';function fix(){
 const academy=document.querySelector('.academy-shell');if(!academy)return;
 const top=academy.querySelector('.academy-top');
 const side=academy.querySelector('.academy-sidebar');
 if(!top||!side)return;
 const brand=side.querySelector('.brand');if(brand)brand.setAttribute('aria-label','Польский вслух — на главную');
 // The single shared header script owns the trail, not the academy-specific breadcrumb.
 top.querySelector('.academy-top-breadcrumb')?.remove();
 const trail=top.querySelector('.pv-header-trail');
 if(!trail)return;
 trail.querySelector('.pv-header-brand')?.setAttribute('aria-label','Польский вслух — на главную');
 const current=trail.querySelector('.pv-header-section');if(current)current.textContent='Учебная программа';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
})();