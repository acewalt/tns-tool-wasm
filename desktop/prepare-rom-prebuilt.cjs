// Reproducible preview artifacts built only from the pinned public emulator
// sources. Hashes prevent a stale or incomplete core entering a release.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function prepare(){const root=path.join(__dirname,'rom/prebuilt'),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),dest=path.join(__dirname,'vendor/rom');await fs.mkdir(dest,{recursive:true});for(const file of manifest.files){if(!/^(nes|snes|gba|nds|n64)-preview\.(js|wasm)$/.test(file.name))throw Error('Invalid preview asset name');const bytes=await fs.readFile(path.join(root,file.name));if(bytes.length!==file.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('ROM preview artifact SHA256 mismatch: '+file.name);await fs.writeFile(path.join(dest,file.name),bytes);}return{previewAssets:manifest.files.length,romsBundled:0};}
module.exports={prepare};
if(require.main===module)prepare().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
