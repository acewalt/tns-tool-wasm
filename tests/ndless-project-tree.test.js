import assert from 'node:assert/strict';
await import('../ndless-project-core.js');
await import('../ndless-project-core-enhancements.js');
await import('../ndless-project-folder-build.js');
await import('../ndless-project-file-tree.js');

const treeApi = globalThis.NdlessProjectFileTree;
const core = globalThis.NdlessProjectCore;
assert.ok(treeApi, 'NdlessProjectFileTree should be exposed globally');
assert.ok(core, 'NdlessProjectCore should be exposed globally');

assert.equal(treeApi.normalizeProjectPath('src\\game\\player.cpp'), 'src/game/player.cpp');
assert.equal(treeApi.normalizeProjectPath('../src/./player.cpp'), 'src/player.cpp');

const tree = treeApi.buildPathTree([
  'Makefile',
  'src/main.cpp',
  'src/game/player.cpp',
  'include/game/player.h',
  'README_BUILD.md',
]);

assert.ok(tree.files.some(file => file.path === 'Makefile'));
assert.ok(tree.folders.src, 'src folder should exist');
assert.ok(tree.folders.src.files.some(file => file.path === 'src/main.cpp'));
assert.ok(tree.folders.src.folders.game.files.some(file => file.path === 'src/game/player.cpp'));
assert.ok(tree.folders.include.folders.game.files.some(file => file.path === 'include/game/player.h'));

const project = core.createProject({ name: 'Folder App', language: 'mixed', target: 'zehn-modern' });
project.files['src/render.cpp'] = 'void render() {}\n';
project.files['src/fast.S'] = '.arm\n';
core.refreshGeneratedFiles(project);
assert.match(project.files.Makefile, /find \. -type f -name '\*\.c'/);
assert.match(project.files.Makefile, /find \. -type f -name '\*\.cpp'/);
assert.match(project.files.Makefile, /find \. -type f -name '\*\.S'/);
assert.match(project.files.Makefile, /CPP_OBJS = \$\(patsubst %\.cpp,%\.o,\$\(CPP_SRCS\)\)/);

console.log('PASS Ndless hierarchical project file tree and recursive build discovery');