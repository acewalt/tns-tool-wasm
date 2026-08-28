import assert from 'node:assert/strict';
await import('../ndless-project-core.js');
await import('../ndless-project-core-enhancements.js');
const core = globalThis.NdlessProjectCore;

assert.ok(core, 'NdlessProjectCore should be exposed globally');
assert.ok(core.PROJECT_LANGUAGES?.asm, 'ARM Assembly project mode should be available');
assert.ok(core.PROJECT_LANGUAGES?.mixed, 'Mixed project mode should be available');

const legacy = core.createProject({ name: 'My App', language: 'c', template: 'basic', target: 'bflt-r903' });
assert.equal(legacy.name, 'My-App');
assert.ok(legacy.files['main.c']);
assert.ok(/nspire-ld-bflt/.test(legacy.files.Makefile));
assert.ok(core.validateProject(legacy).valid);

const modern = core.createProject({ name: 'Game', language: 'cpp', template: 'graphics', target: 'zehn-modern' });
assert.ok(modern.files['main.cpp']);
assert.ok(/genzehn/.test(modern.files.Makefile));
assert.ok(/make-prg/.test(modern.files.Makefile));
assert.ok(core.validateProject(modern).valid);

const asm = core.createProject({ name: 'Asm App', language: 'asm', target: 'bflt-r903' });
assert.equal(asm.language, 'asm');
assert.ok(asm.files['main.S']);
assert.match(asm.files['main.S'], /\.global main/);
assert.match(asm.files.Makefile, /nspire-as/);
assert.ok(core.validateProject(asm).valid);

const mixed = core.createProject({ name: 'Mixed App', language: 'mixed', template: 'basic', target: 'zehn-modern' });
assert.equal(mixed.language, 'mixed');
assert.ok(mixed.files['main.c']);
assert.ok(mixed.files['helper.S']);
assert.ok(core.validateProject(mixed).valid);

const preview = core.previewFromSource(modern.files['main.cpp']);
assert.equal(preview.width, 320);
assert.equal(preview.height, 240);
assert.ok(preview.commands.some(cmd => cmd.type === 'text' && /Hello Ndless/.test(cmd.text)));
assert.ok(preview.commands.some(cmd => cmd.type === 'clear'));

const roundTrip = core.importEntries(core.exportEntries(modern));
assert.equal(roundTrip.name, modern.name);
assert.equal(roundTrip.target, modern.target);
assert.equal(roundTrip.language, modern.language);
assert.ok(roundTrip.files['main.cpp']);

const asmRoundTrip = core.importEntries(core.exportEntries(asm));
assert.equal(asmRoundTrip.language, 'asm');
assert.ok(asmRoundTrip.files['main.S']);
assert.ok(core.validateProject(asmRoundTrip).valid);

const broken = core.createProject({ name: 'Broken', language: 'c' });
broken.files['main.c'] = '#include <os.h>\nvoid helper(void) {}\n';
assert.equal(core.validateProject(broken).valid, false);

console.log('PASS Ndless project generation, ARM/mixed modes, import/export, validation and preview');