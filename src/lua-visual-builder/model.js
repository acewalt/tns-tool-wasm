// Serializable source of truth. Generated Lua carries this project as metadata.
export const VERSION = 1;
export const COMPONENTS = ['Label','Input','Button','Panel','Dropdown','Checkbox','Radio','Slider','Table','Graph','Image','Progress','Scroll','Formula','Shape'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.().slice(0,8) || Math.random().toString(36).slice(2,10)}`;
export function component(type, x=16, y=16) {
  if (!COMPONENTS.includes(type)) throw Error('Unknown component: '+type);
  return {id:uid(type.toLowerCase()),type,x,y,w:['Panel','Scroll','Graph','Table'].includes(type)?200:130,h:['Panel','Scroll','Graph','Table'].includes(type)?100:28,text:type,value:type==='Slider'||type==='Progress'?'50':type==='Input'?'':type==='Checkbox'||type==='Radio'?'false':'',color:type==='Button'?'#244d78':'#ffffff',foreground:type==='Button'?'#ffffff':'#172235',border:'#9aabba',font:11,bold:type==='Button',visible:true,parent:'',options:'One\nTwo\nThree',min:0,max:100,step:1,group:'choice',expression:'sin(x)',shape:'rectangle',rows:'A,B\n1,2\n3,4',asset:'',scrollHeight:240,events:{}};
}
export function page(name='Page 1') {return {id:uid('page'),name,background:'#f5f7fa',components:[],events:{},variables:{}};}
export function createProject(name='My app') {const first=page('Home');return {format:'tns-lua-visual',version:VERSION,name,width:320,height:212,startPage:first.id,pages:[first],variables:{},functions:'',events:{},graphs:{},assets:{}};}
export function validateProject(value) {
  const errors=[];
  if(value?.format!=='tns-lua-visual'||value.version!==VERSION) return ['Unsupported visual project format or version.'];
  if(!Array.isArray(value.pages)||!value.pages.length||value.pages.length>50)return ['A project must contain 1–50 pages.'];
  const ids=new Set(),ident=/^[A-Za-z_][A-Za-z0-9_]*$/;
  if(typeof value.name!=='string'||value.name.length>200)errors.push('Project name must be text (up to 200 characters).');
  const variables=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))errors.push(label+' must be an object.');else for(const k of Object.keys(v))if(!ident.test(k)||['__proto__','constructor','prototype'].includes(k))errors.push('Invalid variable: '+k);};
  for(const p of value.pages){
    if(!ident.test(p.id)||ids.has(p.id))errors.push('Invalid or duplicate page ID: '+p.id);ids.add(p.id);
    if(!Array.isArray(p.components)||p.components.length>200){errors.push('Too many components in '+p.name);continue;}
    variables(p.variables||{},'Page variables');
    if(!/^#[0-9a-f]{6}$/i.test(p.background))errors.push('Invalid page background: '+p.id);
    const local=new Set();
    for(const c of p.components){
      if(!ident.test(c.id)||local.has(c.id))errors.push('Invalid or duplicate component ID: '+c.id);local.add(c.id);
      if(!COMPONENTS.includes(c.type))errors.push('Unknown component: '+c.type);
      for(const key of ['x','y','w','h'])if(!Number.isFinite(c[key])||Math.abs(c[key])>10000||(['w','h'].includes(key)&&c[key]<4))errors.push(c.id+': invalid '+key);
      for(const key of ['color','foreground','border'])if(!/^#[0-9a-f]{6}$/i.test(c[key]))errors.push(c.id+': invalid '+key);
      if(!Number.isFinite(c.font)||c.font<6||c.font>36)errors.push(c.id+': font must be 6–36');
      if(['Slider','Progress'].includes(c.type)&&!(Number(c.max)>Number(c.min)))errors.push(c.id+': max must exceed min');
    }
    for(const c of p.components){
      const seen=new Set([c.id]);let parent=c.parent;
      while(parent){const item=p.components.find(i=>i.id===parent);if(!item||!['Panel','Scroll'].includes(item.type)||seen.has(parent)){errors.push(c.id+': invalid parent hierarchy');break;}seen.add(parent);parent=item.parent;}
    }
  }
  if(!ids.has(value.startPage))errors.push('Start page is missing.');
  variables(value.variables,'Variables');
  if(Object.keys(value.assets||{}).length>32)errors.push('At most 32 images per project.');
  for(const a of Object.values(value.assets||{})){
    if(!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width>96||a.height>96||!Array.isArray(a.runs)||a.runs.length>9216){errors.push('Invalid image dimensions');continue;}
    let pixels=0;for(const r of a.runs){if(!Array.isArray(r)||r.length!==5||!Number.isInteger(r[0])||r[0]<1||r[0]>9216||r.slice(1,4).some(v=>!Number.isInteger(v)||v<0||v>255)||![0,1].includes(r[4]))errors.push('Invalid image data');pixels+=r[0];}if(pixels!==a.width*a.height)errors.push('Incomplete image data');
  }
  if(JSON.stringify(value).length>4000000)errors.push('Project exceeds 4 MB.');
  return errors;
}
export function decodeProject(source) {
  const match=String(source).match(/^-- @tns-visual-builder:(.+)$/m);
  if(!match)return null;
  const value=JSON.parse(decodeURIComponent(match[1]));const errors=validateProject(value);if(errors.length)throw Error(errors.join('\n'));return value;
}
export function parseProject(source) {const value=JSON.parse(source),errors=validateProject(value);if(errors.length)throw Error(errors.join('\n'));return value;}
export function renameComponent(project,pageId,oldId,newId) {
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(newId))throw Error('Use letters, numbers and underscores; start with a letter.');
  const p=project.pages.find(p=>p.id===pageId);if(p.components.some(c=>c.id===newId&&c.id!==oldId))throw Error('Component ID already exists.');
  const old=p.components.find(c=>c.id===oldId);if(!old)return;old.id=newId;
  // IDs are referenced in action targets, parent relationships and input("id") expressions.
  function visit(o){if(!o||typeof o!=='object')return;for(const [key,v]of Object.entries(o)){if(key==='inputs'&&Array.isArray(v))o[key]=v.map(id=>id===oldId?newId:id);else if(typeof v==='object')visit(v);else if(typeof v==='string'){if(['target','component','parent'].includes(key)&&v===oldId)o[key]=newId;else if(['expression','value','condition'].includes(key)){for(const fn of ['input','value','text'])o[key]=(o[key]).replaceAll(fn+'("'+oldId+'")',fn+'("'+newId+'")').replaceAll(fn+"('"+oldId+"')",fn+"('"+newId+"')");}}}}
  visit(p);
  for(const key of Object.keys(project.graphs||{}))if(key.startsWith(pageId+':')){visit(project.graphs[key]);if(key.startsWith(pageId+':'+oldId+':')){project.graphs[pageId+':'+newId+key.slice((pageId+':'+oldId).length)]=project.graphs[key];delete project.graphs[key];}}
  if(!project.pages.some(other=>other!==p&&other.components.some(c=>c.id===oldId))){visit(project.events);for(const [key,g]of Object.entries(project.graphs||{}))if(key.startsWith('app:'))visit(g);}
}
export function template(name='hooke') {
  const p=createProject(name==='hooke'?'Hooke':'My app'),home=p.pages[0];
  const add=(type,id,x,y,w,h,text,value)=>{const c={...component(type,x,y),id,w,h,text,value:value??''};home.components.push(c);return c;};
  add('Panel','header',0,0,320,32,'').color='#244d78';
  const title=add('Label','title',12,6,296,22,name==='hooke'?'Hooke · F = k × x':name);title.color='#244d78';title.foreground='#ffffff';title.bold=true;
  if(name==='menu'){
    for(let i=0;i<3;i++){const next=page(['Calculator','Theory','Exercises'][i]);p.pages.push(next);const b=add('Button','go'+i,48,48+i*46,224,34,next.name);b.events.click=[{type:'navigate',page:next.id}];const back={...component('Button'),id:'back'+i,x:12,y:170,text:'Back',events:{click:[{type:'back'}]}};next.components.push(back);}
  }else if(name==='graph'){add('Graph','plot',16,45,288,150,'').expression='sin(x)';}
  else if(name==='study'){const c=add('Scroll','theory',12,44,296,154,'');c.scrollHeight=400;for(let i=0;i<10;i++){const l=add('Label','line'+i,8,8+i*32,260,26,'Study note '+(i+1));l.parent=c.id;}}
  else if(name==='quiz'){
    add('Label','question',16,45,288,28,'2 + 2 = ?');for(let i=0;i<3;i++){const c=add('Radio','answer'+i,20,80+i*28,200,24,String(i+3),'false');c.events.change=[{type:'setText',target:'feedback',expression:JSON.stringify(i===1?'Correct!':'Try again')}];}add('Label','feedback',16,175,288,26,'Choose an answer');
  }else{
    add('Label','labelA',16,42,280,20,name==='hooke'?'Elastic constant (N/m)':'Number A');add('Input','a',16,64,288,28,'',name==='hooke'?'100':'2');
    add('Label','labelB',16,100,280,20,name==='hooke'?'Displacement (m)':'Number B');add('Input','b',16,122,288,28,'',name==='hooke'?'0.15':'3');
    const button=add('Button','calculate',16,158,135,30,'Calculate');add('Label','result',160,158,148,36,'Result');
    button.events.click=[{type:'validate',inputs:['a','b']},{type:'setText',target:'result',expression:'input("a") * input("b")',decimals:2,suffix:name==='hooke'?' N':''}];
  }
  return p;
}
