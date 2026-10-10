'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../presentation-phrases.js'),'utf8'),context);
const {parse,mixed,fromText}=context.window.PVPresentationPhrases;
test('extracts Polish after Cyrillic punctuation even when there is no space',()=>{
 const p=mixed('Оля живёт в большом городе.Ola mieszka w dużym mieście.');
 assert.equal(p.ru,'Оля живёт в большом городе.');
 assert.equal(p.pl,'Ola mieszka w dużym mieście.');
});
test('preserves multi-line Russian text before Polish text in one XML paragraph',()=>{
 const p=mixed('Мы хотели расширить\\nкомпанию за границей.Chcieliśmy rozbudować firmę za granicą.');
 assert.match(p.ru,/Мы хотели расширить/);
 assert.equal(p.pl,'Chcieliśmy rozbudować firmę za granicą.');
});
test('supports Polish-first and Cyrillic-second slides',()=>{
 const p=mixed('Co dzisiaj robisz?Что ты сегодня делаешь?');
 assert.equal(p.pl,'Co dzisiaj robisz?');
 assert.equal(p.ru,'Что ты сегодня делаешь?');
});
test('separates bilingual slides and ignores single-language introductory duplicates',()=>{
 const slides=['Оля работает в новом магазине.',
 'Оля работает в новом магазине.Ola pracuje w nowym sklepie.',
 'Оля работает в новом магазине.Ola pracuje w nowym sklepie.',
 'Что делает Оля?',
 'Что делает Оля?Co robi Ola?'];
 const result=parse(slides);
 assert.equal(result.length,2);
 assert.equal(result[1].ru,'Что делает Оля?');
 assert.equal(result[1].pl,'Co robi Ola?');
});
test('does not fabricate translation pairs for a Polish-only paragraph or short labels',()=>{
 assert.equal(mixed('Ola pracuje w sklepie.'),null);
 assert.equal(mixed('Задания:Ćwiczenia:'),null);
});
test('parses old saved documents with double-newline slide boundaries',()=>{
 const saved='Аня видит старую школу.Ania widzi starą szkołę.\n\nАня понимает трудное задание.Ania rozumie trudne zadanie.';
 assert.equal(fromText(saved).length,2);
});

test('B1 presentation creates multiple pairs from one slide with alternating paragraphs',()=>{
  const slide=[
    'Аня и Мачек — молодая семья. Последние три года они живут то тут, то там.',
    'Ania i Maciek są młodym małżeństwem. Od trzech lat mieszkają to tu, to tam.',
    'Постоянно меняют квартиры и районы. Сейчас они снимают двухкомнатную квартиру.',
    'Ciągle zmieniają mieszkania i dzielnice. Teraz wynajmują dwupokojowe mieszkanie.'
  ];
  const result=parse([slide]);
  assert.equal(result.length,2);
  assert.match(result[0].pl,/młodym małżeństwem/);
  assert.match(result[1].ru,/двухкомнатную квартиру/);
});
test('one slide supports several translation pairs separated by newlines in stored text',()=>{
 const saved='У нас скоро будет новая квартира.\\nWkrótce będziemy mieć nowe mieszkanie.\\nЭто очень хорошая новость.\\nTo bardzo dobra wiadomość.';
 const result=fromText(saved.replaceAll('\\n','\n'));
 assert.equal(result.length,2);
});
test('repeated Russian introduction on previous slide does not duplicate a bilingual slide',()=>{
 const ru='Малгожата является менеджером по делам маркетинга в производственной компании.';
 const slide=ru+'Małgorzata jest managerem od spraw marketingu w firmie produkcyjnej.';
 const result=parse([ru,slide,slide]);
 assert.equal(result.length,1);
 assert.equal(result[0].ru,ru);
});
test('mixed-script personal names do not cause a false sentence split',()=>{
 const result=parse([['Маша и Ania работают в одной школе.','Masza i Ania pracują w tej samej szkole.']]);
 assert.equal(result.length,1);
 assert.match(result[0].pl,/pracują/);
});
