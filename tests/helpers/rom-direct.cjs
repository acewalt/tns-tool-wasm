const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function load(system,options={}){
 return require('../../desktop/rom-core.cjs').load(system,options,path.resolve(__dirname,'../../desktop/vendor/rom'));
}
module.exports={load};
