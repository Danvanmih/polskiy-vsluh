(()=>{
'use strict';
const header=document.querySelector('.topbar,.academy-top,.lab-top,.aud-header');
if(!header||header.querySelector('.pv-header-brand'))return;
const home=Boolean(document.querySelector('.topbar'));
const a=document.createElement('a');
a.href='./';a.className='pv-header-brand';a.setAttribute('aria-label','Польский вслух — главная');
const icon=document.createElement('span');
icon.className='pv-header-logo';icon.setAttribute('aria-hidden','true');icon.textContent='P·';
const name=document.createElement('span');
name.className='pv-header-name';name.textContent='Польский вслух';
a.append(icon,name);
if(!home){
  document.body.classList.add('pv-internal-page');
  const separator=document.createElement('span');
  separator.className='pv-header-separator';separator.textContent='›';separator.setAttribute('aria-hidden','true');
  const current=document.createElement('span');current.className='pv-header-section';current.setAttribute('aria-current','page');
  const currentSection=()=>{
    const path=location.pathname;
    if(path.endsWith('learn.html')){
      const names={texts:'Мои тексты',analytics:'Моя аналитика',plan:'Учебный план'};
      return names[location.hash.replace('#','')]||'Мои тренажёры';
    }
    if(path.endsWith('academy.html'))return 'Учебная программа';
    if(path.endsWith('audio.html'))return 'Аудиотека';
    if(path.endsWith('leaderboard.html'))return 'Таблица лидеров';
    return document.title.split(/[·—]/)[0].trim();
  };
  const update=()=>{current.textContent=currentSection()};
  update();window.addEventListener('hashchange',update);
  a.after(); // noop: kept entirely inside one nav after render
  const trail=document.createElement('nav');
  trail.className='pv-header-trail';trail.setAttribute('aria-label','Путь к текущему разделу');
  trail.append(a,separator,current);
  const trigger=header.querySelector('.mobile-menu,.academy-menu,.shared-menu-toggle');
  if(trigger)trigger.after(trail);else header.prepend(trail);
}else{
  const trigger=header.querySelector('.mobile-menu,.academy-menu,.shared-menu-toggle');
  if(trigger)trigger.after(a);else header.prepend(a);
}
})();