'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(base,'lesson-resolver.js'),'utf8'),sandbox,{filename:'lesson-resolver.js'});
const resolver=sandbox.window.PVLessonResolver;
const catalog=JSON.parse(fs.readFileSync(path.join(base,'data/videos.json'),'utf8')).videos;
const byTitle=title=>catalog.find(v=>v.title===title);
test('extension is removed, lesson number is NOT removed after a dot',()=>{
  assert.equal(resolver.basename('Новый Курс В1. Урок 1.pptx'),'Новый Курс В1. Урок 1');
  assert.equal(resolver.basename('Новый Курс В1. Урок 1.pdf'),'Новый Курс В1. Урок 1');
  assert.equal(resolver.basename('Новый Курс В1. Урок 1'),'Новый Курс В1. Урок 1');
  assert.match(resolver.normalize('Новый Курс В1. Урок 1'),/урок 1$/);
});
test('automatic selection matches the existing manual full-title search',()=>{
  const titles=['Новый Курс В1. Урок 1','Новый Курс В1. Урок 1 (облегченный)','Новый Курс В1. Урок 3.  Доскональная Отработка'];
  for(const title of titles){
    const result=resolver.resolve(title+'.pptx',catalog);
    assert.equal(result.status,'matched',title);
    assert.equal(result.video.id,byTitle(title).id,title);
    assert.equal(result.reason,'exact-title');
  }
});
test('Cyrillic В1 and Latin B1 identify the same video',()=>{
  const result=resolver.resolve('Новый Курс B1. Урок 1.pptx',catalog);
  assert.equal(result.status,'matched');
  assert.equal(result.video.id,byTitle('Новый Курс В1. Урок 1').id);
});
test('all distinct titles in the real catalog resolve to their same video IDs',()=>{
  const buckets=new Map();
  for(const video of catalog){
    const key=resolver.normalize(video.title);
    buckets.set(key,[...(buckets.get(key)||[]),video]);
  }
  let checked=0;
  for(const videos of buckets.values()){
    if(videos.length!==1)continue;
    const target=videos[0];
    const result=resolver.resolve(target.title+'.pptx',catalog);
    assert.equal(result.status,'matched',target.title);
    assert.equal(result.video.id,target.id,target.title);
    checked++;
  }
  assert.ok(checked>700,'Expected broad coverage of real YouTube titles');
});
test('identical video titles remain ambiguous without a video ID',()=>{
  const result=resolver.resolve('А1 тренировка.pptx',catalog);
  assert.equal(result.status,'ambiguous');
  assert.ok(result.candidates.length>1);
});
test('deep links use their exact video ID even when the title is duplicated',()=>{
  const first=catalog.find(v=>v.title==='А1 тренировка');
  assert.ok(first);
  const result=resolver.resolve(first.title+'.pptx',catalog,first.id);
  assert.equal(result.status,'matched');
  assert.equal(result.video.id,first.id);
});
test('wrong lesson offered only for correct destination, never silently bound',()=>{
  const source=byTitle('Новый Курс В1. Урок 1');
  const destination=byTitle('Новый Курс В1. Урок 4 (облегченный)');
  const result=resolver.resolve(destination.title+'.pptx',catalog,source.id);
  assert.equal(result.status,'mismatch');
  assert.equal(result.suggested.id,destination.id);
});
test('unclear files in a known video can use the video context without inventing a conflict',()=>{
  const current=byTitle('Новый Курс В1. Урок 1');
  const result=resolver.resolve('Текст для заучивания.pptx',catalog,current.id);
  assert.equal(result.status,'matched');
  assert.equal(result.video.id,current.id);
});
test('completely unknown file does not silently attach to arbitrary lesson',()=>{
  const result=resolver.resolve('something that is not a Polish lesson.pptx',catalog);
  assert.equal(result.status,'missing');
  assert.equal(result.video,null);
});
