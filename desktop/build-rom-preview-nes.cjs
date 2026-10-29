// WebAssembly facade for the exact pinned NesNspire CPU, PPU and mapper sources.
const fs=require('node:fs/promises'),path=require('node:path');
async function adapt(work,profile){
 const entry=await fs.readFile(path.join(work,'ndless/InfoNES_System_Ndless.cpp'),'utf8');
 const palette=entry.match(/WORD NesPalette\[64\] = \{[\s\S]*?\n\};/);if(!palette)throw Error('Missing pinned NES palette');
 const filename=path.join(work,'InfoNES.cpp'),source=await fs.readFile(filename,'utf8');
 const marker='    // HSYNC Wait';if(!source.includes(marker))throw Error('Missing NES frame boundary');
 await fs.writeFile(filename,source.replace(marker,'    if (PPU_Scanline == 0) return; // Yield one complete frame to the host.\n'+marker));
 const glue=await fs.readFile(path.join(__dirname,'rom/nes-preview.cpp'),'utf8');
 await fs.writeFile(path.join(work,'preview-main.cpp'),glue.replace('/* PINNED_PALETTE */',palette[0]));
 profile.sources=profile.sources.filter(p=>!p.startsWith('ndless/')).concat('preview-main.cpp');
 profile.defines=profile.defines||[];
}
module.exports={adapt};
