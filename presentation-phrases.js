(function(root){
'use strict';
/* Parse user-supplied slide text locally. No server, translations or content generation. */
const CYRILLIC=/\p{Script=Cyrillic}/u, LATIN=/\p{Script=Latin}/u;
const clean=value=>String(value||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim();
function mixed(block){
 const text=clean(block);
 const words=[...text.matchAll(/[\p{L}]+(?:[-’'][\p{L}]+)*/gu)].map(m=>({
   word:m[0],start:m.index,end:m.index+m[0].length,
   lang:CYRILLIC.test(m[0])?'ru':LATIN.test(m[0])?'pl':'other'
 }));
 const russian=words.filter(w=>w.lang==='ru'),polish=words.filter(w=>w.lang==='pl');
 if(russian.length<2||polish.length<2)return null;
 const first=words.find(w=>w.lang!=='other'),last=[...words].reverse().find(w=>w.lang!=='other');
 if(!first||!last||first.lang===last.lang)return null;
 const left=first.lang,right=last.lang;
 // Split after the final token of the first language, not at sentence punctuation:
 // slides often contain «русская фраза.Polska fraza» with no space at all.
 const lastLeft=words.filter(w=>w.lang===left).slice(-1)[0];
 const firstRight=words.find(w=>w.lang===right&&w.start>=lastLeft.end);
 if(!firstRight)return null;
 const leftText=clean(text.slice(0,firstRight.start)),rightText=clean(text.slice(firstRight.start));
 const count=(input,lang)=>[...input.matchAll(/\p{L}+/gu)].filter(m=>(lang==='ru'?CYRILLIC:LATIN).test(m[0])).length;
 if(count(leftText,left)<2||count(rightText,right)<2)return null;
 const ru=left==='ru'?leftText:rightText,pl=left==='pl'?leftText:rightText;
 if(!ru||!pl||ru.length>1500||pl.length>1500)return null;
 return {ru,pl,source:'user-presentation'};
}
function parse(slides){
 const result=[],seen=new Set();
 for(const slide of Array.isArray(slides)?slides:[]){
   const pair=mixed(slide);
   if(!pair)continue;
   const key=pair.pl.toLocaleLowerCase('pl-PL').replace(/[^\p{L}\p{N}]/gu,'');
   if(!key||seen.has(key))continue;
   seen.add(key);result.push(pair);
 }
 return result;
}
function fromText(text){return parse(String(text||'').split(/\n\s*\n/))}
root.PVPresentationPhrases=Object.freeze({parse,mixed,fromText,clean});
})(typeof window==='undefined'?globalThis:window);
