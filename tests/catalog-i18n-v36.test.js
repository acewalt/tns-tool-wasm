import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>JSON.parse(fs.readFileSync(new URL('../assets/math-tools/'+name,import.meta.url),'utf8'));
const catalog=read('catalog.json'),hierarchy=read('catalog-hierarchy.json'),locales=read('catalog-locales.json');
const context={window:{},document:{documentElement:{lang:'en'}}};
vm.runInNewContext(fs.readFileSync(new URL('../web/ti-math-tools.js',import.meta.url),'utf8'),context);
const api=context.window.TnsMathTools;
const walk=nodes=>nodes.flatMap(node=>[node,...walk(node.children||[])]);

test('all catalog descriptions, category paths, operators, units and template labels have three-language display text',()=>{
  const texts=new Set();
  for(const item of [...catalog,...walk(hierarchy.math.tree),...walk(hierarchy.conversion.tree),...api.templates]){
    for(const key of ['label','descripcion','header'])if(item[key])texts.add(item[key]);
    if(item.pestana==='5')texts.add(item.nombre);
  }
  assert(texts.size>1000);
  for(const text of texts){
    const entry=locales.translations[text];assert(entry,'Missing display text: '+text);
    for(const language of ['en','es','fr'])assert.equal(typeof entry[language],'string',language+': '+text);
  }
  assert.equal(api.catalogText('Number',locales,'es'),'Número');
  assert.equal(api.catalogText('Length',locales,'fr'),'Longueur');
  assert.equal(api.catalogText('Valor absoluto o módulo complejo',locales,'en'),'Absolute value or complex modulus');
  assert.equal(api.catalogText('Probabilidad / Distribuciones',locales,'fr'),'Probabilités / Distributions');
});

test('language changes localize the whole hierarchy without altering insertion codes, IDs, assistant schemas or the source data',()=>{
  const before=JSON.stringify({catalog,hierarchy});
  for(const language of ['en','es','fr']){
    const localizedCatalog=api.localizeCatalog(catalog,locales,language);
    const math=api.localizeCatalog(hierarchy.math.tree,locales,language),conversion=api.localizeCatalog(hierarchy.conversion.tree,locales,language);
    assert.equal(localizedCatalog.length,catalog.length);
    for(let i=0;i<catalog.length;i++){
      assert.equal(localizedCatalog[i].codigo_o_equivalente,catalog[i].codigo_o_equivalente);
      assert.equal(localizedCatalog[i].pestana,catalog[i].pestana);
      if(catalog[i].pestana!=='5')assert.equal(localizedCatalog[i].nombre,catalog[i].nombre,'Command/symbol names must stay canonical');
    }
    for(const [original,localized]of [[hierarchy.math.tree,math],[hierarchy.conversion.tree,conversion]]){
      const a=walk(original),b=walk(localized);assert.equal(a.length,b.length);
      for(let i=0;i<a.length;i++)for(const key of ['id','type','code','wizardId','sourceCode','whenEnabled','whenDisabled'])assert.equal(b[i][key],a[i][key],key+' '+a[i].id);
    }
    const matrix=api.flattenCatalog(math).find(item=>item.wizardId==='matrixCreate');
    assert.equal(api.buildCatalogWizard(matrix,{rows:2,columns:3}),'[[1,1,1][1,1,1]]');
    const unit=api.flattenCatalog(conversion).find(item=>item.code==='_µH');assert(unit);
  }
  assert.equal(JSON.stringify({catalog,hierarchy}),before,'Localization must not mutate source catalogs');
});

test('unknown user-provided labels remain untouched and unsupported languages use English display labels',()=>{
  const label='my-local-library.tns';assert.equal(api.catalogText(label,locales,'fr'),label);
  assert.equal(api.catalogText('Probabilidad',locales,'de'),'Probability');
  assert.equal(api.localizeCatalog({nombre:'DrawLine',codigo_o_equivalente:'DrawLine x1,y1,x2,y2',descripcion:'Dibuja línea'},locales,'fr').nombre,'DrawLine');
});
