/* Shared presentation -> video resolver.
   Works offline against the YouTube catalog. No file is uploaded. */
(function(root){
'use strict';
const extension=/\.(?:pptx|ppt|pdf|txt)$/i;
const stripExtension=name=>String(name||'').trim().replace(extension,'').trim();
function normalize(text){
  return String(text||'').toLocaleLowerCase('ru-RU')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()
    .replace(/(?:^|\s)а([0123])(?=\s|$)/g,' a$1')
    .replace(/(?:^|\s)в([0123])(?=\s|$)/g,' b$1')
    .replace(/(?:^|\s)с([0123])(?=\s|$)/g,' c$1').trim();
}
function identity(text){
  const key=normalize(stripExtension(text));
  const lv=key.match(/(?:^|\s)([abc])([0123])(?=\s|$)/);
  const no=key.match(/(?:^|\s)(?:урок|уроки|lekcja|lekcje|lesson)\s*(\d+)(?=\s|$)/);
  const variant=/облегчен|упрощен|easy|latw|uproszcz/.test(key)?'easy':
    /доскональн|отработк|зубреж|повторени|drill/.test(key)?'practice':'standard';
  const family=/новы[ий]\s+курс/.test(key)?'new':
    /польски[ий]\s+язык\s+курс/.test(key)?'polish-course':
    /польски[ий]\s+язык\s+уровень/.test(key)?'polish-level':
    /житейск/.test(key)?'stories':
    /зубреж/.test(key)?'repetition':'';
  return {key,level:lv?lv[1]+lv[2]:'',number:no?Number(no[1]):null,variant,family};
}
function conflicts(a,b){
  return Boolean(a.number!==null&&b.number!==null&&a.number!==b.number
    ||a.level&&b.level&&a.level!==b.level
    ||a.variant!==b.variant&&(a.variant!=='standard'||b.variant!=='standard')
    ||a.family&&b.family&&a.family!==b.family);
}
function compatible(a,b){
  if(!a.key||!b.key||conflicts(a,b))return false;
  if(a.number===null||b.number===null||a.number!==b.number)return false;
  if(a.level&&b.level&&a.level!==b.level)return false;
  if(a.family&&b.family&&a.family!==b.family)return false;
  return a.variant===b.variant;
}
function rank(key,title){
  const a=normalize(key).split(' ').filter(Boolean),b=normalize(title).split(' ').filter(Boolean);
  if(!a.length||!b.length)return 0;
  const bs=new Set(b),as=new Set(a);
  const common=a.filter(w=>bs.has(w)).length;
  const recall=common/a.length,precision=[...bs].filter(w=>as.has(w)).length/bs.size;
  return 0.65*recall+0.35*precision;
}
function search(name,videos,limit=30){
  const needle=normalize(stripExtension(name)),tokens=needle.split(' ').filter(Boolean);
  if(!needle)return [];
  return (videos||[]).filter(v=>v&&v.id&&v.title).map(v=>{
    const title=normalize(v.title);
    const score=needle===title?2:tokens.every(t=>title.includes(t))?1.5+rank(needle,title)/10:rank(needle,title);
    return {video:v,score};
  }).filter(x=>x.score>=0.32)
    .sort((a,b)=>b.score-a.score||a.video.title.localeCompare(b.video.title,'ru'))
    .slice(0,limit).map(x=>x.video);
}
function resolve(filename,videos,contextId){
  const source=identity(filename),all=(videos||[]).filter(v=>v&&v.id&&v.title);
  const exact=all.filter(v=>identity(v.title).key===source.key);
  const context=all.find(v=>v.id===contextId);
  const match=exact.length===1?exact[0]:null;
  const relevant=all.filter(v=>compatible(source,identity(v.title)));
  const preferred=match||(relevant.length===1?relevant[0]:null);
  const choices=search(filename,all,30);
  if(context){
    const actual=identity(context.title);
    if(conflicts(source,actual)){
      return {status:'mismatch',video:null,suggested:preferred,candidates:choices,context};
    }
    // The source video ID is authoritative when the filename does not contradict it.
    return {status:'matched',video:context,suggested:null,candidates:choices,context};
  }
  if(preferred)return {status:'matched',video:preferred,suggested:null,candidates:choices,context:null};
  return {status:'ambiguous',video:null,suggested:null,candidates:choices,context:null};
}
root.PVLessonMatcher={stripExtension,normalize,identity,conflicts,compatible,rank,search,resolve};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PVLessonMatcher;
})(typeof window!=='undefined'?window:globalThis);
