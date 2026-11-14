/* Range editing for the native tabulator preview. Source formulas stay separate
   from cached calculator answers; merely opening a sheet never recalculates it. */
(() => {
  'use strict';
  const column = n => String.fromCharCode(65 + n);
  const ref = (row,col) => column(col) + (row+1);
  const bounds = selection => ({top:Math.min(selection.anchorRow,selection.row),bottom:Math.max(selection.anchorRow,selection.row),left:Math.min(selection.anchorCol,selection.col),right:Math.max(selection.anchorCol,selection.col)});
  function normalizeFormula(text) {
    if(!text.startsWith('='))return text;
    let expression=text.slice(1).trim();
    while(expression.startsWith('(')&&expression.endsWith(')')){
      let depth=0,quoted=false,whole=true;
      for(let i=0;i<expression.length;i++){
        const ch=expression[i];
        if(ch==='"'&&expression[i-1]!=='\\')quoted=!quoted;
        if(quoted)continue;
        if(ch==='(')depth++;else if(ch===')')depth--;
        if(depth===0&&i<expression.length-1){whole=false;break;}
        if(depth<0){whole=false;break;}
      }
      if(!whole||depth!==0||quoted)break;
      expression=expression.slice(1,-1).trim();
    }
    return '='+expression;
  }
  function parseTable(text) { return String(text).replace(/\r\n?/g,'\n').replace(/\n$/,'').split('\n').map(row=>row.split('\t')); }
  function mount(host, state, options={}) {
    const grid=host.querySelector('.spreadsheet-grid'), formula=host.querySelector('.spreadsheet-formula-value'), name=host.querySelector('.spreadsheet-cell-name'), info=host.querySelector('.spreadsheet-selection-info');
    const selection={anchorRow:state.activeRow||0,anchorCol:state.activeCol||0,row:state.activeRow||0,col:state.activeCol||0};
    let dragging=false,editing=null,picking=null,destroyed=false;
    const changedCellKeys=new Set();
    const cleanups=[];
    const listen=(node,event,handler,opts)=>{node.addEventListener(event,handler,opts);cleanups.push(()=>node.removeEventListener(event,handler,opts));};
    const display=cell=>String(cell?.data??cell?.formula??'');
    const editText=()=>editing?.kind==='formula'?formula.value:editing?.element.textContent||'';
    function caret(element) {
      if(element===formula)return {start:formula.selectionStart??formula.value.length,end:formula.selectionEnd??formula.value.length};
      const selection=window.getSelection();
      if(!selection?.rangeCount||!element.contains(selection.anchorNode))return {start:element.textContent.length,end:element.textContent.length};
      const range=selection.getRangeAt(0),before=range.cloneRange();before.selectNodeContents(element);before.setEnd(range.startContainer,range.startOffset);
      return {start:before.toString().length,end:before.toString().length+range.toString().length};
    }
    function setEditText(text,position) {
      if(!editing)return;
      const element=editing.element;
      if(element===formula){formula.value=text;formula.focus();formula.setSelectionRange(position,position);}
      else {element.textContent=text;element.focus();const range=document.createRange();range.setStart(element.firstChild||element,element.firstChild?position:0);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);formula.value=text;}
    }
    function select(row,col,extend=false) {
      row=Math.max(0,Math.min(9998,row));col=Math.max(0,Math.min(25,col));
      state.activeRow=row;state.activeCol=col;selection.row=row;selection.col=col;
      if(!extend){selection.anchorRow=row;selection.anchorCol=col;}
      state.rows=Math.max(state.rows,row+1);state.cols=Math.max(state.cols,col+1);renderSelection();
    }
    function renderSelection() {
      const b=bounds(selection);
      for(const cell of grid.querySelectorAll('.sheet-cell')) {
        const row=Number(cell.dataset.row),col=Number(cell.dataset.col);
        const selected=row>=b.top&&row<=b.bottom&&col>=b.left&&col<=b.right;
        cell.classList.toggle('selected',selected);cell.classList.toggle('active',row===state.activeRow&&col===state.activeCol);cell.setAttribute('aria-selected',String(selected));
        const p=picking&&bounds(picking);cell.classList.toggle('formula-reference',!!p&&row>=p.top&&row<=p.bottom&&col>=p.left&&col<=p.right);
      }
      name.textContent=b.top===b.bottom&&b.left===b.right?ref(b.top,b.left):ref(b.top,b.left)+':'+ref(b.bottom,b.right);
      if(!editing&&document.activeElement!==formula)formula.value=String(state.cells[state.activeRow+':'+state.activeCol]?.formula??'');
      if(info)info.textContent=((b.bottom-b.top+1)*(b.right-b.left+1))+' '+(options.selectedLabel||'selected');
    }
    function render() {
      if(destroyed)return;
      // An external variable refresh must not replace a live contenteditable draft.
      if(editing){renderSelection();return;}
      const rows=Math.min(1000,Math.max(20,state.rows)),cols=Math.min(26,Math.max(12,state.cols));
      grid.replaceChildren();grid.style.setProperty('--sheet-cols',String(cols));
      grid.style.gridTemplateColumns='28px '+Array.from({length:cols},(_,col)=>Math.max(38,Math.min(300,Number(state.columnWidths?.[col])||70))+'px').join(' ');
      const make=(className,text,row,col)=>{const el=document.createElement('div');el.className=className;el.textContent=text;if(row!==undefined)el.dataset.row=row;if(col!==undefined)el.dataset.col=col;return el;};
      grid.append(make('sheet-corner',''));
      for(let col=0;col<cols;col++)grid.append(make('sheet-col-header',column(col),undefined,col));
      // Native List & Spreadsheet stores one optional list name per column.
      if(state.columnNames?.some(Boolean)) {
        grid.append(make('sheet-row-header','◇'));
        for(let col=0;col<cols;col++)grid.append(make('sheet-column-name',state.columnNames[col]||'',undefined,col));
      }
      for(let row=0;row<rows;row++) {
        grid.append(make('sheet-row-header',String(row+1),row));
        for(let col=0;col<cols;col++) {
          const cell=make('sheet-cell',display(state.cells[row+':'+col]),row,col);cell.setAttribute('role','gridcell');cell.tabIndex=-1;
          grid.append(cell);
        }
      }
      renderSelection();
    }
    function changed() {
      if(changedCellKeys.size){state.dirty=true;const change={changedCellKeys:[...changedCellKeys]};changedCellKeys.clear();options.onChange?.(state,change);}render();
    }
    function write(row,col,text) {
      const key=row+':'+col,raw=normalizeFormula(String(text));
      if(raw===String(state.cells[key]?.formula??''))return;
      changedCellKeys.add(key);
      if(!raw){delete state.cells[key];return;}
      state.cells[key]={...state.cells[key],formula:raw,data:raw.startsWith('=')?options.evaluate?.(raw,state.cells)??'#LOADING!':raw};
      state.rows=Math.max(state.rows,row+1);state.cols=Math.max(state.cols,col+1);
    }
    function beginEdit(cell,initial) {
      if(!cell)return;commitEdit();select(Number(cell.dataset.row),Number(cell.dataset.col));
      // commitEdit may have rendered a new grid; never edit the detached old cell.
      cell=activeCell();editing={kind:'cell',element:cell,row:state.activeRow,col:state.activeCol,reference:null};cell.contentEditable='true';
      const text=initial??String(state.cells[state.activeRow+':'+state.activeCol]?.formula??'');setEditText(text,text.length);
    }
    function commitEdit(cancel=false) {
      if(!editing)return;const draft=editing,text=editText();editing=null;picking=null;dragging=false;
      if(draft.kind==='cell')draft.element.contentEditable='false';
      if(!cancel){write(draft.row,draft.col,text);changed();}else render();
      formula.value=String(state.cells[state.activeRow+':'+state.activeCol]?.formula??'');
    }
    const activeCell=()=>grid.querySelector(`[data-row="${state.activeRow}"][data-col="${state.activeCol}"].sheet-cell`);
    function move(drow,dcol,extend=false){select(state.activeRow+drow,state.activeCol+dcol,extend);if(!activeCell())render();activeCell()?.scrollIntoView({block:'nearest',inline:'nearest'});grid.focus();}
    function canPickReference() {
      if(!editing||!editText().trimStart().startsWith('='))return false;
      const text=editText(),position=caret(editing.element);
      return !!editing.reference||position.start!==position.end||/(?:^=|[+\-*/^,(=:])\s*$/.test(text.slice(0,position.start));
    }
    function pickReference(row,col,extend=false) {
      if(!editing.reference){const position=caret(editing.element);editing.reference={...position};}
      if(!extend||!picking)picking={anchorRow:row,anchorCol:col,row,col};else {picking.row=row;picking.col=col;}
      const selected=bounds(picking),token=ref(selected.top,selected.left)+(selected.top===selected.bottom&&selected.left===selected.right?'':':'+ref(selected.bottom,selected.right));
      const text=editText(),span=editing.reference;setEditText(text.slice(0,span.start)+token+text.slice(span.end),span.start+token.length);span.end=span.start+token.length;renderSelection();
    }
    listen(grid,'pointerdown',event=>{const cell=event.target.closest('.sheet-cell');if(!cell)return;if(editing?.element===cell){editing.reference=null;picking=null;renderSelection();return;}
      event.preventDefault();
      if(canPickReference()){pickReference(Number(cell.dataset.row),Number(cell.dataset.col),event.shiftKey);dragging=true;return;}
      commitEdit();select(Number(cell.dataset.row),Number(cell.dataset.col),event.shiftKey);dragging=true;grid.focus();
    });
    listen(grid,'pointerover',event=>{const cell=event.target.closest('.sheet-cell');if(dragging&&cell){if(editing&&picking)pickReference(Number(cell.dataset.row),Number(cell.dataset.col),true);else select(Number(cell.dataset.row),Number(cell.dataset.col),true);}});
    listen(window,'pointerup',()=>{dragging=false;});
    listen(grid,'dblclick',event=>beginEdit(event.target.closest('.sheet-cell')));
    listen(grid,'input',event=>{if(event.target===editing?.element){editing.reference=null;picking=null;formula.value=editText();renderSelection();}});
    listen(grid,'focusout',event=>{if(event.target===editing?.element)commitEdit();});
    listen(grid,'keydown',event=>{
      if(editing){event.stopPropagation();if(/^(?:Arrow|Home|End)/.test(event.key)){editing.reference=null;picking=null;renderSelection();}if(event.key==='Escape'){event.preventDefault();commitEdit(true);grid.focus();}else if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();commitEdit();move(event.key==='Enter'?(event.shiftKey?-1:1):0,event.key==='Tab'?(event.shiftKey?-1:1):0);}return;}
      const directions={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],Enter:[1,0],Tab:[0,event.shiftKey?-1:1]};
      if(directions[event.key]){event.preventDefault();event.stopPropagation();move(...directions[event.key],event.shiftKey&&event.key!=='Tab');}
      else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();event.stopPropagation();clear();}
      else if(event.key==='F2'){event.preventDefault();event.stopPropagation();beginEdit(activeCell());}
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopPropagation();beginEdit(activeCell(),event.key);}
    });
    function clear(){const b=bounds(selection);for(let row=b.top;row<=b.bottom;row++)for(let col=b.left;col<=b.right;col++){const key=row+':'+col;if(state.cells[key]){changedCellKeys.add(key);delete state.cells[key];}}changed();}
    function beginFormulaEdit(){if(editing?.element===formula)return;const text=formula.value;commitEdit();editing={kind:'formula',element:formula,row:state.activeRow,col:state.activeCol,reference:null};formula.value=text;}
    listen(formula,'focus',beginFormulaEdit);
    listen(formula,'pointerdown',()=>{if(editing?.element===formula){editing.reference=null;picking=null;renderSelection();}});
    listen(formula,'input',()=>{beginFormulaEdit();editing.reference=null;picking=null;renderSelection();});
    listen(formula,'blur',()=>{if(editing?.element===formula)commitEdit();});
    listen(formula,'keydown',event=>{event.stopPropagation();if(editing&&/^(?:Arrow|Home|End)/.test(event.key)){editing.reference=null;picking=null;renderSelection();}if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();commitEdit();move(event.key==='Enter'?(event.shiftKey?-1:1):0,event.key==='Tab'?(event.shiftKey?-1:1):0);}else if(event.key==='Escape'){event.preventDefault();commitEdit(true);grid.focus();}});
    listen(grid,'copy',event=>{if(editing)return;const b=bounds(selection),rows=[];for(let row=b.top;row<=b.bottom;row++){const cells=[];for(let col=b.left;col<=b.right;col++)cells.push(display(state.cells[row+':'+col]));rows.push(cells.join('\t'));}event.clipboardData.setData('text/plain',rows.join('\n'));event.preventDefault();});
    listen(grid,'paste',event=>{if(editing)return;event.preventDefault();const rows=parseTable(event.clipboardData.getData('text/plain')),startRow=state.activeRow,startCol=state.activeCol;for(let r=0;r<rows.length&&startRow+r<9999;r++)for(let c=0;c<rows[r].length&&startCol+c<26;c++)write(startRow+r,startCol+c,rows[r][c]);selection.anchorRow=startRow;selection.anchorCol=startCol;selection.row=startRow+rows.length-1;selection.col=Math.min(25,startCol+Math.max(...rows.map(r=>r.length))-1);changed();});
    for(const button of host.querySelectorAll('[data-sheet-tool]'))listen(button,'click',()=>{
      commitEdit();const b=bounds(selection),tool=button.dataset.sheetTool;
      if(tool==='clear')clear();
      else if(tool==='row'){state.rows=Math.min(1000,Math.max(20,state.rows)+1);render();}
      else if(tool==='col'){state.cols=Math.min(26,Math.max(12,state.cols)+1);render();}
      else if(tool==='sum'){const destination=Math.min(9998,b.bottom+1);write(destination,b.left,`=sum(${ref(b.top,b.left)}:${ref(b.bottom,b.right)})`);select(destination,b.left);changed();}
    });
    render();return{render,select,getSelection:()=>({...selection}),commit:()=>commitEdit(),destroy(){destroyed=true;cleanups.forEach(fn=>fn());}};
  }
  window.TnsSpreadsheetTools=Object.freeze({mount,bounds,parseTable,normalizeFormula});
})();
