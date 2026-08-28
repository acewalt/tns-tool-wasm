let sdkPromise = null;
let clangPackage = null;
let armSupport = null;

const SDK_URL = "https://unpkg.com/@wasmer/sdk@latest/dist/index.mjs";

function progress(stage, message, extra = {}) {
  postMessage({ type: "progress", stage, message, ...extra });
}

async function loadSdk() {
  if (!sdkPromise) sdkPromise = import(SDK_URL).then(async mod => { await mod.init(); return mod; });
  return sdkPromise;
}

async function getClang() {
  const sdk = await loadSdk();
  if (!clangPackage) {
    progress("preparing", "Downloading browser Clang toolchain…");
    clangPackage = await sdk.Wasmer.fromRegistry("clang/clang");
  }
  if (armSupport == null) {
    progress("preparing", "Checking ARM32 backend…");
    const proc = await clangPackage.entrypoint.run({ args: ["--print-targets"] });
    const out = await proc.wait();
    const text = `${out.stdout || ""}\n${out.stderr || ""}`;
    armSupport = out.ok && /(^|\s)arm\s+-/im.test(text);
    if (!armSupport) {
      const error = new Error("The browser Clang package does not expose the ARM backend required for arm-none-eabi.");
      error.code = "ARM_BACKEND_UNAVAILABLE";
      error.details = text.trim();
      throw error;
    }
  }
  return { sdk, clang: clangPackage };
}

function safePath(value) {
  const parts = String(value || "").replace(/\\/g, "/").split("/").filter(Boolean);
  const clean = [];
  for (const part of parts) {
    if (part === "." || !part) continue;
    if (part === ".." || part.includes("\0")) throw new Error(`Unsafe project path: ${value}`);
    clean.push(part.replace(/[<>:"|?*]/g, "_"));
  }
  return clean.join("/");
}

async function ensureParents(dir, path) {
  const parts = path.split("/");
  parts.pop();
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try { await dir.createDir(current); } catch (_) {}
  }
}

const LD_SCRIPT = `ENTRY(_start)
SECTIONS {
  .text 0x0 : {
    _start = .;
    KEEP(*(.text.startup))
    *(.text)
    *(.text.*)
    KEEP(*(SORT_BY_INIT_PRIORITY(.init_array.*)))
    KEEP(*(.init_array))
    KEEP(*(.fini_array))
  }
  .got : {
    *(.got.plt*)
    *(.got)
    LONG(0xFFFFFFFF)
  }
  .data : {
    *(.rodata*)
    *(.data*)
    KEEP(*(.genzehn))
  }
  .ARM.extab : { KEEP(*(.ARM.extab* .gnu.linkonce.armextab.*)) }
  PROVIDE_HIDDEN(__exidx_start = .);
  .ARM.exidx : { KEEP(*(.ARM.exidx* .gnu.linkonce.armexidx.*)) }
  PROVIDE_HIDDEN(__exidx_end = .);
  .eh_frame : { KEEP(*(.eh_frame)) }
  .bss : {
    PROVIDE(__bss_start = .);
    *(.bss*)
    *(COMMON)
    PROVIDE(_end = .);
  }
}
`;

const CRT0 = `.syntax unified
.arm
.section .text.startup,"ax",%progbits
.global _start
.type _start,%function
_start:
    push {r4-r11, lr}
    bl main
    pop {r4-r11, pc}
.size _start, .-_start
`;

function diagnosticsFromText(text) {
  const result = [];
  const re = /(?:^|\n)([^\n:]+):(\d+):(\d+):\s+(fatal error|error|warning|note):\s*([^\n]+)/g;
  for (let m; (m = re.exec(String(text || ""))); ) {
    result.push({ file: m[1].replace(/^\/project\//, ""), line: +m[2], column: +m[3], severity: /warning/.test(m[4]) ? "warning" : (/note/.test(m[4]) ? "info" : "error"), message: m[5].trim() });
  }
  return result;
}

async function compileProject(project) {
  const { sdk, clang } = await getClang();
  const dir = new sdk.Directory();
  const files = project?.files || {};
  const sources = Object.keys(files).filter(name => /\.(?:c|cc|cpp|cxx|s|S)$/i.test(name) && !/(^|\/)__ndless_/.test(name));
  if (!sources.length) throw new Error("Project has no C/C++/ARM source files.");

  for (const [rawName, value] of Object.entries(files)) {
    if (typeof value !== "string") continue;
    const name = safePath(rawName);
    if (!name) continue;
    await ensureParents(dir, name);
    await dir.writeFile(`/${name}`, value);
  }
  await dir.writeFile("/__ndless_crt0.S", CRT0);
  await dir.writeFile("/__ndless.ld", LD_SCRIPT);

  const outputName = "/program.elf";
  const args = [
    "--target=arm-none-eabi",
    "-mcpu=arm926ej-s",
    "-marm",
    "-Os",
    "-D_TINSPIRE",
    "-ffreestanding",
    "-fno-builtin",
    "-ffunction-sections",
    "-fdata-sections",
    "-fno-exceptions",
    "-fno-rtti",
    "-nostdlib",
    "-fuse-ld=lld",
    "-I/project",
    "-I/project/include",
    "-Wl,-T,/project/__ndless.ld",
    "-Wl,--emit-relocs",
    "-Wl,--gc-sections",
    "-Wl,--no-undefined",
    "/project/__ndless_crt0.S",
    ...sources.map(name => `/project/${safePath(name)}`),
    "-o", `/project${outputName}`,
  ];

  progress("compiling", `Compiling ${sources.length} source file${sources.length === 1 ? "" : "s"} for ARM926EJ-S…`, { current: 0, total: sources.length });
  const instance = await clang.entrypoint.run({ args, mount: { "/project": dir } });
  const output = await instance.wait();
  const combined = `${output.stdout || ""}${output.stderr ? `\n${output.stderr}` : ""}`.trim();
  if (!output.ok) {
    const error = new Error(combined || `Clang exited with code ${output.code}.`);
    error.code = "COMPILE_FAILED";
    error.diagnostics = diagnosticsFromText(combined);
    error.details = combined;
    throw error;
  }
  progress("linking", "ARM ELF linked successfully.");
  const elf = await dir.readFile(outputName);
  return { elf: new Uint8Array(elf), logs: combined ? combined.split(/\r?\n/) : [], diagnostics: diagnosticsFromText(combined), sourceCount: sources.length, args };
}

self.onmessage = async event => {
  const { id, action, project } = event.data || {};
  try {
    if (action === "prepare") {
      await getClang();
      postMessage({ type: "result", id, result: { ok: true, armSupport: true } });
      return;
    }
    if (action === "build") {
      const result = await compileProject(project);
      postMessage({ type: "result", id, result: { ok: true, elf: result.elf.buffer, logs: result.logs, diagnostics: result.diagnostics, sourceCount: result.sourceCount, args: result.args } }, [result.elf.buffer]);
      return;
    }
    throw new Error(`Unknown build worker action: ${action}`);
  } catch (error) {
    postMessage({ type: "result", id, result: { ok: false, code: error?.code || "BUILD_ERROR", message: error?.message || String(error), details: error?.details || "", diagnostics: error?.diagnostics || [] } });
  }
};
