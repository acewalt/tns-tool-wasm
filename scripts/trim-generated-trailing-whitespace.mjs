import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("Usage: node scripts/trim-generated-trailing-whitespace.mjs <file...>");
  process.exit(1);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const cleaned = text.replace(/[ \t]+$/gm, "");

  if (cleaned !== text) {
    writeFileSync(file, cleaned, "utf8");
  }
}
