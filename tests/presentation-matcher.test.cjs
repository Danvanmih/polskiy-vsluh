// node tests/presentation-matcher.test.cjs
// Integration contract for title-based upload resolution against the actual channel catalog.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const matcher=require('../presentation-matcher.js');
const data=require('../data/videos.json');
const videos=data.videos;
function find(title){const v=videos.find(v=>v.title===title);assert.ok(v,'Missing YouTube fixture: '+title);return v}
function auto(filename,expectedTitle){
 const result=matcher.resolve(filename,videos);
 assert.equal(result.status,'matched','Automatic import must not ask for manual matching: '+filename);
 assert.equal(result.video.id,find(expectedTitle).id,'Wrong video: '+filename);
 const manual=matcher.search(matcher.stripExtension(filename),videos);
 assert.ok(manual.length,'Manual search must see the same file: '+filename);
 assert.equal(manual[0].id,result.video.id,'Automatic matching and searchable fallback diverged: '+filename);
}
auto('Новый Курс В1. Урок 1.pptx','Новый Курс В1. Урок 1');
auto('Новый Курс B1. Урок 1.pptx','Новый Курс В1. Урок 1');
auto('Новый Курс В1. Урок 3.pptx','Новый Курс В1. Урок 3');
auto('Новый Курс В1. Урок 4 (облегченный).pptx','Новый Курс В1. Урок 4 (облегченный)');
auto('Новый Курс В1. Урок 3. Доскональная Отработка.pptx','Новый Курс В1. Урок 3.  Доскональная Отработка');
assert.equal(matcher.stripExtension('Новый Курс В1. Урок 1.pptx'),'Новый Курс В1. Урок 1');
assert.equal(matcher.stripExtension('Новый Курс В1. Урок 1.PDF'),'Новый Курс В1. Урок 1');
assert.equal(matcher.identity('Новый Курс В1. Урок 1').number,1);
assert.equal(matcher.identity('Новый Курс В1. Урок 1').level,'b1');
const lesson1=find('Новый Курс В1. Урок 1');
assert.equal(matcher.resolve('Новый Курс В1. Урок 1.pptx',videos,lesson1.id).video.id,lesson1.id);
const mismatch=matcher.resolve('Новый Курс В1. Урок 4 (облегченный).pptx',videos,lesson1.id);
assert.equal(mismatch.status,'mismatch');
assert.equal(mismatch.suggested.id,find('Новый Курс В1. Урок 4 (облегченный)').id);
assert.equal(matcher.resolve('Неизвестная презентация.pptx',videos).status,'ambiguous');
assert.equal(matcher.resolve('Новый Курс В1. Урок 4.pptx',videos,lesson1.id).status,'mismatch');
const counts=new Map();
for(const v of videos){const key=matcher.identity(v.title).key;counts.set(key,(counts.get(key)||0)+1)}
let unique=0,duplicate=0;
for(const v of videos){
 const key=matcher.identity(v.title).key;
 const resolved=matcher.resolve(v.title+'.pptx',videos);
 if(counts.get(key)===1){unique++;assert.equal(resolved.video?.id,v.id,'Catalog title misrouted: '+v.title)}
 else{duplicate++;assert.notEqual(resolved.status,'matched','Duplicate title auto-assigned: '+v.title)}
}
const importer=readFileSync(join(__dirname,'../presentation-import.js'),'utf8');
const page=readFileSync(join(__dirname,'../learn.html'),'utf8');
assert.ok(importer.includes('lessonMatcher.resolve(file.name,catalog,contextId)'),'Importer must invoke shared resolver');
assert.ok(!importer.includes('const explicitConflict='),'Old divergent resolver must remain removed');
assert.ok(page.indexOf('presentation-matcher.js')<page.indexOf('presentation-import.js'),'Load matcher before importer');
console.log('PASS: '+videos.length+' videos checked, '+unique+' unique titles auto-match, '+duplicate+' duplicate-title video records require review.');
