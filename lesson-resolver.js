(function(root){
'use strict';
/* One resolution path for file upload, manual search and video deep links.
   Pure functions: no DOM, localStorage, network calls or mutations. */
function basename(name){return String(name||'').trim().replace(/\.(pptx|ppt|pdf|txt)$/i,'').trim()}
function normalize(name){
  let value=String(name||'').normalize('NFD').toLocaleLowerCase('ru-RU').replace(/[\u0300-\u036f]/g,'');
  value=value.replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  // CEFR levels are written with visually identical Cyrillic or Latin letters.
  return value.replace(/(^|\s)[аa]([012])(?=\s|$)/g,'$1a$2')
              .replace(/(^|\s)[вb]([12])(?=\s|$)/g,'$1b$2')
              .replace(/(^|\s)[сc]([12])(?=\s|$)/g,'$1c$2');
}
function identity(name){
  const text=normalize(basename(name));
  const level=text.match(/(?:^|\s)([abc][012])(?:\s|$)/)?.[1]||'';
  const number=text.match(/(?:урок|lekcja|lekcje|lesson)\s*(\d+)(?:\s|$)/)?.[1]||'';
  const variant=/облегчен|uproszcz|łatw|latw/.test(text)?'easy':/доскональн|отработк/.test(text)?'practice':'standard';
  const family=/новы[йи] курс/.test(text)?'new-course':
    /польски[йи] язык курс/.test(text)?'polish-course':
    /польски[йи] язык уровень/.test(text)?'polish-level':
    /зубреж|зубрежк/.test(text)?'repetition':'';
  return {text,level,number,variant,family};
}
function compatible(a,b){
  return Boolean(a.number && b.number && a.number===b.number &&
    (!a.level||!b.level||a.level===b.level) &&
    a.variant===b.variant && (!a.family||!b.family||a.family===b.family));
}
function similarity(a,b){
  const left=new Set(a.text.split(' ').filter(Boolean));
  const right=new Set(b.text.split(' ').filter(Boolean));
  if(!left.size||!right.size)return 0;
  const shared=[...left].filter(x=>right.has(x)).length;
  return shared / Math.max(left.size,right.size);
}
function resolve(name,videos,contextId){
  const original=basename(name),key=normalize(original),list=Array.isArray(videos)?videos.filter(v=>v&&v.id&&v.title):[];
  const fileInfo=identity(original);
  if(!key)return {status:'missing',reason:'empty-name',candidates:[]};
  // The same title the user types into the manual search must win first.
  const exact=list.filter(v=>normalize(v.title)===key);
  const candidates=exact.length?exact:list.filter(v=>compatible(fileInfo,identity(v.title)));
  const context=contextId&&list.find(v=>v.id===contextId);
  const currentInfo=context?identity(context.title):null;
  const clearConflict=Boolean(currentInfo&&
    (fileInfo.number&&currentInfo.number&&fileInfo.number!==currentInfo.number ||
     fileInfo.level&&currentInfo.level&&fileInfo.level!==currentInfo.level ||
     fileInfo.number&&currentInfo.number&&fileInfo.variant!==currentInfo.variant ||
     fileInfo.family&&currentInfo.family&&fileInfo.family!==currentInfo.family));
  if(context){
    if(clearConflict || exact.length===1&&exact[0].id!==context.id){
      return {status:'mismatch',video:null,suggested:candidates.length===1?candidates[0]:null,candidates,reason:'different-lesson'};
    }
    return {status:'matched',video:context,candidates:[context],reason:'video-context'};
  }
  if(exact.length===1)return {status:'matched',video:exact[0],candidates:exact,reason:'exact-title'};
  if(exact.length>1)return {status:'ambiguous',video:null,candidates:exact,reason:'duplicate-title'};
  if(candidates.length===1)return {status:'matched',video:candidates[0],candidates,reason:'unique-course'};
  if(candidates.length>1){
    const ordered=candidates.map(video=>({video,score:similarity(fileInfo,identity(video.title))})).sort((a,b)=>b.score-a.score);
    if(ordered[0].score>=.88&&ordered[0].score-(ordered[1]?.score||0)>=.18){
      return {status:'matched',video:ordered[0].video,candidates:[ordered[0].video],reason:'high-confidence-title'};
    }
    return {status:'ambiguous',video:null,candidates,reason:'multiple-lessons'};
  }
  return {status:'missing',video:null,candidates:[],reason:'not-in-catalog'};
}
root.PVLessonResolver=Object.freeze({basename,normalize,identity,resolve});
})(typeof window==='undefined'?globalThis:window);
