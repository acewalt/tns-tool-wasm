import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(process.argv[2] || path.join(root, 'docs/program-editor-menu-reference.md'), 'utf8');
const icons = ['01_rayo.svg','02_guardar_verificar.svg','03_lista.svg','04_if_condicional.svg','05_arriba_abajo.svg','06_entrada_salida.svg','07_numero_decimal.svg','08_direcciones.svg','09_figuras.svg'];
const actions = {
  '1.1':'new','1.2':'open','1.3':'import','1.4':'view','1.5':'copy','1.6':'rename','1.7':'library','1.8':'comment','1.9':'find','1.A':'replace','1.B':'line','1.C':'back','1.D':'close',
  '2.1':'verifyStore','2.2':'verify','2.3':'run',
};
const categories = [];
let category = null, stack = [];
for (const line of source.split(/\r?\n/)) {
  const section = /^## ([1-9])\. (.+)$/.exec(line);
  if (section) {
    category = { id: section[1], label: section[2], icon: icons[Number(section[1])-1], children: [] };
    categories.push(category); stack = []; continue;
  }
  if (/^## /.test(line)) { category = null; continue; }
  if (!category) continue;
  const bullet = /^(\s*)- \*\*(.+?)\*\*(?:\s*→\s*`([^`]*)`)?(.*)$/.exec(line);
  if (!bullet) continue;
  const level = bullet[1].length;
  while (stack.length && stack.at(-1).level >= level) stack.pop();
  const parent = stack.at(-1)?.node || category;
  const numbered = /^([1-9A-Z])\.\s*(.+)$/.exec(bullet[2]);
  const number = numbered?.[1] || String((parent.children?.length || 0) + 1);
  const id = `${parent.id}.${number}`;
  const node = { id, label: numbered?.[2] || bullet[2] };
  if (bullet[3] != null) {
    node.code = bullet[3].replace(/\s*⏎\s*/g, '\n');
    node.kind = /fragmento\/token/.test(bullet[4]) ? 'fragment' : 'command';
  } else if (actions[id]) { node.action = actions[id]; node.kind = 'action'; }
  node.children = [];
  (parent.children ||= []).push(node); stack.push({ level, node });
}
const compact = node => { if (!node.children?.length) delete node.children; else node.children.forEach(compact); };
categories.forEach(compact);
const data = { source: 'docs/program-editor-menu-reference.md', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), categories };
if (categories.length !== 9) throw Error('Expected nine program editor categories');
const leaves = categories.flatMap(function flatten(n) { return n.children?.flatMap(flatten) || [n]; });
if (leaves.some(node => !node.code && !node.action)) throw Error('An editor leaf has no command or action');
fs.writeFileSync(path.join(root, 'assets/program-editor/menu.json'), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ categories: categories.length, leaves: leaves.length, actions: leaves.filter(n=>n.action).length, commands: leaves.filter(n=>n.code).length }));
