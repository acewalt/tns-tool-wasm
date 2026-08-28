(() => {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const base = root.NdlessProjectCore;
  if (!base || base.__folderBuildV1) return;

  function recursiveMakefileFor(project) {
    let text = String(base.makefileFor(project));
    text = text
      .replace(/C_OBJS = \$\(patsubst %\.c,%\.o,\$\(wildcard \*\.c\)\)/,
        "C_SRCS = $(shell find . -type f -name '*.c')\nC_OBJS = $(patsubst %.c,%.o,$(C_SRCS))")
      .replace(/CPP_OBJS = \$\(patsubst %\.cpp,%\.o,\$\(wildcard \*\.cpp\)\)/,
        "CPP_SRCS = $(shell find . -type f -name '*.cpp')\nCPP_OBJS = $(patsubst %.cpp,%.o,$(CPP_SRCS))")
      .replace(/ASM_OBJS = \$\(patsubst %\.S,%\.o,\$\(wildcard \*\.S\)\)/,
        "ASM_SRCS = $(shell find . -type f -name '*.S')\nASM_OBJS = $(patsubst %.S,%.o,$(ASM_SRCS))")
      .replace(/\trm -f \*\.o \*\.elf \*\.gdb \$\(EXE\)\.tns \$\(EXE\)\.tns\.zehn/,
        "\tfind . -type f -name '*.o' -delete\n\trm -f *.elf *.gdb $(EXE).tns $(EXE).tns.zehn")
      .replace(/\trm -f \*\.o \*\.elf \*\.gdb \$\(EXE\)/,
        "\tfind . -type f -name '*.o' -delete\n\trm -f *.elf *.gdb $(EXE)");
    return text;
  }

  function refreshGeneratedFiles(project) {
    project.files.Makefile = recursiveMakefileFor(project);
    project.files["README_BUILD.md"] = base.buildReadme(project);
    return project;
  }

  function createProject(options = {}) {
    const project = base.createProject(options);
    return refreshGeneratedFiles(project);
  }

  function importEntries(entries) {
    const project = base.importEntries(entries);
    return refreshGeneratedFiles(project);
  }

  function exportEntries(project) {
    refreshGeneratedFiles(project);
    return { ".tnsproject.json": base.manifest(project), ...project.files };
  }

  root.NdlessProjectCore = Object.freeze({
    ...base,
    __folderBuildV1: true,
    makefileFor: recursiveMakefileFor,
    refreshGeneratedFiles,
    createProject,
    importEntries,
    exportEntries,
  });
})();