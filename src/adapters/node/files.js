import fs from "node:fs/promises";

export async function readTextInput(inputPath) {
  if (inputPath === "-") return readStdin();
  return fs.readFile(inputPath, "utf8");
}

export async function readJsonInput(inputPath) {
  const text = await readTextInput(inputPath);
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

