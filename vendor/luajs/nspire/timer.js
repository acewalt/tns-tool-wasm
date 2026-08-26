console.info("timer.js");

// Correct bit / bit32 compatibility used by LuaJS and LÖVE projects.
(function installBitCompatibility() {
  if (typeof G === 'undefined' || !G.str || typeof lua_newtable !== 'function' || typeof lua_tableset !== 'function') return;
  var u32 = function (value) { return Number(value) >>> 0; };
  var i32 = function (value) { return Number(value) | 0; };
  var args = function (values) { return Array.prototype.slice.call(values); };
  var shift = function (value) { return Math.trunc(Number(value) || 0); };
  var rot = function (value) { return ((shift(value) % 32) + 32) % 32; };

  var bit32Table = lua_newtable();
  lua_tableset(bit32Table, 'band', function () { var v=args(arguments),r=0xFFFFFFFF; for(var i=0;i<v.length;i++) r=(r&u32(v[i]))>>>0; return [r>>>0]; });
  lua_tableset(bit32Table, 'bor',  function () { var v=args(arguments),r=0; for(var i=0;i<v.length;i++) r=(r|u32(v[i]))>>>0; return [r>>>0]; });
  lua_tableset(bit32Table, 'bxor', function () { var v=args(arguments),r=0; for(var i=0;i<v.length;i++) r=(r^u32(v[i]))>>>0; return [r>>>0]; });
  lua_tableset(bit32Table, 'bnot', function (value) { return [(~u32(value))>>>0]; });
  lua_tableset(bit32Table, 'btest', function () { var v=args(arguments),r=0xFFFFFFFF; for(var i=0;i<v.length;i++) r=(r&u32(v[i]))>>>0; return [r!==0]; });
  lua_tableset(bit32Table, 'lshift', function (value, displacement) { var s=shift(displacement); if(s<0) return lua_tableget(bit32Table,'rshift')(value,-s); return [s>=32?0:((u32(value)<<s)>>>0)]; });
  lua_tableset(bit32Table, 'rshift', function (value, displacement) { var s=shift(displacement); if(s<0) return lua_tableget(bit32Table,'lshift')(value,-s); return [s>=32?0:((u32(value)>>>s)>>>0)]; });
  lua_tableset(bit32Table, 'arshift', function (value, displacement) { var s=shift(displacement); if(s<0) return lua_tableget(bit32Table,'lshift')(value,-s); if(s>=32) return [i32(value)<0?0xFFFFFFFF:0]; return [(i32(value)>>s)>>>0]; });
  lua_tableset(bit32Table, 'lrotate', function (value, displacement) { var s=rot(displacement),n=u32(value); return [s?((n<<s)|(n>>>(32-s)))>>>0:n]; });
  lua_tableset(bit32Table, 'rrotate', function (value, displacement) { var s=rot(displacement),n=u32(value); return [s?((n>>>s)|(n<<(32-s)))>>>0:n]; });
  lua_tableset(bit32Table, 'extract', function (value, field, width) { field=Math.trunc(Number(field)||0); width=width==null?1:Math.trunc(Number(width)||0); if(field<0||width<=0||field+width>32) throw new Error('trying to access non-existent bits'); var mask=width===32?0xFFFFFFFF:(Math.pow(2,width)-1)>>>0; return [((u32(value)>>>field)&mask)>>>0]; });
  lua_tableset(bit32Table, 'replace', function (value,replacement,field,width) { field=Math.trunc(Number(field)||0); width=width==null?1:Math.trunc(Number(width)||0); if(field<0||width<=0||field+width>32) throw new Error('trying to access non-existent bits'); var mask=width===32?0xFFFFFFFF:(Math.pow(2,width)-1)>>>0; var shifted=field===0?mask:((mask<<field)>>>0); return [((u32(value)&(~shifted))|(((u32(replacement)&mask)<<field)>>>0))>>>0]; });
  G.str.bit32 = bit32Table;

  var bitTable = G.str.bit;
  if (!bitTable || typeof bitTable !== 'object') bitTable = lua_newtable();
  G.str.bit = bitTable;
  lua_tableset(bitTable,'tobit',function(v){return [i32(v)];});
  lua_tableset(bitTable,'band',function(){var v=args(arguments),r=-1;for(var i=0;i<v.length;i++)r&=i32(v[i]);return[r|0];});
  lua_tableset(bitTable,'bor',function(){var v=args(arguments),r=0;for(var i=0;i<v.length;i++)r|=i32(v[i]);return[r|0];});
  lua_tableset(bitTable,'bxor',function(){var v=args(arguments),r=0;for(var i=0;i<v.length;i++)r^=i32(v[i]);return[r|0];});
  lua_tableset(bitTable,'bnot',function(v){return[(~i32(v))|0];});
  lua_tableset(bitTable,'lshift',function(v,d){return[(i32(v)<<(shift(d)&31))|0];});
  lua_tableset(bitTable,'rshift',function(v,d){return[(u32(v)>>>(shift(d)&31))|0];});
  lua_tableset(bitTable,'arshift',function(v,d){return[(i32(v)>>(shift(d)&31))|0];});
  lua_tableset(bitTable,'rol',function(v,d){return[lua_tableget(bit32Table,'lrotate')(v,d)[0]|0];});
  lua_tableset(bitTable,'ror',function(v,d){return[lua_tableget(bit32Table,'rrotate')(v,d)[0]|0];});
})();

G.str.timer = lua_newtable();
lua_tableset(G.str.timer, 'delay', 0);
lua_tableset(G.str.timer, 'running', false);
lua_tableset(G.str.timer, 'lastrun', 0);
lua_tableset(G.str.timer, 'start', function (t) {
  if (lua_lt(t, 0.01)) lua_call(G.str.error, ['argument needs to be >=0.01']);
  lua_tableset(G.str.timer, 'delay', t);
  lua_tableset(G.str.timer, 'running', true);
  lua_tableset(G.str.timer, 'lastrun', lua_call(lua_tableget(G.str.PCspire, 'getMicroTime'), [])[0]);
  return [];
});
lua_tableset(G.str.timer, 'stop', function () {
  lua_tableset(G.str.timer, 'delay', 0);
  lua_tableset(G.str.timer, 'running', false);
  return [];
});
lua_tableset(G.str.timer, 'getMilliSecCounter', function () {
  return [lua_multiply(lua_call(lua_tableget(G.str.PCspire, 'getMicroTime'), [])[0], 1000)];
});

dotimer = function () {
  var tm = lua_call(lua_tableget(G.str.PCspire, 'getMicroTime'), [])[0];
  if (lua_true(lua_tableget(G.str.timer,'running')) && lua_lte(lua_add(lua_tableget(G.str.timer,'delay'), lua_tableget(G.str.timer,'lastrun')), tm)) {
    lua_tableset(G.str.timer,'lastrun',tm);
    lua_call(lua_tableget(G.str.PCspire,'callEvent'), [lua_tableget(G.str.on,'timer')]);
  }
  return [];
};

// TI-Nspire document/CAS bridge. It is installed after app.js has attached
// var.store, var.recall and math.eval, but before runtime.boot() executes.
(function installTnsDocumentMathBridge() {
  if (typeof window === 'undefined') return;
  var schedule = typeof queueMicrotask === 'function' ? queueMicrotask : function (fn) { Promise.resolve().then(fn); };

  function isTiPreview() {
    try {
      var log = document.getElementById('love-preview-log');
      if (!log) return true;
      var text = String(log.textContent || '');
      return /TI[- ]Nspire code detected|Codigo TI[- ]Nspire detectado|Code TI[- ]Nspire/i.test(text);
    } catch (_error) { return true; }
  }

  schedule(function () {
    if (!isTiPreview() || !G || !G.str || !G.str.math || !G.str.var) return;
    var mathTable = G.str.math;
    var varTable = G.str.var;
    var originalEval = lua_tableget(mathTable, 'eval');
    var recallFn = lua_tableget(varTable, 'recall');
    var storeFn = lua_tableget(varTable, 'store');
    if (typeof originalEval !== 'function') return;

    function recall(name) {
      try { return lua_call(recallFn,[name])[0]; } catch (_error) { return G.str[name]; }
    }
    function store(name,value) {
      if (typeof storeFn === 'function') {
        try { lua_call(storeFn,[name,value]); } catch (_error) { G.str[name]=value; }
      } else G.str[name]=value;
      return value;
    }
    function len(value) {
      if (value == null) return 0;
      try { return Number(lua_len(value)) || 0; } catch (_error) {}
      if (Array.isArray(value) || typeof value === 'string') return value.length;
      return 0;
    }
    function makeMatrix(rows,cols,fill) {
      rows=Math.max(0,Math.min(1024,Math.trunc(Number(rows)||0)));
      cols=Math.max(0,Math.min(1024,Math.trunc(Number(cols)||0)));
      var outer=lua_newtable();
      for(var r=1;r<=rows;r++) {
        var line=lua_newtable();
        for(var c=1;c<=cols;c++) lua_tableset(line,c,fill==null?0:fill);
        lua_tableset(outer,r,line);
      }
      return outer;
    }
    function splitArgs(text) {
      var parts=[],cur='',depth=0,quote='';
      text=String(text||'');
      for(var i=0;i<text.length;i++) {
        var ch=text.charAt(i);
        if(quote){cur+=ch;if(ch==='\\'){if(i+1<text.length)cur+=text.charAt(++i);}else if(ch===quote)quote='';continue;}
        if(ch==='"'||ch==="'"){quote=ch;cur+=ch;continue;}
        if(ch==='('||ch==='['||ch==='{')depth++; else if(ch===')'||ch===']'||ch==='}')depth--;
        if(ch===','&&depth===0){parts.push(cur.trim());cur='';}else cur+=ch;
      }
      parts.push(cur.trim()); return parts;
    }

    var stagedDefs = Object.create(null);
    function localName(node) { return String(node && node.localName || node && node.nodeName || '').replace(/^.*:/,''); }
    function collectStagedFuncs() {
      var candidates=[];
      try {
        if (typeof xmlDoctor !== 'undefined' && xmlDoctor && Array.isArray(xmlDoctor.candidates)) candidates=xmlDoctor.candidates;
      } catch (_error) {}
      if (!candidates.length && window.xmlDoctor && Array.isArray(window.xmlDoctor.candidates)) candidates=window.xmlDoctor.candidates;
      for(var i=0;i<candidates.length;i++) {
        var item=candidates[i];
        if(!item || item.type!=='Func') continue;
        var name=String(item.name||'').trim();
        var params=String(item.detail && item.detail.parameters || '').trim();
        var body='';
        try {
          var doc=new DOMParser().parseFromString(String(item.raw_xml||''),'application/xml');
          var all=doc.documentElement ? doc.documentElement.children : [];
          for(var j=0;j<all.length;j++) {
            var n=localName(all[j]);
            if(n==='n' && all[j].textContent.trim()) name=all[j].textContent.trim();
            else if(n==='p') params=all[j].textContent||'';
            else if(n==='v') body=all[j].textContent||'';
          }
        } catch (_error) {}
        if(name && body) stagedDefs[name]={params:params,body:body};
      }
    }
    collectStagedFuncs();

    function splitStatements(body) {
      var text=String(body||'').replace(/\r\n?/g,'\n')
        .replace(/^\s*Func\b\s*:?[ \t]*/i,'')
        .replace(/:?[ \t]*EndFunc\s*$/i,'');
      var out=[],cur='';
      for(var i=0;i<text.length;i++) {
        var ch=text.charAt(i);
        if(ch==='\n' || (ch===':' && text.charAt(i+1)!=='=')) {
          if(cur.trim()) out.push(cur.trim()); cur='';
        } else cur+=ch;
      }
      if(cur.trim()) out.push(cur.trim());
      return out;
    }
    function evalExpression(expr,scope,depth) {
      expr=String(expr||'').trim().replace(/\^/g,'**');
      var names=Object.keys(scope).filter(function(n){return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n);});
      var values=names.map(function(n){return scope[n];});
      var funcNames=Object.keys(stagedDefs).filter(function(n){return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n);});
      var funcValues=funcNames.map(function(n){return function(){return evalFunc(stagedDefs[n],Array.prototype.slice.call(arguments),depth+1);};});
      try {
        return Function.apply(null,names.concat(funcNames,['sqrt','sin','cos','tan','abs','exp','ln','PI','"use strict"; return ('+expr+');']))
          .apply(null,values.concat(funcValues,[Math.sqrt,Math.sin,Math.cos,Math.tan,Math.abs,Math.exp,Math.log,Math.PI]));
      } catch (_error) {
        var simple=Number(expr); return Number.isFinite(simple)?simple:0;
      }
    }
    function evalFunc(def,args,depth) {
      if(depth>20) throw new Error('TI Func recursion limit');
      var scope={};
      var params=String(def.params||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
      for(var i=0;i<params.length;i++) scope[params[i]]=args[i];
      var statements=splitStatements(def.body), last=0;
      for(var j=0;j<statements.length;j++) {
        var s=statements[j];
        var local=/^Local\s+(.+)$/i.exec(s);
        if(local){local[1].split(',').forEach(function(n){n=n.trim();if(n)scope[n]=0;});continue;}
        var ret=/^Return\s+(.+)$/i.exec(s);
        if(ret) return evalExpression(ret[1],scope,depth);
        var assign=/^([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*(.+)$/.exec(s);
        if(assign){scope[assign[1]]=evalExpression(assign[2],scope,depth);last=scope[assign[1]];continue;}
        last=evalExpression(s,scope,depth);
      }
      return last;
    }

    Object.keys(stagedDefs).forEach(function(name){
      G.str[name]=function(){return [evalFunc(stagedDefs[name],Array.prototype.slice.call(arguments),0)];};
    });

    function numeric(text) {
      var expr=String(text||'').trim();
      expr=expr.replace(/dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/gi,function(_m,n){return String(len(recall(n)));});
      expr=expr.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g,function(n){var v=recall(n);return typeof v==='number'&&Number.isFinite(v)?String(v):n;});
      expr=expr.replace(/\^/g,'**');
      if(!/^[0-9eE+\-*/().\s]+$/.test(expr))return NaN;
      try{return Number(Function('"use strict";return ('+expr+')')());}catch(_error){return NaN;}
    }

    var compatibleEval=function(expr){
      var source=String(expr==null?'':expr).trim(),m;
      m=/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/.exec(source);
      if(m && stagedDefs[m[1]]) {
        var raw=splitArgs(m[2]);
        var vals=raw.map(function(x){var n=numeric(x);return Number.isFinite(n)?n:x.replace(/^['"]|['"]$/g,'');});
        return [evalFunc(stagedDefs[m[1]],vals,0)];
      }
      m=/^NewMat\s*\((.*)\)$/i.exec(source);
      if(m){var a=splitArgs(m[1]),rows=numeric(a[0]),cols=numeric(a[1]);if(Number.isFinite(rows)&&Number.isFinite(cols))return[makeMatrix(rows,cols,0)];}
      m=/^dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/i.exec(source); if(m)return[len(recall(m[1]))];
      m=/^mod\s*\((.*)\)$/i.exec(source); if(m){var ma=splitArgs(m[1]),x=numeric(ma[0]),y=numeric(ma[1]);if(Number.isFinite(x)&&Number.isFinite(y)&&y!==0)return[((x%y)+y)%y];}
      m=/^intDiv\s*\((.*)\)$/i.exec(source); if(m){var ia=splitArgs(m[1]),d=numeric(ia[0]),v=numeric(ia[1]);if(Number.isFinite(d)&&Number.isFinite(v)&&v!==0)return[Math.floor(d/v)];}
      m=/^DelVar\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(source); if(m){store(m[1],null);G.str[m[1]]=null;return[null];}

      var vars=recall('v'),count=Math.max(1,Math.min(8,len(vars)||1));
      if(/newMat\s*\([^)]*\)\s*=\s*:kar/i.test(source)||/\b:kar\b/i.test(source)){
        var kar=makeMatrix(Math.pow(2,Math.floor(count/2)),Math.pow(2,Math.ceil(count/2)),0);store('kar',kar);G.str.kar=kar;return[kar];
      }
      if(/newMat\s*\([^)]*\)\s*=\s*:tbg/i.test(source)||/\b:tbg\b/i.test(source)){
        var tbg=makeMatrix(Math.pow(2,count),count+1,0);store('tbg',tbg);G.str.tbg=tbg;store('tb',tbg);G.str.tb=tbg;return[tbg];
      }
      if(/newMat\s*\([^)]*\)\s*=\s*:tb/i.test(source)||/\b:tb\b/i.test(source)){
        var tb=makeMatrix(Math.pow(2,count)+1,count+1,0);store('tb',tb);G.str.tb=tb;return[tb];
      }
      return lua_call(originalEval,[expr]);
    };
    compatibleEval.__tnsMathCompat=true;
    compatibleEval.__tnsMathBase=originalEval;
    lua_tableset(mathTable,'eval',compatibleEval);

    var baseSet=window.lua_tableset;
    if(typeof baseSet==='function' && !baseSet.__tnsTiSafeSet){
      var safeSet=function(table,key,value){
        if(Array.isArray(table) && typeof key==='number' && Number.isInteger(key)){table[key-1]=value;return value;}
        if(table && typeof table==='object' && table.str===undefined && table.uints===undefined){table[key]=value;return value;}
        return baseSet(table,key,value);
      };
      safeSet.__tnsTiSafeSet=true; window.lua_tableset=safeSet;
      try{lua_tableset=safeSet;}catch(_error){}
    }

    window.__tnsTiDocumentBridgeActive=true;
  });
})();
