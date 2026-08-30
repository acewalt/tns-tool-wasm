const assert = require('node:assert/strict');
const MUnicorn = require('@alexaltea/unicorn-js/arm');

(async () => {
  const uc = await MUnicorn();
  assert.ok(uc && typeof uc.Unicorn === 'function');
  assert.equal(uc.ARCH_ARM, 1);

  const e = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);
  const address = 0x01000000;
  const code = new Uint8Array([
    0x37, 0x00, 0xA0, 0xE3, // mov r0, #0x37
    0x23, 0x10, 0xA0, 0xE3, // mov r1, #0x23
    0x01, 0x20, 0x80, 0xE0, // add r2, r0, r1
  ]);

  try {
    e.mem_map(address, 0x1000, uc.PROT_ALL);
    e.mem_write(address, code);
    e.emu_start(address, address + code.length, 0, 0);
    assert.equal(e.reg_read_i32(uc.ARM_REG_R0) >>> 0, 0x37);
    assert.equal(e.reg_read_i32(uc.ARM_REG_R2) >>> 0, 0x5a);
  } finally {
    e.close();
  }

  console.log('PASS real Unicorn.js ARM 2.1.4 engine smoke test');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
