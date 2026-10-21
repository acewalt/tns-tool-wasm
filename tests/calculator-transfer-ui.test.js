import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = relativePath => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const html = read("../index.html");
const app = read("../app.js");
const ndless = read("../ndless-project-workspace.js");
const transfer = read("../ti-calculator-transfer.js");
const styles = read("../styles.css");
const transferStyles = read("../ti-calculator-transfer.css");

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

// The integrated application is the upstream WebTILP, using its actual TI
// USB/WASM implementation. The old mock USB file browser is no longer present.
assert.match(transfer, /tiplanet\.org\/scripts\/webtilibs\/webtilp\.html/);
assert.match(transfer, /frame\.allow\s*=\s*"usb \*; hid \*; serial \*/);
assert.match(transfer, /frame\.src\s*=\s*WEBTILP_URL/);
assert.match(transfer, /rel="noopener noreferrer"/);
assert.match(transfer, /target="_blank"/);
assert.match(transfer, /data-webtilp-prepare/);
assert.match(transfer, /TnsFileSaveExperimental\?\.buildXmlDoctorArtifact/);
assert.match(transfer, /await createFunction\(\)/);
assert.doesNotMatch(transfer, /api\/files|api\/connect|localhost:8765|Fake TI-Nspire/);
assert.match(transferStyles, /ti-transfer-webtilp-frame/);
new vm.Script(transfer, { filename: "ti-calculator-transfer.js" });

console.log("WebTILP integration and Ndless menu regression checks passed.");
