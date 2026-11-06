(() => {
  "use strict";

  const VERSION = 1;
  const TARGETS = Object.freeze({
    "bflt-r903": { id:"bflt-r903", label:"Legacy bFLT · Ndless 3.1", output:"bFLT v4", sdk:"Ndless 3.1 SDK" },
    "zehn-modern": { id:"zehn-modern", label:"Modern Zehn", output:"Zehn", sdk:"Modern Ndless SDK" },
  });
  const TEMPLATES = Object.freeze({
    basic: { label:"Basic", description:"Minimal Ndless program with a text output." },
    graphics: { label:"Graphics (nSDL)", description:"320×240 nSDL screen with a drawable preview." },
    console: { label:"Console", description:"Simple text-console starter." },
  });

  const sanitizeProjectName = value => {
    const clean = String(value || "ndless-app").trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return clean || "ndless-app";
  };
  const sourceExt = language => language === "cpp" ? ".cpp" : ".c";
  const sourceName = language => `main${sourceExt(language)}`;

  function starterSource(language="c", template="basic") {
    const cpp = language === "cpp";
    if (template === "console") {
      return `#define OLD_SCREEN_API\n#include <libndls.h>\n#include <nspireio2.h>\n\nint main(void) {\n    nio_console console;\n    lcd_ingray();\n    clrscr();\n    nio_InitConsole(&console, 53, 29, 0, 0, 0, 15);\n    nio_DrawConsole(&console);\n    nio_printf(&console, \"Ndless project ready!\\n\");\n    nio_printf(&console, \"Press a key to exit.\");\n    wait_key_pressed();\n    nio_CleanUp(&console);\n    return 0;\n}\n`;
    }
    // printf writes to stdout; it does not create an on-screen console.
    // Use the SDK's SDL video path so new hardware needs no legacy framebuffer.
    const graphics = template === "graphics";
    const text = cpp && !graphics ? "Hello from C++ Ndless!" : "Hello Ndless!";
    return `#include <os.h>
#include <SDL/SDL.h>

int main(void) {
    if (SDL_Init(SDL_INIT_VIDEO) < 0) return 1;
    SDL_Surface *screen = SDL_SetVideoMode(320, 240, has_colors ? 16 : 8, SDL_SWSURFACE);
    if (!screen) { SDL_Quit(); return 1; }
    nSDL_Font *font = nSDL_LoadFont(NSDL_FONT_TINYTYPE, ${graphics ? "235, 245, 255" : "29, 43, 61"});
    if (!font) { SDL_Quit(); return 1; }

    SDL_FillRect(screen, NULL, SDL_MapRGB(screen->format, ${graphics ? "18, 34, 48" : "184, 200, 222"}));
    nSDL_DrawString(screen, font, 20, 22, "${text}");
${graphics ? '    nSDL_DrawString(screen, font, 20, 48, "Edit me in Monaco");\n' : ''}    nSDL_DrawString(screen, font, 20, 78, "Press ESC to exit.");
    SDL_Flip(screen);

    SDL_Event event;
    int done = 0;
    while (!done && SDL_WaitEvent(&event)) {
        if (event.type == SDL_QUIT ||
            (event.type == SDL_KEYDOWN && event.key.keysym.sym == SDLK_ESCAPE))
            done = 1;
    }
    nSDL_FreeFont(font);
    SDL_Quit();
    return 0;
}
`;
  }

  function makefileFor(project) {
    const name = sanitizeProjectName(project?.name);
    const target = project?.target || "bflt-r903";
    const modern = target === "zehn-modern";
    if (modern) {
      return `GCC = nspire-gcc\nGXX = nspire-g++\nAS = nspire-as\nLD = nspire-ld\nGENZEHN = genzehn\nMAKEPRG = make-prg\n\nGCCFLAGS = -Wall -W -Os -marm -mcpu=arm926ej-s -ffunction-sections -fdata-sections\nLDFLAGS = -Wl,--gc-sections\nZEHNFLAGS = --name \"${name}\" --author \"TNS Tool WASM\" --compress\n\nC_OBJS = $(patsubst %.c,%.o,$(wildcard *.c))\nCPP_OBJS = $(patsubst %.cpp,%.o,$(wildcard *.cpp))\nASM_OBJS = $(patsubst %.S,%.o,$(wildcard *.S))\nOBJS = $(C_OBJS) $(CPP_OBJS) $(ASM_OBJS)\nEXE = ${name}\n\nall: $(EXE).tns\n\n%.o: %.c\n\t$(GCC) $(GCCFLAGS) -c $< -o $@\n\n%.o: %.cpp\n\t$(GXX) -std=c++11 $(GCCFLAGS) -fno-exceptions -fno-rtti -c $< -o $@\n\n%.o: %.S\n\t$(AS) -c $< -o $@\n\n$(EXE).elf: $(OBJS)\n\t$(LD) $^ -o $@ $(GCCFLAGS) $(LDFLAGS)\n\n$(EXE).tns: $(EXE).elf\n\t$(GENZEHN) --input $< --output $@.zehn $(ZEHNFLAGS)\n\t$(MAKEPRG) $@.zehn $@\n\trm -f $@.zehn\n\nclean:\n\trm -f *.o *.elf *.gdb $(EXE).tns $(EXE).tns.zehn\n`;
    }
    return `DEBUG ?= FALSE\nGCC = nspire-gcc\nGXX = nspire-g++\nAS = nspire-as\nLD = nspire-ld-bflt\nGCCFLAGS = -Wall -W -marm\nLDFLAGS =\n\nifeq ($(DEBUG),FALSE)\n\tGCCFLAGS += -Os\nelse\n\tGCCFLAGS += -O0 -g\n\tLDFLAGS += --debug\nendif\n\nC_OBJS = $(patsubst %.c,%.o,$(wildcard *.c))\nCPP_OBJS = $(patsubst %.cpp,%.o,$(wildcard *.cpp))\nASM_OBJS = $(patsubst %.S,%.o,$(wildcard *.S))\nOBJS = $(C_OBJS) $(CPP_OBJS) $(ASM_OBJS)\nifneq ($(strip $(CPP_OBJS)),)\n\tLDFLAGS += --cpp\nendif\nEXE = ${name}.tns\n\nall: $(EXE)\n\n%.o: %.c\n\t$(GCC) $(GCCFLAGS) -c $< -o $@\n\n%.o: %.cpp\n\t$(GXX) -std=c++11 $(GCCFLAGS) -c $< -o $@\n\n%.o: %.S\n\t$(AS) -c $< -o $@\n\n$(EXE): $(OBJS)\n\t$(LD) $^ -o $@ $(LDFLAGS)\n\nclean:\n\trm -f *.o *.elf *.gdb $(EXE)\n`;
  }

  function buildReadme(project) {
    const target = TARGETS[project.target]?.label || project.target;
    return `# ${project.name}\n\nThis project was created by TNS Tool WASM.\n\nTarget: ${target}\nLanguage: ${project.language === "cpp" ? "C++" : "C"}\n\n## Build\n\nOpen a terminal with the matching Ndless SDK toolchain in PATH, then run:\n\nmake\n\nThe browser preview is a source-aware simulation for common screen/text calls. The real .tns must be built with the ARM Ndless toolchain.\n`;
  }

  function createProject(options={}) {
    const name = sanitizeProjectName(options.name);
    const language = options.language === "cpp" ? "cpp" : "c";
    const template = TEMPLATES[options.template] ? options.template : "basic";
    const target = TARGETS[options.target] ? options.target : "bflt-r903";
    const project = {type:"ndless-project",version:VERSION,name,language,template,target,activeFile:sourceName(language),createdAt:new Date().toISOString(),files:{},settings:{previewScale:2,screenWidth:320,screenHeight:240}};
    project.files[project.activeFile] = starterSource(language, template);
    project.files.Makefile = makefileFor(project);
    project.files["README_BUILD.md"] = buildReadme(project);
    return project;
  }

  function refreshGeneratedFiles(project) {
    if(project.settings?.build)return project;
    project.files.Makefile = makefileFor(project);
    project.files["README_BUILD.md"] = buildReadme(project);
    return project;
  }

  function manifest(project) {
    return JSON.stringify({type:"tns-tool-ndless-project",version:VERSION,name:project.name,language:project.language,template:project.template,target:project.target,activeFile:project.activeFile,settings:project.settings || {}}, null, 2);
  }

  function exportEntries(project) {
    refreshGeneratedFiles(project);
    return {".tnsproject.json":manifest(project), ...project.files};
  }

  function importEntries(entries) {
    const files = {...entries};
    let meta = null;
    if (files[".tnsproject.json"]) {
      try { meta = JSON.parse(files[".tnsproject.json"]); } catch (_) { meta = null; }
      delete files[".tnsproject.json"];
    }
    const sourceFiles = Object.keys(files).filter(n => /\.(?:c|cpp|cc|cxx|S|s)$/i.test(n));
    const firstCpp = sourceFiles.find(n => /\.(?:cpp|cc|cxx)$/i.test(n));
    const language = meta?.language === "cpp" || firstCpp ? "cpp" : "c";
    const nameFromMake = String(files.Makefile || "").match(/(?:^|\n)EXE\s*=\s*([^\s.]+)(?:\.tns)?/i)?.[1];
    const name = sanitizeProjectName(meta?.name || nameFromMake || "imported-ndless-project");
    const target = TARGETS[meta?.target] ? meta.target : (/genzehn/i.test(files.Makefile || "") ? "zehn-modern" : "bflt-r903");
    const activeFile = files[meta?.activeFile] != null ? meta.activeFile : (sourceFiles[0] || Object.keys(files)[0] || sourceName(language));
    if (!files[activeFile]) files[activeFile] = starterSource(language,"basic");
    return {type:"ndless-project",version:VERSION,name,language,template:meta?.template||"basic",target,activeFile,createdAt:new Date().toISOString(),files,settings:meta?.settings||{previewScale:2,screenWidth:320,screenHeight:240}};
  }

  function validateProject(project) {
    const errors=[], warnings=[];
    const sources=Object.entries(project?.files||{}).filter(([n])=>/\.(?:c|cpp|cc|cxx)$/i.test(n));
    if(!sources.length)errors.push("Project has no C/C++ source file.");
    const all=sources.map(([,s])=>String(s)).join("\n");
    if(!/\bmain\s*\([^)]*\)\s*\{/m.test(all))errors.push("No main(...) function was found.");
    let depth=0;
    for(const ch of all){if(ch==="{")depth++;else if(ch==="}")depth--;if(depth<0){errors.push("Unbalanced braces were detected.");break;}}
    if(depth!==0&&!errors.includes("Unbalanced braces were detected."))errors.push("Unbalanced braces were detected.");
    if(!/#include\s*[<\"](?:libndls\.h|os\.h|SDL\/SDL\.h|nspireio2\.h)[>\"]/m.test(all))warnings.push("No common Ndless SDK header was detected.");
    if(project.target==="bflt-r903"&&/\bgenzehn\b/i.test(project.files?.Makefile||""))warnings.push("Makefile appears to target Zehn while project target is bFLT.");
    return {valid:errors.length===0,errors,warnings};
  }

  function decodeCString(raw) {return String(raw||"").replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"\t").replace(/\\"/g,'"').replace(/\\\\/g,"\\");}
  function stripComments(src){return String(src||"").replace(/\/\*[\s\S]*?\*\//g," ").replace(/\/\/[^\n]*/g," ");}
  function previewFromSource(source) {
    const src=stripComments(source), commands=[], warnings=[];
    let bg=[245,248,250];
    const fill=src.match(/SDL_FillRect\s*\([^;]*?SDL_MapRGB\s*\([^,]+,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/m);
    if(fill)bg=[+fill[1],+fill[2],+fill[3]].map(v=>Math.max(0,Math.min(255,v)));
    if(/\blcd_ingray\s*\(/.test(src))bg=[255,255,255];
    if(/\bclrscr\s*\(/.test(src)&&!fill)bg=[255,255,255];
    commands.push({type:"clear",color:bg});
    let matched=false;
    const font=src.match(/nSDL_LoadFont\s*\([^,]+,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    const fontColor=font ? font.slice(1,4).map(Number) : [235,245,255];
    const draw=/nSDL_DrawString\s*\([^,]+,[^,]+,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*"((?:\\.|[^"\\])*)"\s*\)/g;
    for(let m;(m=draw.exec(src));){matched=true;commands.push({type:"text",x:+m[1],y:+m[2],text:decodeCString(m[3]),color:fontColor});}
    const generic=/\b(?:printf|puts|nio_printf)\s*\((?:[^";]*?,\s*)?"((?:\\.|[^"\\])*)"[^;]*?\)/g;
    let y=8;
    for(let m;(m=generic.exec(src));){matched=true;for(const line of decodeCString(m[1]).split("\n")){if(line)commands.push({type:"text",x:6,y,text:line,color:[20,28,38]});y+=12;}}
    if(!matched)warnings.push("Preview could not infer visible output from the current source. Build/run in a real Ndless toolchain for exact behavior.");
    return {width:320,height:240,commands,warnings};
  }

  const api={VERSION,TARGETS,TEMPLATES,sanitizeProjectName,starterSource,makefileFor,buildReadme,createProject,refreshGeneratedFiles,manifest,exportEntries,importEntries,validateProject,previewFromSource,buildCommands:project=>["make",`${sanitizeProjectName(project.name)}.tns`]};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof window!=="undefined")window.NdlessProjectCore=Object.freeze(api);
  else if(typeof globalThis!=="undefined")globalThis.NdlessProjectCore=Object.freeze(api);
})();
