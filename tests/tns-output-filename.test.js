import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const start = app.indexOf("function normalizeTnsOutputFileName(");
const end = app.indexOf("function tiDocumentNameError(", start);
assert.ok(start >= 0 && end > start, "Filename helpers must exist");

class FilenameNode extends EventTarget {
  constructor(properties = {}) { super(); Object.assign(this, properties); }
  focus() { this.focused = true; }
  select() { this.selectionStart = 0; this.selectionEnd = this.value.length; }
  blur() { this.focused = false; this.dispatchEvent(new Event("blur")); }
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.selectionStart = this.selectionEnd = start + text.length;
  }
}
const input = new FilenameNode({ value: "documento", hidden: true });
const display = new FilenameNode({ textContent: "documento.tns", hidden: false, disabled: false });
const editor = { hidden: true };
const context = {
  xmlDoctor: { outputFileName: "documento.tns", current: { program_name: "interno", index: 7 } },
  document: { querySelector: (selector) =>
    selector === "#xml-output-filename" ? input :
    selector === "#xml-output-filename-display" ? display :
    selector === "#xml-output-filename-editor" ? editor : null },
};
vm.runInNewContext(app.slice(start, end), context);

for (const [name, expected] of [
  ["Mi Proyecto.tns", "Mi Proyecto.tns"],
  ["mi proyecto", "mi proyecto.tns"],
  ["mi proyecto.TNS.tns", "mi proyecto.tns"],
  ["CON.tns", "_CON.tns"],
  ["abc/def?.tns", "abc_def_.tns"],
  ["", "documento.tns"],
  ["..", "documento.tns"],
  ["nombre_mas_largo_de_quince_caracteres", "nombre_mas_largo_de_quince_caracteres.tns"],
]) {
  assert.equal(context.normalizeTnsOutputFileName(name), expected);
}
assert.equal(context.setXmlTnsOutputFileName("Calculadora.lua"), "Calculadora.tns");
assert.equal(context.xmlDoctor.outputFileName, "Calculadora.tns");
assert.equal(input.value, "Calculadora");
assert.equal(display.textContent, "Calculadora.tns");
assert.equal(context.xmlDoctor.current.program_name, "interno", "Document Settings must not change");
assert.equal(context.xmlDoctorTnsOutputName(), "Calculadora.tns");
context.xmlDoctor.current = { program_name: "otro_programa", index: 1 };
assert.equal(context.xmlDoctorTnsOutputName(), "Calculadora.tns", "Page selection must not rename exports");
context.setXmlTnsOutputFileName("Archivo importado.tns");
assert.equal(context.xmlDoctorTnsOutputName(), "Archivo importado.tns");

context.wireXmlTnsOutputFileName();
const emit = (node, type, properties = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, properties);
  node.dispatchEvent(event);
  return event;
};
emit(display, "click");
assert.equal(editor.hidden, false);
assert.equal(input.hidden, false);
assert.equal(display.hidden, true);
assert.equal(input.focused, true);
assert.equal(input.value.slice(input.selectionStart, input.selectionEnd), "Archivo importado");
assert.ok(!input.value.includes(".tns"), "Select all exposes only the basename");
input.value = "Hoja.lua";
emit(input, "input");
assert.equal(context.xmlDoctor.outputFileName, "Hoja.lua.tns", "Editing never drops the export extension");
assert.ok(emit(input, "keydown", { key: "Enter" }).defaultPrevented);
assert.equal(display.textContent, "Hoja.lua.tns");
assert.equal(input.value, "Hoja.lua");
assert.equal(editor.hidden, true);
assert.equal(display.hidden, false);

emit(display, "click");
input.value = "Cambio sin guardar";
emit(input, "input");
assert.ok(emit(input, "keydown", { key: "Escape" }).defaultPrevented);
assert.equal(context.xmlDoctor.outputFileName, "Hoja.lua.tns");
assert.equal(display.textContent, "Hoja.lua.tns");
assert.equal(input.value, "Hoja.lua", "Escape restores the complete previous basename");

emit(display, "click");
assert.ok(emit(input, "paste", { clipboardData: { getData: () => "Pegado.TNS" } }).defaultPrevented);
assert.equal(input.value, "Pegado", "Pasting a full filename does not duplicate the fixed extension");
assert.equal(context.xmlDoctor.outputFileName, "Pegado.tns");
input.blur();
assert.equal(display.textContent, "Pegado.tns");

emit(display, "click");
input.value = ""; // Select all + Delete can clear only the input, not its sibling suffix.
emit(input, "input");
input.blur();
assert.equal(display.textContent, "documento.tns");
assert.equal(input.value, "documento");
display.disabled = true;
emit(display, "click");
assert.equal(editor.hidden, true, "An unavailable document cannot enter rename mode");

assert.match(html, /id="xml-output-filename"/);
assert.match(html, /id="xml-output-filename-display"/);
assert.match(html, /<input id="xml-output-filename"[^>]*value="documento"[^>]*\/>\s*<span id="xml-output-filename-suffix">\.tns<\/span>/);
assert.match(css, /#xml-output-filename-suffix\s*\{[^}]*user-select:\s*none/);
assert.doesNotMatch(html, /<span data-i18n="tnsOutputFileName">/);
console.log("TNS filename basename editing and immutable extension tests passed.");
