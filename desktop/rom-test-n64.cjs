// Original MIPS loop diagnostic. No Nintendo boot code or commercial assets.
module.exports=function(){const b=Buffer.alloc(65536);b.writeUInt32BE(0x80371240);b.writeUInt32BE(0x80000400,8);b.write('TNS MIPS DIAGNOSTIC',32);b[62]=69;b.writeUInt32BE(0x1000ffff,0x40);return b;};
