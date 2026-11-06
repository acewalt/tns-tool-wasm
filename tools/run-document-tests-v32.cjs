const fs=require('fs'),path=require('path');
(async()=>{const root=path.resolve(__dirname,'..'),vendor=path.resolve(root,'../portable-0.1.27/desktop/vendor/pyodide');globalThis.require=require;globalThis.__dirname=vendor;require(path.join(vendor,'pyodide.js'));const py=await globalThis.loadPyodide({indexURL:vendor+path.sep});
for(const folder of ['editor_XML','tests','templates/blank_tns_xml']){py.FS.mkdirTree('/project/'+folder);for(const name of fs.readdirSync(path.join(root,folder))){const file=path.join(root,folder,name);if(fs.statSync(file).isFile()&&(folder==='tests'?name==='test_program_editor_visibility.py':folder==='editor_XML'?name.endsWith('.py'):name==='Problem1.xml'))py.FS.writeFile('/project/'+folder+'/'+name,fs.readFileSync(file));}}
const result=await py.runPythonAsync(`import sys,unittest,io,json
sys.path.insert(0,'/project/editor_XML')
stream=io.StringIO()
r=unittest.TextTestRunner(stream=stream).run(unittest.defaultTestLoader.discover('/project/tests',pattern='test_program_editor_visibility.py'))
json.dumps({'ok':r.wasSuccessful(),'tests':r.testsRun,'log':stream.getvalue()})`);const report=JSON.parse(result);console.log(JSON.stringify(report,null,2));process.exitCode=report.ok?0:1;})().catch(e=>{console.error(e);process.exit(1);});
