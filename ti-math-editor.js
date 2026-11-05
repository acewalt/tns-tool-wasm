(() => {
  'use strict';
  const labels={es:['Vista matemática','Editar texto','Haz clic en una línea para editarla. Ctrl+Enter termina la edición.','Línea'],en:['Mathematical view','Edit text','Click a line to edit it. Ctrl+Enter finishes editing.','Line'],fr:['Vue mathématique','Modifier le texte','Cliquez sur une ligne pour la modifier. Ctrl+Entrée termine la saisie.','Ligne']};
  function install({host,editor,replaceRange,isEnabled=()=>true,onChange=()=>{}}) {
    const surface=document.createElement('section');surface.className='ti-math-source-view';surface.hidden=true;host.append(surface);
    let active=false,editing=null,disposed=false;
    const text=()=>labels[String(document.documentElement.lang||'en').slice(0,2)]||labels.en;
    function render(){if(!active||editing||disposed)return;const scroll=surface.scrollTop;surface.replaceChildren();const header=document.createElement('header');header.className='ti-math-source-header';const title=document.createElement('strong');title.textContent=text()[0];const hint=document.createElement('small');hint.textContent=text()[2];header.append(title,hint);surface.append(header);
      const lines=editor.value.split('\n');let offset=0;
      lines.forEach((line,index)=>{const row=document.createElement('div');row.className='ti-math-source-row';row.tabIndex=0;row.dataset.mathLine=String(index+1);row.setAttribute('aria-label',`${text()[3]} ${index+1}: ${line}`);const gutter=document.createElement('span');gutter.className='ti-math-source-gutter';gutter.textContent=String(index+1);const formula=document.createElement('div');formula.className='ti-math-source-formula';formula.innerHTML=window.TnsMathTypeset.renderLine(line);row.append(gutter,formula);const start=offset;
        row.onclick=()=>edit(row,line,start);row.onkeydown=e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();edit(row,line,start);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();(e.key==='ArrowDown'?row.nextElementSibling:row.previousElementSibling)?.focus();}};surface.append(row);offset+=line.length+1;});surface.scrollTop=scroll;
    }
    function edit(row,line,start){if(editing||!isEnabled())return;const formula=row.querySelector('.ti-math-source-formula'),input=document.createElement('textarea');input.className='ti-math-source-input';input.value=line;input.spellcheck=false;input.setAttribute('aria-label',`${text()[3]} ${row.dataset.mathLine}`);formula.replaceChildren(input);editing={row,input,start,length:line.length,original:line};
      const update=()=>{const oldLength=editing.length;replaceRange(input.value,start,start+oldLength);editing.length=input.value.length;input.style.height='auto';input.style.height=Math.max(32,input.scrollHeight)+'px';onChange();};
      const finish=()=>{if(!editing)return;editing=null;render();};input.oninput=update;input.onblur=finish;input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();replaceRange(editing.original,start,start+editing.length);finish();}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();finish();surface.querySelector(`[data-math-line="${row.dataset.mathLine}"]`)?.focus();}else if(e.key==='Tab'){e.preventDefault();input.setRangeText('  ',input.selectionStart,input.selectionEnd,'end');update();}};input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
    }
    function setActive(value){if(editing)editing.input.blur();active=Boolean(value&&isEnabled());host.classList.toggle('ti-math-source-active',active);surface.hidden=!active;if(active)render();onChange();return active;}
    const refresh=()=>{if(active&&!isEnabled())setActive(false);else render();};editor.addEventListener('input',refresh);
    return {get active(){return active;},setActive,refresh,dispose(){disposed=true;editor.removeEventListener('input',refresh);surface.remove();host.classList.remove('ti-math-source-active');}};
  }
  window.TnsMathEditor=Object.freeze({install});
})();
