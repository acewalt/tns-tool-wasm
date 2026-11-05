// Run the Python syntax suite with the same offline Python used by the desktop.
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..'),vendor=path.resolve(root,'../portable-0.1.27/desktop/vendor/pyodide');
  globalThis.require=require;globalThis.__dirname=vendor;
  require(path.join(vendor,'pyodide.js'));
  const py=await globalThis.loadPyodide({indexURL:vendor+path.sep});
  py.FS.mkdirTree('/project/editor_XML');py.FS.mkdirTree('/project/tests');
  for(const name of ['examples/cx-ii-drawing-test.tib','assets/math-tools/catalog-hierarchy.json']){
    py.FS.mkdirTree('/project/'+path.dirname(name));
    py.FS.writeFile('/project/'+name,fs.readFileSync(path.join(root,name)));
  }
  for(const name of ['ti_catalog.py','ti_syntax.py'])py.FS.writeFile('/project/editor_XML/'+name,fs.readFileSync(path.join(root,'editor_XML',name)));
  for(const name of fs.readdirSync(path.join(root,'tests')).filter(n=>/^test_(?:ti_.*|prgm_drawing_syntax)\.py$/.test(n)))py.FS.writeFile('/project/tests/'+name,fs.readFileSync(path.join(root,'tests',name)));
  if(process.argv[2])py.globals.set('reference_source',fs.readFileSync(process.argv[2],'utf8'));
  const result=JSON.parse(await py.runPythonAsync(`import sys,json,unittest,io
sys.path.insert(0,'/project/editor_XML')
from ti_syntax import analyze_ti_code,autofix_ti_code,_program_scopes,_split_lines
suite=unittest.defaultTestLoader.discover('/project/tests',pattern='test_*.py')
stream=io.StringIO()
result=unittest.TextTestRunner(stream=stream,verbosity=1).run(suite)
reference=analyze_ti_code(reference_source) if 'reference_source' in globals() else None
fixed=autofix_ti_code(reference_source)[0] if reference else None
fixed_report=analyze_ti_code(fixed) if reference else None
def structure(source):
    return [(s['name'],s['kind'],s['params']) for s in _program_scopes(_split_lines(source))[0]]
preserved=structure(reference_source)==structure(fixed) if reference else True
json.dumps({'ok':result.wasSuccessful() and (not reference or not reference.errors) and (not fixed_report or not fixed_report.errors) and preserved,'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'log':stream.getvalue(),'reference':{'lines':len(reference_source.splitlines()),'errors':[{'line':d.line,'code':d.code,'message':d.message} for d in reference.errors],'autofixErrors':[{'line':d.line,'code':d.code,'message':d.message} for d in fixed_report.errors],'autofixStructurePreserved':preserved} if reference else None},ensure_ascii=False)`));
  console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;});
