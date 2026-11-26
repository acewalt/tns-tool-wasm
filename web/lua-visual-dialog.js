// Browser and Electron share this small form; Electron does not implement prompt().
export function askFields(title,fields,{lang='en'}={}){
 return new Promise(resolve=>{
  const t=(en,es,fr)=>lang==='es'?es:lang==='fr'?fr:en,backdrop=document.createElement('div');backdrop.className='modal-backdrop lvb-form-backdrop';
  backdrop.style.zIndex=String(Math.max(10050,...[...document.querySelectorAll('.modal-backdrop')].map(e=>parseInt(getComputedStyle(e).zIndex)||0))+2);
  const form=document.createElement('form');form.className='lvb-form';form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label',title);const h=document.createElement('h3');h.textContent=title;form.append(h);
  for(const field of fields){const label=document.createElement('label');label.textContent=field.label;const input=document.createElement('input');input.name=field.key;input.type=field.type||'text';input.value=field.value||'';input.required=field.required!==false;label.append(input);form.append(label);}
  const row=document.createElement('div');row.className='lvb-inline';const cancel=document.createElement('button');cancel.type='button';cancel.textContent=t('Cancel','Cancelar','Annuler');const save=document.createElement('button');save.className='primary';save.textContent=t('Save','Guardar','Enregistrer');row.append(cancel,save);form.append(row);backdrop.append(form);document.body.append(backdrop);
  const finish=value=>{backdrop.remove();resolve(value);};cancel.onclick=()=>finish(null);form.onsubmit=e=>{e.preventDefault();finish(Object.fromEntries(fields.map(f=>[f.key,form.elements[f.key].value])));};form.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish(null);}};form.querySelector('input')?.focus();form.querySelector('input')?.select();
 });
}
