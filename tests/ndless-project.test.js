import assert from 'node:assert/strict';
await import('../ndless-project-core.js');
await import('../ndless-project-core-enhancements.js');
await import('../ndless-framebuffer-preview.js');
const core = globalThis.NdlessProjectCore;

assert.ok(core, 'NdlessProjectCore should be exposed globally');
assert.ok(core.PROJECT_LANGUAGES?.asm, 'ARM Assembly project mode should be available');
assert.ok(core.PROJECT_LANGUAGES?.mixed, 'Mixed project mode should be available');
assert.equal(core.__framebufferPreviewV1, true, 'RGB565 framebuffer preview extension should be installed');

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

const nativeFramebufferSource = `
#include <stdio.h>
#define SCREEN_BASE_PTR 0xC0000010
void setBufPixel(unsigned short *buf, int x, int y, unsigned short color) { buf[y * 320 + x] = color; }
int main(void) { printf("debug text that must not become LCD pixels\\n"); return 0; }
`;
const nativePreview = core.previewFromSource(nativeFramebufferSource);
assert.equal(nativePreview.mode, 'framebuffer-native');
assert.equal(nativePreview.width, 320);
assert.equal(nativePreview.height, 240);
assert.equal(nativePreview.commands.filter(cmd => cmd.type === 'text').length, 0, 'native framebuffer logs must not be rendered as screen text');
assert.match(nativePreview.warnings[0], /framebuffer/i);

const framebufferBytes = new Array(320 * 240 * 2).fill(0);
framebufferBytes[0] = 0x00;
framebufferBytes[1] = 0xF8; // RGB565 0xF800 = red
const staticFramebufferSource = `
#define SCREEN_BASE_PTR 0xC0000010
#define SCREEN_SIZE (320*240*2)
unsigned char sscreen[SCREEN_SIZE]={${framebufferBytes.join(',')}};
void setScreen(unsigned short *buf) { (void)buf; }
`;
const staticPreview = core.previewFromSource(staticFramebufferSource);
assert.equal(staticPreview.mode, 'framebuffer-static');
assert.equal(staticPreview.framebuffer.name, 'sscreen');
assert.equal(staticPreview.framebuffer.bytes.length, 320 * 240 * 2);
assert.deepEqual(core.rgb565ToRgb(0xF800), [255, 0, 0]);
assert.ok(staticPreview.commands.some(cmd => cmd.type === 'text' && cmd.text.startsWith(globalThis.NdlessFramebufferPreview.MARKER)));
assert.ok(!staticPreview.commands.some(cmd => /debug text/.test(String(cmd.text || ''))));

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

console.log('PASS Ndless project generation, ARM/mixed modes, import/export, validation and framebuffer preview');