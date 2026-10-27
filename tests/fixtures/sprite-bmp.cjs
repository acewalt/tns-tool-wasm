module.exports=function sprite(){
 const width=8,height=8,stride=24,out=Buffer.alloc(54+stride*height);
 out.write('BM');out.writeUInt32LE(out.length,2);out.writeUInt32LE(54,10);out.writeUInt32LE(40,14);out.writeInt32LE(width,18);out.writeInt32LE(height,22);out.writeUInt16LE(1,26);out.writeUInt16LE(24,28);out.writeUInt32LE(stride*height,34);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=54+(height-1-y)*stride+x*3,inside=Math.abs(x-3.5)+Math.abs(y-3.5)<5;out[at]=inside?65:255;out[at+1]=inside?205:0;out[at+2]=inside?245:255;}
 return new Uint8Array(out);
};
