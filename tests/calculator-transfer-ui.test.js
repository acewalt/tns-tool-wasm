import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../index.html");
const app = read("../app.js");
const ndless = read("../ndless-project-workspace.js");
const transfer = read("../ti-calculator-transfer.js");
const styles = read("../styles.css");

assert.match(html, /id="xml-transfer-calculator-btn"/);
assert.match(html, /class="ti-file-action-separator"/);
assert.match(html, /ti-calculator-transfer\.js/);
assert.match(html, /ti-calculator-transfer\.css/);
assert.match(app, /transferToCalculator: "Transferir a calculadora"/);
assert.match(app, /transferToCalculator: "Transfer to calculator"/);
assert.match(app, /transferToCalculator: "Transférer vers calculatrice"/);

assert.match(ndless, /\.doctor-toolbar > \.tool-menu > \.menu-panel/);
assert.doesNotMatch(ndless, /\.tool-menu:first-of-type/);
assert.match(ndless, /btn\.disabled=true/);
assert.match(ndless, /ndless-project-off-badge/);
assert.match(styles, /xml-output-file-name\[hidden\]/);
assert.match(html, /class="xml-output-file-name" hidden/);

// Transfer module must not invent calculator files or enable screen capture
// before an actual backend announces screenshot support.
assert.match(transfer, /navigator\.usb\.requestDevice/);
assert.match(transfer, /0x0451/);
assert.match(transfer, /0xe012/);
assert.match(transfer, /0xe022/);
assert.match(transfer, /\/api\/files/);
assert.match(transfer, /\/api\/upload/);
assert.match(transfer, /\/api\/download/);
assert.match(transfer, /\/api\/screenshot/);
assert.match(transfer, /state\.screenshot=Boolean\(.*capabilities\?\.screenshot/);
assert.doesNotMatch(transfer, /fakeFiles|mockFiles|sampleFileList/i);

new vm.Script(transfer, { filename: "ti-calculator-transfer.js" });
console.log("Calculator transfer menu and capability tests passed.");
