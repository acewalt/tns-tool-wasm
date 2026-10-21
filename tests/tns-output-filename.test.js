import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = app.indexOf("function normalizeTnsOutputFileName(");
const end = app.indexOf("function tiDocumentNameError(", start);
assert.ok(start >= 0 && end > start, "Filename helpers must exist");

const input = { value: "documento.tns" };
const context = {
  xmlDoctor: { outputFileName: "documento.tns", current: { program_name: "interno", index: 7 } },
  document: { querySelector: (selector) => selector === "#xml-output-filename" ? input : null },
};
vm.runInNewContext(app.slice(start, end), context);

for (const [name, expected] of [
  ["Mi Proyecto.tns", "Mi Proyecto.tns"],
  ["mi proyecto", "mi proyecto.tns"],
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
assert.equal(input.value, "Calculadora.tns");
assert.equal(context.xmlDoctor.current.program_name, "interno", "Document Settings must not change");
assert.equal(context.xmlDoctorTnsOutputName(), "Calculadora.tns");
context.xmlDoctor.current = { program_name: "otro_programa", index: 1 };
assert.equal(context.xmlDoctorTnsOutputName(), "Calculadora.tns", "Page selection must not rename exports");
context.setXmlTnsOutputFileName("Archivo importado.tns");
assert.equal(context.xmlDoctorTnsOutputName(), "Archivo importado.tns");
assert.match(html, /id="xml-output-filename"/);
console.log("Editable TNS export filename tests passed.");
