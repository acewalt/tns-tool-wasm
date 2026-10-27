/* Export original, self-contained source projects; no commercial game assets. */
const fs=require('node:fs'),path=require('node:path');
const {root,pack}=require('../tests/helpers/ndless-native.cjs');
const out=path.resolve(process.argv[2]||'release/preview-games');
fs.mkdirSync(out,{recursive:true});
const folder=path.join(root,'examples/ndless-games'),bundle={};
for(const name of ['platformer','raycaster','pong','snake','blocks','sprites']){
 const files={
  'main.c':fs.readFileSync(path.join(folder,name,'main.c'),'utf8'),
  'lab.h':fs.readFileSync(path.join(folder,'lab.h'),'utf8'),
  'LICENSE':fs.readFileSync(path.join(folder,'LICENSE'),'utf8'),
  '.tnsproject.json':JSON.stringify({type:'tns-tool-ndless-project',version:1,name,language:'c',template:'basic',target:'zehn-modern',activeFile:'main.c',settings:{}},null,2)
 };
 const zip=pack(files);fs.writeFileSync(path.join(out,name+'-project.zip'),zip);bundle[name+'-project.zip']=zip;
}
bundle['sprite.bmp']=require('../tests/fixtures/sprite-bmp.cjs')();
bundle['LEEME.txt']='Abre cada ZIP con Archivo > Abrir proyecto Ndless en TNS Tool Portable 0.1.12 o posterior.\nEspera a la compilación automática, haz clic en la pantalla y usa las teclas. Esc sale.\nEn sprites, abre Archivos y argumentos del programa > Cargar recursos y selecciona sprite.bmp.\n';
bundle['README.md']=fs.readFileSync(path.join(folder,'README.md'),'utf8');
bundle['LICENSE']=fs.readFileSync(path.join(folder,'LICENSE'),'utf8');
const output=path.join(out,'TNS-Preview-Games.zip');fs.writeFileSync(output,pack(bundle));console.log(output);
