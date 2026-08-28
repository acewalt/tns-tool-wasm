const assert = require('assert');
const core = require('../ndless-project-core.js');

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

const broken = core.createProject({ name: 'Broken', language: 'c' });
broken.files['main.c'] = '#include <os.h>\nvoid helper(void) {}\n';
assert.equal(core.validateProject(broken).valid, false);

console.log('PASS Ndless project generation, import/export, validation and preview');
