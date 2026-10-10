(function(root){
'use strict';
/* Read-only local analysis of presentation text. No translation, uploads or OCR.
   Slides may be strings (legacy) or arrays of ordered PPTX paragraphs. */
const RU=/\p{Script=Cyrillic}/u, PL=/\p{Script=Latin}/u;
const clean=value=>String(value??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim();
const wordsOf=text=>[...String(text).matchAll(/\p{L}+(?:[-’']\p{L}+)*/gu)].map(m=>({word:m[0],start:m.index,end:m.index+m[0].length,lang:RU.test(m[0])?'ru':PL.test(m[0])?'pl':'other'}));
function language(text){
  const words=wordsOf(text),ru=words.filter(w=>w.lang==='ru').length,pl=words.filter(w=>w.lang==='pl').length;
  if(ru>=2&&pl<2)return 'ru';
  if(pl>=2&&ru<2)return 'pl';
  if(ru>=2&&pl>=2)return 'mixed';
  return null;
}
function valid(ru,pl){
  return wordsOf(ru).filter(w=>w.lang==='ru').length>=2&&wordsOf(pl).filter(w=>w.lang==='pl').length>=2&&ru.length<=2000&&pl.length<=2000;
}
function pair(ru,pl){
  ru=clean(ru);pl=clean(pl);
  return valid(ru,pl)?{ru,pl,source:'user-presentation'}:null;
}
/* Split Cyrillic/Latin text joined without whitespace: "Текст.Polski tekst."
   Require at least two words on EACH side so Polish proper names inside
   Russian prose won't be incorrectly identified as a language boundary. */
function splitMixed(raw){
  const text=clean(raw),tokens=wordsOf(text).filter(w=>w.lang!=='other');
  if(tokens.length<4)return [];
  const splits=[];
  for(let i=2;i<=tokens.length-2;i++){
    const before=tokens.slice(0,i),after=tokens.slice(i);
    const a=before[before.length-1],b=after[0];
    if(a.lang===b.lang)continue;
    const leftLang=a.lang,rightLang=b.lang;
    // Prefer boundary with sustained language runs, not isolated personal names.
    if(before.slice(-2).some(w=>w.lang!==leftLang)||after.slice(0,2).some(w=>w.lang!==rightLang))continue;
    const left=text.slice(0,b.start),right=text.slice(b.start);
    const candidate=leftLang==='ru'?pair(left,right):pair(right,left);
    if(candidate)splits.push({i,pair:candidate});
  }
  if(!splits.length)return [];
  const best=splits.find(s=>/[\p{P}\s]/u.test(text.charAt(tokens[s.i].start-1)))||splits[0];
  return [best.pair];
}
function mixed(raw){return splitMixed(raw)[0]||null}
function splitParagraphs(paragraphs){
  const rows=[];
  for(const raw of paragraphs){
    const value=clean(raw);
    if(!value)continue;
    const lang=language(value);
    if(lang==='mixed'){
      const extracted=splitMixed(value);
      if(extracted.length){
        if(rows.length&&rows[rows.length-1].lang==='ru'&&clean(rows[rows.length-1].text)===extracted[0].ru)rows.pop();
        rows.push({lang:'pair',data:extracted[0]});
      }else rows.push({lang:null,text:value});
    }else rows.push({lang,text:value});
  }
  return rows;
}
function parseSlide(slide){
  const paragraphs=Array.isArray(slide)?slide:String(slide||'').split(/\n+/);
  const rows=splitParagraphs(paragraphs);
  const result=[];
  const append=(p)=>{if(p)result.push(p)};
  // Adjacent RU/PL blocks are a translation pair. Never cross a slide boundary.
  for(let i=0;i<rows.length;){
    const row=rows[i];
    if(row.lang==='pair'){append(row.data);i++;continue}
    if(!row.lang){i++;continue}
    const lang=row.lang;let j=i+1;
    while(j<rows.length&&rows[j].lang===lang)j++;
    if(j<rows.length&&rows[j].lang&&(rows[j].lang==='ru'||rows[j].lang==='pl')&&rows[j].lang!==lang){
      const opposite=rows[j].lang;let k=j+1;
      while(k<rows.length&&rows[k].lang===opposite)k++;
      const left=rows.slice(i,j).map(x=>x.text).join(' ');
      const right=rows.slice(j,k).map(x=>x.text).join(' ');
      append(lang==='ru'?pair(left,right):pair(right,left));
      i=k;
    }else i=j;
  }
  return result;
}
function parse(slides){
  const found=[],seen=new Set();
  for(const slide of Array.isArray(slides)?slides:[]){
    for(const p of parseSlide(slide)){
      const key=p.pl.toLocaleLowerCase('pl-PL').replace(/[^\p{L}\p{N}]/gu,'');
      if(key&& !seen.has(key)){seen.add(key);found.push(p)}
    }
  }
  return found;
}
function fromText(text){return parse(String(text||'').split(/\n\s*\n/))}
root.PVPresentationPhrases=Object.freeze({parse,parseSlide,mixed,fromText,clean,language});
})(typeof window==='undefined'?globalThis:window);