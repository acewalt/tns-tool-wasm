const statusEl = document.querySelector("#runtime-status");
const logEl = document.querySelector("#log");
const SOURCE_VERSION = "2026-08-25-calculator-love-mathprint-v7";

const I18N = {
  es: {
    about: "Acerca de",
    subtitle: "Port web experimental usando Pyodide/WebAssembly.",
    homeWelcome: "Bienvenido a TNS Tool WASM",
    homeSubtitle: "Selecciona una herramienta del panel izquierdo o arrastra un archivo para comenzar.",
    homeDropTitle: "Arrastra y suelta archivos aqui",
    homeDropFormats: "Formatos soportados: .tns, .xml, .py",
    homeShortcutXml: "Syntax Doctor XML",
    homeShortcutNormal: "TNS Normal",
    homeShortcutPython: "Python Program",
    xmlDoctorDesc: "Editor visual para revisar, corregir e incrustar codigo dentro de XML.",
    openXmlDoctor: "Abrir Syntax Doctor XML",
    hideXmlDoctor: "Ocultar Syntax Doctor XML",
    openTns: "Abrir TNS",
    openXml: "Abrir XML",
    openXmlFolder: "Abrir carpeta XML",
    embedXml: "Incrustar en XML",
    saveXmlZip: "Guardar XML ZIP",
    createTnsFromDoctor: "Crear TNS",
    fileMenu: "Archivo",
    editMenu: "Editar",
    xmlActionsMenu: "Acciones XML",
    saveMenu: "Guardar",
    newXmlProject: "Nuevo documento",
    documentInspector: "Inspector de documento",
    addFunc: "Agregar Func",
    documentSummary: "Resumen",
    documentElements: "Elementos",
    openLua: "Ver Lua",
    editLua: "Editar Lua",
    addLuaWidget: "Agregar Lua ScriptApp",
    addImageWidget: "Agregar imagen",
    openPython: "Ver Python",
    editPython: "Editar Python",
    addPythonWidget: "Agregar Python",
    addPage: "+Page",
    addSpreadsheetWidget: "Agregar listas y hojas de cálculo",
    addProgramEditorWidget: "Agregar editor de programas",
    programEditorWidgetAdded: "Editor de programas agregado como nueva card.",
    spreadsheetWidgetAdded: "Lista y hoja de cálculo agregada como nueva card.",
    openSpreadsheet: "Abrir hoja",
    spreadsheetTitle: "Listas y hoja de cálculo",
    spreadsheetImport: "Importar XLSX",
    spreadsheetSave: "Save",
    spreadsheetImportLoaded: "XLSX cargado en la previsualización.",
    spreadsheetPreviewOnly: "Save escribe las celdas directamente en el XML TI-Nspire. Las fórmulas simples conservan formula y data.",
    addNotepadWidget: "Agregar notas",
    notepadWidgetAdded: "Notas agregadas como nueva card.",
    openNotepad: "Abrir notas",
    notepadTitle: "Notas",
    notepadSave: "Save",
    addGraphWidget: "Agregar gráficos",
    addCalculatorWidget: "Agregar calculadora",
    calculatorWidgetAdded: "Calculadora agregada como nueva card.",
    openCalculator: "Abrir calculadora",
    calculatorEntry: "Entrada",
    calculatorAddEntry: "Agregar entrada",
    calculatorTemplates: "Plantillas",
    calculatorSave: "Save",
    calculatorCancel: "Cancel",
    graphWidgetAdded: "Gráficos agregados como nueva card.",
    openGraph: "Abrir gráfica",
    graphTitle: "Gráficos",
    graphFormula: "Función",
    graphPreviewLove: "Preview LÖVE",
    graphSave: "Save",
    graphLiveFormula: "Type or paste a formula to preview it",
    graphApplyPreview: "Preview",
    graphLiveFormula: "Escribe o pega una fórmula para previsualizarla",
    graphApplyPreview: "Previsualizar",
    viewImage: "Ver imagen",
    imageCalculatorView: "Vista calculadora",
    imageOriginalView: "Vista original",
    imageWidgetAdded: "Imagen agregada como nueva card.",
    imageWidgetNoFile: "Selecciona una imagen BMP, PNG o JPG.",
    imageResourceInfo: "Recurso",
    imageExtraBytesIgnored: "bytes extra ignorados",
    runLuaSyntax: "Ejecutar sintaxis Lua",
    saveLuaXml: "Guardar Lua en XML",
    previewLua: "Preview Lua",
    previewLove: "Preview LÖVE",
    previewLoveProject: "Preview proyecto LÖVE",
    lovePreviewNote: "Preview LÖVE: soporta codigo love.* y ScriptApp TI-Nspire mediante una capa platform/on/gc sobre canvas.",
    loveProjectTitle: "Preview de proyecto LÖVE",
    loveProjectIntro: "Abre un ZIP/.love o una carpeta de proyecto. Se montara en memoria y se ejecutara main.lua con soporte para require y love.filesystem.",
    loveProjectOpenZip: "Abrir ZIP/.love",
    loveProjectOpenFolder: "Abrir carpeta",
    loveProjectEntry: "Archivo principal",
    loveProjectLoaded: "Proyecto LÖVE cargado: {count} archivos, entrada {entry}.",
    loveProjectLoading: "Cargando proyecto LÖVE...",
    loveProjectNoFiles: "No se encontraron archivos en el proyecto.",
    loveProjectNoMain: "No se encontro main.lua. Indica el archivo principal correcto.",
    loveProjectConversionDisabled: "La conversion a TI-Nspire esta oculta para proyectos multiarchivo; primero usa un archivo LÖVE suelto o integra manualmente sus modulos.",
    lovePreviewExpandedView: "Vista expandida",
    lovePreviewCalculatorView: "Vista calculadora",
    lovePreviewCalculatorChromeTitle: "Vista calculadora",
    lovePreviewSizeChanged: "Vista del preview",
    lovePreviewStarted: "Preview LÖVE experimental activo.",
    loveConvertNspire: "Convertir LÖVE a TI-Nspire",
    loveCopyNspire: "Copiar TI-Nspire",
    loveReplaceNspire: "Reemplazar con TI-Nspire",
    loveConvertedNspire: "Codigo LÖVE convertido a ScriptApp TI-Nspire en el editor.",
    loveCopiedNspire: "Codigo TI-Nspire copiado al portapapeles.",
    lovePreviewNspireHint: "Este codigo parece ScriptApp TI-Nspire; usa Preview Lua. Preview LÖVE solo ejecuta codigo que define love.*.",
    lovePreviewNoCallbacks: "No se encontro love.draw ni love.update. Si este codigo es TI-Nspire, usa Preview Lua.",
    lovePreviewNspireCompat: "Codigo TI-Nspire detectado: Preview LÖVE usara platform/on/gc sobre el canvas interno.",
    lovePreviewCalculatorWarning: "Aviso: este codigo usa love.* y no corre directamente en la calculadora. Usa Convertir LÖVE a TI-Nspire si quieres guardarlo para TI-Nspire.",
    luaGuide: "Guia Lua",
    luaTemplates: "Plantillas Lua",
    luaEditPages: "Editar paginas",
    luaTnsConvert: "TNS to Lua convert code",
    luaGuideSearch: "Buscar funciones, eventos o variables...",
    luaGuideCategoryAll: "Todo",
    luaGuideCategoryTi: "TI-Nspire",
    luaGuideCategoryLove: "LÖVE",
    luaGuideCategoryBridge: "Equivalencias",
    luaTemplatesIntro: "Elige una plantilla y ajusta sus opciones. Sin seleccion, reemplaza el script actual; con seleccion, reemplaza ese bloque.",
    luaInsertTemplate: "Insertar plantilla",
    luaInputCount: "Cantidad de inputs",
    luaTemplateTitle: "Titulo",
    luaButtonText: "Texto del boton",
    luaPrimaryColor: "Color principal",
    luaBackgroundColor: "Color de fondo",
    luaTextColor: "Color de texto",
    luaTemplateType: "Tipo de plantilla",
    luaTemplateOptions: "Opciones",
    luaTemplatePreview: "Vista previa",
    luaGeneratedCode: "Codigo Lua generado",
    luaCopyCode: "Copiar codigo",
    luaVariableBase: "Nombre base de variables",
    luaButtonAction: "Accion del boton",
    luaActionNext: "Ir a la siguiente pagina",
    luaActionDetails: "Abrir detalles",
    luaActionHome: "Volver al inicio",
    luaActionBack: "Retroceder",
    luaActionNone: "No navegar",
    luaButtonPosition: "Posicion de botones",
    luaUseThemeColor: "Usar color principal del proyecto",
    luaShowPrimaryButton: "Mostrar boton principal",
    luaShowDetailsButton: "Mostrar boton Detalles",
    luaShowBackButton: "Mostrar boton Volver",
    luaMenuRoutes: "Editar opciones y destinos",
    luaMenuOption: "Opcion",
    luaRouteDefault: "Siguiente pagina",
    luaPageEditor: "Editor visual de paginas",
    luaPageEditorIntro: "Edita nombres y rutas de las paginas generadas por plantillas.",
    luaPageName: "Nombre de pagina",
    luaPageSubtitle: "Subtitulo",
    luaPageButtonText: "Texto del boton",
    luaPageItems: "Opciones del menu",
    luaApplyPageEdits: "Aplicar cambios",
    luaPopupWidth: "Ancho del cuadro",
    luaPopupHeight: "Alto del cuadro",
    luaVariableBinding: "Variable vinculada",
    luaNoVariableBinding: "Sin variable",
    luaActionCondition: "Condicion",
    luaActionExpression: "Calculo",
    luaActionTargetVariable: "Guardar en variable",
    luaButtonActions: "Acciones del boton",
    luaBottom: "Inferior",
    luaTop: "Superior",
    luaSyntaxOk: "Sintaxis Lua basica OK.",
    luaSaved: "Lua guardado en staging. Use Guardar XML ZIP para descargarlo.",
    noEditablePrograms: "No se encontraron programas editables en el XML.",
    editableBlocksLoaded: "Cargados {count} bloques editables.",
    selectedProgram: "Programa seleccionado: {name}",
    luaScriptAdded: "Lua ScriptApp agregado en una nueva card.",
    pythonWidgetAdded: "Python agregado en una nueva card.",
    funcAdded: "Func agregada: {name}",
    analysisDone: "Analisis completado. Errores: {errors}, advertencias: {warnings}.",
    autoFixApplied: "Auto Fix aplicado. Use Mostrar cambios para revisar.",
    autoFixNoChanges: "Auto Fix no encontro cambios seguros.",
    formatApplied: "Format aplicado. Use Mostrar cambios para revisar.",
    formatNoChanges: "Format no encontro cambios.",
    noAutoFixChanges: "No hay cambios de Auto Fix para mostrar.",
    codeEmbedded: "Codigo incrustado en staging. Use Guardar XML ZIP para descargarlo.",
    xmlZipDownloaded: "XML ZIP descargado.",
    pyDoctorOpened: "Syntax Doctor PY abierto.",
    pyInlineUpdated: "Codigo enviado al bloque inline de Python Program.",
    pyInlineLogUpdated: "Codigo Python inline actualizado desde Syntax Doctor PY.",
    pyStageUpdated: "Codigo Python guardado en el staging XML/TNS.",
    pyStageLogUpdated: "Python del inspector actualizado desde Syntax Doctor PY.",
    pyFileDownloaded: "Archivo .py descargado.",
    previewPy: "Preview PY",
    pythonPreviewTitle: "Preview Python",
    pythonPreviewIntro: "Ejecuta el codigo actual con Pyodide en modo terminal. Escribe una respuesta y presiona Enter o Enviar cuando el programa pida input().",
    pythonPreviewInput: "Entrada de terminal",
    pythonPreviewRun: "Ejecutar",
    pythonPreviewSend: "Enviar",
    pythonPreviewRestart: "Reiniciar",
    pythonPreviewOutput: "Salida",
    pythonPreviewRunning: "Ejecutando Python...",
    pythonPreviewReady: "Presiona Ejecutar para iniciar el programa.",
    pythonPreviewNoOutput: "El programa termino sin imprimir salida.",
    pythonPreviewOk: "Python ejecutado correctamente.",
    pythonPreviewFailed: "Python fallo durante la ejecucion.",
    pythonPreviewInputExhausted: "El programa esta esperando una respuesta.",
    pythonPreviewWaiting: "Esperando entrada...",
    pythonPreviewFinished: "Programa terminado.",
    pythonPreviewTerminalPlaceholder: "Escribe una respuesta y presiona Enter",
    pythonPreviewLoopLimit: "El preview se detuvo por exceso de iteraciones. Revisa si falta una entrada o si hay un bucle infinito.",
    pythonPreviewOutputLimit: "El preview se detuvo porque el programa imprimio demasiada salida.",
    pythonRuntimeNotReady: "Runtime WASM no esta listo todavia.",
    viewValue: "Ver valor",
    viewXml: "Ver XML",
    viewDetails: "Ver detalle",
    close: "Cerrar",
    copyLog: "Copiar log",
    copyScreenContent: "Copiar contenido",
    logCopied: "Log copiado al portapapeles.",
    screenContentCopied: "Contenido de pantalla copiado al portapapeles.",
    screenContentEmpty: "No hay texto visible capturado en la pantalla.",
    documentSettings: "Ajuste de documento",
    documentName: "Nombre",
    documentType: "Tipo",
    libraryAccess: "Acceso a libreria",
    arguments: "Argumentos",
    runSyntax: "Ejecutar sintaxis",
    format: "Format",
    resolve: "Resolver",
    showChanges: "Mostrar cambios",
    analysisSummary: "Resumen de analisis",
    errors: "Errores",
    warnings: "Advertencias",
    info: "Informacion",
    problemList: "Lista de problemas",
    type: "Tipo",
    line: "Linea",
    col: "Col",
    total: "Total",
    description: "Descripcion",
    normalDesc: "Decodificar `.tns` a XML y reconstruir `.tns` desde XML.",
    openNormal: "Abrir TNS normal",
    hideNormal: "Ocultar TNS normal",
    decodeTitle: "1) Decodificar .tns a XML",
    tnsFile: "Archivo .tns",
    decodeDownloadZip: "Decodificar y descargar ZIP",
    buildTitle: "2) Crear .tns desde XML",
    xmlFolder: "Carpeta .tns.xml",
    createTns: "Crear TNS",
    pythonDesc: "Crear Python Program `.tns`, extraer `q.py` y revisar sintaxis Python.",
    openPython: "Abrir Python Program",
    hidePython: "Ocultar Python Program",
    pythonBuildTitle: "3) Crear Python Program .tns",
    optionalPyFile: "Archivo .py opcional",
    optionalTemplate: "Plantilla .tns opcional",
    inlinePlaceholder: "Codigo inline opcional",
    openPyDoctor: "Abrir Syntax Doctor PY",
    hidePyDoctor: "Ocultar Syntax Doctor PY",
    createPythonTns: "Crear Python TNS",
    extractPy: "Extraer q.py",
    saveBlock: "Guardar bloque",
    savePythonStage: "Guardar en TNS",
    downloadPy: "Descargar .py",
    resolverNoPending: "No hay problemas ambiguos pendientes para resolver.",
    resolverTitle: "Resolver problemas",
    resolverPrompt: "Elige que hacer con cada variable no declarada.",
    resolverVariable: "Variable",
    resolverDeclare: "Declarar nueva variable",
    resolverIgnore: "Ignorar",
    resolverLogIgnored: "Variable {name} ignorada",
    resolverLogDeclared: "Variable {name} declarada",
    resolverLogReplaced: "Variable {name} reemplazada por {value}",
    cancel: "Cancelar",
    apply: "Aplicar",
    ready: "Listo",
  },
  en: {
    about: "About",
    subtitle: "Experimental web port using Pyodide/WebAssembly.",
    homeWelcome: "Welcome to TNS Tool WASM",
    homeSubtitle: "Select a tool from the left panel or drag a file to begin.",
    homeDropTitle: "Drag and drop files here",
    homeDropFormats: "Supported formats: .tns, .xml, .py",
    homeShortcutXml: "Syntax Doctor XML",
    homeShortcutNormal: "TNS Normal",
    homeShortcutPython: "Python Program",
    xmlDoctorDesc: "Visual editor to inspect, fix, and embed code inside XML.",
    openXmlDoctor: "Open Syntax Doctor XML",
    hideXmlDoctor: "Hide Syntax Doctor XML",
    openTns: "Open TNS",
    openXml: "Open XML",
    openXmlFolder: "Open XML folder",
    embedXml: "Embed in XML",
    saveXmlZip: "Save XML ZIP",
    createTnsFromDoctor: "Create TNS",
    fileMenu: "File",
    editMenu: "Edit",
    xmlActionsMenu: "XML actions",
    saveMenu: "Save",
    newXmlProject: "New document",
    documentInspector: "Document inspector",
    addFunc: "Add Func",
    documentSummary: "Summary",
    documentElements: "Elements",
    openLua: "View Lua",
    editLua: "Edit Lua",
    addLuaWidget: "Add Lua ScriptApp",
    addImageWidget: "Add image",
    openPython: "View Python",
    editPython: "Edit Python",
    addPythonWidget: "Add Python",
    addPage: "+Page",
    addSpreadsheetWidget: "Add Lists & Spreadsheet",
    addProgramEditorWidget: "Add Program Editor",
    programEditorWidgetAdded: "Program Editor added as a new card.",
    spreadsheetWidgetAdded: "Lists & Spreadsheet added as a new card.",
    openSpreadsheet: "Open sheet",
    spreadsheetTitle: "Lists & Spreadsheet",
    spreadsheetImport: "Import XLSX",
    spreadsheetSave: "Save",
    spreadsheetImportLoaded: "XLSX loaded in the preview.",
    spreadsheetPreviewOnly: "Save writes cells directly into the TI-Nspire XML. Simple formulas preserve formula and data.",
    addNotepadWidget: "Add Notes",
    notepadWidgetAdded: "Notes added as a new card.",
    openNotepad: "Open notes",
    notepadTitle: "Notes",
    notepadSave: "Save",
    addGraphWidget: "Add Graphs",
    addCalculatorWidget: "Add Calculator",
    calculatorWidgetAdded: "Calculator added as a new card.",
    openCalculator: "Open calculator",
    calculatorEntry: "Entry",
    calculatorAddEntry: "Add entry",
    calculatorTemplates: "Templates",
    calculatorSave: "Save",
    calculatorCancel: "Cancel",
    graphWidgetAdded: "Graphs added as a new card.",
    openGraph: "Open graph",
    graphTitle: "Graphs",
    graphFormula: "Function",
    graphPreviewLove: "Preview LÖVE",
    graphSave: "Save",
    viewImage: "View image",
    imageCalculatorView: "Calculator view",
    imageOriginalView: "Original view",
    imageWidgetAdded: "Image added as a new card.",
    imageWidgetNoFile: "Select a BMP, PNG, or JPG image.",
    imageResourceInfo: "Resource",
    imageExtraBytesIgnored: "extra bytes ignored",
    runLuaSyntax: "Run Lua syntax",
    saveLuaXml: "Save Lua to XML",
    previewLua: "Preview Lua",
    previewLove: "Preview LÖVE",
    previewLoveProject: "Preview LÖVE Project",
    lovePreviewNote: "LÖVE preview: supports love.* code and TI-Nspire ScriptApps through a platform/on/gc canvas layer.",
    loveProjectTitle: "LÖVE project preview",
    loveProjectIntro: "Open a ZIP/.love or a project folder. It will be mounted in memory and main.lua will run with require and love.filesystem support.",
    loveProjectOpenZip: "Open ZIP/.love",
    loveProjectOpenFolder: "Open folder",
    loveProjectEntry: "Main file",
    loveProjectLoaded: "LÖVE project loaded: {count} files, entry {entry}.",
    loveProjectLoading: "Loading LÖVE project...",
    loveProjectNoFiles: "No files were found in the project.",
    loveProjectNoMain: "main.lua was not found. Set the correct main file.",
    loveProjectConversionDisabled: "TI-Nspire conversion is hidden for multi-file projects; use a single LÖVE file or merge modules manually first.",
    lovePreviewExpandedView: "Expanded view",
    lovePreviewCalculatorView: "Calculator view",
    lovePreviewCalculatorChromeTitle: "Calculator view",
    lovePreviewSizeChanged: "Preview view",
    lovePreviewStarted: "Experimental LÖVE preview active.",
    loveConvertNspire: "Convert LÖVE to TI-Nspire",
    loveCopyNspire: "Copy TI-Nspire",
    loveReplaceNspire: "Replace with TI-Nspire",
    loveConvertedNspire: "LÖVE code converted to TI-Nspire ScriptApp in the editor.",
    loveCopiedNspire: "TI-Nspire code copied to clipboard.",
    lovePreviewNspireHint: "This code looks like a TI-Nspire ScriptApp; use Preview Lua. Preview LÖVE only runs code that defines love.*.",
    lovePreviewNoCallbacks: "No love.draw or love.update callback was found. If this is TI-Nspire code, use Preview Lua.",
    lovePreviewNspireCompat: "TI-Nspire code detected: Preview LÖVE will run platform/on/gc on the internal canvas.",
    lovePreviewCalculatorWarning: "Warning: this code uses love.* and does not run directly on the calculator. Use Convert LÖVE to TI-Nspire if you want to save it for TI-Nspire.",
    luaGuide: "Lua guide",
    luaTemplates: "Lua templates",
    luaEditPages: "Edit pages",
    luaTnsConvert: "TNS to Lua convert code",
    luaGuideSearch: "Search functions, events, or variables...",
    luaGuideCategoryAll: "All",
    luaGuideCategoryTi: "TI-Nspire",
    luaGuideCategoryLove: "LÖVE",
    luaGuideCategoryBridge: "Mappings",
    luaTemplatesIntro: "Choose a template and adjust its options. With no selection, it replaces the current script; with a selection, it replaces that block.",
    luaInsertTemplate: "Insert template",
    luaInputCount: "Input count",
    luaTemplateTitle: "Title",
    luaButtonText: "Button text",
    luaPrimaryColor: "Primary color",
    luaBackgroundColor: "Background color",
    luaTextColor: "Text color",
    luaTemplateType: "Template type",
    luaTemplateOptions: "Options",
    luaTemplatePreview: "Preview",
    luaGeneratedCode: "Generated Lua code",
    luaCopyCode: "Copy code",
    luaVariableBase: "Variable base name",
    luaButtonAction: "Button action",
    luaActionNext: "Go to next page",
    luaActionDetails: "Open details",
    luaActionHome: "Return home",
    luaActionBack: "Go back",
    luaActionNone: "Do not navigate",
    luaButtonPosition: "Button position",
    luaUseThemeColor: "Use project main color",
    luaShowPrimaryButton: "Show primary button",
    luaShowDetailsButton: "Show Details button",
    luaShowBackButton: "Show Back button",
    luaMenuRoutes: "Edit options and destinations",
    luaMenuOption: "Option",
    luaRouteDefault: "Next page",
    luaPageEditor: "Visual page editor",
    luaPageEditorIntro: "Edit names and routes for pages generated by templates.",
    luaPageName: "Page name",
    luaPageSubtitle: "Subtitle",
    luaPageButtonText: "Button text",
    luaPageItems: "Menu options",
    luaApplyPageEdits: "Apply changes",
    luaPopupWidth: "Box width",
    luaPopupHeight: "Box height",
    luaVariableBinding: "Bound variable",
    luaNoVariableBinding: "No variable",
    luaActionCondition: "Condition",
    luaActionExpression: "Calculation",
    luaActionTargetVariable: "Save to variable",
    luaButtonActions: "Button actions",
    luaBottom: "Bottom",
    luaTop: "Top",
    luaSyntaxOk: "Basic Lua syntax OK.",
    luaSaved: "Lua saved to staging. Use Save XML ZIP to download it.",
    noEditablePrograms: "No editable programs were found in the XML.",
    editableBlocksLoaded: "Loaded {count} editable blocks.",
    selectedProgram: "Selected program: {name}",
    luaScriptAdded: "Lua ScriptApp added in a new card.",
    pythonWidgetAdded: "Python added in a new card.",
    funcAdded: "Func added: {name}",
    analysisDone: "Analysis completed. Errors: {errors}, warnings: {warnings}.",
    autoFixApplied: "Auto Fix applied. Use Show changes to review.",
    autoFixNoChanges: "Auto Fix found no safe changes.",
    formatApplied: "Format applied. Use Show changes to review.",
    formatNoChanges: "Format found no changes.",
    noAutoFixChanges: "No Auto Fix changes to show.",
    codeEmbedded: "Code embedded in staging. Use Save XML ZIP to download it.",
    xmlZipDownloaded: "XML ZIP downloaded.",
    pyDoctorOpened: "Syntax Doctor PY opened.",
    pyInlineUpdated: "Code sent to the Python Program inline block.",
    pyInlineLogUpdated: "Python inline code updated from Syntax Doctor PY.",
    pyStageUpdated: "Python code saved to the XML/TNS staging area.",
    pyStageLogUpdated: "Inspector Python updated from Syntax Doctor PY.",
    pyFileDownloaded: ".py file downloaded.",
    previewPy: "Preview PY",
    pythonPreviewTitle: "Python preview",
    pythonPreviewIntro: "Run the current code with Pyodide in terminal mode. Type one answer and press Enter or Send when the program asks for input().",
    pythonPreviewInput: "Terminal input",
    pythonPreviewRun: "Run",
    pythonPreviewSend: "Send",
    pythonPreviewRestart: "Restart",
    pythonPreviewOutput: "Output",
    pythonPreviewRunning: "Running Python...",
    pythonPreviewReady: "Press Run to start the program.",
    pythonPreviewNoOutput: "The program finished without printing output.",
    pythonPreviewOk: "Python executed successfully.",
    pythonPreviewFailed: "Python failed during execution.",
    pythonPreviewInputExhausted: "The program is waiting for an answer.",
    pythonPreviewWaiting: "Waiting for input...",
    pythonPreviewFinished: "Program finished.",
    pythonPreviewTerminalPlaceholder: "Type an answer and press Enter",
    pythonPreviewLoopLimit: "Preview stopped after too many iterations. Check for missing input or an infinite loop.",
    pythonPreviewOutputLimit: "Preview stopped because the program printed too much output.",
    pythonRuntimeNotReady: "WASM runtime is not ready yet.",
    viewValue: "View value",
    viewXml: "View XML",
    viewDetails: "View details",
    close: "Close",
    copyLog: "Copy log",
    copyScreenContent: "Copy content",
    logCopied: "Log copied to clipboard.",
    screenContentCopied: "Screen content copied to clipboard.",
    screenContentEmpty: "No visible text was captured on the screen.",
    documentSettings: "Document settings",
    documentName: "Name",
    documentType: "Type",
    libraryAccess: "Library access",
    arguments: "Arguments",
    runSyntax: "Run syntax",
    format: "Format",
    resolve: "Resolve",
    showChanges: "Show changes",
    analysisSummary: "Analysis summary",
    errors: "Errors",
    warnings: "Warnings",
    info: "Information",
    problemList: "Problem list",
    type: "Type",
    line: "Line",
    col: "Col",
    total: "Total",
    description: "Description",
    normalDesc: "Decode `.tns` to XML and rebuild `.tns` from XML.",
    openNormal: "Open Normal TNS",
    hideNormal: "Hide Normal TNS",
    decodeTitle: "1) Decode .tns to XML",
    tnsFile: ".tns file",
    decodeDownloadZip: "Decode and download ZIP",
    buildTitle: "2) Create .tns from XML",
    xmlFolder: ".tns.xml folder",
    createTns: "Create TNS",
    pythonDesc: "Create Python Program `.tns`, extract `q.py`, and check Python syntax.",
    openPython: "Open Python Program",
    hidePython: "Hide Python Program",
    pythonBuildTitle: "3) Create Python Program .tns",
    optionalPyFile: "Optional .py file",
    optionalTemplate: "Optional .tns template",
    inlinePlaceholder: "Optional inline code",
    openPyDoctor: "Open Syntax Doctor PY",
    hidePyDoctor: "Hide Syntax Doctor PY",
    createPythonTns: "Create Python TNS",
    extractPy: "Extract q.py",
    saveBlock: "Save block",
    savePythonStage: "Save to TNS",
    downloadPy: "Download .py",
    resolverNoPending: "There are no pending ambiguous problems to resolve.",
    resolverTitle: "Resolve problems",
    resolverPrompt: "Choose what to do with each undefined variable.",
    resolverVariable: "Variable",
    resolverDeclare: "Declare new variable",
    resolverIgnore: "Ignore",
    resolverLogIgnored: "Variable {name} ignored",
    resolverLogDeclared: "Variable {name} declared",
    resolverLogReplaced: "Variable {name} replaced with {value}",
    cancel: "Cancel",
    apply: "Apply",
    ready: "Ready",
  },
  fr: {
    about: "\u00c0 propos",
    subtitle: "Port web experimental avec Pyodide/WebAssembly.",
    homeWelcome: "Bienvenue dans TNS Tool WASM",
    homeSubtitle: "Selectionnez un outil dans le panneau de gauche ou glissez un fichier pour commencer.",
    homeDropTitle: "Glissez-deposez les fichiers ici",
    homeDropFormats: "Formats pris en charge : .tns, .xml, .py",
    homeShortcutXml: "Syntax Doctor XML",
    homeShortcutNormal: "TNS normal",
    homeShortcutPython: "Python Program",
    xmlDoctorDesc: "Editeur visuel pour inspecter, corriger et incruster du code dans le XML.",
    openXmlDoctor: "Ouvrir Syntax Doctor XML",
    hideXmlDoctor: "Masquer Syntax Doctor XML",
    openTns: "Ouvrir TNS",
    openXml: "Ouvrir XML",
    openXmlFolder: "Ouvrir dossier XML",
    embedXml: "Incruster en XML",
    saveXmlZip: "Enregistrer ZIP XML",
    createTnsFromDoctor: "Créer TNS",
    fileMenu: "Fichier",
    editMenu: "Edition",
    xmlActionsMenu: "Actions XML",
    saveMenu: "Enregistrer",
    newXmlProject: "Nouveau document",
    documentInspector: "Inspecteur du document",
    addFunc: "Ajouter Func",
    documentSummary: "Resume",
    documentElements: "Elements",
    openLua: "Voir Lua",
    editLua: "Editer Lua",
    addLuaWidget: "Ajouter Lua ScriptApp",
    addImageWidget: "Ajouter image",
    openPython: "Voir Python",
    editPython: "Editer Python",
    addPythonWidget: "Ajouter Python",
    addPage: "+Page",
    addSpreadsheetWidget: "Ajouter listes et feuille de calcul",
    addProgramEditorWidget: "Ajouter éditeur de programmes",
    programEditorWidgetAdded: "Éditeur de programmes ajouté comme nouvelle carte.",
    spreadsheetWidgetAdded: "Feuille de calcul ajoutée comme nouvelle carte.",
    openSpreadsheet: "Ouvrir feuille",
    spreadsheetTitle: "Listes et feuille de calcul",
    spreadsheetImport: "Importer XLSX",
    spreadsheetSave: "Save",
    spreadsheetImportLoaded: "XLSX chargé dans l’aperçu.",
    spreadsheetPreviewOnly: "Save écrit les cellules directement dans le XML TI-Nspire. Les formules simples conservent formula et data.",
    addNotepadWidget: "Ajouter notes",
    notepadWidgetAdded: "Notes ajoutées comme nouvelle carte.",
    openNotepad: "Ouvrir notes",
    notepadTitle: "Notes",
    notepadSave: "Save",
    addGraphWidget: "Ajouter graphiques",
    addCalculatorWidget: "Ajouter calculatrice",
    calculatorWidgetAdded: "Calculatrice ajoutée comme nouvelle carte.",
    openCalculator: "Ouvrir calculatrice",
    calculatorEntry: "Entrée",
    calculatorAddEntry: "Ajouter entrée",
    calculatorTemplates: "Modèles",
    calculatorSave: "Save",
    calculatorCancel: "Cancel",
    graphWidgetAdded: "Graphiques ajoutés comme nouvelle carte.",
    openGraph: "Ouvrir graphique",
    graphTitle: "Graphiques",
    graphFormula: "Fonction",
    graphPreviewLove: "Aperçu LÖVE",
    graphSave: "Save",
    graphLiveFormula: "Écrivez ou collez une formule pour la prévisualiser",
    graphApplyPreview: "Prévisualiser",
    viewImage: "Voir image",
    imageCalculatorView: "Vue calculatrice",
    imageOriginalView: "Vue originale",
    imageWidgetAdded: "Image ajoutee comme nouvelle carte.",
    imageWidgetNoFile: "Selectionnez une image BMP, PNG ou JPG.",
    imageResourceInfo: "Ressource",
    imageExtraBytesIgnored: "octets extra ignores",
    runLuaSyntax: "Analyser syntaxe Lua",
    saveLuaXml: "Enregistrer Lua dans XML",
    previewLua: "Apercu Lua",
    previewLove: "Apercu LÖVE",
    previewLoveProject: "Apercu projet LÖVE",
    lovePreviewNote: "Apercu LÖVE : prend en charge le code love.* et les ScriptApps TI-Nspire via une couche platform/on/gc sur canvas.",
    loveProjectTitle: "Apercu de projet LÖVE",
    loveProjectIntro: "Ouvrez un ZIP/.love ou un dossier de projet. Il sera monte en memoire et main.lua s'executera avec require et love.filesystem.",
    loveProjectOpenZip: "Ouvrir ZIP/.love",
    loveProjectOpenFolder: "Ouvrir dossier",
    loveProjectEntry: "Fichier principal",
    loveProjectLoaded: "Projet LÖVE charge : {count} fichiers, entree {entry}.",
    loveProjectLoading: "Chargement du projet LÖVE...",
    loveProjectNoFiles: "Aucun fichier trouve dans le projet.",
    loveProjectNoMain: "main.lua est introuvable. Indiquez le bon fichier principal.",
    loveProjectConversionDisabled: "La conversion TI-Nspire est masquee pour les projets multi-fichiers; utilisez d'abord un seul fichier LÖVE ou fusionnez les modules manuellement.",
    lovePreviewExpandedView: "Vue agrandie",
    lovePreviewCalculatorView: "Vue calculatrice",
    lovePreviewCalculatorChromeTitle: "Vue calculatrice",
    lovePreviewSizeChanged: "Vue de l'apercu",
    lovePreviewStarted: "Apercu LÖVE experimental actif.",
    loveConvertNspire: "Convertir LÖVE vers TI-Nspire",
    loveCopyNspire: "Copier TI-Nspire",
    loveReplaceNspire: "Remplacer par TI-Nspire",
    loveConvertedNspire: "Code LÖVE converti en ScriptApp TI-Nspire dans l'editeur.",
    loveCopiedNspire: "Code TI-Nspire copie dans le presse-papiers.",
    lovePreviewNspireHint: "Ce code ressemble a une ScriptApp TI-Nspire; utilisez Apercu Lua. L'apercu LÖVE execute seulement le code qui definit love.*.",
    lovePreviewNoCallbacks: "Aucun callback love.draw ou love.update trouve. Si ce code est TI-Nspire, utilisez Apercu Lua.",
    lovePreviewNspireCompat: "Code TI-Nspire detecte : l'apercu LÖVE utilisera platform/on/gc sur le canvas interne.",
    lovePreviewCalculatorWarning: "Avertissement : ce code utilise love.* et ne s'execute pas directement sur la calculatrice. Utilisez Convertir LÖVE vers TI-Nspire pour l'enregistrer pour TI-Nspire.",
    luaGuide: "Guide Lua",
    luaTemplates: "Modeles Lua",
    luaEditPages: "Editer pages",
    luaTnsConvert: "TNS vers Lua",
    luaGuideSearch: "Rechercher fonctions, evenements ou variables...",
    luaGuideCategoryAll: "Tout",
    luaGuideCategoryTi: "TI-Nspire",
    luaGuideCategoryLove: "LÖVE",
    luaGuideCategoryBridge: "Equivalences",
    luaTemplatesIntro: "Choisissez un modele et ajustez ses options. Sans selection, il remplace le script actuel; avec selection, il remplace ce bloc.",
    luaInsertTemplate: "Inserer le modele",
    luaInputCount: "Nombre de champs",
    luaTemplateTitle: "Titre",
    luaButtonText: "Texte du bouton",
    luaPrimaryColor: "Couleur principale",
    luaBackgroundColor: "Couleur de fond",
    luaTextColor: "Couleur du texte",
    luaTemplateType: "Type de modele",
    luaTemplateOptions: "Options",
    luaTemplatePreview: "Apercu",
    luaGeneratedCode: "Code Lua genere",
    luaCopyCode: "Copier le code",
    luaVariableBase: "Nom de base des variables",
    luaButtonAction: "Action du bouton",
    luaActionNext: "Aller a la page suivante",
    luaActionDetails: "Ouvrir les details",
    luaActionHome: "Retourner a l'accueil",
    luaActionBack: "Reculer",
    luaActionNone: "Ne pas naviguer",
    luaButtonPosition: "Position des boutons",
    luaUseThemeColor: "Utiliser la couleur principale du projet",
    luaShowPrimaryButton: "Afficher le bouton principal",
    luaShowDetailsButton: "Afficher le bouton Details",
    luaShowBackButton: "Afficher le bouton Retour",
    luaMenuRoutes: "Modifier options et destinations",
    luaMenuOption: "Option",
    luaRouteDefault: "Page suivante",
    luaPageEditor: "Editeur visuel de pages",
    luaPageEditorIntro: "Modifiez les noms et routes des pages generees par les modeles.",
    luaPageName: "Nom de page",
    luaPageSubtitle: "Sous-titre",
    luaPageButtonText: "Texte du bouton",
    luaPageItems: "Options du menu",
    luaApplyPageEdits: "Appliquer les changements",
    luaPopupWidth: "Largeur du cadre",
    luaPopupHeight: "Hauteur du cadre",
    luaVariableBinding: "Variable liee",
    luaNoVariableBinding: "Aucune variable",
    luaActionCondition: "Condition",
    luaActionExpression: "Calcul",
    luaActionTargetVariable: "Enregistrer dans la variable",
    luaButtonActions: "Actions du bouton",
    luaBottom: "Inferieur",
    luaTop: "Superieur",
    luaSyntaxOk: "Syntaxe Lua basique OK.",
    luaSaved: "Lua enregistre dans staging. Utilisez Enregistrer ZIP XML pour le telecharger.",
    noEditablePrograms: "Aucun programme editable trouve dans le XML.",
    editableBlocksLoaded: "{count} blocs editables charges.",
    selectedProgram: "Programme selectionne : {name}",
    luaScriptAdded: "Lua ScriptApp ajoute dans une nouvelle carte.",
    pythonWidgetAdded: "Python ajoute dans une nouvelle carte.",
    funcAdded: "Func ajoutee : {name}",
    analysisDone: "Analyse terminee. Erreurs : {errors}, avertissements : {warnings}.",
    autoFixApplied: "Auto Fix applique. Utilisez Voir changements pour verifier.",
    autoFixNoChanges: "Auto Fix n'a trouve aucun changement sur.",
    formatApplied: "Format applique. Utilisez Voir changements pour verifier.",
    formatNoChanges: "Format n'a trouve aucun changement.",
    noAutoFixChanges: "Aucun changement Auto Fix a afficher.",
    codeEmbedded: "Code incruste dans staging. Utilisez Enregistrer ZIP XML pour le telecharger.",
    xmlZipDownloaded: "ZIP XML telecharge.",
    pyDoctorOpened: "Syntax Doctor PY ouvert.",
    pyInlineUpdated: "Code envoye au bloc inline de Python Program.",
    pyInlineLogUpdated: "Code Python inline mis a jour depuis Syntax Doctor PY.",
    pyStageUpdated: "Code Python enregistre dans le staging XML/TNS.",
    pyStageLogUpdated: "Python de l'inspecteur mis a jour depuis Syntax Doctor PY.",
    pyFileDownloaded: "Fichier .py telecharge.",
    previewPy: "Apercu PY",
    pythonPreviewTitle: "Apercu Python",
    pythonPreviewIntro: "Execute le code actuel avec Pyodide en mode terminal. Ecrivez une reponse et appuyez sur Entree ou Envoyer quand le programme demande input().",
    pythonPreviewInput: "Entree du terminal",
    pythonPreviewRun: "Executer",
    pythonPreviewSend: "Envoyer",
    pythonPreviewRestart: "Redemarrer",
    pythonPreviewOutput: "Sortie",
    pythonPreviewRunning: "Execution Python...",
    pythonPreviewReady: "Appuyez sur Executer pour demarrer le programme.",
    pythonPreviewNoOutput: "Le programme s'est termine sans sortie imprimee.",
    pythonPreviewOk: "Python execute correctement.",
    pythonPreviewFailed: "Python a echoue pendant l'execution.",
    pythonPreviewInputExhausted: "Le programme attend une reponse.",
    pythonPreviewWaiting: "En attente d'entree...",
    pythonPreviewFinished: "Programme termine.",
    pythonPreviewTerminalPlaceholder: "Ecrivez une reponse et appuyez sur Entree",
    pythonPreviewLoopLimit: "L'apercu s'est arrete apres trop d'iterations. Verifiez s'il manque une entree ou s'il y a une boucle infinie.",
    pythonPreviewOutputLimit: "L'apercu s'est arrete car le programme a imprime trop de sortie.",
    pythonRuntimeNotReady: "Le runtime WASM n'est pas encore pret.",
    viewValue: "Voir valeur",
    viewXml: "Voir XML",
    viewDetails: "Voir detail",
    close: "Fermer",
    copyLog: "Copier log",
    copyScreenContent: "Copier contenu",
    logCopied: "Log copie dans le presse-papiers.",
    screenContentCopied: "Contenu de l'ecran copie dans le presse-papiers.",
    screenContentEmpty: "Aucun texte visible capture sur l'ecran.",
    documentSettings: "Paramètres du document",
    documentName: "Nom",
    documentType: "Type",
    libraryAccess: "Acces bibliotheque",
    arguments: "Arguments",
    runSyntax: "Analyser la syntaxe",
    format: "Format",
    resolve: "Resoudre",
    showChanges: "Voir changements",
    analysisSummary: "Resume d'analyse",
    errors: "Erreurs",
    warnings: "Avertissements",
    info: "Information",
    problemList: "Liste des problemes",
    type: "Type",
    line: "Ligne",
    col: "Col",
    total: "Total",
    description: "Description",
    normalDesc: "Décoder `.tns` en XML et reconstruire `.tns` depuis XML.",
    openNormal: "Ouvrir TNS normal",
    hideNormal: "Masquer TNS normal",
    decodeTitle: "1) Decoder .tns vers XML",
    tnsFile: "Fichier .tns",
    decodeDownloadZip: "Decoder et telecharger ZIP",
    buildTitle: "2) Creer .tns depuis XML",
    xmlFolder: "Dossier .tns.xml",
    createTns: "Creer TNS",
    pythonDesc: "Créer Python Program `.tns`, extraire `q.py` et vérifier la syntaxe Python.",
    openPython: "Ouvrir Python Program",
    hidePython: "Masquer Python Program",
    pythonBuildTitle: "3) Creer Python Program .tns",
    optionalPyFile: "Fichier .py optionnel",
    optionalTemplate: "Modele .tns optionnel",
    inlinePlaceholder: "Code inline optionnel",
    openPyDoctor: "Ouvrir Syntax Doctor PY",
    hidePyDoctor: "Masquer Syntax Doctor PY",
    createPythonTns: "Creer Python TNS",
    extractPy: "Extraire q.py",
    saveBlock: "Enregistrer bloc",
    savePythonStage: "Enregistrer dans TNS",
    downloadPy: "Telecharger .py",
    resolverNoPending: "Aucun probleme ambigu en attente a resoudre.",
    resolverTitle: "Resoudre les problemes",
    resolverPrompt: "Choisissez quoi faire pour chaque variable non declaree.",
    resolverVariable: "Variable",
    resolverDeclare: "Declarer une nouvelle variable",
    resolverIgnore: "Ignorer",
    resolverLogIgnored: "Variable {name} ignoree",
    resolverLogDeclared: "Variable {name} declaree",
    resolverLogReplaced: "Variable {name} remplacee par {value}",
    cancel: "Annuler",
    apply: "Appliquer",
    ready: "Pret",
  },
};

function detectInitialLanguage() {
  const savedLanguage = localStorage.getItem("tns-tool-language");
  if (savedLanguage && I18N[savedLanguage]) return savedLanguage;
  const browserLanguage = (navigator.language || navigator.userLanguage || "en").slice(0, 2).toLowerCase();
  return I18N[browserLanguage] ? browserLanguage : "en";
}

let language = detectInitialLanguage();
let theme = localStorage.getItem("tns-tool-theme") || "dark";

const PROBLEM_TRANSLATIONS = {
  en: {
    "Variable no declarada": "Undefined variable",
    "Variable declarada pero no utilizada": "Variable declared but never used",
    "La opcion": "Option",
    "no aparece en el menu mostrado": "does not appear in the displayed menu",
    "Disp sin argumentos": "Disp without arguments",
    "Variable ya declarada": "Variable already declared",
    "Comando desconocido": "Unknown command",
    "Too few arguments for": "Too few arguments for",
    "Too many arguments for": "Too many arguments for",
    "Expected at least": "Expected at least",
    "Expected at most": "Expected at most",
    "received": "received",
    "Sugerencias": "Suggestions",
    "Missing Then in the If..EndIf block": "Missing Then in the If..EndIf block",
    "Invalid implied multiply": "Invalid implied multiply",
    "Use multiplicacion explicita": "Use explicit multiplication",
    "Division por cero": "Divide by zero",
    "Raiz de numero negativo": "Square root of a negative number",
    "Logaritmo fuera del dominio": "Logarithm outside the domain",
    "Cadena sin cerrar": "Unclosed string",
    "Falta ')'": "Missing ')'",
    "Falta ']'": "Missing ']'",
    "Falta '}'": "Missing '}'",
    "Parentesis extra": "Extra parenthesis",
    "Corchete extra": "Extra bracket",
    "Llave extra": "Extra brace",
    "Programa no empieza con Prgm": "Program does not start with Prgm",
    "Programa no termina con EndPrgm": "Program does not end with EndPrgm",
    "Prgm duplicado": "Duplicate Prgm",
    "Condicion vacia": "Empty condition",
    "If sin EndIf correspondiente": "If without matching EndIf",
    "EndIf sin If previo": "EndIf without previous If",
    "Else and ElseIf invalid outside of If...EndIf block": "Else and ElseIf invalid outside of If...EndIf block",
    "Invalid variable name in Local statement": "Invalid variable name in Local statement",
    "Break fuera de Loop/For/While": "Break outside Loop/For/While",
    "Cycle fuera de Loop/For/While": "Cycle outside Loop/For/While",
    "Exit fuera de Loop/For/While": "Exit outside Loop/For/While",
    "La TI interpreta este caso como llamada a funcion, no multiplicacion implicita.": "TI interprets this case as a function call, not implied multiplication.",
    "EndTry is missing the matching Else statement": "EndTry is missing the matching Else statement",
    "Function is not defined": "Function is not defined",
    "Name is not a function or program": "Name is not a function or program",
    "Argument must be a variable name": "Argument must be a variable name",
    "Circular definition": "Circular definition",
    "Undefined Ans": "Undefined Ans",
    "Too many subscripts": "Too many subscripts",
    "Index out of range": "Index out of range",
    "Missing ( after": "Missing ( after",
    "Domain error": "Domain error",
    "Trig function argument too big for accurate reduction": "Trig function argument too big for accurate reduction",
    "Reserved name or system variable": "Reserved name or system variable",
    "Caracter no ASCII": "Non-ASCII character",
    "f-strings no soportados.": "f-strings are not supported.",
    "ast.parse completo sin errores criticos.": "ast.parse completed with no critical errors.",
  },
  fr: {
    "Variable no declarada": "Variable non declaree",
    "Variable declarada pero no utilizada": "Variable declaree mais non utilisee",
    "La opcion": "L'option",
    "no aparece en el menu mostrado": "n'apparait pas dans le menu affiche",
    "Disp sin argumentos": "Disp sans arguments",
    "Variable ya declarada": "Variable deja declaree",
    "Comando desconocido": "Commande inconnue",
    "Too few arguments for": "Arguments insuffisants pour",
    "Too many arguments for": "Trop d'arguments pour",
    "Expected at least": "Au moins attendu",
    "Expected at most": "Au plus attendu",
    "received": "recu",
    "Sugerencias": "Suggestions",
    "Missing Then in the If..EndIf block": "Then manquant dans le bloc If..EndIf",
    "Invalid implied multiply": "Multiplication implicite invalide",
    "Use multiplicacion explicita": "Utilisez une multiplication explicite",
    "Division por cero": "Division par zero",
    "Raiz de numero negativo": "Racine d'un nombre negatif",
    "Logaritmo fuera del dominio": "Logarithme hors du domaine",
    "Cadena sin cerrar": "Chaine non fermee",
    "Falta ')'": "')' manquant",
    "Falta ']'": "']' manquant",
    "Falta '}'": "'}' manquant",
    "Parentesis extra": "Parenthese en trop",
    "Corchete extra": "Crochet en trop",
    "Llave extra": "Accolade en trop",
    "Programa no empieza con Prgm": "Le programme ne commence pas par Prgm",
    "Programa no termina con EndPrgm": "Le programme ne se termine pas par EndPrgm",
    "Prgm duplicado": "Prgm duplique",
    "Condicion vacia": "Condition vide",
    "If sin EndIf correspondiente": "If sans EndIf correspondant",
    "EndIf sin If previo": "EndIf sans If precedent",
    "Else and ElseIf invalid outside of If...EndIf block": "Else et ElseIf invalides hors d'un bloc If...EndIf",
    "Invalid variable name in Local statement": "Nom de variable invalide dans Local",
    "Break fuera de Loop/For/While": "Break hors de Loop/For/While",
    "Cycle fuera de Loop/For/While": "Cycle hors de Loop/For/While",
    "Exit fuera de Loop/For/While": "Exit hors de Loop/For/While",
    "La TI interpreta este caso como llamada a funcion, no multiplicacion implicita.": "TI interprete ce cas comme un appel de fonction, pas comme une multiplication implicite.",
    "EndTry is missing the matching Else statement": "EndTry n'a pas le Else correspondant",
    "Function is not defined": "Fonction non definie",
    "Name is not a function or program": "Le nom n'est pas une fonction ou un programme",
    "Argument must be a variable name": "L'argument doit etre un nom de variable",
    "Circular definition": "Definition circulaire",
    "Undefined Ans": "Ans non defini",
    "Too many subscripts": "Trop d'indices",
    "Index out of range": "Indice hors limites",
    "Missing ( after": "( manquant apres",
    "Domain error": "Erreur de domaine",
    "Trig function argument too big for accurate reduction": "Argument trigonometrique trop grand pour une reduction precise",
    "Reserved name or system variable": "Nom reserve ou variable systeme",
    "Caracter no ASCII": "Caractere non ASCII",
    "f-strings no soportados.": "Les f-strings ne sont pas pris en charge.",
    "ast.parse completo sin errores criticos.": "ast.parse termine sans erreurs critiques.",
  },
};

const SEVERITY_LABELS = {
  es: { ERROR: "ERROR", WARNING: "WARNING", INFO: "INFO", error: "error", warning: "warning", info: "info" },
  en: { ERROR: "ERROR", WARNING: "WARNING", INFO: "INFO", error: "error", warning: "warning", info: "info" },
  fr: { ERROR: "ERREUR", WARNING: "AVERT.", INFO: "INFO", error: "erreur", warning: "avert.", info: "info" },
};

function t(key) {
  return I18N[language]?.[key] || I18N.es[key] || key;
}

function tf(key, values = {}) {
  let text = t(key);
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

function translateProblemText(message = "", detail = "", code = "") {
  const replacements = PROBLEM_TRANSLATIONS[language] || {};
  let text = String(message);
  let translatedDetail = String(detail || "");
  for (const [source, target] of Object.entries(replacements)) {
    text = text.replaceAll(source, target);
    translatedDetail = translatedDetail.replaceAll(source, target);
  }
  return `${code ? `${code}: ` : ""}${text}${translatedDetail ? ` - ${translatedDetail}` : ""}`;
}

function severityLabel(severity) {
  return SEVERITY_LABELS[language]?.[severity] || severity;
}

const PYTHON_FILES = [
  "tnstools.py",
  "tns_method13.py",
  "tns_outer_parse.py",
  "tixc_encode.py",
  "tixc_decode.py",
  "syntax_doctor_py_core.py",
  "convert/code_to_tns.py",
  "convert/tns_reader.py",
  "editor_XML/ti_syntax.py",
  "editor_XML/ti_parser.py",
  "editor_XML/ti_serializer.py",
  "editor_XML/xml_scanner.py",
  "editor_XML/xml_updater.py",
];

let pyodide;
const xmlDoctor = {
  sourcePath: "/work/xml_doctor_input",
  stagePath: "/work/xml_doctor_stage",
  sourceFileName: "",
  candidates: [],
  current: null,
  lastDiff: "",
  embedded: false,
  stagePrepared: false,
  lastReport: null,
  issueLines: new Map(),
  variableCatalog: [],
};
const pyDoctor = {
  lastOriginal: "",
  lastFixed: "",
  lastChanges: [],
  lastReport: null,
  issueLines: new Map(),
  target: null,
};
const pyDoctorModal = {
  backdrop: null,
  parent: null,
  nextSibling: null,
};
const codeEditorAdapters = new Map();

function log(message) {
  logEl.textContent += `${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function applyLanguage(nextLanguage = language) {
  language = nextLanguage;
  localStorage.setItem("tns-tool-language", language);
  document.documentElement.lang = language;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  }
  for (const button of document.querySelectorAll("#language-buttons button")) {
    button.classList.toggle("active", button.dataset.lang === language);
  }
    syncToggleLabels();
    updateXmlLineLabel();
    updatePyLineLabel();
    if (xmlDoctor.lastReport) renderXmlAnalysis(xmlDoctor.lastReport);
    if (pyDoctor.lastReport) renderPyAnalysis(pyDoctor.lastReport);
    if (statusEl && statusEl.classList.contains("ready")) {
      statusEl.textContent = t("ready");
    }
}

function applyTheme(nextTheme = theme) {
  theme = nextTheme === "dark" ? "dark" : "light";
  localStorage.setItem("tns-tool-theme", theme);
  document.documentElement.dataset.theme = theme;
  window.TnsMonacoEditor?.setTheme?.(theme);
  const button = document.querySelector("#theme-btn");
  if (button) {
    button.textContent = theme === "dark" ? "☀" : "☾";
    button.title = theme === "dark" ? "Modo claro" : "Modo oscuro";
  }
}

function toggleCollapsible(element, afterChange = null) {
  if (!element) return;
  if (element.classList.contains("collapsed")) {
    element.classList.remove("collapsed", "closing");
    element.style.overflow = "hidden";
    element.style.height = "0px";
    element.style.opacity = "0";
    window.requestAnimationFrame(() => {
      element.style.transition = "height 320ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 260ms ease";
      element.style.height = `${element.scrollHeight}px`;
      element.style.opacity = "1";
      window.setTimeout(() => {
        element.style.height = "";
        element.style.opacity = "";
        element.style.overflow = "";
        element.style.transition = "";
        if (typeof afterChange === "function") afterChange();
      }, 330);
    });
    return;
  }
  element.style.height = `${element.offsetHeight}px`;
  element.style.overflow = "hidden";
  element.classList.add("closing");
  window.requestAnimationFrame(() => {
    element.style.transition = "height 260ms ease, opacity 220ms ease";
    element.style.height = "0px";
    element.style.opacity = "0";
  });
  window.setTimeout(() => {
    element.classList.add("collapsed");
    element.classList.remove("closing");
    element.style.height = "";
    element.style.opacity = "";
    element.style.overflow = "";
    element.style.transition = "";
    if (typeof afterChange === "function") afterChange();
  }, 270);
}

function appPanels() {
  return [
    document.querySelector("#xml-doctor-panel"),
    document.querySelector("#normal-module"),
    document.querySelector("#python-module"),
  ].filter(Boolean);
}

function panelForTool(tool) {
  if (tool === "xml") return document.querySelector("#xml-doctor-panel");
  if (tool === "normal") return document.querySelector("#normal-module");
  if (tool === "python") return document.querySelector("#python-module");
  return null;
}

function openExclusivePanel(target) {
  if (!target) return;
  for (const panel of appPanels()) {
    if (panel !== target && !panel.classList.contains("collapsed")) {
      toggleCollapsible(panel, syncToggleLabels);
    }
  }
  if (target.classList.contains("collapsed")) {
    toggleCollapsible(target, syncToggleLabels);
  } else {
    syncToggleLabels();
  }
}

function toggleExclusivePanel(target) {
  if (!target) return;
  if (!target.classList.contains("collapsed")) {
    toggleCollapsible(target, syncToggleLabels);
    return;
  }
  openExclusivePanel(target);
}

function syncToggleLabels() {
  const xmlPanel = document.querySelector("#xml-doctor-panel");
  const normalModule = document.querySelector("#normal-module");
  const pythonModule = document.querySelector("#python-module");
  const pyPanel = document.querySelector("#py-doctor-panel");
  document.body.classList.toggle("app-active", !xmlPanel.classList.contains("collapsed") || !normalModule.classList.contains("collapsed") || !pythonModule.classList.contains("collapsed"));
  document.querySelector("#xml-toggle-btn").textContent = xmlPanel.classList.contains("collapsed") ? t("openXmlDoctor") : t("hideXmlDoctor");
  document.querySelector("#normal-toggle-btn").textContent = normalModule.classList.contains("collapsed") ? t("openNormal") : t("hideNormal");
  document.querySelector("#python-toggle-btn").textContent = pythonModule.classList.contains("collapsed") ? t("openPython") : t("hidePython");
  document.querySelector("#py-doctor-toggle-btn").textContent = pyPanel.classList.contains("collapsed") ? t("openPyDoctor") : t("hidePyDoctor");
  updatePyDoctorSaveLabel();
  layoutCodeEditors();
}

function updatePyDoctorSaveLabel() {
  const saveButton = document.querySelector("#py-doctor-save-btn");
  if (!saveButton) return;
  saveButton.textContent = pyDoctor.target?.mode === "xml-python" ? t("savePythonStage") : t("saveBlock");
}

function setReady(value) {
  for (const button of document.querySelectorAll("button")) {
    if (button.closest("#language-buttons")) continue;
    if (button.id === "theme-btn" || button.id === "about-btn") continue;
    button.disabled = !value;
  }
}

function singleFileList(file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  return transfer.files;
}

async function handleDroppedFiles(files) {
  const dropped = [...files].filter(Boolean);
  if (!dropped.length) return;
  const first = dropped[0];
  const name = (first.name || "").toLowerCase();
  if (name.endsWith(".py")) {
    const input = document.querySelector("#py-file");
    input.files = singleFileList(first);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    openExclusivePanel(panelForTool("python"));
    log(`Archivo Python listo: ${first.name}`);
    return;
  }
  if (name.endsWith(".tns")) {
    openExclusivePanel(panelForTool("xml"));
    await openTnsInXmlDoctor(first);
    return;
  }
  const xmlFiles = dropped.filter((file) => (file.name || "").toLowerCase().endsWith(".xml"));
  if (xmlFiles.length) {
    openExclusivePanel(panelForTool("xml"));
    await loadXmlDoctorFiles(xmlFiles, xmlFiles.length > 1 ? "folder" : "file");
    return;
  }
  log(`Tipo de archivo no soportado para arrastrar: ${first.name}`);
}

function wireDropZone() {
  const zone = document.querySelector(".drop-zone");
  const wireTarget = (target, className) => {
    if (!target) return;
    for (const eventName of ["dragenter", "dragover"]) {
      target.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        target.classList.add(className);
      });
    }
    for (const eventName of ["dragleave", "drop"]) {
      target.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (eventName === "dragleave" && event.relatedTarget && target.contains(event.relatedTarget)) return;
        target.classList.remove(className);
        if (eventName === "drop") clearGlobalDropState();
      });
    }
    target.addEventListener("drop", (event) => {
      clearGlobalDropState();
      handleDroppedFiles(event.dataTransfer.files)
        .catch((err) => log(`ERROR drop: ${err.stack || err.message}`))
        .finally(clearGlobalDropState);
    });
  };
  wireTarget(zone, "dragging");
  wireTarget(document.querySelector("#xml-doctor-panel"), "drop-target-active");
}

let globalFileDropDepth = 0;
let globalFileDropClearTimer = null;

function isFileDragEvent(event) {
  const types = Array.from(event.dataTransfer?.types || []);
  return types.includes("Files") || types.includes("application/x-moz-file");
}

function clearGlobalDropState() {
  globalFileDropDepth = 0;
  if (globalFileDropClearTimer) {
    clearTimeout(globalFileDropClearTimer);
    globalFileDropClearTimer = null;
  }
  document.body?.classList.remove("drop-target-active");
  document.querySelector("#xml-doctor-panel")?.classList.remove("drop-target-active");
  document.querySelector(".drop-zone")?.classList.remove("dragging");
}

function scheduleGlobalDropStateClear() {
  if (globalFileDropClearTimer) clearTimeout(globalFileDropClearTimer);
  globalFileDropClearTimer = setTimeout(clearGlobalDropState, 1800);
}

function wireGlobalFileDropGuard() {
  window.addEventListener("dragenter", (event) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    globalFileDropDepth += 1;
    document.body.classList.add("drop-target-active");
    scheduleGlobalDropStateClear();
  });
  window.addEventListener("dragover", (event) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    document.body.classList.add("drop-target-active");
    scheduleGlobalDropStateClear();
  });
  window.addEventListener("dragleave", (event) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    globalFileDropDepth = Math.max(0, globalFileDropDepth - 1);
    const leftViewport = event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight;
    if (globalFileDropDepth === 0 || leftViewport) clearGlobalDropState();
  });
  window.addEventListener("drop", (event) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    const files = event.dataTransfer?.files;
    clearGlobalDropState();
    if (files?.length) {
      handleDroppedFiles(files)
        .catch((err) => log(`ERROR drop: ${err.stack || err.message}`))
        .finally(clearGlobalDropState);
    }
  });
  window.addEventListener("dragend", clearGlobalDropState);
  window.addEventListener("blur", clearGlobalDropState);
  document.addEventListener("visibilitychange", clearGlobalDropState);
}

function wireMouseGlow() {
  const glow = document.querySelector("#mouse-glow");
  if (!glow) return;
  const update = (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.style.opacity = "1";
  };
  window.addEventListener("pointermove", update);
  window.addEventListener("pointerleave", () => {
    glow.style.opacity = "0";
  });
}

function closeToolMenus(except = null) {
  for (const menu of document.querySelectorAll(".tool-menu.open")) {
    if (except && (menu === except || menu.contains(except))) continue;
    menu.classList.remove("open");
  }
}

function wireToolMenus() {
  for (const trigger of document.querySelectorAll(".menu-trigger, .nested-trigger")) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const menu = trigger.closest(".tool-menu");
      const shouldOpen = !menu.classList.contains("open");
      closeToolMenus(menu.closest(".nested-menu") ? menu.parentElement.closest(".tool-menu") : null);
      menu.classList.toggle("open", shouldOpen);
    });
  }
  for (const action of document.querySelectorAll(".menu-panel .menu-action")) {
    action.addEventListener("click", () => {
      if (action.classList.contains("nested-trigger")) return;
      window.setTimeout(() => closeToolMenus(), 80);
    });
  }
  document.addEventListener("click", () => closeToolMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeToolMenus();
  });
}

async function initPyodideRuntime() {
  setReady(false);
  if (window.location.protocol === "file:") {
    throw new Error(
      "No abras index.html con file://. El navegador bloquea fetch() para Pyodide, LuaJS y plantillas. " +
      "Ejecuta en la carpeta del proyecto: python -m http.server 8000 y abre http://localhost:8000/"
    );
  }
  if (statusEl) statusEl.textContent = "Cargando Pyodide...";
  pyodide = await loadPyodide();
  if (statusEl) statusEl.textContent = "Cargando pycryptodome...";
  await pyodide.loadPackage("pycryptodome");

  pyodide.FS.mkdirTree("/home/pyodide/convert");
  pyodide.FS.mkdirTree("/home/pyodide/editor_XML");
  pyodide.FS.mkdirTree("/work");

  for (const file of PYTHON_FILES) {
    const response = await fetch(`./${file}?v=${SOURCE_VERSION}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${file}: HTTP ${response.status}`);
    }
    pyodide.FS.writeFile(`/home/pyodide/${file}`, await response.text());
  }

  await pyodide.runPythonAsync(`
import sys
for name in list(sys.modules):
    if name in {"ti_syntax", "ti_parser", "ti_serializer", "xml_scanner", "xml_updater", "syntax_doctor_py_core"}:
        del sys.modules[name]
sys.path.insert(0, "/home/pyodide")
sys.path.insert(0, "/home/pyodide/convert")
sys.path.insert(0, "/home/pyodide/editor_XML")
`);
  if (statusEl) {
    statusEl.textContent = t("ready");
    statusEl.classList.add("ready");
  }
  setReady(true);
  setXmlDoctorEnabled(false);
  setPyDoctorEnabled(false);
  log("Runtime WASM listo.");
}

async function ensureCryptoPackage() {
  try {
    await pyodide.runPythonAsync("import Crypto");
  } catch {
    if (statusEl) statusEl.textContent = "Cargando pycryptodome...";
    await pyodide.loadPackage("pycryptodome");
    await pyodide.runPythonAsync("import Crypto");
    if (statusEl) statusEl.textContent = t("ready");
  }
}

function clearDir(path) {
  try {
    for (const name of pyodide.FS.readdir(path)) {
      if (name === "." || name === "..") continue;
      const child = `${path}/${name}`;
      const stat = pyodide.FS.stat(child);
      if (pyodide.FS.isDir(stat.mode)) {
        clearDir(child);
        pyodide.FS.rmdir(child);
      } else {
        pyodide.FS.unlink(child);
      }
    }
  } catch {
    pyodide.FS.mkdirTree(path);
  }
}

function copyDir(sourcePath, targetPath) {
  pyodide.FS.mkdirTree(targetPath);
  for (const name of pyodide.FS.readdir(sourcePath)) {
    if (name === "." || name === "..") continue;
    const sourceChild = `${sourcePath}/${name}`;
    const targetChild = `${targetPath}/${name}`;
    const stat = pyodide.FS.stat(sourceChild);
    if (pyodide.FS.isDir(stat.mode)) {
      copyDir(sourceChild, targetChild);
    } else {
      ensureParent(targetChild);
      pyodide.FS.writeFile(targetChild, pyodide.FS.readFile(sourceChild));
    }
  }
}

function ensureParent(path) {
  const parts = path.split("/");
  parts.pop();
  pyodide.FS.mkdirTree(parts.join("/") || "/");
}

async function writeFileToFs(file, targetPath) {
  ensureParent(targetPath);
  pyodide.FS.writeFile(targetPath, new Uint8Array(await file.arrayBuffer()));
}

function downloadBytes(filename, bytes, type = "application/octet-stream") {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function collectFiles(path, zip, prefix = "") {
  for (const name of pyodide.FS.readdir(path)) {
    if (name === "." || name === "..") continue;
    const child = `${path}/${name}`;
    const zipName = prefix ? `${prefix}/${name}` : name;
    const stat = pyodide.FS.stat(child);
    if (pyodide.FS.isDir(stat.mode)) {
      collectFiles(child, zip, zipName);
    } else {
      zip.file(zipName, pyodide.FS.readFile(child));
    }
  }
}

function folderRelativePath(file) {
  const raw = file.webkitRelativePath || file.name;
  const parts = raw.split("/").filter(Boolean);
  if (parts.length > 1) parts.shift();
  return parts.join("/") || file.name;
}

function updateXmlLineNumbers() {
  const code = document.querySelector("#xml-code");
  const gutter = document.querySelector("#xml-line-numbers");
  const total = Math.max(1, code.value.split("\n").length);
  gutter.innerHTML = Array.from({ length: total }, (_, index) => {
    const line = index + 1;
    const severity = xmlDoctor.issueLines.get(line) || "";
    return `<div class="line-row ${severity.toLowerCase()}"><span class="dot"></span><span>${line}</span></div>`;
  }).join("");
  gutter.scrollTop = code.scrollTop;
  updateXmlLineLabel();
  updateXmlHighlight();
}

function updateDoctorLineNumbers(prefix, issueLines) {
  const code = document.querySelector(`#${prefix}-code`);
  const gutter = document.querySelector(`#${prefix}-line-numbers`);
  const total = Math.max(1, code.value.split("\n").length);
  gutter.innerHTML = Array.from({ length: total }, (_, index) => {
    const line = index + 1;
    const severity = issueLines.get(line) || "";
    return `<div class="line-row ${severity.toLowerCase()}"><span class="dot"></span><span>${line}</span></div>`;
  }).join("");
  gutter.scrollTop = code.scrollTop;
}

function updateXmlLineLabel() {
  const code = document.querySelector("#xml-code");
  const pos = code.selectionStart || 0;
  const before = code.value.slice(0, pos);
  const line = before.split("\n").length;
  const col = before.length - before.lastIndexOf("\n");
  const total = Math.max(1, code.value.split("\n").length);
  document.querySelector("#xml-line-label").textContent = `${t("line")}: ${line} ${t("col")}: ${col} ${t("total")}: ${total}`;
}

function updatePyLineLabel() {
  const code = document.querySelector("#py-code");
  const pos = code.selectionStart || 0;
  const before = code.value.slice(0, pos);
  const line = before.split("\n").length;
  const col = before.length - before.lastIndexOf("\n");
  const total = Math.max(1, code.value.split("\n").length);
  document.querySelector("#py-line-label").textContent = `${t("line")}: ${line} ${t("col")}: ${col} ${t("total")}: ${total}`;
}

function xmlLocalVariables(text) {
  const variables = new Set();
  for (const line of text.split("\n")) {
    const match = /^\s*Local\s+(.+)$/i.exec(line);
    if (!match) continue;
    for (const raw of match[1].split(",")) {
      const name = raw.trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) variables.add(name);
    }
  }
  return variables;
}

function htmlEscape(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function spanToken(className, value) {
  return `<span class="${className}">${htmlEscape(value)}</span>`;
}

function highlightTiLine(line, variables) {
  const keywords = new Set(["Define", "LibPriv", "LibPub", "Prgm", "Func", "Local", "If", "Then", "Else", "ElseIf", "EndIf", "Disp", "Request", "Text", "Return", "EndPrgm", "EndFunc"]);
  let output = "";
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '"' && line[end - 1] !== "\\") {
          end += 1;
          break;
        }
        end += 1;
      }
      output += spanToken("tok-string", line.slice(index, end));
      index = end;
      continue;
    }
    if (char === "\u2192" || char === "&" || char === "\u00b7" || char === "=") {
      output += spanToken("tok-op-red", char);
      index += 1;
      continue;
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(index));
    if (ident) {
      const word = ident[0];
      if (keywords.has(word)) {
        output += spanToken("tok-keyword", word);
      } else if (variables.has(word) || word.toLowerCase() === "clrio") {
        output += spanToken("tok-variable", word);
      } else {
        output += spanToken("tok-plain", word);
      }
      index += word.length;
      continue;
    }
    output += spanToken("tok-plain", char);
    index += 1;
  }
  return output || " ";
}

function highlightPythonLine(line) {
  const keywords = new Set(["import", "def", "while", "try", "except", "if", "elif", "return", "True"]);
  let output = "";
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '"' && line[end - 1] !== "\\") {
          end += 1;
          break;
        }
        end += 1;
      }
      output += spanToken("tok-py-string", line.slice(index, end));
      index = end;
      continue;
    }
    const number = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?/i.exec(line.slice(index));
    if (number) {
      output += spanToken("tok-plain", number[0]);
      index += number[0].length;
      continue;
    }
    if ("=+-/*.".includes(char)) {
      if (char === "=" && line[index + 1] === "=") {
        output += spanToken("tok-op-red", "==");
        index += 2;
      } else {
        output += spanToken("tok-op-red", char);
        index += 1;
      }
      continue;
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(index));
    if (ident) {
      const word = ident[0];
      output += keywords.has(word) ? spanToken("tok-keyword", word) : spanToken("tok-plain", word);
      index += word.length;
      continue;
    }
    output += spanToken("tok-plain", char);
    index += 1;
  }
  return output || " ";
}

  function updateXmlHighlight() {
    const code = document.querySelector("#xml-code");
    const highlight = document.querySelector("#xml-highlight");
    const variables = xmlLocalVariables(code.value);
    highlight.innerHTML = code.value.split("\n").map((line, index) => {
      const severity = xmlDoctor.issueLines.get(index + 1) || "";
      return `<div class="code-line ${severity.toLowerCase()}">${highlightTiLine(line, variables) || " "}</div>`;
    }).join("");
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
  }

  function updatePyHighlight() {
    const code = document.querySelector("#py-code");
    const highlight = document.querySelector("#py-highlight");
    highlight.innerHTML = code.value.split("\n").map((line, index) => {
      const severity = pyDoctor.issueLines.get(index + 1) || "";
      return `<div class="code-line ${severity.toLowerCase()}">${highlightPythonLine(line) || " "}</div>`;
    }).join("");
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
  }

function xmlLog(message) {
  const target = document.querySelector("#xml-log");
  target.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
  target.scrollTop = target.scrollHeight;
}

function setXmlDoctorEnabled(enabled) {
  for (const id of ["xml-embed-btn", "xml-save-btn", "xml-create-tns-btn", "xml-inspector-btn", "xml-add-func-btn", "xml-document-btn", "xml-syntax-btn", "xml-autofix-btn", "xml-format-btn", "xml-resolve-btn", "xml-changes-btn"]) {
    document.querySelector(`#${id}`).disabled = !enabled;
  }
  document.querySelector("#xml-programs").disabled = !enabled;
  document.querySelector("#xml-code").disabled = !enabled;
  setStaticCodeEditorReadOnly("#xml-code", !enabled);
}

function setXmlDoctorDocumentActionsEnabled(enabled) {
  for (const id of ["xml-save-btn", "xml-create-tns-btn", "xml-inspector-btn", "xml-add-func-btn", "xml-document-btn"]) {
    const el = document.querySelector(`#${id}`);
    if (el) el.disabled = !enabled;
  }
}

function setPyDoctorEnabled(enabled) {
  for (const id of ["py-doctor-save-btn", "py-doctor-download-btn", "py-doctor-syntax-btn", "py-doctor-preview-btn", "py-doctor-autofix-btn", "py-doctor-changes-btn"]) {
    document.querySelector(`#${id}`).disabled = !enabled;
  }
  document.querySelector("#py-code").disabled = !enabled;
  setStaticCodeEditorReadOnly("#py-code", !enabled);
}

async function loadXmlDoctorFiles(files, mode) {
  if (!files.length) return;
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
  xmlDoctor.sourceFileName = mode === "folder"
    ? (folderRelativePath(files[0]).split(/[\\/]/)[0] || files[0].name || "documento")
    : (files[0].name || "documento");
  for (const file of files) {
    const rel = mode === "folder" ? folderRelativePath(file) : file.name;
    await writeFileToFs(file, `${xmlDoctor.sourcePath}/${rel}`);
  }
  xmlDoctor.embedded = false;
  xmlDoctor.stagePrepared = false;
  xmlDoctor.lastDiff = "";
  xmlDoctor.lastReport = null;
  xmlDoctor.issueLines.clear();
  await scanXmlPrograms();
}

async function openTnsInXmlDoctor(file) {
  if (!file) return;
  await ensureCryptoPackage();
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
  xmlDoctor.sourceFileName = file.name || "documento.tns";
  await writeFileToFs(file, "/work/xml_doctor_input.tns");
  await pyodide.runPythonAsync(`
from pathlib import Path
from tnstools import decode_tns_file
decode_tns_file(Path("/work/xml_doctor_input.tns"), Path("${xmlDoctor.sourcePath}"))
`);
  xmlDoctor.embedded = false;
  xmlDoctor.stagePrepared = false;
  xmlDoctor.lastDiff = "";
  xmlDoctor.lastReport = null;
  xmlDoctor.issueLines.clear();
  await scanXmlPrograms();
  xmlLog(`TNS abierto: ${file.name}`);
}

async function scanXmlPrograms() {
  const scanPath = xmlDoctor.stagePrepared ? xmlDoctor.stagePath : xmlDoctor.sourcePath;
  pyodide.globals.set("wasm_xml_scan_path", scanPath);
  const payload = await pyodide.runPythonAsync(`
import json
from pathlib import Path
from xml_scanner import XMLScanner
from ti_parser import ti_serialized_to_multiline

def body_score(code):
    lines = []
    for line in code.replace("\\r", "\\n").split("\\n"):
        clean = line.strip().lstrip(":").strip().lower()
        if clean and clean not in {"prgm", "endprgm", "func", "endfunc"}:
            lines.append(clean)
    return len(lines)

items_by_key = {}
for index, candidate in enumerate(XMLScanner(Path(wasm_xml_scan_path)).scan()):
    if not candidate.code_text:
        continue
    try:
        code = ti_serialized_to_multiline(candidate.code_text)
    except Exception:
        code = candidate.code_text
    item = {
        "index": index,
        "program_name": candidate.program_name or candidate.file.stem,
        "original_name": candidate.program_name or candidate.file.stem,
        "file": str(candidate.file),
        "path": candidate.path,
        "kind": candidate.kind,
        "document_type": candidate.document_type,
        "library_access": candidate.library_access,
        "parameters": candidate.parameters or "",
        "code": code,
    }
    key = (item["program_name"], item["file"], item["document_type"])
    current = items_by_key.get(key)
    current_score = body_score(current["code"]) if current else -1
    new_score = body_score(code)
    if current is None or (new_score, len(code)) > (current_score, len(current["code"])):
        items_by_key[key] = item
items = list(items_by_key.values())
for index, item in enumerate(items):
    item["index"] = index
json.dumps(items)
`);
  xmlDoctor.candidates = JSON.parse(payload);
  collectLoadedTnsVariables();
  const combo = document.querySelector("#xml-programs");
  combo.innerHTML = "";
  for (const item of xmlDoctor.candidates) {
    const option = document.createElement("option");
    option.value = String(item.index);
    option.textContent = `${item.program_name} [${item.document_type || "Basic"}] (${item.file.split("/").pop()})`;
    combo.append(option);
  }
  if (!xmlDoctor.candidates.length) {
    setXmlDoctorEnabled(false);
    setXmlDoctorDocumentActionsEnabled(true);
    xmlDoctor.current = null;
    document.querySelector("#xml-code").value = "";
    updateXmlLineNumbers();
    xmlLog(t("noEditablePrograms"));
    return;
  }
  setXmlDoctorEnabled(true);
  selectXmlProgram(xmlDoctor.candidates[0].index);
  xmlLog(tf("editableBlocksLoaded", { count: xmlDoctor.candidates.length }));
}

function selectXmlProgram(index) {
  xmlDoctor.current = xmlDoctor.candidates.find((item) => item.index === Number(index));
  if (!xmlDoctor.current) return;
  const code = document.querySelector("#xml-code");
  code.value = xmlDoctor.current.code;
  xmlDoctor.lastDiff = "";
  xmlDoctor.embedded = false;
  xmlDoctor.lastReport = null;
  xmlDoctor.issueLines.clear();
  updateXmlLineNumbers();
  renderXmlAnalysis({ errors: 0, warnings: 0, infos: 0, diagnostics: [] });
  xmlLog(tf("selectedProgram", { name: xmlDoctor.current.program_name }));
}

async function inspectXmlDocument() {
  const inspectPath = xmlDoctor.stagePrepared ? xmlDoctor.stagePath : xmlDoctor.sourcePath;
  pyodide.globals.set("wasm_xml_inspect_path", inspectPath);
  const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name, namespace_uri

root_path = Path(wasm_xml_inspect_path)
items = []
summary = {"files": 0, "cards": 0, "widgets": 0, "lua_scripts": 0, "python_editors": 0, "python_files": 0, "resources": 0, "images": 0, "spreadsheets": 0, "notepads": 0, "graphs": 0, "calculators": 0, "basic_blocks": 0, "symbols": 0}
python_files_seen = set()
image_extensions = {".bmp", ".png", ".jpg", ".jpeg", ".gif"}

def element_path(element, parent_map):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

for xml_file in sorted(root_path.rglob("*.xml")):
    if any(part.startswith("_") for part in xml_file.parts):
        continue
    summary["files"] += 1
    tree = ET.parse(xml_file)
    root = tree.getroot()
    parent_map = {child: parent for parent in root.iter() for child in parent}

    def raw_xml(element):
        return ET.tostring(element, encoding="unicode", short_empty_elements=False)

    def child_text(element, wanted_ns, wanted_name):
        for child in element.iter():
            if namespace_uri(child.tag) == wanted_ns and local_name(child.tag) == wanted_name:
                return (child.text or "").strip()
        return ""

    def find_python_file(py_name):
        candidates = []
        if py_name:
            py_path = Path(py_name.replace("\\\\", "/"))
            candidates.append(root_path / py_path.name)
            stem = py_path.stem
            candidates.extend(sorted(root_path.rglob(f"{stem}.py")))
            candidates.extend(sorted(root_path.rglob(f"{stem}.pyt")))
        candidates.extend(sorted(root_path.rglob("*.py")))
        candidates.extend(sorted(root_path.rglob("*.pyt")))
        seen = set()
        for candidate in candidates:
            candidate = Path(candidate)
            key = candidate.as_posix()
            if key in seen or not candidate.is_file() or "_artifacts" in candidate.parts:
                continue
            seen.add(key)
            try:
                return candidate, candidate.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                return candidate, candidate.read_text(encoding="utf-8", errors="replace")
        return None, ""

    for element in root.iter():
        lname = local_name(element.tag)
        ns = namespace_uri(element.tag)
        if lname == "card":
            summary["cards"] += 1
            items.append({"type": "Card", "name": f"Card {summary['cards']}", "file": str(xml_file), "path": element_path(element, parent_map), "detail": element.attrib, "raw_xml": raw_xml(element)})
        elif lname == "wdgt":
            summary["widgets"] += 1
            widget_type = element.attrib.get("type", "Unknown widget")
            detail = dict(element.attrib)
            content = ""
            content_label = ""
            if widget_type == "TI.ProgramEditor":
                pe_ns = "urn:TI.ProgramEditor"
                detail.update({
                    "name": child_text(element, pe_ns, "name"),
                    "type": child_text(element, pe_ns, "type"),
                    "visibility": child_text(element, pe_ns, "visibility"),
                })
                content = child_text(element, pe_ns, "laststoredexpr")
                content_label = "ProgramEditor"
            elif widget_type == "TI.PythonEditor":
                py_ns = "urn:TI.PythonEditor"
                py_name = child_text(element, py_ns, "name")
                py_file, py_content = find_python_file(py_name)
                summary["python_editors"] += 1
                if py_file:
                    summary["python_files"] += 1
                    python_files_seen.add(str(py_file))
                detail.update({
                    "name": py_name,
                    "dirf": child_text(element, py_ns, "dirf"),
                    "python_file": str(py_file) if py_file else "",
                    "length": len(py_content),
                })
                content = py_content
                content_label = "Python"
            elif widget_type == "TI.PythonShell":
                pysh_ns = "urn:TI.PythonShell"
                detail.update({"name": child_text(element, pysh_ns, "name")})
            elif widget_type == "tabulator":
                tb_ns = "urn:tabulator"
                summary["spreadsheets"] += 1
                column_count = 0
                for candidate in element.iter():
                    if namespace_uri(candidate.tag) == tb_ns and local_name(candidate.tag) == "column" and candidate.attrib.get("type") == "cell-column":
                        column_count += 1
                detail.update({
                    "columns": column_count,
                    "showingLnS": child_text(element, tb_ns, "showingLnS"),
                })
                content_label = "Spreadsheet"
            elif widget_type == "TI.Notepad":
                np_ns = "urn:TI.Notepad"
                summary["notepads"] += 1
                fmtxt = child_text(element, np_ns, "fmtxt")
                note_text = ""
                if fmtxt:
                    try:
                        fmt_root = ET.fromstring(fmtxt)
                        lines = []
                        for para in fmt_root.iter():
                            if local_name(para.tag) != "node" or para.attrib.get("name") != "1para":
                                continue
                            chunks = []
                            for leaf in para.iter():
                                if local_name(leaf.tag) == "leaf" and leaf.attrib.get("name") == "1word":
                                    chunks.append("".join(leaf.itertext()))
                            lines.append("".join(chunks))
                        note_text = chr(10).join(lines) if lines else "".join(fmt_root.itertext())
                    except Exception:
                        note_text = fmtxt
                content = note_text
                content_label = "Notepad"
                detail.update({"length": len(note_text)})
            elif widget_type == "TI.GeoGrapher":
                gg_ns = "urn:TI.GeoGrapher"
                summary["graphs"] += 1
                graph_expr = ""
                graph_name = "f1"
                for candidate in element.iter():
                    if namespace_uri(candidate.tag) != gg_ns:
                        continue
                    if local_name(candidate.tag) == "expression":
                        for child in candidate:
                            if local_name(child.tag) == "expr" and not graph_expr:
                                graph_expr = (child.text or "").strip()
                            elif local_name(child.tag) == "lbl" and (child.text or "").strip():
                                graph_name = (child.text or "").strip()
                        break
                content = graph_expr
                content_label = "Graph"
                detail.update({"function": graph_name, "expression": graph_expr})
            elif widget_type == "TI.Scratchpad":
                sp_ns = "urn:TI.Scratchpad"
                summary["calculators"] += 1
                rows = []
                detail_rows = []
                for erow in element.iter():
                    if namespace_uri(erow.tag) == sp_ns and local_name(erow.tag) == "erow":
                        entry = child_text(erow, sp_ns, "entr")
                        exact = child_text(erow, sp_ns, "exct")
                        display = child_text(erow, sp_ns, "disp")
                        full = child_text(erow, sp_ns, "full")
                        detail_rows.append({"entry": entry, "exact": exact, "display": display, "full": full})
                        rows.append(f"Entrada: {entry}\\nExacto: {exact}\\nResultado: {display}")
                content = "\\n\\n".join(rows)
                content_label = "Scratchpad"
                detail.update({"rows": detail_rows, "rowCount": len(detail_rows)})
            items.append({"type": "Widget", "name": widget_type, "file": str(xml_file), "path": element_path(element, parent_map), "detail": detail, "content": content, "content_label": content_label, "raw_xml": raw_xml(element)})
        elif lname == "script":
            text = element.text or ""
            if text:
                summary["lua_scripts"] += 1
                items.append({"type": "Lua Script", "name": f"Lua Script {summary['lua_scripts']}", "file": str(xml_file), "path": element_path(element, parent_map), "detail": {"length": len(text)}, "content": text, "content_label": "Lua", "raw_xml": raw_xml(element)})
        elif lname == "e":
            summary["symbols"] += 1
            name = ""
            value = ""
            params = ""
            for child in element:
                child_name = local_name(child.tag)
                if child_name == "n":
                    name = (child.text or "").strip()
                elif child_name == "v":
                    value = child.text or ""
                elif child_name == "p":
                    params = (child.text or "").strip()
            symbol_type = {"6": "Func", "7": "Prgm"}.get(element.attrib.get("t"), "Symbol")
            if symbol_type in {"Func", "Prgm"}:
                summary["basic_blocks"] += 1
            items.append({"type": symbol_type, "name": name or "(sin nombre)", "file": str(xml_file), "path": element_path(element, parent_map), "detail": {"t": element.attrib.get("t"), "f": element.attrib.get("f"), "parameters": params, "length": len(value)}, "content": value if symbol_type not in {"Func", "Prgm"} else "", "content_label": "Value", "raw_xml": raw_xml(element)})

for resource in sorted(root_path.rglob("*")):
    if not resource.is_file() or resource.suffix.lower() == ".xml" or "_artifacts" in resource.parts:
        continue
    if str(resource) in python_files_seen:
        continue
    summary["resources"] += 1
    content = ""
    content_label = ""
    detail = {"length": resource.stat().st_size, "extension": resource.suffix.lower()}
    if resource.suffix.lower() in image_extensions:
        summary["images"] += 1
        content_label = "Image"
        detail.update({"name": resource.name, "image_file": str(resource)})
    elif resource.suffix.lower() in {".py", ".pyt", ".txt", ".lua"} and resource.stat().st_size <= 1000000:
        try:
            content = resource.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = resource.read_text(encoding="utf-8", errors="replace")
        if resource.suffix.lower() in {".py", ".pyt"}:
            content_label = "Python"
            detail.update({"name": resource.name, "python_file": str(resource)})
        else:
            content_label = "Resource"
    items.append({"type": "Resource", "name": resource.name, "file": str(resource), "path": "/" + resource.relative_to(root_path).as_posix(), "detail": detail, "content": content, "content_label": content_label, "raw_xml": ""})

json.dumps({"summary": summary, "items": items})
`);
  return JSON.parse(payload);
}

async function ensureXmlStageCopy() {
  if (xmlDoctor.stagePrepared) return;
  await pyodide.runPythonAsync(`
import shutil
from pathlib import Path
src = Path("${xmlDoctor.sourcePath}")
dst = Path("${xmlDoctor.stagePath}")
if dst.exists():
    shutil.rmtree(dst)
dst.mkdir(parents=True, exist_ok=True)
if src.is_file():
    shutil.copy2(src, dst / src.name)
else:
    for item in src.rglob("*"):
        rel = item.relative_to(src)
        target = dst / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif "_artifacts" not in item.parts:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)
`);
  xmlDoctor.stagePrepared = true;
}

async function saveLuaScriptToStage(item, content) {
  await ensureXmlStageCopy();
  pyodide.globals.set("wasm_lua_file", item.file);
  pyodide.globals.set("wasm_lua_path", item.path);
  pyodide.globals.set("wasm_lua_content", content);
  await pyodide.runPythonAsync(`
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
source_file = Path(wasm_lua_file)
try:
    rel = source_file.relative_to(stage_root)
except ValueError:
    try:
        rel = source_file.relative_to(source_root)
    except ValueError:
        rel = Path(source_file.name)
xml_file = stage_root / rel
tree = ET.parse(xml_file)
root = tree.getroot()
parent_map = {child: parent for parent in root.iter() for child in parent}

def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

for element in root.iter():
    if element_path(element) == wasm_lua_path:
        element.text = wasm_lua_content
        body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
        xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)
        break
else:
    raise RuntimeError("Lua script path not found in staging XML")
`);
  xmlDoctor.embedded = true;
  xmlLog(t("luaSaved"));
}

async function savePythonFileToStage(item, content) {
  await ensureXmlStageCopy();
  pyodide.globals.set("wasm_python_file", item.detail?.python_file || "");
  pyodide.globals.set("wasm_python_name", item.detail?.name || "script.py");
  pyodide.globals.set("wasm_python_content", content);
  await pyodide.runPythonAsync(`
from pathlib import Path

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
python_file = (wasm_python_file or "").strip()
python_name = (wasm_python_name or "script.py").strip() or "script.py"

if python_file:
    source_file = Path(python_file)
    try:
        rel = source_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = source_file.relative_to(source_root)
        except ValueError:
            rel = Path(source_file.name)
    target = stage_root / rel
else:
    target = stage_root / Path(python_name).name

target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(wasm_python_content, encoding="utf-8")
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
}

function buildDefaultLuaScriptApp() {
  return `platform.apilevel = '2.0'

local pages = {}
local currentPage = 1
local pageHistory = {}

function addPage(page)
  table.insert(pages, page)
end

local function goToPage(target)
  target = tonumber(target)
  if target and target >= 1 and target <= #pages then
    if target ~= currentPage then
      table.insert(pageHistory, currentPage)
    end
    currentPage = target
    platform.window:invalidate()
  end
end

local function goHome()
  pageHistory = {}
  currentPage = 1
  platform.window:invalidate()
end

local function goNext()
  if currentPage < #pages then
    goToPage(currentPage + 1)
  end
end

local function goBack()
  local previous = table.remove(pageHistory)
  if previous then
    currentPage = previous
  elseif currentPage > 1 then
    currentPage = 1
  end
  platform.window:invalidate()
end

local function setVar(name, value)
  if name and name ~= "" then
    _G[name] = value
    if value == nil or tostring(value) == "" then
      return
    end
    if var and var.store then
      pcall(var.store, name, value)
    end
  end
end

local __visualFieldValues = nil

local function getVar(name)
  if name and name ~= "" then
    if __visualFieldValues and __visualFieldValues[name] ~= nil then
      return __visualFieldValues[name]
    end
    if _G[name] ~= nil then return _G[name] end
    if var and var.recall then
      local ok, value = pcall(var.recall, name)
      if ok then return value end
    end
  end
  return nil
end

local function prepareVisualFieldValues(fields)
  local values = {}
  if not fields then return values end
  for _, field in ipairs(fields) do
    if field.bind and field.bind ~= "" then
      values[field.bind] = field.value
      setVar(field.bind, field.value)
    end
  end
  return values
end

local function visualNormalizeExpression(expr)
  if not expr then return "" end
  return tostring(expr):gsub("−", "-")
end

local function visualSubstituteVariables(expr)
  local normalized = visualNormalizeExpression(expr)
  return normalized:gsub("([%a_][%w_]*)", function(name)
    if name == "math" or name == "sqrt" or name == "sin" or name == "cos" or name == "tan" or name == "pi" or name == "e" then
      return name
    end
    local value = getVar(name)
    local numeric = tonumber(value)
    if numeric ~= nil then return tostring(numeric) end
    return name
  end)
end

local function evalArithmeticExpression(expr)
  local text = tostring(expr or ""):gsub("%s+", ""):gsub(",", ".")
  local pos = 1
  local parseExpression, parseTerm, parsePower, parseUnary, parsePrimary

  local function consume(char)
    if text:sub(pos, pos) == char then
      pos = pos + 1
      return true
    end
    return false
  end

  local function readNumber()
    local startPos, endPos = text:find("^%d+%.?%d*[eE][%+%-]?%d+", pos)
    if not startPos then startPos, endPos = text:find("^%d*%.?%d+", pos) end
    if not startPos then return nil end
    local value = tonumber(text:sub(startPos, endPos))
    pos = endPos + 1
    return value
  end

  parsePrimary = function()
    if consume("(") then
      local value = parseExpression()
      consume(")")
      return value
    end
    local number = readNumber()
    if number ~= nil then return number end
    local startPos, endPos, name = text:find("^([%a_][%w_]*)", pos)
    if name then
      pos = endPos + 1
      if name == "pi" then return math.pi end
      if consume("(") then
        local arg = parseExpression()
        consume(")")
        if arg == nil then return nil end
        if name == "sqrt" then return math.sqrt(arg) end
        if name == "sin" then return math.sin(arg) end
        if name == "cos" then return math.cos(arg) end
        if name == "tan" then return math.tan(arg) end
        if name == "ln" or name == "log" then return math.log(arg) end
        if name == "exp" then return math.exp(arg) end
        if name == "abs" then return math.abs(arg) end
        return nil
      end
      return tonumber(getVar(name))
    end
    return nil
  end

  parseUnary = function()
    if consume("+") then return parseUnary() end
    if consume("-") then
      local value = parseUnary()
      return value ~= nil and -value or nil
    end
    return parsePrimary()
  end

  parsePower = function()
    local left = parseUnary()
    if left == nil then return nil end
    if consume("^") then
      local right = parsePower()
      if right == nil then return nil end
      return left ^ right
    end
    return left
  end

  parseTerm = function()
    local value = parsePower()
    if value == nil then return nil end
    while true do
      if consume("*") then
        local right = parsePower()
        if right == nil then return nil end
        value = value * right
      elseif consume("/") then
        local right = parsePower()
        if right == nil or right == 0 then return nil end
        value = value / right
      else
        break
      end
    end
    return value
  end

  parseExpression = function()
    local value = parseTerm()
    if value == nil then return nil end
    while true do
      if consume("+") then
        local right = parseTerm()
        if right == nil then return nil end
        value = value + right
      elseif consume("-") then
        local right = parseTerm()
        if right == nil then return nil end
        value = value - right
      else
        break
      end
    end
    return value
  end

  local value = parseExpression()
  if value ~= nil and pos > #text then return value end
  return nil
end

local function visualMissingVariable(expr)
  local normalized = visualNormalizeExpression(expr)
  local pos = 1
  while pos <= #normalized do
    local startPos, endPos, name = normalized:find("([%a_][%w_]*)", pos)
    if not startPos then break end
    if name ~= "math" and name ~= "sqrt" and name ~= "sin" and name ~= "cos" and name ~= "tan" and name ~= "pi" and name ~= "e" then
      local value = getVar(name)
      if value == nil or tostring(value) == "" then return name end
    end
    pos = endPos + 1
  end
  return nil
end

local function evalVisualExpression(expr)
  if not expr or expr == "" then return nil end
  local substituted = visualSubstituteVariables(expr)
  local arithmetic = evalArithmeticExpression(substituted)
  if arithmetic ~= nil then return arithmetic end
  if math and math.eval then
    local ok, value = pcall(math.eval, substituted)
    if ok then return value end
  end
  local flat = substituted:gsub("%s+", ""):gsub("[%(%)]", "")
  local left, op, right = flat:match("^([%-]?%d+%.?%d*)([%+%-%*/%^])([%-]?%d+%.?%d*)$")
  if left and right then
    local a = tonumber(left)
    local b = tonumber(right)
    if a and b then
      if op == "+" then return a + b end
      if op == "-" then return a - b end
      if op == "*" then return a * b end
      if op == "/" and b ~= 0 then return a / b end
      if op == "^" then return a ^ b end
    end
  end
  local loader = loadstring or load
  if loader and substituted:match("^[%d%+%-%*/%^%(%)%.%,%s]+$") then
    local fn = loader("return " .. substituted)
    if fn then
      local ok, value = pcall(fn)
      if ok then return value end
    end
  end
  return tonumber(substituted)
end

local function visualConditionOk(condition)
  if not condition or condition == "" then return true end
  local normalized = visualNormalizeExpression(condition)
  local operators = {"~=", "<=", ">=", "=", "<", ">"}
  for _, op in ipairs(operators) do
    local patternOp = op:gsub("([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")
    local left, right = normalized:match("^%s*(.-)%s*" .. patternOp .. "%s*(.-)%s*$")
    if left and right and left ~= "" and right ~= "" then
      local lval = evalVisualExpression(left)
      local rval = evalVisualExpression(right)
      local ln = tonumber(lval)
      local rn = tonumber(rval)
      if ln ~= nil and rn ~= nil then
        if op == "~=" then return ln ~= rn end
        if op == "=" then return ln == rn end
        if op == "<" then return ln < rn end
        if op == ">" then return ln > rn end
        if op == "<=" then return ln <= rn end
        if op == ">=" then return ln >= rn end
      end
    end
  end
  if math and math.eval then
    local ok, value = pcall(math.eval, visualSubstituteVariables(normalized))
    return ok and value ~= false and value ~= 0
  end
  return false
end

local function visualReplaceVars(text)
  local out = tostring(text or "")
  local pos = 1
  while pos <= #out do
    local startPos, endPos, name = out:find("%[%[([%a_][%w_]*)%]%]", pos)
    if not startPos then break end
    local value
    if name == "__result" then
      value = _G.__lastVisualActionValue
    else
      value = getVar(name)
    end
    if value == nil then value = "" end
    value = tostring(value)
    out = out:sub(1, startPos - 1) .. value .. out:sub(endPos + 1)
    pos = startPos + #value
  end
  return out
end

local function visualActionDetails(action)
  if not action or not action.details or action.details == "" then return "" end
  return visualReplaceVars(action.details)
end

local function runVisualActions(actions, fields)
  if not actions then return false end
  local previousFieldValues = __visualFieldValues
  __visualFieldValues = prepareVisualFieldValues(fields)
  local function finish(result)
    __visualFieldValues = previousFieldValues
    return result
  end
  local didRun = false
  for _, action in ipairs(actions) do
    local missing = visualMissingVariable((action.condition or "") .. " " .. (action.expression or ""))
    if missing then
      _G.__lastVisualActionResult = "Completa " .. missing
      _G.__lastVisualActionDetails = ""
      return finish(false)
    end
    local conditionOk = action.strictCondition == false or visualConditionOk(action.condition)
    if action.type == "calc" and action.target and action.target ~= "" then
      local value = evalVisualExpression(action.expression)
      if value == nil then
        _G.__lastVisualActionResult = "No se pudo calcular"
        _G.__lastVisualActionDetails = ""
        return finish(false)
      end
      if conditionOk or action.strictCondition ~= true then
        setVar(action.target, value)
        _G.__lastVisualActionValue = value
        if not action.silent then
          _G.__lastVisualActionResult = action.target .. "=" .. tostring(value)
          _G.__lastVisualActionDetails = visualActionDetails(action)
        end
        didRun = true
      end
    elseif conditionOk then
      if action.type == "set" and action.target and action.target ~= "" then
        setVar(action.target, action.value)
        _G.__lastVisualActionResult = action.target .. "=" .. tostring(action.value)
        _G.__lastVisualActionDetails = visualActionDetails(action)
        didRun = true
      elseif action.type == "goto" and action.targetPage then
        goToPage(action.targetPage)
        return finish(true)
      end
    end
  end
  if didRun then return finish(true) end
  _G.__lastVisualActionResult = "Condicion no cumplida"
  _G.__lastVisualActionDetails = ""
  return finish(false)
end

addPage({
  name = "Inicio",
  paint = function(self, gc)
    local w = platform.window:width()
    local h = platform.window:height()
    gc:setColorRGB(245, 245, 245)
    gc:fillRect(0, 0, w, h)
    gc:setColorRGB(0, 0, 0)
    gc:setFont("sansserif", "b", 20)
    local title = "Hello Lua"
    gc:drawString(title, (w - gc:getStringWidth(title)) / 2, 72, "top")
    gc:setFont("sansserif", "r", 10)
    local subtitle = "Enter para continuar"
    gc:drawString(subtitle, (w - gc:getStringWidth(subtitle)) / 2, 100, "top")
    gc:setColorRGB(45, 147, 173)
    gc:fillRect((w - 120) / 2, 160, 120, 28)
    gc:setColorRGB(255, 255, 255)
    local label = "Siguiente"
    gc:drawString(label, (w - gc:getStringWidth(label)) / 2, 166, "top")
  end,
  enterKey = function(self)
    goNext()
  end,
  mouseDown = function(self, x, y)
    local w = platform.window:width()
    local buttonX = (w - 120) / 2
    if x >= buttonX and x <= buttonX + 120 and y >= 160 and y <= 188 then
      goNext()
    end
  end
})

-- Inserta plantillas debajo de esta linea.
-- [[TNS_TOOL_PAGES_END]]

function on.paint(gc)
  if pages[currentPage] and pages[currentPage].paint then
    pages[currentPage]:paint(gc)
  end
end

function on.enterKey()
  if pages[currentPage] and pages[currentPage].enterKey then
    pages[currentPage]:enterKey()
  else
    goNext()
  end
end

function on.escapeKey()
  if pages[currentPage] and pages[currentPage].escapeKey then
    pages[currentPage]:escapeKey()
  elseif currentPage > 1 then
    goBack()
  end
end

function on.arrowKey(direction)
  if pages[currentPage] and pages[currentPage].arrowKey then
    pages[currentPage]:arrowKey(direction)
  end
end

function on.charIn(ch)
  if pages[currentPage] and pages[currentPage].charIn then
    pages[currentPage]:charIn(ch)
  end
end

function on.backspaceKey()
  if pages[currentPage] and pages[currentPage].backspaceKey then
    pages[currentPage]:backspaceKey()
  end
end

function on.mouseDown(x, y)
  if pages[currentPage] and pages[currentPage].mouseDown then
    pages[currentPage]:mouseDown(x, y)
  end
end

function on.mouseUp(x, y)
  if pages[currentPage] and pages[currentPage].mouseUp then
    pages[currentPage]:mouseUp(x, y)
  elseif pages[currentPage] and pages[currentPage].mouseDown then
    pages[currentPage]:mouseDown(x, y)
  end
end
`;
}

async function addLuaScriptAppToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_lua_current_file", currentFile);
  pyodide.globals.set("wasm_lua_default", buildDefaultLuaScriptApp());
  const payload = await pyodide.runPythonAsync(`
import json
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_lua_current_file) if wasm_lua_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(source_root)
    except ValueError:
        rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted(
        [p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")],
        key=lambda p: p.name.lower(),
    )
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for Lua widget")
try:
    rel = xml_file.relative_to(stage_root)
    source_file = xml_file
except ValueError:
    source_file = xml_file
tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
sc_ns = "urn:TI.ScriptApp"
ET.register_namespace("", prob_ns)
ET.register_namespace("sc", sc_ns)

def q(ns, name):
    return f"{{{ns}}}{name}" if ns else name

card = ET.Element(q(prob_ns, "card"), {"clay": "0", "h1": "10000", "h2": "10000", "w1": "10000", "w2": "10000"})
dummy = ET.SubElement(card, q(prob_ns, "isDummyCard"))
dummy.text = "0"
flag = ET.SubElement(card, q(prob_ns, "flag"))
flag.text = "0"
wdgt = ET.SubElement(card, q(prob_ns, "wdgt"), {"type": "TI.ScriptApp", "ver": "1.0"})
ET.SubElement(wdgt, q(sc_ns, "mFlags")).text = "1024"
ET.SubElement(wdgt, q(sc_ns, "value")).text = "0"
ET.SubElement(wdgt, q(sc_ns, "cry")).text = "0"
ET.SubElement(wdgt, q(sc_ns, "legal")).text = "none"
ET.SubElement(wdgt, q(sc_ns, "schk")).text = "false"
ET.SubElement(wdgt, q(sc_ns, "guid")).text = uuid.uuid4().hex.upper()
script = ET.SubElement(wdgt, q(sc_ns, "script"), {"version": "512", "id": "0"})
script.text = wasm_lua_default
root.append(card)
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

parent_map = {child: parent for parent in root.iter() for child in parent}
def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

json.dumps({
    "type": "Lua Script",
    "name": "Lua Script nuevo",
    "file": str(source_file),
    "path": element_path(script),
    "detail": {"length": len(wasm_lua_default), "created": "true"},
    "content": wasm_lua_default,
    "content_label": "Lua",
    "raw_xml": ET.tostring(script, encoding="unicode", short_empty_elements=False),
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  xmlLog(t("luaScriptAdded"));
  return JSON.parse(payload);
}

function buildDefaultPythonProgram() {
  return `# Python Program
from math import *

print("Hello Python")
`;
}

async function addPythonEditorToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  const inlineCode = document.querySelector("#py-inline")?.value || "";
  pyodide.globals.set("wasm_python_current_file", currentFile);
  pyodide.globals.set("wasm_python_default", inlineCode.trim() ? inlineCode : buildDefaultPythonProgram());
  const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_python_current_file) if wasm_python_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = current_file.relative_to(source_root)
        except ValueError:
            rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted(
        [p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")],
        key=lambda p: p.name.lower(),
    )
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for Python widget")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
py_ns = "urn:TI.PythonEditor"
ET.register_namespace("", prob_ns)
ET.register_namespace("py", py_ns)

def q(ns, name):
    return f"{{{ns}}}{name}" if ns else name

existing = {p.name.lower() for p in stage_root.rglob("*.py")}
existing.update(p.name.lower() for p in stage_root.rglob("*.pyt"))
base = "script"
counter = 1
python_name = f"{base}.py"
while python_name.lower() in existing:
    counter += 1
    python_name = f"{base}_{counter}.py"
python_path = stage_root / python_name
python_path.write_text(wasm_python_default, encoding="utf-8")

card = ET.Element(q(prob_ns, "card"), {"clay": "0", "h1": "10000", "h2": "10000", "w1": "10000", "w2": "10000"})
ET.SubElement(card, q(prob_ns, "isDummyCard")).text = "0"
ET.SubElement(card, q(prob_ns, "flag")).text = "0"
wdgt = ET.SubElement(card, q(prob_ns, "wdgt"), {"type": "TI.PythonEditor", "ver": "1.0"})
data = ET.SubElement(wdgt, q(py_ns, "data"))
ET.SubElement(data, q(py_ns, "name")).text = python_name
ET.SubElement(data, q(py_ns, "dirf")).text = "0"
ET.SubElement(wdgt, q(py_ns, "mFlags")).text = "1024"
ET.SubElement(wdgt, q(py_ns, "value")).text = "10"
root.append(card)
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

parent_map = {child: parent for parent in root.iter() for child in parent}
def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

json.dumps({
    "type": "Widget",
    "name": "TI.PythonEditor",
    "file": str(xml_file),
    "path": element_path(wdgt),
    "detail": {"name": python_name, "dirf": "0", "python_file": str(python_path), "length": len(wasm_python_default), "created": "true"},
    "content": wasm_python_default,
    "content_label": "Python",
    "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False),
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  xmlLog(t("pythonWidgetAdded"));
  return JSON.parse(payload);
}

function chooseImageResourceFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/bmp,image/png,image/jpeg,image/gif,.bmp,.png,.jpg,.jpeg,.gif";
    input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}

function sanitizeResourceFileName(name, fallback = "image.bmp") {
  const clean = String(name || "").split(/[\\/]/).pop().replace(/[^A-Za-z0-9._ -]/g, "_").replace(/\s+/g, "_");
  return clean && clean.includes(".") ? clean : fallback;
}

function bmpResourceNameFromFileName(name) {
  const clean = sanitizeResourceFileName(name || "image.BMP", "image.BMP");
  const dot = clean.lastIndexOf(".");
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  return `${base || "image"}.BMP`;
}

const TI_IMAGE_MAX_WIDTH = 1009;
const TI_IMAGE_MAX_HEIGHT = 568;

function fitImageSize(width, height, maxWidth = TI_IMAGE_MAX_WIDTH, maxHeight = TI_IMAGE_MAX_HEIGHT) {
  const sourceWidth = Math.max(1, Math.round(Number(width) || 1));
  const sourceHeight = Math.max(1, Math.round(Number(height) || 1));
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

function writeUint16Le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32Le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function loadHtmlImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(t("viewImage")));
    };
    image.src = url;
  });
}

function encodeCanvasToTiRgb565Bmp(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (!width || !height) throw new Error("Image has empty dimensions.");

  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const pixelCount = width * height;
  const rgbSize = pixelCount * 2;
  const auxSize = pixelCount;
  const imageSize = rgbSize + auxSize;
  const pixelOffset = 54;
  const bytes = new Uint8Array(pixelOffset + imageSize);

  // Header observed in the functional mViewer/TI-Nspire resource.
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  writeUint32Le(bytes, 2, bytes.length);
  writeUint32Le(bytes, 6, 0);
  writeUint32Le(bytes, 10, pixelOffset);
  writeUint32Le(bytes, 14, 40);
  writeUint32Le(bytes, 18, width);
  writeUint32Le(bytes, 22, height);
  writeUint16Le(bytes, 26, 1);
  writeUint16Le(bytes, 28, 16);
  writeUint32Le(bytes, 30, 0x00010007);
  writeUint32Le(bytes, 34, imageSize);
  writeUint32Le(bytes, 38, 0);
  writeUint32Le(bytes, 42, 0);
  writeUint32Le(bytes, 46, 0);
  writeUint32Le(bytes, 50, 0);

  // First plane: tightly packed RGB565, little-endian, 2 bytes per pixel.
  // Do NOT write BGR24 here even though the total payload is 3 bytes/pixel.
  for (let i = 0; i < pixelCount; i += 1) {
    const src = i * 4;
    const r5 = rgba[src] >> 3;
    const g6 = rgba[src + 1] >> 2;
    const b5 = rgba[src + 2] >> 3;
    const value = (r5 << 11) | (g6 << 5) | b5;
    const dst = pixelOffset + i * 2;
    bytes[dst] = value & 0xff;
    bytes[dst + 1] = (value >>> 8) & 0xff;
  }

  // Second plane: one auxiliary byte per pixel. In the known-good resource
  // every byte is 0xFF, so reproduce it exactly until its semantics are known.
  const auxOffset = pixelOffset + rgbSize;
  bytes.fill(0xff, auxOffset, auxOffset + auxSize);
  return bytes;
}

async function prepareTiImageResource(file) {
  const outputName = bmpResourceNameFromFileName(file.name);
  if (/\.bmp$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const canvas = await renderImageBytesToCanvas(bytes, file.name);
    return { name: outputName, bytes: encodeCanvasToTiRgb565Bmp(canvas) };
  }
  const image = await loadHtmlImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const fitted = fitImageSize(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = fitted.width;
  canvas.height = fitted.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, fitted.width, fitted.height);
  return { name: outputName, bytes: encodeCanvasToTiRgb565Bmp(canvas) };
}

function reserveStagePageImageName() {
  let index = 0;
  while (pyodide.FS.analyzePath(`${xmlDoctor.stagePath}/page${index}.BMP`).exists) {
    index += 1;
  }
  return `page${index}.BMP`;
}

function buildImageViewerLua(imageName) {
  return `-- B!2r]z(*3+00000200
platform.apilevel = '2.3'

local sourceName = ${JSON.stringify(imageName)}
local origImage = nil
local curimage = nil
local loadError = nil
local redalert_var = "redalert"
local inited = false
local infos = false
local fullScreen = false
local hideScrollbars = false
local isGrabbing = false
local mouseX, mouseY = 0, 0
local x0 = 0
local y0 = 0
local x0old, y0old = 0, 0
local w, h = 0, 0
local sw, sh = 0, 0
local zfactor = 1.2
local z, zold = 1, 1
local dx, dy = 1, 1
local hw = 220
local fontsize = 9

if cursor and cursor.set then cursor.set("default") end
if cursor and cursor.hide then cursor.hide() end

local okMeta, pwmeta = pcall(function() return getmetatable(platform.window) end)
if okMeta and pwmeta and not pwmeta.invalidateAll then
  function pwmeta:invalidateAll()
    if self.setFocus then
      self:setFocus(false)
      self:setFocus(true)
    else
      platform.window:invalidate()
    end
  end
end

local function screenRefresh()
  if platform.window.invalidateAll then
    platform.window:invalidateAll()
  else
    platform.window:invalidate()
  end
end

local function bound(val, minVal, maxVal)
  return math.min(math.max(val, minVal), maxVal)
end

local function destroy()
  origImage = nil
  curimage = nil
  screenRefresh()
end

local function repos()
  if w > 0 and h > 0 and sw > 0 and sh > 0 then
    x0 = bound(sw - w * z, x0, 0)
    y0 = bound(sh - h * z, y0, 0)
  end
  hideScrollbars = false
  if x0 ~= x0old or y0 ~= y0old or z ~= zold then screenRefresh() end
end

local function fullrefresh()
  if not origImage then return end
  if z ~= zold then
    curimage = origImage
    if z ~= 1 and image and image.copy then
      local ok, copied = pcall(function()
        return image.copy(origImage, math.max(1, math.floor(w * z)), math.max(1, math.floor(h * z)))
      end)
      if ok and copied then curimage = copied end
    end
    repos()
  end
end

local function loadImage()
  if origImage ~= nil or loadError ~= nil then return end
  local ok, result = pcall(function()
    if not _R or not _R.IMG or not _R.IMG.img then
      error("Recurso _R.IMG.img no disponible")
    end
    return image.new(_R.IMG.img)
  end)
  if ok and result and type(result) ~= "string" then
    origImage = result
    curimage = origImage
    local okSize, rw, rh = pcall(function() return origImage:width(), origImage:height() end)
    if okSize then
      w, h = rw or 0, rh or 0
    end
  else
    loadError = tostring(result or "No se pudo cargar la imagen.")
  end
end

function on.construction()
  if var and var.store then var.store(redalert_var, 0) end
end

function on.backspaceKey()
  destroy()
  if var and var.store then var.store(redalert_var, 1) end
end

function on.resize(ww, wh)
  sw, sh = ww, wh
  x1 = sw - 7 - hw
  x2 = ((sw - x1) * 6 / 9 + x1)
  x12 = x1 + (x2 - x1) / 3
  x22 = x2 + (sw - x2) / 4
end

function on.timer()
  dx, dy = 1, 1
  hideScrollbars = true
  screenRefresh()
end

function on.tabKey()
  if fullScreen then
    fullScreen = false
    sw, sh = 318, 212
  else
    fullScreen = true
    sw, sh = 320, 240
  end
  repos()
end

function on.escapeKey()
  zold = z
  z = 1
  fullrefresh()
end

function on.charIn(ch)
  loadImage()
  if not origImage then return end
  if ch == "-" or ch == "/" then
    zold = z
    z = z / zfactor
    if z < 1 and zold > 1 then z = 1 end
    z = math.max(z, math.min(1, math.min(sw / w, sh / h)))
    x0 = x0 + w * (zold - z) / 2
    y0 = y0 + h * (zold - z) / 2
    fullrefresh()
  elseif ch == "+" or ch == "*" then
    zold = z
    z = (z * zfactor < 4) and z * zfactor or z
    if z > 1 and zold < 1 then z = 1 end
    z = math.min(z, math.max(1, math.min(sw / 2, sh / 2)))
    x0 = x0 - w * (z - zold) / 2
    y0 = y0 - h * (z - zold) / 2
    fullrefresh()
  elseif string.find("12346789", ch, 1, true) then
    if ch == "1" or ch == "2" or ch == "3" then y0 = y0 - sh end
    if ch == "7" or ch == "8" or ch == "9" then y0 = y0 + sh end
    if ch == "1" or ch == "4" or ch == "7" then x0 = x0 + sw end
    if ch == "3" or ch == "6" or ch == "9" then x0 = x0 - sw end
    repos()
  elseif ch == "?" then
    infos = not infos
    screenRefresh()
  elseif ch == "0" then
    zold = z
    z = math.min(sw / w, sh / h)
    fullrefresh()
  elseif ch == "5" then
    x0 = sw / 2 - w / 2 * z
    y0 = sh / 2 - h / 2 * z
    repos()
  end
end

function on.help()
  infos = not infos
  screenRefresh()
end

function on.arrowUp()
  y0 = y0 + dy * math.max(1, z) / 2
  dy = dy + 1
  repos()
end

function on.arrowDown()
  y0 = y0 - dy * math.max(1, z) / 2
  dy = dy + 1
  repos()
end

function on.arrowRight()
  x0 = x0 - dx * math.max(1, z) / 2
  dx = dx + 1
  repos()
end

function on.arrowLeft()
  x0 = x0 + dx * math.max(1, z) / 2
  dx = dx + 1
  repos()
end

function on.arrowKey(direction)
  if direction == "up" then
    on.arrowUp()
  elseif direction == "down" then
    on.arrowDown()
  elseif direction == "left" then
    on.arrowLeft()
  elseif direction == "right" then
    on.arrowRight()
  end
end

function on.mouseUp(x, y)
  mouseX, mouseY = x, y
  isGrabbing = not isGrabbing
  if not isGrabbing then
    if cursor and cursor.set then cursor.set("default") end
    if cursor and cursor.hide then cursor.hide() end
  else
    if cursor and cursor.set then cursor.set("translation") end
  end
  screenRefresh()
end

function on.mouseMove(x, y)
  if isGrabbing then
    x0, y0 = x0 + (x - mouseX), y0 + (y - mouseY)
    mouseX, mouseY = x, y
    repos()
  end
end

if not platform.withGC then
  function platform.withGC(func, ...)
    local gc = platform.gc()
    gc:begin()
    func(..., gc)
    gc:finish()
  end
end

function on.paint(gc)
  if platform.hw and platform.hw() < 4 and fullScreen then
    platform.withGC(paint)
  else
    paint(gc)
  end
end

function on.varChange(list)
  if not var or not var.recall then return 0 end
  for k, v in pairs(list) do
    if v == redalert_var then
      local val = var.recall(v)
      if val and val ~= 0 then destroy() end
    end
  end
  return 0
end

function paint(gc)
  if sw <= 0 or sh <= 0 then
    local okSize, ww, wh = pcall(function()
      return platform.window:width(), platform.window:height()
    end)
    if okSize then on.resize(ww, wh) end
  end
  loadImage()
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(0, 0, sw, sh)
  if loadError then
    gc:setColorRGB(0, 0, 0)
    gc:setFont("sansserif", "r", 10)
    gc:drawString("Imagen: " .. sourceName, 10, 20, "top")
    gc:drawString(loadError or "No se pudo cargar la imagen.", 10, 38, "top")
    return
  end
  if origImage and not inited then
    on.resize(platform.window:width(), platform.window:height())
    if sw > 0 and sh > 0 then
      inited = true
      if var and var.monitor then var.monitor(redalert_var) end
    end
    local okArrowUp, arrowUpValue = pcall(function() return math.eval("char(8593)") end)
    local okArrowLR, arrowLRValue = pcall(function() return math.eval("char(8596)") end)
    local okArrowUD, arrowUDValue = pcall(function() return math.eval("char(8597)") end)
    arrowup = okArrowUp and arrowUpValue or "^"
    arrowlr = okArrowLR and arrowLRValue or "<>"
    arrowud = okArrowUD and arrowUDValue or "^v"
  end
  if inited then
    if timer and timer.stop then timer.stop() end
    if curimage then gc:drawImage(curimage, x0, y0) end
    if not hideScrollbars then
      if h * z > sh then
        local b = (w * z > sw) and 5 or 0
        gc:setColorRGB(0, 0, 0)
        gc:fillRect(sw - 5, 0, 5, sh - b)
        gc:setColorRGB(255, 255, 255)
        gc:fillRect(sw - 4, 1, 3, sh - b - 2)
        gc:setColorRGB(0, 0, 0)
        local pw = sh * (sh - b - 4) / (h * z)
        local pp = -y0 * (sh - b - 4 - pw) / (h * z - sh)
        gc:fillRect(sw - 3, 2 + pp, 1, pw)
      end
      if w * z > sw then
        local b = (h * z > sh) and 5 or 0
        gc:setColorRGB(0, 0, 0)
        gc:fillRect(0, sh - 5, sw - b, 5)
        gc:setColorRGB(255, 255, 255)
        gc:fillRect(1, sh - 4, sw - b - 2, 3)
        gc:setColorRGB(0, 0, 0)
        local pw = sw * (sw - b - 4) / (w * z)
        local pp = -x0 * (sw - b - 4 - pw) / (w * z - sw)
        gc:fillRect(2 + pp, sh - 3, pw, 1)
      end
    end
    x0old = x0
    y0old = y0
    if infos then
      gc:setFont("serif", "r", fontsize)
      local strhs = gc:getStringHeight("H")
      gc:setFont("serif", "b", fontsize + 1)
      local strh = gc:getStringHeight("H")
      local hh = 0
      gc:setColorRGB(255, 255, 255)
      gc:fillRect(x1, 2, hw, strh * 2 + strhs * 5)
      gc:setColorRGB(0, 0, 0)
      gc:drawRect(x1 - 1, 1, hw + 1, strh * 2 + strhs * 5)
      gc:drawString("mViewer GX 1.4", x1 + 2, hh, "top")
      gc:setFont("serif", "r", fontsize + 1)
      gc:drawString("(TI-Planet.org)", x1 + (sw - x1) / 2, hh, "top")
      hh = hh + strh
      gc:setColorRGB(0, 0, 255)
      gc:drawString("http://tiplanet.org/gxnspire", x1 + 2, hh, "top")
      hh = hh + strh
      gc:setColorRGB(0, 0, 0)
      gc:setFont("serif", "r", fontsize)
      gc:drawRect(x1, 1, hw - 1, hh)
      gc:drawString("* /", x1 + 2, hh, "top")
      gc:drawString("zoom in/out", x12, hh, "top")
      gc:drawString("esc", x2, hh, "top")
      gc:drawString("zoom 1:1", x22, hh, "top")
      hh = hh + strhs
      gc:drawString("ctrl" .. arrowlr, x1 + 2, hh, "top")
      gc:drawString("next/prev page", x12, hh, "top")
      gc:drawString("0", x2, hh, "top")
      gc:drawString("zoom fit", x22, hh, "top")
      hh = hh + strhs
      gc:drawString(arrowud .. arrowlr, x1 + 2, hh, "top")
      gc:drawString("progressive scroll", x12, hh, "top")
      gc:drawString("5", x2, hh, "top")
      gc:drawString("center", x22, hh, "top")
      hh = hh + strhs
      gc:drawString("1-4 6-9", x1 + 2, hh, "top")
      gc:drawString("screen scroll", x12, hh, "top")
      gc:drawString("del", x2, hh, "top")
      gc:drawString("emergency", x22, hh, "top")
      hh = hh + strhs
      gc:drawString("ctrl" .. arrowup, x1 + 2, hh, "top")
      gc:drawString("preview all pages", x12, hh, "top")
      gc:drawString("?", x2, hh, "top")
      gc:drawString("hide box", x22, hh, "top")
    end
    if timer and timer.start then timer.start(1) end
  end
end`;
}

async function addImageWidgetToStage(file) {
  if (!file) throw new Error(t("imageWidgetNoFile"));
  await ensureXmlStageCopy();
  const prepared = await prepareTiImageResource(file);
  const imageName = reserveStagePageImageName(); // pageN.BMP unico por cada ScriptApp
  ensureParent(`${xmlDoctor.stagePath}/${imageName}`);
  pyodide.FS.writeFile(`${xmlDoctor.stagePath}/${imageName}`, prepared.bytes);
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_image_current_file", currentFile);
  pyodide.globals.set("wasm_image_file_name", imageName);
  pyodide.globals.set("wasm_image_viewer_lua", buildImageViewerLua(imageName));
  const payload = await pyodide.runPythonAsync(`
import json
import re
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_image_current_file) if wasm_image_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = current_file.relative_to(source_root)
        except ValueError:
            rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for image widget")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
sc_ns = "urn:TI.ScriptApp"
ET.register_namespace("", prob_ns)
ET.register_namespace("sc", sc_ns)

def q(ns, name):
    return f"{{{ns}}}{name}" if ns else name

def res_len(n):
    if n < 0 or n >= 26 ** 3:
        raise RuntimeError("Resource name too long for TI metadata")
    a = n // (26 * 26)
    b = (n // 26) % 26
    c = n % 26
    return "".join(chr(ord("A") + part) for part in (a, b, c))

image_name = wasm_image_file_name
resource_var = "img"
resource_descriptor = (
    "AAC"
    + res_len(len(image_name))
    + image_name
    + res_len(len(resource_var))
    + resource_var
)

card = ET.Element(q(prob_ns, "card"), {"clay": "0", "h1": "10000", "h2": "10000", "w1": "10000", "w2": "10000"})
ET.SubElement(card, q(prob_ns, "isDummyCard")).text = "0"
ET.SubElement(card, q(prob_ns, "flag")).text = "0"
wdgt = ET.SubElement(card, q(prob_ns, "wdgt"), {"type": "TI.ScriptApp", "ver": "1.0"})
ET.SubElement(wdgt, q(sc_ns, "mFlags")).text = "0"
ET.SubElement(wdgt, q(sc_ns, "value")).text = "0"
ET.SubElement(wdgt, q(sc_ns, "cry")).text = "0"
ET.SubElement(wdgt, q(sc_ns, "legal")).text = "none"
ET.SubElement(wdgt, q(sc_ns, "schk")).text = "false"
ET.SubElement(wdgt, q(sc_ns, "guid")).text = uuid.uuid4().hex.upper()
img_info = ET.SubElement(wdgt, q(sc_ns, "img_info"))
ET.SubElement(img_info, q(sc_ns, "iname")).text = image_name
md = ET.SubElement(wdgt, q(sc_ns, "md"))
ET.SubElement(md, q(sc_ns, "mde"), {"name": "TITLE", "prop": "2147549184"}).text = "mviewer-lua"
ET.SubElement(md, q(sc_ns, "mde"), {"name": "PERM", "prop": "134217728"}).text = "12"
ET.SubElement(md, q(sc_ns, "mde"), {"name": "PASSW", "prop": "536871168"}).text = "VTVNa3oxNFEwN2lXdnVvdkZ3MGZ3STFBVjZNPQA="
ET.SubElement(md, q(sc_ns, "mde"), {"name": "_RES", "prop": "67108864"}).text = resource_descriptor
script = ET.SubElement(wdgt, q(sc_ns, "script"), {"version": "33817092", "id": "0"})
script.text = wasm_image_viewer_lua
root.append(card)
body_text = ET.tostring(root, encoding="unicode", short_empty_elements=False)
body_text = re.sub(
    r'<wdgt(?![^>]*\\bxmlns:sc=)([^>]*\\btype="TI\\.ScriptApp"[^>]*)>',
    r'<wdgt xmlns:sc="urn:TI.ScriptApp"\\1>',
    body_text,
)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body_text.encode("UTF-8"))

parent_map = {child: parent for parent in root.iter() for child in parent}
def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

image_path = stage_root / image_name
json.dumps({
    "type": "Resource",
    "name": image_name,
    "file": str(image_path),
    "path": "/" + image_name,
    "detail": {"length": image_path.stat().st_size, "extension": image_path.suffix.lower(), "image_file": str(image_path), "created": "true"},
    "content": "",
    "content_label": "Image",
    "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False),
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  const createdItem = JSON.parse(payload);
  xmlLog(`${t("imageWidgetAdded")} [${SOURCE_VERSION}] ${imageName} | ScriptApp API 2.3`);
  return createdItem;
}

async function openAddImageWidgetFlow({ showPreview = true } = {}) {
  const file = await chooseImageResourceFile();
  if (!file) return;
  const item = await addImageWidgetToStage(file);
  if (showPreview) showImageModal(item);
  return item;
}

async function addBasicFuncToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_func_current_file", currentFile);
  const payload = await pyodide.runPythonAsync(`
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_func_current_file) if wasm_func_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = current_file.relative_to(source_root)
        except ValueError:
            rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for Func")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
def q(name):
    return f"{{{prob_ns}}}{name}" if prob_ns else name

sym = None
for child in root:
    if local_name(child.tag) == "sym":
        sym = child
        break
if sym is None:
    sym = ET.Element(q("sym"))
    root.insert(0, sym)

existing = set()
for element in sym:
    if local_name(element.tag) == "e":
        for child in element:
            if local_name(child.tag) == "n" and child.text:
                existing.add(child.text.strip())

base = "nueva_func"
name = base
counter = 1
while name in existing:
    counter += 1
    name = f"{base}_{counter}"

entry = ET.SubElement(sym, q("e"), {"t": "6", "f": "0", "c": "0"})
ET.SubElement(entry, q("n")).text = name
ET.SubElement(entry, q("p")).text = ""
ET.SubElement(entry, q("v")).text = "Func\\r:Return 0\\r:EndFunc"
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)
json.dumps({"name": name, "file": str(xml_file)})
`);
  const result = JSON.parse(payload);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  await scanXmlPrograms();
  const created = xmlDoctor.candidates.find((item) => item.program_name === result.name);
  if (created) selectXmlProgram(created.index);
  xmlLog(tf("funcAdded", { name: result.name }));
}

function showTextModal(title, content) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal inspector-modal">
      <h2>${escapeHtml(title)}</h2>
      <pre class="inspector-code">${escapeHtml(content || "")}</pre>
      <div class="modal-actions">
        <button type="button" id="text-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  backdrop.querySelector("#text-close").addEventListener("click", () => closeModal(backdrop));
}

function imageMimeFromName(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "application/octet-stream";
}

function isBmpBytes(bytes) {
  return bytes && bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d;
}

function readBmpBitfield(value, mask) {
  if (!mask) return 0;
  let shift = 0;
  while (shift < 32 && ((mask >>> shift) & 1) === 0) shift += 1;
  let bits = 0;
  while (shift + bits < 32 && ((mask >>> (shift + bits)) & 1) === 1) bits += 1;
  const channel = (value & mask) >>> shift;
  const max = (1 << bits) - 1;
  return max > 0 ? Math.round((channel * 255) / max) : 0;
}

function decodeBmpToRgba(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!isBmpBytes(data) || data.length < 54) {
    throw new Error("BMP invalido o incompleto.");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const pixelOffset = view.getUint32(10, true);
  const dibSize = view.getUint32(14, true);
  if (dibSize < 40) {
    throw new Error(`BMP DIB no soportado: ${dibSize}`);
  }

  const width = view.getInt32(18, true);
  const signedHeight = view.getInt32(22, true);
  const planes = view.getUint16(26, true);
  const headerBpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  const declaredImageSize = view.getUint32(34, true);
  const height = Math.abs(signedHeight);
  if (width <= 0 || height <= 0 || planes !== 1 || pixelOffset >= data.length) {
    throw new Error("BMP con dimensiones o cabecera no validas.");
  }

  const payloadSize = data.length - pixelOffset;

  // Modern TI-Nspire/mViewer resource observed in user_3183291446.tns:
  // 16-bpp marker + compression 0x00010007, followed by a packed RGB565 LE
  // plane (2 bytes/pixel) and then a separate 1-byte/pixel auxiliary plane.
  const tiPixelCount = width * height;
  const tiRgbSize = tiPixelCount * 2;
  const tiAuxSize = tiPixelCount;
  const tiExpectedPayload = tiRgbSize + tiAuxSize;
  const isTiResourceBmp =
    headerBpp === 16
    && compression === 0x00010007
    && payloadSize === tiExpectedPayload
    && declaredImageSize === tiExpectedPayload;

  if (isTiResourceBmp) {
    const rgba = new Uint8ClampedArray(tiPixelCount * 4);
    for (let i = 0; i < tiPixelCount; i += 1) {
      const p = pixelOffset + i * 2;
      const value = data[p] | (data[p + 1] << 8);
      const r5 = (value >>> 11) & 0x1f;
      const g6 = (value >>> 5) & 0x3f;
      const b5 = value & 0x1f;
      const out = i * 4;
      rgba[out] = Math.round((r5 * 255) / 31);
      rgba[out + 1] = Math.round((g6 * 255) / 63);
      rgba[out + 2] = Math.round((b5 * 255) / 31);
      rgba[out + 3] = 255;
    }
    return {
      width,
      height,
      rgba,
      bpp: 16,
      headerBpp,
      compression,
      payloadSize,
      usefulPixelSize: tiExpectedPayload,
      tiResource: true,
      rgb565Size: tiRgbSize,
      auxPlaneOffset: pixelOffset + tiRgbSize,
      auxPlaneSize: tiAuxSize,
      auxAllOpaque: data.subarray(pixelOffset + tiRgbSize, pixelOffset + tiExpectedPayload).every((value) => value === 0xff),
    };
  }

  // From this point on, decode only conventional BMP layouts.
  // Important: never reinterpret a 16-bpp TI resource as BGR24 merely because
  // its total payload happens to be 3 bytes per pixel. The TI 0x00010007 path
  // above owns that layout: RGB565 LE (2 bytes/pixel) + a separate aux plane.
  let bpp = headerBpp;
  let tightRows = false;
  const tight16Size = width * height * 2;
  const tight24Size = width * height * 3;
  const tight32Size = width * height * 4;

  if (compression === 0 && payloadSize === width * height * Math.ceil(bpp / 8)) {
    // Accept tightly packed ordinary BMPs when the header itself declares
    // the matching bit depth. Do not infer a different bpp from payload size.
    if ((bpp === 16 && payloadSize === tight16Size)
      || (bpp === 24 && payloadSize === tight24Size)
      || (bpp === 32 && payloadSize === tight32Size)) {
      tightRows = true;
    }
  }

  if (![8, 16, 24, 32].includes(bpp)) {
    throw new Error(`BMP no soportado: ${bpp} bpp.`);
  }
  if (![0, 3, 6].includes(compression)) {
    throw new Error(`BMP con compresion no soportada: ${compression}.`);
  }

  const rowStride = tightRows ? width * Math.ceil(bpp / 8) : Math.floor((width * bpp + 31) / 32) * 4;
  const usefulPixelSize = rowStride * height;
  const topDown = signedHeight < 0;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let palette = [];
  if (bpp === 8) {
    const paletteStart = 14 + dibSize;
    const paletteCount = Math.max(0, Math.min(256, Math.floor((pixelOffset - paletteStart) / 4)));
    palette = Array.from({ length: paletteCount }, (_, index) => {
      const p = paletteStart + index * 4;
      return [data[p + 2] || 0, data[p + 1] || 0, data[p] || 0, 255];
    });
  }

  let rMask = 0xf800;
  let gMask = 0x07e0;
  let bMask = 0x001f;
  if ((bpp === 16 || bpp === 32) && (compression === 3 || compression === 6)) {
    const maskStart = 14 + dibSize;
    if (maskStart + 12 <= pixelOffset) {
      rMask = view.getUint32(maskStart, true);
      gMask = view.getUint32(maskStart + 4, true);
      bMask = view.getUint32(maskStart + 8, true);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const srcY = topDown ? y : height - 1 - y;
    const rowStart = pixelOffset + srcY * rowStride;
    if (rowStart >= data.length) break;
    for (let x = 0; x < width; x += 1) {
      const out = (y * width + x) * 4;
      if (bpp === 24) {
        const p = rowStart + x * 3;
        rgba[out] = data[p + 2] || 0;
        rgba[out + 1] = data[p + 1] || 0;
        rgba[out + 2] = data[p] || 0;
        rgba[out + 3] = 255;
      } else if (bpp === 32) {
        const p = rowStart + x * 4;
        rgba[out] = data[p + 2] || 0;
        rgba[out + 1] = data[p + 1] || 0;
        rgba[out + 2] = data[p] || 0;
        rgba[out + 3] = data[p + 3] || 255;
      } else if (bpp === 16) {
        const p = rowStart + x * 2;
        const value = (data[p] || 0) | ((data[p + 1] || 0) << 8);
        rgba[out] = readBmpBitfield(value, rMask);
        rgba[out + 1] = readBmpBitfield(value, gMask);
        rgba[out + 2] = readBmpBitfield(value, bMask);
        rgba[out + 3] = 255;
      } else {
        const p = rowStart + x;
        const color = palette[data[p] || 0] || [0, 0, 0, 255];
        rgba[out] = color[0];
        rgba[out + 1] = color[1];
        rgba[out + 2] = color[2];
        rgba[out + 3] = color[3];
      }
    }
  }

  return { width, height, rgba, bpp, headerBpp, compression, payloadSize, usefulPixelSize };
}

function renderBmpToCanvas(canvas, bytes) {
  const decoded = decodeBmpToRgba(bytes);
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  configureImagePreviewElement(canvas, decoded.width, decoded.height);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(decoded.width, decoded.height);
  imageData.data.set(decoded.rgba);
  ctx.putImageData(imageData, 0, 0);
  return decoded;
}

function configureImagePreviewElement(element, width, height) {
  const safeWidth = Math.max(1, Math.round(Number(width) || element?.width || element?.naturalWidth || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || element?.height || element?.naturalHeight || 1));
  if (!element) return;
  element.style.width = `${safeWidth}px`;
  element.style.height = "auto";
  element.style.aspectRatio = `${safeWidth} / ${safeHeight}`;
  element.dataset.imageWidth = String(safeWidth);
  element.dataset.imageHeight = String(safeHeight);
}

function calculatorImageViewGeometry(sourceWidth, sourceHeight) {
  // TI-Nspire CX/CX II: 320x240 total screen. The document chrome uses
  // ~28 px, leaving a 320x212 ScriptApp viewport. mViewer starts at z=1,
  // x0=0, y0=0, so large images are shown at native 1:1 scale and cropped,
  // NOT scaled-to-fit.
  const frameWidth = 320;
  const frameHeight = 240;
  const chromeHeight = 28;
  const contentHeight = frameHeight - chromeHeight;
  const sourceViewWidth = Math.min(Math.max(0, sourceWidth || 0), frameWidth);
  const sourceViewHeight = Math.min(Math.max(0, sourceHeight || 0), contentHeight);
  return {
    frameWidth,
    frameHeight,
    chromeHeight,
    contentHeight,
    scale: 1,
    sourceViewWidth,
    sourceViewHeight,
    maxX: Math.max(0, (sourceWidth || 0) - frameWidth),
    maxY: Math.max(0, (sourceHeight || 0) - contentHeight),
  };
}

function drawImageCalculatorFrame(targetCanvas, source, viewState = null, title = "") {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || 0;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || 0;
  const geometry = calculatorImageViewGeometry(sourceWidth, sourceHeight);
  const { frameWidth, frameHeight, chromeHeight, contentHeight } = geometry;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  targetCanvas.width = Math.round(frameWidth * dpr);
  targetCanvas.height = Math.round(frameHeight * dpr);
  targetCanvas.style.width = `${frameWidth}px`;
  targetCanvas.style.height = `${frameHeight}px`;

  const ctx = targetCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, frameWidth, frameHeight);

  // Screen background + simplified TI-Nspire document chrome.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, frameWidth, frameHeight);
  ctx.fillStyle = "#efefe9";
  ctx.fillRect(0, 0, frameWidth, chromeHeight);
  ctx.strokeStyle = "#5f645f";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, frameWidth - 1, frameHeight - 1);
  ctx.beginPath();
  ctx.moveTo(0, chromeHeight - 0.5);
  ctx.lineTo(frameWidth, chromeHeight - 0.5);
  ctx.stroke();

  // Left navigation marker and first-page tab, close to the real CX UI.
  ctx.fillStyle = "#1386a8";
  ctx.beginPath();
  ctx.moveTo(3, 14);
  ctx.lineTo(11, 7);
  ctx.lineTo(11, 21);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8f8f4";
  ctx.strokeStyle = "#777b75";
  ctx.fillRect(14, 2, 34, 24);
  ctx.strokeRect(14.5, 2.5, 33, 23);
  ctx.fillStyle = "#202420";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1.1", 31, 14);

  const cleanTitle = String(title || "image").replace(/\s+/g, " ").slice(0, 19);
  ctx.textAlign = "left";
  ctx.font = "11px sans-serif";
  ctx.fillText(`*${cleanTitle}`, 57, 14);
  ctx.textAlign = "right";
  ctx.fillText("RAD", frameWidth - 39, 14);
  ctx.strokeRect(frameWidth - 31.5, 7.5, 12, 12);
  ctx.beginPath();
  ctx.moveTo(frameWidth - 9, 8);
  ctx.lineTo(frameWidth - 20, 20);
  ctx.moveTo(frameWidth - 20, 8);
  ctx.lineTo(frameWidth - 9, 20);
  ctx.stroke();

  if (!sourceWidth || !sourceHeight) return;

  const state = viewState || { x: 0, y: 0 };
  state.x = Math.round(Math.max(0, Math.min(geometry.maxX, Number(state.x) || 0)));
  state.y = Math.round(Math.max(0, Math.min(geometry.maxY, Number(state.y) || 0)));

  const sw = Math.min(frameWidth, sourceWidth - state.x);
  const sh = Math.min(contentHeight, sourceHeight - state.y);
  if (sw <= 0 || sh <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, chromeHeight, frameWidth, contentHeight);
  ctx.clip();
  // Native 1:1 display, matching mViewer's initial z=1 state.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, state.x, state.y, sw, sh, 0, chromeHeight, sw, sh);
  ctx.restore();
}

function setupImageCalculatorToggle(backdrop, source) {
  const preview = backdrop.querySelector(".image-resource-preview");
  const toggle = backdrop.querySelector("#image-calculator-toggle");
  if (!preview || !toggle || !source) return;
  const calculatorCanvas = document.createElement("canvas");
  calculatorCanvas.className = "image-calculator-canvas";
  calculatorCanvas.tabIndex = 0;
  calculatorCanvas.hidden = true;
  preview.append(calculatorCanvas);
  const viewState = { x: 0, y: 0 };
  const sourceSize = () => ({
    width: source.naturalWidth || source.videoWidth || source.width || 0,
    height: source.naturalHeight || source.videoHeight || source.height || 0,
  });
  const geometry = () => {
    const size = sourceSize();
    return calculatorImageViewGeometry(size.width, size.height);
  };
  const frameTitle = backdrop.querySelector(".image-resource-title")?.textContent || "image";
  const clampAndDraw = () => drawImageCalculatorFrame(calculatorCanvas, source, viewState, frameTitle);
  const moveBy = (dx, dy) => {
    const view = geometry();
    viewState.x += dx / view.scale;
    viewState.y += dy / view.scale;
    clampAndDraw();
  };
  const setMode = (enabled) => {
    preview.classList.toggle("calculator-mode", enabled);
    source.hidden = enabled;
    calculatorCanvas.hidden = !enabled;
    toggle.textContent = enabled ? t("imageOriginalView") : t("imageCalculatorView");
    if (enabled) {
      clampAndDraw();
      calculatorCanvas.focus();
    }
  };
  let drag = null;
  calculatorCanvas.addEventListener("pointerdown", (event) => {
    const view = geometry();
    if (view.maxX <= 0 && view.maxY <= 0) return;
    const rect = calculatorCanvas.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      viewX: viewState.x,
      viewY: viewState.y,
      scaleX: 320 / rect.width,
      scaleY: 240 / rect.height,
    };
    calculatorCanvas.setPointerCapture?.(event.pointerId);
    calculatorCanvas.classList.add("dragging");
    calculatorCanvas.focus();
  });
  calculatorCanvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    viewState.x = drag.viewX - (event.clientX - drag.x) * drag.scaleX;
    viewState.y = drag.viewY - (event.clientY - drag.y) * drag.scaleY;
    clampAndDraw();
  });
  const finishDrag = () => {
    drag = null;
    calculatorCanvas.classList.remove("dragging");
  };
  calculatorCanvas.addEventListener("pointerup", finishDrag);
  calculatorCanvas.addEventListener("pointercancel", finishDrag);
  calculatorCanvas.addEventListener("wheel", (event) => {
    if (calculatorCanvas.hidden) return;
    event.preventDefault();
    moveBy(event.deltaX || 0, event.deltaY || 0);
  }, { passive: false });
  calculatorCanvas.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 80 : 24;
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      Home: [-100000, -100000],
      End: [100000, 100000],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveBy(move[0], move[1]);
  });
  toggle.addEventListener("click", () => setMode(calculatorCanvas.hidden));
  // Image viewer opens in calculator mode by default.
  setMode(true);
}

function imageResourceMetaText(width, height, extra = "") {
  const safeWidth = Math.round(Number(width) || 0);
  const safeHeight = Math.round(Number(height) || 0);
  if (!safeWidth || !safeHeight) return "";
  const ratio = (safeWidth / safeHeight).toFixed(3);
  return `${t("imageResourceInfo")}: ${safeWidth} x ${safeHeight} · ratio ${ratio}${extra ? ` · ${extra}` : ""}`;
}

function showImageModal(item) {
  const imagePath = item?.detail?.image_file || item?.file || "";
  if (!imagePath) return;
  let bytes = null;
  let url = "";
  try {
    bytes = pyodide.FS.readFile(imagePath);
  } catch (error) {
    showTextModal(`${t("viewImage")}: ${item?.name || ""}`, `ERROR: ${error.message}`);
    return;
  }
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal inspector-modal image-resource-modal">
      <div class="image-resource-modal-header">
        <div class="image-resource-heading">
          <h2 class="image-resource-title">${escapeHtml(item?.name || t("viewImage"))}</h2>
          <p id="image-resource-meta" class="image-resource-meta"></p>
        </div>
        <div class="image-resource-top-actions">
          <button type="button" id="image-calculator-toggle" class="green-tool-button">${escapeHtml(t("imageCalculatorView"))}</button>
          <button type="button" id="image-close">${escapeHtml(t("close"))}</button>
        </div>
      </div>
      <div class="image-resource-preview"></div>
    </div>`;
  document.body.append(backdrop);
  const preview = backdrop.querySelector(".image-resource-preview");
  const meta = backdrop.querySelector("#image-resource-meta");
  const setMeta = (width, height, extra = "") => {
    if (meta) meta.textContent = imageResourceMetaText(width, height, extra);
  };
  const isBmp = imageMimeFromName(imagePath) === "image/bmp" || isBmpBytes(bytes);
  if (isBmp) {
    try {
      const canvas = document.createElement("canvas");
      canvas.className = "image-source-preview";
      canvas.setAttribute("aria-label", item?.name || "BMP preview");
      const decoded = renderBmpToCanvas(canvas, bytes);
      const formatNotes = [`${decoded.bpp} bpp`];
      if (decoded.headerBpp && decoded.headerBpp !== decoded.bpp) {
        formatNotes.push(`${decoded.headerBpp} bpp header`);
      }
      if (decoded.payloadSize > decoded.usefulPixelSize) {
        formatNotes.push(t("imageExtraBytesIgnored"));
      }
      setMeta(decoded.width, decoded.height, formatNotes.join(" · "));
      preview.append(canvas);
      setupImageCalculatorToggle(backdrop, canvas);
    } catch (error) {
      preview.innerHTML = `<div class="image-resource-error">ERROR: ${escapeHtml(error.message)}</div>`;
    }
  } else {
    const blob = new Blob([bytes], { type: imageMimeFromName(imagePath) });
    url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.className = "image-source-preview";
    img.alt = item?.name || "image";
    img.src = url;
    img.addEventListener("load", () => {
      setMeta(img.naturalWidth || img.width, img.naturalHeight || img.height);
      configureImagePreviewElement(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      setupImageCalculatorToggle(backdrop, img);
    }, { once: true });
    img.addEventListener("error", () => {
      preview.innerHTML = `<div class="image-resource-error">ERROR: ${escapeHtml(t("viewImage"))}</div>`;
    }, { once: true });
    preview.append(img);
  }
  backdrop.querySelector("#image-close").addEventListener("click", () => closeModal(backdrop, () => {
    if (url) URL.revokeObjectURL(url);
  }));
}

function closeDocumentInspectorModals() {
  for (const modalBackdrop of document.querySelectorAll(".modal-backdrop")) {
    if (modalBackdrop.querySelector(".inspector-modal")) {
      closeModal(modalBackdrop);
    }
  }
}

function closeModal(backdrop, afterClose = null) {
  if (!backdrop || !backdrop.isConnected) return;
  backdrop.classList.add("closing");
  window.setTimeout(() => {
    if (typeof afterClose === "function") afterClose();
    backdrop.remove();
  }, 240);
}

function restorePyDoctorPanelFromModal({ collapse = true } = {}) {
  const panel = document.querySelector("#py-doctor-panel");
  if (panel && pyDoctorModal.parent && panel.parentElement !== pyDoctorModal.parent) {
    pyDoctorModal.parent.insertBefore(panel, pyDoctorModal.nextSibling);
  }
  if (panel) {
    panel.classList.remove("py-doctor-panel-modalized");
    if (collapse) panel.classList.add("collapsed");
  }
  pyDoctorModal.backdrop = null;
  pyDoctorModal.parent = null;
  pyDoctorModal.nextSibling = null;
  layoutCodeEditors();
}

function closePyDoctorModal() {
  const backdrop = pyDoctorModal.backdrop;
  if (!backdrop) return;
  closeModal(backdrop, () => {
    restorePyDoctorPanelFromModal();
    pyDoctor.target = null;
    updatePyDoctorSaveLabel();
    syncToggleLabels();
  });
}

async function openPyDoctorModal(options = {}) {
  const panel = document.querySelector("#py-doctor-panel");
  if (!panel) return;
  if (pyDoctorModal.backdrop) {
    const previousBackdrop = pyDoctorModal.backdrop;
    restorePyDoctorPanelFromModal();
    previousBackdrop.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal py-doctor-modal">
      <div class="modal-top-actions">
        <button type="button" id="py-doctor-modal-close">${escapeHtml(t("close"))}</button>
      </div>
      <div id="py-doctor-modal-slot"></div>
    </div>`;

  pyDoctorModal.backdrop = backdrop;
  pyDoctorModal.parent = panel.parentElement;
  pyDoctorModal.nextSibling = panel.nextSibling;
  document.body.append(backdrop);
  backdrop.querySelector("#py-doctor-modal-slot").append(panel);
  panel.classList.add("py-doctor-panel-modalized");
  panel.classList.remove("collapsed");

  backdrop.querySelector("#py-doctor-modal-close").addEventListener("click", closePyDoctorModal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closePyDoctorModal();
  });

  await openPyDoctor({ ...options, forceOpen: true, modal: true });
  window.setTimeout(layoutCodeEditors, 0);
}

function showPythonEditor(item) {
  closeDocumentInspectorModals();
  openPyDoctorModal({
    code: item.content || "",
    target: { mode: "xml-python", item },
  }).catch((error) => {
    pyLog(`ERROR: ${error.message}`);
    xmlLog(`ERROR: ${error.message}`);
  });
}

function analyzeLuaBasic(code) {
  const errors = [];
  const warnings = [];
  const stack = [];
  const delimiterStack = [];
  const lines = code.split("\n");
  const cleanedLines = stripLuaCode(code);
  const tiApi = luaTiApiSpec();
  const userDefinedFunctions = collectLuaUserFunctions(cleanedLines);
  const knownGlobals = new Set(["math", "string", "table", "coroutine", "os", "io", "pairs", "ipairs", "type", "tonumber", "tostring", "print", "error", "pcall", "xpcall", "require", "assert", "select", "unpack", "on", "platform", "timer", "var", "gc", "toolpalette", "D2Editor", "image", "physics", "locale", "clipboard", "cursor", "document"]);
  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const parsed = stripLuaStringsAndComments(raw);
    if (parsed.unclosedString) errors.push({ level: "ERROR", line: lineNumber, message: "Cadena sin cerrar" });
    const line = cleanedLines[index] || "";
    const compact = line.trim();
    for (const char of line) {
      if ("([{".includes(char)) {
        delimiterStack.push({ char, line: lineNumber });
      } else if (")]}".includes(char)) {
        const expected = { ")": "(", "]": "[", "}": "{" }[char];
        const last = delimiterStack[delimiterStack.length - 1];
        if (last && last.char === expected) delimiterStack.pop();
        else errors.push({ level: "ERROR", line: lineNumber, message: `Delimitador extra: ${char}` });
      }
    }
    if (/\bif\b/.test(line) && !luaHeaderHasTerminator(cleanedLines, index, "then")) {
      errors.push({ level: "ERROR", line: lineNumber, message: "If sin then" });
    }
    if (/\belseif\b/.test(line) && !luaHeaderHasTerminator(cleanedLines, index, "then")) {
      errors.push({ level: "ERROR", line: lineNumber, message: "Elseif sin then" });
    }
    if (/\bwhile\b/.test(line) && !luaHeaderHasTerminator(cleanedLines, index, "do")) {
      errors.push({ level: "ERROR", line: lineNumber, message: "While sin do" });
    }
    if (/\bfor\b/.test(line) && !luaHeaderHasTerminator(cleanedLines, index, "do")) {
      errors.push({ level: "ERROR", line: lineNumber, message: "For sin do" });
    }
    handleLuaBlocks(line, lineNumber, stack, errors);
    validateLuaTiCalls(line, raw, lineNumber, tiApi, knownGlobals, userDefinedFunctions, errors, warnings);
  });
  for (const item of stack) {
    errors.push({ level: "ERROR", line: item.line, message: `${item.word} sin ${item.expected}` });
  }
  for (const item of delimiterStack) {
    errors.push({ level: "ERROR", line: item.line, message: `Delimitador sin cerrar: ${item.char}` });
  }
  return { errors, warnings };
}

function luaHeaderHasTerminator(cleanedLines, startIndex, terminator) {
  const terminatorRegex = new RegExp(`\\b${terminator}\\b`);
  let previous = "";
  let depth = 0;
  for (let i = startIndex; i < cleanedLines.length; i += 1) {
    const compact = (cleanedLines[i] || "").trim();
    if (!compact) continue;
    if (i > startIndex && depth <= 0 && !luaHeaderCanContinue(previous, compact, terminator)) {
      return false;
    }
    depth += luaDelimiterDelta(compact);
    if (terminatorRegex.test(compact)) return true;
    previous = compact;
  }
  return false;
}

function luaHeaderCanContinue(previous, current, terminator) {
  const terminatorRegex = new RegExp(`^${terminator}\\b`);
  return terminatorRegex.test(current)
    || luaLineEndsAsContinuation(previous)
    || /^(if|elseif|while|for)\s*$/.test(previous)
    || /^[),}\]]/.test(current)
    || /^(and|or|in)\b/.test(current)
    || /^[+\-*\/%^#=<>~,.]/.test(current);
}

function luaLineEndsAsContinuation(line) {
  const compact = (line || "").trim();
  return /[\(\[\{,+\-*\/%^#=<>~.]$/.test(compact)
    || /\b(and|or|not|in)\s*$/.test(compact)
    || /\.\.\s*$/.test(compact);
}

function luaDelimiterDelta(line) {
  let depth = 0;
  for (const char of line) {
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
  }
  return Math.max(depth, -1);
}

function stripLuaCode(code) {
  const lines = code.split("\n");
  const cleaned = [];
  let inLongComment = false;
  let inLongString = false;
  for (const raw of lines) {
    let line = "";
    let quote = "";
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const two = raw.slice(i, i + 2);
      const four = raw.slice(i, i + 4);
      if (inLongComment) {
        if (two === "]]") {
          inLongComment = false;
          line += "  ";
          i += 1;
        } else {
          line += " ";
        }
        continue;
      }
      if (inLongString) {
        if (two === "]]") {
          inLongString = false;
          line += "  ";
          i += 1;
        } else {
          line += " ";
        }
        continue;
      }
      if (!quote && four === "--[[") {
        inLongComment = true;
        line += "    ";
        i += 3;
        continue;
      }
      if (!quote && two === "--") {
        line += " ".repeat(raw.length - i);
        break;
      }
      if (!quote && two === "[[") {
        inLongString = true;
        line += "  ";
        i += 1;
        continue;
      }
      const char = raw[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        line += " ";
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        line += " ";
        continue;
      }
      line += char;
    }
    cleaned.push(line);
  }
  return cleaned;
}

function handleLuaBlocks(line, lineNumber, stack, errors) {
  if (/^\s*do\b/.test(line)) {
    stack.push({ word: "do", expected: "end", line: lineNumber });
  }
  const tokens = line.match(/\b(local\s+function|function|if|for|while|repeat|else|elseif|end|until)\b/g) || [];
  for (const rawToken of tokens) {
    const token = rawToken === "local function" ? "function" : rawToken;
    if (token === "function") stack.push({ word: "function", expected: "end", line: lineNumber });
    else if (token === "if") stack.push({ word: "if", expected: "end", line: lineNumber });
    else if (token === "for") stack.push({ word: "for", expected: "end", line: lineNumber });
    else if (token === "while") stack.push({ word: "while", expected: "end", line: lineNumber });
    else if (token === "repeat") stack.push({ word: "repeat", expected: "until", line: lineNumber });
    else if (token === "else" || token === "elseif") {
      const lastIf = [...stack].reverse().find((item) => item.word === "if");
      if (!lastIf) errors.push({ level: "ERROR", line: lineNumber, message: `${token} sin if asociado` });
    } else if (token === "end" || token === "until") {
      const last = stack.pop();
      if (!last || last.expected !== token) errors.push({ level: "ERROR", line: lineNumber, message: `${token} inesperado` });
    }
  }
}

function collectLuaUserFunctions(cleanedLines) {
  const names = new Set();
  for (const line of cleanedLines) {
    const fn = /^\s*function\s+([A-Za-z_][A-Za-z0-9_]*(?:(?:\.|:)[A-Za-z_][A-Za-z0-9_]*)*)\s*\(/.exec(line);
    if (fn) names.add(fn[1].replace(/:/g, "."));
    const assigned = /^\s*([A-Za-z_][A-Za-z0-9_]*(?:(?:\.|:)[A-Za-z_][A-Za-z0-9_]*)*)\s*=\s*function\s*\(/.exec(line);
    if (assigned) names.add(assigned[1].replace(/:/g, "."));
  }
  return names;
}

function luaTiApiSpec() {
  const arg = (min, max = min) => ({ min, max });
  return {
    events: {
      "on.paint": arg(1),
      "on.draw": arg(1),
      "on.create": arg(0),
      "on.construction": arg(0),
      "on.timer": arg(0),
      "on.charIn": arg(1),
      "on.escapeKey": arg(0),
      "on.enterKey": arg(0),
      "on.tabKey": arg(0),
      "on.backtabKey": arg(0),
      "on.backspaceKey": arg(0),
      "on.deleteKey": arg(0),
      "on.returnKey": arg(0),
      "on.clearKey": arg(0),
      "on.contextMenu": arg(0, 2),
      "on.help": arg(0),
      "on.arrowKey": arg(1),
      "on.arrowLeft": arg(0),
      "on.arrowRight": arg(0),
      "on.arrowUp": arg(0),
      "on.arrowDown": arg(0),
      "on.mouseDown": arg(2),
      "on.rightMouseDown": arg(2),
      "on.mouseUp": arg(2),
      "on.mouseMove": arg(2),
      "on.rightMouseUp": arg(2),
      "on.grabDown": arg(2),
      "on.grabUp": arg(2),
      "on.keyboardUp": arg(0),
      "on.keyboardDown": arg(0),
      "on.varChange": arg(1),
      "on.getSymbolList": arg(0),
      "on.save": arg(0),
      "on.restore": arg(0, 1),
      "on.cut": arg(0),
      "on.copy": arg(0),
      "on.paste": arg(0, 1),
      "on.getFocus": arg(0),
      "on.loseFocus": arg(0),
      "on.createMathBox": arg(0, 1),
      "on.resize": arg(0, 2),
      "on.activate": arg(0),
      "on.deactivate": arg(0),
    },
    calls: {
      "gc.setColorRGB": arg(1, 3),
      "gc.setFont": arg(1, 3),
      "gc.drawString": arg(3, 4),
      "gc.drawLine": arg(4),
      "gc.drawRect": arg(4),
      "gc.fillRect": arg(4, 5),
      "gc.drawArc": arg(6),
      "gc.fillArc": arg(6),
      "gc.drawPolyLine": arg(1, null),
      "gc.fillPolygon": arg(1, null),
      "gc.getStringWidth": arg(1),
      "gc.getStringHeight": arg(1),
      "gc.setPen": arg(1, 4),
      "gc.drawImage": arg(3, 6),
      "gc.clipRect": arg(5),
      "gc.begin": arg(0),
      "gc.finish": arg(0),
      "platform.apilevel": arg(0),
      "platform.isTabletModeRendering": arg(0),
      "platform.window.invalidate": arg(0, 4),
      "platform.window.width": arg(0),
      "platform.window.height": arg(0),
      "platform.window.setBackgroundColor": arg(1),
      "platform.window.setFocus": arg(1),
      "platform.withGC": arg(1, 2),
      "platform.gc": arg(0),
      "platform.hw": arg(0),
      "platform.isDeviceModeRendering": arg(0),
      "platform.isColorDisplay": arg(0),
      "platform.registerErrorHandler": arg(1),
      "timer.start": arg(1),
      "timer.stop": arg(0),
      "timer.getMilliSecCounter": arg(0),
      "timer.purgeTasks": arg(0),
      "var.store": arg(2),
      "var.recall": arg(1),
      "var.list": arg(0, 1),
      "var.monitor": arg(1),
      "var.unmonitor": arg(1),
      "var.makeNumericList": arg(1),
      "var.recallAt": arg(2, 3),
      "var.recallstr": arg(1),
      "var.storeAt": arg(3, 4),
      "toolpalette.register": arg(1, 2),
      "toolpalette.enable": arg(1, 3),
      "toolpalette.disable": arg(1, 3),
      "toolpalette.enableCopy": arg(1),
      "toolpalette.enableCut": arg(1),
      "toolpalette.enablePaste": arg(1),
      "locale.name": arg(0),
      "clipboard.addText": arg(1),
      "clipboard.getText": arg(0),
      "cursor.hide": arg(0),
      "cursor.show": arg(0),
      "cursor.set": arg(1),
      "document.markChanged": arg(0),
      "D2Editor.newRichText": arg(0),
      "D2Editor.createMathBox": arg(0),
      "D2Editor.createChemBox": arg(0),
      "D2Editor.getExpression": arg(0),
      "D2Editor.getExpressionSelection": arg(0),
      "D2Editor.getText": arg(0),
      "D2Editor.hasFocus": arg(0),
      "D2Editor.isVisible": arg(0),
      "D2Editor.move": arg(2),
      "D2Editor.registerFilter": arg(0, 1),
      "D2Editor.resize": arg(2),
      "D2Editor.setBorder": arg(1),
      "D2Editor.setBorderColor": arg(1),
      "D2Editor.setColorable": arg(1),
      "D2Editor.setDisable2DinRT": arg(1),
      "D2Editor.setExpression": arg(0, null),
      "D2Editor.setFocus": arg(0, 1),
      "D2Editor.setFontSize": arg(1),
      "D2Editor.setMainFont": arg(2),
      "D2Editor.setReadOnly": arg(0, 1),
      "D2Editor.setSelectable": arg(0, 1),
      "D2Editor.setSizeChangeListener": arg(1),
      "D2Editor.setTextChangeListener": arg(1),
      "D2Editor.setText": arg(0, null),
      "D2Editor.setTextColor": arg(1),
      "D2Editor.setVisible": arg(1),
      "D2Editor.setWordWrapWidth": arg(1),
    },
  };
}

function validateLuaTiCalls(line, rawLine, lineNumber, tiApi, knownGlobals, userDefinedFunctions, errors, warnings) {
  const eventDef = /^\s*function\s+(on\.[A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/.exec(line);
  if (eventDef) {
    const spec = tiApi.events[eventDef[1]];
    if (spec) {
      const eventArgs = splitLuaArgs(eventDef[2]);
      if (eventArgs.confident) validateLuaArgCount(eventDef[1], eventArgs.args.length, spec, lineNumber, errors);
    }
  }
  const callPattern = /\b([A-Za-z_][A-Za-z0-9_]*(?:(?:\.|:)[A-Za-z_][A-Za-z0-9_]*)+)\s*\(/g;
  let match;
  while ((match = callPattern.exec(line)) !== null) {
    const rawName = match[1];
    const normalized = rawName.replace(/:/g, ".");
    if (userDefinedFunctions.has(normalized)) continue;
    const root = normalized.split(".")[0];
    if (!knownGlobals.has(root)) continue;
    const openIndex = rawLine.indexOf("(", match.index + rawName.length);
    const closeIndex = findMatchingParenRaw(rawLine, openIndex);
    if (closeIndex < 0) continue;
    const argInfo = splitLuaArgs(rawLine.slice(openIndex + 1, closeIndex));
    const spec = tiApi.calls[normalized] || tiApi.calls[normalized.replace(/^platform\.window\./, "platform.window.")];
    if (spec && argInfo.confident) validateLuaArgCount(rawName, argInfo.args.length, spec, lineNumber, errors);
  }
}

function validateLuaArgCount(name, received, spec, line, errors) {
  if (received < spec.min) {
    errors.push({ level: "ERROR", line, message: `${name}: pocos argumentos. Esperados ${spec.min}, recibidos ${received}` });
  } else if (spec.max !== null && received > spec.max) {
    errors.push({ level: "ERROR", line, message: `${name}: demasiados argumentos. Esperados ${spec.max}, recibidos ${received}` });
  }
}

function findMatchingParen(line, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < line.length; i += 1) {
    if (line[i] === "(") depth += 1;
    else if (line[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParenRaw(line, openIndex) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = openIndex; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitLuaArgs(text) {
  const trimmed = text.trim();
  if (!trimmed) return { args: [], confident: true };
  const args = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "-" && text[i + 1] === "-") {
      break;
    }
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    else if (char === "," && depth === 0) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(text.slice(start).trim());
  return { args: args.filter((arg) => arg.length > 0), confident: !quote && depth === 0 };
}

function stripLuaStringsAndComments(line) {
  let clean = "";
  let quote = "";
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1] || "";
    if (!quote && char === "-" && next === "-") {
      clean += " ".repeat(line.length - i);
      return { clean, unclosedString: false };
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      clean += " ";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      clean += " ";
      continue;
    }
    clean += char;
  }
  return { clean, unclosedString: Boolean(quote) };
}

function highlightLuaLine(line) {
  const keywords = new Set([
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
    "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true",
    "until", "while",
  ]);
  let output = "";
  let index = 0;
  while (index < line.length) {
    if (line.slice(index, index + 2) === "--") {
      output += `<span class="tok-comment">${escapeHtml(line.slice(index))}</span>`;
      break;
    }
    const char = line[index];
    if (char === '"' || char === "'") {
      const quote = char;
      let end = index + 1;
      let escaped = false;
      while (end < line.length) {
        const current = line[end];
        if (current === quote && !escaped) {
          end += 1;
          break;
        }
        escaped = current === "\\" && !escaped;
        if (current !== "\\") escaped = false;
        end += 1;
      }
      output += spanToken("tok-lua-string", line.slice(index, end));
      index = end;
      continue;
    }
    const number = /^\d+(?:\.\d+)?/.exec(line.slice(index));
    if (number) {
      output += spanToken("tok-number", number[0]);
      index += number[0].length;
      continue;
    }
    if ("=+-/*.%<>#~".includes(char)) {
      if ((char === "=" || char === "<" || char === ">" || char === "~") && line[index + 1] === "=") {
        output += spanToken("tok-op-red", line.slice(index, index + 2));
        index += 2;
      } else {
        output += spanToken("tok-op-red", char);
        index += 1;
      }
      continue;
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(index));
    if (ident) {
      const word = ident[0];
      const nextChar = line[index + word.length] || "";
      const prevChar = line[index - 1] || "";
      const apiNames = new Set(["gc", "platform", "window", "timer", "var", "math", "string", "D2Editor"]);
      if (keywords.has(word)) output += spanToken("tok-keyword", word);
      else if (apiNames.has(word)) output += spanToken("tok-api", word);
      else if (prevChar === "." || prevChar === ":") output += spanToken("tok-member", word);
      else if (nextChar === "(") output += spanToken("tok-function", word);
      else output += spanToken("tok-variable", word);
      index += word.length;
      continue;
    }
    output += spanToken("tok-plain", char);
    index += 1;
  }
  return output || " ";
}

const LUA_GUIDE_ITEMS = [
  {
    name: "platform.apilevel",
    description: {
      es: "Define el nivel de API Lua que el documento espera usar.",
      en: "Defines the Lua API level expected by the document.",
      fr: "Definit le niveau d'API Lua attendu par le document.",
    },
  },
  {
    name: "platform.window:width()",
    description: {
      es: "Devuelve el ancho actual de la pantalla de la calculadora.",
      en: "Returns the current calculator screen width.",
      fr: "Renvoie la largeur actuelle de l'ecran de la calculatrice.",
    },
  },
  {
    name: "platform.window:height()",
    description: {
      es: "Devuelve el alto actual de la pantalla de la calculadora.",
      en: "Returns the current calculator screen height.",
      fr: "Renvoie la hauteur actuelle de l'ecran de la calculatrice.",
    },
  },
  {
    name: "platform.window:invalidate()",
    description: {
      es: "Solicita repintar la pantalla y vuelve a llamar on.paint.",
      en: "Requests a screen redraw and calls on.paint again.",
      fr: "Demande un rafraichissement de l'ecran et rappelle on.paint.",
    },
  },
  {
    name: "on.paint(gc)",
    description: {
      es: "Evento principal de dibujo. Todo lo visual se renderiza aqui.",
      en: "Main drawing event. All visual output is rendered here.",
      fr: "Evenement principal de dessin. Tout l'affichage visuel est rendu ici.",
    },
  },
  {
    name: "on.create()",
    description: {
      es: "Se ejecuta al crear/iniciar el script Lua.",
      en: "Runs when the Lua script is created or started.",
      fr: "S'execute lors de la creation ou du demarrage du script Lua.",
    },
  },
  {
    name: "on.timer()",
    description: {
      es: "Evento repetido cuando timer.start esta activo.",
      en: "Repeated event while timer.start is active.",
      fr: "Evenement repete lorsque timer.start est actif.",
    },
  },
  {
    name: "on.enterKey()",
    description: {
      es: "Evento al presionar Enter.",
      en: "Event fired when Enter is pressed.",
      fr: "Evenement declenche lorsque Entree est pressee.",
    },
  },
  {
    name: "on.escapeKey()",
    description: {
      es: "Evento al presionar Esc.",
      en: "Event fired when Esc is pressed.",
      fr: "Evenement declenche lorsque Echap est pressee.",
    },
  },
  {
    name: "on.arrowKey(direction)",
    description: {
      es: "Evento de flechas. direction suele ser up, down, left o right.",
      en: "Arrow-key event. direction is usually up, down, left, or right.",
      fr: "Evenement des fleches. direction vaut souvent up, down, left ou right.",
    },
  },
  {
    name: "on.charIn(ch)",
    description: {
      es: "Recibe caracteres escritos por teclado.",
      en: "Receives characters typed from the keyboard.",
      fr: "Recoit les caracteres saisis au clavier.",
    },
  },
  {
    name: "gc:setColorRGB(r,g,b)",
    description: {
      es: "Cambia el color para las siguientes operaciones graficas.",
      en: "Changes the color used by the next drawing operations.",
      fr: "Change la couleur utilisee par les prochaines operations graphiques.",
    },
  },
  {
    name: "gc:setFont(family, style, size)",
    description: {
      es: "Configura fuente, estilo y tamano antes de dibujar texto.",
      en: "Sets font family, style, and size before drawing text.",
      fr: "Definit la police, le style et la taille avant de dessiner du texte.",
    },
  },
  {
    name: "gc:drawString(text,x,y,pos)",
    description: {
      es: "Dibuja texto en una coordenada. pos puede ser top, middle o baseline.",
      en: "Draws text at a coordinate. pos can be top, middle, or baseline.",
      fr: "Dessine du texte a une coordonnee. pos peut valoir top, middle ou baseline.",
    },
  },
  {
    name: "gc:getStringWidth(text)",
    description: {
      es: "Calcula el ancho en pixeles de un texto con la fuente actual.",
      en: "Calculates the pixel width of text using the current font.",
      fr: "Calcule la largeur en pixels du texte avec la police actuelle.",
    },
  },
  {
    name: "gc:drawRect(x,y,w,h)",
    description: {
      es: "Dibuja el borde de un rectangulo.",
      en: "Draws the outline of a rectangle.",
      fr: "Dessine le contour d'un rectangle.",
    },
  },
  {
    name: "gc:fillRect(x,y,w,h)",
    description: {
      es: "Rellena un rectangulo.",
      en: "Fills a rectangle.",
      fr: "Remplit un rectangle.",
    },
  },
  {
    name: "gc:drawLine(x1,y1,x2,y2)",
    description: {
      es: "Dibuja una linea entre dos puntos.",
      en: "Draws a line between two points.",
      fr: "Dessine une ligne entre deux points.",
    },
  },
  {
    name: "gc:drawArc(x,y,w,h,start,angle)",
    description: {
      es: "Dibuja un arco o borde circular.",
      en: "Draws an arc or circular outline.",
      fr: "Dessine un arc ou un contour circulaire.",
    },
  },
  {
    name: "gc:fillArc(x,y,w,h,start,angle)",
    description: {
      es: "Rellena un arco o circulo parcial.",
      en: "Fills an arc or partial circle.",
      fr: "Remplit un arc ou un cercle partiel.",
    },
  },
  {
    name: "timer.start(seconds)",
    description: {
      es: "Activa eventos on.timer con intervalo aproximado.",
      en: "Starts on.timer events at an approximate interval.",
      fr: "Active les evenements on.timer avec un intervalle approximatif.",
    },
  },
  {
    name: "timer.stop()",
    description: {
      es: "Detiene el timer.",
      en: "Stops the timer.",
      fr: "Arrete le timer.",
    },
  },
  {
    name: "D2Editor.newRichText()",
    description: {
      es: "Crea un editor nativo de texto enriquecido/matematico.",
      en: "Creates a native rich-text or math editor.",
      fr: "Cree un editeur natif de texte enrichi ou mathematique.",
    },
  },
  {
    name: "var.store(name,value)",
    description: {
      es: "Guarda una variable CAS accesible desde el documento.",
      en: "Stores a CAS variable accessible from the document.",
      fr: "Enregistre une variable CAS accessible depuis le document.",
    },
  },
  {
    name: "var.recall(name)",
    description: {
      es: "Lee una variable CAS guardada en el documento.",
      en: "Reads a CAS variable stored in the document.",
      fr: "Lit une variable CAS enregistree dans le document.",
    },
  },
  {
    name: "love.load()",
    category: "love",
    description: {
      es: "Inicializa recursos y variables del juego o animacion LÖVE.",
      en: "Initializes resources and variables for a LÖVE game or animation.",
      fr: "Initialise les ressources et variables d'un jeu ou d'une animation LÖVE.",
    },
  },
  {
    name: "love.update(dt)",
    category: "love",
    description: {
      es: "Actualiza logica por frame. dt es el tiempo en segundos desde el frame anterior.",
      en: "Updates per-frame logic. dt is the elapsed seconds since the previous frame.",
      fr: "Met a jour la logique par frame. dt est le temps en secondes depuis la frame precedente.",
    },
  },
  {
    name: "love.draw()",
    category: "love",
    description: {
      es: "Dibuja la escena LÖVE. En el conversor se ejecuta desde on.paint(gc).",
      en: "Draws the LÖVE scene. In the converter it runs from on.paint(gc).",
      fr: "Dessine la scene LÖVE. Dans le convertisseur, elle s'execute depuis on.paint(gc).",
    },
  },
  {
    name: "love.resize(w,h)",
    category: "love",
    description: {
      es: "Se llama cuando cambia el tamano del preview o ventana.",
      en: "Runs when the preview or window size changes.",
      fr: "S'execute lorsque la taille de l'apercu ou de la fenetre change.",
    },
  },
  {
    name: "love.keypressed(key)",
    category: "love",
    description: {
      es: "Recibe teclas como up, down, left, right, return, escape o space.",
      en: "Receives keys such as up, down, left, right, return, escape, or space.",
      fr: "Recoit les touches comme up, down, left, right, return, escape ou space.",
    },
  },
  {
    name: "love.mousepressed(x,y,button)",
    category: "love",
    description: {
      es: "Recibe clicks del preview LÖVE con coordenadas del canvas.",
      en: "Receives LÖVE preview clicks with canvas coordinates.",
      fr: "Recoit les clics de l'apercu LÖVE avec les coordonnees du canvas.",
    },
  },
  {
    name: "love.graphics.setColor(r,g,b,a)",
    category: "love",
    description: {
      es: "Define el color de dibujo. Acepta 0..1 estilo LÖVE o 0..255.",
      en: "Sets the drawing color. Accepts LÖVE-style 0..1 or 0..255 values.",
      fr: "Definit la couleur de dessin. Accepte les valeurs LÖVE 0..1 ou 0..255.",
    },
  },
  {
    name: "love.graphics.setBackgroundColor(r,g,b,a)",
    category: "love",
    description: {
      es: "Define el color usado por love.graphics.clear y por el fondo del preview.",
      en: "Sets the color used by love.graphics.clear and the preview background.",
      fr: "Definit la couleur utilisee par love.graphics.clear et le fond de l'apercu.",
    },
  },
  {
    name: "love.graphics.print(text,x,y)",
    category: "love",
    description: {
      es: "Dibuja texto y queda disponible en Copiar contenido.",
      en: "Draws text and makes it available through Copy content.",
      fr: "Dessine du texte et le rend disponible via Copier contenu.",
    },
  },
  {
    name: "love.graphics.printf(text,x,y,limit,align)",
    category: "love",
    description: {
      es: "Dibuja texto alineado a izquierda, centro o derecha dentro de un ancho.",
      en: "Draws text aligned left, center, or right inside a width.",
      fr: "Dessine du texte aligne a gauche, centre ou droite dans une largeur.",
    },
  },
  {
    name: "love.graphics.rectangle(mode,x,y,w,h)",
    category: "love",
    description: {
      es: "Dibuja o rellena rectangulos. mode suele ser fill o line.",
      en: "Draws or fills rectangles. mode is usually fill or line.",
      fr: "Dessine ou remplit des rectangles. mode vaut souvent fill ou line.",
    },
  },
  {
    name: "love.graphics.circle(mode,x,y,radius)",
    category: "love",
    description: {
      es: "Dibuja o rellena circulos usando el canvas del preview.",
      en: "Draws or fills circles using the preview canvas.",
      fr: "Dessine ou remplit des cercles avec le canvas de l'apercu.",
    },
  },
  {
    name: "love.graphics.ellipse(mode,x,y,rx,ry)",
    category: "love",
    description: {
      es: "Dibuja o rellena elipses. En TI-Nspire se traduce a arcos.",
      en: "Draws or fills ellipses. On TI-Nspire it is translated to arcs.",
      fr: "Dessine ou remplit des ellipses. Sur TI-Nspire, cela se traduit en arcs.",
    },
  },
  {
    name: "love.graphics.arc(mode,x,y,r,a1,a2)",
    category: "love",
    description: {
      es: "Dibuja o rellena arcos usando angulos en radianes.",
      en: "Draws or fills arcs using angles in radians.",
      fr: "Dessine ou remplit des arcs avec des angles en radians.",
    },
  },
  {
    name: "love.graphics.line(...)",
    category: "love",
    description: {
      es: "Dibuja segmentos entre pares x,y. Tambien acepta una tabla de puntos.",
      en: "Draws segments between x,y pairs. It also accepts a point table.",
      fr: "Dessine des segments entre paires x,y. Accepte aussi une table de points.",
    },
  },
  {
    name: "love.graphics.polygon(mode,...)",
    category: "love",
    description: {
      es: "Dibuja o rellena poligonos con pares de coordenadas.",
      en: "Draws or fills polygons from coordinate pairs.",
      fr: "Dessine ou remplit des polygones avec des paires de coordonnees.",
    },
  },
  {
    name: "love.graphics.push/pop/translate/scale/rotate",
    category: "love",
    description: {
      es: "Maneja transformaciones graficas. El conversor aplica transformaciones basicas.",
      en: "Manages graphics transforms. The converter applies basic transforms.",
      fr: "Gere les transformations graphiques. Le convertisseur applique les transformations de base.",
    },
  },
  {
    name: "love.window.setTitle(title)",
    category: "love",
    description: {
      es: "Guarda el titulo de la ventana. En TI-Nspire no cambia la barra real.",
      en: "Stores the window title. On TI-Nspire it does not change the real title bar.",
      fr: "Enregistre le titre de la fenetre. Sur TI-Nspire, la vraie barre ne change pas.",
    },
  },
  {
    name: "love.keyboard.isDown(key)",
    category: "love",
    description: {
      es: "Consulta si una tecla esta activa durante el preview o timer.",
      en: "Checks whether a key is active during preview or timer updates.",
      fr: "Verifie si une touche est active pendant l'apercu ou le timer.",
    },
  },
  {
    name: "love.mouse.getPosition() / love.mouse.isDown(button)",
    category: "love",
    description: {
      es: "Consulta posicion y botones del mouse en el preview.",
      en: "Reads mouse position and buttons in the preview.",
      fr: "Lit la position et les boutons de la souris dans l'apercu.",
    },
  },
  {
    name: "love.timer.getDelta() / getTime() / getFPS()",
    category: "love",
    description: {
      es: "Expone tiempo basico para animaciones y pruebas.",
      en: "Exposes basic timing for animations and tests.",
      fr: "Expose un temps de base pour animations et tests.",
    },
  },
  {
    name: "love.filesystem.write/read/append/lines",
    category: "love",
    description: {
      es: "Emulacion virtual de texto. No lee archivos reales ni recursos binarios.",
      en: "Virtual text emulation. It does not read real files or binary assets.",
      fr: "Emulation virtuelle de texte. Ne lit pas de vrais fichiers ni ressources binaires.",
    },
  },
  {
    name: "os.time() / os.clock()",
    category: "bridge",
    description: {
      es: "Compatibilidad para scripts LÖVE que usan tiempo o math.randomseed(os.time()). En TI-Nspire se basa en timer.getMilliSecCounter cuando existe.",
      en: "Compatibility for LÖVE scripts that use time or math.randomseed(os.time()). On TI-Nspire it uses timer.getMilliSecCounter when available.",
      fr: "Compatibilite pour les scripts LÖVE utilisant le temps ou math.randomseed(os.time()). Sur TI-Nspire, utilise timer.getMilliSecCounter si disponible.",
    },
  },
  {
    name: "love.system.*",
    category: "love",
    description: {
      es: "Shim seguro para getOS, getProcessorCount, clipboard, openURL y vibrate. En TI-Nspire no abre recursos externos reales.",
      en: "Safe shim for getOS, getProcessorCount, clipboard, openURL, and vibrate. On TI-Nspire it does not open real external resources.",
      fr: "Shim sur pour getOS, getProcessorCount, clipboard, openURL et vibrate. Sur TI-Nspire, n'ouvre pas de vraies ressources externes.",
    },
  },
  {
    name: "love.audio.*",
    category: "love",
    description: {
      es: "Compatibilidad no-op para Source/play/stop/pause/volume. Evita errores, pero la calculadora no reproduce audio.",
      en: "No-op compatibility for Source/play/stop/pause/volume. It avoids errors, but the calculator does not play audio.",
      fr: "Compatibilite no-op pour Source/play/stop/pause/volume. Evite les erreurs, mais la calculatrice ne lit pas l'audio.",
    },
  },
  {
    name: "love.image/sound/data/touch/joystick/thread",
    category: "love",
    description: {
      es: "Shims de compatibilidad para scripts comunes. Devuelven objetos seguros o tablas vacias; no implementan imagen/audio/hilos reales en TI-Nspire.",
      en: "Compatibility shims for common scripts. They return safe objects or empty tables; they do not implement real image/audio/thread support on TI-Nspire.",
      fr: "Shims de compatibilite pour scripts courants. Retourne objets surs ou tables vides; pas de vrai support image/audio/thread sur TI-Nspire.",
    },
  },
  {
    name: "love.draw() -> on.paint(gc)",
    category: "bridge",
    description: {
      es: "El conversor llama love.draw desde on.paint para que TI-Nspire repinte la pantalla.",
      en: "The converter calls love.draw from on.paint so TI-Nspire redraws the screen.",
      fr: "Le convertisseur appelle love.draw depuis on.paint pour repeindre l'ecran TI-Nspire.",
    },
  },
  {
    name: "love.update(dt) -> on.timer()",
    category: "bridge",
    description: {
      es: "La animacion LÖVE se ejecuta con timer.start y on.timer en la calculadora.",
      en: "LÖVE animation runs through timer.start and on.timer on the calculator.",
      fr: "L'animation LÖVE s'execute avec timer.start et on.timer sur la calculatrice.",
    },
  },
  {
    name: "love.graphics.print() -> gc:drawString()",
    category: "bridge",
    description: {
      es: "Texto LÖVE se traduce al dibujo de texto nativo de TI-Nspire.",
      en: "LÖVE text is translated to native TI-Nspire text drawing.",
      fr: "Le texte LÖVE est traduit en dessin de texte natif TI-Nspire.",
    },
  },
  {
    name: "love.graphics.rectangle() -> gc:drawRect/fillRect",
    category: "bridge",
    description: {
      es: "Rectangulos LÖVE se traducen a drawRect o fillRect.",
      en: "LÖVE rectangles are translated to drawRect or fillRect.",
      fr: "Les rectangles LÖVE sont traduits en drawRect ou fillRect.",
    },
  },
  {
    name: "love.graphics.circle/ellipse/arc() -> gc:drawArc/fillArc",
    category: "bridge",
    description: {
      es: "Circulos, elipses y arcos se dibujan con las primitivas de arco de TI-Nspire.",
      en: "Circles, ellipses, and arcs are drawn with TI-Nspire arc primitives.",
      fr: "Cercles, ellipses et arcs sont dessines avec les primitives d'arc TI-Nspire.",
    },
  },
  {
    name: "love.graphics.getWidth/Height() -> platform.window:width/height()",
    category: "bridge",
    description: {
      es: "Dimensiones LÖVE se resuelven al tamano de pantalla de TI-Nspire.",
      en: "LÖVE dimensions resolve to the TI-Nspire screen size.",
      fr: "Les dimensions LÖVE correspondent a la taille de l'ecran TI-Nspire.",
    },
  },
  {
    name: "love.keypressed('return') -> on.enterKey()",
    category: "bridge",
    description: {
      es: "Enter de LÖVE se conecta con on.enterKey en la calculadora.",
      en: "LÖVE return is connected to on.enterKey on the calculator.",
      fr: "La touche return de LÖVE est connectee a on.enterKey sur la calculatrice.",
    },
  },
  {
    name: "love.keypressed('escape') -> on.escapeKey()",
    category: "bridge",
    description: {
      es: "Escape de LÖVE se conecta con on.escapeKey.",
      en: "LÖVE escape is connected to on.escapeKey.",
      fr: "La touche escape de LÖVE est connectee a on.escapeKey.",
    },
  },
  {
    name: "Variables Lua locales/globales",
    category: "bridge",
    description: {
      es: "local x, pages o currentPage siguen siendo Lua normal. No se convierten; la capa solo traduce APIs graficas/eventos.",
      en: "local x, pages, or currentPage remain normal Lua. They are not converted; only graphics/event APIs are bridged.",
      fr: "local x, pages ou currentPage restent du Lua normal. Seules les API graphiques/evenements sont traduites.",
    },
  },
  {
    name: "Limitaciones LÖVE -> TI-Nspire",
    category: "bridge",
    description: {
      es: "Shaders, fisica nativa, recursos binarios, audio real, imagenes reales y filesystem real no son portables sin reescritura especifica.",
      en: "Shaders, native physics, binary assets, real audio, real images, and real filesystem access are not portable without specific rewrites.",
      fr: "Shaders, physique native, ressources binaires, vrai audio, vraies images et vrai filesystem ne sont pas portables sans reecriture specifique.",
    },
  },
];

function luaString(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/\r?\n/g, "\\n");
}

function luaRgbFromHex(hex, fallback = [45, 147, 173]) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) return fallback;
  const raw = match[1];
  return [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16));
}

function luaRgbText(hex, fallback = [0, 0, 0]) {
  return luaRgbFromHex(hex, fallback).join(", ");
}

const LUA_PAGE_INSERT_MARKER = "-- [[TNS_TOOL_PAGES_END]]";

function luaTemplateActionSnippet(action, selfRef = "self") {
  if (action === "home") {
    return `goHome()`;
  }
  if (action === "back") {
    return `goBack()`;
  }
  if (action === "details") {
    return `${selfRef}.detailsOpen = true
  platform.window:invalidate()`;
  }
  if (action === "none") {
    return `platform.window:invalidate()`;
  }
  return `goNext()`;
}

function luaVisualActionsTable(actions = []) {
  const cleaned = (actions || []).filter((action) => action && action.type && (action.target || action.expression || action.targetPage));
  if (!cleaned.length) return "{}";
  return `{${cleaned.map((action) => {
    const parts = [`type="${luaString(action.type)}"`];
    if (action.condition) parts.push(`condition="${luaString(action.condition)}"`);
    if (action.expression) parts.push(`expression="${luaString(action.expression)}"`);
    if (action.target) parts.push(`target="${luaString(action.target)}"`);
    if (action.value !== undefined) parts.push(`value="${luaString(action.value)}"`);
    if (action.targetPage) parts.push(`targetPage=${Number(action.targetPage) || 1}`);
    if (action.strictCondition === false) parts.push(`strictCondition=false`);
    if (action.silent) parts.push("silent=true");
    if (action.details) {
      const details = Array.isArray(action.details) ? action.details.join("\n") : String(action.details);
      parts.push(`details="${luaString(details)}"`);
    }
    return `{${parts.join(", ")}}`;
  }).join(", ")}}`;
}

function luaNestedVisualActionsTable(groups = []) {
  const cleaned = Array.isArray(groups) ? groups : [];
  if (!cleaned.length) return "{}";
  return `{${cleaned.map((actions) => luaVisualActionsTable(actions || [])).join(", ")}}`;
}

function luaFieldsTable(fields = []) {
  const cleaned = (fields || []).filter(Boolean);
  return `{${cleaned.map((field, index) => {
    const label = field.label || String.fromCharCode(97 + index);
    return `{label="${luaString(label)}", value="${luaString(field.value || "")}", placeholder="${luaString(field.placeholder || label)}", bind="${luaString(field.bind || "")}"}`;
  }).join(", ")}}`;
}

function luaButtonsTable(buttons = {}) {
  const ordered = ["back", "primary", "details"];
  const cleaned = ordered
    .map((id) => buttons[id] ? { id, ...buttons[id] } : null)
    .filter(Boolean);
  return `{${cleaned.map((button) => {
    const parts = [
      `id="${luaString(button.id)}"`,
      `text="${luaString(button.text || "")}"`,
      `x=${Number(button.x) || 0}`,
      `y=${Number(button.y) || 0}`,
      `w=${Number(button.w) || 70}`,
    ];
    return `{${parts.join(", ")}}`;
  }).join(", ")}}`;
}

function extractLuaPageOptions(code) {
  const pages = [];
  for (const page of findLuaPageBlocks(code)) pages.push({ index: page.index, name: page.name });
  return pages;
}

function findMatchingBrace(code, openIndex) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openIndex; index < code.length; index += 1) {
    const char = code[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseLuaStringList(raw = "") {
  const out = [];
  const regex = /"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = regex.exec(raw))) out.push(match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  return out;
}

function unescapeLuaString(value = "") {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseLuaNumberList(raw = "") {
  return raw.split(",").map((value) => Number(value.trim()) || 0);
}

function rgbToHexFromMatch(match, fallback) {
  if (!match) return fallback;
  const nums = match.slice(1, 4).map((value) => Math.max(0, Math.min(255, Number(value) || 0)));
  return `#${nums.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function inferTiVariableType(value = "") {
  const text = String(value || "").trim();
  if (!text) return "unknown";
  if (/^["']/.test(text)) return "string";
  if (/^\{[\s\S]*\}$/.test(text) || /^\[[\s\S]*\]$/.test(text)) return "list";
  if (/^-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(text)) return "number";
  if (/[+\-*/^=<>]|(?:\b(?:and|or|not|when|solve|nsolve|ln|exp|sqrt)\b)/i.test(text)) return "expression";
  return "unknown";
}

function isTiIdentifier(name = "") {
  return /^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(String(name || "").trim());
}

function variableScopeRank(scope = "") {
  if (scope === "parameter") return 3;
  if (scope === "local") return 2;
  if (scope === "global") return 1;
  return 0;
}

function addVariableCandidate(map, variable) {
  const name = String(variable.name || "").trim();
  if (!isTiIdentifier(name)) return;
  const key = `${variable.owner || ""}:${name}`;
  const existing = map.get(key);
  if (existing) {
    if (existing.dataType === "unknown" && variable.dataType) existing.dataType = variable.dataType;
    if (variableScopeRank(variable.scope) > variableScopeRank(existing.scope)) {
      existing.scope = variable.scope;
      existing.source = variable.source || existing.source;
    }
    if (!existing.sources) existing.sources = [existing.source].filter(Boolean);
    if (variable.source && !existing.sources.includes(variable.source)) existing.sources.push(variable.source);
    return;
  }
  map.set(key, {
    name,
    dataType: variable.dataType || "unknown",
    scope: variable.scope || "global",
    owner: variable.owner || "",
    ownerType: variable.ownerType || "",
    source: variable.source || "code",
    sources: [variable.source || "code"],
  });
}

function parseDeclarationNames(raw = "") {
  return String(raw || "")
    .split(",")
    .map((name) => name.trim())
    .filter(isTiIdentifier);
}

function parseVariablesFromTiCode(code = "", owner = "", ownerType = "Prgm", parameters = "") {
  const map = new Map();
  const normalized = decodeXmlTextEntities(String(code || "")).replace(/\u2192/g, "->");
  for (const name of parseDeclarationNames(parameters)) {
    addVariableCandidate(map, { name, owner, ownerType, scope: "parameter", dataType: "unknown", source: "parameters" });
  }
  for (const match of normalized.matchAll(/\bLocal\s+([^\n\r]+)/gi)) {
    for (const name of parseDeclarationNames(match[1])) {
      addVariableCandidate(map, { name, owner, ownerType, scope: "local", dataType: "unknown", source: "local" });
    }
  }
  for (const match of normalized.matchAll(/\bRequest\s+["'][^"']*["']\s*,\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/gi)) {
    addVariableCandidate(map, { name: match[1], owner, ownerType, scope: ownerType === "Func" ? "local" : "global", dataType: "unknown", source: "request" });
  }
  for (const match of normalized.matchAll(/\bvar\.store\s*\(\s*(["'])(.*?)\1\s*,\s*([^)]+)\)/gi)) {
    addVariableCandidate(map, { name: match[2], owner, ownerType, scope: "global", dataType: inferTiVariableType(match[3]), source: "var.store" });
  }
  for (const match of normalized.matchAll(/(^|[\n\r:])\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*:=\s*([^\n\r:]+)/g)) {
    addVariableCandidate(map, { name: match[2], owner, ownerType, scope: ownerType === "Func" ? "local" : "global", dataType: inferTiVariableType(match[3]), source: ":=" });
  }
  for (const match of normalized.matchAll(/(^|[\n\r:])\s*([^:\n\r]+?)\s*->\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/g)) {
    addVariableCandidate(map, { name: match[3], owner, ownerType, scope: ownerType === "Func" ? "local" : "global", dataType: inferTiVariableType(match[2]), source: "store" });
  }
  return Array.from(map.values());
}

function collectLoadedTnsVariables(extraCode = "") {
  const map = new Map();
  const items = Array.isArray(xmlDoctor.candidates) ? xmlDoctor.candidates : [];
  for (const item of items) {
    const code = item.code || item.content || "";
    const ownerType = item.document_type || item.type || (String(code).trim().startsWith("Func") ? "Func" : "Prgm");
    for (const variable of parseVariablesFromTiCode(code, item.program_name || item.name || "", ownerType, item.parameters || "")) {
      addVariableCandidate(map, variable);
    }
  }
  if (extraCode) {
    for (const variable of parseVariablesFromTiCode(extraCode, "Lua Script", "Lua", "")) {
      addVariableCandidate(map, variable);
    }
  }
  const catalog = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  xmlDoctor.variableCatalog = catalog;
  return catalog;
}

function normalizeTiExpression(expr = "") {
  return decodeXmlTextEntities(String(expr || ""))
    .replace(/\u2192/g, "->")
    .replaceAll("−", "-")
    .replaceAll("√", "sqrt")
    .replaceAll("π", "pi")
    .replace(/\bapprox\s*\(([\s\S]*)\)$/i, "$1")
    .trim();
}

function extractTiExpressionNames(expr = "") {
  const reserved = new Set(["and", "or", "not", "then", "if", "approx", "sqrt", "sin", "cos", "tan", "ln", "exp", "string", "pi", "e"]);
  const names = new Set();
  for (const match of String(expr || "").matchAll(/[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*/g)) {
    const name = match[0];
    if (!reserved.has(name.toLowerCase()) && isTiIdentifier(name)) names.add(name);
  }
  return Array.from(names);
}

function invertTiCondition(condition = "") {
  const text = normalizeTiExpression(condition);
  const simple = /^(.+?)\s*(<=|>=|~=|≠|=|<|>)\s*(.+)$/.exec(text);
  if (!simple) return "";
  const left = simple[1].trim();
  const op = simple[2];
  const right = simple[3].trim();
  const inverse = {
    "=": "~=",
    "≠": "=",
    "~=": "=",
    "<": ">=",
    ">": "<=",
    "<=": ">",
    ">=": "<",
  }[op];
  return inverse ? `${left}${inverse}${right}` : "";
}

function collectLoadedTnsLogic(extraCode = "") {
  const conditions = new Set();
  const calculations = [];
  const addFromCode = (code = "") => {
    const normalized = decodeXmlTextEntities(String(code || "")).replace(/\u2192/g, "->");
    for (const match of normalized.matchAll(/\bIf\s+(.+?)\s+Then\b/gi)) {
      const condition = normalizeTiExpression(match[1]);
      if (condition) conditions.add(condition);
    }
    for (const match of normalized.matchAll(/(^|[\n\r:])\s*([^:\n\r]+?)\s*->\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/g)) {
      const expression = normalizeTiExpression(match[2]);
      const target = match[3];
      if (expression && target) calculations.push({ expression, target, label: `${expression} -> ${target}` });
    }
  };
  for (const item of Array.isArray(xmlDoctor.candidates) ? xmlDoctor.candidates : []) {
    addFromCode(item.code || item.content || "");
  }
  if (extraCode) addFromCode(extraCode);
  const uniqueCalculations = [];
  const seen = new Set();
  for (const calc of calculations) {
    const key = `${calc.expression}->${calc.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCalculations.push(calc);
  }
  return { conditions: Array.from(conditions), calculations: uniqueCalculations };
}

function variableSelectOptions(catalog = [], selected = "") {
  const options = [`<option value="">${escapeHtml(t("luaNoVariableBinding"))}</option>`];
  for (const variable of catalog) {
    const label = `${variable.name} · ${variable.scope} · ${variable.dataType}`;
    options.push(`<option value="${escapeHtml(variable.name)}" ${variable.name === selected ? "selected" : ""}>${escapeHtml(label)}</option>`);
  }
  return options.join("");
}

function parseLuaFormFields(block = "") {
  const fieldsBlock = /fields\s*=\s*\{([\s\S]*?)\}\s*,\s*\n\s*actions\s*=/.exec(block)?.[1] || "";
  const fields = [];
  for (const match of fieldsBlock.matchAll(/\{([\s\S]*?)\}/g)) {
    const raw = match[1];
    fields.push({
      label: /label\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      bind: /bind\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      placeholder: /placeholder\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
    });
  }
  return fields;
}

function parseLuaFormButtons(block = "") {
  const buttonsBlock = /buttons\s*=\s*\{([\s\S]*?)\}\s*,\s*\n\s*detailsOpen\s*=/.exec(block)?.[1] || "";
  const buttons = {};
  for (const match of buttonsBlock.matchAll(/\{([\s\S]*?)\}/g)) {
    const raw = match[1];
    const id = /id\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "";
    if (!id) continue;
    buttons[id] = {
      text: /text\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      x: Number(/x\s*=\s*(-?\d+)/.exec(raw)?.[1] || 0),
      y: Number(/y\s*=\s*(-?\d+)/.exec(raw)?.[1] || 0),
      w: Number(/w\s*=\s*(-?\d+)/.exec(raw)?.[1] || 70),
    };
  }
  return buttons;
}

function parseLuaVisualActions(block = "") {
  const actionsBlock = /actions\s*=\s*\{([\s\S]*?)\}\s*,\s*\n\s*(resultText|focus)\s*=/.exec(block)?.[1] || "";
  const actions = [];
  for (const match of actionsBlock.matchAll(/\{([\s\S]*?)\}/g)) {
    const raw = match[1];
    const details = /details\s*=\s*"((?:\\.|[^"\\])*)"/.exec(raw)?.[1] || "";
    actions.push({
      type: /type\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      condition: /condition\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      expression: /expression\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      target: /target\s*=\s*(["'])(.*?)\1/.exec(raw)?.[2] || "",
      strictCondition: /strictCondition\s*=\s*false/.test(raw) ? false : /strictCondition\s*=\s*true/.test(raw) ? true : undefined,
      details: unescapeLuaString(details),
    });
  }
  return actions;
}

function getLuaPaintSlice(block) {
  const start = block.indexOf("paint = function");
  if (start < 0) return block;
  const nextHandlers = ["\n  arrowKey =", "\n  charIn =", "\n  enterKey =", "\n  escapeKey ="]
    .map((needle) => block.indexOf(needle, start + 1))
    .filter((index) => index > start);
  const end = nextHandlers.length ? Math.min(...nextHandlers) : block.length;
  return block.slice(start, end);
}

function findDrawStringAt(block, x, y) {
  const regex = new RegExp(`gc:drawString\\((["'])(.*?)\\1,\\s*${x}\\s*,\\s*${y}\\s*,`, "s");
  return regex.exec(block)?.[2] || "";
}

function findLuaPageBlocks(code = "") {
  const pages = [];
  const regex = /addPage\s*\(/g;
  let match;
  while ((match = regex.exec(code))) {
    if (/function\s*$/.test(code.slice(Math.max(0, match.index - 16), match.index))) continue;
    const openBrace = code.indexOf("{", match.index);
    if (openBrace < 0) continue;
    const closeBrace = findMatchingBrace(code, openBrace);
    if (closeBrace < 0) continue;
    const endParen = code.indexOf(")", closeBrace);
    const end = endParen >= 0 ? endParen + 1 : closeBrace + 1;
    const block = code.slice(match.index, end);
    const nameMatch = /name\s*=\s*(["'])(.*?)\1/.exec(block);
    const itemsMatch = /items\s*=\s*\{([\s\S]*?)\}/.exec(block);
    const targetsMatch = /targets\s*=\s*\{([\s\S]*?)\}/.exec(block);
    const titleMatch = /local\s+title\s*=\s*(["'])(.*?)\1/.exec(block);
    const subtitleMatch = /local\s+subtitle\s*=\s*(["'])(.*?)\1/.exec(block);
    const buttonMatch = /local\s+label\s*=\s*(["'])(.*?)\1/.exec(block);
    const paintSlice = getLuaPaintSlice(block);
    const paintRgbMatches = [...paintSlice.matchAll(/gc:setColorRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)];
    const isStart = Boolean(titleMatch);
    const isMenu = Boolean(itemsMatch);
    const isPopup = /visible\s*=\s*true/.test(block) && (/local\s+boxW\s*=/.test(block) || /fillRect\(104,\s*76,\s*112,\s*58\)/.test(block));
    const isForm = /fields\s*=\s*\{/.test(block) && /drawInput\s*=/.test(block);
    const isProbasMenu = isMenu && /subtitle\s*=/.test(block) && (/ProbasMaster/.test(block) || /FormulaPro/.test(block) || /drawRect\(8,\s*28,\s*300,\s*140\)/.test(block));
    const type = isStart ? "start" : isProbasMenu ? "probas-menu" : isMenu ? "menu" : isPopup ? "popup" : isForm ? "form" : "generic";
    const formButtonYMatch = /self:drawButton\(gc,\s*["'].*?Retour.*?["'],\s*8,\s*(\d+)/.exec(block);
    const formButtonY = Number(formButtonYMatch?.[1] || 188);
    const formButtonText = findDrawStringAt(block, 112, formButtonY + 6);
    const formFields = isForm ? parseLuaFormFields(block) : [];
    const formButtons = isForm ? parseLuaFormButtons(block) : {};
    const visualActions = isForm ? parseLuaVisualActions(block) : [];
    const popupTitle = /local\s+popupTitle\s*=\s*(["'])(.*?)\1/.exec(block)?.[2] || findDrawStringAt(block, 112, 84);
    const popupButtonText = /local\s+buttonLabel\s*=\s*(["'])(.*?)\1/.exec(block)?.[2] || findDrawStringAt(block, 150, 113);
    const popupWidth = Number(/local\s+boxW\s*=\s*(\d+)/.exec(block)?.[1] || 112);
    const popupHeight = Number(/local\s+boxH\s*=\s*(\d+)/.exec(block)?.[1] || 58);
    const titleText = titleMatch?.[2] || (isPopup ? popupTitle : "");
    const buttonText = buttonMatch?.[2] || formButtonText || popupButtonText || "";
    const primaryColor = isStart
      ? rgbToHexFromMatch(paintRgbMatches[2], "#2d93ad")
      : isMenu
        ? rgbToHexFromMatch(paintRgbMatches[1], "#a3e635")
        : isPopup
          ? rgbToHexFromMatch(paintRgbMatches[5], "#a3e635")
          : isForm
            ? rgbToHexFromMatch([...block.matchAll(/gc:setColorRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\n\s*gc:drawString\(["'].*?["'],\s*112,/g)][0], "#a3e635")
            : "#a3e635";
    pages.push({
      index: pages.length + 1,
      start: match.index,
      end,
      block,
      type,
      name: nameMatch?.[2] || `Page ${pages.length + 1}`,
      items: itemsMatch ? parseLuaStringList(itemsMatch[1]) : [],
      targets: targetsMatch ? parseLuaNumberList(targetsMatch[1]) : [],
      titleText,
      subtitleText: subtitleMatch?.[2] || /subtitle\s*=\s*(["'])(.*?)\1/.exec(block)?.[2] || "",
      buttonText,
      inputCount: formFields.length || (block.match(/label="/g) || []).length || 3,
      formFields,
      formButtons,
      visualActions,
      buttonPosition: formButtonY < 100 ? "top" : "bottom",
      backgroundColor: rgbToHexFromMatch(paintRgbMatches[0], type === "menu" ? "#ffffff" : type === "form" ? "#e0e0e0" : "#f5f5f5"),
      textColor: rgbToHexFromMatch(paintRgbMatches[type === "menu" ? 3 : type === "popup" ? 4 : 1], "#000000"),
      buttonColor: primaryColor,
      popupWidth,
      popupHeight,
    });
    regex.lastIndex = end;
  }
  return pages;
}

function updateLuaPageBlock(block, patch) {
  let next = block;
  const replaceDrawStringAt = (source, x, y, value) => {
    const pattern = new RegExp(`gc:drawString\\((["'])(.*?)\\1,\\s*${x}\\s*,\\s*${y}\\s*,`);
    return source.replace(pattern, `gc:drawString("${luaString(value)}", ${x}, ${y},`);
  };
  const replaceBetween = (source, startPattern, endPattern, replacement) => {
    const startMatch = startPattern.exec(source);
    if (!startMatch) return source;
    const start = startMatch.index;
    const afterStart = start + startMatch[0].length;
    const tail = source.slice(afterStart);
    const endMatch = endPattern.exec(tail);
    if (!endMatch) return source;
    const end = afterStart + endMatch.index;
    return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  };
  if (patch.name) {
    next = next.replace(/name\s*=\s*(["'])(.*?)\1/, `name = "${luaString(patch.name)}"`);
  }
  if (patch.titleText !== undefined) next = next.replace(/local\s+title\s*=\s*(["'])(.*?)\1/, `local title = "${luaString(patch.titleText)}"`);
  if (patch.titleText !== undefined) next = next.replace(/local\s+popupTitle\s*=\s*(["'])(.*?)\1/, `local popupTitle = "${luaString(patch.titleText)}"`);
  if (patch.subtitleText !== undefined) next = next.replace(/local\s+subtitle\s*=\s*(["'])(.*?)\1/, `local subtitle = "${luaString(patch.subtitleText)}"`);
  if (patch.subtitleText !== undefined) next = next.replace(/subtitle\s*=\s*(["'])(.*?)\1/, `subtitle = "${luaString(patch.subtitleText)}"`);
  if (patch.buttonText !== undefined) next = next.replace(/local\s+label\s*=\s*(["'])(.*?)\1/, `local label = "${luaString(patch.buttonText)}"`);
  if (patch.buttonText !== undefined) next = next.replace(/local\s+buttonLabel\s*=\s*(["'])(.*?)\1/, `local buttonLabel = "${luaString(patch.buttonText)}"`);
  if (patch.popupWidth !== undefined) next = next.replace(/local\s+boxW\s*=\s*\d+/, `local boxW = ${Math.max(72, Math.min(240, Number(patch.popupWidth) || 112))}`);
  if (patch.popupHeight !== undefined) next = next.replace(/local\s+boxH\s*=\s*\d+/, `local boxH = ${Math.max(42, Math.min(150, Number(patch.popupHeight) || 58))}`);
  if (patch.titleText !== undefined && !/local\s+title\s*=/.test(next)) {
    if (patch.type === "menu") {
      next = replaceDrawStringAt(next, 92, 8, patch.titleText);
      next = replaceDrawStringAt(next, 5, 0, patch.titleText);
    }
    else if (patch.type === "probas-menu") next = replaceDrawStringAt(next, 5, 0, patch.titleText);
    else if (patch.type === "popup") next = replaceDrawStringAt(next, 112, 84, patch.titleText);
    else if (patch.type === "form") next = replaceDrawStringAt(next, 8, 8, patch.titleText);
  }
  if (patch.buttonText !== undefined && !/local\s+label\s*=/.test(next)) {
    if (patch.type === "popup") next = replaceDrawStringAt(next, 150, 113, patch.buttonText);
    else if (patch.type === "form") {
      next = next.replace(/gc:drawString\((["'])(.*?)\1,\s*112,\s*(\d+)\s*,/, `gc:drawString("${luaString(patch.buttonText)}", 112, $3,`);
    }
  }
  if (patch.backgroundColor || patch.textColor || patch.buttonColor) {
    const replacements = {
      start: [patch.backgroundColor, patch.textColor, patch.buttonColor],
      menu: [patch.backgroundColor, patch.buttonColor, null, patch.textColor],
      "probas-menu": [patch.backgroundColor, null, patch.textColor, patch.buttonColor, null, patch.textColor],
      popup: [patch.backgroundColor, null, null, null, patch.textColor, patch.buttonColor],
      form: [patch.backgroundColor, patch.textColor],
      generic: [patch.backgroundColor, patch.textColor],
    }[patch.type || "generic"] || [];
    next = next.replace(/(paint\s*=\s*function[\s\S]*?)(?=\n\s*(arrowKey|charIn|enterKey|escapeKey)\s*=|\n\}\))/m, (paintBlock) => {
      let localIndex = 0;
      return paintBlock.replace(/gc:setColorRGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g, (match) => {
        const color = replacements[localIndex];
        localIndex += 1;
        if (!color) return match;
        const rgb = luaRgbText(color, localIndex === 1 ? [245, 245, 245] : [0, 0, 0]);
        return `gc:setColorRGB(${rgb})`;
      });
    });
    if ((patch.type === "form" || patch.type === "popup") && patch.buttonColor) {
      const rgb = luaRgbText(patch.buttonColor, [163, 230, 53]);
      next = next.replace(/gc:setColorRGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)\s*\n\s*gc:drawString\((["']).*?\1,\s*(112|150)\s*,/m, (match, quote, x) => {
        return match.replace(/gc:setColorRGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, `gc:setColorRGB(${rgb})`);
      });
    }
  }
  if (patch.items?.length) {
    const itemText = patch.items.map((item) => `"${luaString(item)}"`).join(", ");
    if (/items\s*=\s*\{[\s\S]*?\}/.test(next)) {
      next = next.replace(/items\s*=\s*\{[\s\S]*?\}/, `items = {${itemText}}`);
    }
    const targetText = patch.targets.map((target) => Number(target) || 0).join(", ");
    if (/targets\s*=\s*\{[\s\S]*?\}/.test(next)) {
      next = next.replace(/targets\s*=\s*\{[\s\S]*?\}/, `targets = {${targetText}}`);
    } else {
      next = next.replace(/items\s*=\s*\{[\s\S]*?\},?/, (match) => `${match.replace(/,?\s*$/, "")},\n  targets = {${targetText}},`);
    }
  }
  if (Array.isArray(patch.formFields)) {
    next = replaceBetween(
      next,
      /fields\s*=\s*\{/,
      /\n\s*actions\s*=/,
      `fields = ${luaFieldsTable(patch.formFields)},`
    );
  }
  if (patch.formButtons) {
    next = replaceBetween(
      next,
      /buttons\s*=\s*\{/,
      /\n\s*detailsOpen\s*=/,
      `buttons = ${luaButtonsTable(patch.formButtons)},`
    );
  }
  if (Array.isArray(patch.visualActions)) {
    next = replaceBetween(
      next,
      /actions\s*=\s*\{/,
      /\n\s*(resultText|focus)\s*=/,
      `actions = ${luaVisualActionsTable(patch.visualActions)},`
    );
  }
  return next;
}

function luaTemplateRouteSnippet(targetExpression = "target") {
  return `if ${targetExpression} and ${targetExpression} > 0 and ${targetExpression} <= #pages then
    goToPage(${targetExpression})
  elseif currentPage < #pages then
    goNext()
  end
  platform.window:invalidate()`;
}

const LUA_TEMPLATE_PRESETS = [
  {
    id: "form",
    name: "Formulario",
    description: "Pantalla tipo calculadora con inputs, botones inferiores y panel opcional de detalles.",
    defaults: {
      inputCount: 3,
      title: "Formulario",
      buttonText: "Calcular",
      primaryColor: "#a3e635",
      backgroundColor: "#e0e0e0",
      textColor: "#000000",
      useThemeColor: true,
      action: "next",
      variableBase: "var",
      showPrimaryButton: true,
      showDetailsButton: true,
      showBackButton: true,
    },
    build(options) {
      const count = Math.max(1, Math.min(8, Number(options.inputCount) || 3));
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor);
      const bg = luaRgbText(options.backgroundColor, [224, 224, 224]);
      const text = luaRgbText(options.textColor, [0, 0, 0]);
      const labels = Array.from({ length: count }, (_, index) => options.fieldLabels?.[index] || String.fromCharCode(97 + index));
      const primaryAction = luaTemplateActionSnippet(options.primaryButtonAction || options.action || "next");
      const backAction = luaTemplateActionSnippet(options.backButtonAction || "home");
      const detailsAction = luaTemplateActionSnippet(options.detailsButtonAction || "details");
      const buttonY = options.buttonPosition === "top" ? 26 : 188;
      const barY = options.buttonPosition === "top" ? 58 : 180;
      const resultY = options.buttonPosition === "top" ? 62 : barY - 20;
      const rowStart = options.buttonPosition === "top" ? 76 : 42;
      const showBack = options.showBackButton !== false;
      const showPrimary = options.showPrimaryButton !== false;
      const showDetails = options.showDetailsButton !== false;
      const bindings = Array.isArray(options.fieldBindings) ? options.fieldBindings : [];
      const actionsTable = luaVisualActionsTable(options.buttonActions);
      const buttonDefs = [
        showBack ? `{id="back", text="${luaString(options.backButtonText || "◀ Retour")}", x=8, y=${buttonY}, w=70}` : "",
        showPrimary ? `{id="primary", text="${luaString(options.buttonText || "Calcular")}", x=112, y=${buttonY}, w=80}` : "",
        showDetails ? `{id="details", text="${luaString(options.detailsButtonText || "Detalles")}", x=240, y=${buttonY}, w=70}` : "",
      ].filter(Boolean).join(", ");
      const rows = labels.map((label, index) => {
        const y = rowStart + index * 28;
        return `  gc:drawString("${luaString(label)}", 14, ${y + 4}, "top")
  gc:drawString(":", 70, ${y + 4}, "top")
  drawInput(gc, fields[${index + 1}], 82, ${y}, 158, 22)`;
      }).join("\n");
      return `addPage({
  name = "${luaString(options.title)}",
  fields = {${labels.map((label, index) => `{label="${luaString(label)}", value="", placeholder="${luaString(label)}", bind="${luaString(bindings[index] || "")}"}`).join(", ")}},
  actions = ${actionsTable},
  resultText = "",
  detailsText = "",
  focus = 1,
  buttonFocus = 1,
  focusArea = "fields",
  buttons = {${buttonDefs}},
  detailsOpen = false,
  drawButton = function(self, gc, text, x, y, w)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(x, y, w, 24)
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(x, y, w, 24)
  if self.focusArea == "buttons" and self.buttons[self.buttonFocus] and self.buttons[self.buttonFocus].x == x then
    gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
    gc:drawRect(x - 2, y - 2, w + 4, 28)
  end
  gc:setColorRGB(0, 0, 0)
  gc:drawString(text, x + (w - gc:getStringWidth(text)) / 2, y + 5, "top")
  end,
  drawInput = function(self, gc, field, x, y, w, h)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(x, y, w, h)
  gc:setColorRGB(field.focused and ${primaryR} or 128, field.focused and ${primaryG} or 128, field.focused and ${primaryB} or 128)
  gc:drawRect(x, y, w, h)
  gc:setColorRGB(field.value == "" and 150 or 0, field.value == "" and 150 or 0, field.value == "" and 150 or 0)
  gc:drawString(field.value ~= "" and field.value or field.placeholder, x + 4, y + 3, "top")
  end,
  drawMultiline = function(self, gc, text, x, y, lineHeight, maxLines)
  local content = tostring(text or "")
  _G.__tnsToolCopyText = content
  local pos = 1
  local line = 0
  while pos <= #content and line < maxLines do
    local nextBreak = content:find("\\n", pos, true)
    local piece
    if nextBreak then
      piece = content:sub(pos, nextBreak - 1)
      pos = nextBreak + 1
    else
      piece = content:sub(pos)
      pos = #content + 1
    end
    gc:drawString(piece, x, y + line * lineHeight, "top")
    line = line + 1
  end
  end,
  paint = function(self, gc)
  _G.__tnsToolCopyText = ""
  gc:setColorRGB(${bg})
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  gc:setFont("sansserif", "b", 10)
  gc:setColorRGB(${text})
  gc:drawString("${luaString(options.title)}", 8, 8, "top")
  gc:setFont("sansserif", "r", 10)
  for i, field in ipairs(self.fields) do
    field.focused = i == self.focus
  end
${rows.replaceAll("drawInput(gc, fields[", "self:drawInput(gc, self.fields[")}
  gc:setColorRGB(128, 128, 128)
  gc:fillRect(8, ${barY}, 304, 2)
  for i, button in ipairs(self.buttons) do
    self:drawButton(gc, button.text, button.x, button.y, button.w)
  end
  if self.resultText ~= "" then
    _G.__tnsToolCopyText = self.resultText
    gc:setColorRGB(${text})
    gc:drawString(self.resultText, 82, ${resultY}, "top")
  end
  if self.detailsOpen then
    gc:setColorRGB(255, 255, 255)
    gc:fillRect(42, 50, 230, 120)
    gc:setColorRGB(128, 128, 128)
    gc:drawRect(42, 50, 230, 120)
    gc:setColorRGB(${text})
    gc:drawString("${luaString(options.title)}", 50, 58, "top")
    local detail = self.detailsText ~= "" and self.detailsText or (self.resultText ~= "" and self.resultText or "Sin resultado aun")
    self:drawMultiline(gc, detail, 50, 80, 14, 6)
    gc:drawString("Esc/Detalles para cerrar", 50, 154, "top")
  end
  end,
  arrowKey = function(self, direction)
  if self.focusArea == "fields" then
    if direction == "down" and self.focus == #self.fields and #self.buttons > 0 then self.focusArea = "buttons"
    elseif direction == "down" then self.focus = math.min(#self.fields, self.focus + 1)
    elseif direction == "up" then self.focus = math.max(1, self.focus - 1) end
  else
    if direction == "up" then self.focusArea = "fields"
    elseif direction == "right" then self.buttonFocus = math.min(#self.buttons, self.buttonFocus + 1)
    elseif direction == "left" then self.buttonFocus = math.max(1, self.buttonFocus - 1) end
  end
  platform.window:invalidate()
  end,
  charIn = function(self, ch)
  if self.focusArea ~= "fields" then return end
  self.fields[self.focus].value = self.fields[self.focus].value .. ch
  setVar(self.fields[self.focus].bind, self.fields[self.focus].value)
  platform.window:invalidate()
  end,
  backspaceKey = function(self)
  if self.focusArea ~= "fields" then return end
  self.fields[self.focus].value = self.fields[self.focus].value:sub(1, -2)
  setVar(self.fields[self.focus].bind, self.fields[self.focus].value)
  platform.window:invalidate()
  end,
  activateButton = function(self, button)
  if not button then return end
  if button.id == "back" then
    ${backAction}
  elseif button.id == "details" then
    if self.detailsOpen then
      self.detailsOpen = false
      platform.window:invalidate()
    else
      ${detailsAction}
    end
  else
    self.detailsOpen = false
    for _, field in ipairs(self.fields) do
      setVar(field.bind, field.value)
    end
    if runVisualActions(self.actions, self.fields) then
      self.resultText = tostring(_G.__lastVisualActionResult or "")
      self.detailsText = tostring(_G.__lastVisualActionDetails or "")
      platform.window:invalidate()
      return
    elseif self.actions and #self.actions > 0 then
      self.resultText = tostring(_G.__lastVisualActionResult or "Condicion no cumplida")
      self.detailsText = tostring(_G.__lastVisualActionDetails or "")
      platform.window:invalidate()
      return
    end
    ${primaryAction}
  end
  end,
  enterKey = function(self)
  if self.focusArea == "buttons" then
    self:activateButton(self.buttons[self.buttonFocus])
    return
  end
  self.focusArea = "buttons"
  platform.window:invalidate()
  end,
  mouseDown = function(self, x, y)
  if self.detailsOpen then
    for i, button in ipairs(self.buttons) do
      if button.id == "details" and x >= button.x and x <= button.x + button.w and y >= button.y and y <= button.y + 24 then
        self.buttonFocus = i
        self.focusArea = "buttons"
        self.detailsOpen = false
        platform.window:invalidate()
        return
      end
    end
  end
  for i, field in ipairs(self.fields) do
    local fy = ${rowStart} + (i - 1) * 28
    if x >= 82 and x <= 240 and y >= fy and y <= fy + 22 then
      self.focus = i
      self.focusArea = "fields"
      platform.window:invalidate()
      return
    end
  end
  for i, button in ipairs(self.buttons) do
    if x >= button.x and x <= button.x + button.w and y >= button.y and y <= button.y + 24 then
      self.buttonFocus = i
      self.focusArea = "buttons"
      self:activateButton(button)
      platform.window:invalidate()
      return
    end
  end
  end,
  escapeKey = function(self)
  if self.detailsOpen then self.detailsOpen = false else goBack() end
  platform.window:invalidate()
  end
})`;
    },
  },
  {
    id: "menu",
    name: "Menu",
    description: "Lista vertical con cursor, ideal para categorias o acciones.",
    defaults: { inputCount: 4, title: "Menu", buttonText: "Enter", backButtonText: "◀ Retour", backButtonAction: "back", showBackButton: false, primaryColor: "#a3e635", backgroundColor: "#ffffff", textColor: "#000000", useThemeColor: true, action: "next", variableBase: "selected_item", menuLabels: [], menuTargets: [] },
    build(options) {
      const count = Math.max(2, Math.min(10, Number(options.inputCount) || 4));
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor);
      const bg = luaRgbText(options.backgroundColor, [255, 255, 255]);
      const text = luaRgbText(options.textColor, [0, 0, 0]);
      const labels = Array.from({ length: count }, (_, index) => options.menuLabels?.[index] || `${index + 1}) Opcion ${index + 1} >`);
      const targets = Array.from({ length: count }, (_, index) => Number(options.menuTargets?.[index]) || 0);
      const items = labels.map((label) => `"${luaString(label)}"`).join(", ");
      const targetList = targets.join(", ");
      const optionActions = Array.from({ length: count }, (_, index) => options.optionActions?.[index] || []);
      const optionActionsTable = luaNestedVisualActionsTable(optionActions);
      const fallbackAction = luaTemplateActionSnippet(options.action);
      const backAction = luaTemplateActionSnippet(options.backButtonAction || "back");
      const showBack = options.showBackButton === true;
      return `addPage({
  name = "${luaString(options.title)}",
  selected = 1,
  items = {${items}},
  targets = {${targetList}},
  optionActions = ${optionActionsTable},
  paint = function(self, gc)
  local copyText = "${luaString(options.title)}"
  for _, item in ipairs(self.items) do
    copyText = copyText .. "\\n" .. item
  end
  _G.__tnsToolCopyText = copyText
  gc:setColorRGB(${bg})
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  gc:setFont("sansserif", "b", 12)
  gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
  gc:drawString("${luaString(options.title)}", 92, 8, "top")
  gc:setFont("sansserif", "r", 10)
  for i, item in ipairs(self.items) do
    local y = 44 + (i - 1) * 24
    if i == self.selected then
      gc:setColorRGB(220, 220, 220)
      gc:fillRect(18, y - 2, 150, 20)
    end
    gc:setColorRGB(${text})
    gc:drawString(item, 28, y, "top")
  end
  ${showBack ? `gc:setColorRGB(255, 255, 255)
  gc:fillRect(8, 184, 72, 24)
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(8, 184, 72, 24)
  gc:setColorRGB(${text})
  local backLabel = "${luaString(options.backButtonText || "◀ Retour")}"
  gc:drawString(backLabel, 8 + (72 - gc:getStringWidth(backLabel)) / 2, 189, "top")` : ""}
  end,
  arrowKey = function(self, direction)
  if direction == "down" then self.selected = self.selected % #self.items + 1 end
  if direction == "up" then self.selected = self.selected == 1 and #self.items or self.selected - 1 end
  platform.window:invalidate()
  end,
  enterKey = function(self)
  setVar("${luaString(options.variableBase || "selected_item")}", self.selected)
  local selectedActions = self.optionActions and self.optionActions[self.selected]
  if selectedActions and #selectedActions > 0 then
    runVisualActions(selectedActions, {})
  end
  local target = self.targets[self.selected]
  if target and target > 0 then
    ${luaTemplateRouteSnippet("target")}
  else
    ${fallbackAction}
  end
  end,
  mouseDown = function(self, x, y)
  for i, item in ipairs(self.items) do
    local itemY = 44 + (i - 1) * 24
    if x >= 18 and x <= 168 and y >= itemY - 2 and y <= itemY + 18 then
      self.selected = i
      self:enterKey()
      platform.window:invalidate()
      return
    end
  end
  ${showBack ? `if x >= 8 and x <= 80 and y >= 184 and y <= 208 then
    ${backAction}
    return
  end` : ""}
  end,
  escapeKey = function(self)
  ${backAction}
  end
})`;
    },
  },
  {
    id: "probas-menu",
    name: "Menu avanzado",
    description: "Menu con titulo, subtitulo, lista, seleccion y barra de scroll visual.",
    defaults: {
      inputCount: 4,
      title: "Menu",
      subtitle: "Selecciona una opcion",
      buttonText: "Enter",
      backButtonText: "◀ Retour",
      backButtonAction: "back",
      showBackButton: false,
      primaryColor: "#3196be",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      useThemeColor: false,
      action: "next",
      variableBase: "selected_item",
      menuLabels: ["Opcion 1", "Opcion 2", "Opcion 3", "Opcion 4"],
      menuTargets: [],
    },
    build(options) {
      const count = Math.max(2, Math.min(10, Number(options.inputCount) || 4));
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor, [49, 150, 190]);
      const bg = luaRgbText(options.backgroundColor, [255, 255, 255]);
      const text = luaRgbText(options.textColor, [0, 0, 0]);
      const defaults = this.defaults.menuLabels || [];
      const labels = Array.from({ length: count }, (_, index) => options.menuLabels?.[index] || defaults[index] || `Opcion ${index + 1}`);
      const targets = Array.from({ length: count }, (_, index) => Number(options.menuTargets?.[index]) || 0);
      const items = labels.map((label) => `"${luaString(label)}"`).join(", ");
      const targetList = targets.join(", ");
      const optionActions = Array.from({ length: count }, (_, index) => options.optionActions?.[index] || []);
      const optionActionsTable = luaNestedVisualActionsTable(optionActions);
      const fallbackAction = luaTemplateActionSnippet(options.action);
      const backAction = luaTemplateActionSnippet(options.backButtonAction || "back");
      const showBack = options.showBackButton === true;
      return `addPage({
  name = "${luaString(options.title)}",
  selected = 1,
  items = {${items}},
  targets = {${targetList}},
  optionActions = ${optionActionsTable},
  subtitle = "${luaString(options.subtitle || this.defaults.subtitle)}",
  paint = function(self, gc)
  local copyText = "${luaString(options.title)}"
  if self.subtitle and self.subtitle ~= "" then copyText = copyText .. "\\n" .. self.subtitle end
  for _, item in ipairs(self.items) do
    copyText = copyText .. "\\n" .. item
  end
  _G.__tnsToolCopyText = copyText
  local w = platform.window:width()
  local h = platform.window:height()
  gc:setColorRGB(${bg})
  gc:fillRect(0, 0, w, h)
  gc:setFont("sansserif", "r", 16)
  gc:setColorRGB(250, 0, 0)
  gc:drawString("${luaString(options.title)}", 5, 0, "top")
  gc:setFont("sansserif", "r", 7)
  gc:setColorRGB(${text})
  gc:drawString(self.subtitle, 150, 10, "top")
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(8, 28, 300, 140)
  gc:setFont("sansserif", "r", 9)
  local visible = 7
  local top = math.max(1, math.min(self.selected, math.max(1, #self.items - visible + 1)))
  if self.selected > visible then top = self.selected - visible + 1 end
  for row = 1, math.min(visible, #self.items) do
    local index = top + row - 1
    local y = 30 + (row - 1) * 18
    if index == self.selected then
      gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
      gc:fillRect(10, y, 286, 18)
      gc:setColorRGB(255, 255, 255)
    else
      gc:setColorRGB(${text})
    end
    gc:drawString(self.items[index], 12, y + 2, "top")
  end
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(292, 36, 8, 112)
  if #self.items > visible then
    local thumbH = math.max(18, math.floor(112 * visible / #self.items))
    local thumbY = 36 + math.floor((112 - thumbH) * (self.selected - 1) / math.max(1, #self.items - 1))
    gc:setColorRGB(190, 190, 190)
    gc:fillRect(293, thumbY, 6, thumbH)
  end
  ${showBack ? `gc:setColorRGB(255, 255, 255)
  gc:fillRect(8, 184, 72, 24)
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(8, 184, 72, 24)
  gc:setColorRGB(${text})
  local backLabel = "${luaString(options.backButtonText || "◀ Retour")}"
  gc:drawString(backLabel, 8 + (72 - gc:getStringWidth(backLabel)) / 2, 189, "top")` : ""}
  end,
  arrowKey = function(self, direction)
  if direction == "down" then self.selected = self.selected % #self.items + 1 end
  if direction == "up" then self.selected = self.selected == 1 and #self.items or self.selected - 1 end
  platform.window:invalidate()
  end,
  enterKey = function(self)
  setVar("${luaString(options.variableBase || "selected_item")}", self.selected)
  local selectedActions = self.optionActions and self.optionActions[self.selected]
  if selectedActions and #selectedActions > 0 then
    runVisualActions(selectedActions, {})
  end
  local target = self.targets[self.selected]
  if target and target > 0 then
    ${luaTemplateRouteSnippet("target")}
  else
    ${fallbackAction}
  end
  end,
  mouseDown = function(self, x, y)
  local visible = 7
  local top = math.max(1, math.min(self.selected, math.max(1, #self.items - visible + 1)))
  if self.selected > visible then top = self.selected - visible + 1 end
  for row = 1, math.min(visible, #self.items) do
    local index = top + row - 1
    local itemY = 30 + (row - 1) * 18
    if x >= 10 and x <= 296 and y >= itemY and y <= itemY + 18 then
      self.selected = index
      self:enterKey()
      platform.window:invalidate()
      return
    end
  end
  ${showBack ? `if x >= 8 and x <= 80 and y >= 184 and y <= 208 then
    ${backAction}
    return
  end` : ""}
  end,
  escapeKey = function(self)
  ${backAction}
  end
})`;
    },
  },
  {
    id: "popup",
    name: "Popup",
    description: "Cuadro centrado con mensaje y boton OK.",
    defaults: { inputCount: 1, title: "Aviso", buttonText: "OK", primaryColor: "#2563eb", backgroundColor: "#eeeeee", textColor: "#000000", useThemeColor: false, action: "next", variableBase: "popup_ok", popupWidth: 112, popupHeight: 58 },
    build(options) {
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor, [37, 99, 235]);
      const bg = luaRgbText(options.backgroundColor, [238, 238, 238]);
      const text = luaRgbText(options.textColor, [0, 0, 0]);
      const action = luaTemplateActionSnippet(options.action);
      const popupWidth = Math.max(72, Math.min(240, Number(options.popupWidth) || 112));
      const popupHeight = Math.max(42, Math.min(150, Number(options.popupHeight) || 58));
      return `addPage({
  name = "${luaString(options.title)}",
  visible = true,
  paint = function(self, gc)
  gc:setColorRGB(${bg})
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  if not self.visible then return end
  local popupTitle = "${luaString(options.title)}"
  local boxW = ${popupWidth}
  local boxH = ${popupHeight}
  local boxX = (platform.window:width() - boxW) / 2
  local boxY = (platform.window:height() - boxH) / 2
  local buttonW = 54
  local buttonH = 24
  local buttonX = boxX + (boxW - buttonW) / 2
  local buttonY = boxY + boxH - buttonH - 8
  gc:setColorRGB(200, 200, 200)
  gc:fillRect(boxX + 6, boxY + 6, boxW, boxH)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(boxX, boxY, boxW, boxH)
  gc:setColorRGB(${text})
  gc:drawString(popupTitle, boxX + 8, boxY + 8, "top")
  gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
  gc:fillRect(buttonX, buttonY, buttonW, buttonH)
  gc:setColorRGB(255, 255, 255)
  local buttonLabel = "${luaString(options.buttonText)}"
  gc:drawString(buttonLabel, buttonX + (buttonW - gc:getStringWidth(buttonLabel)) / 2, buttonY + 5, "top")
  end,
  enterKey = function(self)
  self.visible = false
  setVar("${luaString(options.variableBase || "popup_ok")}", 1)
  ${action}
  end
})`;
    },
  },
];

function insertLuaTemplate(editor, text) {
  const wrappedText = `-- [[TNS_TOOL_TEMPLATE_START]]\n${text}\n-- [[TNS_TOOL_TEMPLATE_END]]`;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  if (start === end) {
    const markerIndex = editor.value.indexOf(LUA_PAGE_INSERT_MARKER);
    if (markerIndex >= 0) {
      editor.value = `${editor.value.slice(0, markerIndex)}${wrappedText}\n\n${editor.value.slice(markerIndex)}`;
    } else {
      const separator = editor.value.trim() ? "\n\n" : "";
      editor.value = `${editor.value}${separator}${wrappedText}`;
    }
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n" : "";
  const suffix = after && !wrappedText.endsWith("\n") ? "\n" : "";
  editor.value = `${before}${prefix}${wrappedText}${suffix}${after}`;
  const cursor = before.length + prefix.length + wrappedText.length;
  editor.focus();
  editor.setSelectionRange(cursor, cursor);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

function tiBasicStringLiterals(line = "") {
  return Array.from(String(line || "").matchAll(/"([^"]*)"/g)).map((match) => match[1]);
}

function tiBasicDispToProcedureText(line = "") {
  const raw = String(line || "").replace(/^Disp\s+/i, "").trim();
  if (!raw) return "";
  let out = raw.replace(/\bstring\s*\(\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*\)/gi, "[[$1]]");
  out = out.replace(/"([^"]*)"/g, "$1");
  out = out.replace(/&/g, "");
  out = out.replace(/\u2192/g, "->").replaceAll("−", "-").trim();
  return out;
}

function tiBasicToLuaExpression(expr = "") {
  return normalizeTiExpression(expr)
    .replaceAll("->", "")
    .replace(/\bnCr\b/gi, "ncr")
    .replace(/\bapprox\s*\(([\s\S]*)\)$/i, "$1")
    .replace(/(\d+(?:\.\d+)?)\s*\*\s*e\s*([+-]?\d+)/gi, "$1e$2")
    .trim();
}

function tnsConvertSourcePrograms(currentLuaItem = null) {
  const items = Array.isArray(xmlDoctor.candidates) ? xmlDoctor.candidates : [];
  return items.filter((item) => {
    if (!item || item === currentLuaItem) return false;
    const code = decodeXmlTextEntities(item.code || item.content || "");
    if (!code.trim()) return false;
    if (/platform\.apilevel|function\s+on\.paint|addPage\s*\(/.test(code)) return false;
    return /\bPrgm\b|\bRequest\b|\bDisp\b|\u2192|->/.test(code);
  });
}

function collectTnsMenuCandidates(code = "") {
  const lines = decodeXmlTextEntities(code).replace(/\u2192/g, "->").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const menus = [];
  for (let index = 0; index < lines.length; index += 1) {
    const request = /^Request\s+"([^"]*)"\s*,\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i.exec(lines[index]);
    if (!request) continue;
    const prompt = request[1].toLowerCase();
    const variable = request[2];
    const isMenuRequest = prompt.includes("op") || /^(opcion|seleccion|sub|dir|modo|sel)$/i.test(variable);
    if (!isMenuRequest) continue;
    const labels = [];
    let cursor = index - 1;
    while (cursor >= 0 && labels.length < 8) {
      const line = lines[cursor];
      if (/^(If|EndIf|Request)\b/i.test(line)) break;
      if (/^clrio$/i.test(line) && labels.length) break;
      if (/^Disp\s+/i.test(line)) {
        const literals = tiBasicStringLiterals(line);
        for (let litIndex = literals.length - 1; litIndex >= 0; litIndex -= 1) {
          const literal = literals[litIndex].trim();
          if (literal) labels.unshift(literal);
        }
      }
      cursor -= 1;
    }
    if (labels.length >= 2) {
      const title = labels[0].toUpperCase() === labels[0] && labels.length > 2 ? labels.shift() : "Menu";
      menus.push({ title, variable, labels: labels.slice(0, 10) });
    }
  }
  return menus;
}

function collectTnsFormCandidates(code = "") {
  const lines = decodeXmlTextEntities(code).replace(/\u2192/g, "->").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const forms = [];
  const recentRequests = [];
  const recentConditions = [];
  const recentDisps = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^clrio$/i.test(line)) {
      recentRequests.length = 0;
      recentDisps.length = 0;
      continue;
    }
    if (/^Else$/i.test(line)) {
      recentDisps.length = 0;
      continue;
    }
    if (/^Disp\s+/i.test(line)) {
      const procedure = tiBasicDispToProcedureText(line);
      const isMenuLine = /^\s*\d+\s*:/.test(procedure) || /^MENU\b/i.test(procedure);
      if (procedure && !isMenuLine) {
        recentDisps.push(procedure);
        if (recentDisps.length > 8) recentDisps.shift();
      }
      continue;
    }
    const request = /^Request\s+"([^"]*)"\s*,\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i.exec(line);
    if (request) {
      const prompt = request[1].replace(/:$/, "");
      const variable = request[2];
      if (!/^(opcion|seleccion|sub|dir|modo|sel)$/i.test(variable)) {
        recentRequests.push({ label: prompt || variable, variable });
        if (recentRequests.length > 6) recentRequests.shift();
      } else {
        recentDisps.length = 0;
      }
      continue;
    }
    const condition = /^If\s+(.+?)\s+Then$/i.exec(line);
    if (condition) {
      recentConditions.push(normalizeTiExpression(condition[1]));
      if (recentConditions.length > 5) recentConditions.shift();
      continue;
    }
    const store = /^(.+?)->\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)$/i.exec(line);
    if (!store) continue;
    const expression = tiBasicToLuaExpression(store[1]);
    const target = store[2];
    if (!expression || !target) continue;
    const usedNames = extractTiExpressionNames(expression);
    const fields = recentRequests
      .filter((field) => usedNames.includes(field.variable))
      .slice(-4);
    if (!fields.length) continue;
    const relatedCondition = [...recentConditions].reverse().find((candidate) => {
      const names = extractTiExpressionNames(candidate);
      if (names.some((name) => /^(opcion|seleccion|sub|dir|modo|sel)$/i.test(name))) return false;
      return names.some((name) => usedNames.includes(name));
    });
    const details = recentDisps.slice(-4);
    for (let cursor = index + 1; cursor < lines.length && details.length < 6; cursor += 1) {
      const nextLine = lines[cursor];
      if (/^(If|EndIf|Request|clrio)\b/i.test(nextLine)) break;
      if (/^Disp\s+/i.test(nextLine)) {
        const procedure = tiBasicDispToProcedureText(nextLine);
        if (procedure) details.push(procedure);
      }
    }
    if (!details.length) details.push(`${target}=${expression}`, `${target}=[[(target)]]`.replace("(target)", target));
    forms.push({
      title: target,
      fields,
      expression,
      target,
      condition: relatedCondition ? invertTiCondition(relatedCondition) || relatedCondition : "",
      details,
    });
    if (forms.length >= 12) break;
  }
  return forms;
}

const TNS_NAV_VARIABLES = new Set(["opcion", "seleccion", "sub", "dir", "modo", "sel"]);

function isTnsNavigationVariable(variable = "") {
  return TNS_NAV_VARIABLES.has(String(variable || "").toLowerCase());
}

function parseTnsIfCondition(condition = "") {
  const text = normalizeTiExpression(condition);
  const match = /^([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*(<=|>=|~=|≠|=|<|>)\s*(-?\d+(?:\.\d+)?)$/.exec(text);
  if (!match) return { raw: text };
  return { raw: text, variable: match[1], operator: match[2], value: match[3] };
}

function tnsPathKey(path = []) {
  return path.map((entry) => `${entry.variable}=${entry.value}`).join("|");
}

function tnsOptionLabelKey(parentPath = [], variable = "", value = "") {
  return `${tnsPathKey(parentPath)}::${String(variable || "").toLowerCase()}=${String(value)}`;
}

function cleanTnsOptionLabel(label = "") {
  return String(label || "")
    .replace(/^\s*\d+\s*[:)]\s*/, "")
    .replace(/[>»]+$/g, "")
    .trim();
}

function prettifyTnsBranchLabel(label = "") {
  const clean = cleanTnsOptionLabel(label);
  const compact = normalizeTnsSimilarityText(clean).replace(/\s+/g, "");
  if (compact === "inercia") return "Primera ley (Inercia)";
  if (compact === "fma") return "Segunda ley (F=m·a)";
  if (compact === "accionreacc" || compact === "accionreaccion") return "Tercera ley (Accion-Reaccion)";
  if (compact === "pmgpeso" || compact === "pmg") return "Peso (P=m·g)";
  if (compact === "nfuerza") return "Fuerza";
  if (compact === "mmasa" || compact === "kgmasa") return "Masa";
  if (compact === "aacems2" || compact === "aaceleracion") return "Aceleracion (a)";
  if (compact === "ncalcularpeso") return "Calcular peso";
  if (compact === "kgcalcularmasa") return "Calcular masa";
  if (compact === "vdesdeh") return "v desde h";
  if (compact === "hdesdev") return "h desde v";
  if (/^\(?v\)?(?:ve|velocidad)?$/.test(compact)) return "Velocidad (v)";
  if (/^\(?x\)?(?:po|posicion)?$/.test(compact)) return "Posicion (x)";
  if (/^\(?h\)?(?:alt|altura)?$/.test(compact)) return "Altura (h)";
  if (/^\(?a\)?(?:aceleracion)?$/.test(compact)) return "Aceleracion (a)";
  if (/^\(?t\)?con\(?v\)?$/.test(compact)) return "Tiempo con v";
  if (/^\(?t\)?sin\(?v\)?$/.test(compact)) return "Tiempo sin v";
  if (/^sin\(?t\)?\(?v\^2\)?$/.test(compact) || compact === "sintv2") return "Sin tiempo (v^2)";
  return clean;
}

function prettifyTnsRequestLabel(label = "", variable = "") {
  const clean = String(label || variable || "").trim();
  const compact = normalizeTnsSimilarityText(clean).replace(/\s+/g, "");
  if (/^(kg)?masa$/.test(compact) || compact === "kgmasa") return "Masa (kg)";
  if (compact === "nfuerza" || compact === "fuerzan") return "Fuerza (N)";
  if (compact === "npeso" || compact === "peson") return "Peso (N)";
  if (compact === "aacemss" || compact === "aacem2s" || /^aace/.test(compact)) return "Aceleracion (m/s^2)";
  if (compact === "v0velocidadinicial" || compact === "v0") return "Velocidad inicial (v0)";
  if (compact === "haltura" || compact === "altura") return "Altura (h)";
  if (compact === "mdistancia" || compact === "distanciam") return "Distancia (m)";
  if (compact === "vvelocidad" || compact === "velocidadms") return "Velocidad (m/s)";
  if (compact === "gravedad") return "Gravedad (m/s^2)";
  if (compact === "constanteg") return "Constante G";
  if (compact === "angulo") return "Angulo";
  return clean;
}

function mergeTnsFields(...groups) {
  const map = new Map();
  for (const group of groups) {
    for (const field of group || []) {
      if (!field?.variable || map.has(field.variable)) continue;
      map.set(field.variable, field);
    }
  }
  return Array.from(map.values());
}

function tnsGeneratedField(variable = "", path = []) {
  return { label: prettifyTnsRequestLabel(variable, variable), variable, path, generated: true };
}

function tnsMissingInputFields(expression = "", fields = [], calculatedTargets = new Set(), path = []) {
  const knownFields = new Set((fields || []).map((field) => field.variable));
  return extractTiExpressionNames(expression)
    .filter((name) => !isTnsNavigationVariable(name) && !knownFields.has(name) && !calculatedTargets.has(name))
    .map((name) => tnsGeneratedField(name, path));
}

function markPostStoreResultPlaceholders(text = "", target = "") {
  if (!target) return text;
  return String(text || "").replaceAll(`[[${target}]]`, "[[__result]]");
}

function tnsExactPath(stack = [], labelByPath = new Map()) {
  const path = [];
  for (const frame of stack) {
    if (!frame || !isTnsNavigationVariable(frame.variable) || frame.operator !== "=") continue;
    let value = frame.value;
    if (frame.elseBranch) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) continue;
      value = String(numeric + 1);
    }
    const label = labelByPath.get(tnsOptionLabelKey(path, frame.variable, value)) || "";
    path.push({ variable: frame.variable, value: String(value), label });
  }
  return path;
}

function tnsPathText(path = []) {
  return path.map((entry) => entry.label || `${entry.variable}=${entry.value}`).filter(Boolean).join(" > ");
}

function tnsMenuTitle(title = "Menu", parentPath = []) {
  const explicit = String(title || "").trim();
  const generic = /^(menu|hallar:?|calcular:?|seleccionar:?|opciones:?)$/i.test(explicit);
  if (explicit && explicit.toLowerCase() !== "menu" && !generic) return explicit;
  const owner = [...parentPath].reverse().find((entry) => entry.label)?.label;
  return owner || explicit || "Menu";
}

function isGenericTnsResultName(text = "") {
  return /^(a|d|dir|emi|f|g|h|m|modo|opcion|peso|sel|seleccion|sub|t|v|vf|vi|v0|x|altura|angulo|constanteg|desplazamiento|distancia|fuerza|fuerza1|fuerza2|fuerzaneta|gravedad|masa|masa1|masa2|trabajo|velocidad|aceleracion|energiapotencial|energiacinetica)$/i.test(String(text || "").trim());
}

function tnsFormTitle(target = "", path = []) {
  const owner = [...path].reverse().find((entry) => entry.label)?.label;
  const text = String(target || "").trim();
  if (owner && (!text || text.length <= 2 || isGenericTnsResultName(text))) return owner;
  if (text && text.length > 1) return text;
  return owner || text || "Calculo";
}

function tnsPathWith(path = [], variable = "", value = "") {
  return [...path, { variable, value: String(value) }];
}

function tnsPathStartsWith(path = [], prefix = []) {
  if (prefix.length > path.length) return false;
  return prefix.every((entry, index) => path[index]?.variable === entry.variable && String(path[index]?.value) === String(entry.value));
}

function tnsPathsOverlap(a = [], b = []) {
  return tnsPathStartsWith(a, b) || tnsPathStartsWith(b, a);
}

function activeTnsStoreCondition(stack = [], usedNames = []) {
  const used = new Set(usedNames);
  const frame = [...stack].reverse().find((candidate) => {
    if (!candidate?.raw) return false;
    const names = extractTiExpressionNames(candidate.raw);
    if (names.some((name) => isTnsNavigationVariable(name))) return false;
    return names.some((name) => used.has(name));
  });
  if (!frame) return "";
  return frame.elseBranch ? invertTiCondition(frame.raw) || frame.raw : frame.raw;
}

function normalizeTnsSimilarityText(text = "") {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_µλσπθω]+/g, " ")
    .trim();
}

function tnsSimilarityTokens(text = "") {
  return normalizeTnsSimilarityText(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !/^\d+$/.test(token));
}

function tnsTokenScore(a = "", b = "") {
  const left = new Set(tnsSimilarityTokens(a));
  const right = new Set(tnsSimilarityTokens(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function tnsPageSearchText(page = {}) {
  return [
    page.title,
    page.pathText,
    page.target,
    ...(page.fields || []).flatMap((field) => [field.label, field.variable]),
    ...(page.details || []),
    ...(page.options || []).map((option) => option.cleanLabel || option.label),
  ].filter(Boolean).join(" ");
}

function findSimilarTnsTarget(pages = [], pageIndex = 0, option = {}, optionPath = [], parentPath = []) {
  const optionText = option.cleanLabel || option.label || "";
  let best = null;
  let bestScore = 0;
  for (let candidateIndex = pageIndex + 1; candidateIndex < pages.length; candidateIndex += 1) {
    const candidate = pages[candidateIndex];
    const candidatePath = candidate.path || candidate.parentPath || [];
    if (candidatePath.length && !tnsPathsOverlap(candidatePath, optionPath) && !tnsPathsOverlap(candidatePath, parentPath)) continue;
    const searchText = tnsPageSearchText(candidate);
    let score = tnsTokenScore(optionText, searchText) * 100;
    if (tnsPathStartsWith(candidatePath, optionPath)) score += 80;
    if (tnsPathsOverlap(candidatePath, optionPath)) score += 15;
    if ((candidate.pathText || "").includes(cleanTnsOptionLabel(optionText))) score += 20;
    score += Math.max(0, 12 - Math.floor((candidateIndex - pageIndex) / 3));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return bestScore >= 28 ? best : null;
}

function parseTnsMenuLiteral(literal = "") {
  const options = [];
  const text = String(literal || "").trim();
  const regex = /(?:^|\s+)(\d+)\s*[:)]?\s*([\s\S]*?)(?=\s+\d+\s*[:)]?\s*|$)/g;
  let match;
  while ((match = regex.exec(text))) {
    const value = Number(match[1]);
    const cleanLabel = prettifyTnsBranchLabel(match[2].trim());
    if (value && cleanLabel) options.push({ value, cleanLabel, label: `${value}) ${cleanLabel} >` });
  }
  return options;
}

function tnsMenuDataBefore(lines = [], requestIndex = 0) {
  const literals = [];
  let cursor = requestIndex - 1;
  while (cursor >= 0 && literals.length < 12) {
    const line = lines[cursor];
    if (/^Request\b/i.test(line)) break;
    if (/^(If|EndIf)\b/i.test(line) && literals.length) break;
    if (/^clrio$/i.test(line) && literals.length) break;
    if (/^Disp\s+/i.test(line)) {
      const lineLiterals = tiBasicStringLiterals(line);
      for (let index = lineLiterals.length - 1; index >= 0; index -= 1) {
        const literal = lineLiterals[index].trim();
        if (literal) literals.unshift(literal);
      }
    }
    cursor -= 1;
  }
  let title = "Menu";
  const options = [];
  for (const literal of literals) {
    const parsedOptions = parseTnsMenuLiteral(literal);
    if (parsedOptions.length) {
      options.push(...parsedOptions);
    } else if (!options.length && literal) {
      title = literal;
    }
  }
  const seen = new Set();
  const uniqueOptions = options
    .filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    })
    .sort((a, b) => a.value - b.value);
  return { title, options: uniqueOptions };
}

function collectTnsRoutedPages(code = "", firstPageNumber = 2) {
  const lines = decodeXmlTextEntities(code).replace(/\u2192/g, "->").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pages = [];
  const stack = [];
  const labelByPath = new Map();
  const recentRequests = [];
  const recentDisps = [];
  const contentPathKeys = new Set();
  const pendingConstantActions = new Map();
  const menuOptionActions = new Map();
  let pageId = 0;
  const markContentPath = (path = []) => {
    const key = tnsPathKey(path);
    if (key) contentPathKeys.add(key);
  };
  const pushInfoPageIfNeeded = (path = [], lineIndex = 0) => {
    const key = tnsPathKey(path);
    if (!key || contentPathKeys.has(key) || !recentDisps.length) return;
    const details = recentDisps.slice(-8).filter((line) => line && !/^Error$/i.test(line));
    if (!details.length) return;
    pages.push({
      id: `page_${++pageId}`,
      type: "info",
      title: tnsFormTitle("", path),
      path,
      pathText: tnsPathText(path),
      details,
      lineIndex,
    });
    contentPathKeys.add(key);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const ifMatch = /^If\s+(.+?)\s+Then$/i.exec(line);
    if (ifMatch) {
      const parsed = parseTnsIfCondition(ifMatch[1]);
      stack.push({ ...parsed, elseBranch: false });
      continue;
    }
    if (/^Else$/i.test(line)) {
      if (stack.length) stack[stack.length - 1].elseBranch = true;
      recentDisps.length = 0;
      continue;
    }
    if (/^EndIf$/i.test(line)) {
      pushInfoPageIfNeeded(tnsExactPath(stack, labelByPath), index);
      stack.pop();
      recentDisps.length = 0;
      continue;
    }
    if (/^clrio$/i.test(line)) {
      recentRequests.length = 0;
      recentDisps.length = 0;
      continue;
    }
    const request = /^Request\s+"([^"]*)"\s*,\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i.exec(line);
    if (request) {
      const prompt = request[1].replace(/:$/, "");
      const variable = request[2];
      const isMenuRequest = prompt.toLowerCase().includes("op") || isTnsNavigationVariable(variable);
      if (isMenuRequest) {
        const menu = tnsMenuDataBefore(lines, index);
        if (menu.options.length >= 2) {
          const parentPath = tnsExactPath(stack, labelByPath);
          const title = tnsMenuTitle(menu.title || "Menu", parentPath);
          for (const option of menu.options) {
            labelByPath.set(tnsOptionLabelKey(parentPath, variable, option.value), option.cleanLabel || cleanTnsOptionLabel(option.label));
          }
          pages.push({
            id: `page_${++pageId}`,
            type: "menu",
            title,
            variable,
            parentPath,
            path: parentPath,
            pathText: tnsPathText(parentPath),
            options: menu.options,
            lineIndex: index,
          });
          markContentPath(parentPath);
        }
        recentDisps.length = 0;
      } else {
        recentRequests.push({ label: prettifyTnsRequestLabel(prompt, variable), variable, path: tnsExactPath(stack, labelByPath) });
        if (recentRequests.length > 10) recentRequests.shift();
      }
      continue;
    }
    if (/^Disp\s+/i.test(line)) {
      const procedure = tiBasicDispToProcedureText(line);
      const isMenuLine = /^\s*\d+\s*:/.test(procedure) || /^MENU\b/i.test(procedure);
      if (procedure && !isMenuLine) {
        recentDisps.push(procedure);
        if (recentDisps.length > 8) recentDisps.shift();
      }
      continue;
    }
    const store = /^(.+?)->\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)$/i.exec(line);
    if (!store) continue;
    const expression = tiBasicToLuaExpression(store[1]);
    const target = store[2];
    if (!expression || !target) continue;
    const usedNames = extractTiExpressionNames(expression);
    const currentPath = tnsExactPath(stack, labelByPath);
    const currentPathKey = tnsPathKey(currentPath);
    if (!usedNames.length) {
      const action = {
        type: "calc",
        expression,
        target,
        strictCondition: false,
        silent: true,
        details: [`${target}=${expression}`, `${target}=[[${target}]]`],
      };
      pendingConstantActions.set(`${currentPathKey}::${target}`, action);
      if (currentPathKey) {
        const list = menuOptionActions.get(currentPathKey) || [];
        list.push(action);
        menuOptionActions.set(currentPathKey, list);
      }
      continue;
    }
    const constantActions = usedNames
      .map((name) => pendingConstantActions.get(`${currentPathKey}::${name}`))
      .filter(Boolean);
    const requestFields = recentRequests
      .filter((field) => tnsPathsOverlap(currentPath, field.path || []))
      .slice(-5);
    const fields = requestFields;
    const previousPage = pages[pages.length - 1];
    const previousActions = previousPage?.actions || (previousPage?.type === "form" ? [{
      type: "calc",
      condition: previousPage.condition,
      expression: previousPage.expression,
      target: previousPage.target,
      strictCondition: false,
      details: previousPage.details,
    }] : []);
    const calculatedTargets = new Set([...constantActions, ...previousActions].map((action) => action.target).filter(Boolean));
    const isChainedCalculation = previousPage?.type === "form"
      && tnsPathKey(previousPage.path) === tnsPathKey(currentPath)
      && usedNames.some((name) => calculatedTargets.has(name));
    const missingFields = tnsMissingInputFields(expression, fields, calculatedTargets, currentPath);
    if (!fields.length && !missingFields.length && !isChainedCalculation) continue;
    const relatedCondition = activeTnsStoreCondition(stack, usedNames);
    const details = recentDisps.slice(-4);
    for (let cursor = index + 1; cursor < lines.length && details.length < 6; cursor += 1) {
      const nextLine = lines[cursor];
      if (/^(If|EndIf|Request|clrio)\b/i.test(nextLine)) break;
      if (/^Disp\s+/i.test(nextLine)) {
        const procedure = tiBasicDispToProcedureText(nextLine);
        if (procedure) details.push(markPostStoreResultPlaceholders(procedure, target));
      }
    }
    if (!details.length) details.push(`${target}=${expression}`, `${target}=[[${target}]]`);
    const action = { type: "calc", condition: relatedCondition, expression, target, strictCondition: false, details };
    if (isChainedCalculation) {
      previousActions.forEach((item) => { item.silent = true; });
      previousPage.actions = [...constantActions, ...previousActions, action];
      previousPage.fields = mergeTnsFields(previousPage.fields, fields, missingFields);
      previousPage.expression = expression;
      previousPage.target = target;
      previousPage.condition = relatedCondition;
      previousPage.details = details;
      previousPage.title = tnsFormTitle(target, currentPath);
      markContentPath(currentPath);
      continue;
    }
    pages.push({
      id: `page_${++pageId}`,
      type: "form",
      title: tnsFormTitle(target, currentPath),
      path: currentPath,
      pathText: tnsPathText(currentPath),
      fields: mergeTnsFields(fields, missingFields),
      expression,
      target,
      condition: relatedCondition,
      details,
      actions: [...constantActions, action],
      lineIndex: index,
    });
    markContentPath(currentPath);
  }
  const pageNumberById = new Map(pages.map((page, index) => [page.id, firstPageNumber + index]));
  const providedVarsByPageId = new Map();
  for (const [pageIndex, page] of pages.entries()) {
    if (page.type !== "menu") continue;
    page.optionActions = page.options.map((option) => {
      const optionPath = tnsPathWith(page.parentPath, page.variable, option.value);
      return menuOptionActions.get(tnsPathKey(optionPath)) || [];
    });
    page.targets = page.options.map((option, optionIndex) => {
      const optionPath = tnsPathWith(page.parentPath, page.variable, option.value);
      const direct = pages.find((candidate, candidateIndex) => {
        if (candidateIndex <= pageIndex) return false;
        if (candidate.type === "menu") return tnsPathKey(candidate.parentPath) === tnsPathKey(optionPath);
        return tnsPathKey(candidate.path) === tnsPathKey(optionPath);
      });
      const nested = direct || pages.find((candidate, candidateIndex) => {
        if (candidateIndex <= pageIndex) return false;
        return tnsPathStartsWith(candidate.path || candidate.parentPath || [], optionPath);
      });
      const similar = nested || findSimilarTnsTarget(pages, pageIndex, option, optionPath, page.parentPath);
      const continuation = similar || pages.find((candidate, candidateIndex) => {
        if (candidateIndex <= pageIndex) return false;
        return tnsPathKey(candidate.path || candidate.parentPath || []) === tnsPathKey(page.parentPath);
      });
      if (continuation) {
        const provided = providedVarsByPageId.get(continuation.id) || new Set();
        for (const action of page.optionActions?.[optionIndex] || []) {
          if (action?.target) provided.add(action.target);
        }
        if (provided.size) providedVarsByPageId.set(continuation.id, provided);
      }
      return continuation ? pageNumberById.get(continuation.id) || 0 : 0;
    });
  }
  for (const page of pages) {
    const provided = providedVarsByPageId.get(page.id);
    if (!provided?.size || page.type !== "form") continue;
    page.fields = (page.fields || []).filter((field) => !(field.generated && provided.has(field.variable)));
  }
  return pages;
}

function buildTnsInfoPage(page = {}) {
  const title = luaString(page.title || page.name || "Informacion");
  const lines = (page.details || []).map((line) => `"${luaString(line)}"`).join(", ");
  return `addPage({
  name = "${title}",
  lines = {${lines}},
  paint = function(self, gc)
  local copyText = "${title}"
  for _, line in ipairs(self.lines) do
    copyText = copyText .. "\\n" .. line
  end
  _G.__tnsToolCopyText = copyText
  gc:setColorRGB(245, 245, 245)
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  gc:setFont("sansserif", "b", 12)
  gc:setColorRGB(0, 0, 0)
  gc:drawString("${title}", 8, 8, "top")
  gc:setFont("sansserif", "r", 10)
  for i, line in ipairs(self.lines) do
    gc:drawString(line, 14, 34 + (i - 1) * 18, "top")
  end
  gc:setColorRGB(128, 128, 128)
  gc:fillRect(8, 180, 304, 2)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(8, 188, 72, 24)
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(8, 188, 72, 24)
  gc:setColorRGB(0, 0, 0)
  local backLabel = "◀ Retour"
  gc:drawString(backLabel, 8 + (72 - gc:getStringWidth(backLabel)) / 2, 193, "top")
  end,
  enterKey = function(self)
  goBack()
  end,
  mouseDown = function(self, x, y)
  if x >= 8 and x <= 80 and y >= 188 and y <= 212 then goBack() end
  end,
  escapeKey = function(self)
  goBack()
  end
})`;
}

function buildLuaFromTnsPrograms(programs = []) {
  const chunks = [];
  let emittedPages = 0;
  for (const program of programs) {
    const code = decodeXmlTextEntities(program.code || program.content || "");
    const programName = program.program_name || program.name || "Programa";
    const routedPages = collectTnsRoutedPages(code, emittedPages + 2);
    for (const [index, page] of routedPages.entries()) {
      if (page.type === "menu") {
        chunks.push(`-- [[TNS_TOOL_CONVERTED_MENU_START: ${luaString(programName)}]]\n${LUA_TEMPLATE_PRESETS.find((template) => template.id === "probas-menu").build({
          ...LUA_TEMPLATE_PRESETS.find((template) => template.id === "probas-menu").defaults,
          title: page.title || `Menu ${index + 1}`,
          subtitle: `Convertido de ${programName}`,
          inputCount: page.options.length,
          menuLabels: page.options.map((option) => option.label),
          menuTargets: page.targets || [],
          optionActions: page.optionActions || [],
          variableBase: page.variable || "selected_item",
          showBackButton: page.parentPath.length > 0,
          backButtonText: "◀ Retour",
          backButtonAction: "back",
        })}\n-- [[TNS_TOOL_CONVERTED_MENU_END]]`);
      } else if (page.type === "form") {
        chunks.push(`-- [[TNS_TOOL_CONVERTED_FORM_START: ${luaString(programName)}]]\n${LUA_TEMPLATE_PRESETS.find((template) => template.id === "form").build({
          ...LUA_TEMPLATE_PRESETS.find((template) => template.id === "form").defaults,
          title: page.title || `Calculo ${index + 1}`,
          buttonText: "Calcular",
          backButtonText: "◀ Retour",
          backButtonAction: "back",
          inputCount: page.fields.length,
          fieldLabels: page.fields.map((field) => field.label),
          fieldBindings: page.fields.map((field) => field.variable),
          buttonActions: page.actions?.length ? page.actions : [{ type: "calc", condition: page.condition, expression: page.expression, target: page.target, strictCondition: false, details: page.details }],
          primaryButtonAction: "none",
        })}\n-- [[TNS_TOOL_CONVERTED_FORM_END]]`);
      } else if (page.type === "info") {
        chunks.push(`-- [[TNS_TOOL_CONVERTED_INFO_START: ${luaString(programName)}]]\n${buildTnsInfoPage(page)}\n-- [[TNS_TOOL_CONVERTED_INFO_END]]`);
      }
    }
    emittedPages += routedPages.length;
  }
  const body = chunks.length
    ? chunks.join("\n\n")
    : `-- No se detectaron menus/formularios convertibles automaticamente.\n-- Pega aqui plantillas manuales desde Edit > Plantillas Lua.`;
  return buildDefaultLuaScriptApp().replace(LUA_PAGE_INSERT_MARKER, `${body}\n\n${LUA_PAGE_INSERT_MARKER}`);
}

function convertTnsToLuaInEditor(editor, currentLuaItem = null) {
  const programs = tnsConvertSourcePrograms(currentLuaItem);
  if (!programs.length) {
    alert("No encontre programas TI-Basic cargados para convertir.");
    return;
  }
  const generated = buildLuaFromTnsPrograms(programs);
  if (editor.value.trim() && !confirm("Esto reemplazara el Lua actual con una version convertida desde TNS/TI-Basic. Continuar?")) return;
  editor.value = generated;
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

function showLuaGuide() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const guideItems = LUA_GUIDE_ITEMS.map((item) => ({
    name: item.name,
    category: item.category || "ti",
    description: item.description?.[language] || item.description?.en || item.description?.es || "",
  }));
  const categories = [
    { id: "all", label: t("luaGuideCategoryAll") },
    { id: "ti", label: t("luaGuideCategoryTi") },
    { id: "love", label: t("luaGuideCategoryLove") },
    { id: "bridge", label: t("luaGuideCategoryBridge") },
  ];
  const categoryLabel = (id) => categories.find((category) => category.id === id)?.label || id;
  let activeCategory = "all";
  backdrop.innerHTML = `
    <div class="modal lua-library-modal">
      <h2>${escapeHtml(t("luaGuide"))}</h2>
      <input id="lua-guide-search" class="library-search" placeholder="${escapeHtml(t("luaGuideSearch"))}">
      <div id="lua-guide-categories" class="lua-guide-categories"></div>
      <div id="lua-guide-list" class="lua-guide-list"></div>
      <div class="modal-actions">
        <button type="button" id="lua-guide-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const list = backdrop.querySelector("#lua-guide-list");
  const search = backdrop.querySelector("#lua-guide-search");
  const categoryBar = backdrop.querySelector("#lua-guide-categories");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    categoryBar.innerHTML = categories.map((category) => `
      <button type="button" class="${category.id === activeCategory ? "active" : ""}" data-category="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>
    `).join("");
    const items = guideItems.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const queryMatch = `${item.name} ${item.description} ${categoryLabel(item.category)}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });
    list.innerHTML = items.map((item) => `
      <article class="lua-guide-item">
        <div class="lua-guide-item-head">
          <code>${escapeHtml(item.name)}</code>
          <span class="lua-guide-category">${escapeHtml(categoryLabel(item.category))}</span>
        </div>
        <p>${escapeHtml(item.description)}</p>
      </article>`).join("");
  };
  search.addEventListener("input", render);
  categoryBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category || "all";
    render();
  });
  backdrop.querySelector("#lua-guide-close").addEventListener("click", () => closeModal(backdrop));
  render();
  search.focus();
}

function buildLuaTemplatePreviewCode(template, options) {
  const snippet = template.build(options);
  return buildDefaultLuaScriptApp().replace(LUA_PAGE_INSERT_MARKER, `${snippet}\ncurrentPage = #pages\n${LUA_PAGE_INSERT_MARKER}`);
}

function buildLuaPagePreviewCode(baseCode, page, draft = {}) {
  const newBlock = updateLuaPageBlock(page.block, {
    name: draft.name,
    items: draft.items,
    targets: draft.targets,
    type: page.type,
    titleText: draft.titleText,
    subtitleText: draft.subtitleText,
    buttonText: draft.buttonText,
    backgroundColor: draft.backgroundColor,
    textColor: draft.textColor,
    buttonColor: draft.buttonColor,
    popupWidth: draft.popupWidth,
    popupHeight: draft.popupHeight,
    formFields: draft.formFields,
    formButtons: draft.formButtons,
    visualActions: draft.visualActions,
  });
  return `${baseCode.slice(0, page.start)}${newBlock}${baseCode.slice(page.end)}\ncurrentPage = ${page.index}\n`;
}

async function renderLuaSnapshotToCanvas(code, canvas, item = null) {
  const ctx = canvas.getContext("2d");
  const logSink = { textContent: "", scrollTop: 0, scrollHeight: 0 };
  const symbols = item ? await loadLuaPreviewSymbols(item, code).catch(() => ({})) : {};
  let runtime = null;
  try {
    runtime = await createLuaJsPreviewRuntime(code, ctx, canvas, logSink, symbols);
    runtime.boot();
    runtime.close();
    return true;
  } catch (_error) {
    try {
      runtime?.close?.();
    } catch (__error) {
      // Ignore preview cleanup failures; the caller will keep the fallback canvas.
    }
    return false;
  }
}

function drawLuaTemplatePreview(canvas, template, options = template.defaults) {
  const ctx = canvas.getContext("2d");
  const scale = canvas.width / 318;
  const sx = (value) => value * scale;
  const sy = (value) => value * (canvas.height / 212);
  const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor);
  const [bgR, bgG, bgB] = luaRgbFromHex(options.backgroundColor, template.id === "popup" ? [238, 238, 238] : template.id === "form" ? [224, 224, 224] : [255, 255, 255]);
  const [textR, textG, textB] = luaRgbFromHex(options.textColor, [0, 0, 0]);
  const textColor = `rgb(${textR}, ${textG}, ${textB})`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = Math.max(1, scale);
  ctx.font = `${Math.max(8, sy(10))}px sans-serif`;

  const drawInput = (label, y, active = false) => {
    ctx.fillStyle = textColor;
    ctx.fillText(label, sx(14), sy(y + 14));
    ctx.fillText(":", sx(70), sy(y + 14));
    ctx.fillStyle = "#fff";
    ctx.fillRect(sx(82), sy(y), sx(158), sy(22));
    ctx.strokeStyle = active ? `rgb(${primaryR}, ${primaryG}, ${primaryB})` : "#808080";
    ctx.strokeRect(sx(82), sy(y), sx(158), sy(22));
  };

  if (template.id === "form") {
    const buttonY = options.buttonPosition === "top" ? 26 : 188;
    const barY = options.buttonPosition === "top" ? 58 : 180;
    const rowStart = options.buttonPosition === "top" ? 76 : 42;
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.max(8, sy(10))}px sans-serif`;
    ctx.fillText(options.title || template.defaults.title, sx(8), sy(20));
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    const count = Math.max(1, Math.min(4, Number(options.inputCount) || template.defaults.inputCount));
    for (let index = 0; index < count; index += 1) drawInput(options.fieldLabels?.[index] || String.fromCharCode(97 + index), rowStart + index * 28, index === 0);
    ctx.fillStyle = "#808080";
    ctx.fillRect(sx(8), sy(barY), sx(304), Math.max(1, sy(2)));
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = textColor;
    if (options.showBackButton !== false) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(8), sy(buttonY), sx(70), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(8), sy(buttonY), sx(70), sy(24));
      ctx.fillStyle = textColor;
      ctx.fillText("Retour", sx(16), sy(buttonY + 17));
    }
    if (options.showPrimaryButton !== false) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(112), sy(buttonY), sx(80), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(112), sy(buttonY), sx(80), sy(24));
      ctx.strokeStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
      ctx.strokeRect(sx(110), sy(buttonY - 2), sx(84), sy(28));
      ctx.fillStyle = textColor;
      const label = options.buttonText || template.defaults.buttonText;
      ctx.fillText(label, sx(112 + (80 - ctx.measureText(label).width / scale) / 2), sy(buttonY + 17));
    }
    if (options.showDetailsButton !== false) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(240), sy(buttonY), sx(70), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(240), sy(buttonY), sx(70), sy(24));
      ctx.fillStyle = textColor;
      ctx.fillText("Detalles", sx(248), sy(buttonY + 17));
    }
    return;
  }

  if (template.id === "menu") {
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
    ctx.font = `bold ${Math.max(9, sy(12))}px sans-serif`;
    ctx.fillText(options.title || template.defaults.title, sx(92), sy(22));
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    const count = Math.max(2, Math.min(6, Number(options.inputCount) || template.defaults.inputCount));
    for (let index = 0; index < count; index += 1) {
      const y = 44 + index * 24;
      if (index === 0) {
        ctx.fillStyle = "#dcdcdc";
        ctx.fillRect(sx(18), sy(y - 2), sx(150), sy(20));
      }
      ctx.fillStyle = textColor;
      ctx.fillText(options.menuLabels?.[index] || `${index + 1}) Opcion ${index + 1} >`, sx(28), sy(y + 12));
    }
    if (options.showBackButton === true) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(8), sy(184), sx(72), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(8), sy(184), sx(72), sy(24));
      ctx.fillStyle = textColor;
      ctx.fillText(options.backButtonText || "Retour", sx(16), sy(201));
    }
    return;
  }

  if (template.id === "probas-menu") {
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${Math.max(10, sy(16))}px sans-serif`;
    ctx.fillStyle = "#fa0000";
    ctx.fillText(options.title || template.defaults.title, sx(5), sy(16));
    ctx.font = `${Math.max(7, sy(7))}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(options.subtitle || template.defaults.subtitle, sx(150), sy(17));
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(sx(8), sy(28), sx(300), sy(140));
    ctx.font = `${Math.max(8, sy(9))}px sans-serif`;
    const count = Math.max(2, Math.min(7, Number(options.inputCount) || template.defaults.inputCount));
    for (let index = 0; index < count; index += 1) {
      const y = 30 + index * 18;
      if (index === 0) {
        ctx.fillStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
        ctx.fillRect(sx(10), sy(y), sx(286), sy(18));
        ctx.fillStyle = "#fff";
      } else {
        ctx.fillStyle = textColor;
      }
      ctx.fillText(options.menuLabels?.[index] || template.defaults.menuLabels?.[index] || `Opcion ${index + 1}`, sx(12), sy(y + 13));
    }
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(sx(292), sy(36), sx(8), sy(112));
    if (options.showBackButton === true) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(8), sy(184), sx(72), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(8), sy(184), sx(72), sy(24));
      ctx.fillStyle = textColor;
      ctx.fillText(options.backButtonText || "Retour", sx(16), sy(201));
    }
    return;
  }

  if (template.id === "popup") {
    const boxW = Math.max(72, Math.min(240, Number(options.popupWidth) || 112));
    const boxH = Math.max(42, Math.min(150, Number(options.popupHeight) || 58));
    const boxX = (318 - boxW) / 2;
    const boxY = (212 - boxH) / 2;
    const buttonW = 54;
    const buttonH = 24;
    const buttonX = boxX + (boxW - buttonW) / 2;
    const buttonY = boxY + boxH - buttonH - 8;
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fillRect(sx(boxX + 6), sy(boxY + 6), sx(boxW), sy(boxH));
    ctx.fillStyle = "#fff";
    ctx.fillRect(sx(boxX), sy(boxY), sx(boxW), sy(boxH));
    ctx.fillStyle = textColor;
    ctx.fillText(options.title || template.defaults.title, sx(boxX + 8), sy(boxY + 20));
    ctx.fillStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
    ctx.fillRect(sx(buttonX), sy(buttonY), sx(buttonW), sy(buttonH));
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    const buttonText = options.buttonText || template.defaults.buttonText;
    ctx.fillText(buttonText, sx(buttonX + (buttonW - ctx.measureText(buttonText).width / scale) / 2), sy(buttonY + 16));
    return;
  }

  const detailButtonY = options.buttonPosition === "top" ? 8 : 186;
  const detailBarY = options.buttonPosition === "top" ? 36 : 176;
  ctx.fillStyle = "#000";
  const count = Math.max(1, Math.min(4, Number(options.inputCount) || template.defaults.inputCount));
  for (let index = 0; index < count; index += 1) drawInput(String.fromCharCode(97 + index), 30 + index * 28, index === 0);
  ctx.fillStyle = "#808080";
  ctx.fillRect(sx(8), sy(detailBarY), sx(304), Math.max(1, sy(2)));
  ctx.fillStyle = "#fff";
  ctx.fillRect(sx(238), sy(detailButtonY), sx(72), sy(24));
  ctx.strokeStyle = "#808080";
  ctx.strokeRect(sx(238), sy(detailButtonY), sx(72), sy(24));
  ctx.fillStyle = "#000";
  ctx.font = `bold ${Math.max(8, sy(10))}px sans-serif`;
  ctx.fillText(options.buttonText || template.defaults.buttonText, sx(246), sy(detailButtonY + 16));
}

function drawLuaPagePreview(canvas, page, draft = {}) {
  if (page.type === "form") {
    drawLuaTemplatePreview(canvas, LUA_TEMPLATE_PRESETS.find((template) => template.id === "form"), {
      title: draft.titleText || draft.name || page.name,
      inputCount: page.inputCount || 3,
      buttonText: draft.buttonText || page.buttonText || "Calcular",
      primaryColor: draft.buttonColor || page.buttonColor || "#2563eb",
      backgroundColor: draft.backgroundColor || page.backgroundColor || "#e0e0e0",
      textColor: draft.textColor || page.textColor || "#000000",
      buttonPosition: page.buttonPosition || "bottom",
      fieldLabels: (draft.formFields?.length ? draft.formFields : page.formFields || []).map((field) => field.label),
      showPrimaryButton: true,
      showDetailsButton: true,
      showBackButton: true,
    });
    return;
  }
  if (page.type === "popup") {
    drawLuaTemplatePreview(canvas, LUA_TEMPLATE_PRESETS.find((template) => template.id === "popup"), {
      title: draft.titleText || draft.name || page.name,
      buttonText: draft.buttonText || page.buttonText || "OK",
      primaryColor: draft.buttonColor || page.buttonColor || "#a3e635",
      backgroundColor: draft.backgroundColor || page.backgroundColor || "#eeeeee",
      textColor: draft.textColor || page.textColor || "#000000",
      popupWidth: draft.popupWidth || page.popupWidth || 112,
      popupHeight: draft.popupHeight || page.popupHeight || 58,
    });
    return;
  }
  if (page.type === "menu") {
    drawLuaTemplatePreview(canvas, LUA_TEMPLATE_PRESETS.find((template) => template.id === "menu"), {
      title: draft.titleText || draft.name || page.name,
      inputCount: Math.max(2, page.items.length || 4),
      primaryColor: draft.buttonColor || page.buttonColor || "#a3e635",
      backgroundColor: draft.backgroundColor || page.backgroundColor || "#ffffff",
      textColor: draft.textColor || page.textColor || "#000000",
      menuLabels: draft.items?.length ? draft.items : page.items,
    });
    return;
  }
  if (page.type === "probas-menu") {
    drawLuaTemplatePreview(canvas, LUA_TEMPLATE_PRESETS.find((template) => template.id === "probas-menu"), {
      title: draft.titleText || draft.name || page.name,
      subtitle: draft.subtitleText || page.subtitleText,
      inputCount: Math.max(2, page.items.length || 4),
      primaryColor: draft.buttonColor || page.buttonColor || "#3196be",
      backgroundColor: draft.backgroundColor || page.backgroundColor || "#ffffff",
      textColor: draft.textColor || page.textColor || "#000000",
      menuLabels: draft.items?.length ? draft.items : page.items,
    });
    return;
  }
  const ctx = canvas.getContext("2d");
  const scale = canvas.width / 318;
  const syScale = canvas.height / 212;
  const sx = (value) => value * scale;
  const sy = (value) => value * syScale;
  const bg = luaRgbFromHex(draft.backgroundColor || page.backgroundColor || "#f5f5f5", [245, 245, 245]);
  const text = luaRgbFromHex(draft.textColor || page.textColor || "#000000", [0, 0, 0]);
  const button = luaRgbFromHex(draft.buttonColor || page.buttonColor || "#2d93ad", [45, 147, 173]);
  const textColor = `rgb(${text[0]}, ${text[1]}, ${text[2]})`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (page.index === 1 && page.titleText) {
    const title = draft.titleText ?? page.titleText;
    const subtitle = draft.subtitleText ?? page.subtitleText;
    const buttonText = draft.buttonText ?? page.buttonText;
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.max(16, sy(22))}px sans-serif`;
    ctx.fillText(title, (canvas.width - ctx.measureText(title).width) / 2, sy(90));
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    ctx.fillText(subtitle, (canvas.width - ctx.measureText(subtitle).width) / 2, sy(108));
    ctx.fillStyle = `rgb(${button[0]}, ${button[1]}, ${button[2]})`;
    ctx.fillRect(sx(99), sy(160), sx(120), sy(28));
    ctx.fillStyle = "#fff";
    ctx.fillText(buttonText, (canvas.width - ctx.measureText(buttonText).width) / 2, sy(178));
    return;
  }

  if (page.items.length) {
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.max(9, sy(12))}px sans-serif`;
    ctx.fillText(draft.name || page.name, sx(92), sy(22));
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    const items = draft.items?.length ? draft.items : page.items;
    items.forEach((item, index) => {
      const y = 44 + index * 24;
      if (index === 0) {
        ctx.fillStyle = "rgba(0,0,0,.14)";
        ctx.fillRect(sx(18), sy(y - 2), sx(150), sy(20));
      }
      ctx.fillStyle = textColor;
      ctx.fillText(item, sx(28), sy(y + 12));
    });
    return;
  }

  ctx.fillStyle = textColor;
  ctx.font = `bold ${Math.max(12, sy(14))}px sans-serif`;
  ctx.fillText(draft.name || page.name, sx(12), sy(24));
  ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
  ctx.fillText("Preview visual disponible para paginas generadas por plantillas.", sx(12), sy(52));
}

function showLuaTemplates(editor) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const visibleTemplates = LUA_TEMPLATE_PRESETS.filter((template) => template.id !== "details");
  const templateTabs = visibleTemplates.map((template) => `
    <button type="button" class="lua-template-type" data-template="${escapeHtml(template.id)}">
      <span class="template-type-icon">${template.id === "form" ? "▦" : template.id === "menu" ? "☷" : template.id === "popup" ? "▣" : "▤"}</span>
      <strong>${escapeHtml(template.name)}</strong>
    </button>`).join("");
  backdrop.innerHTML = `
    <div class="modal lua-library-modal lua-template-builder-modal">
      <div class="modal-top-actions">
        <button type="button" id="lua-template-close-top">${escapeHtml(t("cancel"))}</button>
        <button type="button" id="lua-template-insert-top" class="green-tool-button">${escapeHtml(t("luaInsertTemplate"))}</button>
      </div>
      <h2>${escapeHtml(t("luaTemplates"))}</h2>
      <p class="muted-copy">${escapeHtml(t("luaTemplatesIntro"))}</p>
      <div class="lua-template-builder">
        <section class="template-column template-type-column">
          <h3>${escapeHtml(t("luaTemplateType"))}</h3>
          <div class="template-type-list">${templateTabs}</div>
        </section>
        <section class="template-column template-options-column">
          <h3>${escapeHtml(t("luaTemplateOptions"))}</h3>
          <div class="template-option-grid">
            <label>${escapeHtml(t("luaInputCount"))}<input id="tpl-input-count" type="number" min="1" max="10" value="3"></label>
            <label>${escapeHtml(t("luaTemplateTitle"))}<input id="tpl-title" value="Formulario"></label>
            <label id="tpl-subtitle-label" class="hidden">${escapeHtml(t("luaPageSubtitle"))}<input id="tpl-subtitle"></label>
            <label>${escapeHtml(t("luaButtonText"))}<input id="tpl-button" value="Calcular"></label>
            <label>${escapeHtml(t("luaVariableBase"))}<input id="tpl-varbase" value="var"></label>
            <label>${escapeHtml(t("luaButtonAction"))}
              <select id="tpl-action">
                <option value="next">${escapeHtml(t("luaActionNext"))}</option>
                <option value="details">${escapeHtml(t("luaActionDetails"))}</option>
                <option value="home">${escapeHtml(t("luaActionHome"))}</option>
                <option value="back">${escapeHtml(t("luaActionBack"))}</option>
                <option value="none">${escapeHtml(t("luaActionNone"))}</option>
              </select>
            </label>
            <label>${escapeHtml(t("luaButtonPosition"))}
              <select id="tpl-position">
                <option value="bottom">${escapeHtml(t("luaBottom"))}</option>
                <option value="top">${escapeHtml(t("luaTop"))}</option>
              </select>
            </label>
            <label>${escapeHtml(t("luaPrimaryColor"))}<input id="tpl-color" type="color" value="#a3e635"></label>
            <label>${escapeHtml(t("luaBackgroundColor"))}<input id="tpl-bg-color" type="color" value="#e0e0e0"></label>
            <label>${escapeHtml(t("luaTextColor"))}<input id="tpl-text-color" type="color" value="#000000"></label>
            <label class="popup-only hidden">${escapeHtml(t("luaPopupWidth"))}<input id="tpl-popup-width" type="number" min="72" max="240" value="112"></label>
            <label class="popup-only hidden">${escapeHtml(t("luaPopupHeight"))}<input id="tpl-popup-height" type="number" min="42" max="150" value="58"></label>
          </div>
          <div class="template-option-grid nav-button-options">
            <label>Texto Retour<input id="tpl-back-button" value="◀ Retour"></label>
            <label>Accion Retour
              <select id="tpl-back-action">
                <option value="home">${escapeHtml(t("luaActionHome"))}</option>
                <option value="back">${escapeHtml(t("luaActionBack"))}</option>
                <option value="next">${escapeHtml(t("luaActionNext"))}</option>
                <option value="none">${escapeHtml(t("luaActionNone"))}</option>
              </select>
            </label>
            <label class="form-only">Texto Detalles<input id="tpl-details-button" value="Detalles"></label>
            <label class="form-only">Accion Detalles
              <select id="tpl-details-action">
                <option value="details">${escapeHtml(t("luaActionDetails"))}</option>
                <option value="next">${escapeHtml(t("luaActionNext"))}</option>
                <option value="home">${escapeHtml(t("luaActionHome"))}</option>
                <option value="back">${escapeHtml(t("luaActionBack"))}</option>
                <option value="none">${escapeHtml(t("luaActionNone"))}</option>
              </select>
            </label>
          </div>
          <div class="template-checks">
            <label class="template-check"><input id="tpl-use-theme" type="checkbox"> ${escapeHtml(t("luaUseThemeColor"))}</label>
            <label class="template-check form-only"><input id="tpl-show-primary" type="checkbox"> ${escapeHtml(t("luaShowPrimaryButton"))}</label>
            <label class="template-check form-only"><input id="tpl-show-details" type="checkbox"> ${escapeHtml(t("luaShowDetailsButton"))}</label>
            <label class="template-check nav-button-check"><input id="tpl-show-back" type="checkbox"> ${escapeHtml(t("luaShowBackButton"))}</label>
          </div>
          <div id="tpl-menu-routes-wrap" class="menu-route-editor hidden">
            <h4>${escapeHtml(t("luaMenuRoutes"))}</h4>
            <div id="tpl-menu-routes"></div>
          </div>
          <div id="tpl-bindings-wrap" class="menu-route-editor form-only">
            <h4>${escapeHtml(t("luaVariableBinding"))}</h4>
            <div id="tpl-bindings"></div>
          </div>
          <div id="tpl-actions-wrap" class="menu-route-editor">
            <h4>${escapeHtml(t("luaButtonActions") || "Acciones")} (${escapeHtml(t("luaButtonText"))})</h4>
            <datalist id="tpl-condition-suggestions"></datalist>
            <datalist id="tpl-calculation-suggestions"></datalist>
            <label>${escapeHtml(t("luaActionCondition"))}<input id="tpl-action-condition" list="tpl-condition-suggestions" placeholder="t~=0"></label>
            <label>${escapeHtml(t("luaActionExpression"))}<input id="tpl-action-expression" list="tpl-calculation-suggestions" placeholder="d/t"></label>
            <label>${escapeHtml(t("luaActionTargetVariable"))}<select id="tpl-action-target"></select></label>
          </div>
        </section>
        <section class="template-column template-preview-column">
          <h3>${escapeHtml(t("luaTemplatePreview"))}</h3>
          <div class="template-preview-stage">
            <canvas id="tpl-main-preview" class="template-preview-canvas" width="318" height="212" aria-hidden="true"></canvas>
          </div>
          <div class="generated-code-header">
            <h3>${escapeHtml(t("luaGeneratedCode"))}</h3>
            <button type="button" id="lua-template-copy-code">${escapeHtml(t("luaCopyCode"))}</button>
          </div>
          <pre id="lua-template-code" class="lua-template-code"></pre>
        </section>
      </div>
    </div>`;
  document.body.append(backdrop);
  let selected = visibleTemplates[0];
  const existingPages = extractLuaPageOptions(editor.value);
  const variableCatalog = collectLoadedTnsVariables(editor.value);
  const logicCatalog = collectLoadedTnsLogic(editor.value);
  const themeColor = "#a3e635";
  const routeWrap = backdrop.querySelector("#tpl-menu-routes-wrap");
  const routeList = backdrop.querySelector("#tpl-menu-routes");
  const bindingsList = backdrop.querySelector("#tpl-bindings");
  const actionTarget = backdrop.querySelector("#tpl-action-target");
  const applyDefaults = () => {
    backdrop.querySelector("#tpl-input-count").value = selected.defaults.inputCount;
    backdrop.querySelector("#tpl-title").value = selected.defaults.title;
    backdrop.querySelector("#tpl-subtitle").value = selected.defaults.subtitle || "";
    backdrop.querySelector("#tpl-button").value = selected.defaults.buttonText;
    backdrop.querySelector("#tpl-color").value = selected.defaults.primaryColor;
    backdrop.querySelector("#tpl-bg-color").value = selected.defaults.backgroundColor || "#e0e0e0";
    backdrop.querySelector("#tpl-text-color").value = selected.defaults.textColor || "#000000";
    backdrop.querySelector("#tpl-use-theme").checked = selected.defaults.useThemeColor !== false;
    backdrop.querySelector("#tpl-action").value = selected.defaults.action || "next";
    backdrop.querySelector("#tpl-back-button").value = selected.defaults.backButtonText || "◀ Retour";
    backdrop.querySelector("#tpl-back-action").value = selected.defaults.backButtonAction || "home";
    backdrop.querySelector("#tpl-details-button").value = selected.defaults.detailsButtonText || "Detalles";
    backdrop.querySelector("#tpl-details-action").value = selected.defaults.detailsButtonAction || "details";
    backdrop.querySelector("#tpl-varbase").value = selected.defaults.variableBase || "var";
    backdrop.querySelector("#tpl-position").value = selected.defaults.buttonPosition || "bottom";
    backdrop.querySelector("#tpl-show-primary").checked = selected.defaults.showPrimaryButton !== false;
    backdrop.querySelector("#tpl-show-details").checked = selected.defaults.showDetailsButton !== false;
    backdrop.querySelector("#tpl-show-back").checked = selected.defaults.showBackButton !== false;
    backdrop.querySelector("#tpl-popup-width").value = selected.defaults.popupWidth || 112;
    backdrop.querySelector("#tpl-popup-height").value = selected.defaults.popupHeight || 58;
    backdrop.querySelector("#tpl-action-condition").value = "";
    backdrop.querySelector("#tpl-action-expression").value = "";
    actionTarget.innerHTML = variableSelectOptions(variableCatalog);
    renderRouteEditor();
    renderBindingEditor();
    updateActionSuggestions();
  };
  const markSelected = () => {
    for (const button of backdrop.querySelectorAll(".lua-template-type")) {
      button.classList.toggle("selected", button.dataset.template === selected.id);
    }
    backdrop.querySelectorAll(".form-only").forEach((element) => element.classList.toggle("hidden", selected.id !== "form"));
    backdrop.querySelectorAll(".popup-only").forEach((element) => element.classList.toggle("hidden", selected.id !== "popup"));
    backdrop.querySelectorAll(".nav-button-options").forEach((element) => element.classList.toggle("hidden", !["form", "menu", "probas-menu"].includes(selected.id)));
    backdrop.querySelectorAll(".nav-button-check").forEach((element) => element.classList.toggle("hidden", !["form", "menu", "probas-menu"].includes(selected.id)));
    backdrop.querySelector("#tpl-subtitle-label").classList.toggle("hidden", !selected.defaults.subtitle);
    routeWrap.classList.toggle("hidden", !["menu", "probas-menu"].includes(selected.id));
  };
  const renderRouteEditor = () => {
    if (!routeList) return;
    const count = Math.max(2, Math.min(10, Number(backdrop.querySelector("#tpl-input-count")?.value) || selected.defaults.inputCount || 4));
    routeList.innerHTML = Array.from({ length: count }, (_, index) => {
      const routeOptions = [`<option value="0">${escapeHtml(t("luaRouteDefault"))}</option>`]
        .concat(existingPages.map((page) => `<option value="${page.index}">${escapeHtml(`${page.index}. ${page.name}`)}</option>`))
        .join("");
      const defaultLabel = selected.defaults.menuLabels?.[index] || `${index + 1}) Opcion ${index + 1} >`;
      return `<div class="menu-route-row">
        <label>${escapeHtml(t("luaMenuOption"))} ${index + 1}<input data-menu-label="${index}" value="${escapeHtml(defaultLabel)}"></label>
        <label>${escapeHtml(t("luaButtonAction"))}<select data-menu-target="${index}">${routeOptions}</select></label>
      </div>`;
    }).join("");
    for (const input of routeList.querySelectorAll("input, select")) {
      input.addEventListener("input", renderBuilder);
      input.addEventListener("change", renderBuilder);
    }
  };
  const renderBindingEditor = () => {
    if (!bindingsList) return;
    const count = Math.max(1, Math.min(8, Number(backdrop.querySelector("#tpl-input-count")?.value) || selected.defaults.inputCount || 3));
    bindingsList.innerHTML = Array.from({ length: count }, (_, index) => {
      const label = String.fromCharCode(97 + index);
      return `<div class="template-binding-row">
        <input data-field-label="${index}" value="${escapeHtml(label)}" aria-label="Nombre del input ${index + 1}">
        <select data-field-binding="${index}">${variableSelectOptions(variableCatalog)}</select>
      </div>`;
    }).join("");
    for (const input of bindingsList.querySelectorAll("input, select")) {
      input.addEventListener("input", renderBuilder);
      input.addEventListener("change", renderBuilder);
    }
  };
  const currentOptions = () => ({
    inputCount: backdrop.querySelector("#tpl-input-count").value,
    title: backdrop.querySelector("#tpl-title").value || selected.defaults.title,
    subtitle: backdrop.querySelector("#tpl-subtitle").value || selected.defaults.subtitle || "",
    buttonText: backdrop.querySelector("#tpl-button").value || selected.defaults.buttonText,
    backButtonText: backdrop.querySelector("#tpl-back-button").value || "◀ Retour",
    detailsButtonText: backdrop.querySelector("#tpl-details-button").value || "Detalles",
    primaryButtonAction: backdrop.querySelector("#tpl-action").value || selected.defaults.action || "next",
    backButtonAction: backdrop.querySelector("#tpl-back-action").value || selected.defaults.backButtonAction || "home",
    detailsButtonAction: backdrop.querySelector("#tpl-details-action").value || "details",
    primaryColor: backdrop.querySelector("#tpl-use-theme").checked ? themeColor : (backdrop.querySelector("#tpl-color").value || selected.defaults.primaryColor),
    backgroundColor: backdrop.querySelector("#tpl-bg-color").value || selected.defaults.backgroundColor || "#e0e0e0",
    textColor: backdrop.querySelector("#tpl-text-color").value || selected.defaults.textColor || "#000000",
    useThemeColor: backdrop.querySelector("#tpl-use-theme").checked,
    action: backdrop.querySelector("#tpl-action").value || selected.defaults.action || "next",
    variableBase: backdrop.querySelector("#tpl-varbase").value || selected.defaults.variableBase || "var",
    buttonPosition: backdrop.querySelector("#tpl-position").value || selected.defaults.buttonPosition || "bottom",
    showPrimaryButton: backdrop.querySelector("#tpl-show-primary").checked,
    showDetailsButton: backdrop.querySelector("#tpl-show-details").checked,
    showBackButton: backdrop.querySelector("#tpl-show-back").checked,
    popupWidth: backdrop.querySelector("#tpl-popup-width").value,
    popupHeight: backdrop.querySelector("#tpl-popup-height").value,
    fieldLabels: Array.from(bindingsList.querySelectorAll("[data-field-label]")).map((input) => input.value || "var"),
    fieldBindings: Array.from(bindingsList.querySelectorAll("[data-field-binding]")).map((select) => select.value),
    buttonActions: backdrop.querySelector("#tpl-action-expression").value || backdrop.querySelector("#tpl-action-target").value ? [{
      type: "calc",
      condition: backdrop.querySelector("#tpl-action-condition").value,
      expression: backdrop.querySelector("#tpl-action-expression").value,
      target: backdrop.querySelector("#tpl-action-target").value,
      strictCondition: false,
      details: "",
    }] : [],
    menuLabels: Array.from(routeList.querySelectorAll("[data-menu-label]")).map((input) => input.value),
    menuTargets: Array.from(routeList.querySelectorAll("[data-menu-target]")).map((input) => input.value),
  });
  let templatePreviewSeq = 0;
  const renderBuilder = () => {
    const options = currentOptions();
    updateActionSuggestions();
    backdrop.querySelector("#tpl-color").disabled = options.useThemeColor;
    const canvas = backdrop.querySelector("#tpl-main-preview");
    const seq = ++templatePreviewSeq;
    drawLuaTemplatePreview(canvas, selected, options);
    renderLuaSnapshotToCanvas(buildLuaTemplatePreviewCode(selected, options), canvas).then((ok) => {
      if (!ok || seq !== templatePreviewSeq) drawLuaTemplatePreview(canvas, selected, options);
    });
    backdrop.querySelector("#lua-template-code").textContent = selected.build(options);
  };
  const syncCalculationTarget = () => {
    const expression = backdrop.querySelector("#tpl-action-expression").value.trim();
    const match = logicCatalog.calculations.find((calc) => calc.expression === expression);
    if (match?.target) {
      backdrop.querySelector("#tpl-action-target").value = match.target;
    }
  };
  function currentRelevantVariableNames() {
    const names = new Set();
    for (const select of bindingsList.querySelectorAll("[data-field-binding]")) {
      if (select.value) names.add(select.value);
    }
    const expression = backdrop.querySelector("#tpl-action-expression")?.value || "";
    for (const name of extractTiExpressionNames(expression)) names.add(name);
    const target = backdrop.querySelector("#tpl-action-target")?.value || "";
    if (target) names.add(target);
    return names;
  }
  function updateActionSuggestions() {
    const conditionList = backdrop.querySelector("#tpl-condition-suggestions");
    const calculationList = backdrop.querySelector("#tpl-calculation-suggestions");
    if (!conditionList || !calculationList) return;
    const relevant = currentRelevantVariableNames();
    const matchesRelevant = (text) => {
      if (!relevant.size) return true;
      return extractTiExpressionNames(text).some((name) => relevant.has(name));
    };
    const relevantCalculations = logicCatalog.calculations.filter((calc) => matchesRelevant(calc.expression) || relevant.has(calc.target));
    const calculations = relevantCalculations.length ? relevantCalculations : logicCatalog.calculations;
    calculationList.innerHTML = calculations
      .map((calc) => `<option value="${escapeHtml(calc.expression)}" label="${escapeHtml(calc.label)}"></option>`)
      .join("");
    const seen = new Set();
    const conditionOptions = [];
    for (const condition of logicCatalog.conditions) {
      if (!matchesRelevant(condition)) continue;
      const inverse = invertTiCondition(condition);
      for (const value of [inverse, condition].filter(Boolean)) {
        if (seen.has(value)) continue;
        seen.add(value);
        conditionOptions.push(`<option value="${escapeHtml(value)}" label="${escapeHtml(inverse === value ? `OK si no ocurre: ${condition}` : condition)}"></option>`);
      }
    }
    const fallbackConditions = conditionOptions.length ? conditionOptions : logicCatalog.conditions
      .map((condition) => `<option value="${escapeHtml(condition)}"></option>`);
    conditionList.innerHTML = fallbackConditions.join("");
  }
  for (const button of backdrop.querySelectorAll(".lua-template-type")) {
    button.addEventListener("click", () => {
      selected = visibleTemplates.find((template) => template.id === button.dataset.template) || selected;
      applyDefaults();
      markSelected();
      renderBuilder();
    });
  }
  for (const input of backdrop.querySelectorAll(".template-options-column input, .template-options-column select")) {
    input.addEventListener("input", () => {
      if (input.id === "tpl-action-expression") syncCalculationTarget();
      if (input.id === "tpl-input-count" && ["menu", "probas-menu"].includes(selected.id)) renderRouteEditor();
      if (input.id === "tpl-input-count" && selected.id === "form") renderBindingEditor();
      renderBuilder();
    });
    input.addEventListener("change", () => {
      if (input.id === "tpl-action-expression") syncCalculationTarget();
      if (input.id === "tpl-input-count" && ["menu", "probas-menu"].includes(selected.id)) renderRouteEditor();
      if (input.id === "tpl-input-count" && selected.id === "form") renderBindingEditor();
      renderBuilder();
    });
  }
  backdrop.querySelector("#lua-template-close-top").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#lua-template-copy-code").addEventListener("click", async () => {
    const code = backdrop.querySelector("#lua-template-code").textContent || "";
    await navigator.clipboard?.writeText(code).catch(() => {});
  });
  const insertCurrentTemplate = () => {
    insertLuaTemplate(editor, selected.build(currentOptions()));
    closeModal(backdrop);
  };
  backdrop.querySelector("#lua-template-insert-top").addEventListener("click", insertCurrentTemplate);
  applyDefaults();
  markSelected();
  renderBuilder();
}

function showLuaPageEditor(editor) {
  const pages = findLuaPageBlocks(editor.value);
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  if (!pages.length) {
    backdrop.innerHTML = `
      <div class="modal lua-library-modal">
        <h2>${escapeHtml(t("luaPageEditor"))}</h2>
        <p class="muted-copy">${escapeHtml(t("noEditablePrograms"))}</p>
        <div class="modal-actions"><button type="button" id="lua-page-close">${escapeHtml(t("close"))}</button></div>
      </div>`;
    document.body.append(backdrop);
    backdrop.querySelector("#lua-page-close").addEventListener("click", () => closeModal(backdrop));
    return;
  }
  const pageOptions = pages.map((page) => `
    <button type="button" class="file-menu-action" data-page-option="${page.index - 1}">
      ${escapeHtml(`${page.index}. ${page.name}`)}
    </button>`).join("");
  backdrop.innerHTML = `
    <div class="modal lua-library-modal lua-page-editor-modal">
      <div class="modal-top-actions">
        <button type="button" id="lua-page-close-top">${escapeHtml(t("cancel"))}</button>
        <button type="button" id="lua-page-apply-top" class="green-tool-button">${escapeHtml(t("luaApplyPageEdits"))}</button>
      </div>
      <h2>${escapeHtml(t("luaPageEditor"))}</h2>
      <p class="muted-copy">${escapeHtml(t("luaPageEditorIntro"))}</p>
      <div class="lua-page-editor-grid">
        <aside class="template-column page-editor-list">
          <h3>${escapeHtml(t("luaPageName"))}</h3>
          <div id="lua-page-picker" class="tool-menu page-picker">
            <button type="button" id="lua-page-picker-trigger" class="menu-trigger green-menu-trigger">
              ${escapeHtml(`1. ${pages[0].name}`)}
            </button>
            <div class="menu-panel page-picker-panel">${pageOptions}</div>
          </div>
        </aside>
        <section class="template-column template-options-column page-editor-panel">
          <h3>${escapeHtml(t("luaTemplateOptions"))}</h3>
          <label>${escapeHtml(t("luaPageName"))}<input id="lua-page-name"></label>
          <div id="lua-page-visual-editor" class="template-option-grid hidden">
            <label>${escapeHtml(t("luaTemplateTitle"))}<input id="lua-page-title"></label>
            <label id="lua-page-subtitle-label">${escapeHtml(t("luaPageSubtitle"))}<input id="lua-page-subtitle"></label>
            <label>${escapeHtml(t("luaPageButtonText"))}<input id="lua-page-button"></label>
            <label>${escapeHtml(t("luaBackgroundColor"))}<input id="lua-page-bg" type="color"></label>
            <label>${escapeHtml(t("luaTextColor"))}<input id="lua-page-text" type="color"></label>
            <label>${escapeHtml(t("luaPrimaryColor"))}<input id="lua-page-button-color" type="color"></label>
            <label class="lua-page-popup-only hidden">${escapeHtml(t("luaPopupWidth"))}<input id="lua-page-popup-width" type="number" min="72" max="240"></label>
            <label class="lua-page-popup-only hidden">${escapeHtml(t("luaPopupHeight"))}<input id="lua-page-popup-height" type="number" min="42" max="150"></label>
          </div>
          <div id="lua-page-menu-editor" class="menu-route-editor hidden">
            <h4>${escapeHtml(t("luaPageItems"))}</h4>
            <div id="lua-page-menu-items"></div>
          </div>
          <div id="lua-page-form-editor" class="menu-route-editor hidden">
            <h4>Campos del formulario</h4>
            <div id="lua-page-form-fields"></div>
            <h4>Botones</h4>
            <div id="lua-page-form-buttons"></div>
            <h4>${escapeHtml(t("luaButtonActions"))}</h4>
            <datalist id="page-condition-suggestions"></datalist>
            <datalist id="page-calculation-suggestions"></datalist>
            <label>${escapeHtml(t("luaActionCondition"))}<input id="lua-page-action-condition" list="page-condition-suggestions" placeholder="t~=0"></label>
            <label>${escapeHtml(t("luaActionExpression"))}<input id="lua-page-action-expression" list="page-calculation-suggestions" placeholder="d/t"></label>
            <label>${escapeHtml(t("luaActionTargetVariable"))}<select id="lua-page-action-target"></select></label>
            <label>Detalle / procedimiento<textarea id="lua-page-action-details" rows="5" placeholder="v=d/t&#10;v=[[d]] m/[[t]] s&#10;v=[[velocidad]] m/s"></textarea></label>
          </div>
        </section>
        <section class="template-column page-editor-preview">
          <h3>${escapeHtml(t("luaTemplatePreview"))}</h3>
          <div class="template-preview-stage">
            <canvas id="lua-page-preview" class="template-preview-canvas" width="318" height="212" aria-hidden="true"></canvas>
          </div>
        </section>
      </div>
    </div>`;
  document.body.append(backdrop);
  let selectedPageIndex = 0;
  const picker = backdrop.querySelector("#lua-page-picker");
  const pickerTrigger = backdrop.querySelector("#lua-page-picker-trigger");
  const nameInput = backdrop.querySelector("#lua-page-name");
  const visualWrap = backdrop.querySelector("#lua-page-visual-editor");
  const subtitleLabel = backdrop.querySelector("#lua-page-subtitle-label");
  const menuWrap = backdrop.querySelector("#lua-page-menu-editor");
  const menuItems = backdrop.querySelector("#lua-page-menu-items");
  const formWrap = backdrop.querySelector("#lua-page-form-editor");
  const formFields = backdrop.querySelector("#lua-page-form-fields");
  const formButtons = backdrop.querySelector("#lua-page-form-buttons");
  const previewCanvas = backdrop.querySelector("#lua-page-preview");
  const variableCatalog = collectLoadedTnsVariables(editor.value);
  const logicCatalog = collectLoadedTnsLogic(editor.value);
  const currentPageRelevantVariableNames = () => {
    const names = new Set();
    for (const select of formFields.querySelectorAll("[data-page-field-binding]")) {
      if (select.value) names.add(select.value);
    }
    const expression = backdrop.querySelector("#lua-page-action-expression")?.value || "";
    for (const name of extractTiExpressionNames(expression)) names.add(name);
    const target = backdrop.querySelector("#lua-page-action-target")?.value || "";
    if (target) names.add(target);
    return names;
  };
  const updatePageActionSuggestions = () => {
    const conditionList = backdrop.querySelector("#page-condition-suggestions");
    const calculationList = backdrop.querySelector("#page-calculation-suggestions");
    if (!conditionList || !calculationList) return;
    const relevant = currentPageRelevantVariableNames();
    const matchesRelevant = (text) => {
      if (!relevant.size) return true;
      return extractTiExpressionNames(text).some((name) => relevant.has(name));
    };
    const calculations = logicCatalog.calculations.filter((calc) => matchesRelevant(calc.expression) || relevant.has(calc.target));
    calculationList.innerHTML = (calculations.length ? calculations : logicCatalog.calculations)
      .map((calc) => `<option value="${escapeHtml(calc.expression)}" label="${escapeHtml(calc.label)}"></option>`)
      .join("");
    const seen = new Set();
    const options = [];
    for (const condition of logicCatalog.conditions) {
      if (!matchesRelevant(condition)) continue;
      for (const value of [invertTiCondition(condition), condition].filter(Boolean)) {
        if (seen.has(value)) continue;
        seen.add(value);
        options.push(`<option value="${escapeHtml(value)}"></option>`);
      }
    }
    conditionList.innerHTML = (options.length ? options : logicCatalog.conditions.map((condition) => `<option value="${escapeHtml(condition)}"></option>`)).join("");
  };
  const syncPageCalculationTarget = () => {
    const expression = backdrop.querySelector("#lua-page-action-expression")?.value.trim();
    const match = logicCatalog.calculations.find((calc) => calc.expression === expression);
    if (match?.target) backdrop.querySelector("#lua-page-action-target").value = match.target;
  };
  const draftForPage = (page) => {
    const draft = { name: nameInput.value };
    if (visualWrap && !visualWrap.classList.contains("hidden")) {
      draft.titleText = backdrop.querySelector("#lua-page-title").value;
      draft.subtitleText = backdrop.querySelector("#lua-page-subtitle").value;
      draft.buttonText = backdrop.querySelector("#lua-page-button").value;
      draft.backgroundColor = backdrop.querySelector("#lua-page-bg").value;
      draft.textColor = backdrop.querySelector("#lua-page-text").value;
      draft.buttonColor = backdrop.querySelector("#lua-page-button-color").value;
      draft.popupWidth = backdrop.querySelector("#lua-page-popup-width").value;
      draft.popupHeight = backdrop.querySelector("#lua-page-popup-height").value;
    }
    if (page.items.length) {
      draft.items = Array.from(menuItems.querySelectorAll("[data-page-item]")).map((input) => input.value);
      draft.targets = Array.from(menuItems.querySelectorAll("[data-page-target]")).map((input) => input.value);
    }
    if (page.type === "form") {
      draft.formFields = Array.from(formFields.querySelectorAll("[data-page-field-label]")).map((input, index) => ({
        ...(page.formFields[index] || {}),
        label: input.value || String.fromCharCode(97 + index),
        placeholder: input.value || String.fromCharCode(97 + index),
        bind: formFields.querySelector(`[data-page-field-binding="${index}"]`)?.value || "",
      }));
      draft.formButtons = { ...page.formButtons };
      for (const input of formButtons.querySelectorAll("[data-page-button-text]")) {
        const id = input.dataset.pageButtonText;
        draft.formButtons[id] = { ...(draft.formButtons[id] || {}), text: input.value };
      }
      const expression = backdrop.querySelector("#lua-page-action-expression").value;
      const target = backdrop.querySelector("#lua-page-action-target").value;
      const previousAction = page.visualActions?.[0] || {};
      draft.visualActions = expression || target ? [{
        type: "calc",
        condition: backdrop.querySelector("#lua-page-action-condition").value,
        expression,
        target,
        strictCondition: false,
        details: backdrop.querySelector("#lua-page-action-details").value || previousAction.details || "",
      }] : [];
    }
    return draft;
  };
  let pagePreviewSeq = 0;
  const renderPreview = () => {
    const page = pages[selectedPageIndex] || pages[0];
    const draft = draftForPage(page);
    const seq = ++pagePreviewSeq;
    const ctx = previewCanvas.getContext("2d");
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    renderLuaSnapshotToCanvas(buildLuaPagePreviewCode(editor.value, page, draft), previewCanvas).then((ok) => {
      if (seq !== pagePreviewSeq) return;
      if (!ok) drawLuaPagePreview(previewCanvas, page, draft);
    });
  };
  const render = () => {
    const page = pages[selectedPageIndex] || pages[0];
    pickerTrigger.textContent = `${page.index}. ${page.name}`;
    for (const button of backdrop.querySelectorAll("[data-page-option]")) {
      button.classList.toggle("active", Number(button.dataset.pageOption) === selectedPageIndex);
    }
    nameInput.value = page.name;
    const hasVisualOptions = ["start", "menu", "probas-menu", "popup", "form"].includes(page.type);
    visualWrap.classList.toggle("hidden", !hasVisualOptions);
    if (hasVisualOptions) {
      backdrop.querySelector("#lua-page-title").value = page.titleText || page.name;
      backdrop.querySelector("#lua-page-subtitle").value = page.subtitleText;
      backdrop.querySelector("#lua-page-button").value = page.buttonText || (page.type === "popup" ? "OK" : "");
      backdrop.querySelector("#lua-page-bg").value = page.backgroundColor;
      backdrop.querySelector("#lua-page-text").value = page.textColor;
      backdrop.querySelector("#lua-page-button-color").value = page.buttonColor;
      backdrop.querySelector("#lua-page-popup-width").value = page.popupWidth || 112;
      backdrop.querySelector("#lua-page-popup-height").value = page.popupHeight || 58;
      subtitleLabel.classList.toggle("hidden", !["start", "probas-menu"].includes(page.type));
      backdrop.querySelector("#lua-page-button").parentElement.classList.toggle("hidden", ["menu", "probas-menu"].includes(page.type));
      backdrop.querySelectorAll(".lua-page-popup-only").forEach((element) => element.classList.toggle("hidden", page.type !== "popup"));
    }
    menuWrap.classList.toggle("hidden", page.items.length === 0);
    formWrap.classList.toggle("hidden", page.type !== "form");
    menuItems.innerHTML = page.items.map((item, index) => {
      const routeOptions = [`<option value="0">${escapeHtml(t("luaRouteDefault"))}</option>`]
        .concat(pages.map((targetPage) => `<option value="${targetPage.index}" ${Number(page.targets[index]) === targetPage.index ? "selected" : ""}>${targetPage.index}. ${escapeHtml(targetPage.name)}</option>`))
        .join("");
      return `<div class="menu-route-row">
        <label>${escapeHtml(t("luaMenuOption"))} ${index + 1}<input data-page-item="${index}" value="${escapeHtml(item)}"></label>
        <label>${escapeHtml(t("luaButtonAction"))}<select data-page-target="${index}">${routeOptions}</select></label>
      </div>`;
    }).join("");
    if (page.type === "form") {
      formFields.innerHTML = (page.formFields || []).map((field, index) => `<div class="template-binding-row">
        <input data-page-field-label="${index}" value="${escapeHtml(field.label || String.fromCharCode(97 + index))}" aria-label="Nombre del input ${index + 1}">
        <select data-page-field-binding="${index}">${variableSelectOptions(variableCatalog, field.bind || "")}</select>
      </div>`).join("");
      const buttonIds = ["back", "primary", "details"].filter((id) => page.formButtons?.[id]);
      formButtons.innerHTML = buttonIds.map((id) => `<label>${escapeHtml(id === "back" ? "Boton Volver" : id === "details" ? "Boton Detalles" : "Boton principal")}<input data-page-button-text="${id}" value="${escapeHtml(page.formButtons[id].text || "")}"></label>`).join("");
      const action = page.visualActions?.[0] || {};
      backdrop.querySelector("#lua-page-action-condition").value = action.condition || "";
      backdrop.querySelector("#lua-page-action-expression").value = action.expression || "";
      backdrop.querySelector("#lua-page-action-target").innerHTML = variableSelectOptions(variableCatalog, action.target || "");
      backdrop.querySelector("#lua-page-action-details").value = action.details || "";
      updatePageActionSuggestions();
    }
    for (const input of backdrop.querySelectorAll("#lua-page-name, #lua-page-visual-editor input, #lua-page-menu-items input, #lua-page-menu-items select, #lua-page-form-editor input, #lua-page-form-editor select, #lua-page-form-editor textarea")) {
      input.addEventListener("input", () => {
        if (input.id === "lua-page-action-expression") syncPageCalculationTarget();
        updatePageActionSuggestions();
        renderPreview();
      });
      input.addEventListener("change", () => {
        if (input.id === "lua-page-action-expression") syncPageCalculationTarget();
        updatePageActionSuggestions();
        renderPreview();
      });
    }
    renderPreview();
  };
  pickerTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    picker.classList.toggle("open");
  });
  for (const button of backdrop.querySelectorAll("[data-page-option]")) {
    button.addEventListener("click", () => {
      selectedPageIndex = Number(button.dataset.pageOption) || 0;
      picker.classList.remove("open");
      render();
    });
  }
  document.addEventListener("click", function closePagePicker(event) {
    if (!backdrop.isConnected) {
      document.removeEventListener("click", closePagePicker);
      return;
    }
    if (!picker.contains(event.target)) picker.classList.remove("open");
  });
  backdrop.querySelector("#lua-page-close-top").addEventListener("click", () => closeModal(backdrop));
  const applyPageEdits = () => {
    const pageIndex = selectedPageIndex;
    const page = pages[pageIndex] || pages[0];
    const items = Array.from(menuItems.querySelectorAll("[data-page-item]")).map((input) => input.value);
    const targets = Array.from(menuItems.querySelectorAll("[data-page-target]")).map((input) => input.value);
    const patch = { name: nameInput.value, items, targets };
    if (["start", "menu", "probas-menu", "popup", "form"].includes(page.type)) {
      patch.type = page.type;
      patch.titleText = backdrop.querySelector("#lua-page-title").value;
      patch.subtitleText = backdrop.querySelector("#lua-page-subtitle").value;
      patch.buttonText = backdrop.querySelector("#lua-page-button").value;
      patch.backgroundColor = backdrop.querySelector("#lua-page-bg").value;
      patch.textColor = backdrop.querySelector("#lua-page-text").value;
      patch.buttonColor = backdrop.querySelector("#lua-page-button-color").value;
      patch.popupWidth = backdrop.querySelector("#lua-page-popup-width").value;
      patch.popupHeight = backdrop.querySelector("#lua-page-popup-height").value;
    }
    if (page.type === "form") {
      const draft = draftForPage(page);
      patch.formFields = draft.formFields;
      patch.formButtons = draft.formButtons;
      patch.visualActions = draft.visualActions;
    }
    const newBlock = updateLuaPageBlock(page.block, patch);
    editor.value = `${editor.value.slice(0, page.start)}${newBlock}${editor.value.slice(page.end)}`;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    closeModal(backdrop);
  };
  backdrop.querySelector("#lua-page-apply-top").addEventListener("click", applyPageEdits);
  render();
}

function createCodeEditorAdapter(textarea, wrap, options = {}) {
  const shell = wrap.closest(".lua-code-shell, .code-shell");
  const language = options.language || "lua";
  const listeners = new Map();
  const nativeHandlers = new Map();
  let monacoInstance = null;
  let monacoDisposables = [];
  let host = null;
  let patched = false;
  let lastDisabled = Boolean(textarea.disabled);
  const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const nativeSelectionStart = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "selectionStart");
  const nativeSelectionEnd = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "selectionEnd");
  const nativeScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
  const nativeScrollLeft = Object.getOwnPropertyDescriptor(Element.prototype, "scrollLeft");
  const nativeSetSelectionRange = textarea.setSelectionRange.bind(textarea);

  const adapter = {
    isMonaco: false,
    get value() {
      return monacoInstance ? monacoInstance.getValue() : nativeValue.get.call(textarea);
    },
    set value(nextValue) {
      const value = String(nextValue ?? "");
      nativeValue.set.call(textarea, value);
      if (monacoInstance) monacoInstance.setValue(value);
    },
    get selectionStart() {
      return monacoInstance ? monacoInstance.getSelectionOffsets().start : (nativeSelectionStart.get.call(textarea) || 0);
    },
    get selectionEnd() {
      return monacoInstance ? monacoInstance.getSelectionOffsets().end : (nativeSelectionEnd.get.call(textarea) || 0);
    },
    get scrollTop() {
      return monacoInstance ? monacoInstance.getScrollTop() : nativeScrollTop.get.call(textarea);
    },
    set scrollTop(value) {
      if (monacoInstance) monacoInstance.setScrollTop(value);
      else nativeScrollTop.set.call(textarea, value);
    },
    get scrollLeft() {
      return monacoInstance ? monacoInstance.getScrollLeft() : nativeScrollLeft.get.call(textarea);
    },
    set scrollLeft(value) {
      if (monacoInstance) monacoInstance.setScrollLeft(value);
      else nativeScrollLeft.set.call(textarea, value);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
      if (!monacoInstance && !nativeHandlers.has(type)) {
        const nativeHandler = (event) => emit(type, event);
        nativeHandlers.set(type, nativeHandler);
        textarea.addEventListener(type, nativeHandler);
      }
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event) {
      if (!monacoInstance) return textarea.dispatchEvent(event);
      emit(event?.type || "input", event);
      return true;
    },
    focus() {
      if (monacoInstance) monacoInstance.focus();
      else textarea.focus();
    },
    blur() {
      if (monacoInstance) monacoInstance.blur();
      else textarea.blur();
    },
    setSelectionRange(start, end = start) {
      if (monacoInstance) monacoInstance.setSelectionRange(start, end);
      else textarea.setSelectionRange(start, end);
    },
    setDiagnostics(diagnostics) {
      monacoInstance?.setDiagnostics?.(diagnostics);
    },
    setReadOnly(value) {
      lastDisabled = Boolean(value);
      monacoInstance?.setReadOnly?.(lastDisabled);
    },
    layout() {
      monacoInstance?.layout?.();
    },
    dispose() {
      for (const disposable of monacoDisposables) disposable?.dispose?.();
      monacoDisposables = [];
      monacoInstance?.dispose?.();
      monacoInstance = null;
      host?.remove();
      host = null;
      wrap.classList.remove("monaco-enabled");
      shell?.classList.remove("monaco-enabled");
    },
  };

  function emit(type, event = null) {
    for (const handler of listeners.get(type) || []) {
      handler.call(adapter, event || new Event(type, { bubbles: true }));
    }
  }

  function dispatchNative(type) {
    textarea.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function patchTextarea() {
    if (patched) return;
    patched = true;
    try {
      Object.defineProperty(textarea, "value", {
        configurable: true,
        get: () => adapter.value,
        set: (value) => {
          adapter.value = value;
        },
      });
      Object.defineProperty(textarea, "selectionStart", {
        configurable: true,
        get: () => adapter.selectionStart,
        set: (value) => adapter.setSelectionRange(value, adapter.selectionEnd),
      });
      Object.defineProperty(textarea, "selectionEnd", {
        configurable: true,
        get: () => adapter.selectionEnd,
        set: (value) => adapter.setSelectionRange(adapter.selectionStart, value),
      });
      Object.defineProperty(textarea, "scrollTop", {
        configurable: true,
        get: () => adapter.scrollTop,
        set: (value) => {
          adapter.scrollTop = value;
        },
      });
      Object.defineProperty(textarea, "scrollLeft", {
        configurable: true,
        get: () => adapter.scrollLeft,
        set: (value) => {
          adapter.scrollLeft = value;
        },
      });
      textarea.setSelectionRange = (start, end = start) => {
        adapter.setSelectionRange(start, end);
      };
    } catch (error) {
      console.warn("Monaco textarea proxy unavailable, direct textarea fallback remains active.", error);
    }
  }

  function tryEnableMonaco() {
    const monacoApi = window.TnsMonacoEditor;
    if (!monacoApi?.createTextEditor || monacoInstance) return;
    try {
      host = document.createElement("div");
      host.className = "monaco-code-host";
      wrap.append(host);
      monacoInstance = monacoApi.createTextEditor(host, {
        value: nativeValue.get.call(textarea),
        language,
        theme,
        editorOptions: options.editorOptions || {},
      });
      adapter.isMonaco = true;
      adapter.setReadOnly(lastDisabled);
      patchTextarea();
      wrap.classList.add("monaco-enabled");
      shell?.classList.add("monaco-enabled");
      monacoDisposables = [
        monacoInstance.onInput((value) => {
          nativeValue.set.call(textarea, value);
          emit("input");
          dispatchNative("input");
        }),
        monacoInstance.onCursor(() => {
          const offsets = monacoInstance.getSelectionOffsets();
          nativeSetSelectionRange(offsets.start, offsets.end);
          emit("keyup");
          emit("select");
          dispatchNative("keyup");
          dispatchNative("select");
        }),
        monacoInstance.onScroll(() => {
          emit("scroll");
          dispatchNative("scroll");
        }),
      ];
    } catch (error) {
      console.warn("Monaco editor unavailable, using textarea fallback.", error);
      monacoInstance = null;
      adapter.isMonaco = false;
      host?.remove();
      host = null;
      wrap.classList.remove("monaco-enabled");
      shell?.classList.remove("monaco-enabled");
    }
  }

  tryEnableMonaco();
  if (!monacoInstance) {
    window.addEventListener("tns-monaco-ready", tryEnableMonaco, { once: true });
  }
  return adapter;
}

function createLuaEditorAdapter(textarea, wrap) {
  return createCodeEditorAdapter(textarea, wrap, { language: "lua" });
}

function initializeStaticCodeEditors() {
  const configs = [
    { selector: "#xml-code", wrap: "#xml-editor-wrap", language: "ti-basic" },
    { selector: "#py-code", wrap: "#py-code-wrap", language: "python" },
  ];
  for (const config of configs) {
    const textarea = document.querySelector(config.selector);
    const wrap = document.querySelector(config.wrap);
    if (!textarea || !wrap || codeEditorAdapters.has(config.selector)) continue;
    const adapter = createCodeEditorAdapter(textarea, wrap, { language: config.language });
    adapter.setReadOnly(textarea.disabled);
    codeEditorAdapters.set(config.selector, adapter);
  }
}

function setStaticCodeEditorReadOnly(selector, readOnly) {
  codeEditorAdapters.get(selector)?.setReadOnly(readOnly);
}

function layoutCodeEditors() {
  window.requestAnimationFrame(() => {
    for (const adapter of codeEditorAdapters.values()) adapter.layout?.();
  });
}

function showLuaEditor(item) {
  const initialLuaContent = decodeXmlTextEntities(item.content || "");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal lua-modal">
      <div class="lua-toolbar">
        <h2>${escapeHtml(t("editLua"))}: ${escapeHtml(item.name)}</h2>
        <span id="lua-line-label">Linea: 1 Col: 1 Total: 1</span>
        <button type="button" id="lua-syntax" class="yellow-tool-button">${escapeHtml(t("runLuaSyntax"))}</button>
        <button type="button" id="lua-preview" class="green-tool-button">${escapeHtml(t("previewLua"))}</button>
        <button type="button" id="lua-love-preview" class="green-tool-button love-preview-tool-button">${escapeHtml(t("previewLove"))}</button>
        <button type="button" id="lua-guide" class="secondary-button">${escapeHtml(t("luaGuide"))}</button>
        <div class="lua-edit-menu">
          <button type="button" id="lua-edit-menu-trigger" class="green-tool-button">${escapeHtml(t("editMenu"))}</button>
          <div id="lua-edit-menu-panel" class="lua-edit-menu-panel" hidden>
            <button type="button" id="lua-templates">${escapeHtml(t("luaTemplates"))}</button>
            <button type="button" id="lua-page-editor">${escapeHtml(t("luaEditPages"))}</button>
            <button type="button" id="lua-tns-convert">${escapeHtml(t("luaTnsConvert"))}</button>
            <button type="button" id="lua-love-convert">${escapeHtml(t("loveConvertNspire"))}</button>
            <button type="button" id="lua-love-project-preview">${escapeHtml(t("previewLoveProject"))}</button>
          </div>
        </div>
        <button type="button" id="lua-save" class="green-tool-button">${escapeHtml(t("saveMenu"))}</button>
        <button type="button" id="lua-cancel">${escapeHtml(t("cancel"))}</button>
      </div>
      <div class="lua-doctor-grid">
        <div class="lua-code-shell">
          <div id="lua-lines" class="line-numbers"></div>
          <div class="lua-editor-wrap">
            <pre id="lua-highlight" class="lua-highlight" aria-hidden="true"></pre>
            <textarea id="lua-editor" class="lua-editor" spellcheck="false">${escapeHtml(initialLuaContent)}</textarea>
          </div>
        </div>
        <aside class="lua-side">
          <h3>${escapeHtml(t("analysisSummary"))}</h3>
          <div class="summary-row">
            <div class="summary error"><img src="./icon/error.png" alt="" /><strong id="lua-errors">0</strong><span>${escapeHtml(t("errors"))}</span></div>
            <div class="summary warning"><img src="./icon/advertencia.png" alt="" /><strong id="lua-warnings">0</strong><span>${escapeHtml(t("warnings"))}</span></div>
            <div class="summary info"><img src="./icon/perfecto.png" alt="" /><strong id="lua-info">0</strong><span>${escapeHtml(t("info"))}</span></div>
          </div>
          <h3>${escapeHtml(t("problemList"))}</h3>
          <table class="problem-table lua-problem-table">
            <thead><tr><th>${escapeHtml(t("type"))}</th><th>${escapeHtml(t("line"))}</th><th>${escapeHtml(t("description"))}</th></tr></thead>
            <tbody id="lua-problems"></tbody>
          </table>
          <h3>Log Lua</h3>
          <pre id="lua-log" class="mini-log"></pre>
        </aside>
      </div>
      <div class="modal-actions">
      </div>
    </div>`;
  document.body.append(backdrop);
  const rawEditor = backdrop.querySelector("#lua-editor");
  const editor = createLuaEditorAdapter(rawEditor, backdrop.querySelector(".lua-editor-wrap"));
  const lines = backdrop.querySelector("#lua-lines");
  const highlight = backdrop.querySelector("#lua-highlight");
  const label = backdrop.querySelector("#lua-line-label");
  const log = backdrop.querySelector("#lua-log");
  const problems = backdrop.querySelector("#lua-problems");
  const issueLines = new Map();
  const updateLabel = () => {
    const before = editor.value.slice(0, editor.selectionStart).split("\n");
    const line = before.length;
    const col = before[before.length - 1].length + 1;
    const total = Math.max(1, editor.value.split("\n").length);
    label.textContent = `Linea: ${line} Col: ${col} Total: ${total}`;
  };
  const updateHighlight = () => {
    highlight.innerHTML = editor.value.split("\n").map((line, index) => {
      const severity = issueLines.get(index + 1) || "";
      return `<div class="code-line ${severity.toLowerCase()}">${highlightLuaLine(line)}</div>`;
    }).join("");
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  };
  const updateLines = () => {
    const total = Math.max(1, editor.value.split("\n").length);
    lines.innerHTML = Array.from({ length: total }, (_, index) => {
      const severity = issueLines.get(index + 1) || "";
      return `<div class="line-row ${severity.toLowerCase()}"><span class="dot"></span><span>${index + 1}</span></div>`;
    }).join("");
    lines.scrollTop = editor.scrollTop;
  };
  const analyze = () => {
    const diagnostics = analyzeLuaBasic(editor.value);
    issueLines.clear();
    backdrop.querySelector("#lua-errors").textContent = String(diagnostics.errors.length);
    backdrop.querySelector("#lua-warnings").textContent = String(diagnostics.warnings.length);
    backdrop.querySelector("#lua-info").textContent = diagnostics.errors.length ? "0" : "1";
    const allDiagnostics = [...diagnostics.errors, ...diagnostics.warnings];
    for (const diag of allDiagnostics) {
      if (diag.line && !issueLines.has(diag.line)) issueLines.set(diag.line, diag.level);
    }
    editor.setDiagnostics(allDiagnostics);
    problems.innerHTML = allDiagnostics.map((diag) => `<tr class="${diag.level}" data-line="${diag.line}"><td>${diag.level}</td><td>${diag.line}</td><td>${escapeHtml(diag.message)}</td></tr>`).join("");
    for (const row of problems.querySelectorAll("tr")) {
      row.addEventListener("dblclick", () => {
        const line = Number(row.dataset.line || "0");
        const pos = editor.value.split("\n").slice(0, Math.max(0, line - 1)).join("\n").length + (line > 1 ? 1 : 0);
        editor.focus();
        editor.setSelectionRange(pos, pos);
        editor.scrollTop = Math.max(0, (line - 1) * 19 - 80);
        lines.scrollTop = editor.scrollTop;
        highlight.scrollTop = editor.scrollTop;
        updateLabel();
      });
    }
    log.textContent = allDiagnostics.length
      ? allDiagnostics.map((diag) => `[${diag.level}] Linea ${diag.line}: ${diag.message}`).join("\n")
      : t("luaSyntaxOk");
    updateLines();
    updateHighlight();
    updateLabel();
  };
  const closeLuaEditor = (afterClose = null) => {
    editor.dispose?.();
    closeModal(backdrop, afterClose);
  };
  editor.addEventListener("input", () => {
    updateLines();
    updateHighlight();
    updateLabel();
  });
  editor.addEventListener("keyup", updateLabel);
  editor.addEventListener("click", updateLabel);
  editor.addEventListener("select", updateLabel);
  editor.addEventListener("scroll", () => {
    lines.scrollTop = editor.scrollTop;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  });
  backdrop.querySelector("#lua-syntax").addEventListener("click", analyze);
  const editMenuTrigger = backdrop.querySelector("#lua-edit-menu-trigger");
  const editMenuPanel = backdrop.querySelector("#lua-edit-menu-panel");
  editMenuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    editMenuPanel.hidden = !editMenuPanel.hidden;
  });
  document.addEventListener("click", function closeLuaEditMenu(event) {
    if (!backdrop.isConnected) {
      document.removeEventListener("click", closeLuaEditMenu);
      return;
    }
    if (!editMenuPanel.contains(event.target) && !editMenuTrigger.contains(event.target)) editMenuPanel.hidden = true;
  });
  backdrop.querySelector("#lua-guide").addEventListener("click", showLuaGuide);
  backdrop.querySelector("#lua-templates").addEventListener("click", () => {
    editMenuPanel.hidden = true;
    showLuaTemplates(editor);
  });
  backdrop.querySelector("#lua-page-editor").addEventListener("click", () => {
    editMenuPanel.hidden = true;
    showLuaPageEditor(editor);
  });
  backdrop.querySelector("#lua-tns-convert").addEventListener("click", () => {
    editMenuPanel.hidden = true;
    convertTnsToLuaInEditor(editor, item);
    analyze();
  });
  backdrop.querySelector("#lua-love-convert").addEventListener("click", () => {
    editMenuPanel.hidden = true;
    editor.value = convertLoveToNspireScriptApp(editor.value);
    editor.dispatchEvent(new Event("input"));
    log.textContent = t("loveConvertedNspire");
    analyze();
  });
  backdrop.querySelector("#lua-love-project-preview").addEventListener("click", () => {
    editMenuPanel.hidden = true;
    showLoveProjectPicker(editor, log).catch((error) => {
      log.textContent += `\n[ERROR] Preview LÖVE Project: ${error.message}`;
    });
  });
  backdrop.querySelector("#lua-preview").addEventListener("click", () => {
    const caret = editor.selectionStart;
    editor.setSelectionRange(caret, caret);
    editor.blur();
    window.getSelection?.()?.removeAllRanges?.();
    showLuaPreview(editor.value, item).catch((error) => {
      log.textContent += `\n[ERROR] Preview Lua: ${error.message}`;
    });
  });
  backdrop.querySelector("#lua-love-preview").addEventListener("click", () => {
    const caret = editor.selectionStart;
    editor.setSelectionRange(caret, caret);
    editor.blur();
    window.getSelection?.()?.removeAllRanges?.();
    showLovePreview(editor.value, editor, log, { item }).catch((error) => {
      log.textContent += `\n[ERROR] Preview LÖVE: ${error.message}`;
    });
  });
  updateLines();
  updateHighlight();
  updateLabel();
  analyze();
  backdrop.querySelector("#lua-cancel").addEventListener("click", () => closeLuaEditor());
  backdrop.querySelector("#lua-save").addEventListener("click", async () => {
    try {
      const content = editor.value;
      await saveLuaScriptToStage(item, content);
      item.content = content;
      closeDocumentInspectorModals();
      closeLuaEditor(() => {
        openDocumentInspector().catch((error) => xmlLog(`ERROR: ${error.message}`));
      });
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
}

function decodeXmlTextEntities(text) {
  const area = document.createElement("textarea");
  area.innerHTML = text || "";
  return area.value;
}

function encodeXmlTextEntities(text) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeLuaPreviewSource(code = "") {
  let normalized = String(code).replace(/gc:drawString\((["'])((?:\\.|(?!\1).)*?)\1,\s*150\s*,\s*113\s*,\s*(["'])top\3\s*\)/g, (_match, quote, label) => {
    return `gc:drawString(${quote}${label}${quote}, 132 + (54 - gc:getStringWidth(${quote}${label}${quote})) / 2, 113, "top")`;
  });
  if (/pages\s*=\s*\{\}/.test(normalized) && !/function\s+on\.mouseDown\s*\(/.test(normalized)) {
    normalized += `

function on.mouseDown(x, y)
  if pages[currentPage] and pages[currentPage].mouseDown then
    pages[currentPage]:mouseDown(x, y)
  end
end
`;
  }
  return normalized;
}

function xmlDoctorHasProjectFiles() {
  if (!pyodide) return false;
  for (const root of [xmlDoctor.stagePrepared ? xmlDoctor.stagePath : "", xmlDoctor.sourcePath]) {
    if (!root) continue;
    try {
      if (!pyodide.FS.analyzePath(root).exists) continue;
      const names = pyodide.FS.readdir(root).filter((name) => name !== "." && name !== "..");
      if (names.some((name) => /\.xml$/i.test(name))) return true;
    } catch (_error) {
      // No project is loaded yet.
    }
  }
  return false;
}

async function createEmptyXmlProjectForPageCreation() {
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
  xmlDoctor.sourceFileName = "documento.tns";

  const response = await fetch(`./templates/blank_tns_xml/Document.xml?v=${SOURCE_VERSION}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo cargar plantilla Document.xml: HTTP ${response.status}`);
  pyodide.FS.writeFile(`${xmlDoctor.sourcePath}/Document.xml`, await response.text());

  // +Page necesita un contenedor de problema, no una página TI.ProgramEditor
  // implícita. "Nuevo documento" conserva su comportamiento anterior.
  const emptyProblem = '<?xml version="1.0" encoding="UTF-8" ?><prob xmlns="urn:TI.Problem" ver="1.0" pbname=""><sym></sym></prob>';
  pyodide.FS.writeFile(`${xmlDoctor.sourcePath}/Problem1.xml`, emptyProblem);

  xmlDoctor.embedded = false;
  xmlDoctor.stagePrepared = false;
  xmlDoctor.lastDiff = "";
  xmlDoctor.issueLines.clear();
  await scanXmlPrograms();
}

async function ensureXmlProjectForPageCreation() {
  if (xmlDoctorHasProjectFiles()) return;
  await createEmptyXmlProjectForPageCreation();
  xmlLog("Documento base vacío creado automáticamente para +Page.");
}


async function addProgramEditorToStage() {
  await ensureXmlStageCopy();

  const templateResponse = await fetch(`./templates/blank_tns_xml/Problem1.xml?v=${SOURCE_VERSION}`, { cache: "no-store" });
  if (!templateResponse.ok) {
    throw new Error(`No se pudo cargar la plantilla TI.ProgramEditor: HTTP ${templateResponse.status}`);
  }

  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_program_editor_current_file", currentFile);
  pyodide.globals.set("wasm_program_editor_template", await templateResponse.text());

  const payload = await pyodide.runPythonAsync(`
import copy
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name, namespace_uri

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_program_editor_current_file) if wasm_program_editor_current_file else None

xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = current_file.relative_to(source_root)
        except ValueError:
            rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate

if xml_file is None:
    problem_files = sorted(
        [p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")],
        key=lambda p: p.name.lower(),
    )
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]

if xml_file is None:
    raise RuntimeError("No XML file available for TI.ProgramEditor")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
pe_ns = "urn:TI.ProgramEditor"
ET.register_namespace("", prob_ns)
ET.register_namespace("pe", pe_ns)

def q(ns, name):
    return f"{{{ns}}}{name}" if ns else name

# Resolve / create <sym>.
sym = None
for child in root:
    if local_name(child.tag) == "sym":
        sym = child
        break
if sym is None:
    sym = ET.Element(q(prob_ns, "sym"))
    root.insert(0, sym)

# Choose a unique TI-Basic program name.
existing = set()
for element in root.iter():
    if local_name(element.tag) == "n" and element.text:
        existing.add(element.text.strip())
    if namespace_uri(element.tag) == pe_ns and local_name(element.tag) == "name" and element.text:
        existing.add(element.text.strip())

base = "nuevo"
program_name = base
counter = 1
while program_name in existing:
    counter += 1
    program_name = f"{base}_{counter}"

# Clone the known-working ProgramEditor card/symbol from the project's
# blank template rather than hand-inventing the internal r2dtotree.
template_root = ET.fromstring(wasm_program_editor_template)
template_card = None
template_symbol = None

for candidate in template_root:
    if local_name(candidate.tag) == "sym":
        for entry in candidate:
            if local_name(entry.tag) == "e":
                template_symbol = copy.deepcopy(entry)
                break
    elif local_name(candidate.tag) == "card":
        for wdgt in candidate.iter():
            if local_name(wdgt.tag) == "wdgt" and wdgt.attrib.get("type") == "TI.ProgramEditor":
                template_card = copy.deepcopy(candidate)
                break
    if template_card is not None and template_symbol is not None:
        break

if template_card is None:
    raise RuntimeError("La plantilla no contiene una card TI.ProgramEditor")
if template_symbol is None:
    raise RuntimeError("La plantilla no contiene el símbolo del programa")

# Rename the cloned program everywhere it occurs, including the escaped
# r2dtotree text stored in pe:editor.
for element in template_card.iter():
    if element.text:
        element.text = element.text.replace("nuevo", program_name)
    if element.tail:
        element.tail = element.tail.replace("nuevo", program_name)

for element in template_symbol.iter():
    if local_name(element.tag) == "n":
        element.text = program_name
    elif element.text:
        element.text = element.text.replace("nuevo", program_name)

sym.append(template_symbol)
root.append(template_card)

body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

# Return the newly-created widget for consumers that want to refresh UI.
created_widget = None
for wdgt in template_card.iter():
    if local_name(wdgt.tag) == "wdgt" and wdgt.attrib.get("type") == "TI.ProgramEditor":
        created_widget = wdgt
        break

json.dumps({
    "type": "Widget",
    "name": "TI.ProgramEditor",
    "file": str(xml_file),
    "path": "",
    "detail": {"name": program_name, "type": "Prgm", "visibility": "LibPub ", "created": "true"},
    "content": f"Define LibPub {program_name}()=\\nPrgm\\r:\\r:EndPrgm",
    "content_label": "ProgramEditor",
    "raw_xml": ET.tostring(created_widget, encoding="unicode", short_empty_elements=False) if created_widget is not None else "",
    "program_name": program_name,
})
`);

  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  const result = JSON.parse(payload);

  // ProgramEditor is directly editable by Syntax Doctor XML.
  await scanXmlPrograms();
  const created = xmlDoctor.candidates.find((item) => item.program_name === result.program_name);
  if (created) selectXmlProgram(created.index);
  xmlLog(t("programEditorWidgetAdded"));
  return result;
}


const TI_NOTEPAD_CARD_TEMPLATE_B64 = "PG5zMDpjYXJkIHhtbG5zOm5zMD0idXJuOlRJLlByb2JsZW0iIHhtbG5zOm5zMT0idXJuOlRJLk5vdGVwYWQiIGNsYXk9IjAiIGgxPSIxMDAwMCIgaDI9IjEwMDAwIiB3MT0iMTAwMDAiIHcyPSIxMDAwMCI+PG5zMDppc0R1bW15Q2FyZD4wPC9uczA6aXNEdW1teUNhcmQ+PG5zMDpmbGFnPjA8L25zMDpmbGFnPjxuczA6d2RndCB0eXBlPSJUSS5Ob3RlcGFkIiB2ZXI9IjIuMCI+PG5zMTptRmxhZ3M+MTAyNDwvbnMxOm1GbGFncz48bnMxOnZhbHVlPjM8L25zMTp2YWx1ZT48bnMxOmZtdHh0PiZsdDtyMmR0b3RyZWUgdmVyc2lvbj0iMSImZ3Q7Jmx0O2Zvcm1hdE1hbmFnZXIgdGFibGVTaXplPSIxIiBjYXBhY2l0eT0iMTAiJmd0OyZsdDtmb3JtYXRFbnRyeSBlbnRyeUluZGV4PSIwIiBlbnRyeUlEPSIwIiBlbnRyeVJlZkNudD0iNiIgdGM9IjEiIGZjPSIyNjg0MzUxOTkiIGZzPSIxMSIgZnN0PSIwIiBjYz0iMCIgZmVzdD0iMCIgZmV1bj0iMCIgZmVzdWI9IjAiIGZlc3VwPSIwIiBmbjA9IlRJLU5zcGlyZSBTYW5zIiZndDsmbHQ7L2Zvcm1hdEVudHJ5Jmd0OyZsdDsvZm9ybWF0TWFuYWdlciZndDsmbHQ7bm9kZSBuYW1lPSIxZG9jIiZndDsmbHQ7bm9kZSBuYW1lPSIxcGFyYSImZ3Q7Jmx0O25vZGUgbmFtZT0iMXJ0bGluZSImZ3Q7Jmx0O2xlYWYgbmFtZT0iMXdvcmQiIG5wPSIxIiBpZDA9IjAiIHBwMD0iNSImZ3Q7aG9sYSAmbHQ7L2xlYWYmZ3Q7Jmx0O2xlYWYgbmFtZT0iMXdvcmQiIG5wPSIxIiBpZDA9IjAiIHBwMD0iNSImZ3Q7ZXN0byAmbHQ7L2xlYWYmZ3Q7Jmx0O2xlYWYgbmFtZT0iMXdvcmQiIG5wPSIxIiBpZDA9IjAiIHBwMD0iMyImZ3Q7ZXMgJmx0Oy9sZWFmJmd0OyZsdDtsZWFmIG5hbWU9IjF3b3JkIiBucD0iMSIgaWQwPSIwIiBwcDA9IjQiJmd0O3VuYSAmbHQ7L2xlYWYmZ3Q7Jmx0O2xlYWYgbmFtZT0iMXdvcmQiIG5wPSIxIiBpZDA9IjAiIHBwMD0iNCImZ3Q7bm90YSZsdDtjdXJzb3IgaW5kZXg9IjAiLyZndDsmbHQ7L2xlYWYmZ3Q7Jmx0Oy9ub2RlJmd0OyZsdDsvbm9kZSZndDsmbHQ7L25vZGUmZ3Q7Jmx0Oy9yMmR0b3RyZWUmZ3Q7PC9uczE6Zm10eHQ+PC9uczA6d2RndD48L25zMDpjYXJkPg==";
const TI_GRAPH_CARD_TEMPLATE_B64 = "PG5zMDpjYXJkIHhtbG5zOm5zMD0idXJuOlRJLlByb2JsZW0iIHhtbG5zOm5zMT0idXJuOlRJLkdlb0dyYXBoZXIiIGNsYXk9IjAiIGgxPSIxMDAwMCIgaDI9IjEwMDAwIiB3MT0iMTAwMDAiIHcyPSIxMDAwMCI+PG5zMDppc0R1bW15Q2FyZD4wPC9uczA6aXNEdW1teUNhcmQ+PG5zMDpmbGFnPjA8L25zMDpmbGFnPjxuczA6d2RndCB0eXBlPSJUSS5HZW9HcmFwaGVyIiB2ZXI9IjEuMCI+PG5zMTptRmxhZ3M+MzA3MjwvbnMxOm1GbGFncz48bnMxOnZhbHVlPjE8L25zMTp2YWx1ZT48bnMxOmNyeT4wPC9uczE6Y3J5PjxuczE6bGVnYWw+bm9uZTwvbnMxOmxlZ2FsPjxuczE6c2Noaz5mYWxzZTwvbnMxOnNjaGs+PG5zMTpndWlkPjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwPC9uczE6Z3VpZD48bnMxOmFuaW1feD4xMDwvbnMxOmFuaW1feD48bnMxOmFuaW1feT4zNTwvbnMxOmFuaW1feT48bnMxOmZpZz48bnMxOnZlcj4xMDwvbnMxOnZlcj48bnMxOm9ianM+PG5zMTpheGVzX3N5c3RlbT48bnMxOmlkPjE8L25zMTppZD48bnMxOmF4ZXM+PC9uczE6YXhlcz48bnMxOnVtaW4+4oiSMTA8L25zMTp1bWluPjxuczE6dW1heD4xMDwvbnMxOnVtYXg+PG5zMTp2bWluPuKIkjYuNjY2NjY2NjY2NjY2NzwvbnMxOnZtaW4+PG5zMTp2bWF4PjYuNjY2NjY2NjY2NjY2NzwvbnMxOnZtYXg+PG5zMTpzcmZ4PjM0LjAxMjU3ODYxNjM1MjI8L25zMTpzcmZ4PjxuczE6c3JmeT4zOC42NDE1MDk0MzM5NjIzPC9uczE6c3JmeT48bnMxOnNyZnc+MzI8L25zMTpzcmZ3PjxuczE6c3JmaD4yMS4zMzMzMzMzMzMzMzMzPC9uczE6c3JmaD48bnMxOmZzbW8+MDwvbnMxOmZzbW8+PG5zMTp0aW11PjA8L25zMTp0aW11PjxuczE6dGltdj4wPC9uczE6dGltdj48bnMxOnRpdnU+4oiSMTwvbnMxOnRpdnU+PG5zMTp0aXZ2PuKIkjE8L25zMTp0aXZ2PjxuczE6YWNvbD4wPC9uczE6YWNvbD48bnMxOmFhc3Q+MDwvbnMxOmFhc3Q+PG5zMTphYXptPjQ8L25zMTphYXptPjxuczE6YXB0aD4xPC9uczE6YXB0aD48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTphbXRtPjE8L25zMTphbXRtPjxuczE6YXpscT4wPC9uczE6YXpscT48bnMxOmF0bGg+MDwvbnMxOmF0bGg+PG5zMTphYWxoPjA8L25zMTphYWxoPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MDwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmF4ZXNfc3lzdGVtPjxuczE6YXhpcz48bnMxOmlkPjI8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOnhheGlzPjwvbnMxOnhheGlzPjxuczE6c21ydD4yPC9uczE6c21ydD48bnMxOnNtMT7iiJIxNjwvbnMxOnNtMT48bnMxOnNtMj4xNjwvbnMxOnNtMj48bnMxOmFsY28+NjU1MzY8L25zMTphbGNvPjxuczE6YWNzdD4wPC9uczE6YWNzdD48bnMxOmFwc3Q+MDwvbnMxOmFwc3Q+PG5zMTphcHRoPjA8L25zMTphcHRoPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmFsZXM+MDwvbnMxOmFsZXM+PG5zMTpsYmw+eDwvbnMxOmxibD48bnMxOnN0YXQ+MTY8L25zMTpzdGF0PjxuczE6Z3BpZD4wPC9uczE6Z3BpZD48bnMxOnBpbj4wPC9uczE6cGluPjxuczE6bGhmPjwvbnMxOmxoZj48bnMxOmRsYz48L25zMTpkbGM+PG5zMTpkZmM+PC9uczE6ZGZjPjxuczE6ZGJjPjwvbnMxOmRiYz48L25zMTpheGlzPjxuczE6bGFiZWw+PG5zMTppZD4zPC9uczE6aWQ+PG5zMTpwYXI+MiA8L25zMTpwYXI+PG5zMTpsYmxfYT48bnMxOnQ+MC44NTwvbnMxOnQ+PG5zMTpkeD4wPC9uczE6ZHg+PG5zMTpkeT4wPC9uczE6ZHk+PC9uczE6bGJsX2E+PG5zMTpjaHJzPjEgMSAzIDAgMCAwIHgKPC9uczE6Y2hycz48bnMxOmRldGE+MDwvbnMxOmRldGE+PG5zMTphdHRhPjE8L25zMTphdHRhPjxuczE6eD42NS4yNDkzMzE3Nzg4MzM8L25zMTp4PjxuczE6eT41MS4wMTA4OTU1NDc0Njk3PC9uczE6eT48bnMxOnc+MC43MDQ0MDI1MTU3MjMzPC9uczE6dz48bnMxOmg+MS42MTAwNjI4OTMwODE4PC9uczE6aD48bnMxOmF0Y28+MTwvbnMxOmF0Y28+PG5zMTphZm9uPjE8L25zMTphZm9uPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmxkaXM+MDwvbnMxOmxkaXM+PG5zMTp0Z3RyPjA8L25zMTp0Z3RyPjxuczE6dGd0Yj4wPC9uczE6dGd0Yj48bnMxOnRnZnI+MDwvbnMxOnRnZnI+PG5zMTp0Z2ZiPjA8L25zMTp0Z2ZiPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MDwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmxhYmVsPjxuczE6YXhpcz48bnMxOmlkPjQ8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOnlheGlzPjwvbnMxOnlheGlzPjxuczE6c21ydD4yPC9uczE6c21ydD48bnMxOnNtMT7iiJIxMC42NjY2NjY2NjY2NjY3PC9uczE6c20xPjxuczE6c20yPjEwLjY2NjY2NjY2NjY2Njc8L25zMTpzbTI+PG5zMTphbGNvPjY1NTM2PC9uczE6YWxjbz48bnMxOmFjc3Q+MDwvbnMxOmFjc3Q+PG5zMTphcHN0PjA8L25zMTphcHN0PjxuczE6YXB0aD4wPC9uczE6YXB0aD48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTphbGVzPjA8L25zMTphbGVzPjxuczE6bGJsPnk8L25zMTpsYmw+PG5zMTpzdGF0PjE2PC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6YXhpcz48bnMxOmxhYmVsPjxuczE6aWQ+NTwvbnMxOmlkPjxuczE6cGFyPjQgPC9uczE6cGFyPjxuczE6bGJsX2E+PG5zMTp0PjAuMTA1PC9uczE6dD48bnMxOmR4PjA8L25zMTpkeD48bnMxOmR5PjA8L25zMTpkeT48L25zMTpsYmxfYT48bnMxOmNocnM+MSAxIDMgMCAwIDAgeQo8L25zMTpjaHJzPjxuczE6ZGV0YT4wPC9uczE6ZGV0YT48bnMxOmF0dGE+MTwvbnMxOmF0dGE+PG5zMTp4PjUwLjU3NDg0NDIyNTg2ODM8L25zMTp4PjxuczE6eT42MC4wODM2MzczMzY1MDcyPC9uczE6eT48bnMxOnc+MC43MDQ0MDI1MTU3MjMzPC9uczE6dz48bnMxOmg+MS42MTAwNjI4OTMwODE4PC9uczE6aD48bnMxOmF0Y28+MTwvbnMxOmF0Y28+PG5zMTphZm9uPjE8L25zMTphZm9uPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmxkaXM+MDwvbnMxOmxkaXM+PG5zMTp0Z3RyPjA8L25zMTp0Z3RyPjxuczE6dGd0Yj4wPC9uczE6dGd0Yj48bnMxOnRnZnI+MDwvbnMxOnRnZnI+PG5zMTp0Z2ZiPjA8L25zMTp0Z2ZiPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MDwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmxhYmVsPjxuczE6Z3JpZD48bnMxOmlkPjY8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOmdyaWRfYXM+PC9uczE6Z3JpZF9hcz48bnMxOmFjb2w+MTUyNjM5NzY8L25zMTphY29sPjxuczE6YWdzdD4wPC9uczE6YWdzdD48bnMxOmFwdGg+MDwvbnMxOmFwdGg+PG5zMTphcHR4PjQ8L25zMTphcHR4PjxuczE6YXBzdD4wPC9uczE6YXBzdD48bnMxOmFzaG8+MDwvbnMxOmFzaG8+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4xNjwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmdyaWQ+PG5zMTpudW1iZXI+PG5zMTppZD43PC9uczE6aWQ+PG5zMTpwYXI+MSA8L25zMTpwYXI+PG5zMTpheGlzdmFsPjxuczE6dHk+MDwvbnMxOnR5PjwvbnMxOmF4aXN2YWw+PG5zMTpudW0+MTA8L25zMTpudW0+PG5zMTpjcHI+MTwvbnMxOmNwcj48bnMxOmFuc3Q+MDwvbnMxOmFuc3Q+PG5zMTphcHJlPjI8L25zMTphcHJlPjxuczE6YWxvYz4wPC9uczE6YWxvYz48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTphY29sPjA8L25zMTphY29sPjxuczE6dGdlPjwvbnMxOnRnZT48bnMxOmFuZmM+MTwvbnMxOmFuZmM+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4xNjwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOm51bWJlcj48bnMxOnRleHQ+PG5zMTppZD44PC9uczE6aWQ+PG5zMTpwYXI+NyA8L25zMTpwYXI+PG5zMTp0ZXh0Xz48bnMxOmR4PjA8L25zMTpkeD48bnMxOmR5PjA8L25zMTpkeT48bnMxOnQ+MDwvbnMxOnQ+PC9uczE6dGV4dF8+PG5zMTpjaHJzPjEgMSAxIDAgMCAxIDEwCjwvbnMxOmNocnM+PG5zMTpkZXRhPjE8L25zMTpkZXRhPjxuczE6YXR0YT4xPC9uczE6YXR0YT48bnMxOng+NjQuODA1MDMxNDQ2NTQwOTwvbnMxOng+PG5zMTp5PjQ4Ljk1ODE3NjEwMDYyODk8L25zMTp5PjxuczE6dz4xLjIwNzU0NzE2OTgxMTM8L25zMTp3PjxuczE6aD4xLjYxMDA2Mjg5MzA4MTg8L25zMTpoPjxuczE6YXRjbz4xPC9uczE6YXRjbz48bnMxOmFmb24+MTwvbnMxOmFmb24+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6bGRpcz4wPC9uczE6bGRpcz48bnMxOnRndHI+MDwvbnMxOnRndHI+PG5zMTp0Z3RiPjA8L25zMTp0Z3RiPjxuczE6dGdmcj4wPC9uczE6dGdmcj48bnMxOnRnZmI+MDwvbnMxOnRnZmI+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4wPC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6dGV4dD48bnMxOm51bWJlcj48bnMxOmlkPjk8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOmF4aXN2YWw+PG5zMTp0eT4xPC9uczE6dHk+PC9uczE6YXhpc3ZhbD48bnMxOm51bT7iiJIxMDwvbnMxOm51bT48bnMxOmNwcj4xPC9uczE6Y3ByPjxuczE6YW5zdD4wPC9uczE6YW5zdD48bnMxOmFwcmU+MjwvbnMxOmFwcmU+PG5zMTphbG9jPjA8L25zMTphbG9jPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmFjb2w+MDwvbnMxOmFjb2w+PG5zMTp0Z2U+PC9uczE6dGdlPjxuczE6YW5mYz4xPC9uczE6YW5mYz48bnMxOmxibD48L25zMTpsYmw+PG5zMTpzdGF0PjE2PC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6bnVtYmVyPjxuczE6dGV4dD48bnMxOmlkPjEwPC9uczE6aWQ+PG5zMTpwYXI+OSA8L25zMTpwYXI+PG5zMTp0ZXh0Xz48bnMxOmR4PjA8L25zMTpkeD48bnMxOmR5PjA8L25zMTpkeT48bnMxOnQ+MDwvbnMxOnQ+PC9uczE6dGV4dF8+PG5zMTpjaHJzPjEgMSAxIDAgMCAxIOKIkjEwCjwvbnMxOmNocnM+PG5zMTpkZXRhPjE8L25zMTpkZXRhPjxuczE6YXR0YT4xPC9uczE6YXR0YT48bnMxOng+MzQuMDEyNTc4NjE2MzUyMjwvbnMxOng+PG5zMTp5PjQ4Ljk1ODE3NjEwMDYyODk8L25zMTp5PjxuczE6dz4xLjcxMDY5MTgyMzg5OTQ8L25zMTp3PjxuczE6aD4xLjYxMDA2Mjg5MzA4MTg8L25zMTpoPjxuczE6YXRjbz4xPC9uczE6YXRjbz48bnMxOmFmb24+MTwvbnMxOmFmb24+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6bGRpcz4wPC9uczE6bGRpcz48bnMxOnRndHI+MDwvbnMxOnRndHI+PG5zMTp0Z3RiPjA8L25zMTp0Z3RiPjxuczE6dGdmcj4wPC9uczE6dGdmcj48bnMxOnRnZmI+MDwvbnMxOnRnZmI+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4wPC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6dGV4dD48bnMxOm51bWJlcj48bnMxOmlkPjExPC9uczE6aWQ+PG5zMTpwYXI+MSA8L25zMTpwYXI+PG5zMTpheGlzdmFsPjxuczE6dHk+MjwvbnMxOnR5PjwvbnMxOmF4aXN2YWw+PG5zMTpudW0+Ni42NjY2NjY2NjY2NjY3PC9uczE6bnVtPjxuczE6Y3ByPjE8L25zMTpjcHI+PG5zMTphbnN0PjA8L25zMTphbnN0PjxuczE6YXByZT4yPC9uczE6YXByZT48bnMxOmFsb2M+MDwvbnMxOmFsb2M+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6YWNvbD4wPC9uczE6YWNvbD48bnMxOnRnZT48L25zMTp0Z2U+PG5zMTphbmZjPjE8L25zMTphbmZjPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MTY8L25zMTpzdGF0PjxuczE6Z3BpZD4wPC9uczE6Z3BpZD48bnMxOnBpbj4wPC9uczE6cGluPjxuczE6bGhmPjwvbnMxOmxoZj48bnMxOmRsYz48L25zMTpkbGM+PG5zMTpkZmM+PC9uczE6ZGZjPjxuczE6ZGJjPjwvbnMxOmRiYz48L25zMTpudW1iZXI+PG5zMTp0ZXh0PjxuczE6aWQ+MTI8L25zMTppZD48bnMxOnBhcj4xMSA8L25zMTpwYXI+PG5zMTp0ZXh0Xz48bnMxOmR4PjA8L25zMTpkeD48bnMxOmR5PjA8L25zMTpkeT48bnMxOnQ+MDwvbnMxOnQ+PC9uczE6dGV4dF8+PG5zMTpjaHJzPjEgMSAxIDAgMCAxIDYuNjcKPC9uczE6Y2hycz48bnMxOmRldGE+MTwvbnMxOmRldGE+PG5zMTphdHRhPjE8L25zMTphdHRhPjxuczE6eD40Ny40OTkzNzEwNjkxODI0PC9uczE6eD48bnMxOnk+NTkuOTc0ODQyNzY3Mjk1NjwvbnMxOnk+PG5zMTp3PjIuMTEzMjA3NTQ3MTY5ODwvbnMxOnc+PG5zMTpoPjEuNjEwMDYyODkzMDgxODwvbnMxOmg+PG5zMTphdGNvPjE8L25zMTphdGNvPjxuczE6YWZvbj4xPC9uczE6YWZvbj48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTpsZGlzPjA8L25zMTpsZGlzPjxuczE6dGd0cj4wPC9uczE6dGd0cj48bnMxOnRndGI+MDwvbnMxOnRndGI+PG5zMTp0Z2ZyPjA8L25zMTp0Z2ZyPjxuczE6dGdmYj4wPC9uczE6dGdmYj48bnMxOmxibD48L25zMTpsYmw+PG5zMTpzdGF0PjA8L25zMTpzdGF0PjxuczE6Z3BpZD4wPC9uczE6Z3BpZD48bnMxOnBpbj4wPC9uczE6cGluPjxuczE6bGhmPjwvbnMxOmxoZj48bnMxOmRsYz48L25zMTpkbGM+PG5zMTpkZmM+PC9uczE6ZGZjPjxuczE6ZGJjPjwvbnMxOmRiYz48L25zMTp0ZXh0PjxuczE6bnVtYmVyPjxuczE6aWQ+MTM8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOmF4aXN2YWw+PG5zMTp0eT4zPC9uczE6dHk+PC9uczE6YXhpc3ZhbD48bnMxOm51bT7iiJI2LjY2NjY2NjY2NjY2Njc8L25zMTpudW0+PG5zMTpjcHI+MTwvbnMxOmNwcj48bnMxOmFuc3Q+MDwvbnMxOmFuc3Q+PG5zMTphcHJlPjI8L25zMTphcHJlPjxuczE6YWxvYz4wPC9uczE6YWxvYz48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTphY29sPjA8L25zMTphY29sPjxuczE6dGdlPjwvbnMxOnRnZT48bnMxOmFuZmM+MTwvbnMxOmFuZmM+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4xNjwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOm51bWJlcj48bnMxOnRleHQ+PG5zMTppZD4xNDwvbnMxOmlkPjxuczE6cGFyPjEzIDwvbnMxOnBhcj48bnMxOnRleHRfPjxuczE6ZHg+MDwvbnMxOmR4PjxuczE6ZHk+MDwvbnMxOmR5PjxuczE6dD4wPC9uczE6dD48L25zMTp0ZXh0Xz48bnMxOmNocnM+MSAxIDEgMCAwIDEg4oiSNi42Nwo8L25zMTpjaHJzPjxuczE6ZGV0YT4xPC9uczE6ZGV0YT48bnMxOmF0dGE+MTwvbnMxOmF0dGE+PG5zMTp4PjQ2Ljk5NjIyNjQxNTA5NDM8L25zMTp4PjxuczE6eT40MC4yNTE1NzIzMjcwNDQ8L25zMTp5PjxuczE6dz4yLjYxNjM1MjIwMTI1Nzk8L25zMTp3PjxuczE6aD4xLjYxMDA2Mjg5MzA4MTg8L25zMTpoPjxuczE6YXRjbz4xPC9uczE6YXRjbz48bnMxOmFmb24+MTwvbnMxOmFmb24+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6bGRpcz4wPC9uczE6bGRpcz48bnMxOnRndHI+MDwvbnMxOnRndHI+PG5zMTp0Z3RiPjA8L25zMTp0Z3RiPjxuczE6dGdmcj4wPC9uczE6dGdmcj48bnMxOnRnZmI+MDwvbnMxOnRnZmI+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4wPC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6dGV4dD48bnMxOm51bWJlcj48bnMxOmlkPjE1PC9uczE6aWQ+PG5zMTpwYXI+MSA8L25zMTpwYXI+PG5zMTpheGlzdGljPjxuczE6dHk+MDwvbnMxOnR5PjxuczE6ZWg+PC9uczE6ZWg+PC9uczE6YXhpc3RpYz48bnMxOm51bT4xPC9uczE6bnVtPjxuczE6Y3ByPjE8L25zMTpjcHI+PG5zMTphbnN0PjA8L25zMTphbnN0PjxuczE6YXByZT4yPC9uczE6YXByZT48bnMxOmFsb2M+MDwvbnMxOmFsb2M+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6YWNvbD4wPC9uczE6YWNvbD48bnMxOnRnZT48L25zMTp0Z2U+PG5zMTphbmZjPjE8L25zMTphbmZjPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MTY8L25zMTpzdGF0PjxuczE6Z3BpZD4wPC9uczE6Z3BpZD48bnMxOnBpbj4wPC9uczE6cGluPjxuczE6bGhmPjwvbnMxOmxoZj48bnMxOmRsYz48L25zMTpkbGM+PG5zMTpkZmM+PC9uczE6ZGZjPjxuczE6ZGJjPjwvbnMxOmRiYz48L25zMTpudW1iZXI+PG5zMTp0ZXh0PjxuczE6aWQ+MTY8L25zMTppZD48bnMxOnBhcj4xNSA8L25zMTpwYXI+PG5zMTp0ZXh0Xz48bnMxOmR4PjA8L25zMTpkeD48bnMxOmR5PjA8L25zMTpkeT48bnMxOnQ+MDwvbnMxOnQ+PC9uczE6dGV4dF8+PG5zMTpjaHJzPjEgMSAxIDAgMCAxIDEKPC9uczE6Y2hycz48bnMxOmRldGE+MTwvbnMxOmRldGE+PG5zMTphdHRhPjE8L25zMTphdHRhPjxuczE6eD41MS4zNjEwMDYyODkzMDgyPC9uczE6eD48bnMxOnk+NDkuMDU4MTc2MTAwNjI4OTwvbnMxOnk+PG5zMTp3PjAuNzA0NDAyNTE1NzIzMzwvbnMxOnc+PG5zMTpoPjEuNjEwMDYyODkzMDgxODwvbnMxOmg+PG5zMTphdGNvPjE8L25zMTphdGNvPjxuczE6YWZvbj4xPC9uczE6YWZvbj48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTpsZGlzPjA8L25zMTpsZGlzPjxuczE6dGd0cj4wPC9uczE6dGd0cj48bnMxOnRndGI+MDwvbnMxOnRndGI+PG5zMTp0Z2ZyPjA8L25zMTp0Z2ZyPjxuczE6dGdmYj4wPC9uczE6dGdmYj48bnMxOmxibD48L25zMTpsYmw+PG5zMTpzdGF0PjA8L25zMTpzdGF0PjxuczE6Z3BpZD4wPC9uczE6Z3BpZD48bnMxOnBpbj4wPC9uczE6cGluPjxuczE6bGhmPjwvbnMxOmxoZj48bnMxOmRsYz48L25zMTpkbGM+PG5zMTpkZmM+PC9uczE6ZGZjPjxuczE6ZGJjPjwvbnMxOmRiYz48L25zMTp0ZXh0PjxuczE6bnVtYmVyPjxuczE6aWQ+MTc8L25zMTppZD48bnMxOnBhcj4xIDwvbnMxOnBhcj48bnMxOmF4aXN0aWM+PG5zMTp0eT4xPC9uczE6dHk+PG5zMTplaD48L25zMTplaD48L25zMTpheGlzdGljPjxuczE6bnVtPjE8L25zMTpudW0+PG5zMTpjcHI+MTwvbnMxOmNwcj48bnMxOmFuc3Q+MDwvbnMxOmFuc3Q+PG5zMTphcHJlPjI8L25zMTphcHJlPjxuczE6YWxvYz4wPC9uczE6YWxvYz48bnMxOmFzaG8+MTwvbnMxOmFzaG8+PG5zMTphY29sPjA8L25zMTphY29sPjxuczE6dGdlPjwvbnMxOnRnZT48bnMxOmFuZmM+MTwvbnMxOmFuZmM+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4xNjwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOm51bWJlcj48bnMxOnRleHQ+PG5zMTppZD4xODwvbnMxOmlkPjxuczE6cGFyPjE3IDwvbnMxOnBhcj48bnMxOnRleHRfPjxuczE6ZHg+MDwvbnMxOmR4PjxuczE6ZHk+MDwvbnMxOmR5PjxuczE6dD4wPC9uczE6dD48L25zMTp0ZXh0Xz48bnMxOmNocnM+MSAxIDEgMCAwIDEgMQo8L25zMTpjaHJzPjxuczE6ZGV0YT4xPC9uczE6ZGV0YT48bnMxOmF0dGE+MTwvbnMxOmF0dGE+PG5zMTp4PjQ5LjAwOTQzMzk2MjI2NDI8L25zMTp4PjxuczE6eT41MS4zOTExOTQ5Njg1NTM1PC9uczE6eT48bnMxOnc+MC43MDQ0MDI1MTU3MjMzPC9uczE6dz48bnMxOmg+MS42MTAwNjI4OTMwODE4PC9uczE6aD48bnMxOmF0Y28+MTwvbnMxOmF0Y28+PG5zMTphZm9uPjE8L25zMTphZm9uPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmxkaXM+MDwvbnMxOmxkaXM+PG5zMTp0Z3RyPjA8L25zMTp0Z3RyPjxuczE6dGd0Yj4wPC9uczE6dGd0Yj48bnMxOnRnZnI+MDwvbnMxOnRnZnI+PG5zMTp0Z2ZiPjA8L25zMTp0Z2ZiPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MDwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOnRleHQ+PG5zMTpheGVzXzNkPjxuczE6aWQ+MTk8L25zMTppZD48bnMxOmF4ZXMzZD48L25zMTpheGVzM2Q+PG5zMTp4bWluPuKIkjU8L25zMTp4bWluPjxuczE6eG1heD41PC9uczE6eG1heD48bnMxOnltaW4+4oiSNTwvbnMxOnltaW4+PG5zMTp5bWF4PjU8L25zMTp5bWF4PjxuczE6em1pbj7iiJI1PC9uczE6em1pbj48bnMxOnptYXg+NTwvbnMxOnptYXg+PG5zMTp4c2NhPjE8L25zMTp4c2NhPjxuczE6eXNjYT4xPC9uczE6eXNjYT48bnMxOnpzY2E+MTwvbnMxOnpzY2E+PG5zMTp4dG1vPjA8L25zMTp4dG1vPjxuczE6eXRtbz4wPC9uczE6eXRtbz48bnMxOnp0bW8+MDwvbnMxOnp0bW8+PG5zMTphbGNvPjY1NTM2PC9uczE6YWxjbz48bnMxOmFmY28+MTY3NzY5NTk8L25zMTphZmNvPjxuczE6YXNobz4xPC9uczE6YXNobz48bnMxOmFzYng+MTwvbnMxOmFzYng+PG5zMTphc2xnPjE8L25zMTphc2xnPjxuczE6YWFoZD4wPC9uczE6YWFoZD48bnMxOmFyc3Q+MDwvbnMxOmFyc3Q+PG5zMTphYWxoPjA8L25zMTphYWxoPjxuczE6YXRsaD4wPC9uczE6YXRsaD48bnMxOnByc3A+MTwvbnMxOnByc3A+PG5zMTp4bW5zPjE8L25zMTp4bW5zPjxuczE6eG14cz4xPC9uczE6eG14cz48bnMxOnltbnM+MTwvbnMxOnltbnM+PG5zMTp5bXhzPjE8L25zMTp5bXhzPjxuczE6em1ucz4xPC9uczE6em1ucz48bnMxOnpteHM+MTwvbnMxOnpteHM+PG5zMTp4dGNzPjE8L25zMTp4dGNzPjxuczE6eXRjcz4xPC9uczE6eXRjcz48bnMxOnp0Y3M+MTwvbnMxOnp0Y3M+PG5zMTp4YWxzPjE8L25zMTp4YWxzPjxuczE6eWFscz4xPC9uczE6eWFscz48bnMxOnphbHM+MTwvbnMxOnphbHM+PG5zMTp4YmxzPjE8L25zMTp4YmxzPjxuczE6eWJscz4xPC9uczE6eWJscz48bnMxOnpibHM+MTwvbnMxOnpibHM+PG5zMTp4bGxzPjE8L25zMTp4bGxzPjxuczE6eWxscz4xPC9uczE6eWxscz48bnMxOnpsbHM+MTwvbnMxOnpsbHM+PG5zMTp4YXNwPjE8L25zMTp4YXNwPjxuczE6eWFzcD4xPC9uczE6eWFzcD48bnMxOnphc3A+MTwvbnMxOnphc3A+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4wPC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6YXhlc18zZD48bnMxOmNhbWVyYTNkPjxuczE6aWQ+MjA8L25zMTppZD48bnMxOmNhbWVyYTNkX2U+PG5zMTpjaWR4PjQ8L25zMTpjaWR4PjwvbnMxOmNhbWVyYTNkX2U+PG5zMTpoYW5nPjAuNjEwOTwvbnMxOmhhbmc+PG5zMTp2YW5nPjIuNzkyNTwvbnMxOnZhbmc+PG5zMTpkaXN0PjEuOTwvbnMxOmRpc3Q+PG5zMTpsbnN4PjEuMDI0MTwvbnMxOmxuc3g+PG5zMTpsbnN5PjAuNjQ5ODwvbnMxOmxuc3k+PG5zMTpsbnN6PjEuNDYyNTwvbnMxOmxuc3o+PG5zMTpsb2t4PuKIkjEuMDI0MTwvbnMxOmxva3g+PG5zMTpsb2t5PuKIkjAuNjQ5ODwvbnMxOmxva3k+PG5zMTpsb2t6PuKIkjEuNDYyNTwvbnMxOmxva3o+PG5zMTp1cHg+MDwvbnMxOnVweD48bnMxOnVweT7iiJIxPC9uczE6dXB5PjxuczE6dXB6PjA8L25zMTp1cHo+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4xNjwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmNhbWVyYTNkPjxuczE6enRyYWNlM2Q+PG5zMTppZD4yMTwvbnMxOmlkPjxuczE6enRyYWNlM2RfZT48L25zMTp6dHJhY2UzZF9lPjxuczE6enBvcz4wPC9uczE6enBvcz48bnMxOmFsY28+NjU1MzY8L25zMTphbGNvPjxuczE6YWZjbz4yMDAzNDU1PC9uczE6YWZjbz48bnMxOmFiY28+MjAwMzQ1NTwvbnMxOmFiY28+PG5zMTphZGNwPjIwPC9uczE6YWRjcD48bnMxOmF0bnM+MjA8L25zMTphdG5zPjxuczE6YXNoZD4wPC9uczE6YXNoZD48bnMxOmFkZnQ+MTwvbnMxOmFkZnQ+PG5zMTphcmV4PjIxPC9uczE6YXJleD48bnMxOmFyZXk+MjE8L25zMTphcmV5PjxuczE6YXNobz4wPC9uczE6YXNobz48bnMxOmxibD48L25zMTpsYmw+PG5zMTpzdGF0PjE2PC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6enRyYWNlM2Q+PG5zMTpleHByZXNzaW9uPjxuczE6aWQ+MjI8L25zMTppZD48bnMxOnJfZXhwcj48L25zMTpyX2V4cHI+PG5zMTpleHByPjMqY29zKDIqeCsoKM+AKS8oMikpKSsxPC9uczE6ZXhwcj48bnMxOnBybXM+eDwvbnMxOnBybXM+PG5zMTp4dHBlPjE8L25zMTp4dHBlPjxuczE6YWNvbD42NTc5MTwvbnMxOmFjb2w+PG5zMTpyZWx2PjMqY29zKDIqeCsoKM+AKS8oMikpKSsxPC9uczE6cmVsdj48bnMxOmxibD5mMTwvbnMxOmxibD48bnMxOnN0YXQ+ODIwODwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmV4cHJlc3Npb24+PG5zMTpncmFwaD48bnMxOmlkPjIzPC9uczE6aWQ+PG5zMTpwYXI+MSAyMiA8L25zMTpwYXI+PG5zMTpncmFwaF9lPjxuczE6c3RlcD4wLjc2OTIzMDc2OTIzMDg8L25zMTpzdGVwPjxuczE6bm1wdD4yNTwvbnMxOm5tcHQ+PC9uczE6Z3JhcGhfZT48bnMxOmV4cHI+Mypjb3MoMip4Kygoz4ApLygyKSkpKzE8L25zMTpleHByPjxuczE6cHJlZj5mMSh4KTwvbnMxOnByZWY+PG5zMTp0eXBlPjA8L25zMTp0eXBlPjxuczE6YWxjbz42NTc5MTwvbnMxOmFsY28+PG5zMTphZmNvPjA8L25zMTphZmNvPjxuczE6YXBzdD4wPC9uczE6YXBzdD48bnMxOmFwdGg+MDwvbnMxOmFwdGg+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6YWxhcz4yPC9uczE6YWxhcz48bnMxOmFkc2M+MDwvbnMxOmFkc2M+PG5zMTphbHBzPjA8L25zMTphbHBzPjxuczE6bGJsPjwvbnMxOmxibD48bnMxOnN0YXQ+MDwvbnMxOnN0YXQ+PG5zMTpncGlkPjA8L25zMTpncGlkPjxuczE6cGluPjA8L25zMTpwaW4+PG5zMTpsaGY+PC9uczE6bGhmPjxuczE6ZGxjPjwvbnMxOmRsYz48bnMxOmRmYz48L25zMTpkZmM+PG5zMTpkYmM+PC9uczE6ZGJjPjwvbnMxOmdyYXBoPjxuczE6bGFiZWw+PG5zMTppZD4yNDwvbnMxOmlkPjxuczE6cGFyPjIzIDwvbnMxOnBhcj48bnMxOmxibF9nPjxuczE6dD7iiJIxMDwvbnMxOnQ+PG5zMTpkeD4wPC9uczE6ZHg+PG5zMTpkeT7iiJIwLjU8L25zMTpkeT48bnMxOnBzZXQ+MDwvbnMxOnBzZXQ+PG5zMTplcW5tPjA8L25zMTplcW5tPjwvbnMxOmxibF9nPjxuczE6Y2hycz4xIDEgMyAwIDAgMCBmMSh4KT0zKmNvcygyKngrz4AvMikrMQo8L25zMTpjaHJzPjxuczE6ZGV0YT4xPC9uczE6ZGV0YT48bnMxOmF0dGE+MTwvbnMxOmF0dGE+PG5zMTp4PjM0LjAxMjU3ODYxNjM1MjI8L25zMTp4PjxuczE6eT41NC43OTAzMTMzMDQxMjE3PC9uczE6eT48bnMxOnc+MTUuMTk0OTY4NTUzNDU5MTwvbnMxOnc+PG5zMTpoPjQuNzI5NTU5NzQ4NDI3NzwvbnMxOmg+PG5zMTphdGNvPjY1NzkxPC9uczE6YXRjbz48bnMxOmFmb24+MDwvbnMxOmFmb24+PG5zMTphc2hvPjE8L25zMTphc2hvPjxuczE6bGRpcz4wPC9uczE6bGRpcz48bnMxOnRndHI+MDwvbnMxOnRndHI+PG5zMTp0Z3RiPjA8L25zMTp0Z3RiPjxuczE6dGdmcj4wPC9uczE6dGdmcj48bnMxOnRnZmI+MDwvbnMxOnRnZmI+PG5zMTpsYmw+PC9uczE6bGJsPjxuczE6c3RhdD4wPC9uczE6c3RhdD48bnMxOmdwaWQ+MDwvbnMxOmdwaWQ+PG5zMTpwaW4+MDwvbnMxOnBpbj48bnMxOmxoZj48L25zMTpsaGY+PG5zMTpkbGM+PC9uczE6ZGxjPjxuczE6ZGZjPjwvbnMxOmRmYz48bnMxOmRiYz48L25zMTpkYmM+PC9uczE6bGFiZWw+PC9uczE6b2Jqcz48bnMxOnRvb2w+PG5zMTpUb29sRGlmZkVxR3JhcGhlcj48bnMxOnZpcz4wPC9uczE6dmlzPjwvbnMxOlRvb2xEaWZmRXFHcmFwaGVyPjxuczE6VG9vbDNER3JhcGhlcj48bnMxOnZpcz4wPC9uczE6dmlzPjxuczE6ZGhzPjwvbnMxOmRocz48bnMxOnBocz48L25zMTpwaHM+PG5zMTpzaHM+PC9uczE6c2hzPjwvbnMxOlRvb2wzREdyYXBoZXI+PG5zMTpUb29sQ29uaWM+PG5zMTp2aXM+MDwvbnMxOnZpcz48bnMxOmNocz48L25zMTpjaHM+PC9uczE6VG9vbENvbmljPjxuczE6VG9vbFNjYXR0ZXJQbG90R3JhcGhlcj48bnMxOnZpcz4wPC9uczE6dmlzPjxuczE6c2hzPjwvbnMxOnNocz48L25zMTpUb29sU2NhdHRlclBsb3RHcmFwaGVyPjxuczE6VG9vbEN1c3RvbUdyYXBoZXI+PG5zMTp2aXM+MDwvbnMxOnZpcz48bnMxOnBoaHM+PC9uczE6cGhocz48L25zMTpUb29sQ3VzdG9tR3JhcGhlcj48bnMxOlRvb2xTZXF1ZW5jZUdyYXBoZXI+PG5zMTp2aXM+MDwvbnMxOnZpcz48bnMxOnNxaHM+PC9uczE6c3Focz48L25zMTpUb29sU2VxdWVuY2VHcmFwaGVyPjxuczE6VG9vbEdyYXBoZXI+PG5zMTp2aXM+MTwvbnMxOnZpcz48bnMxOmRocz4qZjEqPC9uczE6ZGhzPjxuczE6cGhzPjwvbnMxOnBocz48bnMxOnBvaHM+PC9uczE6cG9ocz48bnMxOnNocz48L25zMTpzaHM+PC9uczE6VG9vbEdyYXBoZXI+PG5zMTpUb29sU2NhbGU+PG5zMTpsZW4+MjA8L25zMTpsZW4+PG5zMTp2aXM+MDwvbnMxOnZpcz48L25zMTpUb29sU2NhbGU+PG5zMTpUb29sR3JhcGhUcmFjZT48L25zMTpUb29sR3JhcGhUcmFjZT48bnMxOlRvb2xHcmFwaFRyYWNlQWxsPjwvbnMxOlRvb2xHcmFwaFRyYWNlQWxsPjwvbnMxOnRvb2w+PG5zMTphbmltPjA8L25zMTphbmltPjxuczE6dz4xMDA8L25zMTp3PjxuczE6aD4xMDA8L25zMTpoPjxuczE6dnB4PjM0LjAxMjU3ODYxNjM1MjI8L25zMTp2cHg+PG5zMTp2cHk+NTkuODc0MjEzODM2NDc4PC9uczE6dnB5PjxuczE6Z2Vvcz4xPC9uczE6Z2Vvcz48bnMxOmdlb3U+Y208L25zMTpnZW91PjxuczE6bW9kZT4xPC9uczE6bW9kZT48bnMxOnRyc3Q+4oiSMTwvbnMxOnRyc3Q+PG5zMTp0cm1kPjA8L25zMTp0cm1kPjxuczE6dHJwaT4wPC9uczE6dHJwaT48bnMxOnRyY20+MDwvbnMxOnRyY20+PG5zMTpia2dwPjA8L25zMTpia2dwPjxuczE6Z2NpZD4wPC9uczE6Z2NpZD48bnMxOnNjbGU+MTwvbnMxOnNjbGU+PG5zMTpyc2NsPjE8L25zMTpyc2NsPjxuczE6ZHBpaz4wPC9uczE6ZHBpaz48bnMxOnFtYXg+MDwvbnMxOnFtYXg+PG5zMTpwcmVrPjE8L25zMTpwcmVrPjxuczE6YXNwYT7iiJIxPC9uczE6YXNwYT48bnMxOmFzcHA+4oiSMTwvbnMxOmFzcHA+PG5zMTphc3BvPuKIkjE8L25zMTphc3BvPjxuczE6YWZzaD4xPC9uczE6YWZzaD48bnMxOmFjb2Q+MTwvbnMxOmFjb2Q+PC9uczE6ZmlnPjxuczE6d2RndCB0eXBlPSJDb250YWluZXIiPjwvbnMxOndkZ3Q+PG5zMTp3ZGd0IHR5cGU9Ik5ld0VkaXRpbmdMaW5lIj48L25zMTp3ZGd0PjxuczE6d2RndCB0eXBlPSJOZXdFZGl0aW5nTGluZSI+PC9uczE6d2RndD48bnMxOndkZ3QgdHlwZT0iTmV3RWRpdGluZ0xpbmUiPjwvbnMxOndkZ3Q+PG5zMTp3ZGd0IHR5cGU9Ik5ld0VkaXRpbmdMaW5lIj48L25zMTp3ZGd0PjxuczE6d2RndCB0eXBlPSJFZGl0aW5nTGluZSI+PC9uczE6d2RndD48bnMxOndkZ3QgdHlwZT0iRWRpdGluZ0xpbmUiPjwvbnMxOndkZ3Q+PG5zMTp3ZGd0IHR5cGU9IkVkaXRpbmdMaW5lIj48L25zMTp3ZGd0PjxuczE6d2RndCB0eXBlPSJFZGl0aW5nTGluZSI+PC9uczE6d2RndD48bnMxOndkZ3QgdHlwZT0iVGV4dEVkaXQiPjwvbnMxOndkZ3Q+PG5zMTp3ZGd0IHR5cGU9IkFtYmlndWl0eSI+PC9uczE6d2RndD48L25zMDp3ZGd0PjwvbnMwOmNhcmQ+";
const TI_GRAPH_SYMBOL_TEMPLATE_B64 = "PG5zMDplIHhtbG5zOm5zMD0idXJuOlRJLlByb2JsZW0iIHQ9IjYiIGY9IjAiIGM9IjI1NSI+PG5zMDpuPmYxPC9uczA6bj48bnMwOnA+eDwvbnMwOnA+PG5zMDp2PjMqY29zKDIqeCvPgC8yKSsxPC9uczA6dj48L25zMDplPg==";

function extractNotepadTextFromRawXml(rawXml = "") {
  if (!rawXml) return "";
  try {
    const doc = new DOMParser().parseFromString(rawXml, "application/xml");
    const fmtxt = doc.getElementsByTagNameNS("urn:TI.Notepad", "fmtxt")[0];
    if (!fmtxt) return "";
    const rich = new DOMParser().parseFromString(fmtxt.textContent || "", "application/xml");
    if (rich.querySelector("parsererror")) return fmtxt.textContent || "";
    const paragraphs = Array.from(rich.getElementsByTagName("node")).filter((node) => node.getAttribute("name") === "1para");
    if (!paragraphs.length) return rich.documentElement?.textContent || "";
    return paragraphs.map((para) => Array.from(para.getElementsByTagName("leaf"))
      .filter((leaf) => leaf.getAttribute("name") === "1word")
      .map((leaf) => leaf.textContent || "").join("")).join("\n");
  } catch (_) {
    return "";
  }
}

function buildTiNotepadRichText(text = "") {
  const escapeXml = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const paras = lines.map((line, index) => `<node name="1para"><node name="1rtline"><leaf name="1word" np="1" id0="0" pp0="${Math.max(0, line.length)}">${escapeXml(line)}${index === lines.length - 1 ? '<cursor index="0"/>' : ""}</leaf></node></node>`).join("");
  return `<r2dtotree version="1"><formatManager tableSize="1" capacity="10"><formatEntry entryIndex="0" entryID="0" entryRefCnt="6" tc="1" fc="268435199" fs="11" fst="0" cc="0" fest="0" feun="0" fesub="0" fesup="0" fn0="TI-Nspire Sans"></formatEntry></formatManager><node name="1doc">${paras}</node></r2dtotree>`;
}

async function addNotepadWidgetToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_note_current_file", currentFile);
  pyodide.globals.set("wasm_note_card_b64", TI_NOTEPAD_CARD_TEMPLATE_B64);
  const payload = await pyodide.runPythonAsync(`
import base64
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_note_current_file) if wasm_note_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try: rel = current_file.relative_to(source_root)
        except ValueError: rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists(): xml_file = candidate
if xml_file is None:
    problems = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    if problems: xml_file = problems[0]
if xml_file is None: raise RuntimeError("No XML file available for Notes")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
np_ns = "urn:TI.Notepad"
ET.register_namespace("", prob_ns)
ET.register_namespace("np", np_ns)
card = ET.fromstring(base64.b64decode(wasm_note_card_b64).decode("utf-8"))
for node in card.iter():
    if local_name(node.tag) == "fmtxt":
        node.text = '<r2dtotree version="1"><formatManager tableSize="1" capacity="10"><formatEntry entryIndex="0" entryID="0" entryRefCnt="1" tc="1" fc="268435199" fs="11" fst="0" cc="0" fest="0" feun="0" fesub="0" fesup="0" fn0="TI-Nspire Sans"></formatEntry></formatManager><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word" np="1" id0="0" pp0="0"><cursor index="0"/></leaf></node></node></node></r2dtotree>'
root.append(card)
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)
card_index = len([x for x in root if local_name(x.tag) == "card"])
wdgt = next((x for x in card if local_name(x.tag) == "wdgt"), None)
json.dumps({
    "type": "Widget", "name": "TI.Notepad", "file": str(xml_file),
    "path": f"/prob/card[{card_index}]/wdgt", "detail": {"length": 0},
    "content": "", "content_label": "Notepad",
    "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False) if wdgt is not None else ""
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  const item = JSON.parse(payload);
  xmlLog(t("notepadWidgetAdded"));
  return item;
}

async function saveNotepadWidgetToStage(item, text) {
  const currentFile = item?.file || "";
  pyodide.globals.set("wasm_note_save_file", currentFile);
  pyodide.globals.set("wasm_note_save_path", item?.path || "");
  pyodide.globals.set("wasm_note_save_rich", buildTiNotepadRichText(text));
  const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
source_file = Path(wasm_note_save_file) if wasm_note_save_file else None
xml_file = None
if source_file:
    try: rel = source_file.relative_to(stage_root)
    except ValueError:
        try: rel = source_file.relative_to(source_root)
        except ValueError: rel = Path(source_file.name)
    candidate = stage_root / rel
    if candidate.exists(): xml_file = candidate
if xml_file is None:
    problems = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    if problems: xml_file = problems[0]
if xml_file is None: raise RuntimeError("No XML file available for Notes save")

def parse_part(part):
    text = str(part or "")
    if text.endswith("]") and "[" in text:
        name, raw_index = text.rsplit("[", 1); raw_index = raw_index[:-1]
        if raw_index.isdigit(): return name, int(raw_index)
    return text, 1

def resolve_path(root, path):
    parts = [part for part in str(path or "").split("/") if part]
    if parts and parse_part(parts[0])[0] == local_name(root.tag): parts = parts[1:]
    current = root
    for part in parts:
        name, index = parse_part(part)
        matches = [child for child in current if local_name(child.tag) == name]
        if index < 1 or index > len(matches): return None
        current = matches[index - 1]
    return current

tree = ET.parse(xml_file); root = tree.getroot()
wdgt = resolve_path(root, wasm_note_save_path)
if wdgt is None or wdgt.attrib.get("type") != "TI.Notepad":
    matches = [node for node in root.iter() if local_name(node.tag) == "wdgt" and node.attrib.get("type") == "TI.Notepad"]
    if not matches: raise RuntimeError("TI.Notepad widget not found")
    wdgt = matches[-1]
fmtxt = next((node for node in wdgt.iter() if local_name(node.tag) == "fmtxt"), None)
if fmtxt is None: raise RuntimeError("np:fmtxt not found")
fmtxt.text = wasm_note_save_rich
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)
json.dumps({"file": str(xml_file), "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False)})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  return JSON.parse(payload);
}

function showNotepadModal(item) {
  const initialText = item?.content || extractNotepadTextFromRawXml(item?.raw_xml || "");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal note-page-modal">
      <div class="modal-top-actions">
        <button type="button" id="note-save" class="green-tool-button">${escapeHtml(t("notepadSave"))}</button>
        <button type="button" id="note-cancel">${escapeHtml(t("cancel"))}</button>
      </div>
      <h2>${escapeHtml(t("notepadTitle"))}</h2>
      <div class="note-calculator-shell">
        <div class="love-preview-calculator-bar">CALCULATOR VIEW</div>
        <textarea id="note-editor" spellcheck="false" aria-label="TI-Nspire Notes">${escapeHtml(initialText)}</textarea>
      </div>
    </div>`;
  document.body.append(backdrop);
  const editor = backdrop.querySelector("#note-editor");
  editor.focus();
  backdrop.querySelector("#note-cancel").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#note-save").addEventListener("click", async () => {
    try {
      const result = await saveNotepadWidgetToStage(item, editor.value);
      item.content = editor.value;
      item.raw_xml = result.raw_xml || item.raw_xml;
      xmlLog(`${t("notepadSave")}: ${editor.value.length} chars`);
      closeModal(backdrop);
    } catch (error) {
      xmlLog(`ERROR Notes Save: ${error.message}`);
    }
  });
}

function normalizeGraphFormulaInput(value = "") {
  return String(value || "").trim().replace(/^f\d+\s*\(\s*x\s*\)\s*=\s*/i, "").replace(/^y\s*=\s*/i, "") || "0";
}

function extractGraphStateFromRawXml(rawXml = "") {
  const state = { name: "f1", formula: "0" };
  if (!rawXml) return state;
  try {
    const doc = new DOMParser().parseFromString(rawXml, "application/xml");
    const expressions = Array.from(doc.getElementsByTagNameNS("urn:TI.GeoGrapher", "expression"));
    const expression = expressions[0];
    if (expression) {
      const label = expression.getElementsByTagNameNS("urn:TI.GeoGrapher", "lbl")[0]?.textContent?.trim();
      const expr = expression.getElementsByTagNameNS("urn:TI.GeoGrapher", "expr")[0]?.textContent?.trim();
      if (label) state.name = label;
      if (expr) state.formula = expr;
    }
  } catch (_) {}
  return state;
}

function graphFormulaToLuaExpression(formula = "") {
  let expr = normalizeGraphFormulaInput(formula)
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/(?<!\.)\bpi\b/gi, "math.pi")
    .replace(/π/g, "math.pi")
    .replace(/\bln\s*\(/gi, "math.log(");
  expr = expr.replace(/(?<!\.)\b(sin|cos|tan|sqrt|abs|exp|log|floor|ceil)\s*\(/gi, (match, name) => `math.${name.toLowerCase()}(`);
  expr = expr.replace(/(?<![A-Za-z0-9_.])(-?\d+(?:\.\d+)?)\s*x\b/g, "$1*x");
  return expr;
}

function buildGraphPreviewLua(formula = "0", functionName = "f1") {
  const safeName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(functionName) ? functionName : "f1";
  const luaExpr = graphFormulaToLuaExpression(formula);
  const shown = normalizeGraphFormulaInput(formula).replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
  return `platform.apilevel = '2.3'
local xmin, xmax = -10, 10
local ymin, ymax = -6.6666666667, 6.6666666667
local formula = "${shown}"
local function f(x)
  local ok, value = pcall(function() return ${luaExpr} end)
  if ok and type(value) == "number" then return value end
  return nil
end
local function sx(x,w) return (x-xmin)/(xmax-xmin)*w end
local function sy(y,h) return h-(y-ymin)/(ymax-ymin)*h end
function on.paint(gc)
  local w,h = platform.window:width(), platform.window:height()
  local top = 31
  gc:setColorRGB(255,255,255); gc:fillRect(0,0,w,h)
  gc:setColorRGB(248,248,248); gc:fillRect(0,0,w,top)
  gc:setColorRGB(38,143,209); gc:drawLine(0,top-1,w,top-1)
  gc:setColorRGB(0,0,0); gc:setFont("sansserif","r",10)
  gc:drawString("□",10,7,"top"); gc:drawString("${safeName}(x)=",39,7,"top"); gc:drawString(formula,83,7,"top")
  gc:setColorRGB(0,0,0)
  local xzero=sx(0,w); local yzero=top+sy(0,h-top)
  gc:drawLine(0,yzero,w,yzero); gc:drawLine(xzero,top,xzero,h)
  for x=-10,10,5 do local px=sx(x,w); gc:drawLine(px,yzero-2,px,yzero+2) end
  for y=-5,5,5 do local py=top+sy(y,h-top); gc:drawLine(xzero-2,py,xzero+2,py) end
  gc:setColorRGB(0,0,255)
  local lastx,lasty=nil,nil
  for px=0,w-1 do
    local x=xmin+(px/(w-1))*(xmax-xmin)
    local y=f(x)
    if y and y==y and math.abs(y)<1e9 then
      local py=top+sy(y,h-top)
      if lastx and math.abs(py-lasty)<h then gc:drawLine(lastx,lasty,px,py) end
      lastx,lasty=px,py
    else lastx,lasty=nil,nil end
  end
end`;
}



const TI_CALCULATOR_AUTH_B64 = "PHIyZHRvdHJlZSB2ZXJzaW9uPSIxIj48Zm9ybWF0TWFuYWdlciB0YWJsZVNpemU9IjMiIGNhcGFjaXR5PSIxMCI+PGZvcm1hdEVudHJ5IGVudHJ5SW5kZXg9IjAiIGVudHJ5SUQ9IjAiIGVudHJ5UmVmQ250PSIzIiB0Yz0iMSIgZmM9IjI2ODQzNTE5OSIgZnM9IjExIiBmc3Q9IjAiIGNjPSIwIiBmZXN0PSIwIiBmZXVuPSIwIiBmZXN1Yj0iMCIgZmVzdXA9IjAiIGZuMD0iVEktTnNwaXJlIj48L2Zvcm1hdEVudHJ5Pjxmb3JtYXRFbnRyeSBlbnRyeUluZGV4PSIxIiBlbnRyeUlEPSIxIiBlbnRyeVJlZkNudD0iMCIgdGM9IjEiIGZjPSIyNjg0MzUxOTkiIGZzPSIxMSIgZnN0PSIyIiBjYz0iMCIgZmVzdD0iMCIgZmV1bj0iMCIgZmVzdWI9IjAiIGZlc3VwPSIwIiBmbjA9IlRJLU5zcGlyZSI+PC9mb3JtYXRFbnRyeT48Zm9ybWF0RW50cnkgZW50cnlJbmRleD0iMiIgZW50cnlJRD0iMiIgZW50cnlSZWZDbnQ9IjAiIHRjPSIxIiBmYz0iMjY4NDM1MTk5IiBmcz0iMTEiIGZzdD0iMCIgY2M9IjEiIGZlc3Q9IjAiIGZldW49IjAiIGZlc3ViPSIwIiBmZXN1cD0iMCIgZm4wPSJUSS1Oc3BpcmUiPjwvZm9ybWF0RW50cnk+PC9mb3JtYXRNYW5hZ2VyPjxub2RlIG5hbWU9IjBlbCIgaWQwPSIwIj48bGVhZiBuYW1lPSIwdGV4dCIgbnA9IjEiIGlkMD0iMCIgcHAwPSIwIj48Y3Vyc29yIGluZGV4PSIwIi8+PC9sZWFmPjwvbm9kZT48L3IyZHRvdHJlZT4=";
const TI_CALCULATOR_TEMPLATES = [
["01_fraccion.jpg","()/()","Fracción"],["02_exponente.jpg","^()","Exponente"],["03_raiz_cuadrada.jpg","√()","Raíz cuadrada"],["04_raiz_enesima.jpg","root(,)","Raíz enésima"],["05_exponencial_e.jpg","e^()","Exponencial e"],["06_logaritmo_base.jpg","log(,)","Logaritmo base"],["07_funcion_por_partes_2.jpg","piecewise(, , , )","Función por partes"],["08_funcion_por_partes_n.jpg","piecewise(, , , , , )","Función por partes N"],["09_sistema_2_ecuaciones.jpg","system(,)","Sistema 2"],["10_sistema_n_ecuaciones.jpg","system(,,)","Sistema N"],["11_valor_absoluto.jpg","abs()","Valor absoluto"],["12_grados_minutos_segundos.jpg","30°30'0''","Grados/min/seg"],["13_matriz_2x2.jpg","[[1,2][3,4]]","Matriz 2×2"],["14_matriz_1x2.jpg","[[1,2]]","Matriz 1×2"],["15_matriz_2x1.jpg","[[1][2]]","Matriz 2×1"],["16_matriz_mxn.jpg","[[1,2][3,4][5,6]]","Matriz M×N"],["17_sumatoria.jpg","∑(k,k,1,4)","Sumatoria"],["18_productoria.jpg","∏(k,k,1,4)","Productoria"],["19_primera_derivada.jpg","d(x^2,x)","Primera derivada"],["20_segunda_derivada.jpg","d(x^2,x,2)","Segunda derivada"],["21_derivada_enesima.jpg","d(x^4,x,3)","Derivada enésima"],["22_integral_definida.jpg","∫(x,x,0,2)","Integral definida"],["23_integral_indefinida.jpg","∫(x^2,x)","Integral indefinida"],["24_limite.jpg","lim(sin(x)/x,x,0)","Límite"],["25_indicador_blanco_negro.jpg","","Indicador"]];
function extractCalculatorRowsFromRawXml(rawXml=""){const rows=[];try{const d=new DOMParser().parseFromString(String(rawXml||""),"application/xml");for(const e of Array.from(d.getElementsByTagNameNS("urn:TI.Scratchpad","erow"))){const g=n=>e.getElementsByTagNameNS("urn:TI.Scratchpad",n)[0]?.textContent||"";rows.push({entry:g("entr"),exact:g("exct"),display:g("disp"),full:g("full")||g("disp")});}}catch(_){ }return rows;}
function normalizeCalculatorEntry(t=""){return String(t||"").replace(/−/g,"-").replace(//g,"e").replace(//g,"d").trim();}
function calcNum(expr,vars={}){let s=normalizeCalculatorEntry(expr).replace(/π/g,"Math.PI").replace(/\be\b/g,"Math.E").replace(/\^/g,"**").replace(/√\s*\(/g,"Math.sqrt(").replace(/\bsin\s*\(/gi,"Math.sin(").replace(/\bcos\s*\(/gi,"Math.cos(").replace(/\btan\s*\(/gi,"Math.tan(").replace(/\bln\s*\(/gi,"Math.log(").replace(/\babs\s*\(/gi,"Math.abs(");s=s.replace(/\blog\(([^,]+),([^\)]+)\)/gi,"(Math.log($1)/Math.log($2))").replace(/\broot\(([^,]+),([^\)]+)\)/gi,"Math.pow($1,1/($2))");try{const f=Function(...Object.keys(vars),`"use strict";return (${s});`),v=f(...Object.values(vars));return typeof v==="number"&&Number.isFinite(v)?v:NaN;}catch(_){return NaN;}}
function calcFmt(v){return !Number.isFinite(v)?"":Math.abs(v-Math.round(v))<1e-10?String(Math.round(v)):String(Number(v.toPrecision(12)));}
function calculateScratchpadRow(entry){const raw=String(entry||"").trim(),s=normalizeCalculatorEntry(raw);let display="",m;if((m=s.match(/^∑\((.+),([A-Za-z]+),([^,]+),([^\)]+)\)$/))){let lo=Math.round(calcNum(m[3])),hi=Math.round(calcNum(m[4])),v=0;for(let k=lo;k<=hi;k++){const q=calcNum(m[1],{[m[2]]:k});if(!Number.isFinite(q)){v=NaN;break;}v+=q;}display=calcFmt(v);}else if((m=s.match(/^∏\((.+),([A-Za-z]+),([^,]+),([^\)]+)\)$/))){let lo=Math.round(calcNum(m[3])),hi=Math.round(calcNum(m[4])),v=1;for(let k=lo;k<=hi;k++){const q=calcNum(m[1],{[m[2]]:k});if(!Number.isFinite(q)){v=NaN;break;}v*=q;}display=calcFmt(v);}else if((m=s.match(/^d\(([A-Za-z]+)\^([0-9]+),([A-Za-z]+)(?:,([0-9]+))?\)$/))){let p=+m[2],o=+(m[4]||1),c=1;if(m[1]===m[3]&&o<=p){for(let i=0;i<o;i++)c*=p-i;let r=p-o;display=r===0?String(c):r===1?`${c}*${m[3]}`:`${c}*${m[3]}^${r}`;}}else if((m=s.match(/^∫\(([A-Za-z]+)\^([0-9]+),([A-Za-z]+)\)$/))&&m[1]===m[3]){let p=+m[2];display=`${m[3]}^${p+1}/${p+1}`;}else if(/^lim\(sin\(x\)\/x,x,0\)$/i.test(s))display="1";else if((m=s.match(/^system\((.*)\)$/)))display=`{${m[1]}}`;else{display=calcFmt(calcNum(s));}return{entry:raw,exact:s.replace(/\^([0-9]+)/g,"^($1)"),display:display||raw,full:display||raw};}
function cMeasure(ctx,t,font="15px Arial"){ctx.save();ctx.font=font;const w=ctx.measureText(String(t)).width;ctx.restore();return w;}
function cTopSlash(t){let d=0;for(let i=0;i<t.length;i++){if("([{ ".includes(t[i]))d++;else if(")] }".includes(t[i]))d=Math.max(0,d-1);else if(t[i]==="/"&&d===0)return i;}return-1;}
function drawCalculatorInlineV2(ctx,text,x,y,fontSize=15){
  const raw=String(text||'');
  const m=raw.match(/^(.+?)\^\(?([^()]+)\)?$/);
  ctx.save();ctx.fillStyle='#111';ctx.textBaseline='alphabetic';
  if(m){ctx.font=`${fontSize}px serif`;ctx.fillText(m[1],x,y);const bw=ctx.measureText(m[1]).width;ctx.font=`${Math.max(9,fontSize-5)}px serif`;ctx.fillText(m[2],x+bw+1,y-Math.max(6,fontSize*.48));}
  else{ctx.font=`${fontSize}px serif`;ctx.fillText(raw,x,y);}
  ctx.restore();
}

function drawCalculatorMath(ctx,raw,x,y,max=210,depth=0){
  const t=String(raw||"").replace(/−/g,"-").replace(//g,"e").replace(//g,"d");
  ctx.save();ctx.fillStyle="#111";ctx.strokeStyle="#111";ctx.lineWidth=1;ctx.textBaseline="alphabetic";ctx.font="15px serif";
  if(depth>5){ctx.fillText(t,x,y);ctx.restore();return;}

  if(/^\[\[.*\]\]$/.test(t)){
    const rs=Array.from(t.matchAll(/\[([^\[\]]*)\]/g)).map(m=>m[1].split(",")),cols=Math.max(1,...rs.map(r=>r.length)),cw=27,ch=18,L=x+5,T=y-15,R=L+cols*cw;
    ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(L-4,T);ctx.lineTo(L-4,T+rs.length*ch);ctx.lineTo(L,T+rs.length*ch);ctx.moveTo(R,T);ctx.lineTo(R+4,T);ctx.lineTo(R+4,T+rs.length*ch);ctx.lineTo(R,T+rs.length*ch);ctx.stroke();
    rs.forEach((r,ri)=>r.forEach((v,ci)=>drawCalculatorInlineV2(ctx,v.trim(),L+ci*cw+5,T+14+ri*ch,15)));ctx.restore();return;
  }

  let m=t.match(/^root\((.*),([^,()]+)\)$/);
  if(m){
    const body=m[1],index=m[2];ctx.font="9px serif";ctx.fillText(index,x,y-11);ctx.font="25px serif";ctx.fillText("√",x+6,y+3);
    const bodyX=x+23;drawCalculatorInlineV2(ctx,body,bodyX,y,15);const bw=Math.max(12,cMeasure(ctx,body,"15px serif"));ctx.beginPath();ctx.moveTo(x+20,y-15);ctx.lineTo(bodyX+bw+3,y-15);ctx.stroke();ctx.restore();return;
  }
  m=t.match(/^√\((.*)\)$/);
  if(m){ctx.font="25px serif";ctx.fillText("√",x,y+3);const bodyX=x+17;drawCalculatorInlineV2(ctx,m[1],bodyX,y,15);const bw=Math.max(12,cMeasure(ctx,m[1],"15px serif"));ctx.beginPath();ctx.moveTo(x+14,y-15);ctx.lineTo(bodyX+bw+3,y-15);ctx.stroke();ctx.restore();return;}

  m=t.match(/^d\((.*),([A-Za-z]+)(?:,([^()]+))?\)$/);
  if(m){
    const expr=m[1],variable=m[2],order=String(m[3]||"1"),fracW=order==="1"?24:30;
    ctx.textAlign="center";ctx.font="15px serif";ctx.fillText("d",x+fracW/2,y-5);
    if(order!=="1"){ctx.font="9px serif";ctx.fillText(order,x+fracW/2+6,y-12);}
    ctx.beginPath();ctx.moveTo(x+1,y);ctx.lineTo(x+fracW-1,y);ctx.stroke();
    ctx.font="15px serif";ctx.fillText(`d${variable}`,x+fracW/2,y+15);
    if(order!=="1"){ctx.font="9px serif";ctx.fillText(order,x+fracW/2+9,y+7);}
    ctx.textAlign="left";ctx.font="15px serif";ctx.fillText("(",x+fracW+3,y+3);drawCalculatorMath(ctx,expr,x+fracW+9,y+3,max-fracW-16,depth+1);const ew=Math.min(100,cMeasure(ctx,expr,"15px serif"));ctx.fillText(")",x+fracW+12+ew,y+3);ctx.restore();return;
  }

  m=t.match(/^∫\((.*),([A-Za-z]+),([^,]+),([^\)]+)\)$/);
  if(m){ctx.font="28px serif";ctx.fillText("∫",x,y+4);ctx.font="10px serif";ctx.fillText(m[4],x+4,y-15);ctx.fillText(m[3],x+4,y+14);drawCalculatorMath(ctx,m[1],x+23,y,max-50,depth+1);const bw=Math.min(120,cMeasure(ctx,m[1],"15px serif"));ctx.font="15px serif";ctx.fillText(`d${m[2]}`,x+29+bw,y);ctx.restore();return;}
  m=t.match(/^∫\((.*),([A-Za-z]+)\)$/);
  if(m){ctx.font="28px serif";ctx.fillText("∫",x,y+4);drawCalculatorMath(ctx,m[1],x+19,y,max-45,depth+1);const bw=Math.min(120,cMeasure(ctx,m[1],"15px serif"));ctx.font="15px serif";ctx.fillText(`d${m[2]}`,x+25+bw,y);ctx.restore();return;}

  m=t.match(/^[∑∏]\((.*),([A-Za-z]+),([^,]+),([^\)]+)\)$/);
  if(m){ctx.font="30px serif";ctx.fillText(t[0],x,y+3);ctx.font="9px serif";ctx.fillText(m[4],x+8,y-18);ctx.fillText(`${m[2]}=${m[3]}`,x+2,y+16);drawCalculatorMath(ctx,m[1],x+30,y,max-35,depth+1);ctx.restore();return;}
  m=t.match(/^lim\((.*),([A-Za-z]+),([^\)]+)\)$/);
  if(m){ctx.font="15px serif";ctx.fillText("lim",x,y-3);ctx.font="9px serif";ctx.fillText(`${m[2]}→${m[3]}`,x-1,y+10);drawCalculatorMath(ctx,m[1],x+29,y,max-34,depth+1);ctx.restore();return;}

  m=t.match(/^system\((.*)\)$/i);
  if(m){const parts=m[1].split(",").map(v=>v.trim()).filter(Boolean);ctx.font="38px serif";ctx.fillText("{",x,y+7);ctx.font="12px serif";parts.slice(0,4).forEach((v,i)=>ctx.fillText(v.replace(/\*/g,"·"),x+17,y-12+i*15));ctx.restore();return;}
  m=t.match(/^piecewise\((.*)\)$/i);
  if(m){const parts=m[1].split(",").map(v=>v.trim());ctx.font="38px serif";ctx.fillText("{",x,y+7);ctx.font="11px serif";for(let i=0;i+1<parts.length&&i<6;i+=2)ctx.fillText(`${parts[i]},  ${parts[i+1]}`,x+17,y-12+(i/2)*15);ctx.restore();return;}
  m=t.match(/^abs\((.*)\)$/i);
  if(m){ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x,y+7);ctx.moveTo(x+8+cMeasure(ctx,m[1]),y-15);ctx.lineTo(x+8+cMeasure(ctx,m[1]),y+7);ctx.stroke();drawCalculatorMath(ctx,m[1],x+5,y,max-12,depth+1);ctx.restore();return;}
  m=t.match(/^log\((.*),([^,()]+)\)$/i);
  if(m){ctx.font="15px serif";ctx.fillText("log",x,y);ctx.font="9px serif";ctx.fillText(m[2],x+20,y+6);ctx.font="15px serif";ctx.fillText("(",x+28,y);drawCalculatorMath(ctx,m[1],x+34,y,max-45,depth+1);ctx.fillText(")",x+37+cMeasure(ctx,m[1]),y);ctx.restore();return;}

  const slash=cTopSlash(t);
  if(slash>0&&slash<t.length-1&&t.length<48){
    const a=t.slice(0,slash).trim(),b=t.slice(slash+1).trim(),aw=Math.max(14,cMeasure(ctx,a,"15px serif")),bw=Math.max(14,cMeasure(ctx,b,"15px serif")),W=Math.max(aw,bw)+10;
    drawCalculatorInlineV2(ctx,a,x+(W-aw)/2,y-6,15);drawCalculatorInlineV2(ctx,b,x+(W-bw)/2,y+14,15);ctx.beginPath();ctx.moveTo(x+2,y);ctx.lineTo(x+W-2,y);ctx.stroke();ctx.restore();return;
  }
  m=t.match(/^(.*)\^\(?([^\)]+)\)?$/);
  if(m&&m[1].length<32&&m[2].length<14){drawCalculatorInlineV2(ctx,t,x,y,15);ctx.restore();return;}
  ctx.font="15px Arial";ctx.fillText(t.replace(/\*/g,"·").length>44?t.replace(/\*/g,"·").slice(0,43)+"…":t.replace(/\*/g,"·"),x,y);ctx.restore();
}
function drawCalculatorScratchpadPreview(canvas,rows=[],sel=-1,scroll=0){const ctx=canvas.getContext("2d"),w=canvas.width||320,h=canvas.height||214,rowH=53,vis=5,start=Math.max(0,Math.min(Math.max(0,rows.length-vis),scroll));ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);rows.slice(start,start+vis).forEach((r,i)=>{let gi=start+i,top=i*rowH;ctx.fillStyle=gi===sel?"#75cbe9":(gi%2?"#f7f7f7":"#fff");ctx.fillRect(0,top,w-12,rowH-1);drawCalculatorMath(ctx,r.entry||"",8,top+29,200);let res=r.display||r.full||"";if(res)drawCalculatorMath(ctx,res,Math.max(190,w-22-Math.min(120,cMeasure(ctx,res))),top+29,120);});ctx.fillStyle="#f5f5f5";ctx.fillRect(w-12,0,12,h);if(rows.length>vis){let th=Math.max(22,h*vis/rows.length),ty=(h-th)*start/Math.max(1,rows.length-vis);ctx.fillStyle="#aaa";ctx.fillRect(w-9,ty+2,6,th-4);}}

const CALCULATOR_COMPOSER_RESERVED_HEIGHT = 58;


const CALC_LOVE_PLACEHOLDER = "□";
const CALC_LOVE_SLOT_OPEN = "〖";
const CALC_LOVE_SLOT_CLOSE = "〗";
const calculatorLoveSlot = (value = CALC_LOVE_PLACEHOLDER) => `${CALC_LOVE_SLOT_OPEN}${value}${CALC_LOVE_SLOT_CLOSE}`;

function calculatorLovePlainSource(stateOrSource) {
  const source = typeof stateOrSource === "string" ? stateOrSource : String(stateOrSource?.source || "");
  return source.split(CALC_LOVE_SLOT_OPEN).join("").split(CALC_LOVE_SLOT_CLOSE).join("");
}

function calculatorLoveTemplateSource(file = "") {
  const type = calculatorTemplateType(file);
  const p = () => calculatorLoveSlot();
  return ({
    fraction:`(${p()})/(${p()})`, power:`(${p()})^(${p()})`, sqrt:`√(${p()})`, root:`root(${p()},${p()})`,
    exp:`e^(${p()})`, log:`log(${p()},${p()})`, piecewise2:`piecewise(${p()},${p()},${p()},${p()})`,
    piecewise3:`piecewise(${p()},${p()},${p()},${p()},${p()},${p()})`, system2:`system(${p()},${p()})`,
    system3:`system(${p()},${p()},${p()})`, abs:`abs(${p()})`, dms:`${p()}°${p()}'${p()}\"`,
    matrix22:`[[${p()},${p()}][${p()},${p()}]]`, matrix12:`[[${p()},${p()}]]`, matrix21:`[[${p()}][${p()}]]`,
    matrix32:`[[${p()},${p()}][${p()},${p()}][${p()},${p()}]]`, sum:`∑(${p()},${p()},${p()},${p()})`,
    product:`∏(${p()},${p()},${p()},${p()})`, derivative1:`d(${p()},${p()})`, derivative2:`d(${p()},${p()},2)`,
    derivativeN:`d(${p()},${p()},${p()})`, integralDef:`∫(${p()},${p()},${p()},${p()})`, integral:`∫(${p()},${p()})`,
    limit:`lim(${p()},${p()},${p()})`, plain:p(),
  })[type] || p();
}

function calculatorLoveNewState() {
  return { source:"", caret:0, preferredX:null };
}

function calculatorLoveClampCaret(state) {
  const len=String(state.source||"").length;
  state.caret=Math.max(0,Math.min(len,Number(state.caret)||0));
}

function calculatorLoveInsert(state, text) {
  const src=String(state.source||"");
  calculatorLoveClampCaret(state);
  const at=state.caret;
  const insert=String(text||"");
  // A highlighted empty MathPrint box is replaced rather than left beside text.
  if(src[at]===CALC_LOVE_PLACEHOLDER){
    state.source=src.slice(0,at)+insert+src.slice(at+1);
    state.caret=at+insert.length;
  }else{
    state.source=src.slice(0,at)+insert+src.slice(at);
    state.caret=at+insert.length;
  }
}

function calculatorLoveInsertTemplate(state,file){
  const src=String(state.source||"");
  calculatorLoveClampCaret(state);
  const templ=calculatorLoveTemplateSource(file);
  let at=state.caret, remove=0;
  if(src[at]===CALC_LOVE_PLACEHOLDER) remove=1;
  else if(at>0 && src[at-1]===CALC_LOVE_PLACEHOLDER){at-=1;remove=1;}
  let insert=templ;
  if(!remove && at>0 && /[0-9A-Za-z_\)\]〗]/.test(src[at-1]||"")) insert="*"+templ;
  state.source=src.slice(0,at)+insert+src.slice(at+remove);
  const first=insert.indexOf(CALC_LOVE_PLACEHOLDER);
  state.caret=at+(first>=0?first:insert.length);
}

function calculatorLoveBackspace(state){
  calculatorLoveClampCaret(state);
  const src=String(state.source||"");
  if(state.caret<=0)return;
  // Delete a whole empty template when possible.
  const e=calculatorLoveSlot();
  const emptyPatterns=[`(${e})/(${e})`,`(${e})^(${e})`,`√(${e})`,`root(${e},${e})`,`abs(${e})`,`e^(${e})`,`log(${e},${e})`];
  for(const pat of emptyPatterns){
    const from=Math.max(0,state.caret-pat.length);
    const idx=src.lastIndexOf(pat,state.caret);
    if(idx>=0 && idx<=state.caret && state.caret<=idx+pat.length){
      state.source=src.slice(0,idx)+src.slice(idx+pat.length);state.caret=idx;return;
    }
  }
  const prev=src[state.caret-1];
  if(prev===CALC_LOVE_SLOT_OPEN||prev===CALC_LOVE_SLOT_CLOSE){calculatorLoveMove(state,-1);return;}
  state.source=src.slice(0,state.caret-1)+src.slice(state.caret);state.caret-=1;
}

function calculatorLoveDelete(state){
  calculatorLoveClampCaret(state);
  const src=String(state.source||"");
  if(state.caret>=src.length)return;
  if(src[state.caret]===CALC_LOVE_SLOT_OPEN||src[state.caret]===CALC_LOVE_SLOT_CLOSE){calculatorLoveMove(state,1);return;}
  state.source=src.slice(0,state.caret)+src.slice(state.caret+1);
}

function calculatorLoveSlotRanges(source=""){
  const out=[],stack=[];const s=String(source||"");
  for(let i=0;i<s.length;i++){
    if(s[i]===CALC_LOVE_SLOT_OPEN)stack.push(i);
    else if(s[i]===CALC_LOVE_SLOT_CLOSE&&stack.length){const start=stack.pop();out.push({open:start,start:start+1,end:i,close:i});}
  }
  return out.sort((a,b)=>a.open-b.open);
}

function calculatorLoveMove(state,delta){
  calculatorLoveClampCaret(state);const s=String(state.source||"");const ranges=calculatorLoveSlotRanges(s);let c=state.caret;
  if(!ranges.length){state.caret=Math.max(0,Math.min(s.length,c+delta));return;}
  const inside=ranges.filter(r=>c>=r.start&&c<=r.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
  if(delta>0){
    if(inside && c<inside.end){state.caret=c+1;return;}
    const next=ranges.find(r=>r.start>c);state.caret=next?next.start:s.length;return;
  }
  if(inside && c>inside.start){state.caret=c-1;return;}
  const prev=[...ranges].reverse().find(r=>r.end<c);state.caret=prev?prev.end:0;
}

function calculatorLoveComplete(state){
  const s=String(state?.source||"").trim();
  return Boolean(s)&&!s.includes(CALC_LOVE_PLACEHOLDER);
}

function calculatorLoveSplitArgs(inner,base=0){
  const out=[];let depth=0,start=0;
  for(let i=0;i<inner.length;i++){
    const c=inner[i];
    if(c==='('||c==='['||c==='{')depth++;
    else if(c===')'||c===']'||c==='}')depth=Math.max(0,depth-1);
    else if(c===','&&depth===0){out.push({text:inner.slice(start,i),base:base+start});start=i+1;}
  }
  out.push({text:inner.slice(start),base:base+start});return out;
}

function calculatorLoveWrapped(s){
  if(!(s.startsWith('(')&&s.endsWith(')')))return false;
  let d=0;
  for(let i=0;i<s.length;i++){
    if(s[i]==='(')d++;else if(s[i]===')')d--;
    if(d===0&&i<s.length-1)return false;
  }
  return d===0;
}

function calculatorLoveFindTop(s,ops,rtl=false){
  let d=0;const start=rtl?s.length-1:0,end=rtl?-1:s.length,step=rtl?-1:1;
  for(let i=start;i!==end;i+=step){
    const c=s[i];
    if(rtl){if(c===')'||c===']'||c==='}')d++;else if(c==='('||c==='['||c==='{')d--;}
    else{if(c==='('||c==='['||c==='{')d++;else if(c===')'||c===']'||c==='}')d--;}
    if(d===0&&ops.includes(c)){
      if((c==='+'||c==='-')&&(i===0||'+-*/^(,'.includes(s[i-1])))continue;
      return i;
    }
  }
  return -1;
}

function calculatorLoveParse(source,base=0,ctx=null){
  ctx=ctx||{ph:0};
  let raw=String(source??''),lead=raw.length-raw.trimStart().length,trail=raw.trimEnd().length;
  let s=raw.slice(lead,trail),b=base+lead;
  if(!s)return {k:'text',text:'',start:b,end:b};
  let normalized=true;
  while(normalized){
    normalized=false;
    if(s===CALC_LOVE_PLACEHOLDER)return {k:'placeholder',ph:ctx.ph++,start:b,end:b+1};
    if(s.startsWith(CALC_LOVE_SLOT_OPEN) && s.endsWith(CALC_LOVE_SLOT_CLOSE)){
      s=s.slice(CALC_LOVE_SLOT_OPEN.length,-CALC_LOVE_SLOT_CLOSE.length);b+=CALC_LOVE_SLOT_OPEN.length;normalized=true;
      if(!s)return {k:'placeholder',ph:ctx.ph++,start:b,end:b};
      continue;
    }
    if(calculatorLoveWrapped(s)){s=s.slice(1,-1);b+=1;normalized=true;if(!s)return {k:'text',text:'',start:b,end:b};}
  }

  // Matrix rows: [[a,b][c,d]]
  if(s.startsWith('[[')&&s.endsWith(']]')){
    const rows=[];let i=1;
    while(i<s.length-1){
      if(s[i]!=='['){i++;continue;}let d=1,j=i+1;
      while(j<s.length&&d){if(s[j]==='[')d++;else if(s[j]===']')d--;j++;}
      const inner=s.slice(i+1,j-1);rows.push(calculatorLoveSplitArgs(inner,b+i+1).map(a=>calculatorLoveParse(a.text,a.base,ctx)));i=j;
    }
    if(rows.length)return {k:'matrix',rows,start:b,end:b+s.length};
  }

  const call=(name)=>s.startsWith(name+'(')&&s.endsWith(')');
  if(s.startsWith('√(')&&s.endsWith(')'))return {k:'sqrt',body:calculatorLoveParse(s.slice(2,-1),b+2,ctx),start:b,end:b+s.length};
  if(call('root')){const a=calculatorLoveSplitArgs(s.slice(5,-1),b+5);if(a.length>=2)return {k:'root',body:calculatorLoveParse(a[0].text,a[0].base,ctx),index:calculatorLoveParse(a[1].text,a[1].base,ctx),start:b,end:b+s.length};}
  if(call('abs'))return {k:'abs',body:calculatorLoveParse(s.slice(4,-1),b+4,ctx),start:b,end:b+s.length};
  if(call('log')){const a=calculatorLoveSplitArgs(s.slice(4,-1),b+4);if(a.length>=2)return {k:'log',body:calculatorLoveParse(a[0].text,a[0].base,ctx),baseNode:calculatorLoveParse(a[1].text,a[1].base,ctx),start:b,end:b+s.length};}
  if(call('lim')){const a=calculatorLoveSplitArgs(s.slice(4,-1),b+4);if(a.length>=3)return {k:'limit',body:calculatorLoveParse(a[0].text,a[0].base,ctx),variable:calculatorLoveParse(a[1].text,a[1].base,ctx),to:calculatorLoveParse(a[2].text,a[2].base,ctx),start:b,end:b+s.length};}
  if(call('d')){const a=calculatorLoveSplitArgs(s.slice(2,-1),b+2);if(a.length>=2)return {k:'derivative',body:calculatorLoveParse(a[0].text,a[0].base,ctx),variable:calculatorLoveParse(a[1].text,a[1].base,ctx),order:a[2]?calculatorLoveParse(a[2].text,a[2].base,ctx):{k:'text',text:'1'},start:b,end:b+s.length};}
  if(s.startsWith('∫(')&&s.endsWith(')')){const a=calculatorLoveSplitArgs(s.slice(2,-1),b+2);if(a.length>=2)return {k:'integral',body:calculatorLoveParse(a[0].text,a[0].base,ctx),variable:calculatorLoveParse(a[1].text,a[1].base,ctx),lo:a[2]?calculatorLoveParse(a[2].text,a[2].base,ctx):null,hi:a[3]?calculatorLoveParse(a[3].text,a[3].base,ctx):null,start:b,end:b+s.length};}
  if((s.startsWith('∑(')||s.startsWith('∏('))&&s.endsWith(')')){const a=calculatorLoveSplitArgs(s.slice(2,-1),b+2);if(a.length>=4)return {k:'bigop',symbol:s[0],body:calculatorLoveParse(a[0].text,a[0].base,ctx),variable:calculatorLoveParse(a[1].text,a[1].base,ctx),lo:calculatorLoveParse(a[2].text,a[2].base,ctx),hi:calculatorLoveParse(a[3].text,a[3].base,ctx),start:b,end:b+s.length};}
  if(call('system')||call('piecewise')){const name=s.startsWith('system')?'system':'piecewise',off=name.length+1,a=calculatorLoveSplitArgs(s.slice(off,-1),b+off);return {k:name,args:a.map(x=>calculatorLoveParse(x.text,x.base,ctx)),start:b,end:b+s.length};}

  // Top-level operators, low to high precedence.
  let p=calculatorLoveFindTop(s,'+-',true);if(p>0)return {k:'binary',op:s[p],left:calculatorLoveParse(s.slice(0,p),b,ctx),right:calculatorLoveParse(s.slice(p+1),b+p+1,ctx),start:b,end:b+s.length};
  p=calculatorLoveFindTop(s,'*/',true);
  if(p>0){
    const left=calculatorLoveParse(s.slice(0,p),b,ctx),right=calculatorLoveParse(s.slice(p+1),b+p+1,ctx);
    return s[p]==='/' ? {k:'fraction',num:left,den:right,start:b,end:b+s.length} : {k:'binary',op:s[p],left,right,start:b,end:b+s.length};
  }
  p=calculatorLoveFindTop(s,'^',true);if(p>0)return {k:'power',baseNode:calculatorLoveParse(s.slice(0,p),b,ctx),exp:calculatorLoveParse(s.slice(p+1),b+p+1,ctx),start:b,end:b+s.length};

  // If a text fallback still contains placeholders, split so they remain editable boxes.
  if(s.includes(CALC_LOVE_PLACEHOLDER)){
    const children=[];let last=0;
    for(let i=0;i<s.length;i++)if(s[i]===CALC_LOVE_PLACEHOLDER){if(i>last)children.push({k:'text',text:s.slice(last,i),start:b+last,end:b+i});children.push({k:'placeholder',ph:ctx.ph++,start:b+i,end:b+i+1});last=i+1;}
    if(last<s.length)children.push({k:'text',text:s.slice(last),start:b+last,end:b+s.length});
    return {k:'row',children,start:b,end:b+s.length};
  }
  return {k:'text',text:s,start:b,end:b+s.length};
}

// Reparse fraction with a single shared placeholder counter. This wrapper also
// normalizes the small parser shortcut above.
function calculatorLoveAst(source){
  const ctx={ph:0};
  const parse=(s,b=0)=>{
    const node=calculatorLoveParse(s,b,ctx);
    if(node?.k==='fraction'&&node.left&&node.right){node.num=node.left;node.den=node.right;delete node.left;delete node.right;}
    const walk=(n)=>{if(!n||typeof n!=='object')return;n&&Object.values(n).forEach(v=>{if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);});};
    walk(node);return node;
  };
  return parse(String(source||''),0);
}

function calculatorLoveLuaString(value){return '"'+String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'')+'"';}
function calculatorLoveAstLua(node){
  if(!node)return '{k="text",text=""}';
  const q=calculatorLoveLuaString;
  switch(node.k){
    case 'text':return `{k="text",text=${q(node.text)}}`;
    case 'placeholder':return `{k="placeholder",ph=${Number(node.ph)||0}}`;
    case 'row':return `{k="row",children={${(node.children||[]).map(calculatorLoveAstLua).join(',')}}}`;
    case 'binary':return `{k="binary",op=${q(node.op)},left=${calculatorLoveAstLua(node.left)},right=${calculatorLoveAstLua(node.right)}}`;
    case 'fraction':return `{k="fraction",num=${calculatorLoveAstLua(node.num||node.left)},den=${calculatorLoveAstLua(node.den||node.right)}}`;
    case 'power':return `{k="power",base=${calculatorLoveAstLua(node.baseNode)},exp=${calculatorLoveAstLua(node.exp)}}`;
    case 'sqrt':return `{k="sqrt",body=${calculatorLoveAstLua(node.body)}}`;
    case 'root':return `{k="root",body=${calculatorLoveAstLua(node.body)},index=${calculatorLoveAstLua(node.index)}}`;
    case 'abs':return `{k="abs",body=${calculatorLoveAstLua(node.body)}}`;
    case 'log':return `{k="log",body=${calculatorLoveAstLua(node.body)},base=${calculatorLoveAstLua(node.baseNode)}}`;
    case 'limit':return `{k="limit",body=${calculatorLoveAstLua(node.body)},var=${calculatorLoveAstLua(node.variable)},to=${calculatorLoveAstLua(node.to)}}`;
    case 'derivative':return `{k="derivative",body=${calculatorLoveAstLua(node.body)},var=${calculatorLoveAstLua(node.variable)},ord=${calculatorLoveAstLua(node.order)}}`;
    case 'integral':return `{k="integral",body=${calculatorLoveAstLua(node.body)},var=${calculatorLoveAstLua(node.variable)},lo=${node.lo?calculatorLoveAstLua(node.lo):'nil'},hi=${node.hi?calculatorLoveAstLua(node.hi):'nil'}}`;
    case 'bigop':return `{k="bigop",symbol=${q(node.symbol)},body=${calculatorLoveAstLua(node.body)},var=${calculatorLoveAstLua(node.variable)},lo=${calculatorLoveAstLua(node.lo)},hi=${calculatorLoveAstLua(node.hi)}}`;
    case 'system':case 'piecewise':return `{k=${q(node.k)},args={${(node.args||[]).map(calculatorLoveAstLua).join(',')}}}`;
    case 'matrix':return `{k="matrix",rows={${(node.rows||[]).map(r=>`{${r.map(calculatorLoveAstLua).join(',')}}`).join(',')}}}`;
    default:return `{k="text",text=${q('')}}`;
  }
}

function calculatorLoveActivePlaceholder(source,caret){
  const s=String(source||'');if(s[caret]!==CALC_LOVE_PLACEHOLDER)return -1;
  let n=0;for(let i=0;i<caret;i++)if(s[i]===CALC_LOVE_PLACEHOLDER)n++;return n;
}

function calculatorLoveBuildPreviewLua(rows=[],source='',caret=0,selected=-1,scrollPx=0){
  const composer=calculatorLoveAst(source);
  const active=calculatorLoveActivePlaceholder(source,caret);
  const rowLua=(rows||[]).map((r)=>`{entry=${calculatorLoveAstLua(calculatorLoveAst(r.entry||''))},result=${calculatorLoveAstLua(calculatorLoveAst(r.display||r.full||''))}}`).join(',');
  const composerLua=calculatorLoveAstLua(composer);
  return `
local rows={${rowLua}}
local composer=${composerLua}
local activePlaceholder=${active}
local selectedRow=${Number(selected)||-1}
local scrollPx=${Math.max(0,Number(scrollPx)||0)}
local font=love.graphics.newFont(13)
local small=love.graphics.newFont(9)
local big=love.graphics.newFont(24)
local medium=love.graphics.newFont(17)

local function setfont(f) love.graphics.setFont(f) end
local function tw(s,f) setfont(f or font); return love.graphics.getFont():getWidth(tostring(s or "")) end
local function th(f) setfont(f or font); return love.graphics.getFont():getHeight() end
local function text(s,x,y,f) setfont(f or font); love.graphics.print(tostring(s or ""),x,y) end
local function dims(n)
  if not n then return 0,18 end
  local k=n.k
  if k=="text" then return math.max(1,tw(n.text,font)),18 end
  if k=="placeholder" then return 18,19 end
  if k=="row" then local w,h=0,18;for _,c in ipairs(n.children or {}) do local cw,ch=dims(c);w=w+cw;h=math.max(h,ch) end;return w,h end
  if k=="binary" then local a,b=dims(n.left);local c,d=dims(n.right);local ow=(n.op=="*") and 2 or (tw(n.op,font)+6);return a+ow+c,math.max(b,d) end
  if k=="fraction" then local a,b=dims(n.num);local c,d=dims(n.den);return math.max(a,c)+10,b+d+8 end
  if k=="power" then local a,b=dims(n.base);local c,d=dims(n.exp);return a+c*.68+2,math.max(b,d*.68+7) end
  if k=="sqrt" then local a,b=dims(n.body);return a+15,b+5 end
  if k=="root" then local a,b=dims(n.body);local c,d=dims(n.index);return a+18+c*.6,b+8 end
  if k=="abs" then local a,b=dims(n.body);return a+10,b end
  if k=="log" then local a,b=dims(n.body);local c,d=dims(n.base);return 30+c*.7+a,b+7 end
  if k=="limit" then local a,b=dims(n.body);local c,d=dims(n.var);local e,f=dims(n.to);return 35+a,math.max(30,b) end
  if k=="derivative" then local a,b=dims(n.body);return 46+a,math.max(36,b) end
  if k=="integral" then local a,b=dims(n.body);return 40+a,math.max(42,b) end
  if k=="bigop" then local a,b=dims(n.body);return 42+a,math.max(45,b) end
  if k=="system" or k=="piecewise" then local w,h=20,0;for _,a in ipairs(n.args or {}) do local aw,ah=dims(a);w=math.max(w,aw+22);h=h+math.max(17,ah) end;return w,math.max(30,h) end
  if k=="matrix" then local cols=0;for _,r in ipairs(n.rows or {}) do cols=math.max(cols,#r) end;return cols*30+16,#(n.rows or {})*20+8 end
  return 20,18
end

local function draw(n,x,y,scale)
  scale=scale or 1
  if not n then return end
  local k=n.k
  if scale~=1 then love.graphics.push();love.graphics.translate(x,y);love.graphics.scale(scale,scale);draw(n,0,0,1);love.graphics.pop();return end
  love.graphics.setColor(0,0,0,1)
  if k=="text" then text(n.text,x,y,font);return end
  if k=="placeholder" then
    if n.ph==activePlaceholder then love.graphics.setColor(0.15,0.58,0.92,0.23);love.graphics.rectangle("fill",x,y,17,18);love.graphics.setColor(0.12,0.5,0.86,1) else love.graphics.setColor(0.7,0.7,0.7,1) end
    love.graphics.rectangle("line",x,y,17,18);return
  end
  if k=="row" then local dx=x;for _,c in ipairs(n.children or {}) do draw(c,dx,y,1);local cw=dims(c);dx=dx+cw end;return end
  if k=="binary" then local aw,ah=dims(n.left);draw(n.left,x,y,1);if n.op=="*" then draw(n.right,x+aw+2,y,1) else text(n.op,x+aw+3,y,font);draw(n.right,x+aw+tw(n.op,font)+6,y,1) end;return end
  if k=="fraction" then local nw,nh=dims(n.num);local dw,dh=dims(n.den);local w=math.max(nw,dw)+10;draw(n.num,x+(w-nw)/2,y,1);love.graphics.line(x+2,y+nh+2,x+w-2,y+nh+2);draw(n.den,x+(w-dw)/2,y+nh+6,1);return end
  if k=="power" then local bw,bh=dims(n.base);draw(n.base,x,y+5,1);draw(n.exp,x+bw+1,y,0.68);return end
  if k=="sqrt" then local bw,bh=dims(n.body);text("√",x,y+2,big);love.graphics.line(x+13,y+2,x+15+bw,y+2);draw(n.body,x+15,y+5,1);return end
  if k=="root" then local bw,bh=dims(n.body);local iw,ih=dims(n.index);draw(n.index,x,y,0.58);text("√",x+math.max(5,iw*.55),y+6,big);local rx=x+math.max(5,iw*.55)+13;love.graphics.line(rx,y+6,rx+bw+2,y+6);draw(n.body,rx,y+9,1);return end
  if k=="abs" then local bw,bh=dims(n.body);love.graphics.line(x,y,x,y+bh);draw(n.body,x+5,y,1);love.graphics.line(x+bw+9,y,x+bw+9,y+bh);return end
  if k=="log" then text("log",x,y,font);local lw=tw("log",font);draw(n.base,x+lw-1,y+10,0.65);draw(n.body,x+lw+10,y,1);return end
  if k=="limit" then text("lim",x,y,font);draw(n.var,x,y+15,0.58);text("→",x+8,y+14,small);draw(n.to,x+15,y+15,0.58);draw(n.body,x+31,y,1);return end
  if k=="derivative" then local ow,oh=dims(n.ord);text("d",x+8,y,big);draw(n.ord,x+21,y,0.55);love.graphics.line(x+2,y+20,x+36,y+20);text("d",x+5,y+23,font);draw(n.var,x+14,y+23,0.8);draw(n.ord,x+26,y+21,0.55);draw(n.body,x+43,y+8,1);return end
  if k=="integral" then text("∫",x+5,y,big);if n.hi then draw(n.hi,x+21,y,0.55) end;if n.lo then draw(n.lo,x+2,y+29,0.55) end;draw(n.body,x+24,y+10,1);local bw=dims(n.body);text("d",x+27+bw,y+10,font);draw(n.var,x+35+bw,y+10,0.8);return end
  if k=="bigop" then text(n.symbol,x+5,y+7,big);draw(n.hi,x+11,y,0.55);draw(n.var,x,y+33,0.55);text("=",x+9,y+33,small);draw(n.lo,x+15,y+33,0.55);draw(n.body,x+32,y+13,1);return end
  if k=="system" then text("{",x,y,big);local yy=y;for _,a in ipairs(n.args or {}) do draw(a,x+16,yy,1);yy=yy+19 end;return end
  if k=="piecewise" then text("{",x,y,big);local yy=y;local a=n.args or {};local i=1;while i<=#a do draw(a[i],x+16,yy,1);if a[i+1] then text(",",x+65,yy,font);draw(a[i+1],x+73,yy,1) end;yy=yy+20;i=i+2 end;return end
  if k=="matrix" then local rows=n.rows or {};local cols=0;for _,r in ipairs(rows) do cols=math.max(cols,#r) end;local h=#rows*20+4;love.graphics.line(x+4,y,x,y,x,y+h,x+4,y+h);local right=x+cols*30+12;love.graphics.line(right-4,y,right,y,right,y+h,right-4,y+h);for ri,r in ipairs(rows) do for ci,c in ipairs(r) do draw(c,x+8+(ci-1)*30,y+4+(ri-1)*20,1) end end;return end
end

function love.load() love.graphics.setBackgroundColor(1,1,1,1) end
function love.draw()
  love.graphics.clear(1,1,1,1)
  local W,H=love.graphics.getDimensions()
  local composerH=58
  local histH=H-composerH
  love.graphics.setColor(0.82,0.82,0.82,1);love.graphics.line(0,histH,W,histH)
  local y=-scrollPx
  for i,row in ipairs(rows) do
    local eh=dims(row.entry); local rh=dims(row.result); local rowH=math.max(48,math.max(select(2,dims(row.entry)),select(2,dims(row.result)))+18)
    if y+rowH>=0 and y<histH then
      if i-1==selectedRow then love.graphics.setColor(0.45,0.79,0.91,1);love.graphics.rectangle("fill",0,y,W-10,rowH-1) elseif i%2==0 then love.graphics.setColor(0.97,0.97,0.97,1);love.graphics.rectangle("fill",0,y,W-10,rowH-1) end
      draw(row.entry,8,y+10,1)
      local rw=select(1,dims(row.result));draw(row.result,math.max(180,W-18-rw),y+10,1)
    end
    y=y+rowH
  end
  love.graphics.setColor(1,1,1,1);love.graphics.rectangle("fill",0,histH,W,composerH)
  love.graphics.setColor(0,0,0,1);draw(composer,8,histH+15,1)
end
`;
}

function calculatorLoveHistoryHeight(rows=[]){
  return (rows||[]).reduce((sum,r)=>{
    const e=String(r.entry||''),d=String(r.display||r.full||'');
    const complex=/[∫∑∏]|root\(|√\(|system\(|piecewise\(|\[\[|d\(/.test(e+d);
    return sum+(complex?62:48);
  },0);
}

function calculatorLoveVisibleText(rows,state,scrollPx=0,viewH=156){
  const all=(rows||[]).map(r=>`${r.entry||''}${(r.display||r.full)?` = ${r.display||r.full}`:''}`);
  const current=calculatorLovePlainSource(state||'').replaceAll(CALC_LOVE_PLACEHOLDER,'□').trim();
  return [...all,(current?`> ${current}`:'')].filter(Boolean).join('\n');
}
function calculatorTemplateType(file = "") {
  const n = String(file).slice(0, 2);
  return ({
    "01":"fraction", "02":"power", "03":"sqrt", "04":"root", "05":"exp", "06":"log",
    "07":"piecewise2", "08":"piecewise3", "09":"system2", "10":"system3", "11":"abs", "12":"dms",
    "13":"matrix22", "14":"matrix12", "15":"matrix21", "16":"matrix32", "17":"sum", "18":"product",
    "19":"derivative1", "20":"derivative2", "21":"derivativeN", "22":"integralDef", "23":"integral",
    "24":"limit", "25":"plain"
  })[n] || "plain";
}

function calculatorComposerSlotCount(type) {
  return ({
    plain:1, fraction:2, power:2, sqrt:1, root:2, exp:1, log:2,
    piecewise2:4, piecewise3:6, system2:2, system3:3, abs:1, dms:3,
    matrix22:4, matrix12:2, matrix21:2, matrix32:6, sum:4, product:4,
    derivative1:2, derivative2:2, derivativeN:3, integralDef:4, integral:2, limit:3
  })[type] || 1;
}

function calculatorNewComposer(type = "plain", carry = "") {
  const slots = Array.from({ length: calculatorComposerSlotCount(type) }, () => "");
  if (type === "plain" && carry && slots.length) slots[0] = carry;
  return {
    type,
    slots,
    prefix: "",
    suffix: "",
    active: 0,
    activePart: "slot:0",
    carets: { "slot:0": String(slots[0] || "").length },
  };
}

function calculatorComposerCoreSerialize(state) {
  const s = (i) => String(state?.slots?.[i] || "").trim();
  switch (state?.type || "plain") {
    case "fraction": return `${s(0)}/${s(1)}`;
    case "power": return `${s(0)}^${s(1)}`;
    case "sqrt": return `√(${s(0)})`;
    case "root": return `root(${s(1)},${s(0)})`;
    case "exp": return `e^${s(0)}`;
    case "log": return `log(${s(1)},${s(0)})`;
    case "piecewise2": return `piecewise(${s(0)},${s(1)},${s(2)},${s(3)})`;
    case "piecewise3": return `piecewise(${s(0)},${s(1)},${s(2)},${s(3)},${s(4)},${s(5)})`;
    case "system2": return `system(${s(0)},${s(1)})`;
    case "system3": return `system(${s(0)},${s(1)},${s(2)})`;
    case "abs": return `abs(${s(0)})`;
    case "dms": return `${s(0)}°${s(1)}'${s(2)}\"`;
    case "matrix22": return `[[${s(0)},${s(1)}][${s(2)},${s(3)}]]`;
    case "matrix12": return `[[${s(0)},${s(1)}]]`;
    case "matrix21": return `[[${s(0)}][${s(1)}]]`;
    case "matrix32": return `[[${s(0)},${s(1)}][${s(2)},${s(3)}][${s(4)},${s(5)}]]`;
    case "sum": return `∑(${s(0)},${s(1) || "k"},${s(2)},${s(3)})`;
    case "product": return `∏(${s(0)},${s(1) || "k"},${s(2)},${s(3)})`;
    case "derivative1": return `d(${s(0)},${s(1) || "x"})`;
    case "derivative2": return `d(${s(0)},${s(1) || "x"},2)`;
    case "derivativeN": return `d(${s(0)},${s(1) || "x"},${s(2)})`;
    case "integralDef": return `∫(${s(0)},${s(1) || "x"},${s(2)},${s(3)})`;
    case "integral": return `∫(${s(0)},${s(1) || "x"})`;
    case "limit": return `lim(${s(0)},${s(1) || "x"},${s(2)})`;
    default: return s(0);
  }
}

function calculatorNeedsImplicitMultiply(left, core) {
  const l = String(left || "").trimEnd();
  if (!l || !core) return false;
  if (!/[0-9A-Za-z_)\]]$/.test(l)) return false;
  return /^(?:root\(|√\(|e\^|log\(|abs\(|system\(|piecewise\(|∑\(|∏\(|d\(|∫\(|lim\(|\[\[)/.test(core);
}

function calculatorComposerSerialize(state) {
  if ((state?.type || "plain") === "plain") return String(state?.slots?.[0] || "").trim();
  const prefix = String(state?.prefix || "");
  const suffix = String(state?.suffix || "");
  const core = calculatorComposerCoreSerialize(state);
  return `${prefix}${calculatorNeedsImplicitMultiply(prefix, core) ? "*" : ""}${core}${suffix}`.trim();
}

function calculatorComposerHasContent(state) {
  return Boolean(String(state?.prefix || "").trim() || String(state?.suffix || "").trim() || (state?.slots || []).some((v) => String(v || "").trim()));
}

function calculatorComposerTemplateSlotsEmpty(state) {
  return (state?.slots || []).every((v) => !String(v || "").trim());
}

function calculatorComposerIsComplete(state) {
  if (!calculatorComposerHasContent(state)) return false;
  if ((state?.type || "plain") === "plain") return Boolean(String(state?.slots?.[0] || "").trim());
  const required = ({
    fraction:[0,1], power:[0,1], sqrt:[0], root:[0,1], exp:[0], log:[0,1],
    piecewise2:[0,1,2,3], piecewise3:[0,1,2,3,4,5], system2:[0,1], system3:[0,1,2], abs:[0],
    dms:[0], matrix22:[0,1,2,3], matrix12:[0,1], matrix21:[0,1], matrix32:[0,1,2,3,4,5],
    sum:[0,2,3], product:[0,2,3], derivative1:[0], derivative2:[0], derivativeN:[0,2],
    integralDef:[0,2,3], integral:[0], limit:[0,2]
  })[state.type] || [0];
  return required.every((i) => String(state.slots?.[i] || "").trim());
}

function calculatorSlotHtml(i, cls = "") {
  return `<span class="calc-visual-slot calc-editor-part ${cls}" contenteditable="plaintext-only" spellcheck="false" data-slot="${i}" data-editor-part="slot:${i}"></span>`;
}

function calculatorAffixHtml(name, text = "") {
  return `<span class="calc-v-affix calc-editor-part calc-v-affix-${name}" contenteditable="plaintext-only" spellcheck="false" data-affix="${name}" data-editor-part="${name}">${escapeHtml(String(text || ""))}</span>`;
}

function calculatorComposerTemplateMarkup(state) {
  const slot = calculatorSlotHtml;
  switch (state.type) {
    case "fraction": return `<span class="calc-v-frac"><span class="calc-v-frac-num">${slot(0)}</span><span class="calc-v-frac-bar"></span><span class="calc-v-frac-den">${slot(1)}</span></span>`;
    case "power": return `<span class="calc-v-power"><span class="calc-v-base">${slot(0)}</span><sup>${slot(1,"calc-v-sup-slot")}</sup></span>`;
    case "sqrt": return `<span class="calc-v-root"><span class="calc-v-radical">√</span><span class="calc-v-radicand">${slot(0)}</span></span>`;
    case "root": return `<span class="calc-v-root calc-v-nroot"><span class="calc-v-nroot-index">${slot(0,"calc-v-index")}</span><span class="calc-v-root-main"><span class="calc-v-radical">√</span><span class="calc-v-radicand">${slot(1)}</span></span></span>`;
    case "exp": return `<span class="calc-v-power"><span class="calc-v-base calc-v-italic">e</span><sup>${slot(0,"calc-v-sup-slot")}</sup></span>`;
    case "log": return `<span class="calc-v-log"><span>log</span><sub>${slot(0,"calc-v-sub-slot")}</sub><span>(</span>${slot(1)}<span>)</span></span>`;
    case "abs": return `<span class="calc-v-abs"><span class="calc-v-abs-bar"></span>${slot(0)}<span class="calc-v-abs-bar"></span></span>`;
    case "dms": return `<span class="calc-v-inline">${slot(0)}<span>°</span>${slot(1)}<span>'</span>${slot(2)}<span>\"</span></span>`;
    case "matrix22": return `<span class="calc-v-matrix"><span class="calc-v-bracket">[</span><span class="calc-v-matrix-grid cols2">${slot(0)}${slot(1)}${slot(2)}${slot(3)}</span><span class="calc-v-bracket">]</span></span>`;
    case "matrix12": return `<span class="calc-v-matrix"><span class="calc-v-bracket">[</span><span class="calc-v-matrix-grid cols2">${slot(0)}${slot(1)}</span><span class="calc-v-bracket">]</span></span>`;
    case "matrix21": return `<span class="calc-v-matrix"><span class="calc-v-bracket">[</span><span class="calc-v-matrix-grid cols1">${slot(0)}${slot(1)}</span><span class="calc-v-bracket">]</span></span>`;
    case "matrix32": return `<span class="calc-v-matrix"><span class="calc-v-bracket">[</span><span class="calc-v-matrix-grid cols2">${slot(0)}${slot(1)}${slot(2)}${slot(3)}${slot(4)}${slot(5)}</span><span class="calc-v-bracket">]</span></span>`;
    case "system2": return `<span class="calc-v-system"><span class="calc-v-brace">{</span><span class="calc-v-system-rows">${slot(0)}${slot(1)}</span></span>`;
    case "system3": return `<span class="calc-v-system"><span class="calc-v-brace">{</span><span class="calc-v-system-rows">${slot(0)}${slot(1)}${slot(2)}</span></span>`;
    case "piecewise2": return `<span class="calc-v-system"><span class="calc-v-brace">{</span><span class="calc-v-piece-rows"><span>${slot(0)}<span class="calc-v-if">,</span>${slot(1)}</span><span>${slot(2)}<span class="calc-v-if">,</span>${slot(3)}</span></span></span>`;
    case "piecewise3": return `<span class="calc-v-system"><span class="calc-v-brace">{</span><span class="calc-v-piece-rows"><span>${slot(0)}<span class="calc-v-if">,</span>${slot(1)}</span><span>${slot(2)}<span class="calc-v-if">,</span>${slot(3)}</span><span>${slot(4)}<span class="calc-v-if">,</span>${slot(5)}</span></span></span>`;
    case "sum": return `<span class="calc-v-bigop"><span class="calc-v-bigop-stack"><span class="calc-v-upper">${slot(3)}</span><span class="calc-v-op">∑</span><span class="calc-v-lower">${slot(1,"calc-v-var")}<span>=</span>${slot(2)}</span></span><span class="calc-v-body">(${slot(0)})</span></span>`;
    case "product": return `<span class="calc-v-bigop"><span class="calc-v-bigop-stack"><span class="calc-v-upper">${slot(3)}</span><span class="calc-v-op">∏</span><span class="calc-v-lower">${slot(1,"calc-v-var")}<span>=</span>${slot(2)}</span></span><span class="calc-v-body">(${slot(0)})</span></span>`;
    case "derivative1": return `<span class="calc-v-derivative"><span class="calc-v-frac calc-v-dfrac"><span class="calc-v-frac-num calc-v-fixed">d</span><span class="calc-v-frac-bar"></span><span class="calc-v-frac-den"><span>d</span>${slot(1,"calc-v-var")}</span></span><span class="calc-v-derivative-body">(</span>${slot(0)}<span class="calc-v-derivative-body">)</span></span>`;
    case "derivative2": return `<span class="calc-v-derivative"><span class="calc-v-frac calc-v-dfrac"><span class="calc-v-frac-num calc-v-fixed">d<sup>2</sup></span><span class="calc-v-frac-bar"></span><span class="calc-v-frac-den"><span>d</span>${slot(1,"calc-v-var")}<sup>2</sup></span></span><span class="calc-v-derivative-body">(</span>${slot(0)}<span class="calc-v-derivative-body">)</span></span>`;
    case "derivativeN": return `<span class="calc-v-derivative"><span class="calc-v-frac calc-v-dfrac"><span class="calc-v-frac-num calc-v-fixed">d<sup>${slot(2,"calc-v-order")}</sup></span><span class="calc-v-frac-bar"></span><span class="calc-v-frac-den"><span>d</span>${slot(1,"calc-v-var")}<sup>${slot(2,"calc-v-order clone-order")}</sup></span></span><span class="calc-v-derivative-body">(</span>${slot(0)}<span class="calc-v-derivative-body">)</span></span>`;
    case "integralDef": return `<span class="calc-v-integral"><span class="calc-v-int-stack"><span class="calc-v-upper">${slot(3)}</span><span class="calc-v-int">∫</span><span class="calc-v-lower">${slot(2)}</span></span><span class="calc-v-integrand">${slot(0)}</span><span class="calc-v-differential">d</span>${slot(1,"calc-v-var")}</span>`;
    case "integral": return `<span class="calc-v-integral"><span class="calc-v-int">∫</span><span class="calc-v-integrand">${slot(0)}</span><span class="calc-v-differential">d</span>${slot(1,"calc-v-var")}</span>`;
    case "limit": return `<span class="calc-v-limit"><span class="calc-v-lim-stack"><span class="calc-v-lim">lim</span><span class="calc-v-lower">${slot(1,"calc-v-var")}<span>→</span>${slot(2)}</span></span>${slot(0)}</span>`;
    default: return `<span class="calc-v-plain">${slot(0,"calc-v-plain-slot")}</span>`;
  }
}

function calculatorComposerMarkup(state) {
  if ((state?.type || "plain") === "plain") return calculatorComposerTemplateMarkup(state);
  return `<span class="calc-v-expression">${calculatorAffixHtml("prefix", state.prefix)}<span class="calc-v-template" data-template-type="${escapeHtml(state.type)}">${calculatorComposerTemplateMarkup(state)}</span>${calculatorAffixHtml("suffix", state.suffix)}</span>`;
}

function calculatorPlaceCaret(part, offset = null) {
  if (!part) return;
  part.focus();
  const node = part.firstChild || part.appendChild(document.createTextNode(""));
  const length = node.textContent?.length || 0;
  const pos = offset == null ? length : Math.max(0, Math.min(length, offset));
  const range = document.createRange();
  range.setStart(node, pos); range.collapse(true);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
}

function calculatorSlotCaretOffset(part) {
  const sel = window.getSelection();
  if (!part || !sel?.rangeCount || !part.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(part); range.setEnd(sel.anchorNode, sel.anchorOffset);
  return range.toString().length;
}

function calculatorEditorParts(container) {
  return Array.from(container.querySelectorAll('.calc-editor-part[contenteditable]'));
}

function calculatorStatePartText(state, partName) {
  if (partName === "prefix" || partName === "suffix") return String(state[partName] || "");
  const m = String(partName || "").match(/^slot:(\d+)$/);
  return m ? String(state.slots?.[Number(m[1])] || "") : "";
}

function calculatorSetStatePartText(state, partName, value) {
  if (partName === "prefix" || partName === "suffix") state[partName] = value;
  else {
    const m = String(partName || "").match(/^slot:(\d+)$/);
    if (m) state.slots[Number(m[1])] = value;
  }
}

function calculatorTemplateToPlain(container, state, caretOffset = null) {
  const prefix = String(state.prefix || "");
  const suffix = String(state.suffix || "");
  const combined = prefix + suffix;
  Object.assign(state, calculatorNewComposer("plain", combined));
  state.carets["slot:0"] = caretOffset == null ? prefix.length : caretOffset;
  calculatorRenderComposer(container, state, { part: "slot:0", offset: state.carets["slot:0"] });
}

function calculatorRenderComposer(container, state, focusTarget = null) {
  container.innerHTML = calculatorComposerMarkup(state);
  const allSlots = Array.from(container.querySelectorAll('.calc-visual-slot'));
  allSlots.forEach((slot) => {
    const i = Number(slot.dataset.slot);
    if (slot.classList.contains('clone-order')) {
      slot.removeAttribute('contenteditable');
      slot.removeAttribute('data-editor-part');
      slot.classList.remove('calc-editor-part');
      slot.setAttribute('aria-hidden','true');
    }
    slot.textContent = state.slots[i] || "";
  });
  for (const affix of container.querySelectorAll('.calc-v-affix')) affix.textContent = String(state[affix.dataset.affix] || "");

  const parts = calculatorEditorParts(container);
  const syncCaret = (part) => {
    const name = part.dataset.editorPart;
    state.activePart = name;
    const m = name?.match(/^slot:(\d+)$/);
    if (m) state.active = Number(m[1]);
    const offset = calculatorSlotCaretOffset(part);
    if (offset != null) state.carets[name] = offset;
  };

  parts.forEach((part) => {
    const name = part.dataset.editorPart;
    part.addEventListener('focus', () => { syncCaret(part); container.classList.add('is-editing'); });
    part.addEventListener('click', () => syncCaret(part));
    part.addEventListener('keyup', () => syncCaret(part));
    part.addEventListener('input', () => {
      const value = part.textContent.replace(/[\r\n]+/g, '');
      calculatorSetStatePartText(state, name, value);
      syncCaret(part);
      const m = name?.match(/^slot:(\d+)$/);
      if (m) for (const clone of container.querySelectorAll(`.clone-order[data-slot="${m[1]}"]`)) clone.textContent = value;
    });
    part.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData)?.getData('text') || '';
      document.execCommand('insertText', false, text.replace(/[\r\n]+/g, ' '));
    });
    part.addEventListener('keydown', (event) => {
      const offset = calculatorSlotCaretOffset(part) ?? 0;
      const len = part.textContent.length;
      const editable = calculatorEditorParts(container);
      const idx = editable.indexOf(part);
      if (event.key === 'ArrowRight' && offset === len) {
        const next = editable[idx + 1];
        if (next) { event.preventDefault(); calculatorPlaceCaret(next, 0); state.activePart = next.dataset.editorPart; state.carets[state.activePart] = 0; }
      } else if (event.key === 'ArrowLeft' && offset === 0) {
        const prev = editable[idx - 1];
        if (prev) { event.preventDefault(); calculatorPlaceCaret(prev); state.activePart = prev.dataset.editorPart; state.carets[state.activePart] = prev.textContent.length; }
      } else if (event.key === 'Backspace' && offset === 0 && !part.textContent) {
        if (state.type !== 'plain' && calculatorComposerTemplateSlotsEmpty(state) && name?.startsWith('slot:')) {
          event.preventDefault(); calculatorTemplateToPlain(container, state);
        } else {
          const prev = editable[idx - 1];
          if (prev) { event.preventDefault(); calculatorPlaceCaret(prev); }
        }
      } else if (event.key === 'Delete' && offset === len && !part.textContent && state.type !== 'plain' && calculatorComposerTemplateSlotsEmpty(state)) {
        event.preventDefault(); calculatorTemplateToPlain(container, state);
      } else if (state.type === 'plain' && event.key === '^' && part.textContent.trim()) {
        event.preventDefault();
        const carry = part.textContent.trim();
        Object.assign(state, calculatorNewComposer('power'));
        state.slots = [carry, '']; state.active = 1; state.activePart = 'slot:1';
        calculatorRenderComposer(container, state, 1);
      } else if (state.type === 'plain' && event.key === '/' && part.textContent.trim()) {
        event.preventDefault();
        const carry = part.textContent.trim();
        Object.assign(state, calculatorNewComposer('fraction'));
        state.slots = [carry, '']; state.active = 1; state.activePart = 'slot:1';
        calculatorRenderComposer(container, state, 1);
      }
    });
  });

  let requestedPart = null, requestedOffset = null;
  if (typeof focusTarget === 'number') requestedPart = `slot:${focusTarget}`;
  else if (typeof focusTarget === 'string') requestedPart = focusTarget;
  else if (focusTarget && typeof focusTarget === 'object') { requestedPart = focusTarget.part; requestedOffset = focusTarget.offset; }
  if (requestedPart == null) requestedPart = state.activePart || `slot:${state.active || 0}`;
  const target = parts.find((p) => p.dataset.editorPart === requestedPart) || parts[0];
  if (target && focusTarget != null) setTimeout(() => {
    calculatorPlaceCaret(target, requestedOffset == null ? state.carets?.[target.dataset.editorPart] : requestedOffset);
    state.activePart = target.dataset.editorPart;
  }, 0);
}

function calculatorSetTemplate(container, state, file) {
  const type = calculatorTemplateType(file);
  let prefix = "";
  if ((state.type || "plain") === "plain") prefix = String(state.slots?.[0] || "");
  else prefix = calculatorComposerSerialize(state);
  const next = calculatorNewComposer(type);
  next.prefix = prefix;
  next.suffix = "";
  next.active = 0;
  next.activePart = "slot:0";
  next.carets = { prefix: prefix.length, "slot:0": 0, suffix: 0 };
  Object.assign(state, next);
  calculatorRenderComposer(container, state, 0);
}

function calculatorVisualMove(container, state, delta) {
  const parts = calculatorEditorParts(container);
  if (!parts.length) return;
  let active = document.activeElement?.closest?.('.calc-editor-part[contenteditable]');
  if (!active || !container.contains(active)) active = parts.find((p) => p.dataset.editorPart === state.activePart) || parts[0];
  const name = active.dataset.editorPart;
  const len = active.textContent.length;
  let offset = calculatorSlotCaretOffset(active);
  if (offset == null) offset = Number.isFinite(state.carets?.[name]) ? state.carets[name] : (delta < 0 ? len : 0);
  if (delta < 0 && offset > 0) {
    const nextOffset = offset - 1; calculatorPlaceCaret(active, nextOffset); state.carets[name] = nextOffset; state.activePart = name; return;
  }
  if (delta > 0 && offset < len) {
    const nextOffset = offset + 1; calculatorPlaceCaret(active, nextOffset); state.carets[name] = nextOffset; state.activePart = name; return;
  }
  const idx = parts.indexOf(active), next = parts[idx + (delta < 0 ? -1 : 1)];
  if (next) {
    const nextOffset = delta < 0 ? next.textContent.length : 0;
    calculatorPlaceCaret(next, nextOffset); state.activePart = next.dataset.editorPart; state.carets[state.activePart] = nextOffset;
  }
}

function calculatorVisibleScreenText(rows = [], composer = null, scrollPx = 0, viewHeight = 156) {
  const lines = [];
  let y = -Number(scrollPx || 0);
  for (const row of rows || []) {
    const rh = calculatorRowHeightV2(row);
    if (y + rh >= 0 && y < viewHeight) {
      const entry = String(row?.entry || "").trim();
      const result = String(row?.display || row?.full || "").trim();
      if (entry) lines.push(result && result !== entry ? `${entry} = ${result}` : entry);
    }
    y += rh;
  }
  if (composer && calculatorComposerHasContent(composer)) {
    const current = calculatorComposerSerialize(composer);
    if (current) lines.push(current);
  }
  return lines.join("\n");
}

function calculatorRowHeightV2(row) {
  const t = String(row?.entry || '');
  if (/^(system|piecewise)\(/i.test(t) || /^\[\[/.test(t)) return 72;
  if (/^[∑∏]\(/.test(t)) return 66;
  return 53;
}

function calculatorHistoryMetrics(rows, viewHeight) {
  const heights = rows.map(calculatorRowHeightV2);
  const total = heights.reduce((a,b)=>a+b,0);
  return { heights, total, maxScroll: Math.max(0,total-viewHeight) };
}

function drawCalculatorScratchpadPreviewV2(canvas, rows=[], selected=-1, scrollPx=0) {
  const ctx=canvas.getContext('2d'), w=canvas.width||320, h=canvas.height||214;
  const viewH=Math.max(40,h-CALCULATOR_COMPOSER_RESERVED_HEIGHT);
  const metrics=calculatorHistoryMetrics(rows,viewH);
  const scroll=Math.max(0,Math.min(metrics.maxScroll,Number(scrollPx||0)));
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
  let y=-scroll;
  rows.forEach((row,i)=>{
    const rh=metrics.heights[i];
    if (y+rh>=0 && y<viewH) {
      ctx.fillStyle=i===selected?'#75cbe9':(i%2?'#f7f7f7':'#fff'); ctx.fillRect(0,y,w-12,rh-1);
      const baseline=y+Math.min(31,rh/2+7);
      drawCalculatorMath(ctx,row.entry||'',8,baseline,205);
      const result=row.display||row.full||'';
      if(result){const approx=cMeasure(ctx,result);drawCalculatorMath(ctx,result,Math.max(185,w-22-Math.min(125,approx)),baseline,125);}
    }
    y+=rh;
  });
  ctx.fillStyle='#f5f5f5';ctx.fillRect(w-12,0,12,viewH);
  if(metrics.maxScroll>0){const th=Math.max(22,viewH*viewH/metrics.total),ty=(viewH-th)*scroll/metrics.maxScroll;ctx.fillStyle='#aaa';ctx.fillRect(w-9,ty+2,6,Math.max(8,th-4));}
  return { ...metrics, scroll, viewH };
}

function calculatorRowAtY(rows, scrollPx, y, viewH) {
  if (y<0 || y>viewH) return -1;
  let cursor=-Number(scrollPx||0);
  for(let i=0;i<rows.length;i++){const h=calculatorRowHeightV2(rows[i]);if(y>=cursor&&y<cursor+h)return i;cursor+=h;}
  return -1;
}
function calculatorInsertTemplate(input,template){let v=input.value||"",s=input.selectionStart??v.length,e=input.selectionEnd??s,ins=String(template||"");input.value=v.slice(0,s)+ins+v.slice(e);let p=ins.indexOf("("),n=s+(p>=0?p+1:ins.length);input.setSelectionRange(n,n);input.focus();}
async function addCalculatorWidgetToStage(){await ensureXmlStageCopy();pyodide.globals.set("wasm_calc_current_file",xmlDoctor.current?.file||"");pyodide.globals.set("wasm_calc_auth_b64",TI_CALCULATOR_AUTH_B64);const payload=await pyodide.runPythonAsync(`
import base64,json,xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name
sr=Path("${xmlDoctor.sourcePath}");st=Path("${xmlDoctor.stagePath}");cf=Path(wasm_calc_current_file) if wasm_calc_current_file else None;xf=None
if cf:
    try: rel=cf.relative_to(st)
    except ValueError:
        try: rel=cf.relative_to(sr)
        except ValueError: rel=Path(cf.name)
    c=st/rel
    if c.exists(): xf=c
if xf is None:
    ps=sorted([p for p in st.rglob("*.xml") if p.name.lower().startswith("problem")],key=lambda p:p.name.lower())
    if ps: xf=ps[0]
if xf is None: raise RuntimeError("No XML file available for Calculator")
t=ET.parse(xf);root=t.getroot();pns=root.tag[1:].split("}",1)[0] if root.tag.startswith("{") else "";sns="urn:TI.Scratchpad";ET.register_namespace("",pns);ET.register_namespace("sp",sns)
def q(ns,n): return f"{{{ns}}}{n}" if ns else n
card=ET.Element(q(pns,"card"),{"clay":"0","h1":"10000","h2":"10000","w1":"10000","w2":"10000"});ET.SubElement(card,q(pns,"isDummyCard")).text="0";ET.SubElement(card,q(pns,"flag")).text="0";w=ET.SubElement(card,q(pns,"wdgt"),{"type":"TI.Scratchpad","ver":"1.0"});ET.SubElement(w,q(sns,"mFlags")).text="0";ET.SubElement(w,q(sns,"value")).text="0";ET.SubElement(w,q(sns,"auth")).text=base64.b64decode(wasm_calc_auth_b64).decode();root.append(card);xf.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>'+ET.tostring(root,encoding="UTF-8",short_empty_elements=False));cards=[x for x in root if local_name(x.tag)=="card"];i=cards.index(card)+1
json.dumps({"type":"Widget","name":"TI.Scratchpad","file":str(xf),"path":f"/prob/card[{i}]/wdgt","detail":{"rows":[],"rowCount":0},"content":"","content_label":"Scratchpad","raw_xml":ET.tostring(w,encoding="unicode",short_empty_elements=False)})
`);xmlDoctor.embedded=true;xmlDoctor.stagePrepared=true;const item=JSON.parse(payload);xmlLog(t("calculatorWidgetAdded"));return item;}
async function saveCalculatorWidgetToStage(item,rows){await ensureXmlStageCopy();pyodide.globals.set("wasm_calc_save_file",item?.file||"");pyodide.globals.set("wasm_calc_save_path",item?.path||"");pyodide.globals.set("wasm_calc_rows_json",JSON.stringify(rows||[]));const payload=await pyodide.runPythonAsync(`
import json,xml.etree.ElementTree as ET
from pathlib import Path
sr=Path("${xmlDoctor.sourcePath}");st=Path("${xmlDoctor.stagePath}");sf=Path(wasm_calc_save_file) if wasm_calc_save_file else None;xf=None
if sf:
    try: rel=sf.relative_to(st)
    except ValueError:
        try: rel=sf.relative_to(sr)
        except ValueError: rel=Path(sf.name)
    c=st/rel
    if c.exists(): xf=c
if xf is None:
    ps=sorted([p for p in st.rglob("*.xml") if p.name.lower().startswith("problem")],key=lambda p:p.name.lower())
    if ps: xf=ps[0]
if xf is None: raise RuntimeError("No XML file available for Calculator Save")
t=ET.parse(xf);root=t.getroot();sns="urn:TI.Scratchpad";ET.register_namespace("sp",sns)
def loc(tag): return tag.rsplit("}",1)[-1]
def pp(part):
    txt=str(part or "")
    if txt.endswith("]") and "[" in txt:
        n,i=txt.rsplit("[",1);i=i[:-1]
        if i.isdigit(): return n,int(i)
    return txt,1
def resolve(root,path):
    parts=[p for p in str(path or "").split("/") if p]
    if parts and loc(root.tag)==pp(parts[0])[0]: parts=parts[1:]
    cur=root
    for part in parts:
        n,i=pp(part);ms=[c for c in cur if loc(c.tag)==n]
        if len(ms)<i:return None
        cur=ms[i-1]
    return cur
w=resolve(root,wasm_calc_save_path)
if w is None or w.attrib.get("type")!="TI.Scratchpad":
    ss=[e for e in root.iter() if loc(e.tag)=="wdgt" and e.attrib.get("type")=="TI.Scratchpad"]
    if not ss:raise RuntimeError("TI.Scratchpad widget not found")
    w=ss[-1]
for c in list(w):
    if c.tag==f"{{{sns}}}erow":w.remove(c)
rows=json.loads(wasm_calc_rows_json or "[]")
for row in rows:
    e=ET.SubElement(w,f"{{{sns}}}erow");ET.SubElement(e,f"{{{sns}}}entr").text=str(row.get("entry",''));ET.SubElement(e,f"{{{sns}}}exct").text=str(row.get("exact") or row.get("entry",''));r=ET.SubElement(e,f"{{{sns}}}rslt");ET.SubElement(r,f"{{{sns}}}warn2").text="{}";d=str(row.get("display") or row.get("full") or row.get("entry",''));ET.SubElement(r,f"{{{sns}}}disp").text=d;ET.SubElement(r,f"{{{sns}}}full").text=str(row.get("full") or d);ET.SubElement(e,f"{{{sns}}}ctxt",{"ang":"1","cplx":"1","comp":"1"})
xf.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>'+ET.tostring(root,encoding="UTF-8",short_empty_elements=False));json.dumps({"file":str(xf),"saved_rows":len(rows),"raw_xml":ET.tostring(w,encoding="unicode",short_empty_elements=False)})
`);xmlDoctor.embedded=true;xmlDoctor.stagePrepared=true;return JSON.parse(payload);}
function openCalculatorInLovePreview(item){const a=extractCalculatorRowsFromRawXml(item?.raw_xml||""),b=Array.isArray(item?.detail?.rows)?item.detail.rows:[];return showLovePreview("",null,null,{calculatorEditor:{item,rows:(a.length?a:b).map(r=>({...r}))}});}
function openGraphInLovePreview(item) {
  const state = extractGraphStateFromRawXml(item?.raw_xml || "");
  const functionName = item?.detail?.function || state.name || "f1";
  const formula = normalizeGraphFormulaInput(
    item?.detail?.expression || item?.content || state.formula || "sin(x)"
  ) || "sin(x)";
  const code = buildGraphPreviewLua(formula, functionName);
  return showLovePreview(code, null, null, {
    graphEditor: {
      item,
      functionName,
      formula,
    },
  });
}

function drawNativeGraphPreview(canvas, formula = "0") {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width || 320, h = canvas.height || 182;
  const xmin=-10, xmax=10, ymin=-6.6666666667, ymax=6.6666666667;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
  const sx=(x)=>(x-xmin)/(xmax-xmin)*w;
  const sy=(y)=>h-(y-ymin)/(ymax-ymin)*h;
  const x0=sx(0), y0=sy(0);
  ctx.strokeStyle="#111"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,y0+0.5); ctx.lineTo(w,y0+0.5); ctx.moveTo(x0+0.5,0); ctx.lineTo(x0+0.5,h); ctx.stroke();
  ctx.font="9px sans-serif"; ctx.fillStyle="#222";
  for (let x=-10;x<=10;x+=5) { const px=sx(x); ctx.beginPath(); ctx.moveTo(px,y0-2);ctx.lineTo(px,y0+2);ctx.stroke(); if(x!==0)ctx.fillText(String(x),px-5,y0+12); }
  for (let y=-5;y<=5;y+=5) { const py=sy(y); ctx.beginPath();ctx.moveTo(x0-2,py);ctx.lineTo(x0+2,py);ctx.stroke(); }
  ctx.strokeStyle="#0000ff"; ctx.lineWidth=1.2; ctx.beginPath();
  let drawing=false;
  for (let px=0;px<w;px++) {
    const x=xmin+(px/(w-1))*(xmax-xmin);
    const y=evaluateTiMathExpression(normalizeGraphFormulaInput(formula), {x});
    if (!Number.isFinite(y) || Math.abs(y)>1e8) { drawing=false; continue; }
    const py=sy(y);
    if (!Number.isFinite(py) || py < -h*3 || py > h*4) { drawing=false; continue; }
    if (!drawing) { ctx.moveTo(px,py); drawing=true; } else ctx.lineTo(px,py);
  }
  ctx.stroke();
}

async function addGraphWidgetToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_graph_current_file", currentFile);
  pyodide.globals.set("wasm_graph_card_b64", TI_GRAPH_CARD_TEMPLATE_B64);
  pyodide.globals.set("wasm_graph_sym_b64", TI_GRAPH_SYMBOL_TEMPLATE_B64);
  const payload = await pyodide.runPythonAsync(`
import base64
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root=Path("${xmlDoctor.sourcePath}"); stage_root=Path("${xmlDoctor.stagePath}")
current_file=Path(wasm_graph_current_file) if wasm_graph_current_file else None
xml_file=None
if current_file:
    try: rel=current_file.relative_to(stage_root)
    except ValueError:
        try: rel=current_file.relative_to(source_root)
        except ValueError: rel=Path(current_file.name)
    candidate=stage_root/rel
    if candidate.exists(): xml_file=candidate
if xml_file is None:
    problems=sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p:p.name.lower())
    if problems: xml_file=problems[0]
if xml_file is None: raise RuntimeError("No XML file available for Graphs")

tree=ET.parse(xml_file); root=tree.getroot()
prob_ns=root.tag[1:].split("}",1)[0] if root.tag.startswith("{") else ""
gg_ns="urn:TI.GeoGrapher"
ET.register_namespace("",prob_ns); ET.register_namespace("gg",gg_ns)
sym=next((x for x in root if local_name(x.tag)=="sym"),None)
if sym is None:
    sym=ET.Element(f"{{{prob_ns}}}sym" if prob_ns else "sym"); root.insert(0,sym)
used=set()
for entry in sym:
    if local_name(entry.tag)!="e": continue
    name=next(((child.text or "").strip() for child in entry if local_name(child.tag)=="n"),"")
    if name: used.add(name)
idx=1
while f"f{idx}" in used: idx+=1
fname=f"f{idx}"; formula="sin(x)"
card=ET.fromstring(base64.b64decode(wasm_graph_card_b64).decode("utf-8"))
entry=ET.fromstring(base64.b64decode(wasm_graph_sym_b64).decode("utf-8"))
old_raw="3*cos(2*x+π/2)+1"; old_norm="3*cos(2*x+((π)/(2)))+1"
for node in list(card.iter())+[entry]:
    if node.text:
        node.text=node.text.replace("f1",fname).replace(old_raw,formula).replace(old_norm,formula)
for node in entry.iter():
    if local_name(node.tag)=="n": node.text=fname
    elif local_name(node.tag)=="p": node.text="x"
    elif local_name(node.tag)=="v": node.text=formula
sym.append(entry); root.append(card)
body=ET.tostring(root,encoding="UTF-8",short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>'+body)
card_index=len([x for x in root if local_name(x.tag)=="card"])
wdgt=next((x for x in card if local_name(x.tag)=="wdgt"),None)
json.dumps({"type":"Widget","name":"TI.GeoGrapher","file":str(xml_file),"path":f"/prob/card[{card_index}]/wdgt","detail":{"function":fname,"expression":formula},"content":formula,"content_label":"Graph","raw_xml":ET.tostring(wdgt,encoding="unicode",short_empty_elements=False) if wdgt is not None else ""})
`);
  xmlDoctor.embedded=true; xmlDoctor.stagePrepared=true;
  const item=JSON.parse(payload); xmlLog(t("graphWidgetAdded")); return item;
}

async function saveGraphWidgetToStage(item, formula) {
  await ensureXmlStageCopy();
  const state=extractGraphStateFromRawXml(item?.raw_xml || "");
  const fname=item?.detail?.function || state.name || "f1";
  const clean=normalizeGraphFormulaInput(formula);
  pyodide.globals.set("wasm_graph_save_file", item?.file || "");
  pyodide.globals.set("wasm_graph_save_path", item?.path || "");
  pyodide.globals.set("wasm_graph_save_name", fname);
  pyodide.globals.set("wasm_graph_save_formula", clean);
  const payload=await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name, namespace_uri
source_root=Path("${xmlDoctor.sourcePath}"); stage_root=Path("${xmlDoctor.stagePath}")
source_file=Path(wasm_graph_save_file) if wasm_graph_save_file else None
xml_file=None
if source_file:
    try: rel=source_file.relative_to(stage_root)
    except ValueError:
        try: rel=source_file.relative_to(source_root)
        except ValueError: rel=Path(source_file.name)
    candidate=stage_root/rel
    if candidate.exists(): xml_file=candidate
if xml_file is None:
    problems=sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p:p.name.lower())
    if problems: xml_file=problems[0]
if xml_file is None: raise RuntimeError("No XML file available for Graph save")

def parse_part(part):
    text=str(part or "")
    if text.endswith("]") and "[" in text:
        name,raw=text.rsplit("[",1); raw=raw[:-1]
        if raw.isdigit(): return name,int(raw)
    return text,1

def resolve_path(root,path):
    parts=[p for p in str(path or "").split("/") if p]
    if parts and parse_part(parts[0])[0]==local_name(root.tag): parts=parts[1:]
    cur=root
    for part in parts:
        name,index=parse_part(part); matches=[c for c in cur if local_name(c.tag)==name]
        if index<1 or index>len(matches): return None
        cur=matches[index-1]
    return cur

tree=ET.parse(xml_file); root=tree.getroot(); gg_ns="urn:TI.GeoGrapher"
wdgt=resolve_path(root,wasm_graph_save_path)
if wdgt is None or wdgt.attrib.get("type")!="TI.GeoGrapher":
    matches=[n for n in root.iter() if local_name(n.tag)=="wdgt" and n.attrib.get("type")=="TI.GeoGrapher"]
    if not matches: raise RuntimeError("TI.GeoGrapher widget not found")
    wdgt=matches[-1]
fname=str(wasm_graph_save_name or "f1"); formula=str(wasm_graph_save_formula or "0")
for node in wdgt.iter():
    if namespace_uri(node.tag)!=gg_ns: continue
    lname=local_name(node.tag)
    if lname=="expression":
        for child in node:
            cn=local_name(child.tag)
            if cn in {"expr","relv"}: child.text=formula
            elif cn=="lbl": child.text=fname
    elif lname=="graph":
        for child in node:
            cn=local_name(child.tag)
            if cn=="expr": child.text=formula
            elif cn=="pref": child.text=f"{fname}(x)"
    elif lname=="label":
        has_graph_label=any(local_name(c.tag)=="lbl_g" for c in node)
        if has_graph_label:
            chrs=next((c for c in node if local_name(c.tag)=="chrs"),None)
            if chrs is not None: chrs.text=f"1 1 3 0 0 0 {fname}(x)={formula}\\n"
    elif lname=="ToolGrapher":
        dhs=next((c for c in node if local_name(c.tag)=="dhs"),None)
        if dhs is not None: dhs.text=f"*{fname}*"
sym=next((x for x in root if local_name(x.tag)=="sym"),None)
entry=None
if sym is not None:
    for candidate in sym:
        if local_name(candidate.tag)!="e": continue
        n=next((c for c in candidate if local_name(c.tag)=="n"),None)
        if n is not None and (n.text or "").strip()==fname: entry=candidate; break
if entry is None and sym is not None:
    entry=ET.SubElement(sym, f"{{{root.tag[1:].split('}',1)[0]}}}e" if root.tag.startswith("{") else "e", {"t":"6","f":"0","c":"255"})
    ns=root.tag[1:].split("}",1)[0] if root.tag.startswith("{") else ""
    def q(name): return f"{{{ns}}}{name}" if ns else name
    ET.SubElement(entry,q("n")).text=fname; ET.SubElement(entry,q("p")).text="x"; ET.SubElement(entry,q("v")).text=formula
elif entry is not None:
    for child in entry:
        if local_name(child.tag)=="v": child.text=formula
body=ET.tostring(root,encoding="UTF-8",short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>'+body)
json.dumps({"file":str(xml_file),"formula":formula,"function":fname,"raw_xml":ET.tostring(wdgt,encoding="unicode",short_empty_elements=False)})
`);
  xmlDoctor.embedded=true; xmlDoctor.stagePrepared=true; return JSON.parse(payload);
}

function showGraphModal(item) {
  const base=extractGraphStateFromRawXml(item?.raw_xml || "");
  const functionName=item?.detail?.function || base.name || "f1";
  const initialFormula=item?.content || item?.detail?.expression || base.formula || "sin(x)";
  const backdrop=document.createElement("div"); backdrop.className="modal-backdrop";
  backdrop.innerHTML=`
    <div class="modal graph-page-modal">
      <div class="modal-top-actions">
        <button type="button" id="graph-love-preview" class="green-tool-button">${escapeHtml(t("graphPreviewLove"))}</button>
        <button type="button" id="graph-save" class="green-tool-button">${escapeHtml(t("graphSave"))}</button>
        <button type="button" id="graph-cancel">${escapeHtml(t("cancel"))}</button>
      </div>
      <h2>${escapeHtml(t("graphTitle"))}</h2>
      <div class="graph-calculator-shell">
        <div class="love-preview-calculator-bar">CALCULATOR VIEW</div>
        <div class="graph-function-row"><span class="graph-check">□</span><span class="graph-function-name">${escapeHtml(functionName)}(x)=</span><input id="graph-formula-input" value="${escapeHtml(initialFormula)}" spellcheck="false"/><span class="graph-list-icon">☷</span></div>
        <canvas id="graph-native-canvas" width="320" height="182"></canvas>
      </div>
      <p class="muted-text">${escapeHtml(t("graphFormula"))}: ${escapeHtml(functionName)}(x)</p>
    </div>`;
  document.body.append(backdrop);
  const input=backdrop.querySelector("#graph-formula-input"); const canvas=backdrop.querySelector("#graph-native-canvas");
  const redraw=()=>drawNativeGraphPreview(canvas,input.value); redraw();
  input.addEventListener("input",redraw);
  backdrop.querySelector("#graph-cancel").addEventListener("click",()=>closeModal(backdrop));
  backdrop.querySelector("#graph-love-preview").addEventListener("click",()=>{
    const code=buildGraphPreviewLua(input.value,functionName);
    showLovePreview(code,null,null,{}).catch((error)=>xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
  });
  backdrop.querySelector("#graph-save").addEventListener("click",async()=>{
    try {
      const result=await saveGraphWidgetToStage(item,input.value);
      item.content=result.formula; item.detail={...(item.detail||{}),function:result.function,expression:result.formula}; item.raw_xml=result.raw_xml||item.raw_xml;
      xmlLog(`${t("graphSave")}: ${result.function}(x)=${result.formula}`); closeModal(backdrop);
    } catch(error) { xmlLog(`ERROR Graph Save: ${error.message}`); }
  });
  input.focus(); input.select();
}

async function addPageFromFileMenu(kind) {
  await ensureXmlProjectForPageCreation();

  if (kind === "image") {
    await openAddImageWidgetFlow();
    return;
  }
  if (kind === "python") {
    const item = await addPythonEditorToStage();
    showPythonEditor(item);
    return;
  }
  if (kind === "lua") {
    const item = await addLuaScriptAppToStage();
    showLuaEditor(item);
    return;
  }
  if (kind === "spreadsheet") {
    const item = await addSpreadsheetWidgetToStage();
    showSpreadsheetModal(item);
    return;
  }
  if (kind === "notepad") {
    const item = await addNotepadWidgetToStage();
    showNotepadModal(item);
    return;
  }
  if (kind === "graph") {
    const item = await addGraphWidgetToStage();
    await openGraphInLovePreview(item);
    return;
  }
  if (kind === "calculator") {
    const item = await addCalculatorWidgetToStage();
    await openCalculatorInLovePreview(item);
    return;
  }
  if (kind === "program-editor") {
    await addProgramEditorToStage();
    return;
  }
  throw new Error(`Tipo de página no soportado: ${kind}`);
}

async function createNewXmlProject() {
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
  xmlDoctor.sourceFileName = "documento.tns";
  for (const name of ["Document.xml", "Problem1.xml"]) {
    const response = await fetch(`./templates/blank_tns_xml/${name}?v=${SOURCE_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar plantilla ${name}: HTTP ${response.status}`);
    pyodide.FS.writeFile(`${xmlDoctor.sourcePath}/${name}`, await response.text());
  }
  xmlDoctor.embedded = false;
  xmlDoctor.stagePrepared = false;
  xmlDoctor.lastDiff = "";
  xmlDoctor.issueLines.clear();
  await scanXmlPrograms();
}

async function createTnsFromXmlDoctor() {
  if (xmlDoctor.current) {
    const nameError = tiDocumentNameError(xmlDoctor.current.program_name || "");
    if (nameError) throw new Error(nameError);
    if (!xmlDoctor.embedded) await embedXmlCode();
  } else if (!xmlDoctor.stagePrepared) {
    copyDir(xmlDoctor.sourcePath, xmlDoctor.stagePath);
    xmlDoctor.stagePrepared = true;
  }
  await ensureCryptoPackage();
  const outputName = xmlDoctorTnsOutputName();
  pyodide.globals.set("wasm_xml_tns_output", `/work/${outputName}`);
  await pyodide.runPythonAsync(`
from pathlib import Path
from tnstools import build_tns_from_xml
build_tns_from_xml(Path("${xmlDoctor.stagePath}"), Path(wasm_xml_tns_output))
`);
  downloadBytes(outputName, pyodide.FS.readFile(`/work/${outputName}`));
}

function xmlDoctorTnsOutputName() {
  const rawName = xmlDoctor.current?.program_name || xmlDoctor.sourceFileName || "documento";
  const baseName = rawName.replace(/\.tns$/i, "").replace(/\.xml$/i, "");
  const safeName = baseName.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+/, "")
    .slice(0, 15) || "documento";
  const index = Number.isFinite(Number(xmlDoctor.current?.index)) ? Number(xmlDoctor.current.index) + 1 : 1;
  return `${safeName}_output_${index}.tns`;
}

function tiDocumentNameError(name) {
  if (!name) return "Nombre de documento vacio.";
  if (name.length > 15) return "Nombre de variable de libreria invalido: no debe exceder 15 caracteres.";
  if (name.includes(".")) return "Nombre de variable de libreria invalido: no debe contener un punto.";
  if (name.startsWith("_")) return "Nombre de variable de libreria invalido: no debe comenzar con guion bajo.";
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return "Nombre de variable de libreria invalido: debe comenzar con una letra y usar solo letras, numeros o guion bajo.";
  return "";
}

async function copyPlainText(text) {
  const value = String(text ?? "");
  try {
    await navigator.clipboard.writeText(value);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function appendPreviewLog(logEl, message) {
  logEl.textContent += `${logEl.textContent ? "\n" : ""}${message}`;
  logEl.scrollTop = logEl.scrollHeight;
}

function logPreviewImageResources(logEl, resources = [], source = "") {
  const list = Array.isArray(resources) ? resources : [];
  const loaded = list.filter((resource) => resource?.canvas);
  const failed = list.filter((resource) => resource?.error);
  if (!list.length && /(?:_R\.IMG|image\.new|sourceName\s*=|["'][^"']+\.(?:bmp|png|jpe?g|gif)["'])/i.test(String(source || ""))) {
    appendPreviewLog(logEl, "TI resources loaded: 0");
  }
  for (const resource of loaded) {
    appendPreviewLog(
      logEl,
      `TI resource loaded: ${resource.group || "IMG"}.${resource.var || "img"} -> ${resource.name || resource.path} (${resource.width || "?"}x${resource.height || "?"})`,
    );
  }
  for (const resource of failed) {
    appendPreviewLog(logEl, `TI resource error: ${resource.name || resource.path || "unknown"}: ${resource.error}`);
  }
}

function looksLikeLoveSource(source) {
  const text = String(source || "");
  return /\blove\./.test(text) || /\bfunction\s+love\./.test(text);
}

function looksLikeTINSPIRELuaSource(source) {
  const text = String(source || "");
  return /\bplatform\./.test(text) || /\bon\.paint\b/.test(text) || /\bgc:/.test(text);
}

function convertLoveToNspireScriptApp(source = "") {
  const rawSource = decodeXmlTextEntities(String(source || "")).replace(/\r\n?/g, "\n").trim();
  if (/TNS Tool LOVE compatibility layer: start/.test(rawSource)) return rawSource;
  return `platform.apilevel = '2.0'

--[[ TNS Tool LOVE compatibility layer: start
This wrapper lets simple LÖVE-style scripts run as TI-Nspire ScriptApps.
It supports basic love.load/update/draw/input/window/graphics and text-only
love.filesystem calls. Audio, images, threads, joystick, touch, data and system
APIs are safe compatibility shims unless a TI-Nspire replacement exists.
]]

local __love_gc = nil
local __love_booted = false
local __love_dt = 0.03
local __love_start_ms = 0
local __love_quit = false
local __love_font_size = 12
local __love_color = {255, 255, 255}
local __love_bg = {0, 0, 0}
local __love_line_width = 1
local __love_keys = {}
local __love_mouse_x = 0
local __love_mouse_y = 0
local __love_mouse_buttons = {}
local __love_title = ""
local __love_transform = {1, 0, 0, 1, 0, 0}
local __love_transform_stack = {}
local __love_files = {}

os = os or {}
love = love or {}
love.graphics = love.graphics or {}
love.window = love.window or {}
love.keyboard = love.keyboard or {}
love.mouse = love.mouse or {}
love.timer = love.timer or {}
love.event = love.event or {}
love.math = love.math or {}
love.filesystem = love.filesystem or {}
love.system = love.system or {}
love.audio = love.audio or {}
love.sound = love.sound or {}
love.image = love.image or {}
love.data = love.data or {}
love.touch = love.touch or {}
love.joystick = love.joystick or {}
love.thread = love.thread or {}

local function __love_now_ms()
    if timer and timer.getMilliSecCounter then
        local ok, value = pcall(timer.getMilliSecCounter)
        if ok and value then return tonumber(value) or 0 end
    end
    return __love_start_ms
end

__love_start_ms = __love_now_ms()

function os.time()
    return math.floor(__love_now_ms() / 1000)
end

function os.clock()
    return (__love_now_ms() - __love_start_ms) / 1000
end

function os.difftime(t2, t1)
    return (tonumber(t2) or 0) - (tonumber(t1) or 0)
end

function os.date(format, time)
    if format == "*t" then
        local seconds = tonumber(time) or os.time()
        return {year = 1970, month = 1, day = 1, hour = 0, min = 0, sec = seconds % 60, wday = 5, yday = 1, isdst = false}
    end
    return tostring(tonumber(time) or os.time())
end

local function __love_channel(value)
    value = tonumber(value) or 0
    if value <= 1 then value = value * 255 end
    if value < 0 then return 0 end
    if value > 255 then return 255 end
    return math.floor(value + 0.5)
end

local function __love_set_gc_color(color)
    if __love_gc then
        __love_gc:setColorRGB(color[1], color[2], color[3])
    end
end

local function __love_apply_color()
    __love_set_gc_color(__love_color)
end

local function __love_set_font(size)
    __love_font_size = tonumber(size) or __love_font_size
    if __love_gc then
        __love_gc:setFont("sansserif", "r", __love_font_size)
    end
end

local function __love_copy_table(source)
    local out = {}
    for key, value in pairs(source or {}) do
        out[key] = value
    end
    return out
end

local function __love_transform_point(x, y)
    x, y = tonumber(x) or 0, tonumber(y) or 0
    local m = __love_transform
    return m[1] * x + m[3] * y + m[5], m[2] * x + m[4] * y + m[6]
end

local function __love_transform_rect(x, y, w, h)
    x, y, w, h = tonumber(x) or 0, tonumber(y) or 0, tonumber(w) or 0, tonumber(h) or 0
    local x1, y1 = __love_transform_point(x, y)
    local x2, y2 = __love_transform_point(x + w, y + h)
    local x3, y3 = __love_transform_point(x + w, y)
    local x4, y4 = __love_transform_point(x, y + h)
    local left, right = math.min(x1, x2, x3, x4), math.max(x1, x2, x3, x4)
    local top, bottom = math.min(y1, y2, y3, y4), math.max(y1, y2, y3, y4)
    return left, top, right - left, bottom - top
end

local function __love_apply_matrix(a, b, c, d, e, f)
    local m = __love_transform
    __love_transform = {
        m[1] * a + m[3] * b,
        m[2] * a + m[4] * b,
        m[1] * c + m[3] * d,
        m[2] * c + m[4] * d,
        m[1] * e + m[3] * f + m[5],
        m[2] * e + m[4] * f + m[6],
    }
end

local function __love_points_from_args(args)
    local raw = {}
    if #args == 1 and type(args[1]) == "table" then
        raw = args[1]
    else
        raw = args
    end
    local points = {}
    local index = 1
    while index + 1 <= #raw do
        local px, py = __love_transform_point(raw[index], raw[index + 1])
        table.insert(points, px)
        table.insert(points, py)
        index = index + 2
    end
    return points
end

local function __love_file_key(filename)
    filename = tostring(filename or ""):gsub("[^%w_]", "_")
    if filename == "" then filename = "unnamed" end
    return "__love_fs_" .. filename
end

local function __love_read_file(filename)
    local name = tostring(filename or "")
    if __love_files[name] ~= nil then return __love_files[name] end
    if var and var.recall then
        local ok, value = pcall(var.recall, __love_file_key(name))
        if ok and value ~= nil and tostring(value) ~= "__love_removed__" then
            __love_files[name] = tostring(value)
            return __love_files[name]
        end
    end
    return nil
end

local function __love_write_file(filename, data)
    local name = tostring(filename or "")
    local text = tostring(data or "")
    __love_files[name] = text
    if var and var.store then
        pcall(var.store, __love_file_key(name), text)
    end
    return true
end

local function __love_clear()
    if not __love_gc then return end
    __love_set_gc_color(__love_bg)
    __love_gc:fillRect(0, 0, platform.window:width(), platform.window:height())
    __love_set_font(__love_font_size)
    __love_apply_color()
end

local function __love_clear_transient_input()
    __love_keys = {}
    __love_mouse_buttons = {}
end

function love.graphics.setColor(r, g, b, a)
    if type(r) == "table" then
        __love_color = {__love_channel(r[1]), __love_channel(r[2] or r[1]), __love_channel(r[3] or r[2] or r[1])}
    else
        __love_color = {__love_channel(r), __love_channel(g or r), __love_channel(b or g or r)}
    end
    __love_apply_color()
end

function love.graphics.getColor()
    return __love_color[1] / 255, __love_color[2] / 255, __love_color[3] / 255, 1
end

function love.graphics.setBackgroundColor(r, g, b, a)
    if type(r) == "table" then
        __love_bg = {__love_channel(r[1]), __love_channel(r[2] or r[1]), __love_channel(r[3] or r[2] or r[1])}
    else
        __love_bg = {__love_channel(r), __love_channel(g or r), __love_channel(b or g or r)}
    end
end

function love.graphics.getBackgroundColor()
    return __love_bg[1] / 255, __love_bg[2] / 255, __love_bg[3] / 255, 1
end

function love.graphics.clear(r, g, b, a)
    if r ~= nil then
        love.graphics.setBackgroundColor(r, g, b, a)
    end
    __love_clear()
end

function love.graphics.print(text, x, y)
    if not __love_gc then return end
    __love_apply_color()
    local px, py = __love_transform_point(x, y)
    __love_gc:drawString(tostring(text or ""), px, py, "top")
end

function love.graphics.printf(text, x, y, limit, align)
    if not __love_gc then return end
    local drawX = tonumber(x) or 0
    local width = tonumber(limit) or platform.window:width()
    local label = tostring(text or "")
    if align == "center" then
        drawX = drawX + (width - __love_gc:getStringWidth(label)) / 2
    elseif align == "right" then
        drawX = drawX + width - __love_gc:getStringWidth(label)
    end
    love.graphics.print(label, drawX, y)
end

function love.graphics.rectangle(mode, x, y, w, h)
    if not __love_gc then return end
    x, y, w, h = __love_transform_rect(x, y, w, h)
    __love_apply_color()
    if mode == "fill" then
        __love_gc:fillRect(x, y, w, h)
    else
        __love_gc:drawRect(x, y, w, h)
    end
end

function love.graphics.circle(mode, x, y, radius)
    if not __love_gc then return end
    radius = math.max(0, tonumber(radius) or 0)
    x, y = __love_transform_point(x, y)
    local _, _, rw, rh = __love_transform_rect(-radius, -radius, radius * 2, radius * 2)
    local diameter = math.max(math.abs(rw), math.abs(rh))
    __love_apply_color()
    if mode == "fill" then
        __love_gc:fillArc(x - diameter / 2, y - diameter / 2, diameter, diameter, 0, 360)
    else
        __love_gc:drawArc(x - diameter / 2, y - diameter / 2, diameter, diameter, 0, 360)
    end
end

function love.graphics.ellipse(mode, x, y, rx, ry)
    if not __love_gc then return end
    x, y = __love_transform_point(x, y)
    rx, ry = math.max(0, tonumber(rx) or 0), math.max(0, tonumber(ry) or 0)
    local left, top, width, height = __love_transform_rect(-rx, -ry, rx * 2, ry * 2)
    __love_apply_color()
    if mode == "fill" then
        __love_gc:fillArc(x - width / 2, y - height / 2, width, height, 0, 360)
    else
        __love_gc:drawArc(x - width / 2, y - height / 2, width, height, 0, 360)
    end
end

function love.graphics.arc(...)
    if not __love_gc then return end
    local args = {...}
    local mode = args[1]
    local offset = 2
    if type(args[2]) == "string" then offset = 3 end
    local x, y, radius = args[offset], args[offset + 1], tonumber(args[offset + 2]) or 0
    local a1, a2 = tonumber(args[offset + 3]) or 0, tonumber(args[offset + 4]) or math.pi * 2
    x, y = __love_transform_point(x, y)
    radius = math.max(0, radius)
    __love_apply_color()
    if mode == "fill" then
        __love_gc:fillArc(x - radius, y - radius, radius * 2, radius * 2, -a1 * 180 / math.pi, -(a2 - a1) * 180 / math.pi)
    else
        __love_gc:drawArc(x - radius, y - radius, radius * 2, radius * 2, -a1 * 180 / math.pi, -(a2 - a1) * 180 / math.pi)
    end
end

function love.graphics.line(...)
    if not __love_gc then return end
    local values = __love_points_from_args({...})
    if #values < 4 then return end
    __love_apply_color()
    local index = 1
    while index + 3 <= #values do
        __love_gc:drawLine(tonumber(values[index]) or 0, tonumber(values[index + 1]) or 0, tonumber(values[index + 2]) or 0, tonumber(values[index + 3]) or 0)
        index = index + 2
    end
end

function love.graphics.points(...)
    if not __love_gc then return end
    local values = __love_points_from_args({...})
    __love_apply_color()
    local index = 1
    while index + 1 <= #values do
        __love_gc:fillRect(tonumber(values[index]) or 0, tonumber(values[index + 1]) or 0, 1, 1)
        index = index + 2
    end
end

function love.graphics.polygon(mode, ...)
    if not __love_gc then return end
    local points = __love_points_from_args({...})
    if #points < 6 then return end
    __love_apply_color()
    if mode == "fill" and __love_gc.fillPolygon then
        __love_gc:fillPolygon(points)
    elseif __love_gc.drawPolyLine then
        table.insert(points, points[1])
        table.insert(points, points[2])
        __love_gc:drawPolyLine(points)
    else
        local index = 1
        while index + 3 <= #points do
            __love_gc:drawLine(points[index], points[index + 1], points[index + 2], points[index + 3])
            index = index + 2
        end
        __love_gc:drawLine(points[#points - 1], points[#points], points[1], points[2])
    end
end

function love.graphics.setLineWidth(width)
    __love_line_width = tonumber(width) or 1
    if __love_gc and __love_gc.setPen then
        local size = __love_line_width
        __love_gc:setPen(size >= 3 and "thick" or size >= 2 and "medium" or "thin", "smooth")
    end
end

function love.graphics.getLineWidth()
    return __love_line_width
end

function love.graphics.setLineStyle(style) end
function love.graphics.getLineStyle() return "smooth" end
function love.graphics.setPointSize(size) end
function love.graphics.getPointSize() return 1 end

function love.graphics.getWidth()
    return platform.window:width()
end

function love.graphics.getHeight()
    return platform.window:height()
end

function love.graphics.getDimensions()
    return platform.window:width(), platform.window:height()
end

function love.graphics.newFont(size)
    return {size = tonumber(size) or __love_font_size}
end

function love.graphics.setFont(font)
    if type(font) == "table" then
        __love_set_font(font.size)
    else
        __love_set_font(font)
    end
end

function love.graphics.setNewFont(size)
    local font = love.graphics.newFont(size)
    love.graphics.setFont(font)
    return font
end

function love.graphics.getFont()
    return {size = __love_font_size}
end

function love.graphics.push()
    table.insert(__love_transform_stack, __love_copy_table(__love_transform))
end

function love.graphics.pop()
    if #__love_transform_stack > 0 then
        __love_transform = table.remove(__love_transform_stack)
    end
end

function love.graphics.origin()
    __love_transform = {1, 0, 0, 1, 0, 0}
end

function love.graphics.translate(x, y)
    __love_apply_matrix(1, 0, 0, 1, tonumber(x) or 0, tonumber(y) or 0)
end

function love.graphics.scale(x, y)
    x = tonumber(x) or 1
    y = tonumber(y) or x
    __love_apply_matrix(x, 0, 0, y, 0, 0)
end

function love.graphics.rotate(angle)
    angle = tonumber(angle) or 0
    local s, c = math.sin(angle), math.cos(angle)
    __love_apply_matrix(c, s, -s, c, 0, 0)
end
function love.graphics.setDefaultFilter() end
function love.graphics.setBlendMode() end
function love.graphics.getBlendMode() return "alpha" end
function love.graphics.setScissor(x, y, w, h)
    if __love_gc and __love_gc.clipRect then
        if x == nil then
            __love_gc:clipRect("reset")
        else
            local px, py, pw, ph = __love_transform_rect(x, y, w, h)
            __love_gc:clipRect("set", px, py, pw, ph)
        end
    end
end
function love.graphics.intersectScissor(x, y, w, h)
    love.graphics.setScissor(x, y, w, h)
end
function love.graphics.newImage() return {__love_unsupported = "image"} end
function love.graphics.newCanvas(width, height) return {width = width, height = height, __love_unsupported = "canvas"} end
function love.graphics.setCanvas() end
function love.graphics.draw() end

function love.window.setTitle(title)
    __love_title = tostring(title or "")
end

function love.window.getTitle()
    return __love_title
end

function love.window.setMode(width, height)
    return true
end

function love.window.getMode()
    return platform.window:width(), platform.window:height(), {}
end

function love.window.getDesktopDimensions()
    return platform.window:width(), platform.window:height()
end

function love.window.setFullscreen()
    return false
end

function love.window.getFullscreen()
    return false, "desktop"
end

function love.window.hasFocus()
    return true
end

function love.window.isVisible()
    return true
end

function love.keyboard.isDown(...)
    for _, key in ipairs({...}) do
        if __love_keys[tostring(key)] then return true end
    end
    return false
end

function love.keyboard.setKeyRepeat() end
function love.keyboard.hasKeyRepeat() return false end

function love.mouse.getPosition()
    return __love_mouse_x, __love_mouse_y
end

function love.mouse.getX()
    return __love_mouse_x
end

function love.mouse.getY()
    return __love_mouse_y
end

function love.mouse.isDown(...)
    for _, button in ipairs({...}) do
        if __love_mouse_buttons[button] then return true end
    end
    return false
end

function love.mouse.setVisible() end
function love.mouse.isVisible() return true end

function love.timer.getDelta()
    return __love_dt
end

function love.timer.getTime()
    if timer and timer.getMilliSecCounter then
        return timer.getMilliSecCounter() / 1000
    end
    return 0
end

function love.timer.getFPS()
    if __love_dt <= 0 then return 0 end
    return math.floor(1 / __love_dt + 0.5)
end

function love.timer.sleep() end
function love.timer.step() return __love_dt end

function love.event.quit()
    __love_quit = true
end

function os.exit()
    __love_quit = true
end

function love.event.clear() end
function love.event.pump() end
function love.event.push() end
function love.event.poll()
    return function() return nil end
end

function love.math.random(a, b)
    if a == nil then return math.random() end
    if b == nil then return math.random(a) end
    return math.random(a, b)
end

function love.math.setRandomSeed(seed)
    math.randomseed(tonumber(seed) or 1)
end

function love.math.getRandomSeed()
    return 0, 0
end

function love.filesystem.write(filename, data)
    return __love_write_file(filename, data)
end

function love.filesystem.append(filename, data)
    local current = __love_read_file(filename) or ""
    return __love_write_file(filename, current .. tostring(data or ""))
end

function love.filesystem.read(filename)
    return __love_read_file(filename)
end

function love.filesystem.getInfo(filename)
    local data = __love_read_file(filename)
    if data == nil then return nil end
    return {type = "file", size = #data}
end

function love.filesystem.exists(filename)
    return __love_read_file(filename) ~= nil
end

function love.filesystem.remove(filename)
    __love_files[tostring(filename or "")] = nil
    if var and var.store then
        pcall(var.store, __love_file_key(filename), "__love_removed__")
    end
    return true
end

function love.filesystem.lines(filename)
    local data = __love_read_file(filename) or ""
    local pos = 1
    return function()
        if pos > #data then return nil end
        local nextPos = string.find(data, "\\n", pos, true)
        local line
        if nextPos then
            line = string.sub(data, pos, nextPos - 1)
            pos = nextPos + 1
        else
            line = string.sub(data, pos)
            pos = #data + 1
        end
        return line
    end
end

function love.filesystem.getSaveDirectory()
    return "TI-Nspire var.store"
end

function love.filesystem.getWorkingDirectory()
    return "TI-Nspire ScriptApp"
end

function love.system.getOS()
    return "TI-Nspire"
end

function love.system.getProcessorCount()
    return 1
end

function love.system.getPowerInfo()
    return "unknown", nil
end

function love.system.getClipboardText()
    return ""
end

function love.system.setClipboardText() end
function love.system.openURL() return false end
function love.system.vibrate() end

local function __love_new_source()
    local source = {volume = 1, pitch = 1, looping = false, playing = false}
    function source:play() self.playing = true end
    function source:stop() self.playing = false end
    function source:pause() self.playing = false end
    function source:resume() self.playing = true end
    function source:isPlaying() return self.playing end
    function source:setLooping(value) self.looping = value and true or false end
    function source:isLooping() return self.looping end
    function source:setVolume(value) self.volume = tonumber(value) or self.volume end
    function source:getVolume() return self.volume end
    function source:setPitch(value) self.pitch = tonumber(value) or self.pitch end
    function source:getPitch() return self.pitch end
    function source:seek() end
    function source:tell() return 0 end
    function source:getDuration() return 0 end
    function source:clone() return __love_new_source() end
    return source
end

function love.audio.newSource()
    return __love_new_source()
end

function love.audio.play(...)
    for _, source in ipairs({...}) do
        if type(source) == "table" and source.play then source:play() end
    end
end

function love.audio.stop(...)
    for _, source in ipairs({...}) do
        if type(source) == "table" and source.stop then source:stop() end
    end
end

function love.audio.pause(...)
    for _, source in ipairs({...}) do
        if type(source) == "table" and source.pause then source:pause() end
    end
end

function love.audio.resume(...)
    for _, source in ipairs({...}) do
        if type(source) == "table" and source.resume then source:resume() end
    end
end

function love.audio.setVolume(value)
    love.audio.volume = tonumber(value) or love.audio.volume or 1
end

function love.audio.getVolume()
    return love.audio.volume or 1
end

function love.image.newImageData(width, height)
    return {type = "ImageData", width = tonumber(width) or 0, height = tonumber(height) or 0, __love_unsupported = "image"}
end

function love.sound.newSoundData()
    return {type = "SoundData", __love_unsupported = "sound"}
end

function love.data.encode(container, format, data)
    return tostring(data or "")
end

function love.data.decode(container, format, data)
    return tostring(data or "")
end

function love.data.compress(container, format, data)
    return tostring(data or "")
end

function love.data.decompress(container, format, data)
    return tostring(data or "")
end

function love.data.hash(algorithm, data)
    return tostring(algorithm or "hash") .. ":" .. tostring(#tostring(data or ""))
end

function love.touch.getTouches()
    return {}
end

function love.touch.getPosition()
    return 0, 0
end

function love.joystick.getJoysticks()
    return {}
end

function love.thread.newThread()
    local thread = {running = false}
    function thread:start() self.running = true end
    function thread:wait() self.running = false end
    function thread:isRunning() return self.running end
    function thread:getError() return nil end
    return thread
end

function love.thread.getChannel()
    local channel = {queue = {}}
    function channel:push(value) table.insert(self.queue, value) end
    function channel:pop()
        if #self.queue == 0 then return nil end
        return table.remove(self.queue, 1)
    end
    function channel:peek() return self.queue[1] end
    function channel:getCount() return #self.queue end
    function channel:clear() self.queue = {} end
    return channel
end

--[[ User LOVE source: start ]]
${rawSource || "-- Paste or write LÖVE code here."}
--[[ User LOVE source: end ]]

local function __love_boot()
    if __love_booted then return end
    __love_booted = true
    if love.load then love.load() end
    if timer and timer.start then timer.start(__love_dt) end
end

function on.create()
    __love_boot()
end

function on.construction()
    __love_boot()
end

function on.paint(gc)
    __love_gc = gc
    __love_boot()
    __love_clear()
    if love.draw then love.draw() end
end

function on.resize(width, height)
    __love_boot()
    if love.resize then love.resize(width or platform.window:width(), height or platform.window:height()) end
    platform.window:invalidate()
end

function on.timer()
    if __love_quit then
        if timer and timer.stop then timer.stop() end
        return
    end
    __love_boot()
    if love.update then love.update(__love_dt) end
    __love_clear_transient_input()
    platform.window:invalidate()
end

function on.arrowKey(key)
    key = tostring(key or "")
    __love_keys[key] = true
    if love.keypressed then love.keypressed(key) end
    platform.window:invalidate()
end

function on.enterKey()
    __love_keys["return"] = true
    if love.keypressed then love.keypressed("return") end
    platform.window:invalidate()
end

function on.escapeKey()
    __love_keys["escape"] = true
    if love.keypressed then love.keypressed("escape") end
    platform.window:invalidate()
end

function on.backspaceKey()
    __love_keys["backspace"] = true
    if love.keypressed then love.keypressed("backspace") end
    platform.window:invalidate()
end

function on.tabKey()
    __love_keys["tab"] = true
    if love.keypressed then love.keypressed("tab") end
    platform.window:invalidate()
end

function on.charIn(ch)
    if love.keypressed then love.keypressed(ch) end
    platform.window:invalidate()
end

function on.mouseDown(x, y)
    __love_mouse_x, __love_mouse_y = x, y
    __love_mouse_buttons[1] = true
    if love.mousepressed then love.mousepressed(x, y, 1) end
    platform.window:invalidate()
end

function on.mouseUp(x, y)
    __love_mouse_x, __love_mouse_y = x, y
    __love_mouse_buttons[1] = nil
    if love.mousereleased then love.mousereleased(x, y, 1) end
    platform.window:invalidate()
end

function on.mouseMove(x, y)
    __love_mouse_x, __love_mouse_y = x, y
end

--[[ TNS Tool LOVE compatibility layer: end ]]
`;
}

function recordLuaPreviewText(screenText, text, x, y, lineHeight = 12) {
  if (!Array.isArray(screenText)) return;
  const raw = String(text ?? "").replace(/\r/g, "");
  if (!raw.trim()) return;
  let lineY = Number(y) || 0;
  for (const line of raw.split("\n")) {
    if (line.trim()) {
      screenText.push({
        text: line.trimEnd(),
        x: Number(x) || 0,
        y: lineY,
      });
    }
    lineY += lineHeight;
  }
}

function eraseCoveredLuaPreviewText(screenText, x, y, w, h) {
  if (!Array.isArray(screenText) || Math.abs(Number(w) || 0) < 4 || Math.abs(Number(h) || 0) < 4) return;
  const left = Math.min(Number(x) || 0, (Number(x) || 0) + (Number(w) || 0));
  const right = Math.max(Number(x) || 0, (Number(x) || 0) + (Number(w) || 0));
  const top = Math.min(Number(y) || 0, (Number(y) || 0) + (Number(h) || 0));
  const bottom = Math.max(Number(y) || 0, (Number(y) || 0) + (Number(h) || 0));
  for (let index = screenText.length - 1; index >= 0; index -= 1) {
    const item = screenText[index];
    if (item.x >= left - 2 && item.x <= right + 2 && item.y >= top - 2 && item.y <= bottom + 14) {
      screenText.splice(index, 1);
    }
  }
}

function formatLuaPreviewScreenText(screenText) {
  const seen = new Set();
  const items = (Array.isArray(screenText) ? screenText : [])
    .map((item) => ({
      text: String(item.text ?? "").trim(),
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
    }))
    .filter((item) => item.text);
  items.sort((a, b) => a.y - b.y || a.x - b.x || a.text.localeCompare(b.text));
  const rows = [];
  for (const item of items) {
    const key = `${Math.round(item.x)}|${Math.round(item.y)}|${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - item.y) <= 5) {
      last.items.push(item);
      last.y = (last.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }
  return rows
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join("    ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeLuaPreviewCopiedText(text) {
  return normalizeTiRichText(String(text ?? "").replace(/\r/g, "")).trim();
}

function luaJsGlobalText(global, names = []) {
  for (const name of names) {
    const value = global?.G?.str?.[name];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const text = normalizeLuaPreviewCopiedText(value);
      if (text) return text;
    }
  }
  return "";
}

function luaJsNativeEditorsFullText(nativeEditors = []) {
  const parts = [];
  for (const state of nativeEditors) {
    if (!state || state.visible === false || !String(state.text || "").trim()) continue;
    parts.push(normalizeLuaPreviewCopiedText(state.text));
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

async function showLuaPreview(code, item = null) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal lua-preview-modal">
      <h2>${escapeHtml(t("previewLua"))}</h2>
      <canvas id="lua-preview-canvas" width="318" height="212"></canvas>
      <div class="preview-controls">
        <button type="button" data-event="on.enterKey">Enter</button>
        <button type="button" data-event="on.escapeKey">Esc</button>
        <button type="button" data-event="on.arrowLeft">Left</button>
        <button type="button" data-event="on.arrowRight">Right</button>
        <button type="button" data-event="on.arrowUp">Up</button>
        <button type="button" data-event="on.arrowDown">Down</button>
      </div>
      <input id="lua-preview-input" class="preview-text-capture" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Entrada: escribe simbolos aqui" />
      <pre id="lua-preview-log" class="mini-log"></pre>
      <div class="modal-actions">
        <button type="button" id="lua-preview-copy-content">${escapeHtml(t("copyScreenContent"))}</button>
        <button type="button" id="lua-preview-copy-log">${escapeHtml(t("copyLog"))}</button>
        <button type="button" id="lua-preview-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const canvas = backdrop.querySelector("#lua-preview-canvas");
  const ctx = canvas.getContext("2d");
  const previewLog = backdrop.querySelector("#lua-preview-log");
  const textCapture = backdrop.querySelector("#lua-preview-input");
  const symbols = item ? await loadLuaPreviewSymbols(item, code).catch(() => ({})) : {};
  let runtime;
  try {
    runtime = await createLuaJsPreviewRuntime(code, ctx, canvas, previewLog, symbols);
    runtime.boot();
  } catch (error) {
    previewLog.textContent = `LuaJS no pudo iniciar (${error.message}). Usando preview limitado.\n${error.stack || ""}`;
    runtime = createLuaPreviewRuntime(code, ctx, canvas, previewLog);
    runtime.boot();
  }
  for (const button of backdrop.querySelectorAll(".preview-controls button")) {
    button.addEventListener("click", () => {
      runtime.callEvent(button.dataset.event);
      textCapture.focus();
    });
  }
  textCapture.addEventListener("input", () => {
    const value = textCapture.value;
    if (!value) return;
    for (const char of value) runtime.charIn(char);
    textCapture.value = "";
  });
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((event.clientY - rect.top) * (canvas.height / rect.height));
    if (runtime.mouseClick) runtime.mouseClick(x, y);
    textCapture.focus();
  });
  const keyHandler = (event) => {
    if (!backdrop.isConnected) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const mapped = previewKeyboardEventToLua(event);
    if (!mapped) return;
    event.preventDefault();
    if (mapped.char) runtime.charIn(mapped.char);
    else runtime.callEvent(mapped.event);
  };
  document.addEventListener("keydown", keyHandler);
  setTimeout(() => textCapture.focus(), 50);
  backdrop.querySelector("#lua-preview-copy-content").addEventListener("click", async () => {
    const text = runtime.getScreenText ? runtime.getScreenText() : "";
    await copyPlainText(text);
    appendPreviewLog(previewLog, text.trim() ? t("screenContentCopied") : t("screenContentEmpty"));
  });
  backdrop.querySelector("#lua-preview-copy-log").addEventListener("click", async () => {
    await copyPlainText(previewLog.textContent || "");
    appendPreviewLog(previewLog, t("logCopied"));
  });
  backdrop.querySelector("#lua-preview-close").addEventListener("click", () => {
    document.removeEventListener("keydown", keyHandler);
    closeModal(backdrop, () => runtime.close());
  });
}

const LOVE_PREVIEW_CALCULATOR_CHROME_HEIGHT = 26;
const LOVE_PREVIEW_CALCULATOR_SIZE = Object.freeze({ width: 320, height: 214 });
const LOVE_PREVIEW_EXPANDED_SIZE = Object.freeze({ width: 800, height: 600 });
const LOVE_PROJECT_TEXT_DECODER = new TextDecoder("utf-8");

function formatLoveProjectMessage(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));
}

function normalizeLoveProjectPath(path) {
  const raw = String(path || "")
    .replace(/\\/g, "/")
    .replace(/^[A-Za-z]:\//, "")
    .replace(/^\/+/, "");
  const parts = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

function normalizeLoveProjectFiles(files) {
  return (Array.isArray(files) ? files : [])
    .map((file) => ({
      path: normalizeLoveProjectPath(file.path || file.name || ""),
      bytes: file.bytes instanceof Uint8Array ? file.bytes : file.bytes ? new Uint8Array(file.bytes) : null,
      text: typeof file.text === "string" ? file.text : null,
    }))
    .filter((file) => file.path && (file.bytes || file.text != null));
}

function stripCommonLoveProjectRoot(files) {
  const normalized = normalizeLoveProjectFiles(files);
  if (normalized.some((file) => file.path.toLowerCase() === "main.lua")) return normalized;
  const main = normalized.find((file) => file.path.toLowerCase().endsWith("/main.lua"));
  if (!main) return normalized;
  const prefix = main.path.slice(0, -8);
  return normalized.map((file) => (
    file.path.startsWith(prefix) ? { ...file, path: file.path.slice(prefix.length) } : file
  ));
}

function findLoveProjectFile(files, path) {
  const target = normalizeLoveProjectPath(path).toLowerCase();
  if (!target) return null;
  return (Array.isArray(files) ? files : []).find((file) => file.path.toLowerCase() === target) || null;
}

function loveProjectFileToText(file) {
  if (!file) return "";
  if (typeof file.text === "string") return file.text;
  file.text = LOVE_PROJECT_TEXT_DECODER.decode(file.bytes || new Uint8Array());
  return file.text;
}

function loveProjectBytesToBinaryString(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array();
  let output = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < data.length; index += chunkSize) {
    output += String.fromCharCode(...data.subarray(index, index + chunkSize));
  }
  return output;
}

function loveProjectFileToLuaString(file) {
  if (!file) return null;
  if (file._luaString != null) return file._luaString;
  file._luaString = file.bytes ? loveProjectBytesToBinaryString(file.bytes) : String(file.text ?? "");
  return file._luaString;
}

function loveProjectDirectoryItems(files, directory) {
  const dir = normalizeLoveProjectPath(directory);
  const prefix = dir ? `${dir}/` : "";
  const items = new Set();
  for (const file of files) {
    if (!file.path.startsWith(prefix)) continue;
    const rest = file.path.slice(prefix.length);
    if (!rest) continue;
    items.add(rest.split("/")[0]);
  }
  return [...items].sort((a, b) => a.localeCompare(b));
}

function resolveLoveProjectModule(files, moduleName) {
  const modulePath = normalizeLoveProjectPath(String(moduleName || "").replace(/\./g, "/"));
  const candidates = [
    `${modulePath}.lua`,
    `${modulePath}/init.lua`,
    modulePath,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const file = findLoveProjectFile(files, candidate);
    if (file) return { path: file.path, file, attempts: candidates };
  }
  return { path: "", file: null, attempts: candidates };
}

function buildLoveProjectSource(project) {
  const parts = [`-- TNS Tool LÖVE project preview: ${project.entryPath}`];
  if (project.confPath && project.confSource != null) {
    parts.push(`--[[ ${project.confPath}: start ]]`);
    parts.push(project.confSource);
    parts.push(`--[[ ${project.confPath}: end ]]`);
    parts.push(`
local __tns_love_conf = { window = {} }
if love and love.conf then
  love.conf(__tns_love_conf)
end
if __tns_love_conf.window and love and love.window and love.window.setMode then
  local __w = tonumber(__tns_love_conf.window.width)
  local __h = tonumber(__tns_love_conf.window.height)
  if __w and __h then
    love.window.setMode(__w, __h)
  end
end`);
  }
  parts.push(`--[[ ${project.entryPath}: start ]]`);
  parts.push(project.entrySource);
  parts.push(`--[[ ${project.entryPath}: end ]]`);
  return parts.join("\n\n");
}

function finalizeLoveProject(files, entryPath = "main.lua", title = "LÖVE project") {
  const normalized = stripCommonLoveProjectRoot(files);
  if (!normalized.length) throw new Error(t("loveProjectNoFiles"));
  const requestedEntry = normalizeLoveProjectPath(entryPath || "main.lua");
  let entryFile = findLoveProjectFile(normalized, requestedEntry);
  if (!entryFile && requestedEntry.toLowerCase() !== "main.lua") {
    entryFile = normalized.find((file) => file.path.toLowerCase().endsWith(`/${requestedEntry.toLowerCase()}`)) || null;
  }
  if (!entryFile) entryFile = findLoveProjectFile(normalized, "main.lua");
  if (!entryFile) throw new Error(t("loveProjectNoMain"));
  const confFile = findLoveProjectFile(normalized, "conf.lua");
  const project = {
    title,
    files: normalized,
    entryPath: entryFile.path,
    entrySource: loveProjectFileToText(entryFile),
    confPath: confFile?.path || "",
    confSource: confFile ? loveProjectFileToText(confFile) : "",
  };
  project.source = buildLoveProjectSource(project);
  return project;
}

async function readBrowserFileBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

async function loadLoveProjectFromFolder(fileList, entryPath) {
  const files = [];
  for (const file of Array.from(fileList || [])) {
    if (!file || file.size == null) continue;
    files.push({
      path: file.webkitRelativePath || file.name,
      bytes: await readBrowserFileBytes(file),
    });
  }
  return finalizeLoveProject(files, entryPath, "folder");
}

async function loadLoveProjectFromZip(file, entryPath) {
  if (!window.JSZip) throw new Error("JSZip is not loaded.");
  const zip = await window.JSZip.loadAsync(file);
  const files = [];
  const entries = Object.values(zip.files || {});
  for (const entry of entries) {
    if (!entry || entry.dir) continue;
    files.push({
      path: entry.name,
      bytes: await entry.async("uint8array"),
    });
  }
  return finalizeLoveProject(files, entryPath, file.name || "ZIP");
}

async function showLoveProjectPicker(editor = null, editorLog = null) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal love-project-modal">
      <h2>${escapeHtml(t("loveProjectTitle"))}</h2>
      <p class="muted-text">${escapeHtml(t("loveProjectIntro"))}</p>
      <div class="love-project-picker">
        <label for="love-project-entry">${escapeHtml(t("loveProjectEntry"))}</label>
        <input id="love-project-entry" value="main.lua" spellcheck="false" />
        <div class="love-project-actions">
          <button type="button" id="love-project-open-zip" class="love-preview-tool-button">${escapeHtml(t("loveProjectOpenZip"))}</button>
          <button type="button" id="love-project-open-folder" class="green-tool-button">${escapeHtml(t("loveProjectOpenFolder"))}</button>
        </div>
        <input id="love-project-zip-input" type="file" accept=".zip,.love,application/zip" hidden />
        <input id="love-project-folder-input" type="file" multiple hidden />
        <pre id="love-project-status" class="mini-log">${escapeHtml(t("ready"))}</pre>
      </div>
      <div class="modal-actions">
        <button type="button" id="love-project-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const entryInput = backdrop.querySelector("#love-project-entry");
  const status = backdrop.querySelector("#love-project-status");
  const zipInput = backdrop.querySelector("#love-project-zip-input");
  const folderInput = backdrop.querySelector("#love-project-folder-input");
  folderInput.setAttribute("webkitdirectory", "");
  folderInput.setAttribute("directory", "");
  const launch = async (loader) => {
    status.textContent = t("loveProjectLoading");
    try {
      const project = await loader();
      const loadedMessage = formatLoveProjectMessage(t("loveProjectLoaded"), {
        count: project.files.length,
        entry: project.entryPath,
      });
      if (editorLog) editorLog.textContent = loadedMessage;
      closeModal(backdrop, () => {
        showLovePreview(project.source, editor, editorLog, { project }).catch((error) => {
          if (editorLog) editorLog.textContent += `\n[ERROR] Preview LÖVE Project: ${error.message}`;
        });
      });
    } catch (error) {
      status.textContent = `ERROR: ${error.message}`;
      if (editorLog) editorLog.textContent += `\n[ERROR] Preview LÖVE Project: ${error.message}`;
    }
  };
  backdrop.querySelector("#love-project-open-zip").addEventListener("click", () => zipInput.click());
  backdrop.querySelector("#love-project-open-folder").addEventListener("click", () => folderInput.click());
  zipInput.addEventListener("change", () => {
    const file = zipInput.files?.[0];
    if (file) launch(() => loadLoveProjectFromZip(file, entryInput.value));
  });
  folderInput.addEventListener("change", () => {
    const files = folderInput.files;
    if (files?.length) launch(() => loadLoveProjectFromFolder(files, entryInput.value));
  });
  backdrop.querySelector("#love-project-close").addEventListener("click", () => closeModal(backdrop));
}

async function showLovePreview(code, editor = null, editorLog = null, options = {}) {
  const project = options?.project || null;
  const graphEditor = options?.graphEditor || null;
  const calculatorEditor = options?.calculatorEditor || null;
  const projectInfo = project
    ? formatLoveProjectMessage(t("loveProjectLoaded"), { count: project.files.length, entry: project.entryPath })
    : "";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal love-preview-modal">
      <div class="modal-top-actions">
        <button type="button" id="love-preview-size-toggle" class="green-tool-button" aria-pressed="false">${escapeHtml(t("lovePreviewExpandedView"))}</button>
        <button type="button" id="love-preview-close-top">${escapeHtml(t("close"))}</button>
      </div>
      <h2>${escapeHtml(t("previewLove"))}</h2>
      <p class="muted-text">${escapeHtml(projectInfo ? `${t("lovePreviewNote")} ${projectInfo}` : t("lovePreviewNote"))}</p>
      ${graphEditor ? `
      <div class="love-graph-editor">
        <label class="love-graph-formula-label" for="love-graph-formula">
          ${escapeHtml(graphEditor.functionName || "f1")}(x)=
        </label>
        <input id="love-graph-formula" class="love-graph-formula-input"
          value="${escapeHtml(graphEditor.formula || "sin(x)")}"
          placeholder="${escapeHtml(t("graphLiveFormula"))}" spellcheck="false" />
        <button type="button" id="love-graph-apply" class="green-tool-button">${escapeHtml(t("graphApplyPreview"))}</button>
        <button type="button" id="love-graph-save" class="green-tool-button">${escapeHtml(t("graphSave"))}</button>
      </div>` : ""}
      ${calculatorEditor ? `
      <div class="love-calculator-editor">
        <div class="love-calculator-editor-row love-calculator-toolbar">
          <button type="button" id="love-calculator-templates-toggle" class="green-tool-button love-calculator-templates-toggle" title="${escapeHtml(t("calculatorTemplates"))}" aria-label="${escapeHtml(t("calculatorTemplates"))}"><img src="./assets/calculator-icons/templates_dark.png" alt="" /></button>
          <span class="love-calculator-toolbar-spacer"></span>
          <button type="button" id="love-calculator-save" class="green-tool-button">${escapeHtml(t("calculatorSave"))}</button>
          <button type="button" id="love-calculator-cancel">${escapeHtml(t("calculatorCancel"))}</button>
        </div>
        <div id="love-calculator-template-panel" class="love-calculator-template-panel" hidden>${TI_CALCULATOR_TEMPLATES.map(([file,template,label])=>`<button type="button" class="love-calculator-template-button" data-file="${escapeHtml(file)}" data-template="${escapeHtml(template)}" title="${escapeHtml(label)}"><img src="./assets/calculator-icons/${escapeHtml(file)}" alt="${escapeHtml(label)}" /></button>`).join("")}</div>
      </div>` : ""}
      <div id="love-preview-stage" class="love-preview-stage calculator-view ${calculatorEditor ? "calculator-editor-stage" : ""}">
        <div class="love-preview-calculator-bar">${escapeHtml(t("lovePreviewCalculatorChromeTitle"))}</div>
        <canvas id="love-preview-canvas" class="calculator-view" width="320" height="214" tabindex="0"></canvas>
        ${calculatorEditor ? `<textarea id="love-calculator-keyboard-capture" class="love-calculator-keyboard-capture" aria-label="TI-Nspire math entry" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>` : ""}
      </div>
      <div class="preview-controls">
        <button type="button" data-key="up">Up</button>
        <button type="button" data-key="down">Down</button>
        <button type="button" data-key="left">Left</button>
        <button type="button" data-key="right">Right</button>
        <button type="button" data-key="space">Space</button>
        <button type="button" data-key="return">Enter</button>
        <button type="button" data-key="escape">Esc</button>
      </div>
      <pre id="love-preview-log" class="mini-log"></pre>
      <div class="modal-actions">
        <button type="button" id="love-preview-copy-content">${escapeHtml(t("copyScreenContent"))}</button>
        ${project || calculatorEditor ? "" : `<button type="button" id="love-copy-nspire">${escapeHtml(t("loveCopyNspire"))}</button>
        <button type="button" id="love-replace-nspire" class="green-tool-button">${escapeHtml(t("loveReplaceNspire"))}</button>`}
        <button type="button" id="love-preview-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const canvas = backdrop.querySelector("#love-preview-canvas");
  const stage = backdrop.querySelector("#love-preview-stage");
  const ctx = canvas.getContext("2d");
  const previewLog = backdrop.querySelector("#love-preview-log");
  const sizeToggle = backdrop.querySelector("#love-preview-size-toggle");
  let runtime = null;
  let currentCode = String(code || "");
  let previewSizeMode = "calculator";
  const applyPreviewSize = (mode, shouldLog = false) => {
    const normalizedMode = mode === "expanded" ? "expanded" : "calculator";
    const size = normalizedMode === "expanded" ? LOVE_PREVIEW_EXPANDED_SIZE : LOVE_PREVIEW_CALCULATOR_SIZE;
    previewSizeMode = normalizedMode;
    canvas.width = size.width;
    canvas.height = size.height;
    stage.classList.toggle("expanded-view", normalizedMode === "expanded");
    stage.classList.toggle("calculator-view", normalizedMode !== "expanded");
    canvas.classList.toggle("expanded-view", normalizedMode === "expanded");
    canvas.classList.toggle("calculator-view", normalizedMode !== "expanded");
    sizeToggle.textContent = t(normalizedMode === "expanded" ? "lovePreviewCalculatorView" : "lovePreviewExpandedView");
    sizeToggle.setAttribute("aria-pressed", String(normalizedMode === "expanded"));
    runtime?.resize?.(size.width, size.height);
    if (shouldLog) {
      const totalHeight = normalizedMode === "calculator" ? size.height + LOVE_PREVIEW_CALCULATOR_CHROME_HEIGHT : size.height;
      const canvasNote = normalizedMode === "calculator" ? ` (canvas ${size.width}x${size.height})` : "";
      appendPreviewLog(previewLog, `${t("lovePreviewSizeChanged")}: ${size.width}x${totalHeight}${canvasNote}`);
    }
  };
  applyPreviewSize("calculator");
  const bootPreviewSource = async (source) => {
    currentCode = String(source || "");
    runtime?.close?.();
    runtime = null;
    if (calculatorEditor) {
      previewLog.textContent = "";
      const sourceCode = source && /\blove\.draw\b/.test(String(source))
        ? String(source)
        : calculatorLoveBuildPreviewLua(
            calculatorEditor.rows || [],
            calculatorEditor.mathState?.source || "",
            calculatorEditor.mathState?.caret || 0,
            calculatorEditor.selectedIndex ?? -1,
            calculatorEditor.scrollPx || 0
          );
      try {
        runtime = await createLovePreviewRuntime(sourceCode, ctx, canvas, previewLog, {});
        runtime.boot();
        appendPreviewLog(previewLog, `TI.Scratchpad / LÖVE: ${calculatorEditor.rows?.length || 0} entradas.`);
      } catch (error) {
        appendPreviewLog(previewLog, `ERROR Calculator Preview LÖVE: ${describeLuaJsError(error)}`);
      }
      return;
    }

    const targetCtx = canvas.getContext("2d");
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, canvas.width, canvas.height);
    previewLog.textContent = "";

    const isLoveSource = project || looksLikeLoveSource(currentCode);
    const isNspireSource = looksLikeTINSPIRELuaSource(currentCode);
    if (isLoveSource && !isNspireSource) {
      appendPreviewLog(previewLog, t("lovePreviewCalculatorWarning"));
      if (project) appendPreviewLog(previewLog, t("loveProjectConversionDisabled"));
      if (!/\blove\.(draw|update|load)\b/.test(currentCode)) appendPreviewLog(previewLog, t("lovePreviewNoCallbacks"));
      try {
        runtime = await createLovePreviewRuntime(currentCode, ctx, canvas, previewLog, { project });
        runtime.boot();
      } catch (error) {
        appendPreviewLog(previewLog, `ERROR Preview LÖVE: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      }
    } else if (isNspireSource) {
      appendPreviewLog(previewLog, t("lovePreviewNspireCompat"));
      try {
        const sourceItem = graphEditor?.item || options?.item || null;
        const symbols = sourceItem ? await loadLuaPreviewSymbols(sourceItem, currentCode).catch((error) => {
          appendPreviewLog(previewLog, `ERROR recursos Preview LÖVE: ${describeLuaJsError(error)}`);
          return {};
        }) : {};
        logPreviewImageResources(previewLog, symbols.resources || [], currentCode);
        runtime = await createLovePreviewNspireRuntime(currentCode, ctx, canvas, previewLog, symbols);
        runtime.boot();
      } catch (error) {
        appendPreviewLog(previewLog, `ERROR Preview LÖVE/TI-Nspire: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      }
    } else {
      appendPreviewLog(previewLog, t("lovePreviewNoCallbacks"));
    }
  };

  await bootPreviewSource(currentCode);

  for (const button of backdrop.querySelectorAll(".preview-controls button")) {
    button.addEventListener("click", () => {
      if (calculatorEditor) {
        const key = button.dataset.key;
        if (key === "left") calculatorEditor.moveCaret?.(-1);
        else if (key === "right") calculatorEditor.moveCaret?.(1);
        else if (key === "space") calculatorEditor.insertText?.(" ");
        else if (key === "return") calculatorEditor.commitComposer?.();
        else if (key === "up" || key === "down") calculatorEditor.scrollBy?.(key === "up" ? -54 : 54);
        else if (key === "escape") backdrop.querySelector("#love-calculator-keyboard-capture")?.blur();
      } else {
        runtime?.keypressed(button.dataset.key); canvas.focus();
      }
    });
  }
  sizeToggle.addEventListener("click", () => {
    applyPreviewSize(previewSizeMode === "expanded" ? "calculator" : "expanded", true);
    if (!calculatorEditor) canvas.focus();
    else setTimeout(() => backdrop.querySelector('#love-calculator-keyboard-capture')?.focus(), 0);
  });
  canvas.addEventListener("click", (event) => {
    const rect=canvas.getBoundingClientRect(),x=Math.round((event.clientX-rect.left)*(canvas.width/rect.width)),y=Math.round((event.clientY-rect.top)*(canvas.height/rect.height));
    if (calculatorEditor) {
      const capture=backdrop.querySelector("#love-calculator-keyboard-capture");
      const histH=(canvas.height||214)-58;
      if(y<histH){
        let pos=-Number(calculatorEditor.scrollPx||0),found=-1;
        for(let i=0;i<(calculatorEditor.rows||[]).length;i++){
          const txt=`${calculatorEditor.rows[i].entry||""}${calculatorEditor.rows[i].display||""}`;
          const rh=/[∫∑∏]|root\(|√\(|system\(|piecewise\(|\[\[|d\(/.test(txt)?62:48;
          if(y>=pos&&y<pos+rh){found=i;break;}pos+=rh;
        }
        if(found>=0)calculatorEditor.selectedIndex=found;
      }else{
        // Clicking the MathPrint line focuses entry. Repeated clicks advance through empty boxes.
        const src=String(calculatorEditor.mathState?.source||"");
        const boxes=calculatorLoveSlotRanges(src);
        if(boxes.length){
          const cur=calculatorEditor.mathState.caret||0;
          calculatorEditor.mathState.caret=(boxes.find(v=>v.start>=cur)||boxes[0]).start;
        }
      }
      calculatorEditor.refreshLove?.();capture?.focus();
    } else { runtime?.mousepressed(x,y,1); canvas.focus(); }
  });
  const isEditablePreviewTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
      )
    );
  };

  const keyDownHandler = (event) => {
    if (!backdrop.isConnected || event.ctrlKey || event.altKey || event.metaKey) return;
    if (isEditablePreviewTarget(event.target)) return;
    const key = lovePreviewKeyboardName(event);
    if (!key) return;
    if (calculatorEditor) {
      if (key === "left" || key === "right") { event.preventDefault(); calculatorEditor.moveCaret?.(key === "left" ? -1 : 1); }
      else if (key === "up" || key === "down") { event.preventDefault(); calculatorEditor.scrollBy?.(key === "up" ? -54 : 54); }
      else if (key === "return") { event.preventDefault(); calculatorEditor.commitComposer?.(); }
      return;
    }
    event.preventDefault(); runtime?.keydown(key);
  };
  const keyUpHandler = (event) => {
    if (!backdrop.isConnected || event.ctrlKey || event.altKey || event.metaKey) return;
    if (isEditablePreviewTarget(event.target)) return;
    const key = lovePreviewKeyboardName(event);
    if (!key) return;
    event.preventDefault();
    runtime?.keyup(key);
  };
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("keyup", keyUpHandler);
  backdrop.querySelector("#love-copy-nspire")?.addEventListener("click", async () => {
    await copyPlainText(convertLoveToNspireScriptApp(currentCode));
    appendPreviewLog(previewLog, t("loveCopiedNspire"));
  });
  backdrop.querySelector("#love-preview-copy-content")?.addEventListener("click", async () => {
    const text = calculatorEditor
      ? calculatorLoveVisibleText(
          calculatorEditor.rows || [],
          calculatorEditor.mathState || null,
          calculatorEditor.scrollPx || 0,
          Math.max(40, (canvas.height || 214) - 58)
        )
      : (runtime?.getScreenText?.() || "");
    await copyPlainText(text);
    appendPreviewLog(previewLog, text.trim() ? t("screenContentCopied") : t("screenContentEmpty"));
  });
  backdrop.querySelector("#love-replace-nspire")?.addEventListener("click", () => {
    if (!editor) return;
    editor.value = convertLoveToNspireScriptApp(currentCode);
    editor.dispatchEvent(new Event("input"));
    appendPreviewLog(previewLog, t("loveConvertedNspire"));
    if (editorLog) editorLog.textContent = t("loveConvertedNspire");
  });
  if (calculatorEditor) {
    const save = backdrop.querySelector("#love-calculator-save");
    const cancel = backdrop.querySelector("#love-calculator-cancel");
    const toggle = backdrop.querySelector("#love-calculator-templates-toggle");
    const panel = backdrop.querySelector("#love-calculator-template-panel");
    const capture = backdrop.querySelector("#love-calculator-keyboard-capture");
    calculatorEditor.mathState = calculatorLoveNewState();
    calculatorEditor.selectedIndex = -1;
    calculatorEditor.scrollPx = Math.max(0, calculatorLoveHistoryHeight(calculatorEditor.rows||[]) - Math.max(40,(canvas.height||214)-58));
    let refreshToken=0;

    calculatorEditor.refreshLove = async () => {
      const token=++refreshToken;
      const source=calculatorLoveBuildPreviewLua(
        calculatorEditor.rows||[],calculatorEditor.mathState.source,calculatorEditor.mathState.caret,
        calculatorEditor.selectedIndex??-1,calculatorEditor.scrollPx||0
      );
      await bootPreviewSource(source);
      if(token!==refreshToken)return;
    };
    calculatorEditor.insertText = (text) => { calculatorLoveInsert(calculatorEditor.mathState,text); calculatorEditor.refreshLove(); };
    calculatorEditor.moveCaret = (delta) => { calculatorLoveMove(calculatorEditor.mathState,delta); calculatorEditor.refreshLove(); capture?.focus(); };
    calculatorEditor.scrollBy = (delta) => {
      const max=Math.max(0,calculatorLoveHistoryHeight(calculatorEditor.rows||[]) - Math.max(40,(canvas.height||214)-58));
      calculatorEditor.scrollPx=Math.max(0,Math.min(max,(calculatorEditor.scrollPx||0)+delta));calculatorEditor.refreshLove();
    };
    calculatorEditor.commitComposer = () => {
      const raw=calculatorLovePlainSource(calculatorEditor.mathState).trim();
      if(!raw || !calculatorLoveComplete(calculatorEditor.mathState))return false;
      calculatorEditor.rows.push(calculateScratchpadRow(raw));
      calculatorEditor.selectedIndex=calculatorEditor.rows.length-1;
      calculatorEditor.mathState=calculatorLoveNewState();
      calculatorEditor.scrollPx=Math.max(0,calculatorLoveHistoryHeight(calculatorEditor.rows||[]) - Math.max(40,(canvas.height||214)-58));
      calculatorEditor.refreshLove();
      previewLog.textContent='';appendPreviewLog(previewLog,`Entrada: ${raw}`);capture?.focus();return true;
    };

    toggle?.addEventListener("click",()=>{panel.hidden=!panel.hidden;if(!panel.hidden)panel.querySelector('button')?.focus();else capture?.focus();});
    for(const b of backdrop.querySelectorAll(".love-calculator-template-button")){
      b.addEventListener("click",()=>{
        calculatorLoveInsertTemplate(calculatorEditor.mathState,b.dataset.file||"");
        panel.hidden=true;calculatorEditor.refreshLove();capture?.focus();
      });
    }

    capture?.addEventListener('keydown',(event)=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key==='Enter'){event.preventDefault();calculatorEditor.commitComposer();return;}
      if(event.key==='ArrowLeft'){event.preventDefault();calculatorEditor.moveCaret(-1);return;}
      if(event.key==='ArrowRight'){event.preventDefault();calculatorEditor.moveCaret(1);return;}
      if(event.key==='ArrowUp'){event.preventDefault();calculatorEditor.scrollBy(-54);return;}
      if(event.key==='ArrowDown'){event.preventDefault();calculatorEditor.scrollBy(54);return;}
      if(event.key==='Backspace'){event.preventDefault();calculatorLoveBackspace(calculatorEditor.mathState);calculatorEditor.refreshLove();return;}
      if(event.key==='Delete'){event.preventDefault();calculatorLoveDelete(calculatorEditor.mathState);calculatorEditor.refreshLove();return;}
      if(event.key==='Escape'){event.preventDefault();capture.blur();return;}
      if(event.key.length===1){event.preventDefault();calculatorLoveInsert(calculatorEditor.mathState,event.key);calculatorEditor.refreshLove();}
    });
    capture?.addEventListener('paste',(event)=>{
      event.preventDefault();const text=(event.clipboardData||window.clipboardData)?.getData('text')||'';
      calculatorLoveInsert(calculatorEditor.mathState,text.replace(/[\r\n]+/g,' '));calculatorEditor.refreshLove();
    });
    capture?.addEventListener('input',()=>{capture.value='';});

    stage.addEventListener("wheel",(event)=>{event.preventDefault();calculatorEditor.scrollBy(event.deltaY);capture?.focus();},{passive:false});
    let dragY=null,dragStart=0;
    canvas.addEventListener('pointerdown',(event)=>{dragY=event.clientY;dragStart=calculatorEditor.scrollPx||0;canvas.setPointerCapture?.(event.pointerId);});
    canvas.addEventListener('pointermove',(event)=>{if(dragY==null)return;const dy=event.clientY-dragY;const max=Math.max(0,calculatorLoveHistoryHeight(calculatorEditor.rows||[])-Math.max(40,(canvas.height||214)-58));calculatorEditor.scrollPx=Math.max(0,Math.min(max,dragStart-dy*(canvas.height/canvas.getBoundingClientRect().height)));calculatorEditor.refreshLove();});
    canvas.addEventListener('pointerup',()=>{dragY=null;capture?.focus();});canvas.addEventListener('pointercancel',()=>{dragY=null;});

    save?.addEventListener("click",async()=>{
      save.disabled=true;
      try{
        if(calculatorLoveComplete(calculatorEditor.mathState))calculatorEditor.commitComposer();
        const r=await saveCalculatorWidgetToStage(calculatorEditor.item,calculatorEditor.rows);
        calculatorEditor.item.raw_xml=r.raw_xml||calculatorEditor.item.raw_xml;calculatorEditor.item.file=r.file||calculatorEditor.item.file;
        calculatorEditor.item.detail={...(calculatorEditor.item.detail||{}),rows:calculatorEditor.rows.map(x=>({...x})),rowCount:calculatorEditor.rows.length};
        xmlLog(`${t("calculatorSave")}: ${r.saved_rows} entradas guardadas en TI.Scratchpad`);closeLovePreview();
      }catch(e){save.disabled=false;xmlLog(`ERROR Calculator Save: ${e.message}`);}
    });
    cancel?.addEventListener("click",()=>closeLovePreview());
    await calculatorEditor.refreshLove();setTimeout(()=>capture?.focus(),0);
  }

  if (graphEditor) {
    const graphInput = backdrop.querySelector("#love-graph-formula");
    const graphApply = backdrop.querySelector("#love-graph-apply");
    const graphSave = backdrop.querySelector("#love-graph-save");
    const graphFunctionName = graphEditor.functionName || "f1";
    let previewTimer = null;

    const refreshGraphPreview = async () => {
      const formula = normalizeGraphFormulaInput(graphInput?.value || "0") || "0";
      const source = buildGraphPreviewLua(formula, graphFunctionName);
      await bootPreviewSource(source);

      // Validation independent from LuaJS: this makes malformed formulas explicit
      // instead of silently looking like an empty graph.
      let finiteSamples = 0;
      for (let testX = -10; testX <= 10; testX += 1) {
        const testY = evaluateTiMathExpression(formula, { x: testX });
        if (Number.isFinite(testY)) finiteSamples += 1;
      }
      if (!finiteSamples) {
        appendPreviewLog(previewLog, `Graph formula could not be evaluated: ${formula}`);
      }
      // Mantener el foco en el campo de fórmula durante el auto-preview.
    };

    graphApply?.addEventListener("click", () => {
      refreshGraphPreview()
        .then(() => graphInput?.focus())
        .catch((error) => xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
    });

    graphInput?.addEventListener("input", () => {
      if (previewTimer) window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => {
        refreshGraphPreview().catch((error) => xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
      }, 250);
    });

    graphInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (previewTimer) window.clearTimeout(previewTimer);
        refreshGraphPreview()
          .then(() => graphInput?.focus())
          .catch((error) => xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
      }
    });

    graphSave?.addEventListener("click", async () => {
      try {
        if (previewTimer) window.clearTimeout(previewTimer);
        const formula = normalizeGraphFormulaInput(graphInput?.value || "0") || "0";
        const result = await saveGraphWidgetToStage(graphEditor.item, formula);
        graphEditor.item.detail = { ...(graphEditor.item.detail || {}), function: result.function, expression: result.formula };
        graphEditor.item.content = result.formula;
        graphEditor.item.raw_xml = result.raw_xml || graphEditor.item.raw_xml;
        graphEditor.formula = result.formula;
        currentCode = buildGraphPreviewLua(result.formula, result.function);
        xmlLog(`${t("graphSave")}: ${result.function}(x)=${result.formula}`);
        closeLovePreview();
      } catch (error) {
        xmlLog(`ERROR Graph Save: ${error.message}`);
      }
    });
  }

  const closeLovePreview = () => {
    document.removeEventListener("keydown", keyDownHandler);
    document.removeEventListener("keyup", keyUpHandler);
    closeModal(backdrop, () => runtime?.close());
  };
  backdrop.querySelector("#love-preview-close-top").addEventListener("click", closeLovePreview);
  backdrop.querySelector("#love-preview-close").addEventListener("click", closeLovePreview);
}

async function createLovePreviewNspireRuntime(code, ctx, canvas, logEl, symbols = {}) {
  const internalCanvas = document.createElement("canvas");
  internalCanvas.width = Math.max(1, canvas.width || 320);
  internalCanvas.height = Math.max(1, canvas.height || 214);
  const internalCtx = internalCanvas.getContext("2d");
  const luaRuntime = await createLuaJsPreviewRuntime(code, internalCtx, internalCanvas, logEl, symbols);
  let blitTimer = null;
  const blit = () => {
    if (!canvas.isConnected) return;
    const targetCtx = canvas.getContext("2d");
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, canvas.width, canvas.height);
    targetCtx.drawImage(internalCanvas, 0, 0, canvas.width, canvas.height);
  };
  const syncSize = (width, height) => {
    const nextWidth = Math.max(1, Math.round(Number(width) || canvas.width || internalCanvas.width || 320));
    const nextHeight = Math.max(1, Math.round(Number(height) || canvas.height || internalCanvas.height || 214));
    internalCanvas.width = nextWidth;
    internalCanvas.height = nextHeight;
    return { width: nextWidth, height: nextHeight };
  };
  const keyToEvent = (key) => {
    const map = {
      up: "on.arrowUp",
      down: "on.arrowDown",
      left: "on.arrowLeft",
      right: "on.arrowRight",
      return: "on.enterKey",
      escape: "on.escapeKey",
      backspace: "on.backspaceKey",
      tab: "on.tabKey",
    };
    return map[String(key || "").toLowerCase()] || "";
  };
  const dispatchKey = (key) => {
    const normalized = String(key || "");
    const eventName = keyToEvent(normalized);
    if (eventName) {
      luaRuntime.callEvent(eventName);
      blit();
      return;
    }
    luaRuntime.charIn(normalized === "space" ? " " : normalized);
    blit();
  };
  return {
    boot: () => {
      syncSize(canvas.width, canvas.height);
      luaRuntime.boot();
      blit();
      blitTimer = window.setInterval(blit, 120);
    },
    keydown: dispatchKey,
    keyup: () => {},
    keypressed: dispatchKey,
    mousepressed: (x, y) => {
      luaRuntime.mouseClick(x, y);
      blit();
    },
    resize: (width, height) => {
      const size = syncSize(width, height);
      luaRuntime.resize?.(size.width, size.height);
      blit();
    },
    close: () => {
      if (blitTimer) window.clearInterval(blitTimer);
      luaRuntime.close?.();
    },
    getScreenText: () => luaRuntime.getScreenText?.() || "",
  };
}

function lovePreviewKeyboardName(event) {
  const map = {
    Enter: "return",
    Escape: "escape",
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    Backspace: "backspace",
    Tab: "tab",
    " ": "space",
  };
  if (map[event.key]) return map[event.key];
  if (event.key?.length === 1) return event.key.toLowerCase();
  return null;
}

function previewKeyboardEventToLua(event) {
  const map = {
    Enter: "on.enterKey",
    Escape: "on.escapeKey",
    ArrowLeft: "on.arrowLeft",
    ArrowRight: "on.arrowRight",
    ArrowUp: "on.arrowUp",
    ArrowDown: "on.arrowDown",
    Backspace: "on.backspaceKey",
    Tab: event.shiftKey ? "on.backtabKey" : "on.tabKey",
  };
  if (map[event.key]) return { event: map[event.key] };
  if (event.key === "Dead") return { char: "^" };
  if (event.key.length === 1) return { char: event.key };
  return null;
}

async function loadLuaPreviewSymbols(item, sourceOverride = null) {
  if (!item?.file || !pyodide) return {};
  pyodide.globals.set("wasm_lua_symbol_file", item.file);
  pyodide.globals.set("wasm_lua_symbol_path", item.path || "");
  pyodide.globals.set("wasm_lua_symbol_content", sourceOverride ?? item.content ?? "");
  pyodide.globals.set("wasm_lua_symbol_stage_root", xmlDoctor.stagePath || "");
  pyodide.globals.set("wasm_lua_symbol_source_root", xmlDoctor.sourcePath || "");
  const payload = await pyodide.runPythonAsync(`
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

def scalar(value):
    text = (value or "").strip()
    if len(text) >= 2 and text[0] == '"' and text[-1] == '"':
        return text[1:-1]
    if re.fullmatch(r"-?\\d+", text):
        return int(text)
    if re.fullmatch(r"-?\\d+(?:\\.\\d+)?", text):
        return float(text)
    return None

def parse_list(text):
    text = (text or "").strip()
    if not (text.startswith("{") and text.endswith("}")):
        return None
    body = text[1:-1].strip()
    if not body:
        return []
    parts = []
    current = ""
    quote = False
    depth = 0
    for ch in body:
        if ch == '"':
            quote = not quote
        if not quote and ch == "{":
            depth += 1
        elif not quote and ch == "}":
            depth -= 1
        if ch == "," and not quote and depth == 0:
            parts.append(current)
            current = ""
        else:
            current += ch
    parts.append(current)
    values = []
    for part in parts:
        part = part.strip()
        nested = parse_list(part)
        values.append(nested if nested is not None else scalar(part))
    return values

def convert(value):
    parsed = parse_list(value)
    if parsed is not None:
        return parsed
    return scalar(value)

path = Path(wasm_lua_symbol_file)
tree = ET.parse(path)
root = tree.getroot()
parent_map = {child: parent for parent in root.iter() for child in parent}
variables = {}
functions = []
basic_functions = {}
resources = []

def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

def decode_res_len(chunk):
    if len(chunk) != 3:
        return 0
    value = 0
    for ch in chunk:
        value = value * 26 + max(0, ord(ch) - ord("A"))
    return value

def parse_res_descriptor(text):
    out = []
    text = text or ""
    index = 3 if text.startswith("AAC") else 0
    while index + 3 <= len(text):
        name_len = decode_res_len(text[index:index + 3])
        index += 3
        if name_len <= 0 or index + name_len > len(text):
            break
        name = text[index:index + name_len]
        index += name_len
        if index + 3 > len(text):
            out.append((name, "img"))
            break
        var_len = decode_res_len(text[index:index + 3])
        index += 3
        var_name = text[index:index + var_len] if var_len > 0 else "img"
        index += max(0, var_len)
        out.append((name, var_name or "img"))
    return out

def resource_roots():
    roots = []
    seen = set()
    for candidate in [path.parent, *path.parents, Path(wasm_lua_symbol_stage_root or ""), Path(wasm_lua_symbol_source_root or "")]:
        if not candidate:
            continue
        key = str(candidate)
        if key and key not in seen:
            seen.add(key)
            roots.append(candidate)
    return roots

def add_resource(name, var_name="img", group="IMG"):
    clean_name = (name or "").strip()
    if not clean_name:
        return
    for root_candidate in resource_roots():
        candidates = [root_candidate / clean_name, root_candidate / Path(clean_name).name]
        for candidate in candidates:
            if candidate.exists():
                found = str(candidate)
                if not any(item["path"] == found for item in resources):
                    resources.append({"name": clean_name, "var": var_name or "img", "group": group or "IMG", "path": found})
                return

def image_candidates():
    found = {}
    for root_candidate in resource_roots():
        if not root_candidate.exists():
            continue
        for ext in [".BMP", ".bmp", ".PNG", ".png", ".JPG", ".jpg", ".JPEG", ".jpeg", ".GIF", ".gif"]:
            for candidate in root_candidate.glob("*" + ext):
                if candidate.is_file():
                    found.setdefault(candidate.name.lower(), candidate)
    return list(found.values())

def script_widget(script):
    parent = parent_map.get(script)
    while parent is not None and not (local_name(parent.tag) == "wdgt" and parent.attrib.get("type") == "TI.ScriptApp"):
        parent = parent_map.get(parent)
    return parent

def normalize_script_text(text):
    return (text or "").replace("\\r\\n", "\\n").replace("\\r", "\\n").strip()

def widget_image_names(widget):
    if widget is None:
        return []
    names = []
    for child in widget.iter():
        if local_name(child.tag) == "iname" and (child.text or "").strip():
            names.append((child.text or "").strip())
    return names

def collect_widget_resources(widget):
    if widget is None:
        return
    image_names = []
    resource_descriptor = ""
    for child in widget.iter():
        lname = local_name(child.tag)
        if lname == "iname" and (child.text or "").strip():
            image_names.append((child.text or "").strip())
        elif lname == "mde" and child.attrib.get("name") == "_RES":
            resource_descriptor = child.text or ""
    entries = parse_res_descriptor(resource_descriptor)
    if not entries:
        entries = [(name, "img") for name in image_names]
    for name, var_name in entries:
        add_resource(name, var_name or "img", "IMG")

target_path = wasm_lua_symbol_path or ""
target_content = wasm_lua_symbol_content or ""
target_norm = normalize_script_text(target_content)
target_script = None
scripts = [element for element in root.iter() if local_name(element.tag) == "script"]
for element in scripts:
    script_norm = normalize_script_text(element.text)
    if (
        element_path(element) == target_path
        or (target_norm and script_norm == target_norm)
        or (target_norm and script_norm and (target_norm in script_norm or script_norm in target_norm))
    ):
        target_script = element
        break
if target_script is None and target_norm:
    for element in scripts:
        names = widget_image_names(script_widget(element))
        if any(name and name in target_norm for name in names):
            target_script = element
            break
if target_script is None and len(scripts) == 1:
    target_script = scripts[0]
if target_script is not None:
    collect_widget_resources(script_widget(target_script))
script_text = target_content or ((target_script.text or "") if target_script is not None else "")
if not resources:
    for name in re.findall(r'\\bsourceName\\s*=\\s*["\\']([^"\\']+)["\\']', script_text):
        add_resource(name, "img", "IMG")
if not resources:
    for name in re.findall(r'["\\']([^"\\']+\\.(?:bmp|png|jpe?g|gif))["\\']', script_text, flags=re.I):
        add_resource(name, "img", "IMG")
if not resources and "_R.IMG.img" in script_text:
    images = image_candidates()
    if len(images) == 1:
        add_resource(images[0].name, "img", "IMG")
if not resources:
    script_widgets = [element for element in root.iter() if local_name(element.tag) == "wdgt" and element.attrib.get("type") == "TI.ScriptApp"]
    if len(script_widgets) == 1:
        collect_widget_resources(script_widgets[0])

for element in root.iter():
    if local_name(element.tag) != "e":
        continue
    name = None
    value = None
    params = ""
    for child in element:
        lname = local_name(child.tag)
        if lname == "n":
            name = child.text or ""
        elif lname == "v":
            value = child.text or ""
        elif lname == "p":
            params = child.text or ""
    if not name:
        continue
    if params or (value or "").lstrip().startswith(("Func", "Prgm")):
        functions.append(name)
        if (value or "").lstrip().startswith("Func"):
            basic_functions[name] = {"params": params, "body": value}
    else:
        converted = convert(value)
        if converted is not None:
            variables[name] = converted
json.dumps({"variables": variables, "functions": functions, "basicFunctions": basic_functions, "resources": resources})
`);
  const raw = JSON.parse(payload);
  const convertValue = (value) => {
    if (Array.isArray(value) && typeof window.lua_newtable === "function") return window.lua_newtable(value.map(convertValue));
    return value;
  };
  const resources = await loadLuaPreviewImageResources(raw.resources || []);
  return {
    variables: Object.fromEntries(Object.entries(raw.variables || {}).map(([key, value]) => [key, convertValue(value)])),
    functions: raw.functions || [],
    basicFunctions: raw.basicFunctions || {},
    resources,
  };
}

async function renderImageBytesToCanvas(bytes, name = "image") {
  const canvas = document.createElement("canvas");
  if (isBmpBytes(bytes)) {
    renderBmpToCanvas(canvas, bytes);
    return canvas;
  }
  const blob = new Blob([bytes], { type: imageMimeFromName(name) });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(t("viewImage")));
      img.src = url;
    });
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadLuaPreviewImageResources(resources = []) {
  const output = [];
  for (const resource of resources) {
    try {
      const bytes = pyodide.FS.readFile(resource.path);
      const canvas = await renderImageBytesToCanvas(bytes, resource.name);
      output.push({
        ...resource,
        canvas,
        width: canvas.width,
        height: canvas.height,
      });
    } catch (error) {
      output.push({ ...resource, error: error.message });
    }
  }
  return output;
}

const LUAJS_RUNTIME_FILES = [
  "vendor/luajs/lua.js",
  "vendor/luajs/nspire/env.js",
  "vendor/luajs/nspire/tools.js",
  "vendor/luajs/nspire/bindings.js",
  "vendor/luajs/nspire/platform.js",
  "vendor/luajs/nspire/timer.js",
  "vendor/luajs/nspire/locale.js",
];

let luaJsRuntimeSources = null;

async function loadLuaJsRuntimeSources() {
  if (luaJsRuntimeSources) return luaJsRuntimeSources;
  luaJsRuntimeSources = [];
  for (const file of LUAJS_RUNTIME_FILES) {
    const response = await fetch(`./${file}?v=${SOURCE_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    luaJsRuntimeSources.push(await response.text());
  }
  return luaJsRuntimeSources;
}

async function createLuaJsPreviewRuntime(code, ctx, canvas, logEl, symbols = {}) {
  const sources = await loadLuaJsRuntimeSources();
  for (const source of sources) {
    (0, eval)(source);
  }
  hardenLuaJsPreviewRuntime();

  const safeCode = normalizeLuaPreviewSource(decodeXmlTextEntities(code));
  const global = window;
  global.canvas = canvas;
  global.context = ctx;
  global.SCALE = 1;
  global._WIDTH = canvas.width;
  global._HEIGHT = canvas.height;
  const varTable = ensureLuaJsTable("var");
  const stringTable = ensureLuaJsTable("string");
  const mathTable = ensureLuaJsTable("math");
  const platformTable = ensureLuaJsTable("platform");
  const onTable = ensureLuaJsTable("on");
  const timerTable = ensureLuaJsTable("timer");
  const cursorTable = ensureLuaJsTable("cursor");
  const d2EditorTable = ensureLuaJsTable("D2Editor");
  const imageTable = ensureLuaJsTable("image");
  global.G.str.platform = platformTable;
  global.G.str.on = onTable;
  const previewGc = global.lua_newtable();
  const previewWindow = global.lua_newtable();
  const screenText = [];
  attachLuaJsGc(previewGc, ctx, canvas, screenText);
  global.lua_tableset(previewWindow, "w", canvas.width);
  global.lua_tableset(previewWindow, "h", canvas.height);
  global.lua_tableset(previewWindow, "gc", previewGc);
  global.lua_tableset(previewWindow, "invalidated", false);
  global.lua_tableset(previewWindow, "width", () => [canvas.width]);
  global.lua_tableset(previewWindow, "height", () => [canvas.height]);
  global.lua_tableset(previewWindow, "invalidate", () => {
    global.lua_tableset(previewWindow, "invalidated", true);
    return [];
  });
  global.lua_tableset(previewWindow, "invalidateAll", () => {
    global.lua_tableset(previewWindow, "invalidated", true);
    return [];
  });
  global.lua_tableset(previewWindow, "setFocus", () => []);
  global.lua_tableset(previewWindow, "setBackgroundColor", (_self, color) => {
    global.lua_tableset(previewWindow, "backgroundColor", color);
    return [];
  });
  global.lua_tableset(platformTable, "window", previewWindow);
  global.lua_tableset(platformTable, "gc", () => [previewGc]);
  global.lua_tableset(platformTable, "hw", () => [5]);
  global.lua_tableset(platformTable, "isTabletModeRendering", () => [false]);
  global.lua_tableset(platformTable, "isDeviceModeRendering", () => [false]);
  global.lua_tableset(platformTable, "withGC", (func, ...args) => {
    if (func) global.lua_call(func, [...args, previewGc]);
    return [];
  });

  const store = { ...symbols.variables };
  const basicFunctions = { ...(symbols.basicFunctions || {}) };
  const nativeEditors = [];
  attachLuaJsImageApi(imageTable, symbols.resources || [], global);
  global.lua_tableset(varTable, "store", (key, value) => {
    const cleanValue = normalizeLuaJsNumericValue(value);
    store[String(key)] = cleanValue;
    global.G.str[String(key)] = cleanValue;
    return [];
  });
  global.lua_tableset(varTable, "recall", (key) => [Object.prototype.hasOwnProperty.call(store, String(key)) ? store[String(key)] : null]);
  global.lua_tableset(stringTable, "uchar", (codepoint) => [String.fromCharCode(Number(codepoint) || 0)]);
  global.lua_tableset(stringTable, "find", luaJsStringFind);
  global.lua_tableset(stringTable, "match", luaJsStringMatch);
  global.lua_tableset(stringTable, "gsub", luaJsStringGsub);
  global.lua_tableset(mathTable, "eval", (expr) => luaJsMathEval(expr, store, global, basicFunctions));
  attachLuaJsD2Editor(d2EditorTable, nativeEditors);
  if (!global.lua_tableget(timerTable, "getMilliSecCounter")) {
    const startedAt = performance.now();
    global.lua_tableset(timerTable, "getMilliSecCounter", () => [Math.round(performance.now() - startedAt)]);
  }
  if (!global.lua_tableget(timerTable, "start")) global.lua_tableset(timerTable, "start", () => {
    global.lua_tableset(timerTable, "running", true);
    return [];
  });
  if (!global.lua_tableget(timerTable, "stop")) global.lua_tableset(timerTable, "stop", () => {
    global.lua_tableset(timerTable, "running", false);
    return [];
  });
  if (!global.lua_tableget(varTable, "monitor")) global.lua_tableset(varTable, "monitor", () => []);
  if (!global.lua_tableget(varTable, "unmonitor")) global.lua_tableset(varTable, "unmonitor", () => []);
  if (!global.lua_tableget(cursorTable, "hide")) global.lua_tableset(cursorTable, "hide", () => []);
  if (!global.lua_tableget(cursorTable, "show")) global.lua_tableset(cursorTable, "show", () => []);
  if (!global.lua_tableget(cursorTable, "set")) global.lua_tableset(cursorTable, "set", () => []);

  const evalLuaJsSource = (source) => {
    const parsed = global.lua_parser.parse(source).split("\n").slice(19).join("\n");
    (0, eval)(parsed);
  };
  const userCode = global.lua_parser.parse(safeCode).split("\n").slice(19).join("\n");
  for (const [name, value] of Object.entries(store)) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) global.G.str[name] = value;
  }
  for (const [name, definition] of Object.entries(basicFunctions)) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      global.G.str[name] = (...args) => [evaluateTiBasicFunction(definition, args, store, basicFunctions)];
    }
  }
  for (const name of symbols.functions || []) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !global.G.str[name]) {
      global.G.str[name] = () => [0];
    }
  }
  (0, eval)(userCode);
  evalLuaJsSource(`
    if WidgetManager and not WidgetManager.cleanWidgets then
      function WidgetManager:cleanWidgets()
        if self.widgets then
          for _, widget in pairs(self.widgets) do
            if widget.editor then
              if widget.editor.setVisible then widget.editor:setVisible(false) end
              if widget.editor.setFocus then widget.editor:setFocus(false) end
            end
          end
        end
        self.widgets = {}
        self.focus = 0
      end
    end
    if WScreen and WidgetManager and WidgetManager.cleanWidgets and not WScreen.cleanWidgets then
      WScreen.cleanWidgets = WidgetManager.cleanWidgets
    end
    if Main and WidgetManager and WidgetManager.cleanWidgets and not Main.cleanWidgets then
      Main.cleanWidgets = WidgetManager.cleanWidgets
    end
  `);

  let timerId = null;
  function log(message) {
    logEl.textContent += `${logEl.textContent ? "\n" : ""}${message}`;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function windowTable() {
    return global.lua_tableget(global.G.str.platform, "window");
  }
  function gc() {
    return global.lua_tableget(windowTable(), "gc");
  }
  function clear() {
    screenText.length = 0;
    canvas.width = canvas.width;
    global.context = canvas.getContext("2d");
    global.context.font = "20px Arial";
  }
  function resize(width, height) {
    const nextWidth = Math.max(1, Math.min(1280, Math.round(Number(width) || canvas.width)));
    const nextHeight = Math.max(1, Math.min(900, Math.round(Number(height) || canvas.height)));
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    global._WIDTH = nextWidth;
    global._HEIGHT = nextHeight;
    global.context = canvas.getContext("2d");
    global.context.font = "20px Arial";
    const currentWindow = windowTable();
    global.lua_tableset(currentWindow, "w", nextWidth);
    global.lua_tableset(currentWindow, "h", nextHeight);
    global.lua_tableset(currentWindow, "invalidated", true);
    try {
      global.callEvent("resize", nextWidth, nextHeight);
      repaint(true);
    } catch (error) {
      log(`ERROR resize LuaJS: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function repaint(shouldLog = false) {
    clear();
    try {
      global.callEvent("paint", gc());
      drawLuaJsNativeEditors(ctx, nativeEditors, screenText);
    } catch (error) {
      log(`ERROR repaint LuaJS: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      throw error;
    }
    global.lua_tableset(windowTable(), "invalidated", false);
    if (shouldLog) log("Snapshot actualizado con LuaJS.");
  }
  function callCurrentScreenTimer() {
    const timerTable = global.G?.str?.timer;
    if (!global.lua_true(global.lua_tableget(timerTable, "running"))) return;
    const screens = global.G?.str?.Screens;
    const count = global.lua_len(screens);
    if (!count) return;
    const screen = global.lua_tableget(screens, count);
    const timerMethod = global.lua_tableget(screen, "timer");
    if (timerMethod) global.lua_call(timerMethod, [screen]);
  }
  function tick() {
    try {
      callCurrentScreenTimer();
      global.dotimer();
      if (global.lua_true(global.lua_tableget(windowTable(), "invalidated"))) {
        repaint(false);
      }
    } catch (error) {
      log(`ERROR timer LuaJS: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      if (timerId) window.clearInterval(timerId);
    }
  }
  function boot() {
    clear();
    try {
      global.callEvent("create", gc());
      global.callEvent("resize", canvas.width, canvas.height);
    } catch (error) {
      log(`ERROR boot LuaJS: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      throw error;
    }
    repaint(true);
    timerId = window.setInterval(tick, 120);
    log("Preview LuaJS activo: snapshots por timer/eventos.");
  }
  function focusedNativeEditor() {
    for (let index = nativeEditors.length - 1; index >= 0; index -= 1) {
      const state = nativeEditors[index];
      if (state?.focused && state.visible !== false) return state;
    }
    return null;
  }
  function dispatchEditorFilter(filterName, args = []) {
    const state = focusedNativeEditor();
    if (!state?.filterTable) return false;
    const handler = global.lua_tableget(state.filterTable, filterName);
    if (!handler) return false;
    const result = global.lua_call(handler, args);
    repaint(true);
    const consumed = result[0] !== false;
    log(consumed ? `Evento enviado a D2Editor: ${filterName}` : `D2Editor permitio accion normal: ${filterName}`);
    return consumed;
  }
  function moveEditorCursor(delta) {
    const state = focusedNativeEditor();
    if (!state) return false;
    state.cursor = clampLuaJsCursor(state, state.cursor + delta);
    repaint(true);
    return true;
  }
  function insertEditorText(text) {
    const state = focusedNativeEditor();
    if (!state || state.readOnly) return false;
    const cursor = clampLuaJsCursor(state, state.cursor);
    state.text = `${state.text.slice(0, cursor)}${text}${state.text.slice(cursor)}`;
    state.cursor = cursor + String(text).length;
    repaint(true);
    return true;
  }
  function deleteEditorText() {
    const state = focusedNativeEditor();
    if (!state || state.readOnly) return false;
    const cursor = clampLuaJsCursor(state, state.cursor);
    if (cursor <= 0) return true;
    state.text = `${state.text.slice(0, cursor - 1)}${state.text.slice(cursor)}`;
    state.cursor = cursor - 1;
    repaint(true);
    return true;
  }
  function callEvent(name) {
    const eventName = name.replace(/^on\./, "");
    const editorFilterMap = {
      enterKey: "enterKey",
      escapeKey: "escapeKey",
      backspaceKey: "backspaceKey",
      clearKey: "clearKey",
      tabKey: "tabKey",
      backtabKey: "backtabKey",
      arrowLeft: "arrowLeft",
      arrowRight: "arrowRight",
      arrowUp: "arrowUp",
      arrowDown: "arrowDown",
    };
    try {
      const editorFilter = editorFilterMap[eventName];
      if (editorFilter && dispatchEditorFilter(editorFilter)) return;
      if (eventName === "arrowLeft" && moveEditorCursor(-1)) {
        log(`Cursor D2Editor movido: ${name}`);
        return;
      }
      if (eventName === "arrowRight" && moveEditorCursor(1)) {
        log(`Cursor D2Editor movido: ${name}`);
        return;
      }
      if (eventName === "backspaceKey" && deleteEditorText()) {
        log(`Evento aplicado en D2Editor: ${name}`);
        return;
      }
      global.callEvent(eventName);
      if (name.startsWith("on.arrow")) {
        global.callEvent("arrowKey", eventName.replace("arrow", "").toLowerCase());
      }
      repaint(true);
      log(`Evento ejecutado en LuaJS: ${name}`);
    } catch (error) {
      log(`ERROR evento LuaJS ${name}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function charIn(char) {
    try {
      if (dispatchEditorFilter("charIn", [char])) return;
      if (insertEditorText(char)) {
        log(`Tecla aplicada en D2Editor: ${char}`);
        return;
      }
      global.callEvent("charIn", char);
      repaint(true);
      log(`Tecla enviada a LuaJS: ${char}`);
    } catch (error) {
      log(`ERROR tecla LuaJS ${char}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function mouseClick(x, y) {
    try {
      global.callEvent("mouseDown", x, y);
      global.callEvent("mouseUp", x, y);
      repaint(true);
      log(`Click enviado a LuaJS: ${x},${y}`);
    } catch (error) {
      log(`ERROR click LuaJS ${x},${y}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function close() {
    if (timerId) window.clearInterval(timerId);
  }
  function getScreenText() {
    const explicit = luaJsGlobalText(global, ["__tnsToolCopyText", "__tnsPreviewText", "__copyScreenText"]);
    if (explicit) return explicit;
    const editorText = luaJsNativeEditorsFullText(nativeEditors);
    if (editorText) return editorText;
    return formatLuaPreviewScreenText(screenText);
  }
  return { boot, callEvent, charIn, mouseClick, resize, close, getScreenText };
}

async function createLovePreviewRuntime(code, ctx, canvas, logEl, options = {}) {
  const sources = await loadLuaJsRuntimeSources();
  for (const source of sources) {
    (0, eval)(source);
  }
  hardenLuaJsPreviewRuntime();

  const global = window;
  const love = global.lua_newtable();
  const graphics = global.lua_newtable();
  const windowTable = global.lua_newtable();
  const keyboard = global.lua_newtable();
  const mouse = global.lua_newtable();
  const timer = global.lua_newtable();
  const event = global.lua_newtable();
  const filesystem = global.lua_newtable();
  const loveMath = global.lua_newtable();
  const osTable = global.lua_newtable();
  const system = global.lua_newtable();
  const audio = global.lua_newtable();
  const sound = global.lua_newtable();
  const image = global.lua_newtable();
  const data = global.lua_newtable();
  const touch = global.lua_newtable();
  const joystick = global.lua_newtable();
  const thread = global.lua_newtable();
  const fontModule = global.lua_newtable();
  const physics = global.lua_newtable();
  const video = global.lua_newtable();
  const sensor = global.lua_newtable();
  const ioTable = global.lua_newtable();
  const packageTable = global.lua_newtable();
  const packageLoaded = global.lua_newtable();
  const pressedKeys = new Set();
  const mouseButtons = new Set();
  const virtualFiles = new Map();
  const projectFiles = normalizeLoveProjectFiles(options.project?.files || []);
  const scissorStack = [];
  const screenText = [];
  const consoleText = [];
  let rafId = null;
  let running = false;
  let lastFrame = performance.now();
  let fontSize = 12;
  let currentColor = [255, 255, 255, 1];
  let backgroundColor = [0, 0, 0, 1];
  let pointSize = 1;
  let lineStyle = "smooth";
  let lineJoin = "miter";
  let blendMode = "alpha";
  let defaultFilter = ["linear", "linear", 1];
  let keyRepeat = false;
  let mouseVisible = true;
  let fullscreen = false;
  let vsync = 1;
  let windowX = 0;
  let windowY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseGrabbed = false;
  let mouseRelativeMode = false;
  let windowTitle = "";
  let masterVolume = 1;
  let activeCanvasState = null;
  let activeShader = null;
  let activeColorMask = [true, true, true, true];
  let stencilMode = null;
  let seededRandomState = 0x12345678;
  let lastDelta = 1 / 60;
  const startedAt = performance.now();
  const drawableStates = new WeakMap();
  const objectUrls = [];

  const log = (message) => appendPreviewLog(logEl, message);
  const currentCanvas = () => activeCanvasState?.canvas || canvas;
  const currentContext = () => activeCanvasState?.ctx || ctx;
  const captureLoveText = (text, x = 0, y = 0, lineHeight = fontSize || 12) => {
    recordLuaPreviewText(screenText, text, x, y, lineHeight);
  };
  const cssColor = ([r, g, b, a = 1]) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.max(0, Math.min(1, a))})`;
  const stripSelf = (args, table) => args[0] === table ? args.slice(1) : args;
  const unsupported = (name) => () => {
    throw new Error(`LÖVE API no implementada: ${name}`);
  };
  const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const normalizeColor = (values, fallback = currentColor) => {
    const raw = values.map((value) => Number(value));
    const r = Number.isFinite(raw[0]) ? raw[0] : fallback[0];
    const g = Number.isFinite(raw[1]) ? raw[1] : r;
    const b = Number.isFinite(raw[2]) ? raw[2] : g;
    const a = Number.isFinite(raw[3]) ? raw[3] : fallback[3];
    const useUnitRange = [r, g, b].every((value) => value >= 0 && value <= 1);
    return [
      Math.max(0, Math.min(255, useUnitRange ? r * 255 : r)),
      Math.max(0, Math.min(255, useUnitRange ? g * 255 : g)),
      Math.max(0, Math.min(255, useUnitRange ? b * 255 : b)),
      Math.max(0, Math.min(1, a <= 1 ? a : a / 255)),
    ];
  };
  const applyColor = () => {
    const target = currentContext();
    target.fillStyle = cssColor(currentColor);
    target.strokeStyle = cssColor(currentColor);
  };
  const applyContextDefaults = (target = currentContext()) => {
    target.imageSmoothingEnabled = true;
    target.font = `${fontSize}px sans-serif`;
    target.textBaseline = "top";
    target.lineWidth = Math.max(1, target.lineWidth || 1);
    target.lineCap = lineStyle === "rough" ? "butt" : "round";
    target.lineJoin = lineJoin || (lineStyle === "rough" ? "miter" : "round");
    target.globalCompositeOperation = blendMode === "add" ? "lighter" : "source-over";
    target.fillStyle = cssColor(currentColor);
    target.strokeStyle = cssColor(currentColor);
  };
  const clearCanvas = (...args) => {
    const color = args.length ? normalizeColor(args, backgroundColor) : backgroundColor;
    if (!activeCanvasState) screenText.length = 0;
    const targetCanvas = currentCanvas();
    const target = currentContext();
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.fillStyle = cssColor(color);
    target.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    target.restore();
    applyContextDefaults(target);
    applyColor();
  };
  const luaArrayToJs = (value) => {
    if (!value || typeof value !== "object" || !value.uints) return null;
    const out = [];
    for (let index = 1; index <= global.lua_len(value); index += 1) {
      out.push(global.lua_tableget(value, index));
    }
    return out;
  };
  const numberList = (args) => {
    const tableValues = args.length === 1 ? luaArrayToJs(args[0]) : null;
    return (tableValues || args).map((value) => toNumber(value));
  };
  const colorArgs = (args, fallback = currentColor) => normalizeColor(luaArrayToJs(args[0]) || args, fallback);
  const tableFromObject = (object) => {
    const table = global.lua_newtable();
    for (const [key, value] of Object.entries(object)) global.lua_tableset(table, key, value);
    return table;
  };
  const emptyTable = () => global.lua_newtable();
  const makeObjectTable = (kind, fields = {}) => tableFromObject({ type: kind, unsupported: true, ...fields });
  const tableToArray = (value) => {
    if (!value || typeof value !== "object") return [];
    const length = Math.max(0, global.lua_len(value) || 0);
    const out = [];
    for (let index = 1; index <= length; index += 1) out.push(global.lua_tableget(value, index));
    return out;
  };
  const makeDrawableTable = (kind, state = {}) => {
    const table = tableFromObject({ type: kind });
    drawableStates.set(table, { kind, ...state, table });
    return table;
  };
  const setMethod = (table, name, fn) => global.lua_tableset(table, name, fn);
  const getDrawableState = (value) => (value && typeof value === "object" ? drawableStates.get(value) : null);
  const getDrawableDimensions = (state) => {
    if (!state) return [0, 0];
    if (state.kind === "Image" && state.sourceState?.canvas) return [state.sourceState.canvas.width, state.sourceState.canvas.height];
    if (state.kind === "Image" && state.element) return [state.width || state.element.naturalWidth || state.element.width || 0, state.height || state.element.naturalHeight || state.element.height || 0];
    if (state.kind === "Canvas" && state.canvas) return [state.canvas.width, state.canvas.height];
    if (state.kind === "ImageData" && state.canvas) return [state.canvas.width, state.canvas.height];
    if (state.kind === "Text") return [state.width || 0, state.height || fontSize];
    if (Number.isFinite(state.width) || Number.isFinite(state.height)) return [state.width || 0, state.height || 0];
    return [0, 0];
  };
  const attachDimensionMethods = (table, state) => {
    setMethod(table, "getWidth", (...rawArgs) => {
      stripSelf(rawArgs, table);
      return [getDrawableDimensions(state)[0]];
    });
    setMethod(table, "getHeight", (...rawArgs) => {
      stripSelf(rawArgs, table);
      return [getDrawableDimensions(state)[1]];
    });
    setMethod(table, "getDimensions", (...rawArgs) => {
      stripSelf(rawArgs, table);
      return getDrawableDimensions(state);
    });
    return table;
  };
  const makeCanvasDrawable = (width = canvas.width, height = canvas.height) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.max(1, Math.round(toNumber(width, canvas.width)));
    offscreen.height = Math.max(1, Math.round(toNumber(height, canvas.height)));
    const offscreenCtx = offscreen.getContext("2d");
    applyContextDefaults(offscreenCtx);
    const state = { canvas: offscreen, ctx: offscreenCtx, width: offscreen.width, height: offscreen.height };
    const table = makeDrawableTable("Canvas", state);
    attachDimensionMethods(table, state);
    setMethod(table, "newImageData", (...rawArgs) => {
      stripSelf(rawArgs, table);
      return [makeImageDataDrawable(offscreen.width, offscreen.height, offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height))];
    });
    setMethod(table, "release", () => {
      state.released = true;
      state.canvas.width = 1;
      state.canvas.height = 1;
      return [];
    });
    return table;
  };
  const makeImageDataDrawable = (width = 1, height = 1, sourceImageData = null) => {
    const dataCanvas = document.createElement("canvas");
    dataCanvas.width = Math.max(1, Math.round(toNumber(width, 1)));
    dataCanvas.height = Math.max(1, Math.round(toNumber(height, 1)));
    const dataCtx = dataCanvas.getContext("2d");
    let imageData = sourceImageData || dataCtx.createImageData(dataCanvas.width, dataCanvas.height);
    if (sourceImageData) dataCtx.putImageData(sourceImageData, 0, 0);
    const state = { canvas: dataCanvas, ctx: dataCtx, width: dataCanvas.width, height: dataCanvas.height, imageData };
    const table = makeDrawableTable("ImageData", state);
    attachDimensionMethods(table, state);
    setMethod(table, "getPixel", (...rawArgs) => {
      const [x = 0, y = 0] = stripSelf(rawArgs, table);
      const px = Math.max(0, Math.min(state.width - 1, Math.floor(toNumber(x))));
      const py = Math.max(0, Math.min(state.height - 1, Math.floor(toNumber(y))));
      imageData = dataCtx.getImageData(0, 0, state.width, state.height);
      const offset = (py * state.width + px) * 4;
      return [imageData.data[offset] / 255, imageData.data[offset + 1] / 255, imageData.data[offset + 2] / 255, imageData.data[offset + 3] / 255];
    });
    setMethod(table, "setPixel", (...rawArgs) => {
      const [x = 0, y = 0, r = 0, g = r, b = g, a = 1] = stripSelf(rawArgs, table);
      const px = Math.max(0, Math.min(state.width - 1, Math.floor(toNumber(x))));
      const py = Math.max(0, Math.min(state.height - 1, Math.floor(toNumber(y))));
      imageData = dataCtx.getImageData(0, 0, state.width, state.height);
      const color = normalizeColor([r, g, b, a], [0, 0, 0, 1]);
      const offset = (py * state.width + px) * 4;
      imageData.data[offset] = color[0];
      imageData.data[offset + 1] = color[1];
      imageData.data[offset + 2] = color[2];
      imageData.data[offset + 3] = Math.round(color[3] * 255);
      dataCtx.putImageData(imageData, 0, 0);
      state.imageData = imageData;
      return [];
    });
    return table;
  };
  const makeFontTable = (size = fontSize) => {
    const numericSize = Math.max(1, toNumber(size, fontSize));
    const font = tableFromObject({ type: "Font", size: numericSize });
    setMethod(font, "getWidth", (...rawArgs) => {
      const [text = ""] = stripSelf(rawArgs, font);
      const target = currentContext();
      const previous = target.font;
      target.font = `${numericSize}px sans-serif`;
      const width = target.measureText(jsString(text)).width;
      target.font = previous;
      return [width];
    });
    setMethod(font, "getHeight", () => [numericSize]);
    setMethod(font, "getWrap", (...rawArgs) => {
      const [text = "", limit = canvas.width] = stripSelf(rawArgs, font);
      const words = jsString(text).split(/\s+/);
      const lines = [];
      let line = "";
      const widthLimit = Math.max(1, toNumber(limit, canvas.width));
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        const target = currentContext();
        const previous = target.font;
        target.font = `${numericSize}px sans-serif`;
        const tooWide = target.measureText(next).width > widthLimit;
        target.font = previous;
        if (tooWide && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      const table = global.lua_newtable();
      lines.forEach((entry, index) => global.lua_tableset(table, index + 1, entry));
      return [widthLimit, table];
    });
    return font;
  };
  const mimeForLovePath = (path) => {
    const ext = jsString(path).split(".").pop().toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "gif") return "image/gif";
    if (ext === "webp") return "image/webp";
    if (ext === "bmp") return "image/bmp";
    if (ext === "svg") return "image/svg+xml";
    return "image/png";
  };
  const makeImageDrawableFromSource = (source) => {
    const existingState = getDrawableState(source);
    if (existingState?.kind === "ImageData" || existingState?.kind === "Canvas") {
      const state = { element: existingState.canvas, sourceState: existingState, width: existingState.canvas.width, height: existingState.canvas.height, loaded: true };
      const table = makeDrawableTable("Image", state);
      attachDimensionMethods(table, state);
      setMethod(table, "setFilter", () => []);
      setMethod(table, "setWrap", () => []);
      setMethod(table, "replacePixels", (...rawArgs) => {
        const [imageData] = stripSelf(rawArgs, table);
        const next = getDrawableState(imageData);
        if (next?.canvas) {
          state.element = next.canvas;
          state.sourceState = next;
          state.width = next.canvas.width;
          state.height = next.canvas.height;
        }
        return [];
      });
      return table;
    }
    const path = jsString(source);
    const state = { path, element: null, width: 0, height: 0, loaded: false, error: null };
    const table = makeDrawableTable("Image", state);
    attachDimensionMethods(table, state);
    setMethod(table, "setFilter", () => []);
    setMethod(table, "setWrap", () => []);
    setMethod(table, "getData", () => [makeImageDataDrawable(state.width || 1, state.height || 1)]);
    const file = findLoveProjectFile(projectFiles, path);
    let url = "";
    if (file?.bytes?.length) {
      url = URL.createObjectURL(new Blob([file.bytes], { type: mimeForLovePath(path) }));
      objectUrls.push(url);
    } else if (/^(data:|blob:|https?:\/\/)/i.test(path)) {
      url = path;
    }
    if (!url) {
      state.error = `image not found: ${path}`;
      log(`love.graphics.newImage: ${state.error}`);
      return table;
    }
    const element = new Image();
    element.onload = () => {
      state.loaded = true;
      state.width = element.naturalWidth || element.width || 0;
      state.height = element.naturalHeight || element.height || 0;
      if (running) redraw();
    };
    element.onerror = () => {
      state.error = `could not load image: ${path}`;
      log(`love.graphics.newImage: ${state.error}`);
    };
    element.src = url;
    state.element = element;
    return table;
  };
  const makeImageDataFromSource = (source) => {
    const state = { canvas: document.createElement("canvas"), ctx: null, width: 1, height: 1, imageData: null, loaded: false, path: jsString(source) };
    state.canvas.width = 1;
    state.canvas.height = 1;
    state.ctx = state.canvas.getContext("2d");
    state.imageData = state.ctx.createImageData(1, 1);
    const table = makeDrawableTable("ImageData", state);
    attachDimensionMethods(table, state);
    setMethod(table, "getPixel", (...rawArgs) => {
      const [x = 0, y = 0] = stripSelf(rawArgs, table);
      const px = Math.max(0, Math.min(state.width - 1, Math.floor(toNumber(x))));
      const py = Math.max(0, Math.min(state.height - 1, Math.floor(toNumber(y))));
      const imageData = state.ctx.getImageData(0, 0, state.width, state.height);
      const offset = (py * state.width + px) * 4;
      return [imageData.data[offset] / 255, imageData.data[offset + 1] / 255, imageData.data[offset + 2] / 255, imageData.data[offset + 3] / 255];
    });
    setMethod(table, "setPixel", (...rawArgs) => {
      const [x = 0, y = 0, r = 0, g = r, b = g, a = 1] = stripSelf(rawArgs, table);
      const px = Math.max(0, Math.min(state.width - 1, Math.floor(toNumber(x))));
      const py = Math.max(0, Math.min(state.height - 1, Math.floor(toNumber(y))));
      const imageData = state.ctx.getImageData(0, 0, state.width, state.height);
      const color = normalizeColor([r, g, b, a], [0, 0, 0, 1]);
      const offset = (py * state.width + px) * 4;
      imageData.data[offset] = color[0];
      imageData.data[offset + 1] = color[1];
      imageData.data[offset + 2] = color[2];
      imageData.data[offset + 3] = Math.round(color[3] * 255);
      state.ctx.putImageData(imageData, 0, 0);
      state.imageData = imageData;
      return [];
    });
    const file = findLoveProjectFile(projectFiles, state.path);
    let url = "";
    if (file?.bytes?.length) {
      url = URL.createObjectURL(new Blob([file.bytes], { type: mimeForLovePath(state.path) }));
      objectUrls.push(url);
    } else if (/^(data:|blob:|https?:\/\/)/i.test(state.path)) {
      url = state.path;
    }
    if (!url) {
      log(`love.image.newImageData: image not found: ${state.path}`);
      return table;
    }
    const element = new Image();
    element.onload = () => {
      state.width = element.naturalWidth || element.width || 1;
      state.height = element.naturalHeight || element.height || 1;
      state.canvas.width = state.width;
      state.canvas.height = state.height;
      state.ctx = state.canvas.getContext("2d");
      state.ctx.drawImage(element, 0, 0);
      state.imageData = state.ctx.getImageData(0, 0, state.width, state.height);
      state.loaded = true;
      if (running) redraw();
    };
    element.onerror = () => log(`love.image.newImageData: could not load image: ${state.path}`);
    element.src = url;
    return table;
  };
  const createAudioSource = () => {
    let volume = 1;
    let pitch = 1;
    let looping = false;
    let playing = false;
    const source = tableFromObject({ type: "Source", unsupported: true });
    global.lua_tableset(source, "play", () => {
      playing = true;
      return [];
    });
    global.lua_tableset(source, "stop", () => {
      playing = false;
      return [];
    });
    global.lua_tableset(source, "pause", () => {
      playing = false;
      return [];
    });
    global.lua_tableset(source, "resume", () => {
      playing = true;
      return [];
    });
    global.lua_tableset(source, "isPlaying", () => [playing]);
    global.lua_tableset(source, "setLooping", (...rawArgs) => {
      const [value] = stripSelf(rawArgs, source);
      looping = Boolean(value);
      return [];
    });
    global.lua_tableset(source, "isLooping", () => [looping]);
    global.lua_tableset(source, "setVolume", (...rawArgs) => {
      const [value] = stripSelf(rawArgs, source);
      volume = toNumber(value, volume);
      return [];
    });
    global.lua_tableset(source, "getVolume", () => [volume]);
    global.lua_tableset(source, "setPitch", (...rawArgs) => {
      const [value] = stripSelf(rawArgs, source);
      pitch = toNumber(value, pitch);
      return [];
    });
    global.lua_tableset(source, "getPitch", () => [pitch]);
    global.lua_tableset(source, "seek", () => []);
    global.lua_tableset(source, "tell", () => [0]);
    global.lua_tableset(source, "getDuration", () => [0]);
    global.lua_tableset(source, "clone", () => [createAudioSource()]);
    return source;
  };
  const callOptionalLuaMethod = (object, name) => {
    if (!object || typeof object !== "object") return;
    try {
      const method = global.lua_tableget(object, name);
      if (typeof method === "function") method(object);
    } catch (_error) {
      // Ignore invalid non-Lua objects in compatibility-only calls.
    }
  };
  const createThreadObject = () => {
    let runningThread = false;
    const object = tableFromObject({ type: "Thread", unsupported: true });
    global.lua_tableset(object, "start", () => {
      runningThread = true;
      return [];
    });
    global.lua_tableset(object, "wait", () => {
      runningThread = false;
      return [];
    });
    global.lua_tableset(object, "isRunning", () => [runningThread]);
    global.lua_tableset(object, "getError", () => [null]);
    return object;
  };
  const createChannelObject = () => {
    const queue = [];
    const object = tableFromObject({ type: "Channel", unsupported: true });
    global.lua_tableset(object, "push", (...rawArgs) => {
      const [value] = stripSelf(rawArgs, object);
      queue.push(value);
      return [];
    });
    global.lua_tableset(object, "pop", () => [queue.length ? queue.shift() : null]);
    global.lua_tableset(object, "peek", () => [queue.length ? queue[0] : null]);
    global.lua_tableset(object, "getCount", () => [queue.length]);
    global.lua_tableset(object, "clear", () => {
      queue.length = 0;
      return [];
    });
    return object;
  };
  const jsString = (value) => String(value ?? "");
  const loveFileKey = (filename) => jsString(filename).replace(/[^\w.-]/g, "_") || "unnamed";
  const loveFileStorageKey = (filename) => `tns-tool-love-fs:${loveFileKey(filename)}`;
  const readVirtualFile = (filename) => {
    const key = loveFileKey(filename);
    if (virtualFiles.has(key)) return virtualFiles.get(key);
    const projectFile = findLoveProjectFile(projectFiles, filename);
    if (projectFile) return loveProjectFileToLuaString(projectFile);
    try {
      const stored = window.localStorage?.getItem(loveFileStorageKey(key));
      if (stored !== null && stored !== "__love_removed__") {
        virtualFiles.set(key, stored);
        return stored;
      }
    } catch (_error) {
      // Local storage can be unavailable in some browser/privacy modes.
    }
    return null;
  };
  const isProjectDirectory = (directory) => loveProjectDirectoryItems(projectFiles, directory).length > 0;
  const writeVirtualFile = (filename, data) => {
    const key = loveFileKey(filename);
    const text = jsString(data);
    virtualFiles.set(key, text);
    try {
      window.localStorage?.setItem(loveFileStorageKey(key), text);
    } catch (_error) {
      // Keep the in-memory copy even if persistent storage is unavailable.
    }
    return true;
  };
  const removeVirtualFile = (filename) => {
    const key = loveFileKey(filename);
    virtualFiles.delete(key);
    try {
      window.localStorage?.setItem(loveFileStorageKey(key), "__love_removed__");
    } catch (_error) {
      // Ignore storage cleanup failures.
    }
    return true;
  };
  const createLuaFileObject = (filename, initialData = "", writable = false) => {
    let dataText = jsString(initialData);
    let position = 0;
    let closed = false;
    const object = global.lua_newtable();
    const ensureOpen = () => {
      if (closed) throw new Error(`file is closed: ${jsString(filename)}`);
    };
    const syncWrite = () => {
      if (writable) writeVirtualFile(filename, dataText);
    };
    const readLine = () => {
      ensureOpen();
      if (position >= dataText.length) return null;
      const newline = dataText.indexOf("\n", position);
      const end = newline >= 0 ? newline : dataText.length;
      const line = dataText.slice(position, end).replace(/\r$/, "");
      position = newline >= 0 ? newline + 1 : dataText.length;
      return line;
    };
    global.lua_tableset(object, "read", (...rawArgs) => {
      const args = stripSelf(rawArgs, object);
      ensureOpen();
      const format = args.length ? jsString(args[0]) : "*line";
      if (format === "*all" || format === "*a") {
        const out = dataText.slice(position);
        position = dataText.length;
        return [out];
      }
      if (format === "*line" || format === "*l") return [readLine()];
      const count = Number(format);
      if (Number.isFinite(count)) {
        const out = dataText.slice(position, position + Math.max(0, count));
        position += out.length;
        return [out || null];
      }
      return [null, `unsupported read format: ${format}`];
    });
    global.lua_tableset(object, "write", (...rawArgs) => {
      const args = stripSelf(rawArgs, object);
      ensureOpen();
      if (!writable) return [null, "file is not writable"];
      const chunk = args.map(jsString).join("");
      dataText = `${dataText.slice(0, position)}${chunk}${dataText.slice(position)}`;
      position += chunk.length;
      syncWrite();
      return [object];
    });
    global.lua_tableset(object, "seek", (...rawArgs) => {
      const [whence = "cur", offset = 0] = stripSelf(rawArgs, object);
      ensureOpen();
      const numericOffset = toNumber(offset);
      const mode = jsString(whence);
      if (mode === "set") position = numericOffset;
      else if (mode === "end") position = dataText.length + numericOffset;
      else position += numericOffset;
      position = Math.max(0, Math.min(dataText.length, position));
      return [position];
    });
    global.lua_tableset(object, "lines", () => [() => [readLine()]]);
    global.lua_tableset(object, "close", () => {
      closed = true;
      syncWrite();
      return [true];
    });
    return object;
  };
  const withCanvasState = (fn) => {
    try {
      return fn();
    } finally {
      applyContextDefaults();
    }
  };
  const resetScissor = () => {
    const target = currentContext();
    while (scissorStack.length) {
      const entry = scissorStack.pop();
      (entry?.ctx || target).restore();
    }
    applyContextDefaults(target);
  };
  const callLove = (table, name, args = []) => {
    const fn = global.lua_tableget(table, name);
    if (!fn) return null;
    return global.lua_call(fn, args);
  };
  const redraw = () => {
    resetScissor();
    clearCanvas();
    callLove(love, "draw");
  };
  const evalLuaJsSource = (source, sourcePath = "") => {
    const parsed = global.lua_parser.parse(source).split("\n").slice(19).join("\n");
    try {
      return (0, eval)(`(function(){\n${parsed}\n})()`);
    } catch (error) {
      if (!sourcePath) throw error;
      const wrapped = new Error(`${sourcePath}: ${describeLuaJsError(error)}`);
      wrapped.stack = error?.stack || wrapped.stack;
      throw wrapped;
    }
  };

  global.G.str.love = love;
  global.G.str.io = ioTable;
  global.G.str.package = packageTable;
  global.G.str.os = osTable;
  global.G.str.print = (...args) => {
    const line = args.map((value) => String(value ?? "nil")).join("\t");
    consoleText.push(line);
    log(line);
    return [];
  };
  global.G.str.require = (...rawArgs) => {
    const [moduleName] = rawArgs;
    const key = jsString(moduleName);
    const cached = global.lua_tableget(packageLoaded, key);
    if (cached != null) return [cached];
    const resolved = resolveLoveProjectModule(projectFiles, key);
    if (!resolved.file) {
      throw new Error(`module '${key}' not found. Tried: ${resolved.attempts.join(", ")}`);
    }
    global.lua_tableset(packageLoaded, key, true);
    const result = evalLuaJsSource(loveProjectFileToText(resolved.file), resolved.path);
    const exported = Array.isArray(result)
      ? (result[0] == null ? true : result[0])
      : (result == null ? true : result);
    global.lua_tableset(packageLoaded, key, exported);
    return [exported];
  };

  global.lua_tableset(love, "graphics", graphics);
  global.lua_tableset(love, "window", windowTable);
  global.lua_tableset(love, "keyboard", keyboard);
  global.lua_tableset(love, "mouse", mouse);
  global.lua_tableset(love, "timer", timer);
  global.lua_tableset(love, "event", event);
  global.lua_tableset(love, "filesystem", filesystem);
  global.lua_tableset(love, "math", loveMath);
  global.lua_tableset(love, "system", system);
  global.lua_tableset(love, "audio", audio);
  global.lua_tableset(love, "sound", sound);
  global.lua_tableset(love, "image", image);
  global.lua_tableset(love, "data", data);
  global.lua_tableset(love, "touch", touch);
  global.lua_tableset(love, "joystick", joystick);
  global.lua_tableset(love, "thread", thread);
  global.lua_tableset(love, "font", fontModule);
  global.lua_tableset(love, "physics", physics);
  global.lua_tableset(love, "video", video);
  global.lua_tableset(love, "sensor", sensor);
  global.lua_tableset(packageTable, "loaded", packageLoaded);
  global.lua_tableset(packageTable, "path", "?.lua;?/init.lua");

  const drawImageLike = (state, drawArgs, quadState = null) => {
    const source = state?.sourceState?.canvas || state?.element || state?.canvas;
    if (!source) return false;
    if (state.loaded === false) return false;
    const [sourceWidth, sourceHeight] = getDrawableDimensions(state);
    const [x = 0, y = 0, r = 0, sx = 1, sy = sx, ox = 0, oy = 0, kx = 0, ky = 0] = drawArgs;
    const viewport = quadState || { x: 0, y: 0, w: sourceWidth, h: sourceHeight };
    const g = currentContext();
    g.save();
    g.translate(toNumber(x), toNumber(y));
    g.rotate(toNumber(r));
    if (kx || ky) g.transform(1, toNumber(ky), toNumber(kx), 1, 0, 0);
    g.scale(toNumber(sx, 1), toNumber(sy, 1));
    try {
      g.drawImage(
        source,
        toNumber(viewport.x), toNumber(viewport.y), Math.max(1, toNumber(viewport.w, sourceWidth)), Math.max(1, toNumber(viewport.h, sourceHeight)),
        -toNumber(ox), -toNumber(oy), Math.max(1, toNumber(viewport.w, sourceWidth)), Math.max(1, toNumber(viewport.h, sourceHeight)),
      );
    } catch (error) {
      log(`love.graphics.draw: ${describeLuaJsError(error)}`);
    }
    g.restore();
    return true;
  };
  const drawTextState = (state, drawArgs) => {
    const [x = 0, y = 0, r = 0, sx = 1, sy = sx, ox = 0, oy = 0] = drawArgs;
    const g = currentContext();
    g.save();
    g.translate(toNumber(x), toNumber(y));
    g.rotate(toNumber(r));
    g.scale(toNumber(sx, 1), toNumber(sy, 1));
    applyColor();
    g.font = `${state.fontSize || fontSize}px sans-serif`;
    g.fillText(jsString(state.text), -toNumber(ox), -toNumber(oy));
    g.restore();
    if (!activeCanvasState) captureLoveText(state.text, toNumber(x), toNumber(y), state.fontSize || fontSize);
  };
  const drawMeshState = (state, drawArgs) => {
    const vertices = Array.isArray(state.vertices) ? state.vertices : [];
    if (vertices.length < 2) return;
    const [x = 0, y = 0, r = 0, sx = 1, sy = sx] = drawArgs;
    const g = currentContext();
    g.save();
    g.translate(toNumber(x), toNumber(y));
    g.rotate(toNumber(r));
    g.scale(toNumber(sx, 1), toNumber(sy, 1));
    g.beginPath();
    g.moveTo(toNumber(vertices[0][0]), toNumber(vertices[0][1]));
    for (let index = 1; index < vertices.length; index += 1) g.lineTo(toNumber(vertices[index][0]), toNumber(vertices[index][1]));
    if (state.drawMode !== "strip") g.closePath();
    if (state.drawMode === "points") {
      for (const vertex of vertices) g.fillRect(toNumber(vertex[0]), toNumber(vertex[1]), pointSize, pointSize);
    } else if (state.drawMode === "fan" || state.drawMode === "triangles") {
      g.fill();
    } else {
      g.stroke();
    }
    g.restore();
  };
  const drawDrawable = (drawable, drawArgs, quad = null) => {
    const state = getDrawableState(drawable);
    const quadState = quad ? getDrawableState(quad) : null;
    if (!state) return false;
    if (state.kind === "Image" || state.kind === "Canvas" || state.kind === "ImageData") return drawImageLike(state, drawArgs, quadState);
    if (state.kind === "Text") {
      drawTextState(state, drawArgs);
      return true;
    }
    if (state.kind === "SpriteBatch") {
      for (const item of state.items) drawDrawable(state.image, item.args || [], item.quad || null);
      return true;
    }
    if (state.kind === "ParticleSystem") {
      const g = currentContext();
      const [x = 0, y = 0] = drawArgs;
      g.save();
      g.translate(toNumber(x), toNumber(y));
      for (const particle of state.particles) {
        g.globalAlpha = Math.max(0, Math.min(1, particle.life / Math.max(0.001, particle.maxLife)));
        g.fillRect(particle.x, particle.y, state.size || 2, state.size || 2);
      }
      g.globalAlpha = 1;
      g.restore();
      return true;
    }
    if (state.kind === "Mesh") {
      drawMeshState(state, drawArgs);
      return true;
    }
    return false;
  };
  const luaVertexTableToJs = (vertices) => {
    const rows = tableToArray(vertices);
    return rows.map((row) => {
      if (row && typeof row === "object") return tableToArray(row).map((value) => toNumber(value));
      return [];
    }).filter((row) => row.length >= 2);
  };

  global.lua_tableset(graphics, "print", (...rawArgs) => {
    const [text, x = 0, y = 0, rotation = 0, sx = 1, sy = sx, ox = 0, oy = 0] = stripSelf(rawArgs, graphics);
    const g = currentContext();
    const drawX = -toNumber(ox);
    const drawY = -toNumber(oy);
    g.save();
    g.translate(toNumber(x), toNumber(y));
    g.rotate(toNumber(rotation));
    g.scale(toNumber(sx, 1), toNumber(sy, 1));
    applyColor();
    g.fillText(String(text ?? ""), drawX, drawY);
    g.restore();
    if (!activeCanvasState) captureLoveText(text, toNumber(x) + drawX, toNumber(y) + drawY);
    return [];
  });
  global.lua_tableset(graphics, "printf", (...rawArgs) => {
    const [text, x = 0, y = 0, limit = canvas.width, align = "left"] = stripSelf(rawArgs, graphics);
    const g = currentContext();
    const previousAlign = g.textAlign;
    g.textAlign = String(align || "left");
    const drawX = String(align) === "center" ? toNumber(x) + toNumber(limit) / 2 : String(align) === "right" ? toNumber(x) + toNumber(limit) : toNumber(x);
    applyColor();
    g.fillText(String(text ?? ""), drawX, toNumber(y));
    g.textAlign = previousAlign;
    if (!activeCanvasState) captureLoveText(text, drawX, toNumber(y));
    return [];
  });
  global.lua_tableset(graphics, "setColor", (...rawArgs) => {
    currentColor = colorArgs(stripSelf(rawArgs, graphics), currentColor);
    applyColor();
    return [];
  });
  global.lua_tableset(graphics, "getColor", () => [currentColor[0] / 255, currentColor[1] / 255, currentColor[2] / 255, currentColor[3]]);
  global.lua_tableset(graphics, "setBackgroundColor", (...rawArgs) => {
    backgroundColor = colorArgs(stripSelf(rawArgs, graphics), backgroundColor);
    return [];
  });
  global.lua_tableset(graphics, "getBackgroundColor", () => [backgroundColor[0] / 255, backgroundColor[1] / 255, backgroundColor[2] / 255, backgroundColor[3]]);
  global.lua_tableset(graphics, "clear", (...rawArgs) => {
    clearCanvas(...stripSelf(rawArgs, graphics));
    return [];
  });
  global.lua_tableset(graphics, "rectangle", (...rawArgs) => {
    const [mode, x, y, w, h] = stripSelf(rawArgs, graphics);
    const g = currentContext();
    if (String(mode) === "fill") g.fillRect(toNumber(x), toNumber(y), toNumber(w), toNumber(h));
    else g.strokeRect(toNumber(x), toNumber(y), toNumber(w), toNumber(h));
    return [];
  });
  global.lua_tableset(graphics, "circle", (...rawArgs) => {
    const [mode, x, y, radius] = stripSelf(rawArgs, graphics);
    const g = currentContext();
    g.beginPath();
    g.arc(toNumber(x), toNumber(y), Math.max(0, toNumber(radius)), 0, Math.PI * 2);
    if (String(mode) === "fill") g.fill();
    else g.stroke();
    return [];
  });
  global.lua_tableset(graphics, "ellipse", (...rawArgs) => {
    const [mode, x, y, rx, ry = rx] = stripSelf(rawArgs, graphics);
    const g = currentContext();
    g.beginPath();
    g.ellipse(toNumber(x), toNumber(y), Math.max(0, toNumber(rx)), Math.max(0, toNumber(ry)), 0, 0, Math.PI * 2);
    if (String(mode) === "fill") g.fill();
    else g.stroke();
    return [];
  });
  global.lua_tableset(graphics, "arc", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const mode = args[0];
    const offset = typeof args[1] === "string" ? 2 : 1;
    const [x, y, radius, angle1 = 0, angle2 = Math.PI * 2] = args.slice(offset);
    const g = currentContext();
    g.beginPath();
    g.arc(toNumber(x), toNumber(y), Math.max(0, toNumber(radius)), toNumber(angle1), toNumber(angle2));
    if (String(mode) === "fill") g.fill();
    else g.stroke();
    return [];
  });
  global.lua_tableset(graphics, "line", (...rawArgs) => {
    const points = numberList(stripSelf(rawArgs, graphics));
    if (points.length < 4) return [];
    const g = currentContext();
    g.beginPath();
    g.moveTo(points[0], points[1]);
    for (let index = 2; index + 1 < points.length; index += 2) g.lineTo(points[index], points[index + 1]);
    g.stroke();
    return [];
  });
  global.lua_tableset(graphics, "points", (...rawArgs) => {
    const points = numberList(stripSelf(rawArgs, graphics));
    const g = currentContext();
    for (let index = 0; index + 1 < points.length; index += 2) g.fillRect(points[index], points[index + 1], pointSize, pointSize);
    return [];
  });
  global.lua_tableset(graphics, "polygon", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const mode = args[0];
    const points = numberList(args.slice(1));
    if (points.length < 6) return [];
    const g = currentContext();
    g.beginPath();
    g.moveTo(points[0], points[1]);
    for (let index = 2; index + 1 < points.length; index += 2) g.lineTo(points[index], points[index + 1]);
    g.closePath();
    if (String(mode) === "fill") g.fill();
    else g.stroke();
    return [];
  });
  global.lua_tableset(graphics, "setLineWidth", (...rawArgs) => {
    const [width] = stripSelf(rawArgs, graphics);
    currentContext().lineWidth = Math.max(1, toNumber(width, 1));
    return [];
  });
  global.lua_tableset(graphics, "getLineWidth", () => [currentContext().lineWidth]);
  global.lua_tableset(graphics, "setLineStyle", (...rawArgs) => {
    const [style] = stripSelf(rawArgs, graphics);
    lineStyle = String(style || "smooth");
    const g = currentContext();
    g.lineCap = lineStyle === "rough" ? "butt" : "round";
    g.lineJoin = lineJoin || (lineStyle === "rough" ? "miter" : "round");
    return [];
  });
  global.lua_tableset(graphics, "getLineStyle", () => [lineStyle]);
  global.lua_tableset(graphics, "setLineJoin", (...rawArgs) => {
    const [join] = stripSelf(rawArgs, graphics);
    lineJoin = jsString(join || "miter");
    currentContext().lineJoin = lineJoin;
    return [];
  });
  global.lua_tableset(graphics, "getLineJoin", () => [lineJoin]);
  global.lua_tableset(graphics, "setPointSize", (...rawArgs) => {
    const [size] = stripSelf(rawArgs, graphics);
    pointSize = Math.max(1, toNumber(size, 1));
    return [];
  });
  global.lua_tableset(graphics, "getPointSize", () => [pointSize]);
  global.lua_tableset(graphics, "getWidth", () => [currentCanvas().width]);
  global.lua_tableset(graphics, "getHeight", () => [currentCanvas().height]);
  global.lua_tableset(graphics, "getDimensions", () => [currentCanvas().width, currentCanvas().height]);
  global.lua_tableset(graphics, "newFont", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const size = toNumber(args.find((value) => Number.isFinite(Number(value))), fontSize);
    return [makeFontTable(size)];
  });
  global.lua_tableset(graphics, "setFont", (...rawArgs) => {
    const [font] = stripSelf(rawArgs, graphics);
    const size = font && typeof font === "object" ? global.lua_tableget(font, "size") : font;
    fontSize = Math.max(1, toNumber(size, fontSize));
    currentContext().font = `${fontSize}px sans-serif`;
    return [];
  });
  global.lua_tableset(graphics, "setNewFont", (...rawArgs) => {
    const [font] = global.lua_tableget(graphics, "newFont")(...rawArgs);
    global.lua_tableget(graphics, "setFont")(graphics, font);
    return [font];
  });
  global.lua_tableset(graphics, "getFont", () => [makeFontTable(fontSize)]);
  global.lua_tableset(graphics, "push", () => {
    currentContext().save();
    return [];
  });
  global.lua_tableset(graphics, "pop", () => {
    currentContext().restore();
    applyContextDefaults();
    return [];
  });
  global.lua_tableset(graphics, "origin", () => {
    currentContext().setTransform(1, 0, 0, 1, 0, 0);
    return [];
  });
  global.lua_tableset(graphics, "translate", (...rawArgs) => {
    const [x, y] = stripSelf(rawArgs, graphics);
    currentContext().translate(toNumber(x), toNumber(y));
    return [];
  });
  global.lua_tableset(graphics, "scale", (...rawArgs) => {
    const [x, y = x] = stripSelf(rawArgs, graphics);
    currentContext().scale(toNumber(x, 1), toNumber(y, 1));
    return [];
  });
  global.lua_tableset(graphics, "rotate", (...rawArgs) => {
    const [angle] = stripSelf(rawArgs, graphics);
    currentContext().rotate(toNumber(angle));
    return [];
  });
  global.lua_tableset(graphics, "shear", (...rawArgs) => {
    const [kx = 0, ky = 0] = stripSelf(rawArgs, graphics);
    currentContext().transform(1, toNumber(ky), toNumber(kx), 1, 0, 0);
    return [];
  });
  global.lua_tableset(graphics, "applyTransform", (...rawArgs) => {
    const [transform] = stripSelf(rawArgs, graphics);
    const state = getDrawableState(transform);
    const matrix = state?.kind === "Transform" ? state.state?.matrix : null;
    if (matrix) currentContext().transform(...matrix);
    return [];
  });
  global.lua_tableset(graphics, "replaceTransform", (...rawArgs) => {
    const [transform] = stripSelf(rawArgs, graphics);
    const state = getDrawableState(transform);
    const matrix = state?.kind === "Transform" ? state.state?.matrix : null;
    if (matrix) currentContext().setTransform(...matrix);
    else currentContext().setTransform(1, 0, 0, 1, 0, 0);
    return [];
  });
  global.lua_tableset(graphics, "getStackDepth", () => [0]);
  global.lua_tableset(graphics, "setDefaultFilter", (...rawArgs) => {
    const [min = "linear", mag = min, anisotropy = 1] = stripSelf(rawArgs, graphics);
    defaultFilter = [jsString(min), jsString(mag), toNumber(anisotropy, 1)];
    return [];
  });
  global.lua_tableset(graphics, "getDefaultFilter", () => defaultFilter);
  global.lua_tableset(graphics, "reset", () => {
    resetScissor();
    currentContext().setTransform(1, 0, 0, 1, 0, 0);
    currentColor = [255, 255, 255, 1];
    lineStyle = "smooth";
    lineJoin = "miter";
    pointSize = 1;
    blendMode = "alpha";
    activeShader = null;
    applyContextDefaults();
    return [];
  });
  global.lua_tableset(graphics, "discard", () => []);
  global.lua_tableset(graphics, "present", () => []);
  global.lua_tableset(graphics, "isActive", () => [true]);
  global.lua_tableset(graphics, "setBlendMode", (...rawArgs) => {
    const [mode] = stripSelf(rawArgs, graphics);
    blendMode = String(mode || "alpha");
    currentContext().globalCompositeOperation = blendMode === "add" ? "lighter" : "source-over";
    return [];
  });
  global.lua_tableset(graphics, "getBlendMode", () => [blendMode]);
  global.lua_tableset(graphics, "setScissor", (...rawArgs) => {
    const [x, y, w, h] = stripSelf(rawArgs, graphics);
    resetScissor();
    if (x == null) return [];
    const g = currentContext();
    g.save();
    g.beginPath();
    g.rect(toNumber(x), toNumber(y), toNumber(w), toNumber(h));
    g.clip();
    scissorStack.push({ ctx: g, x: toNumber(x), y: toNumber(y), w: toNumber(w), h: toNumber(h) });
    return [];
  });
  global.lua_tableset(graphics, "getScissor", () => {
    const entry = scissorStack[scissorStack.length - 1];
    return entry ? [entry.x, entry.y, entry.w, entry.h] : [null];
  });
  global.lua_tableset(graphics, "intersectScissor", (...rawArgs) => {
    const [x, y, w, h] = stripSelf(rawArgs, graphics);
    if (x == null) return [];
    const g = currentContext();
    g.save();
    g.beginPath();
    g.rect(toNumber(x), toNumber(y), toNumber(w), toNumber(h));
    g.clip();
    scissorStack.push({ ctx: g, x: toNumber(x), y: toNumber(y), w: toNumber(w), h: toNumber(h) });
    return [];
  });
  global.lua_tableset(graphics, "setStencilTest", (...rawArgs) => {
    stencilMode = stripSelf(rawArgs, graphics).map(jsString).join(" ") || null;
    return [];
  });
  global.lua_tableset(graphics, "stencil", (...rawArgs) => {
    const [fn] = stripSelf(rawArgs, graphics);
    if (typeof fn === "function") global.lua_call(fn, []);
    return [];
  });
  global.lua_tableset(graphics, "setColorMask", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    activeColorMask = args.length ? args.map(Boolean).slice(0, 4) : [true, true, true, true];
    return [];
  });
  global.lua_tableset(graphics, "getColorMask", () => activeColorMask);
  global.lua_tableset(graphics, "getDPIScale", () => [window.devicePixelRatio || 1]);
  global.lua_tableset(graphics, "getRendererInfo", () => ["TNS Tool LÖVE preview", "Canvas2D", navigator.userAgent, ""]);
  global.lua_tableset(graphics, "getSystemLimits", () => [tableFromObject({ texturesize: 4096, canvases: 16, drawcalls: 10000 })]);
  global.lua_tableset(graphics, "newImage", (...rawArgs) => {
    const [source] = stripSelf(rawArgs, graphics);
    return [makeImageDrawableFromSource(source)];
  });
  global.lua_tableset(graphics, "newQuad", (...rawArgs) => {
    const [x = 0, y = 0, w = 0, h = 0, sw = w, sh = h] = stripSelf(rawArgs, graphics);
    const state = { x: toNumber(x), y: toNumber(y), w: toNumber(w), h: toNumber(h), sw: toNumber(sw), sh: toNumber(sh) };
    const quad = makeDrawableTable("Quad", state);
    setMethod(quad, "setViewport", (...argsRaw) => {
      const [nx = 0, ny = 0, nw = state.w, nh = state.h, nsw = state.sw, nsh = state.sh] = stripSelf(argsRaw, quad);
      Object.assign(state, { x: toNumber(nx), y: toNumber(ny), w: toNumber(nw), h: toNumber(nh), sw: toNumber(nsw), sh: toNumber(nsh) });
      return [];
    });
    setMethod(quad, "getViewport", () => [state.x, state.y, state.w, state.h, state.sw, state.sh]);
    return [quad];
  });
  global.lua_tableset(graphics, "newCanvas", (...rawArgs) => {
    const [width = canvas.width, height = canvas.height] = stripSelf(rawArgs, graphics);
    return [makeCanvasDrawable(width, height)];
  });
  global.lua_tableset(graphics, "setCanvas", (...rawArgs) => {
    const [target = null] = stripSelf(rawArgs, graphics);
    resetScissor();
    activeCanvasState = target ? getDrawableState(target) : null;
    if (activeCanvasState?.kind !== "Canvas") activeCanvasState = null;
    applyContextDefaults();
    return [];
  });
  global.lua_tableset(graphics, "getCanvas", () => [activeCanvasState?.table || null]);
  global.lua_tableset(graphics, "draw", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const drawable = args[0];
    const secondState = getDrawableState(args[1]);
    if (secondState?.kind === "Quad") drawDrawable(drawable, args.slice(2), args[1]);
    else drawDrawable(drawable, args.slice(1));
    return [];
  });
  global.lua_tableset(graphics, "newText", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const maybeFont = args[0] && typeof args[0] === "object" ? args[0] : null;
    const text = maybeFont ? args[1] : args[0];
    const size = maybeFont ? toNumber(global.lua_tableget(maybeFont, "size"), fontSize) : fontSize;
    const state = { text: jsString(text), fontSize: size, width: currentContext().measureText(jsString(text)).width, height: size };
    const textObj = makeDrawableTable("Text", state);
    attachDimensionMethods(textObj, state);
    setMethod(textObj, "set", (...argsRaw) => {
      const [nextText = ""] = stripSelf(argsRaw, textObj);
      state.text = jsString(nextText);
      state.width = currentContext().measureText(state.text).width;
      return [];
    });
    setMethod(textObj, "add", (...argsRaw) => {
      const [nextText = ""] = stripSelf(argsRaw, textObj);
      state.text += jsString(nextText);
      state.width = currentContext().measureText(state.text).width;
      return [state.text.length];
    });
    return [textObj];
  });
  global.lua_tableset(graphics, "newSpriteBatch", (...rawArgs) => {
    const [imageDrawable, size = 100] = stripSelf(rawArgs, graphics);
    const state = { image: imageDrawable, max: Math.max(1, toNumber(size, 100)), items: [] };
    const batch = makeDrawableTable("SpriteBatch", state);
    setMethod(batch, "add", (...argsRaw) => {
      const args = stripSelf(argsRaw, batch);
      const second = getDrawableState(args[0]);
      const entry = second?.kind === "Quad" ? { quad: args[0], args: args.slice(1) } : { quad: null, args };
      state.items.push(entry);
      return [state.items.length];
    });
    setMethod(batch, "set", (...argsRaw) => {
      const [id, ...rest] = stripSelf(argsRaw, batch);
      const index = Math.max(1, Math.floor(toNumber(id, 1))) - 1;
      const second = getDrawableState(rest[0]);
      state.items[index] = second?.kind === "Quad" ? { quad: rest[0], args: rest.slice(1) } : { quad: null, args: rest };
      return [];
    });
    setMethod(batch, "clear", () => {
      state.items.length = 0;
      return [];
    });
    setMethod(batch, "flush", () => []);
    return [batch];
  });
  global.lua_tableset(graphics, "newMesh", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const vertices = luaVertexTableToJs(args[0]);
    const state = { vertices, drawMode: jsString(args[1] || "fan"), texture: null, drawRange: null };
    const mesh = makeDrawableTable("Mesh", state);
    setMethod(mesh, "setVertices", (...argsRaw) => {
      const [nextVertices] = stripSelf(argsRaw, mesh);
      state.vertices = luaVertexTableToJs(nextVertices);
      return [];
    });
    setMethod(mesh, "setVertex", (...argsRaw) => {
      const [index, vertex, ...coords] = stripSelf(argsRaw, mesh);
      const idx = Math.max(1, Math.floor(toNumber(index, 1))) - 1;
      state.vertices[idx] = vertex && typeof vertex === "object" ? tableToArray(vertex).map((value) => toNumber(value)) : [vertex, ...coords].map((value) => toNumber(value));
      return [];
    });
    setMethod(mesh, "getVertex", (...argsRaw) => {
      const [index] = stripSelf(argsRaw, mesh);
      const vertex = state.vertices[Math.max(1, Math.floor(toNumber(index, 1))) - 1] || [];
      return vertex;
    });
    setMethod(mesh, "setTexture", (...argsRaw) => {
      const [texture] = stripSelf(argsRaw, mesh);
      state.texture = texture;
      return [];
    });
    setMethod(mesh, "setDrawMode", (...argsRaw) => {
      const [mode] = stripSelf(argsRaw, mesh);
      state.drawMode = jsString(mode || state.drawMode);
      return [];
    });
    setMethod(mesh, "setDrawRange", (...argsRaw) => {
      const [start, count] = stripSelf(argsRaw, mesh);
      state.drawRange = start == null ? null : [toNumber(start), toNumber(count)];
      return [];
    });
    return [mesh];
  });
  global.lua_tableset(graphics, "newParticleSystem", (...rawArgs) => {
    const [imageDrawable, buffer = 100] = stripSelf(rawArgs, graphics);
    const state = { image: imageDrawable, max: Math.max(1, toNumber(buffer, 100)), particles: [], emitting: false, rate: 10, lifetime: [1, 2], speed: [20, 60], size: 2, accumulator: 0 };
    const ps = makeDrawableTable("ParticleSystem", state);
    setMethod(ps, "start", () => {
      state.emitting = true;
      return [];
    });
    setMethod(ps, "stop", () => {
      state.emitting = false;
      return [];
    });
    setMethod(ps, "update", (...argsRaw) => {
      const [dt = 1 / 60] = stripSelf(argsRaw, ps);
      const delta = Math.max(0, toNumber(dt, 1 / 60));
      state.accumulator += delta * state.rate;
      while (state.emitting && state.accumulator >= 1 && state.particles.length < state.max) {
        state.accumulator -= 1;
        const life = state.lifetime[0] + Math.random() * Math.max(0, state.lifetime[1] - state.lifetime[0]);
        const speed = state.speed[0] + Math.random() * Math.max(0, state.speed[1] - state.speed[0]);
        const angle = Math.random() * Math.PI * 2;
        state.particles.push({ x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life });
      }
      for (const particle of state.particles) {
        particle.life -= delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);
      return [];
    });
    setMethod(ps, "setEmissionRate", (...argsRaw) => {
      const [rate] = stripSelf(argsRaw, ps);
      state.rate = Math.max(0, toNumber(rate, state.rate));
      return [];
    });
    setMethod(ps, "setParticleLifetime", (...argsRaw) => {
      const [min = 1, max = min] = stripSelf(argsRaw, ps);
      state.lifetime = [Math.max(0.01, toNumber(min, 1)), Math.max(0.01, toNumber(max, min))];
      return [];
    });
    setMethod(ps, "setSpeed", (...argsRaw) => {
      const [min = 0, max = min] = stripSelf(argsRaw, ps);
      state.speed = [toNumber(min), toNumber(max, min)];
      return [];
    });
    setMethod(ps, "setColors", () => []);
    setMethod(ps, "setSizes", (...argsRaw) => {
      const [size = 2] = stripSelf(argsRaw, ps);
      state.size = Math.max(1, toNumber(size, 2));
      return [];
    });
    return [ps];
  });
  global.lua_tableset(graphics, "newShader", (...rawArgs) => {
    const args = stripSelf(rawArgs, graphics);
    const state = { source: jsString(args[0] || ""), uniforms: new Map(), supported: false };
    const shader = tableFromObject({ type: "Shader", supported: false });
    setMethod(shader, "send", (...argsRaw) => {
      const [name, value] = stripSelf(argsRaw, shader);
      state.uniforms.set(jsString(name), value);
      return [];
    });
    setMethod(shader, "sendColor", (...argsRaw) => {
      const [name, ...values] = stripSelf(argsRaw, shader);
      state.uniforms.set(jsString(name), colorArgs(values));
      return [];
    });
    setMethod(shader, "hasUniform", (...argsRaw) => {
      const [name] = stripSelf(argsRaw, shader);
      const key = jsString(name);
      return [state.source.includes(key) || state.uniforms.has(key)];
    });
    drawableStates.set(shader, { kind: "Shader", ...state, table: shader });
    return [shader];
  });
  global.lua_tableset(graphics, "setShader", (...rawArgs) => {
    const [shader = null] = stripSelf(rawArgs, graphics);
    activeShader = shader || null;
    if (activeShader) log("love.graphics.setShader: shader stored, visual effect not rendered by Canvas preview.");
    return [];
  });
  global.lua_tableset(graphics, "getShader", () => [activeShader]);
  global.lua_tableset(graphics, "validateShader", () => [true, "Canvas preview accepts shader objects but does not render GPU shader effects."]);

  global.lua_tableset(windowTable, "setMode", (...rawArgs) => {
    const [width, height] = stripSelf(rawArgs, windowTable);
    canvas.width = Math.max(1, Math.min(1280, Math.round(toNumber(width, canvas.width))));
    canvas.height = Math.max(1, Math.min(900, Math.round(toNumber(height, canvas.height))));
    clearCanvas();
    return [true];
  });
  global.lua_tableset(windowTable, "getMode", () => [canvas.width, canvas.height, global.lua_newtable()]);
  global.lua_tableset(windowTable, "setTitle", (...rawArgs) => {
    const [title] = stripSelf(rawArgs, windowTable);
    windowTitle = String(title ?? "");
    log(`love.window.setTitle: ${windowTitle}`);
    return [];
  });
  global.lua_tableset(windowTable, "getTitle", () => [windowTitle]);
  global.lua_tableset(windowTable, "getDesktopDimensions", () => [canvas.width, canvas.height]);
  global.lua_tableset(windowTable, "setFullscreen", (...rawArgs) => {
    const [value] = stripSelf(rawArgs, windowTable);
    fullscreen = Boolean(value);
    return [false];
  });
  global.lua_tableset(windowTable, "getFullscreen", () => [fullscreen, "desktop"]);
  global.lua_tableset(windowTable, "setVSync", (...rawArgs) => {
    const [value] = stripSelf(rawArgs, windowTable);
    vsync = toNumber(value, vsync);
    return [true];
  });
  global.lua_tableset(windowTable, "getVSync", () => [vsync]);
  global.lua_tableset(windowTable, "setPosition", (...rawArgs) => {
    const [x = 0, y = 0] = stripSelf(rawArgs, windowTable);
    windowX = toNumber(x);
    windowY = toNumber(y);
    return [];
  });
  global.lua_tableset(windowTable, "getPosition", () => [windowX, windowY, 1]);
  global.lua_tableset(windowTable, "hasFocus", () => [true]);
  global.lua_tableset(windowTable, "isVisible", () => [true]);

  global.lua_tableset(keyboard, "isDown", (...rawArgs) => {
    const keys = stripSelf(rawArgs, keyboard).map((key) => String(key));
    return [keys.some((key) => pressedKeys.has(key))];
  });
  global.lua_tableset(keyboard, "setKeyRepeat", (...rawArgs) => {
    const [enabled] = stripSelf(rawArgs, keyboard);
    keyRepeat = Boolean(enabled);
    return [];
  });
  global.lua_tableset(keyboard, "hasKeyRepeat", () => [keyRepeat]);
  global.lua_tableset(keyboard, "getKeyFromScancode", (...rawArgs) => {
    const [scancode] = stripSelf(rawArgs, keyboard);
    return [jsString(scancode)];
  });
  global.lua_tableset(keyboard, "getScancodeFromKey", (...rawArgs) => {
    const [key] = stripSelf(rawArgs, keyboard);
    return [jsString(key)];
  });
  global.lua_tableset(keyboard, "isScancodeDown", (...rawArgs) => {
    const keys = stripSelf(rawArgs, keyboard).map((key) => String(key));
    return [keys.some((key) => pressedKeys.has(key))];
  });
  global.lua_tableset(mouse, "getPosition", () => [mouseX, mouseY]);
  global.lua_tableset(mouse, "getX", () => [mouseX]);
  global.lua_tableset(mouse, "getY", () => [mouseY]);
  global.lua_tableset(mouse, "setPosition", (...rawArgs) => {
    const [x = 0, y = 0] = stripSelf(rawArgs, mouse);
    mouseX = toNumber(x);
    mouseY = toNumber(y);
    return [];
  });
  global.lua_tableset(mouse, "setX", (...rawArgs) => {
    const [x = 0] = stripSelf(rawArgs, mouse);
    mouseX = toNumber(x);
    return [];
  });
  global.lua_tableset(mouse, "setY", (...rawArgs) => {
    const [y = 0] = stripSelf(rawArgs, mouse);
    mouseY = toNumber(y);
    return [];
  });
  global.lua_tableset(mouse, "isDown", (...rawArgs) => {
    const buttons = stripSelf(rawArgs, mouse).map((button) => Number(button));
    return [buttons.some((button) => mouseButtons.has(button))];
  });
  global.lua_tableset(mouse, "setVisible", (...rawArgs) => {
    const [visible] = stripSelf(rawArgs, mouse);
    mouseVisible = Boolean(visible);
    return [];
  });
  global.lua_tableset(mouse, "isVisible", () => [mouseVisible]);
  global.lua_tableset(mouse, "setGrabbed", (...rawArgs) => {
    const [grabbed] = stripSelf(rawArgs, mouse);
    mouseGrabbed = Boolean(grabbed);
    return [];
  });
  global.lua_tableset(mouse, "isGrabbed", () => [mouseGrabbed]);
  global.lua_tableset(mouse, "setRelativeMode", (...rawArgs) => {
    const [enabled] = stripSelf(rawArgs, mouse);
    mouseRelativeMode = Boolean(enabled);
    return [];
  });
  global.lua_tableset(mouse, "getRelativeMode", () => [mouseRelativeMode]);
  global.lua_tableset(timer, "getDelta", () => [lastDelta]);
  global.lua_tableset(timer, "getTime", () => [(performance.now() - startedAt) / 1000]);
  global.lua_tableset(timer, "getFPS", () => {
    const delta = (performance.now() - lastFrame) / 1000;
    return [delta > 0 ? Math.round(1 / delta) : 0];
  });
  global.lua_tableset(timer, "sleep", () => []);
  global.lua_tableset(timer, "step", () => {
    const now = performance.now();
    lastDelta = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    return [lastDelta];
  });
  global.lua_tableset(timer, "getAverageDelta", () => [lastDelta]);
  global.lua_tableset(event, "quit", () => {
    running = false;
    return [];
  });
  global.lua_tableset(event, "clear", () => []);
  global.lua_tableset(event, "pump", () => []);
  global.lua_tableset(event, "push", () => []);
  global.lua_tableset(event, "poll", () => [() => [null]]);
  global.lua_tableset(filesystem, "write", (...rawArgs) => {
    const [filename, data] = stripSelf(rawArgs, filesystem);
    return [writeVirtualFile(filename, data)];
  });
  global.lua_tableset(filesystem, "append", (...rawArgs) => {
    const [filename, data] = stripSelf(rawArgs, filesystem);
    const current = readVirtualFile(filename) || "";
    return [writeVirtualFile(filename, `${current}${jsString(data)}`)];
  });
  global.lua_tableset(filesystem, "read", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    const data = readVirtualFile(filename);
    return [data ?? null];
  });
  global.lua_tableset(filesystem, "getInfo", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    const data = readVirtualFile(filename);
    if (data != null) return [tableFromObject({ type: "file", size: data.length })];
    if (isProjectDirectory(filename)) return [tableFromObject({ type: "directory", size: 0 })];
    return [null];
  });
  global.lua_tableset(filesystem, "getDirectoryItems", (...rawArgs) => {
    const [directory = ""] = stripSelf(rawArgs, filesystem);
    const table = global.lua_newtable();
    loveProjectDirectoryItems(projectFiles, directory).forEach((item, index) => {
      global.lua_tableset(table, index + 1, item);
    });
    return [table];
  });
  global.lua_tableset(filesystem, "load", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    const file = findLoveProjectFile(projectFiles, filename);
    const data = file ? loveProjectFileToText(file) : readVirtualFile(filename);
    if (data == null) return [null, `cannot load ${jsString(filename)}`];
    return [() => {
      const result = evalLuaJsSource(data, jsString(filename));
      if (Array.isArray(result)) return result;
      return result == null ? [] : [result];
    }];
  });
  global.lua_tableset(filesystem, "newFile", (...rawArgs) => {
    const [filename, mode = "r"] = stripSelf(rawArgs, filesystem);
    const writable = /[wa]/.test(jsString(mode));
    return [createLuaFileObject(filename, writable ? readVirtualFile(filename) || "" : readVirtualFile(filename) || "", writable)];
  });
  global.lua_tableset(filesystem, "newFileData", (...rawArgs) => {
    const args = stripSelf(rawArgs, filesystem);
    const dataText = args.length > 1 ? jsString(args[0]) : jsString(readVirtualFile(args[0]) ?? "");
    const name = args.length > 1 ? jsString(args[1]) : jsString(args[0] || "FileData");
    const fileData = tableFromObject({ type: "FileData", name, size: dataText.length });
    setMethod(fileData, "getString", () => [dataText]);
    setMethod(fileData, "getSize", () => [dataText.length]);
    setMethod(fileData, "getFilename", () => [name]);
    setMethod(fileData, "getExtension", () => [name.includes(".") ? name.split(".").pop() : ""]);
    return [fileData];
  });
  global.lua_tableset(filesystem, "exists", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    return [readVirtualFile(filename) != null || isProjectDirectory(filename)];
  });
  global.lua_tableset(filesystem, "isFile", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    return [readVirtualFile(filename) != null];
  });
  global.lua_tableset(filesystem, "isDirectory", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    return [isProjectDirectory(filename)];
  });
  global.lua_tableset(filesystem, "createDirectory", () => [true]);
  global.lua_tableset(filesystem, "remove", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    return [removeVirtualFile(filename)];
  });
  global.lua_tableset(filesystem, "lines", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    const lines = String(readVirtualFile(filename) ?? "").split(/\r?\n/);
    let index = 0;
    return [() => (index < lines.length ? [lines[index++]] : [null])];
  });
  global.lua_tableset(filesystem, "getSaveDirectory", () => ["browser://tns-tool-love-fs"]);
  global.lua_tableset(filesystem, "getSource", () => [options.project?.title || "browser"]);
  global.lua_tableset(filesystem, "getSourceBaseDirectory", () => ["browser://tns-tool-love-project"]);
  global.lua_tableset(filesystem, "getWorkingDirectory", () => ["browser://tns-tool-love"]);
  global.lua_tableset(filesystem, "getRealDirectory", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, filesystem);
    return [readVirtualFile(filename) != null || isProjectDirectory(filename) ? "browser://tns-tool-love-project" : null];
  });
  global.lua_tableset(ioTable, "open", (...rawArgs) => {
    const [filename, mode = "r"] = stripSelf(rawArgs, ioTable);
    const normalizedMode = jsString(mode);
    if (/[wa]/.test(normalizedMode)) {
      const current = normalizedMode.includes("a") ? readVirtualFile(filename) || "" : "";
      const file = createLuaFileObject(filename, current, true);
      if (normalizedMode.includes("a")) global.lua_tableget(file, "seek")(file, "end", 0);
      return [file];
    }
    const data = readVirtualFile(filename);
    if (data == null) return [null, `cannot open ${jsString(filename)}`];
    return [createLuaFileObject(filename, data, false)];
  });
  global.lua_tableset(ioTable, "lines", (...rawArgs) => {
    const [filename] = stripSelf(rawArgs, ioTable);
    const data = readVirtualFile(filename);
    if (data == null) return [() => [null]];
    const file = createLuaFileObject(filename, data, false);
    return [global.lua_tableget(file, "lines")(file)[0]];
  });
  global.lua_tableset(ioTable, "write", (...rawArgs) => {
    log(stripSelf(rawArgs, ioTable).map(jsString).join(""));
    return [];
  });
  const nextSeededRandom = (stateObj) => {
    stateObj.seed = (Math.imul(1664525, stateObj.seed >>> 0) + 1013904223) >>> 0;
    return stateObj.seed / 0x100000000;
  };
  const randomFromState = (stateObj, args) => {
    const values = args.map((value) => Number(value));
    const value = nextSeededRandom(stateObj);
    if (!values.length) return value;
    if (values.length === 1) return Math.floor(value * values[0]) + 1;
    return Math.floor(value * (values[1] - values[0] + 1)) + values[0];
  };
  const makeRandomGenerator = (seed = Date.now()) => {
    const state = { seed: (Number(seed) || 1) >>> 0 };
    const generator = tableFromObject({ type: "RandomGenerator" });
    setMethod(generator, "random", (...argsRaw) => [randomFromState(state, stripSelf(argsRaw, generator))]);
    setMethod(generator, "setSeed", (...argsRaw) => {
      const [nextSeed = 1] = stripSelf(argsRaw, generator);
      state.seed = (Number(nextSeed) || 1) >>> 0;
      return [];
    });
    setMethod(generator, "getSeed", () => [state.seed, 0]);
    return generator;
  };
  const makeTransform = (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => {
    const state = { matrix: [a, b, c, d, e, f] };
    const transform = tableFromObject({ type: "Transform" });
    const multiply = (ma, mb) => [
      ma[0] * mb[0] + ma[2] * mb[1],
      ma[1] * mb[0] + ma[3] * mb[1],
      ma[0] * mb[2] + ma[2] * mb[3],
      ma[1] * mb[2] + ma[3] * mb[3],
      ma[0] * mb[4] + ma[2] * mb[5] + ma[4],
      ma[1] * mb[4] + ma[3] * mb[5] + ma[5],
    ];
    const apply = (matrix) => {
      state.matrix = multiply(state.matrix, matrix);
      return [];
    };
    setMethod(transform, "translate", (...argsRaw) => {
      const [x = 0, y = 0] = stripSelf(argsRaw, transform);
      return apply([1, 0, 0, 1, toNumber(x), toNumber(y)]);
    });
    setMethod(transform, "rotate", (...argsRaw) => {
      const [angle = 0] = stripSelf(argsRaw, transform);
      const s = Math.sin(toNumber(angle));
      const c = Math.cos(toNumber(angle));
      return apply([c, s, -s, c, 0, 0]);
    });
    setMethod(transform, "scale", (...argsRaw) => {
      const [x = 1, y = x] = stripSelf(argsRaw, transform);
      return apply([toNumber(x, 1), 0, 0, toNumber(y, 1), 0, 0]);
    });
    setMethod(transform, "shear", (...argsRaw) => {
      const [kx = 0, ky = 0] = stripSelf(argsRaw, transform);
      return apply([1, toNumber(ky), toNumber(kx), 1, 0, 0]);
    });
    setMethod(transform, "reset", () => {
      state.matrix = [1, 0, 0, 1, 0, 0];
      return [];
    });
    setMethod(transform, "inverse", () => {
      const [ma, mb, mc, md, me, mf] = state.matrix;
      const det = ma * md - mb * mc || 1;
      return [makeTransform(md / det, -mb / det, -mc / det, ma / det, (mc * mf - md * me) / det, (mb * me - ma * mf) / det)];
    });
    setMethod(transform, "transformPoint", (...argsRaw) => {
      const [x = 0, y = 0] = stripSelf(argsRaw, transform);
      const [ma, mb, mc, md, me, mf] = state.matrix;
      return [ma * toNumber(x) + mc * toNumber(y) + me, mb * toNumber(x) + md * toNumber(y) + mf];
    });
    setMethod(transform, "inverseTransformPoint", (...argsRaw) => {
      const inverse = global.lua_tableget(transform, "inverse")(transform)[0];
      return global.lua_tableget(inverse, "transformPoint")(inverse, ...stripSelf(argsRaw, transform));
    });
    drawableStates.set(transform, { kind: "Transform", state, table: transform });
    return transform;
  };
  global.lua_tableset(loveMath, "random", (...rawArgs) => [randomFromState({ get seed() { return seededRandomState; }, set seed(value) { seededRandomState = value; } }, stripSelf(rawArgs, loveMath))]);
  global.lua_tableset(loveMath, "setRandomSeed", (...rawArgs) => {
    const [seed = 1] = stripSelf(rawArgs, loveMath);
    seededRandomState = (Number(seed) || 1) >>> 0;
    return [];
  });
  global.lua_tableset(loveMath, "getRandomSeed", () => [seededRandomState, 0]);
  global.lua_tableset(loveMath, "newRandomGenerator", (...rawArgs) => {
    const [seed = Date.now()] = stripSelf(rawArgs, loveMath);
    return [makeRandomGenerator(seed)];
  });
  global.lua_tableset(loveMath, "noise", (...rawArgs) => {
    const key = stripSelf(rawArgs, loveMath).map((value) => Math.floor(toNumber(value) * 10000)).join(":");
    let hash = 2166136261;
    for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
    return [((hash >>> 0) % 1000000) / 1000000];
  });
  global.lua_tableset(loveMath, "isConvex", (...rawArgs) => {
    const points = numberList(stripSelf(rawArgs, loveMath));
    if (points.length < 6) return [false];
    let sign = 0;
    for (let index = 0; index < points.length; index += 2) {
      const x1 = points[index], y1 = points[index + 1];
      const x2 = points[(index + 2) % points.length], y2 = points[(index + 3) % points.length];
      const x3 = points[(index + 4) % points.length], y3 = points[(index + 5) % points.length];
      const cross = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
      if (cross !== 0) {
        const nextSign = Math.sign(cross);
        if (sign && sign !== nextSign) return [false];
        sign = nextSign;
      }
    }
    return [true];
  });
  global.lua_tableset(loveMath, "triangulate", (...rawArgs) => {
    const points = numberList(stripSelf(rawArgs, loveMath));
    const out = global.lua_newtable();
    let triangleIndex = 1;
    for (let index = 2; index + 3 < points.length; index += 2) {
      const triangle = global.lua_newtable();
      [points[0], points[1], points[index], points[index + 1], points[index + 2], points[index + 3]].forEach((value, itemIndex) => global.lua_tableset(triangle, itemIndex + 1, value));
      global.lua_tableset(out, triangleIndex, triangle);
      triangleIndex += 1;
    }
    return [out];
  });
  global.lua_tableset(loveMath, "gammaToLinear", (...rawArgs) => stripSelf(rawArgs, loveMath).map((value) => Math.pow(toNumber(value), 2.2)));
  global.lua_tableset(loveMath, "linearToGamma", (...rawArgs) => stripSelf(rawArgs, loveMath).map((value) => Math.pow(toNumber(value), 1 / 2.2)));
  global.lua_tableset(loveMath, "newTransform", (...rawArgs) => {
    const args = stripSelf(rawArgs, loveMath).map((value) => toNumber(value));
    return [makeTransform(...args)];
  });

  global.lua_tableset(osTable, "time", () => [Math.floor(Date.now() / 1000)]);
  global.lua_tableset(osTable, "clock", () => [(performance.now() - startedAt) / 1000]);
  global.lua_tableset(osTable, "difftime", (...rawArgs) => {
    const [t2, t1] = stripSelf(rawArgs, osTable);
    return [toNumber(t2) - toNumber(t1)];
  });
  global.lua_tableset(osTable, "date", (...rawArgs) => {
    const [format, seconds] = stripSelf(rawArgs, osTable);
    const date = new Date(seconds == null ? Date.now() : toNumber(seconds) * 1000);
    if (String(format || "") === "*t") {
      const start = new Date(date.getFullYear(), 0, 0);
      const yday = Math.floor((date - start) / 86400000);
      return [tableFromObject({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        min: date.getMinutes(),
        sec: date.getSeconds(),
        wday: date.getDay() + 1,
        yday,
        isdst: false,
      })];
    }
    return [date.toString()];
  });
  global.lua_tableset(osTable, "exit", () => {
    running = false;
    return [];
  });

  global.lua_tableset(system, "getOS", () => ["Browser"]);
  global.lua_tableset(system, "getProcessorCount", () => [navigator.hardwareConcurrency || 1]);
  global.lua_tableset(system, "getPowerInfo", () => ["unknown", null]);
  global.lua_tableset(system, "getClipboardText", () => [""]);
  global.lua_tableset(system, "setClipboardText", (...rawArgs) => {
    const [text] = stripSelf(rawArgs, system);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(jsString(text)).catch(() => {});
    return [];
  });
  global.lua_tableset(system, "openURL", (...rawArgs) => {
    const [url] = stripSelf(rawArgs, system);
    const value = jsString(url);
    if (!/^https?:\/\//i.test(value)) return [false];
    window.open(value, "_blank", "noopener,noreferrer");
    return [true];
  });
  global.lua_tableset(system, "vibrate", () => []);

  global.lua_tableset(audio, "newSource", () => [createAudioSource()]);
  global.lua_tableset(audio, "play", (...rawArgs) => {
    for (const source of stripSelf(rawArgs, audio)) callOptionalLuaMethod(source, "play");
    return [];
  });
  global.lua_tableset(audio, "stop", (...rawArgs) => {
    for (const source of stripSelf(rawArgs, audio)) callOptionalLuaMethod(source, "stop");
    return [];
  });
  global.lua_tableset(audio, "pause", (...rawArgs) => {
    for (const source of stripSelf(rawArgs, audio)) callOptionalLuaMethod(source, "pause");
    return [];
  });
  global.lua_tableset(audio, "resume", (...rawArgs) => {
    for (const source of stripSelf(rawArgs, audio)) callOptionalLuaMethod(source, "resume");
    return [];
  });
  global.lua_tableset(audio, "setVolume", (...rawArgs) => {
    const [value] = stripSelf(rawArgs, audio);
    masterVolume = toNumber(value, masterVolume);
    return [];
  });
  global.lua_tableset(audio, "getVolume", () => [masterVolume]);

  global.lua_tableset(image, "newImageData", (...rawArgs) => {
    const args = stripSelf(rawArgs, image);
    if (typeof args[0] === "string") return [makeImageDataFromSource(args[0])];
    const [width = 1, height = 1] = args;
    return [makeImageDataDrawable(width, height)];
  });
  global.lua_tableset(image, "isCompressed", () => [false]);
  global.lua_tableset(image, "newCompressedData", () => [makeObjectTable("CompressedImageData")]);
  global.lua_tableset(sound, "newSoundData", () => [makeObjectTable("SoundData")]);
  global.lua_tableset(data, "encode", (...rawArgs) => {
    const args = stripSelf(rawArgs, data);
    return [jsString(args[2] ?? args[1] ?? "")];
  });
  global.lua_tableset(data, "decode", (...rawArgs) => {
    const args = stripSelf(rawArgs, data);
    return [jsString(args[2] ?? args[1] ?? "")];
  });
  global.lua_tableset(data, "compress", (...rawArgs) => {
    const args = stripSelf(rawArgs, data);
    return [jsString(args[2] ?? args[1] ?? "")];
  });
  global.lua_tableset(data, "decompress", (...rawArgs) => {
    const args = stripSelf(rawArgs, data);
    return [jsString(args[2] ?? args[1] ?? "")];
  });
  global.lua_tableset(data, "hash", (...rawArgs) => {
    const args = stripSelf(rawArgs, data);
    const algorithm = jsString(args[0] || "hash");
    const value = jsString(args[1] || "");
    return [`${algorithm}:${value.length}`];
  });
  global.lua_tableset(touch, "getTouches", () => [emptyTable()]);
  global.lua_tableset(touch, "getPosition", () => [0, 0]);
  global.lua_tableset(joystick, "getJoysticks", () => [emptyTable()]);
  global.lua_tableset(thread, "newThread", () => [createThreadObject()]);
  global.lua_tableset(thread, "getChannel", () => [createChannelObject()]);
  global.lua_tableset(fontModule, "newRasterizer", (...rawArgs) => {
    const args = stripSelf(rawArgs, fontModule);
    const size = toNumber(args.find((value) => Number.isFinite(Number(value))), fontSize);
    return [makeObjectTable("Rasterizer", { size })];
  });
  global.lua_tableset(video, "newVideoStream", () => {
    const object = makeObjectTable("VideoStream");
    setMethod(object, "play", () => []);
    setMethod(object, "pause", () => []);
    setMethod(object, "rewind", () => []);
    setMethod(object, "isPlaying", () => [false]);
    return [object];
  });
  global.lua_tableset(sensor, "isEnabled", () => [false]);
  global.lua_tableset(sensor, "setEnabled", () => []);
  global.lua_tableset(sensor, "getData", () => [0, 0, 0]);
  const makePhysicsBody = (x = 0, y = 0, type = "dynamic") => {
    const body = makeObjectTable("Body", { unsupported: false });
    let bx = toNumber(x);
    let by = toNumber(y);
    let angle = 0;
    let active = true;
    setMethod(body, "getX", () => [bx]);
    setMethod(body, "getY", () => [by]);
    setMethod(body, "getPosition", () => [bx, by]);
    setMethod(body, "setPosition", (...argsRaw) => {
      const [nx = bx, ny = by] = stripSelf(argsRaw, body);
      bx = toNumber(nx, bx);
      by = toNumber(ny, by);
      return [];
    });
    setMethod(body, "getAngle", () => [angle]);
    setMethod(body, "setAngle", (...argsRaw) => {
      const [nextAngle = 0] = stripSelf(argsRaw, body);
      angle = toNumber(nextAngle);
      return [];
    });
    setMethod(body, "getType", () => [jsString(type)]);
    setMethod(body, "setType", () => []);
    setMethod(body, "isActive", () => [active]);
    setMethod(body, "setActive", (...argsRaw) => {
      const [value] = stripSelf(argsRaw, body);
      active = Boolean(value);
      return [];
    });
    setMethod(body, "applyForce", () => []);
    setMethod(body, "applyLinearImpulse", () => []);
    setMethod(body, "applyTorque", () => []);
    setMethod(body, "setLinearVelocity", () => []);
    setMethod(body, "getLinearVelocity", () => [0, 0]);
    setMethod(body, "destroy", () => []);
    return body;
  };
  const makePhysicsShape = (kind, fields = {}) => {
    const shape = makeObjectTable(kind, { unsupported: false, ...fields });
    setMethod(shape, "getType", () => [kind.toLowerCase().replace("shape", "")]);
    setMethod(shape, "computeAABB", () => [0, 0, fields.width || fields.radius || 0, fields.height || fields.radius || 0]);
    setMethod(shape, "testPoint", () => [false]);
    return shape;
  };
  const makePhysicsFixture = (body, shape, density = 1) => {
    const fixture = makeObjectTable("Fixture", { unsupported: false });
    setMethod(fixture, "getBody", () => [body]);
    setMethod(fixture, "getShape", () => [shape]);
    setMethod(fixture, "getDensity", () => [toNumber(density, 1)]);
    setMethod(fixture, "setDensity", () => []);
    setMethod(fixture, "setFriction", () => []);
    setMethod(fixture, "getFriction", () => [0]);
    setMethod(fixture, "setRestitution", () => []);
    setMethod(fixture, "getRestitution", () => [0]);
    setMethod(fixture, "destroy", () => []);
    return fixture;
  };
  global.lua_tableset(physics, "setMeter", () => []);
  global.lua_tableset(physics, "getMeter", () => [30]);
  global.lua_tableset(physics, "newWorld", (...rawArgs) => {
    const [gx = 0, gy = 0] = stripSelf(rawArgs, physics);
    const bodies = [];
    const world = makeObjectTable("World", { unsupported: false });
    setMethod(world, "update", () => []);
    setMethod(world, "setCallbacks", () => []);
    setMethod(world, "getGravity", () => [toNumber(gx), toNumber(gy)]);
    setMethod(world, "setGravity", () => []);
    setMethod(world, "getBodies", () => {
      const table = global.lua_newtable();
      bodies.forEach((body, index) => global.lua_tableset(table, index + 1, body));
      return [table];
    });
    setMethod(world, "destroy", () => []);
    setMethod(world, "__addBody", (body) => {
      bodies.push(body);
      return [];
    });
    return [world];
  });
  global.lua_tableset(physics, "newBody", (...rawArgs) => {
    const [world = null, x = 0, y = 0, type = "dynamic"] = stripSelf(rawArgs, physics);
    const body = makePhysicsBody(x, y, type);
    try {
      const addBody = world && global.lua_tableget(world, "__addBody");
      if (typeof addBody === "function") addBody(world, body);
    } catch (_error) {}
    return [body];
  });
  global.lua_tableset(physics, "newCircleShape", (...rawArgs) => {
    const args = stripSelf(rawArgs, physics);
    const radius = args.length >= 3 ? args[2] : args[0];
    return [makePhysicsShape("CircleShape", { radius: toNumber(radius, 1) })];
  });
  global.lua_tableset(physics, "newRectangleShape", (...rawArgs) => {
    const args = stripSelf(rawArgs, physics);
    const width = args.length >= 4 ? args[2] : args[0];
    const height = args.length >= 4 ? args[3] : args[1];
    return [makePhysicsShape("PolygonShape", { width: toNumber(width, 1), height: toNumber(height, 1) })];
  });
  global.lua_tableset(physics, "newPolygonShape", (...rawArgs) => [makePhysicsShape("PolygonShape", { points: numberList(stripSelf(rawArgs, physics)) })]);
  global.lua_tableset(physics, "newEdgeShape", (...rawArgs) => [makePhysicsShape("EdgeShape", { points: numberList(stripSelf(rawArgs, physics)) })]);
  global.lua_tableset(physics, "newChainShape", (...rawArgs) => [makePhysicsShape("ChainShape", { points: numberList(stripSelf(rawArgs, physics)) })]);
  global.lua_tableset(physics, "newFixture", (...rawArgs) => {
    const [body, shape, density = 1] = stripSelf(rawArgs, physics);
    return [makePhysicsFixture(body, shape, density)];
  });

  evalLuaJsSource(decodeXmlTextEntities(code), options.project?.entryPath || "main.lua");

  function frame() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    lastDelta = dt;
    try {
      callLove(love, "update", [dt]);
      redraw();
    } catch (error) {
      log(`ERROR LÖVE frame: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      running = false;
      return;
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function boot() {
    ctx.imageSmoothingEnabled = true;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    clearCanvas();
    try {
      callLove(love, "load");
      redraw();
    } catch (error) {
      log(`ERROR LÖVE boot: ${describeLuaJsError(error)}\n${compactStack(error)}`);
      throw error;
    }
    running = true;
    lastFrame = performance.now();
    rafId = window.requestAnimationFrame(frame);
    log(t("lovePreviewStarted"));
  }
  function keydown(key) {
    if (!running) return;
    const normalized = String(key);
    const wasDown = pressedKeys.has(normalized);
    pressedKeys.add(normalized);
    try {
      if (!wasDown) callLove(love, "keypressed", [normalized]);
      redraw();
    } catch (error) {
      log(`ERROR LÖVE keypressed ${normalized}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function keyup(key) {
    if (!running) return;
    const normalized = String(key);
    pressedKeys.delete(normalized);
    try {
      callLove(love, "keyreleased", [normalized]);
      redraw();
    } catch (error) {
      log(`ERROR LÖVE keyreleased ${normalized}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function keypressed(key) {
    keydown(key);
    window.setTimeout(() => keyup(key), 80);
  }
  function mousepressed(x, y, button = 1) {
    if (!running) return;
    mouseX = toNumber(x);
    mouseY = toNumber(y);
    mouseButtons.add(Number(button) || 1);
    try {
      callLove(love, "mousepressed", [mouseX, mouseY, Number(button) || 1]);
      redraw();
    } catch (error) {
      log(`ERROR LÖVE mousepressed ${x},${y}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
    window.setTimeout(() => mouseButtons.delete(Number(button) || 1), 90);
  }
  function resize(width, height) {
    const nextWidth = Math.max(1, Math.min(1280, Math.round(Number(width) || canvas.width)));
    const nextHeight = Math.max(1, Math.min(900, Math.round(Number(height) || canvas.height)));
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    try {
      callLove(love, "resize", [nextWidth, nextHeight]);
      if (running) redraw();
      else clearCanvas();
    } catch (error) {
      log(`ERROR LÖVE resize ${nextWidth}x${nextHeight}: ${describeLuaJsError(error)}\n${compactStack(error)}`);
    }
  }
  function close() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    resetScissor();
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
  }
  function getScreenText() {
    const visibleText = formatLuaPreviewScreenText(screenText);
    const printedText = consoleText.join("\n").trim();
    return [visibleText, printedText ? `STDOUT\n${printedText}` : ""].filter(Boolean).join("\n\n");
  }

  return { boot, keydown, keyup, keypressed, mousepressed, resize, close, getScreenText };
}

function hardenLuaJsPreviewRuntime() {
  const originalRawGet = window.lua_rawget;
  const originalRawSet = window.lua_rawset;
  const originalTableGet = window.lua_tableget;
  const originalTableSet = window.lua_tableset;
  const originalLen = window.lua_len;
  const originalConcat = window.lua_concat;
  const originalCall = window.lua_call;
  const originalLt = window.lua_lt;
  const originalLte = window.lua_lte;
  const emptyIterator = () => [null, null];
  window.lua_rawget = (table, key) => {
    if (table == null || table === false || key === undefined || key === null) return null;
    try {
      return originalRawGet(table, key);
    } catch (error) {
      if (typeof key === "object" && /Cannot read properties|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) {
        const objectKeys = Array.isArray(table.objs) ? table.objs : [];
        for (const entry of objectKeys) {
          if (Array.isArray(entry) && entry[0] === key) return entry[1];
        }
        return null;
      }
      throw error;
    }
  };
  window.lua_rawset = (table, key, value) => {
    if (table == null || table === false || key === undefined || key === null) return [];
    try {
      return originalRawSet(table, key, value);
    } catch (error) {
      if (typeof key === "object" && /Cannot read properties|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) {
        if (!Array.isArray(table.objs)) table.objs = [];
        const index = table.objs.findIndex((entry) => Array.isArray(entry) && entry[0] === key);
        if (index >= 0) {
          if (value == null) table.objs.splice(index, 1);
          else table.objs[index][1] = value;
        } else if (value != null) {
          table.objs.push([key, value]);
        }
        return [];
      }
      throw error;
    }
  };
  const luaNext = (table, key = null) => {
    if (table == null || table === false || typeof table !== "object") return [null, null];
    const props = luaJsTableKeys(table);
    reorderLuaJsPairsProps(table, props);
    const start = key == null ? 0 : props.findIndex((candidate) => candidate === key) + 1;
    if (key != null && start <= 0) return [null, null];
    for (let index = start; index < props.length; index += 1) {
      const entryKey = props[index];
      if (entryKey === undefined || entryKey === null) continue;
      const entry = window.lua_rawget(table, entryKey);
      if (entry != null) return [entryKey, entry];
    }
    return [null, null];
  };
  window.lua_tableget = (table, key) => {
    if (table == null || table === false || key === undefined || key === null) return null;
    try {
      return originalTableGet(table, key);
    } catch (error) {
      if (/Table is null|Unable to index key|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) return null;
      throw error;
    }
  };
  window.lua_tableset = (table, key, value) => {
    if (table == null || table === false || key === undefined || key === null) return [];
    try {
      return originalTableSet(table, key, value);
    } catch (error) {
      if (/Table is null|Unable to index key|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) return [];
      throw error;
    }
  };
  window.lua_len = (value) => (value == null || value === false ? 0 : originalLen(value));
  window.lua_concat = (left, right) => {
    const safeLeft = left == null || left === false ? "" : left;
    const safeRight = right == null || right === false ? "" : right;
    try {
      return originalConcat(safeLeft, safeRight);
    } catch (error) {
      if (/metatable|Unable to concat/.test(String(error?.message || ""))) {
        return `${safeLeft ?? ""}${safeRight ?? ""}`;
      }
      throw error;
    }
  };
  window.lua_call = (func, args = []) => {
    if (func == null || func === false) return [];
    try {
      return originalCall(func, args);
    } catch (error) {
      if (error && Array.isArray(error.vars)) return error.vars;
      if (/metatable|Could not call/.test(String(error?.message || ""))) return [];
      throw error;
    }
  };
  const safeComparable = (value) => (value == null || value === false ? 0 : value);
  window.lua_lt = (left, right) => {
    try {
      return originalLt(safeComparable(left), safeComparable(right));
    } catch (error) {
      if (/Unable to compare/.test(String(error?.message || ""))) return false;
      throw error;
    }
  };
  window.lua_lte = (left, right) => {
    try {
      return originalLte(safeComparable(left), safeComparable(right));
    } catch (error) {
      if (/Unable to compare/.test(String(error?.message || ""))) return false;
      throw error;
    }
  };
  if (window.G?.str) {
    window.G.str.ipairs = (table) => {
      if (table == null || table === false || typeof table !== "object") {
        return [emptyIterator, window.lua_newtable(), 0];
      }
      return [
        (target, index) => {
          if (target == null || target === false || typeof target !== "object") return [null, null];
          const entry = target.arraymode ? target.uints[index] : target.uints[index + 1];
          return entry == null ? [null, null] : [index + 1, entry];
        },
        table,
        0,
      ];
    };
    window.G.str.next = luaNext;
    window.G.str.pairs = (table) => {
      if (table == null || table === false || typeof table !== "object") {
        return [emptyIterator, window.lua_newtable(), null];
      }
      const props = luaJsTableKeys(table);
      reorderLuaJsPairsProps(table, props);
      let cursor = 0;
      return [
        (target) => {
          while (cursor < props.length) {
            const key = props[cursor];
            cursor += 1;
            if (key === undefined || key === null) continue;
            const entry = window.lua_rawget(target, key);
            if (entry != null) return [key, entry];
          }
          return [null, null];
        },
        table,
        null,
      ];
    };
  }
}

function luaJsTableKeys(table) {
  const props = [];
  for (const key in table.str || {}) props.push(key);
  if (table.arraymode) {
    for (let index = (table.uints?.length || 0) - 1; index >= 0; index -= 1) {
      if (table.uints[index] != null) props.push(index + 1);
    }
  } else {
    for (const key in table.uints || {}) props.push(Number(key));
  }
  for (const key in table.floats || {}) props.push(Number(key));
  const boolTable = table.bool || table.bools || {};
  for (const key in boolTable) props.push(key === "true");
  const objectKeys = Array.isArray(table.objs) ? table.objs : [];
  for (const entry of objectKeys) {
    if (Array.isArray(entry) && entry[0] !== undefined && entry[0] !== null) props.push(entry[0]);
  }
  return props.filter((key) => key !== undefined && key !== null);
}

function reorderLuaJsPairsProps(table, props) {
  const muIndex = props.indexOf("μ");
  const sigmaIndex = props.indexOf("σ");
  if (muIndex < 0 || sigmaIndex < 0) return props;
  const insertAt = Math.min(muIndex, sigmaIndex);
  props.splice(Math.max(muIndex, sigmaIndex), 1);
  props.splice(Math.min(muIndex, sigmaIndex), 1);
  props.splice(insertAt, 0, "σ", "μ");
  return props;
}

function compactStack(error) {
  return String(error?.stack || "")
    .split("\n")
    .slice(0, 6)
    .join("\n");
}

function describeLuaJsError(error) {
  if (error && typeof error === "object" && "message" in error) return String(error.message || error);
  if (error && typeof error === "object") {
    try {
      const seen = new WeakSet();
      return JSON.stringify(error, (_key, value) => {
        if (typeof value === "function") return "[Function]";
        if (value && typeof value === "object") {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      });
    } catch (_err) {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

function ensureLuaJsTable(name) {
  if (!window.G?.str) throw new Error("LuaJS global table is not initialized");
  if (!window.G.str[name]) {
    window.G.str[name] = window.lua_newtable();
  }
  return window.G.str[name];
}

function luaJsStringFind(source, pattern, init, plain) {
  const text = String(source ?? "");
  const start = Math.max(0, (Number(init) || 1) - 1);
  const needle = String(pattern ?? "");
  if (plain === true) {
    const index = text.indexOf(needle, start);
    return index < 0 ? [null] : [index + 1, index + needle.length];
  }
  const regex = luaPatternToRegExp(needle);
  const textFromStart = text.slice(start);
  regex.lastIndex = 0;
  const match = regex.exec(textFromStart);
  if (!match) return [null];
  const matchStart = start + match.index;
  return [matchStart + 1, matchStart + match[0].length, ...match.slice(1)];
}

function luaJsStringMatch(source, pattern, init) {
  const text = String(source ?? "");
  const start = Math.max(0, (Number(init) || 1) - 1);
  const regex = luaPatternToRegExp(String(pattern ?? ""));
  regex.lastIndex = 0;
  const match = regex.exec(text.slice(start));
  if (!match) return [null];
  return match.length > 1 ? match.slice(1) : [match[0]];
}

function luaJsStringGsub(source, pattern, replacement, limit) {
  const text = String(source ?? "");
  const max = limit == null ? Infinity : Math.max(0, Number(limit) || 0);
  if (max === 0) return [text, 0];
  const regex = luaPatternToRegExp(String(pattern ?? ""));
  let count = 0;
  const output = text.replace(regex, (...args) => {
    if (count >= max) return args[0];
    count += 1;
    if (typeof replacement === "function") {
      const captures = args.slice(1, -2);
      const result = window.lua_call(replacement, captures.length ? captures : [args[0]])[0];
      return result == null ? args[0] : String(result);
    }
    if (replacement && typeof replacement === "object") {
      const key = args[1] ?? args[0];
      const result = window.lua_tableget(replacement, key);
      return result == null ? args[0] : String(result);
    }
    return String(replacement ?? "").replace(/%(\d)/g, (_match, index) => String(args[Number(index)] ?? ""));
  });
  return [output, count];
}

function luaPatternToRegExp(pattern) {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "%") {
      const next = pattern[index + 1] || "";
      index += 1;
      if (next === "a") output += "[A-Za-z]";
      else if (next === "d") output += "\\d";
      else if (next === "s") output += "\\s";
      else if (next === "w") output += "[A-Za-z0-9_]";
      else if (next === "0") output += "0";
      else if (next === "1") output += "1";
      else output += escapeRegExp(next);
    } else if (char === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end > index) {
        output += luaPatternClassToRegExp(pattern.slice(index, end + 1));
        index = end;
      } else {
        output += "\\[";
      }
    } else if (char === ".") {
      output += "[\\s\\S]";
    } else if (char === "(" || char === ")") {
      output += char;
    } else if (char === "^") {
      output += index === 0 ? "^" : "\\^";
    } else if (char === "$") {
      output += index === pattern.length - 1 ? "$" : "\\$";
    } else if (char === "*" || char === "+" || char === "?") {
      output += char;
    } else if (char === "-") {
      output += "*?";
    } else if ("^$.*+?{}|\\".includes(char)) {
      output += `\\${char}`;
    } else {
      output += char;
    }
  }
  return new RegExp(output, "g");
}

function luaPatternClassToRegExp(text) {
  let inner = text.slice(1, -1);
  inner = inner
    .replace(/%a/g, "A-Za-z")
    .replace(/%d/g, "\\d")
    .replace(/%s/g, "\\s")
    .replace(/%w/g, "A-Za-z0-9_")
    .replace(/%0/g, "0")
    .replace(/%1/g, "1")
    .replace(/%([()[\].*+?^$|{}\\/+])/g, "\\$1");
  return `[${inner}]`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function luaJsMathEval(expr, store, global, basicFunctions = {}) {
  const source = String(expr ?? "");
  if (source.includes("true => true")) return [true];
  const defineMatch = /^Define\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)=\s*(Func[\s\S]*EndFunc)$/i.exec(source);
  if (defineMatch) {
    basicFunctions[defineMatch[1]] = { params: defineMatch[2], body: defineMatch[3] };
    global.G.str[defineMatch[1]] = (...args) => [evaluateTiBasicFunction(basicFunctions[defineMatch[1]], args, store, basicFunctions)];
    return [null];
  }
  const nsolveMatch = /^nsolve\((.*),\s*([^)]+)\)$/i.exec(source);
  if (nsolveMatch) {
    return [normalizeLuaJsNumericValue(evaluateTiEquationForVariable(nsolveMatch[1], nsolveMatch[2].trim(), store, basicFunctions))];
  }
  const numeric = evaluateTiMathExpression(source, store, basicFunctions);
  if (Number.isFinite(numeric)) return [normalizeLuaJsNumericValue(numeric)];
  const newMatMatch = /^NewMat\((\d+),\s*(\d+)\)$/i.exec(source);
  if (newMatMatch) {
    return [createLuaJsMatrix(Number(newMatMatch[1]), Number(newMatMatch[2]), global)];
  }
  if (/newMat\([^)]*\)=:kar/i.test(source) || /:kar/i.test(source)) {
    const vars = luaJsTableToArray(global.G?.str?.v).map(String);
    const equation = String(global.G?.str?.eql ?? store.eql ?? "");
    const matrix = createLuaJsKarnaughMatrix(vars, equation, global);
    global.G.str.kar = matrix;
    store.kar = matrix;
    return [matrix];
  }
  return [null];
}

function evaluateTiEquationForVariable(equation, target, store, basicFunctions) {
  const parts = splitTopLevel(String(equation), "=");
  if (parts.length === 2) {
    const left = parts[0].trim();
    const right = parts[1].trim();
    if (left === target) return evaluateTiMathExpression(right, store, basicFunctions);
    if (right === target) return evaluateTiMathExpression(left, store, basicFunctions);
    return solveTiEquation(left, right, target, store, basicFunctions);
  }
  return evaluateTiMathExpression(equation, store, basicFunctions);
}

function normalizeLuaJsNumericValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? roundForLuaPreview(value) : 0;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[−–]/g, "-"));
    return Number.isFinite(numeric) ? roundForLuaPreview(numeric) : value;
  }
  return value;
}

function roundForLuaPreview(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1e12) / 1e12;
}

function solveTiEquation(left, right, target, store, basicFunctions) {
  const fn = (value) => {
    const scope = { ...store, [target]: value };
    return evaluateTiMathExpression(left, scope, basicFunctions) - evaluateTiMathExpression(right, scope, basicFunctions);
  };
  const candidates = [0, 1, -1, 0.1, -0.1, 0.5, -0.5, 2, -2, 5, -5, 10, -10, 100, -100, 1000, -1000, 1e6, -1e6];
  let bestX = Number(store[target]);
  let bestY = Number.isFinite(bestX) ? Math.abs(fn(bestX)) : Infinity;
  for (const x of candidates) {
    const y = fn(x);
    if (Number.isFinite(y) && Math.abs(y) < bestY) {
      bestX = x;
      bestY = Math.abs(y);
    }
    if (bestY < 1e-9) return bestX;
  }
  const ranges = [[-1e6, 1e6], [-1000, 1000], [-100, 100], [-10, 10], [0, 1], [0, 10], [0, 1000]];
  for (const [min, max] of ranges) {
    const root = bisectTiRoot(fn, min, max, 240);
    if (Number.isFinite(root)) return root;
  }
  return Number.isFinite(bestX) ? bestX : 0;
}

function bisectTiRoot(fn, min, max, samples) {
  let previousX = min;
  let previousY = fn(previousX);
  for (let index = 1; index <= samples; index += 1) {
    const x = min + ((max - min) * index) / samples;
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    if (Math.abs(y) < 1e-9) return x;
    if (Number.isFinite(previousY) && previousY * y < 0) {
      let low = previousX;
      let high = x;
      let fLow = previousY;
      for (let step = 0; step < 80; step += 1) {
        const mid = (low + high) / 2;
        const fMid = fn(mid);
        if (!Number.isFinite(fMid)) break;
        if (Math.abs(fMid) < 1e-9) return mid;
        if (fLow * fMid <= 0) {
          high = mid;
        } else {
          low = mid;
          fLow = fMid;
        }
      }
      return (low + high) / 2;
    }
    previousX = x;
    previousY = y;
  }
  return NaN;
}

function evaluateTiBasicFunction(definition, args, store, basicFunctions) {
  const params = String(definition.params || "").split(",").map((item) => item.trim()).filter(Boolean);
  const scope = { ...store };
  params.forEach((name, index) => {
    scope[name] = Number(args[index]) || 0;
  });
  const body = String(definition.body || "")
    .replace(/^Func:?\s*/i, "")
    .replace(/:?\s*EndFunc\s*$/i, "");
  let lastValue = 0;
  for (const raw of body.split(":")) {
    const statement = raw.trim();
    if (!statement || /^Local\b/i.test(statement) || /^Return\b/i.test(statement)) continue;
    const colonAssign = /^([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*(.+)$/.exec(statement);
    const arrowAssign = /^(.+?)(?:->|\u2192)\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(statement);
    if (colonAssign || arrowAssign) {
      const dest = colonAssign ? colonAssign[1].trim() : arrowAssign[2].trim();
      const expr = colonAssign ? colonAssign[2].trim() : arrowAssign[1].trim();
      scope[dest] = evaluateTiMathExpression(expr, scope, basicFunctions);
      continue;
    }
    lastValue = evaluateTiMathExpression(statement, scope, basicFunctions);
  }
  return lastValue;
}

function evaluateTiMathExpression(expression, scope = {}, basicFunctions = {}) {
  let expr = String(expression || "")
    .replace(/∞/g, "Infinity")
    .replace(/[−–]/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(//g, "e")
    .replace(/\^/g, "**");

  const unicodeScopeKeys = Object.keys(scope)
    .filter((name) => name && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    .sort((a, b) => b.length - a.length);
  for (const name of unicodeScopeKeys) {
    if (name === "π") continue;
    expr = expr.replace(new RegExp(escapeRegExp(name), "gu"), () => String(Number(scope[name]) || 0));
  }

  expr = expr.replace(/π/g, "PI").replace(/\bpi\b/gi, "PI");
  expr = normalizeTiChainedComparisons(expr);
  expr = expr.replace(/\b(normCdf|binomCdf|binomcdf|invNorm|nCr|ncr|exp|ln|sqrt|sin|cos|tan|abs)\s*\(/gi, (match, name) => `${name.toLowerCase()}(`);
  expr = expr.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
  expr = expr.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => {
    const lower = name.toLowerCase();
    if (["Infinity", "PI", "normcdf", "binomcdf", "invnorm", "ncr", "exp", "ln", "sqrt", "sin", "cos", "tan", "abs", "when"].includes(name) || ["infinity", "pi"].includes(lower)) return name;
    if (Object.prototype.hasOwnProperty.call(basicFunctions, name)) return name;
    if (Object.prototype.hasOwnProperty.call(scope, name)) return String(Number(scope[name]) || 0);
    return "0";
  });
  try {
    const customNames = Object.keys(basicFunctions).filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
    const customFns = customNames.map((name) => (...args) => evaluateTiBasicFunction(basicFunctions[name], args, scope, basicFunctions));
    const fn = Function("normcdf", "binomcdf", "invnorm", "ncr", "exp", "ln", "sqrt", "sin", "cos", "tan", "abs", "PI", "when", ...customNames, `"use strict"; return (${expr});`);
    const value = Number(fn(normalCdf, binomCdf, invNorm, nCr, Math.exp, Math.log, Math.sqrt, Math.sin, Math.cos, Math.tan, Math.abs, Math.PI, (cond, a, b) => (cond ? a : b), ...customFns));
    return Number.isNaN(value) ? 0 : value;
  } catch (_error) {
    return 0;
  }
}

function normalizeTiChainedComparisons(expr) {
  return expr.replace(/([A-Za-z0-9_.+\-*/()]+)\s*(<=|>=|<|>)\s*([A-Za-z0-9_.+\-*/()]+)\s*(<=|>=|<|>)\s*([A-Za-z0-9_.+\-*/()]+)/g, "($1 $2 $3 && $3 $4 $5)");
}

function splitTopLevel(text, delimiter) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === delimiter && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function normalCdf(a, b, mean = 0, sd = 1) {
  return 0.5 * (1 + erf((b - mean) / (sd * Math.SQRT2))) - 0.5 * (1 + erf((a - mean) / (sd * Math.SQRT2)));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const value = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * value);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-value * value);
  return sign * y;
}

function invNorm(p, mean = 0, sd = 1) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let low = -10;
  let high = 10;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const cdf = 0.5 * (1 + erf(mid / Math.SQRT2));
    if (cdf < p) low = mid;
    else high = mid;
  }
  return mean + sd * ((low + high) / 2);
}

function nCr(n, r) {
  n = Math.round(n);
  r = Math.round(r);
  if (r < 0 || n < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= r; i += 1) result = (result * (n - r + i)) / i;
  return result;
}

function binomCdf(n, p, low, high) {
  let sum = 0;
  for (let k = Math.max(0, Math.round(low)); k <= Math.min(n, Math.round(high)); k += 1) {
    sum += nCr(n, k) * p ** k * (1 - p) ** (n - k);
  }
  return sum;
}

function createLuaJsMatrix(rows, cols, global, fill = 0) {
  const data = [];
  for (let row = 0; row < rows; row += 1) {
    const line = [];
    for (let col = 0; col < cols; col += 1) line.push(fill);
    data.push(global.lua_newtable(line));
  }
  return global.lua_newtable(data);
}

function createLuaJsKarnaughMatrix(vars, equation, global) {
  const count = Math.max(1, Math.min(6, vars.length || 3));
  const rowBits = Math.floor(count / 2);
  const colBits = count - rowBits;
  const rows = 2 ** rowBits;
  const cols = 2 ** colBits;
  const gray = ["", "0", "00", "000001011010", "000001011010110111101100"][Math.max(rowBits, colBits)] || "000001011010110111101100";
  const rowCodes = createLuaJsGrayCodes(rowBits, gray);
  const colCodes = createLuaJsGrayCodes(colBits, gray);
  const data = [];
  for (let row = 0; row < rows; row += 1) {
    const line = [];
    for (let col = 0; col < cols; col += 1) {
      const env = {};
      const bits = `${rowCodes[row]}${colCodes[col]}`;
      for (let index = 0; index < count; index += 1) env[vars[index] || String.fromCharCode(97 + index)] = bits[index] === "1";
      line.push(evaluateTiBooleanExpression(equation, env) ? 1 : 0);
    }
    data.push(global.lua_newtable(line));
  }
  return global.lua_newtable(data);
}

function createLuaJsGrayCodes(bits, graySource) {
  if (bits <= 0) return [""];
  const codes = [];
  for (let index = 1; index <= 2 ** bits; index += 1) {
    const start = index * 3 - bits;
    const code = graySource.slice(start, start + bits);
    codes.push(code || (index - 1).toString(2).padStart(bits, "0"));
  }
  return codes;
}

function evaluateTiBooleanExpression(expression, env) {
  const text = String(expression || "")
    .replace(/\s+/g, "")
    .replace(/\/\(/g, "!(")
    .replace(/\*/g, "&&")
    .replace(/\+/g, "||")
    .replace(/\b([A-Za-z]\w*)\b/g, (name) => (env[name] ? "true" : "false"));
  try {
    return Boolean(Function(`"use strict"; return (${text});`)());
  } catch (_error) {
    return false;
  }
}

function luaJsTableToArray(table) {
  if (!table || typeof table !== "object") return [];
  const length = window.lua_len(table);
  const values = [];
  for (let index = 1; index <= length; index += 1) {
    values.push(window.lua_tableget(table, index));
  }
  return values;
}

function attachLuaJsD2Editor(d2EditorTable, nativeEditors) {
  const createEditor = () => {
    const state = {
      text: "",
      cursor: 0,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      visible: true,
      readOnly: false,
      focused: false,
      fontSize: 10,
      filterTable: null,
    };
    const editor = window.lua_newtable();
    nativeEditors.push(state);
    window.lua_tableset(editor, "__nativeState", state);
    window.lua_tableset(editor, "move", (_self, x, y) => {
      state.x = Number(x) || 0;
      state.y = Number(y) || 0;
      return [];
    });
    window.lua_tableset(editor, "resize", (_self, w, h) => {
      state.w = Math.max(1, Number(w) || 1);
      state.h = Math.max(1, Number(h) || 1);
      return [];
    });
    window.lua_tableset(editor, "setText", (_self, text) => {
      state.text = String(text ?? "");
      state.cursor = state.text.length;
      return [];
    });
    window.lua_tableset(editor, "setExpression", (_self, text, cursor, selectionStart) => {
      state.text = String(text ?? "");
      state.cursor = clampLuaJsCursor(state, cursor ?? selectionStart ?? state.text.length);
      return [];
    });
    window.lua_tableset(editor, "getText", () => [state.text]);
    window.lua_tableset(editor, "getExpression", () => [state.text]);
    window.lua_tableset(editor, "getExpressionSelection", () => [state.text, state.cursor, state.cursor]);
    window.lua_tableset(editor, "setExpressionSelection", (_self, start, end) => {
      state.cursor = clampLuaJsCursor(state, end ?? start);
      return [];
    });
    window.lua_tableset(editor, "getSelection", () => [state.cursor, state.cursor]);
    window.lua_tableset(editor, "setSelection", (_self, start, end) => {
      state.cursor = clampLuaJsCursor(state, end ?? start);
      return [];
    });
    window.lua_tableset(editor, "setSelectionRange", (_self, start, end) => {
      state.cursor = clampLuaJsCursor(state, end ?? start);
      return [];
    });
    window.lua_tableset(editor, "setReadOnly", (_self, value) => {
      state.readOnly = Boolean(value);
      return [];
    });
    window.lua_tableset(editor, "setFocus", (_self, value) => {
      state.focused = Boolean(value);
      return [];
    });
    window.lua_tableset(editor, "hasFocus", () => [state.focused]);
    window.lua_tableset(editor, "setVisible", (_self, value) => {
      state.visible = Boolean(value);
      return [];
    });
    window.lua_tableset(editor, "isVisible", () => [state.visible]);
    window.lua_tableset(editor, "setFontSize", (_self, value) => {
      state.fontSize = Number(value) || state.fontSize;
      return [];
    });
    window.lua_tableset(editor, "registerFilter", (_self, filterTable) => {
      state.filterTable = filterTable || null;
      return [];
    });
    window.lua_tableset(editor, "createMathBox", () => {
      if (!state.text) state.text = "\\0el {}";
      state.cursor = clampLuaJsCursor(state, 6);
      return [];
    });
    for (const name of ["setBorder", "setBorderColor", "setColorable", "setDisable2DinRT", "setMainFont", "setSelectable", "setSizeChangeListener", "setTextChangeListener", "setTextColor", "setWordWrapWidth"]) {
      window.lua_tableset(editor, name, () => []);
    }
    return editor;
  };
  window.lua_tableset(d2EditorTable, "newRichText", () => [createEditor()]);
  window.lua_tableset(d2EditorTable, "createMathBox", () => [createEditor()]);
  window.lua_tableset(d2EditorTable, "createChemBox", () => [createEditor()]);
}

function clampLuaJsCursor(state, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(state?.text || "").length;
  return Math.max(0, Math.min(String(state?.text || "").length, Math.trunc(numeric)));
}

function normalizeTiRichText(text) {
  return text
    .replace(/\\0el\s*\{\s*/g, "")
    .replace(/\}/g, "")
    .replace(//g, "e");
}

function drawLuaJsNativeEditors(ctx, nativeEditors, screenText = null) {
  for (const state of nativeEditors) {
    if (!state.visible) continue;
    const x = Math.max(0, Number(state.x) || 0);
    const y = Math.max(0, Number(state.y) || 0);
    const w = Math.max(1, Number(state.w) || 1);
    const h = Math.max(1, Number(state.h) || 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.fillStyle = "#000000";
    ctx.font = `${Math.max(9, Number(state.fontSize) || 10)}px sans-serif`;
    const lines = wrapLuaJsEditorText(ctx, normalizeTiRichText(state.text), Math.max(20, w - 8));
    const lineHeight = Math.max(12, (Number(state.fontSize) || 10) + 3);
    for (let index = 0; index < lines.length; index += 1) {
      const baseline = y + 4 + (index + 1) * lineHeight;
      if (baseline > y + h) break;
      recordLuaPreviewText(screenText, lines[index], x + 4, baseline, lineHeight);
      ctx.fillText(lines[index], x + 4, baseline);
    }
    ctx.restore();
  }
}

function wrapLuaJsEditorText(ctx, text, width) {
  const output = [];
  for (const line of String(text || "").split("\n")) {
    if (!line) {
      output.push("");
      continue;
    }
    let current = "";
    for (const word of line.split(/(\s+)/)) {
      const next = current + word;
      if (current && ctx.measureText(next).width > width) {
        output.push(current.trimEnd());
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    output.push(current);
  }
  return output;
}

function createLuaJsImageObject(resource, global = window) {
  const table = global.lua_newtable();
  table.__tnsImage = resource;
  global.lua_tableset(table, "width", (self) => [Number((self?.__tnsImage || resource)?.width) || 0]);
  global.lua_tableset(table, "height", (self) => [Number((self?.__tnsImage || resource)?.height) || 0]);
  return table;
}

function scaleLuaJsImageResource(resource, width, height) {
  const source = resource?.canvas;
  if (!source) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(Number(width) || source.width || 1));
  canvas.height = Math.max(1, Math.round(Number(height) || source.height || 1));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return {
    ...resource,
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}

function attachLuaJsImageApi(imageTable, resources = [], global = window) {
  const safeResources = Array.isArray(resources) ? resources.filter((resource) => resource?.canvas) : [];
  const resourceRoot = global.lua_newtable();
  const groups = new Map();
  const ensureGroup = (name) => {
    const groupName = String(name || "IMG");
    if (!groups.has(groupName)) {
      const table = global.lua_newtable();
      groups.set(groupName, table);
      global.lua_tableset(resourceRoot, groupName, table);
    }
    return groups.get(groupName);
  };
  const setResourceToken = (resource, groupName, tokenName) => {
    const resolvedVarName = String(tokenName || resource.var || "img");
    if (!resolvedVarName) return;
    const token = global.lua_newtable();
    token.__tnsImage = resource;
    token.__tnsResourceName = resource.name || resolvedVarName;
    global.lua_tableset(ensureGroup(groupName || resource.group || "IMG"), resolvedVarName, token);
  };
  const basename = (value = "") => String(value || "").split(/[\\/]/).pop();
  for (const resource of safeResources) {
    setResourceToken(resource, resource.group || "IMG", resource.var || "img");
    const baseName = basename(resource.name || resource.path || "");
    if (baseName) {
      setResourceToken(resource, resource.group || "IMG", baseName);
      setResourceToken(resource, "IMG", baseName);
    }
  }
  if (safeResources.length === 1) {
    setResourceToken({ ...safeResources[0], var: "img", group: "IMG" }, "IMG", "img");
  }
  global.G.str._R = resourceRoot;
  global.lua_tableset(imageTable, "new", (source) => {
    if (source?.__tnsImage) return [createLuaJsImageObject(source.__tnsImage, global)];
    const sourceName = String(source || "");
    const sourceLower = sourceName.toLowerCase();
    const resource = safeResources.find((item) => (
      item.name === sourceName
      || item.var === sourceName
      || basename(item.name || item.path || "") === sourceName
      || String(item.name || "").toLowerCase() === sourceLower
      || String(item.var || "").toLowerCase() === sourceLower
      || basename(item.name || item.path || "").toLowerCase() === sourceLower
    ));
    return [resource ? createLuaJsImageObject(resource, global) : null];
  });
  global.lua_tableset(imageTable, "copy", (source, width, height) => {
    const resource = source?.__tnsImage;
    const scaled = scaleLuaJsImageResource(resource, width, height);
    return [scaled ? createLuaJsImageObject(scaled, global) : null];
  });
}

function attachLuaJsGc(gcTable, ctx, canvas, screenText = null) {
  let fontSize = 12;
  const clipStack = [];
  const setColor = (r, g = r, b = r) => {
    ctx.fillStyle = `rgb(${Number(r) || 0}, ${Number(g) || 0}, ${Number(b) || 0})`;
    ctx.strokeStyle = ctx.fillStyle;
  };
  const resetClip = () => {
    while (clipStack.length) {
      ctx.restore();
      clipStack.pop();
    }
  };
  window.lua_tableset(gcTable, "setColorRGB", (_self, r, g, b) => {
    setColor(r, g, b);
    return [];
  });
  window.lua_tableset(gcTable, "setFont", (_self, _family, style, size) => {
    fontSize = Number(size || fontSize) || fontSize;
    const weight = String(style || "").includes("b") ? "bold " : "";
    const italic = String(style || "").includes("i") ? "italic " : "";
    ctx.font = `${italic}${weight}${fontSize}px sans-serif`;
    return [];
  });
  window.lua_tableset(gcTable, "setPen", (_self, thickness) => {
    ctx.lineWidth = thickness === "thick" ? 8 : thickness === "medium" ? 3 : Number(thickness) || 1;
    return [];
  });
  window.lua_tableset(gcTable, "drawString", (_self, text, x, y, pos) => {
    const offset = { top: fontSize * 0.85, middle: fontSize * 0.35, bottom: 0, baseline: 0 }[String(pos || "bottom")] ?? 0;
    const px = Number(x) || 0;
    const py = (Number(y) || 0) + offset;
    const visibleText = String(text ?? "");
    recordLuaPreviewText(screenText, visibleText, px, py, Math.max(10, fontSize + 2));
    ctx.fillText(visibleText, px, py);
    return [];
  });
  window.lua_tableset(gcTable, "drawLine", (_self, x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(Number(x1) || 0, Number(y1) || 0);
    ctx.lineTo(Number(x2) || 0, Number(y2) || 0);
    ctx.stroke();
    return [];
  });
  window.lua_tableset(gcTable, "drawRect", (_self, x, y, w, h) => {
    ctx.strokeRect(Number(x) || 0, Number(y) || 0, Number(w) || 0, Number(h) || 0);
    return [];
  });
  window.lua_tableset(gcTable, "fillRect", (_self, x, y, w, h) => {
    const px = Number(x) || 0;
    const py = Number(y) || 0;
    const pw = Number(w) || 0;
    const ph = Number(h) || 0;
    eraseCoveredLuaPreviewText(screenText, px, py, pw, ph);
    ctx.fillRect(px, py, pw, ph);
    return [];
  });
  window.lua_tableset(gcTable, "drawPolyLine", (_self, points) => drawLuaJsPolyline(points, false));
  window.lua_tableset(gcTable, "drawPolygon", (_self, points) => drawLuaJsPolyline(points, false));
  window.lua_tableset(gcTable, "fillPolygon", (_self, points) => drawLuaJsPolygon(points, true));
  window.lua_tableset(gcTable, "drawArc", (_self, x, y, w, h, startAngle, angle) => {
    drawLuaJsArc(ctx, x, y, w, h, startAngle, angle, false);
    return [];
  });
  window.lua_tableset(gcTable, "fillArc", (_self, x, y, w, h, startAngle, angle) => {
    drawLuaJsArc(ctx, x, y, w, h, startAngle, angle, true);
    return [];
  });
  window.lua_tableset(gcTable, "getStringWidth", (_self, text) => [ctx.measureText(String(text ?? "")).width]);
  window.lua_tableset(gcTable, "getStringHeight", () => [fontSize]);
  window.lua_tableset(gcTable, "clipRect", (_self, mode, x, y, w, h) => {
    const action = String(mode || "").toLowerCase();
    if (action === "reset") {
      resetClip();
      return [];
    }
    if (action === "restore") {
      if (clipStack.length) {
        ctx.restore();
        clipStack.pop();
      }
      return [];
    }
    if (action === "set" || action === "subset") {
      const px = Number(x) || 0;
      const py = Number(y) || 0;
      const pw = Number(w) || 0;
      const ph = Number(h) || 0;
      if (pw > 0 && ph > 0) {
        ctx.save();
        clipStack.push(true);
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();
      }
    }
    return [];
  });
  window.lua_tableset(gcTable, "drawImage", (_self, image, x, y, w, h) => {
    const resource = image?.__tnsImage;
    if (resource?.canvas) {
      const px = Number(x) || 0;
      const py = Number(y) || 0;
      const dw = Number(w);
      const dh = Number(h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (Number.isFinite(dw) && Number.isFinite(dh) && dw > 0 && dh > 0) {
        ctx.drawImage(resource.canvas, px, py, dw, dh);
      } else {
        ctx.drawImage(resource.canvas, px, py);
      }
    }
    return [];
  });
  window.lua_tableset(gcTable, "begin", () => []);
  window.lua_tableset(gcTable, "finish", () => []);
}

function drawLuaJsArc(ctx, x, y, w, h, startAngle, angle, fill) {
  const width = Math.abs(Number(w) || 0);
  const height = Math.abs(Number(h) || 0);
  if (!width || !height) return;
  const left = Number(x) || 0;
  const top = Number(y) || 0;
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = left + radiusX;
  const centerY = top + radiusY;
  const start = (Number(startAngle) || 0) + 90;
  const sweep = Number(angle) || 360;
  const steps = Math.max(10, Math.round(Math.max(width + height, 20) / 2));
  ctx.save();
  ctx.beginPath();
  if (fill) ctx.moveTo(centerX, centerY);
  for (let step = 0; step <= steps; step += 1) {
    const current = ((start + sweep * (step / steps)) * Math.PI) / 180;
    const pointX = Math.sin(current) * radiusX + centerX;
    const pointY = Math.cos(current) * radiusY + centerY;
    if (!fill && step === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  if (fill) {
    ctx.lineTo(centerX, centerY);
    ctx.fill();
  }
  else ctx.stroke();
  ctx.restore();
}

function drawLuaJsPolygon(points, fill = false) {
  return drawLuaJsPolyline(points, fill);
}

function drawLuaJsPolyline(points, fill = false) {
  const length = window.lua_len(points);
  if (length < 4) return [];
  const ctx = window.context;
  ctx.beginPath();
  ctx.moveTo(Number(window.lua_tableget(points, 1)) || 0, Number(window.lua_tableget(points, 2)) || 0);
  for (let index = 3; index <= length; index += 2) {
    ctx.lineTo(Number(window.lua_tableget(points, index)) || 0, Number(window.lua_tableget(points, index + 1)) || 0);
  }
  if (fill) ctx.fill();
  else ctx.stroke();
  return [];
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createLuaPreviewRuntime(code, ctx, canvas, logEl) {
  const functions = extractLuaFunctions(code);
  const env = parseLuaPreviewGlobals(code);
  env.__canvasWidth = canvas.width;
  env.__canvasHeight = canvas.height;
  const state = { rendered: 0, invalidated: false, timerActive: false, fontSize: 12, fontStyle: "r", lineWidth: 1, screenText: [] };
  let timerId = null;

  function log(message) {
    logEl.textContent += `${logEl.textContent ? "\n" : ""}${message}`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function resetCanvas() {
    ctx.restore?.();
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = state.lineWidth;
    ctx.font = `${state.fontSize}px sans-serif`;
    state.rendered = 0;
    state.screenText.length = 0;
  }

  function boot() {
    resetCanvas();
    callEvent("on.create", false);
    repaint();
    if (state.timerActive && functions["on.timer"]) {
      timerId = window.setInterval(() => callEvent("on.timer", false), 250);
    }
    const names = Object.keys(functions).filter((name) => name.startsWith("on.")).sort();
    log(names.length ? `Preview PCspire-lite: eventos detectados: ${names.join(", ")}` : "Preview PCspire-lite: no se detectaron eventos on.*.");
  }

  function repaint(shouldLog = true) {
    resetCanvas();
    executeFunction("on.paint");
    if (shouldLog) log(state.rendered ? `Preview: ${state.rendered} llamadas graficas renderizadas.` : "Preview limitado: on.paint no genero llamadas graficas compatibles.");
    state.invalidated = false;
  }

  function callEvent(name, shouldLog = true) {
    let handled = false;
    if (functions[name]) {
      executeFunction(name);
      handled = true;
    } else if (name.startsWith("on.arrow") && functions["on.arrowKey"]) {
      executeFunction("on.arrowKey", [name.replace("on.arrow", "").toLowerCase()]);
      handled = true;
    }
    if (state.invalidated || handled) repaint(shouldLog);
    if (shouldLog) log(handled ? `Evento ejecutado: ${name}` : `Evento no encontrado: ${name}`);
  }

  function executeFunction(name) {
    if (functions[name]) executeLuaPreviewLines(functions[name], env, ctx, canvas, state);
  }

  function close() {
    if (timerId) window.clearInterval(timerId);
  }

  function getScreenText() {
    return formatLuaPreviewScreenText(state.screenText);
  }

  return { boot, callEvent, close, getScreenText };
}

function luaPreviewValue(value) {
  const text = String(value || "").trim();
  const quoted = /^["']([\s\S]*)["']$/.exec(text);
  if (quoted) return quoted[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
  const number = Number(text);
  return Number.isFinite(number) ? number : text;
}

function extractLuaFunctions(code) {
  const functions = {};
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^\s*function\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\([^)]*\)/.exec(stripLuaLineComment(lines[i]));
    if (!match) continue;
    let depth = 1;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const clean = stripLuaLineComment(lines[j]);
      const trimmed = clean.trim();
      if (/^(?:local\s+)?function\b/.test(trimmed) || (!/^elseif\b/.test(trimmed) && /\bthen\s*$/.test(trimmed)) || /\bdo\s*$/.test(trimmed) || /^repeat\b/.test(trimmed)) depth += 1;
      if (/^\s*(end|until\b)/.test(clean)) depth -= 1;
      if (depth === 0) {
        functions[match[1]] = body.join("\n");
        i = j;
        break;
      }
      body.push(lines[j]);
    }
  }
  return functions;
}

function parseLuaPreviewGlobals(code) {
  const env = {};
  for (const rawLine of code.split("\n")) {
    const line = stripLuaLineComment(rawLine).trim();
    if (/^function\b/.test(line)) break;
    const assignment = /^(?:local\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+)$/.exec(line);
    if (assignment) env[assignment[1]] = evaluateLuaPreviewExpression(assignment[2], env);
  }
  return env;
}

function stripLuaLineComment(line) {
  let quote = "";
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "-" && line[i + 1] === "-") return line.slice(0, i);
  }
  return line;
}

function executeLuaPreviewLines(body, env, ctx, canvas, state) {
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripLuaLineComment(lines[index]).trim();
    if (!line || /^(end|else|elseif\b)/.test(line)) continue;

    const inlineIf = /^if\s+(.+?)\s+then\s+(.+)$/.exec(line);
    if (inlineIf) {
      if (evaluateLuaPreviewCondition(inlineIf[1], env)) executeLuaPreviewLines(inlineIf[2], env, ctx, canvas, state);
      continue;
    }

    const blockIf = /^if\s+(.+?)\s+then\s*$/.exec(line);
    if (blockIf) {
      const nested = collectLuaPreviewBlock(lines, index);
      if (evaluateLuaPreviewCondition(blockIf[1], env)) executeLuaPreviewLines(nested.body, env, ctx, canvas, state);
      else if (nested.elseBody) executeLuaPreviewLines(nested.elseBody, env, ctx, canvas, state);
      index = nested.endIndex;
      continue;
    }

    const plusAssign = /^([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*\1\s*([+-])\s*(.+)$/.exec(line);
    if (plusAssign) {
      const current = Number(env[plusAssign[1]] || 0);
      const delta = Number(evaluateLuaPreviewExpression(plusAssign[3], env) || 0);
      env[plusAssign[1]] = plusAssign[2] === "+" ? current + delta : current - delta;
      continue;
    }

    const assignment = /^(?:local\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+)$/.exec(line);
    if (assignment && !/\bfunction\s*\(/.test(assignment[2])) {
      env[assignment[1]] = evaluateLuaPreviewExpression(assignment[2], env);
      continue;
    }

    if (/^platform\.window(?::|\.)invalidate\s*\(/.test(line)) {
      state.invalidated = true;
      continue;
    }

    const call = /^(gc|platform\.window|platform|timer|var)(?::|\.)([A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*$/.exec(line);
    if (call) executeLuaPreviewCall(call[1], call[2], call[3], env, ctx, canvas, state);
  }
}

function collectLuaPreviewBlock(lines, startIndex) {
  let depth = 1;
  const body = [];
  const elseBody = [];
  let target = body;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const clean = stripLuaLineComment(lines[i]);
    if (depth === 1 && /^\s*(else|elseif)\b/.test(clean)) {
      target = elseBody;
      continue;
    }
    if (/^\s*(?:local\s+)?function\b/.test(clean) || /\bthen\s*$/.test(clean) || /\bdo\s*$/.test(clean) || /^\s*repeat\b/.test(clean)) depth += 1;
    if (/^\s*(end|until\b)/.test(clean)) depth -= 1;
    if (depth === 0) return { body: body.join("\n"), elseBody: elseBody.join("\n"), endIndex: i };
    target.push(lines[i]);
  }
  return { body: body.join("\n"), elseBody: elseBody.join("\n"), endIndex: lines.length - 1 };
}

function evaluateLuaPreviewCondition(text, env) {
  const expr = text.trim();
  const orParts = splitLuaBoolean(expr, "or");
  if (orParts.length > 1) return orParts.some((part) => evaluateLuaPreviewCondition(part, env));
  const andParts = splitLuaBoolean(expr, "and");
  if (andParts.length > 1) return andParts.every((part) => evaluateLuaPreviewCondition(part, env));
  const match = /^(.+?)\s*(==|~=|<=|>=|<|>)\s*(.+)$/.exec(expr);
  if (!match) return Boolean(evaluateLuaPreviewExpression(text, env));
  const left = evaluateLuaPreviewExpression(match[1], env);
  const right = evaluateLuaPreviewExpression(match[3], env);
  if (match[2] === "==") return left === right;
  if (match[2] === "~=") return left !== right;
  if (match[2] === "<=") return Number(left) <= Number(right);
  if (match[2] === ">=") return Number(left) >= Number(right);
  if (match[2] === "<") return Number(left) < Number(right);
  if (match[2] === ">") return Number(left) > Number(right);
  return false;
}

function splitLuaBoolean(text, operator) {
  const result = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  const pattern = new RegExp(`\\b${operator}\\b`, "g");
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote && text[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    if (depth === 0) {
      pattern.lastIndex = i;
      const match = pattern.exec(text);
      if (match && match.index === i) {
        result.push(text.slice(start, i).trim());
        start = i + match[0].length;
        i = start - 1;
      }
    }
  }
  if (result.length) result.push(text.slice(start).trim());
  return result;
}

function evaluateLuaPreviewExpression(text, env) {
  let value = String(text || "").trim();
  if (value === "nil") return null;
  value = value
    .replace(/platform\.window(?::|\.)width\(\)/g, String(env.__canvasWidth || 320))
    .replace(/platform\.window(?::|\.)height\(\)/g, String(env.__canvasHeight || 240))
    .replace(/gc(?::|\.)getStringWidth\(([^()]+)\)/g, (_, arg) => {
      const resolved = evaluateLuaPreviewExpression(arg, env);
      return String(String(resolved ?? "").length * 7);
    })
    .replace(/gc(?::|\.)getStringHeight\(([^()]+)\)/g, "12")
    .replace(/math\.floor\(([^()]+)\)/g, (_, arg) => String(Math.floor(Number(evaluateLuaPreviewExpression(arg, env)) || 0)));
  const concatParts = splitLuaConcat(value);
  if (concatParts.length > 1) return concatParts.map((part) => evaluateLuaPreviewExpression(part, env) ?? "").join("");
  const mathEval = /^math\.eval\((.*)\)$/.exec(value);
  if (mathEval) return String(evaluateLuaPreviewExpression(mathEval[1], env)).includes("true");
  const uchar = /^string\.uchar\((.*)\)$/.exec(value);
  if (uchar) return String.fromCharCode(Number(evaluateLuaPreviewExpression(uchar[1], env)) || 0);
  const sub = /^string\.sub\((.*)\)$/.exec(value);
  if (sub) {
    const args = splitLuaArgs(sub[1]).args.map((arg) => evaluateLuaPreviewExpression(arg, env));
    const source = String(args[0] ?? "");
    const start = Math.max(0, (Number(args[1]) || 1) - 1);
    const end = args[2] === undefined ? source.length : Math.max(0, Number(args[2]) || 0);
    return source.slice(start, end);
  }
  const lower = /^string\.lower\((.*)\)$/.exec(value);
  if (lower) return String(evaluateLuaPreviewExpression(lower[1], env) ?? "").toLowerCase();
  const length = /^string\.len\((.*)\)$/.exec(value);
  if (length) return String(evaluateLuaPreviewExpression(length[1], env) ?? "").length;
  const recall = /^var\.recall\((.*)\)$/.exec(value);
  if (recall) {
    const key = String(evaluateLuaPreviewExpression(recall[1], env) ?? "");
    return env.__varStore?.[key] ?? null;
  }
  const width = /^gc:getStringWidth\((.*)\)$/.exec(value) || /^gc\.getStringWidth\((.*)\)$/.exec(value);
  if (width) return String(evaluateLuaPreviewExpression(width[1], env) ?? "").length * 7;
  const height = /^gc:getStringHeight\((.*)\)$/.exec(value) || /^gc\.getStringHeight\((.*)\)$/.exec(value);
  if (height) return 12;
  const literal = luaPreviewValue(value);
  if (literal !== value || Number.isFinite(literal)) return literal;
  if (value === "true") return true;
  if (value === "false") return false;
  if (Object.prototype.hasOwnProperty.call(env, value)) return env[value];
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(value)) return null;
  const mathSafe = value.replace(/\b([A-Za-z_][A-Za-z0-9_.]*)\b/g, (name) => {
    if (Object.prototype.hasOwnProperty.call(env, name) && Number.isFinite(Number(env[name]))) return String(env[name]);
    return name;
  });
  if (/^[0-9+\-*/().\s]+$/.test(mathSafe)) {
    try {
      return Function(`"use strict"; return (${mathSafe});`)();
    } catch {
      return value;
    }
  }
  return value;
}

function splitLuaConcat(text) {
  const parts = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length - 1; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote && text[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    else if (char === "." && text[i + 1] === "." && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 2;
      i += 1;
    }
  }
  if (parts.length) parts.push(text.slice(start).trim());
  return parts;
}

function executeLuaPreviewCall(root, method, rawArgs, env, ctx, canvas, state) {
  const args = splitLuaArgs(rawArgs).args.map((arg) => evaluateLuaPreviewExpression(arg, env));
  if (root === "timer") {
    if (method === "start") state.timerActive = true;
    if (method === "stop") state.timerActive = false;
    return;
  }
  if (root === "var") {
    if (!env.__varStore) env.__varStore = {};
    if (method === "store") env.__varStore[String(args[0])] = args[1];
    return;
  }
  if (root !== "gc") return;
  if (method === "setColorRGB") {
    const [r, g = r, b = r] = args.map(Number);
    ctx.fillStyle = ctx.strokeStyle = `rgb(${r || 0}, ${g || 0}, ${b || 0})`;
    state.rendered += 1;
  } else if (method === "setFont") {
    const size = Number(args[2] || args[1] || state.fontSize || 12) || 12;
    const style = String(args[1] || "");
    const weight = style.includes("b") ? "bold " : "";
    const italic = style.includes("i") ? "italic " : "";
    state.fontSize = size;
    state.fontStyle = style;
    ctx.font = `${italic}${weight}${size}px sans-serif`;
    state.rendered += 1;
  } else if (method === "setPen") {
    const thickness = args[0];
    state.lineWidth = thickness === "thick" ? 8 : thickness === "medium" ? 3 : Number(thickness) || 1;
    ctx.lineWidth = state.lineWidth;
    state.rendered += 1;
  } else if (method === "fillRect") {
    const x = Number(args[0]) || 0;
    const y = Number(args[1]) || 0;
    const w = Number(args[2]) || 0;
    const h = Number(args[3]) || 0;
    eraseCoveredLuaPreviewText(state.screenText, x, y, w, h);
    ctx.fillRect(x, y, w, h);
    state.rendered += 1;
  } else if (method === "drawRect") {
    ctx.strokeRect((Number(args[0]) || 0) + 1, (Number(args[1]) || 0) + 1, Number(args[2]) || 0, Number(args[3]) || 0);
    state.rendered += 1;
  } else if (method === "drawLine") {
    ctx.beginPath();
    ctx.moveTo(Number(args[0]) || 0, Number(args[1]) || 0);
    ctx.lineTo(Number(args[2]) || 0, Number(args[3]) || 0);
    ctx.stroke();
    state.rendered += 1;
  } else if (method === "drawString") {
    const offset = { top: 0, middle: -state.fontSize / 2, bottom: -state.fontSize, baseline: -state.fontSize + 4 }[String(args[3] || "bottom")] ?? 0;
    const x = Number(args[1]) || 0;
    const y = (Number(args[2]) || 0) + offset;
    const text = String(args[0] ?? "");
    recordLuaPreviewText(state.screenText, text, x, y, Math.max(10, state.fontSize + 2));
    ctx.fillText(text, x, y);
    state.rendered += 1;
  } else if (method === "clipRect") {
    const op = String(args[0] || "set");
    if (op === "reset") {
      ctx.restore();
      ctx.save();
    } else if (op === "set") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(Number(args[1]) || 0, Number(args[2]) || 0, Number(args[3]) || canvas.width, Number(args[4]) || canvas.height);
      ctx.clip();
    }
    state.rendered += 1;
  } else if (method === "drawPolyLine" || method === "drawPolygon" || method === "fillPolygon") {
    const points = args.map(Number).filter((value) => Number.isFinite(value));
    if (points.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      if (method === "fillPolygon") ctx.fill();
      else ctx.stroke();
      state.rendered += 1;
    }
  } else if (method === "fillArc" || method === "drawArc") {
    const x = Number(args[0]) || 0;
    const y = Number(args[1]) || 0;
    const w = Number(args[2]) || 0;
    const h = Number(args[3]) || 0;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    if (method === "fillArc") ctx.fill();
    else ctx.stroke();
    state.rendered += 1;
  }
}


const spreadsheetPreviewSessions = new Map();

function spreadsheetSessionKey(item) {
  return `${item?.file || ""}::${item?.path || item?.name || "spreadsheet"}`;
}

function spreadsheetColumnName(index) {
  let value = Number(index) + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name || "A";
}

function spreadsheetCellRefToCoords(ref) {
  const match = String(ref || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Math.max(0, Number(match[2]) - 1), col: Math.max(0, col - 1) };
}

function spreadsheetCellDisplay(cell) {
  if (!cell) return "";
  const formula = String(cell.formula ?? "");
  const data = String(cell.data ?? "");
  if (formula.startsWith("=") && data !== "") return data;
  return data !== "" ? data : formula;
}

function spreadsheetCellFormula(cell) {
  if (!cell) return "";
  return String(cell.formula ?? cell.data ?? "");
}

function spreadsheetNumericValue(cell) {
  const raw = spreadsheetCellDisplay(cell).trim();
  if (!raw) return 0;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function evaluateSpreadsheetFormula(formula, cells) {
  const raw = String(formula || "").trim();
  if (!raw.startsWith("=")) return raw;
  let expression = raw.slice(1);
  expression = expression.replace(/\b([A-Za-z]+)(\d+)\b/g, (match) => {
    const coords = spreadsheetCellRefToCoords(match);
    if (!coords) return "0";
    return String(spreadsheetNumericValue(cells[`${coords.row}:${coords.col}`]));
  });
  expression = expression.replace(/\^/g, "**");
  if (!/^[0-9+\-*/().\s*]+$/.test(expression)) return "";
  try {
    const result = Function(`"use strict"; return (${expression});`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return "";
    return String(Number.isInteger(result) ? result : Number(result.toPrecision(12)));
  } catch (_) {
    return "";
  }
}

function recalculateSpreadsheetCells(cells) {
  // A few passes are enough for simple dependency chains such as A3=B2+C2.
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    for (const cell of Object.values(cells || {})) {
      if (!cell || !String(cell.formula || "").trim().startsWith("=")) continue;
      const next = evaluateSpreadsheetFormula(cell.formula, cells);
      if (next !== "" && next !== String(cell.data ?? "")) {
        cell.data = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function extractSpreadsheetStateFromRawXml(rawXml) {
  const result = { cells: {}, rows: 20, cols: 12, sourceName: "" };
  const text = String(rawXml || "").trim();
  if (!text) return result;
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) return result;
    const columns = Array.from(doc.getElementsByTagNameNS("urn:tabulator", "column"))
      .filter((node) => node.getAttribute("type") === "cell-column");
    let maxRow = 0;
    let maxCol = 0;
    columns.forEach((column, col) => {
      const cellsNode = Array.from(column.children).find((node) => node.localName === "cells");
      if (!cellsNode) return;
      for (const cellNode of Array.from(cellsNode.children).filter((node) => node.localName === "cell")) {
        const childText = (name) => Array.from(cellNode.children).find((node) => node.localName === name)?.textContent ?? "";
        const rowId = Number(childText("rowId"));
        if (!Number.isFinite(rowId) || rowId < 1) continue;
        const formula = childText("formula");
        const data = childText("data");
        result.cells[`${rowId - 1}:${col}`] = { formula, data };
        maxRow = Math.max(maxRow, rowId);
        maxCol = Math.max(maxCol, col + 1);
      }
    });
    result.rows = Math.max(20, maxRow);
    result.cols = Math.min(26, Math.max(12, maxCol));
  } catch (_) {
    // Leave an empty sheet when a malformed raw_xml snapshot is received.
  }
  return result;
}

async function parseXlsxFirstSheet(file) {
  if (!window.JSZip) throw new Error("JSZip no está disponible para abrir XLSX.");
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const parseXml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const readXml = async (name) => {
    const entry = zip.file(name);
    if (!entry) return null;
    return parseXml(await entry.async("text"));
  };

  const sharedStrings = [];
  const sharedDoc = await readXml("xl/sharedStrings.xml");
  if (sharedDoc) {
    for (const si of sharedDoc.getElementsByTagNameNS("*", "si")) {
      sharedStrings.push(Array.from(si.getElementsByTagNameNS("*", "t")).map((node) => node.textContent || "").join(""));
    }
  }

  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = await readXml("xl/workbook.xml");
  const rels = await readXml("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const firstSheet = workbook.getElementsByTagNameNS("*", "sheet")[0];
    const relId = firstSheet?.getAttribute("r:id") || firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    if (relId) {
      const rel = Array.from(rels.getElementsByTagNameNS("*", "Relationship")).find((node) => node.getAttribute("Id") === relId);
      const target = rel?.getAttribute("Target") || "";
      if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    }
  }

  const sheet = await readXml(sheetPath);
  if (!sheet) throw new Error("No se encontró la primera hoja dentro del XLSX.");
  const cells = {};
  let maxRow = 0;
  let maxCol = 0;
  for (const cell of sheet.getElementsByTagNameNS("*", "c")) {
    const ref = cell.getAttribute("r") || "";
    const coords = spreadsheetCellRefToCoords(ref);
    if (!coords || coords.col >= 26) continue;
    const type = cell.getAttribute("t") || "n";
    const vNode = cell.getElementsByTagNameNS("*", "v")[0];
    const fNode = cell.getElementsByTagNameNS("*", "f")[0];
    let data = vNode?.textContent ?? "";
    if (type === "s") data = sharedStrings[Number(data)] ?? data;
    else if (type === "inlineStr") data = Array.from(cell.getElementsByTagNameNS("*", "t")).map((node) => node.textContent || "").join("");
    else if (type === "b") data = data === "1" ? "TRUE" : "FALSE";
    const formula = fNode?.textContent ? `=${fNode.textContent}` : data;
    cells[`${coords.row}:${coords.col}`] = { formula, data };
    maxRow = Math.max(maxRow, coords.row);
    maxCol = Math.max(maxCol, coords.col);
  }
  recalculateSpreadsheetCells(cells);
  return { cells, rows: Math.max(20, maxRow + 1), cols: Math.min(26, Math.max(12, maxCol + 1)), sourceName: file.name };
}

async function saveSpreadsheetWidgetToStage(item, state) {
  await ensureXmlStageCopy();
  pyodide.globals.set("wasm_sheet_save_file", item?.file || "");
  pyodide.globals.set("wasm_sheet_save_path", item?.path || "");
  pyodide.globals.set("wasm_sheet_save_cells_json", JSON.stringify(state.cells || {}));

  const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
source_file = Path(wasm_sheet_save_file) if wasm_sheet_save_file else None
xml_file = None
if source_file:
    try:
        rel = source_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = source_file.relative_to(source_root)
        except ValueError:
            rel = Path(source_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for spreadsheet save")

tree = ET.parse(xml_file)
root = tree.getroot()
tb_ns = "urn:tabulator"
ET.register_namespace("tb", tb_ns)

def q(ns, name):
    return f"{{{ns}}}{name}"

def parse_part(part):
    # No usar regex aquí: este Python vive dentro de un template literal JS
    # y las barras invertidas pueden perderse antes de llegar a Pyodide.
    text = str(part or "")
    if text.endswith("]") and "[" in text:
        name, raw_index = text.rsplit("[", 1)
        raw_index = raw_index[:-1]
        if raw_index.isdigit():
            return name, int(raw_index)
    return text, 1

def resolve_path(root, path):
    parts = [part for part in str(path or "").split("/") if part]
    if parts and local_name(root.tag) == parse_part(parts[0])[0]:
        parts = parts[1:]
    current = root
    for part in parts:
        name, wanted = parse_part(part)
        matches = [child for child in current if local_name(child.tag) == name]
        if wanted < 1 or wanted > len(matches):
            return None
        current = matches[wanted - 1]
    return current

wdgt = resolve_path(root, wasm_sheet_save_path)
if wdgt is None or local_name(wdgt.tag) != "wdgt" or wdgt.attrib.get("type") != "tabulator":
    # Fallback: only safe when there is exactly one spreadsheet widget.
    matches = [node for node in root.iter() if local_name(node.tag) == "wdgt" and node.attrib.get("type") == "tabulator"]
    if len(matches) == 1:
        wdgt = matches[0]
    else:
        raise RuntimeError("No se pudo identificar la hoja de cálculo seleccionada")

# Get the tabulator table (not the FunctionTable table).
table = next((child for child in wdgt if child.tag == q(tb_ns, "table")), None)
if table is None:
    raise RuntimeError("La hoja TI no contiene tb:table")
columns_node = next((child for child in table if child.tag == q(tb_ns, "columns")), None)
if columns_node is None:
    columns_node = ET.SubElement(table, q(tb_ns, "columns"))

columns = [child for child in columns_node if child.tag == q(tb_ns, "column") and child.attrib.get("type") == "cell-column"]
while len(columns) < 26:
    column = ET.SubElement(columns_node, q(tb_ns, "column"), {"type": "cell-column"})
    ET.SubElement(column, q(tb_ns, "columnWidthNative")).text = "70"
    ET.SubElement(column, q(tb_ns, "columnWidth")).text = "70"
    ET.SubElement(column, q(tb_ns, "columnFlags")).text = "0"
    ET.SubElement(column, q(tb_ns, "cells"))
    columns.append(column)

# Clear and rebuild only the cell payload. Preserve all other column metadata.
for column in columns:
    cells_node = next((child for child in column if child.tag == q(tb_ns, "cells")), None)
    if cells_node is None:
        cells_node = ET.SubElement(column, q(tb_ns, "cells"))
    for child in list(cells_node):
        cells_node.remove(child)

cells = json.loads(wasm_sheet_save_cells_json or "{}")
by_col = {}
for key, value in cells.items():
    try:
        row_s, col_s = key.split(":", 1)
        row = int(row_s)
        col = int(col_s)
    except Exception:
        continue
    if row < 0 or col < 0 or col >= len(columns):
        continue
    formula = str((value or {}).get("formula", ""))
    data = str((value or {}).get("data", ""))
    if not formula and not data:
        continue
    by_col.setdefault(col, []).append((row, formula, data))

for col, entries in by_col.items():
    column = columns[col]
    cells_node = next(child for child in column if child.tag == q(tb_ns, "cells"))
    for row, formula, data in sorted(entries, key=lambda item: item[0]):
        cell = ET.SubElement(cells_node, q(tb_ns, "cell"))
        ET.SubElement(cell, q(tb_ns, "rowId")).text = str(row + 1)
        ET.SubElement(cell, q(tb_ns, "formula")).text = formula
        ET.SubElement(cell, q(tb_ns, "data")).text = data

body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

json.dumps({
    "file": str(xml_file),
    "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False),
    "saved_cells": sum(len(v) for v in by_col.values()),
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  return JSON.parse(payload);
}

async function addSpreadsheetWidgetToStage() {
  await ensureXmlStageCopy();
  const currentFile = xmlDoctor.current?.file || "";
  pyodide.globals.set("wasm_sheet_current_file", currentFile);
  const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

source_root = Path("${xmlDoctor.sourcePath}")
stage_root = Path("${xmlDoctor.stagePath}")
current_file = Path(wasm_sheet_current_file) if wasm_sheet_current_file else None
xml_file = None
if current_file:
    try:
        rel = current_file.relative_to(stage_root)
    except ValueError:
        try:
            rel = current_file.relative_to(source_root)
        except ValueError:
            rel = Path(current_file.name)
    candidate = stage_root / rel
    if candidate.exists():
        xml_file = candidate
if xml_file is None:
    problem_files = sorted([p for p in stage_root.rglob("*.xml") if p.name.lower().startswith("problem")], key=lambda p: p.name.lower())
    xml_files = problem_files or sorted(stage_root.rglob("*.xml"))
    if xml_files:
        xml_file = xml_files[0]
if xml_file is None:
    raise RuntimeError("No XML file available for spreadsheet widget")

tree = ET.parse(xml_file)
root = tree.getroot()
prob_ns = root.tag[1:].split("}", 1)[0] if root.tag.startswith("{") else ""
tb_ns = "urn:tabulator"
ft_ns = "urn:TI.FunctionTable"
ET.register_namespace("", prob_ns)
ET.register_namespace("tb", tb_ns)

def q(ns, name):
    return f"{{{ns}}}{name}" if ns else name

card = ET.Element(q(prob_ns, "card"), {"clay": "0", "h1": "10000", "h2": "10000", "w1": "10000", "w2": "10000"})
ET.SubElement(card, q(prob_ns, "isDummyCard")).text = "0"
ET.SubElement(card, q(prob_ns, "flag")).text = "0"
wdgt = ET.SubElement(card, q(prob_ns, "wdgt"), {"type": "tabulator", "ver": "1.0"})
ET.SubElement(wdgt, q(tb_ns, "mFlags")).text = "1024"
ET.SubElement(wdgt, q(tb_ns, "value")).text = "2"
ET.SubElement(wdgt, q(tb_ns, "cry")).text = "0"
ET.SubElement(wdgt, q(tb_ns, "legal")).text = "none"
ET.SubElement(wdgt, q(tb_ns, "schk")).text = "false"
ET.SubElement(wdgt, q(tb_ns, "guid")).text = "00000000000000000000000000000000"
ET.SubElement(wdgt, q(tb_ns, "showingLnS")).text = "1"

table = ET.SubElement(wdgt, q(tb_ns, "table"))
ET.SubElement(table, q(tb_ns, "rowHeights"))
columns = ET.SubElement(table, q(tb_ns, "columns"))
for _ in range(26):
    column = ET.SubElement(columns, q(tb_ns, "column"), {"type": "cell-column"})
    ET.SubElement(column, q(tb_ns, "columnWidthNative")).text = "70"
    ET.SubElement(column, q(tb_ns, "columnWidth")).text = "70"
    ET.SubElement(column, q(tb_ns, "columnFlags")).text = "0"
    ET.SubElement(column, q(tb_ns, "cells"))

color = ET.SubElement(wdgt, q(tb_ns, "color"), {"version": "2.0"})
ET.SubElement(color, q(tb_ns, "columns")).text = "0" * 52

functiontable = ET.SubElement(wdgt, q(ft_ns, "functiontable"))
ET.SubElement(functiontable, q(ft_ns, "defaultColumnWidth")).text = "70"
ET.SubElement(functiontable, q(ft_ns, "defaultIndependantStartValue")).text = "0.0"
ET.SubElement(functiontable, q(ft_ns, "defaultIndependantStepValue")).text = "1.0"
ET.SubElement(functiontable, q(ft_ns, "defaultIndependantAutoModeValue")).text = "1"
ET.SubElement(functiontable, q(ft_ns, "defaultDependantAutoModeValue")).text = "1"
ft_table = ET.SubElement(functiontable, q(ft_ns, "table"))
ft_columns = ET.SubElement(ft_table, q(ft_ns, "columns"))
ind = ET.SubElement(ft_columns, q(ft_ns, "column"), {"type": "function table independant column"})
ET.SubElement(ind, q(ft_ns, "columnWidthNative")).text = "70"
ET.SubElement(ind, q(ft_ns, "columnWidth")).text = "70"
ET.SubElement(ind, q(ft_ns, "columnFlags")).text = "0"
ET.SubElement(ind, q(ft_ns, "nvColumnWidth")).text = "0"
ET.SubElement(ind, q(ft_ns, "autoSize")).text = "1"
dep = ET.SubElement(ft_columns, q(ft_ns, "column"), {"type": "function table dependant column"})
ET.SubElement(dep, q(ft_ns, "columnWidthNative")).text = "234"
ET.SubElement(dep, q(ft_ns, "columnWidth")).text = "234"
ET.SubElement(dep, q(ft_ns, "columnFlags")).text = "0"
ET.SubElement(dep, q(ft_ns, "nvColumnWidth")).text = "0"

root.append(card)
body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

parent_map = {child: parent for parent in root.iter() for child in parent}
def element_path(element):
    parts = []
    current = element
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            same = [child for child in parent if local_name(child.tag) == name]
            if len(same) > 1:
                name = f"{name}[{same.index(current)+1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))

json.dumps({
    "type": "Widget",
    "name": "tabulator",
    "file": str(xml_file),
    "path": element_path(wdgt),
    "detail": {"columns": 26, "showingLnS": "1", "created": "true"},
    "content": "",
    "content_label": "Spreadsheet",
    "raw_xml": ET.tostring(wdgt, encoding="unicode", short_empty_elements=False),
})
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  xmlLog(t("spreadsheetWidgetAdded"));
  return JSON.parse(payload);
}

function showSpreadsheetModal(item) {
  const key = spreadsheetSessionKey(item);
  const xmlState = extractSpreadsheetStateFromRawXml(item?.raw_xml || "");
  const saved = spreadsheetPreviewSessions.get(key);
  const baseState = saved && saved.rawXml === String(item?.raw_xml || "") ? saved : xmlState;
  const state = {
    cells: Object.fromEntries(Object.entries(baseState.cells || {}).map(([cellKey, cell]) => [cellKey, { formula: String(cell?.formula ?? ""), data: String(cell?.data ?? "") }])),
    rows: Math.max(20, baseState.rows || 20),
    cols: Math.min(26, Math.max(12, baseState.cols || 12)),
    sourceName: baseState.sourceName || "",
    activeRow: 0,
    activeCol: 0,
  };
  recalculateSpreadsheetCells(state.cells);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal inspector-modal spreadsheet-modal">
      <div class="spreadsheet-modal-header">
        <div>
          <h2>${escapeHtml(t("spreadsheetTitle"))}</h2>
          <div class="spreadsheet-source-name">${escapeHtml(state.sourceName || "TI-Nspire tabulator")}</div>
        </div>
        <div class="spreadsheet-header-actions">
          <button type="button" id="spreadsheet-import">${escapeHtml(t("spreadsheetImport"))}</button>
          <button type="button" id="spreadsheet-save" class="green-tool-button">${escapeHtml(t("spreadsheetSave"))}</button>
          <button type="button" id="spreadsheet-cancel">${escapeHtml(t("cancel"))}</button>
        </div>
      </div>
      <input id="spreadsheet-file-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden />
      <div class="spreadsheet-preview-stage">
        <div class="spreadsheet-calc" aria-label="TI-Nspire Lists & Spreadsheet preview">
          <div class="spreadsheet-calc-topbar">
            <div class="spreadsheet-page-tab"><span class="spreadsheet-tab-arrow">◀</span><span>1.1</span><span class="spreadsheet-tab-arrow">▶</span></div>
            <div class="spreadsheet-doc-title">${escapeHtml((state.sourceName || "excel").replace(/\.xlsx$/i, ""))}</div>
            <div class="spreadsheet-calc-status">RAD ▯</div>
          </div>
          <div class="spreadsheet-grid-shell">
            <div class="spreadsheet-grid" tabindex="0"></div>
          </div>
          <div class="spreadsheet-formula-bar"><span class="spreadsheet-cell-name">A1</span><span class="spreadsheet-formula-value"></span><span class="spreadsheet-nav-arrows">◀ ▶</span></div>
        </div>
      </div>
      <div class="spreadsheet-preview-note">${escapeHtml(t("spreadsheetPreviewOnly"))}</div>
    </div>`;
  document.body.append(backdrop);

  const grid = backdrop.querySelector(".spreadsheet-grid");
  const cellName = backdrop.querySelector(".spreadsheet-cell-name");
  const formulaValue = backdrop.querySelector(".spreadsheet-formula-value");
  const sourceNameEl = backdrop.querySelector(".spreadsheet-source-name");
  const docTitle = backdrop.querySelector(".spreadsheet-doc-title");

  const activeKey = () => `${state.activeRow}:${state.activeCol}`;
  const updateFormulaBar = () => {
    cellName.textContent = `${spreadsheetColumnName(state.activeCol)}${state.activeRow + 1}`;
    formulaValue.textContent = spreadsheetCellFormula(state.cells[activeKey()]);
  };

  const render = () => {
    const visibleRows = Math.min(100, Math.max(20, state.rows));
    const visibleCols = Math.min(26, Math.max(12, state.cols));
    let html = `<div class="sheet-corner"></div>`;
    for (let col = 0; col < visibleCols; col += 1) html += `<div class="sheet-col-header">${spreadsheetColumnName(col)}</div>`;
    for (let row = 0; row < visibleRows; row += 1) {
      html += `<div class="sheet-row-header">${row + 1}</div>`;
      for (let col = 0; col < visibleCols; col += 1) {
        const cell = state.cells[`${row}:${col}`];
        const value = spreadsheetCellDisplay(cell);
        const active = row === state.activeRow && col === state.activeCol ? " active" : "";
        html += `<div class="sheet-cell${active}" contenteditable="true" spellcheck="false" data-row="${row}" data-col="${col}">${escapeHtml(String(value))}</div>`;
      }
    }
    grid.style.setProperty("--sheet-cols", String(visibleCols));
    grid.innerHTML = html;
    updateFormulaBar();
  };

  grid.addEventListener("focusin", (event) => {
    const cell = event.target.closest(".sheet-cell");
    if (!cell) return;
    state.activeRow = Number(cell.dataset.row) || 0;
    state.activeCol = Number(cell.dataset.col) || 0;
    grid.querySelector(".sheet-cell.active")?.classList.remove("active");
    cell.classList.add("active");
    updateFormulaBar();
  });

  grid.addEventListener("input", (event) => {
    const cellEl = event.target.closest(".sheet-cell");
    if (!cellEl) return;
    const row = Number(cellEl.dataset.row) || 0;
    const col = Number(cellEl.dataset.col) || 0;
    const raw = cellEl.textContent || "";
    const keyName = `${row}:${col}`;
    if (!raw) {
      delete state.cells[keyName];
    } else {
      const record = state.cells[keyName] || { formula: "", data: "" };
      record.formula = raw;
      record.data = raw.startsWith("=") ? evaluateSpreadsheetFormula(raw, state.cells) : raw;
      state.cells[keyName] = record;
    }
    recalculateSpreadsheetCells(state.cells);
    for (const formulaCell of grid.querySelectorAll(".sheet-cell")) {
      const formulaRow = Number(formulaCell.dataset.row) || 0;
      const formulaCol = Number(formulaCell.dataset.col) || 0;
      const formulaRecord = state.cells[`${formulaRow}:${formulaCol}`];
      if (formulaRecord && String(formulaRecord.formula || "").startsWith("=") && formulaCell !== cellEl) {
        formulaCell.textContent = spreadsheetCellDisplay(formulaRecord);
      }
    }
    state.rows = Math.max(state.rows, row + 1);
    state.cols = Math.min(26, Math.max(state.cols, col + 1));
    updateFormulaBar();
  });

  grid.addEventListener("focusout", (event) => {
    const cellEl = event.target.closest(".sheet-cell");
    if (!cellEl) return;
    const row = Number(cellEl.dataset.row) || 0;
    const col = Number(cellEl.dataset.col) || 0;
    const record = state.cells[`${row}:${col}`];
    if (record && String(record.formula || "").startsWith("=")) {
      recalculateSpreadsheetCells(state.cells);
      cellEl.textContent = spreadsheetCellDisplay(record);
    }
  });

  const fileInput = backdrop.querySelector("#spreadsheet-file-input");
  backdrop.querySelector("#spreadsheet-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const imported = await parseXlsxFirstSheet(file);
      state.cells = imported.cells;
      state.rows = imported.rows;
      state.cols = imported.cols;
      state.sourceName = imported.sourceName;
      sourceNameEl.textContent = imported.sourceName;
      docTitle.textContent = imported.sourceName.replace(/\.xlsx$/i, "");
      state.activeRow = 0;
      state.activeCol = 0;
      render();
      xmlLog(t("spreadsheetImportLoaded"));
    } catch (error) {
      xmlLog(`ERROR XLSX: ${error.message}`);
    } finally {
      fileInput.value = "";
    }
  });

  backdrop.querySelector("#spreadsheet-save").addEventListener("click", async () => {
    const saveButton = backdrop.querySelector("#spreadsheet-save");
    saveButton.disabled = true;
    try {
      recalculateSpreadsheetCells(state.cells);
      const result = await saveSpreadsheetWidgetToStage(item, state);
      item.raw_xml = result.raw_xml || item.raw_xml;
      item.file = result.file || item.file;
      spreadsheetPreviewSessions.set(key, {
        cells: Object.fromEntries(Object.entries(state.cells).map(([cellKey, cell]) => [cellKey, { ...cell }])),
        rows: state.rows,
        cols: state.cols,
        sourceName: state.sourceName,
        rawXml: item.raw_xml || "",
      });
      xmlLog(`${t("spreadsheetSave")}: ${result.saved_cells} celdas guardadas en XML TI-Nspire`);
      closeModal(backdrop);
    } catch (error) {
      saveButton.disabled = false;
      xmlLog(`ERROR Spreadsheet Save: ${error.message}`);
    }
  });

  // Cancel descarta todos los cambios hechos desde que se abrió esta ventana.
  backdrop.querySelector("#spreadsheet-cancel").addEventListener("click", () => closeModal(backdrop));
  render();
}

async function openDocumentInspector() {
  const data = await inspectXmlDocument();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const summary = data.summary || {};
  const sortedItems = [...(data.items || [])].sort((a, b) => {
    const rank = (item) => item.type === "Lua Script" ? 0 : item.content_label === "Python" ? 1 : item.content_label === "Spreadsheet" ? 2 : item.content_label === "Notepad" ? 3 : item.content_label === "Graph" ? 4 : item.content_label === "Image" ? 5 : item.type === "Widget" && item.name === "TI.ScriptApp" ? 6 : item.type === "Card" ? 7 : 8;
    return rank(a) - rank(b) || String(a.file).localeCompare(String(b.file)) || String(a.path).localeCompare(String(b.path));
  });
  const rows = sortedItems.map((item, index) => {
    const detail = item.detail ? Object.entries(item.detail).map(([key, value]) => `${key}: ${value}`).join(", ") : "";
    let contentAction = "";
    if (item.type === "Lua Script") {
      contentAction = `<button type="button" class="mini-action view-action" data-index="${index}">${escapeHtml(t("openLua"))}</button><button type="button" class="mini-action edit-lua-action green-mini-action" data-index="${index}">${escapeHtml(t("editLua"))}</button>`;
    } else if (item.content_label === "Python") {
      contentAction = `<button type="button" class="mini-action view-action" data-index="${index}">${escapeHtml(t("openPython"))}</button><button type="button" class="mini-action edit-python-action green-mini-action" data-index="${index}">${escapeHtml(t("editPython"))}</button>`;
    } else if (item.content_label === "Image") {
      contentAction = `<button type="button" class="mini-action image-action green-mini-action" data-index="${index}">${escapeHtml(t("viewImage"))}</button>`;
    } else if (item.content_label === "Spreadsheet") {
      contentAction = `<button type="button" class="mini-action spreadsheet-action green-mini-action" data-index="${index}">${escapeHtml(t("openSpreadsheet"))}</button>`;
    } else if (item.content_label === "Notepad") {
      contentAction = `<button type="button" class="mini-action notepad-action green-mini-action" data-index="${index}">${escapeHtml(t("openNotepad"))}</button>`;
    } else if (item.content_label === "Graph") {
      contentAction = `<button type="button" class="mini-action graph-action green-mini-action" data-index="${index}">${escapeHtml(t("openGraph"))}</button>`;
    } else if (item.content_label === "Scratchpad") {
      contentAction = `<button type="button" class="mini-action calculator-action green-mini-action" data-index="${index}">${escapeHtml(t("openCalculator"))}</button>`;
    } else if (item.content) {
      contentAction = `<button type="button" class="mini-action view-action" data-index="${index}">${escapeHtml(t("viewValue"))}</button>`;
    }
    const xmlAction = item.raw_xml ? `<button type="button" class="mini-action xml-action" data-index="${index}">${escapeHtml(t("viewXml"))}</button>` : "";
    const action = `${contentAction}${xmlAction}`;
    return `<tr><td>${escapeHtml(item.name)}</td><td>${action}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.file.split("/").pop())}</td><td>${escapeHtml(item.path)}</td><td>${escapeHtml(detail)}</td></tr>`;
  }).join("");
  backdrop.innerHTML = `
    <div class="modal inspector-modal">
      <h2>${escapeHtml(t("documentInspector"))}</h2>
      <h3>${escapeHtml(t("documentSummary"))}</h3>
      <div class="inspector-summary">
        <span>XML: ${summary.files || 0}</span>
        <span>Cards: ${summary.cards || 0}</span>
        <span>Widgets: ${summary.widgets || 0}</span>
        <span>Lua: ${summary.lua_scripts || 0}</span>
        <span>Python: ${summary.python_editors || 0}</span>
        <span>Resources: ${summary.resources || 0}</span>
        <span>Images: ${summary.images || 0}</span>
        <span>Sheets: ${summary.spreadsheets || 0}</span>
        <span>Notes: ${summary.notepads || 0}</span>
        <span>Graphs: ${summary.graphs || 0}</span>
        <span>Calculators: ${summary.calculators || 0}</span>
        <span>Basic: ${summary.basic_blocks || 0}</span>
        <span>Symbols: ${summary.symbols || 0}</span>
      </div>
      <h3>${escapeHtml(t("documentElements"))}</h3>
      <div class="inspector-table-wrap">
        <table class="problem-table inspector-table">
          <thead><tr><th>Nombre</th><th>Acciones</th><th>Tipo</th><th>Archivo</th><th>Path</th><th>Detalle</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="modal-actions inspector-modal-actions">
        <div class="tool-menu inspector-page-menu">
          <button type="button" id="inspector-page-trigger" class="menu-trigger green-menu-trigger"><span>${escapeHtml(t("addPage"))}</span></button>
          <div class="menu-panel">
            <button type="button" id="add-program-editor-widget" class="menu-action">${escapeHtml(t("addProgramEditorWidget"))}</button>
            <button type="button" id="add-python-widget" class="menu-action">${escapeHtml(t("addPythonWidget"))}</button>
            <button type="button" id="add-lua-widget" class="menu-action">${escapeHtml(t("addLuaWidget"))}</button>
            <button type="button" id="add-spreadsheet-widget" class="menu-action">${escapeHtml(t("addSpreadsheetWidget"))}</button>
            <button type="button" id="add-notepad-widget" class="menu-action">${escapeHtml(t("addNotepadWidget"))}</button>
            <button type="button" id="add-graph-widget" class="menu-action">${escapeHtml(t("addGraphWidget"))}</button>
            <button type="button" id="add-calculator-widget" class="menu-action">${escapeHtml(t("addCalculatorWidget"))}</button>
            <button type="button" id="add-image-widget" class="menu-action">${escapeHtml(t("addImageWidget"))}</button>
          </div>
        </div>
        <button type="button" id="inspector-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  backdrop.querySelector("#inspector-close").addEventListener("click", () => closeModal(backdrop));
  const pageMenu = backdrop.querySelector(".inspector-page-menu");
  backdrop.querySelector("#inspector-page-trigger").addEventListener("click", (event) => {
    event.stopPropagation();
    pageMenu.classList.toggle("open");
  });
  backdrop.addEventListener("click", (event) => {
    if (!event.target.closest(".inspector-page-menu")) pageMenu.classList.remove("open");
  });
  backdrop.querySelector("#add-program-editor-widget").addEventListener("click", async () => {
    try {
      await addProgramEditorToStage();
      closeModal(backdrop, async () => {
        await openDocumentInspector();
      });
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
  backdrop.querySelector("#add-lua-widget").addEventListener("click", async () => {
    try {
      const item = await addLuaScriptAppToStage();
      showLuaEditor(item);
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
  backdrop.querySelector("#add-python-widget").addEventListener("click", async () => {
    try {
      const item = await addPythonEditorToStage();
      showPythonEditor(item);
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
  backdrop.querySelector("#add-notepad-widget").addEventListener("click", async () => {
    try {
      const item = await addNotepadWidgetToStage();
      closeModal(backdrop, async () => { await openDocumentInspector(); showNotepadModal(item); });
    } catch (error) { xmlLog(`ERROR: ${error.message}`); }
  });
  backdrop.querySelector("#add-graph-widget").addEventListener("click", async () => {
    try {
      const item = await addGraphWidgetToStage();
      closeModal(backdrop, () => {
        openGraphInLovePreview(item).catch((error) => xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
      });
    } catch (error) { xmlLog(`ERROR: ${error.message}`); }
  });
  backdrop.querySelector("#add-calculator-widget").addEventListener("click",async()=>{try{const item=await addCalculatorWidgetToStage();closeModal(backdrop,()=>openCalculatorInLovePreview(item).catch(e=>xmlLog(`ERROR Calculator Preview: ${e.message}`)));}catch(e){xmlLog(`ERROR: ${e.message}`);}});
  backdrop.querySelector("#add-image-widget").addEventListener("click", async () => {
    try {
      const item = await openAddImageWidgetFlow({ showPreview: false });
      if (!item) return;
      closeModal(backdrop, async () => {
        await openDocumentInspector();
        showImageModal(item);
      });
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
  backdrop.querySelector("#add-spreadsheet-widget").addEventListener("click", async () => {
    try {
      const item = await addSpreadsheetWidgetToStage();
      closeModal(backdrop, async () => {
        await openDocumentInspector();
        showSpreadsheetModal(item);
      });
    } catch (error) {
      xmlLog(`ERROR: ${error.message}`);
    }
  });
  for (const button of backdrop.querySelectorAll(".view-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showTextModal(`${item.content_label || item.type}: ${item.name}`, item.content || "");
    });
  }
  for (const button of backdrop.querySelectorAll(".xml-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showTextModal(`XML: ${item.type} ${item.name}`, item.raw_xml || "");
    });
  }
  for (const button of backdrop.querySelectorAll(".image-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showImageModal(item);
    });
  }
  for (const button of backdrop.querySelectorAll(".spreadsheet-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showSpreadsheetModal(item);
    });
  }
  for (const button of backdrop.querySelectorAll(".notepad-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showNotepadModal(item);
    });
  }
  for(const button of backdrop.querySelectorAll(".calculator-action")){button.addEventListener("click",()=>{const item=sortedItems[Number(button.dataset.index)];openCalculatorInLovePreview(item).catch(e=>xmlLog(`ERROR Calculator Preview: ${e.message}`));});}
  for (const button of backdrop.querySelectorAll(".graph-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      openGraphInLovePreview(item).catch((error) => xmlLog(`ERROR Graph Preview LÖVE: ${error.message}`));
    });
  }
  for (const button of backdrop.querySelectorAll(".edit-lua-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showLuaEditor(item);
    });
  }
  for (const button of backdrop.querySelectorAll(".edit-python-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showPythonEditor(item);
    });
  }
}

function detectXmlDocumentType(text) {
  const first = text.split("\n").find((line) => line.trim())?.trim().toLowerCase() || "";
  return first === "func" ? "Func" : "Prgm";
}

function coerceXmlDocumentType(text, documentType) {
  const start = documentType === "Func" ? "Func" : "Prgm";
  const end = documentType === "Func" ? "EndFunc" : "EndPrgm";
  const lines = text.split("\n");
  if (!lines.length) return `${start}\n${end}`;
  if (/^\s*(Prgm|Func)\s*$/i.test(lines[0] || "")) lines[0] = start;
  else lines.unshift(start);
  if (/^\s*(EndPrgm|EndFunc)\s*$/i.test(lines[lines.length - 1] || "")) lines[lines.length - 1] = end;
  else lines.push(end);
  return lines.join("\n");
}

function refreshXmlProgramOptions() {
  const combo = document.querySelector("#xml-programs");
  combo.innerHTML = "";
  for (const item of xmlDoctor.candidates) {
    const option = document.createElement("option");
    option.value = String(item.index);
    option.textContent = `${item.program_name} [${item.document_type || "Basic"}] (${item.file.split("/").pop()})`;
    combo.append(option);
  }
  if (xmlDoctor.current) combo.value = String(xmlDoctor.current.index);
}

function openXmlDocumentSettings() {
  if (!xmlDoctor.current) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal document-modal">
      <h2>${escapeHtml(t("documentSettings"))}</h2>
      <div class="document-form">
        <label for="doc-name">${escapeHtml(t("documentName"))}</label>
        <input id="doc-name" value="${escapeHtml(xmlDoctor.current.program_name || "")}">
        <label for="doc-type">${escapeHtml(t("documentType"))}</label>
        <select id="doc-type"><option>Prgm</option><option>Func</option></select>
        <label for="doc-access">${escapeHtml(t("libraryAccess"))}</label>
        <select id="doc-access"><option>None</option><option>LibPriv</option><option>LibPub</option></select>
        <label for="doc-params">${escapeHtml(t("arguments"))}</label>
        <input id="doc-params" value="${escapeHtml(xmlDoctor.current.parameters || "")}">
      </div>
      <div class="modal-actions">
        <button type="button" id="doc-cancel">${escapeHtml(t("cancel"))}</button>
        <button type="button" id="doc-apply">${escapeHtml(t("apply"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  backdrop.querySelector("#doc-type").value = xmlDoctor.current.document_type || detectXmlDocumentType(document.querySelector("#xml-code").value);
  backdrop.querySelector("#doc-access").value = xmlDoctor.current.library_access || "None";
  backdrop.querySelector("#doc-cancel").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#doc-apply").addEventListener("click", () => {
    const name = backdrop.querySelector("#doc-name").value.trim();
    const documentType = backdrop.querySelector("#doc-type").value;
    const libraryAccess = backdrop.querySelector("#doc-access").value;
    const parameters = backdrop.querySelector("#doc-params").value.trim();
    const nameError = tiDocumentNameError(name);
    if (nameError) {
      xmlLog(`ERROR: ${nameError}`);
      alert(nameError);
      return;
    }
    xmlDoctor.current.program_name = name;
    xmlDoctor.current.document_type = documentType;
    xmlDoctor.current.library_access = libraryAccess;
    xmlDoctor.current.parameters = parameters;
    document.querySelector("#xml-code").value = coerceXmlDocumentType(document.querySelector("#xml-code").value, documentType);
    refreshXmlProgramOptions();
    xmlDoctor.embedded = false;
    xmlDoctor.stagePrepared = false;
    xmlDoctor.lastReport = null;
    xmlDoctor.lastDiff = "";
    updateXmlLineNumbers();
    renderXmlAnalysis({ errors: 0, warnings: 0, infos: 0, diagnostics: [] });
    xmlLog(`${t("documentSettings")}: ${name}, ${documentType}, ${libraryAccess}`);
    closeModal(backdrop);
  });
}

function renderXmlAnalysis(report) {
  xmlDoctor.lastReport = report;
  xmlDoctor.issueLines.clear();
  document.querySelector("#xml-errors").textContent = report.errors;
  document.querySelector("#xml-warnings").textContent = report.warnings;
  document.querySelector("#xml-info").textContent = report.infos;
  const body = document.querySelector("#xml-problems");
  body.innerHTML = "";
  const monacoDiagnostics = [];
  for (const diag of report.diagnostics) {
    const effectiveLine = diag.line || inferredXmlDiagnosticLine(diag);
    if (effectiveLine) {
      const previous = xmlDoctor.issueLines.get(effectiveLine);
      if (diag.severity === "ERROR" || previous !== "ERROR") {
        xmlDoctor.issueLines.set(effectiveLine, diag.severity);
      }
      monacoDiagnostics.push({ ...diag, line: effectiveLine, level: diag.severity });
    }
    const row = document.createElement("tr");
    row.className = diag.severity;
    row.dataset.line = effectiveLine || "";
    const code = diag.code_label || (diag.code ? `${diag.severity === "WARNING" ? "W" : "E"}${diag.code}` : "");
    row.innerHTML = `<td>${severityLabel(diag.severity)}</td><td>${effectiveLine || "-"}</td><td>${translateProblemText(diag.message, diag.detail, code)}</td>`;
    row.addEventListener("dblclick", () => goToXmlLine(Number(row.dataset.line)));
    body.append(row);
  }
  codeEditorAdapters.get("#xml-code")?.setDiagnostics(monacoDiagnostics);
  updateXmlLineNumbers();
}

function inferredXmlDiagnosticLine(diag) {
  const match = /^Variable no declarada: ([A-Za-z_][A-Za-z0-9_]*)/.exec(diag.message || "");
  if (!match) return 0;
  const target = new RegExp(`\\b${match[1]}\\b`);
  const lines = document.querySelector("#xml-code").value.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (target.test(lines[index])) return index + 1;
  }
  return 0;
}

function goToXmlLine(line) {
  if (!line) return;
  const code = document.querySelector("#xml-code");
  const lines = code.value.split("\n");
  const pos = lines.slice(0, Math.max(0, line - 1)).join("\n").length + (line > 1 ? 1 : 0);
  code.focus();
  code.setSelectionRange(pos, pos);
  code.scrollTop = Math.max(0, (line - 1) * 18.85 - 80);
  document.querySelector("#xml-line-numbers").scrollTop = code.scrollTop;
  document.querySelector("#xml-highlight").scrollTop = code.scrollTop;
  updateXmlLineLabel();
}

async function runXmlSyntax() {
  const code = document.querySelector("#xml-code").value;
  pyodide.globals.set("wasm_xml_code", code);
  pyodide.globals.set("wasm_xml_parameters", xmlDoctor.current?.parameters || "");
  pyodide.globals.set("wasm_xml_known_functions", (xmlDoctor.candidates || []).map((item) => item.program_name));
  pyodide.globals.set("wasm_xml_all_program_names", (xmlDoctor.candidates || []).map((item) => item.program_name));
  pyodide.globals.set("wasm_xml_scan_for_symbols", xmlDoctor.stagePrepared ? xmlDoctor.stagePath : xmlDoctor.sourcePath);
  const payload = await pyodide.runPythonAsync(`
import json
import importlib
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name
if "ti_syntax" in sys.modules:
    importlib.reload(sys.modules["ti_syntax"])
from ti_syntax import analyze_ti_code

known_names = set(wasm_xml_all_program_names.to_py())
known_functions = set(wasm_xml_known_functions.to_py())
scan_root = Path(wasm_xml_scan_for_symbols)
for xml_file in scan_root.rglob("*.xml"):
    try:
        root = ET.parse(xml_file).getroot()
    except Exception:
        continue
    for element in root.iter():
        if local_name(element.tag) != "e":
            continue
        symbol_name = ""
        for child in element:
            if local_name(child.tag) == "n" and child.text:
                symbol_name = child.text.strip()
                known_names.add(symbol_name)
        if symbol_name and element.attrib.get("t") in {"6", "7"}:
            known_functions.add(symbol_name)

report = analyze_ti_code(
    wasm_xml_code,
    parameters=wasm_xml_parameters,
    known_functions=known_functions,
    known_names=known_names,
)
json.dumps({
    "errors": len(report.errors),
    "warnings": len(report.warnings),
    "infos": len(report.infos),
    "diagnostics": [
        {
            "severity": d.severity,
            "line": d.line,
            "message": d.message,
            "detail": d.detail,
            "code": getattr(d, "code", None),
            "code_label": getattr(d, "code_label", ""),
        }
        for d in report.diagnostics
    ],
    "format": report.format(),
})
`);
  const report = JSON.parse(payload);
  renderXmlAnalysis(report);
  xmlLog(tf("analysisDone", { errors: report.errors, warnings: report.warnings }));
  return report;
}

async function autoFixXml() {
  const code = document.querySelector("#xml-code").value;
  pyodide.globals.set("wasm_xml_code", code);
  const payload = await pyodide.runPythonAsync(`
import json
import importlib
import sys
if "ti_syntax" in sys.modules:
    importlib.reload(sys.modules["ti_syntax"])
from ti_syntax import autofix_ti_code
fixed, diff = autofix_ti_code(wasm_xml_code)
json.dumps({"fixed": fixed, "diff": diff})
`);
  const result = JSON.parse(payload);
  xmlDoctor.lastDiff = result.diff || "";
  if (result.fixed !== code) {
    document.querySelector("#xml-code").value = result.fixed;
    updateXmlLineNumbers();
    xmlDoctor.embedded = false;
    xmlLog(t("autoFixApplied"));
  } else {
    xmlLog(t("autoFixNoChanges"));
  }
  await runXmlSyntax();
}

async function formatXmlCode() {
  const code = document.querySelector("#xml-code").value;
  pyodide.globals.set("wasm_xml_code", code);
  const payload = await pyodide.runPythonAsync(`
import json
import importlib
import sys
if "ti_syntax" in sys.modules:
    importlib.reload(sys.modules["ti_syntax"])
from ti_syntax import format_ti_code
formatted, diff = format_ti_code(wasm_xml_code)
json.dumps({"formatted": formatted, "diff": diff})
`);
  const result = JSON.parse(payload);
  xmlDoctor.lastDiff = result.diff || "";
  if (result.formatted !== code) {
    document.querySelector("#xml-code").value = result.formatted;
    updateXmlLineNumbers();
    xmlDoctor.embedded = false;
    xmlLog(t("formatApplied"));
  } else {
    xmlLog(t("formatNoChanges"));
  }
  await runXmlSyntax();
}

function xmlResolverItems(report) {
  const source = report || xmlDoctor.lastReport;
  if (!source) return [];
  const seen = new Set();
  const items = [];
  for (const diag of source.diagnostics || []) {
    const match = /^Variable no declarada: ([A-Za-z_][A-Za-z0-9_]*)/.exec(diag.message || "");
    if (!match || seen.has(match[1])) continue;
    seen.add(match[1]);
    const suggestions = (diag.detail || "").startsWith("Sugerencias: ")
      ? diag.detail.replace("Sugerencias: ", "").split(",").map((item) => item.trim()).filter(Boolean)
      : [];
    items.push({ name: match[1], suggestions });
  }
  return items;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

function replaceIdentifier(text, from, to) {
  return text.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g"), to);
}

function appendToLastLocal(text, names) {
  const lines = text.split("\n");
  let lastLocal = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*Local\s+/i.test(lines[index])) lastLocal = index;
  }
  if (lastLocal === -1) {
    const insertAt = lines[0]?.trim().toLowerCase() === "prgm" ? 1 : 0;
    lines.splice(insertAt, 0, `Local ${names.join(",")}`);
    return lines.join("\n");
  }
  lines[lastLocal] = `${lines[lastLocal].trimEnd()},${names.join(",")}`;
  return lines.join("\n");
}

async function resolveXmlProblems() {
  const report = await runXmlSyntax();
  const items = xmlResolverItems(report);
  if (!items.length) {
    xmlLog(t("resolverNoPending"));
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const optionsHtml = items.map((item) => {
    const options = [...item.suggestions, "__declare__", "__ignore__"];
    return `
      <div class="resolver-item" data-variable="${escapeHtml(item.name)}">
        <strong>${escapeHtml(t("resolverVariable"))}: ${escapeHtml(item.name)}</strong>
        ${options.map((option, index) => {
          const label = option === "__declare__" ? t("resolverDeclare") : option === "__ignore__" ? t("resolverIgnore") : option;
          return `<label class="resolver-option"><input type="radio" name="resolve-${escapeHtml(item.name)}" value="${escapeHtml(option)}" ${index === 0 ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`;
        }).join("")}
      </div>`;
  }).join("");
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${escapeHtml(t("resolverTitle"))}</h2>
      <p>${escapeHtml(t("resolverPrompt"))}</p>
      ${optionsHtml}
      <div class="modal-actions">
        <button type="button" id="resolver-cancel">${escapeHtml(t("cancel"))}</button>
        <button type="button" id="resolver-apply">${escapeHtml(t("apply"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);

  backdrop.querySelector("#resolver-cancel").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#resolver-apply").addEventListener("click", async () => {
    let text = document.querySelector("#xml-code").value;
    const declared = [];
    for (const item of items) {
      const selected = backdrop.querySelector(`input[name="resolve-${CSS.escape(item.name)}"]:checked`)?.value;
      if (!selected || selected === "__ignore__") {
        xmlLog(`[INFO] ${tf("resolverLogIgnored", { name: item.name })}`);
        continue;
      }
      if (selected === "__declare__") {
        declared.push(item.name);
        xmlLog(`[INFO] ${tf("resolverLogDeclared", { name: item.name })}`);
        continue;
      }
      text = replaceIdentifier(text, item.name, selected);
      xmlLog(`[INFO] ${tf("resolverLogReplaced", { name: item.name, value: selected })}`);
    }
    if (declared.length) {
      text = appendToLastLocal(text, declared);
    }
    document.querySelector("#xml-code").value = text;
    xmlDoctor.embedded = false;
    xmlDoctor.lastDiff = "";
    closeModal(backdrop);
    updateXmlLineNumbers();
    await runXmlSyntax();
  });
}

function showXmlChanges() {
  if (!xmlDoctor.lastDiff) {
    xmlLog(t("noAutoFixChanges"));
    return;
  }
  const win = window.open("", "_blank", "width=900,height=600");
  if (!win) return;
  win.document.write(`<pre style="white-space:pre-wrap;font:13px Consolas,monospace">${xmlDoctor.lastDiff.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</pre>`);
  win.document.close();
}

async function embedXmlCode() {
  if (!xmlDoctor.current) throw new Error("No hay programa XML seleccionado.");
  const report = await runXmlSyntax();
  if (report.errors > 0) {
    throw new Error("Corrige los errores antes de incrustar el XML.");
  }
  const updateBasePath = xmlDoctor.stagePrepared ? xmlDoctor.stagePath : xmlDoctor.sourcePath;
  pyodide.globals.set("wasm_xml_update_in_place", Boolean(xmlDoctor.stagePrepared));
  pyodide.globals.set("wasm_xml_code", document.querySelector("#xml-code").value);
  pyodide.globals.set("wasm_xml_program", xmlDoctor.current.original_name || xmlDoctor.current.program_name);
  pyodide.globals.set("wasm_xml_new_name", xmlDoctor.current.program_name);
  pyodide.globals.set("wasm_xml_document_type", xmlDoctor.current.document_type || detectXmlDocumentType(document.querySelector("#xml-code").value));
  pyodide.globals.set("wasm_xml_library_access", xmlDoctor.current.library_access || "None");
  pyodide.globals.set("wasm_xml_parameters", xmlDoctor.current.parameters || "");
  await pyodide.runPythonAsync(`
from pathlib import Path
from xml_updater import XMLUpdater
updater = XMLUpdater(Path("${updateBasePath}"))
if wasm_xml_update_in_place:
    updater.update_program(
        wasm_xml_program,
        wasm_xml_code,
        in_place=True,
        new_name=wasm_xml_new_name,
        document_type=wasm_xml_document_type,
        library_access=wasm_xml_library_access,
        parameters=wasm_xml_parameters,
    )
else:
    updater.update_program(
        wasm_xml_program,
        wasm_xml_code,
        out_dir=Path("${xmlDoctor.stagePath}"),
        new_name=wasm_xml_new_name,
        document_type=wasm_xml_document_type,
        library_access=wasm_xml_library_access,
        parameters=wasm_xml_parameters,
    )
`);
  xmlDoctor.embedded = true;
  xmlDoctor.stagePrepared = true;
  xmlLog(t("codeEmbedded"));
}

async function saveXmlZip() {
  // Guardar el proyecto XML completo no debe depender de tener un
  // TI.ProgramEditor/Lua/Python seleccionado. Documentos compuestos solo por
  // imágenes, hojas de cálculo u otros widgets también son guardables.
  if (xmlDoctor.current && !xmlDoctor.embedded) {
    await embedXmlCode();
  } else if (!xmlDoctor.stagePrepared) {
    await ensureXmlStageCopy();
  }

  const zip = new JSZip();
  collectFiles(xmlDoctor.stagePath, zip);
  const blob = await zip.generateAsync({ type: "uint8array" });
  downloadBytes("syntax_doctor_xml_output.zip", blob, "application/zip");
  xmlLog(t("xmlZipDownloaded"));
}

async function decodeNormalTns() {
  const file = document.querySelector("#decode-file").files[0];
  if (!file) return;
  await ensureCryptoPackage();
  clearDir("/work/decode");
  await writeFileToFs(file, "/work/input.tns");
  log(`Decodificando ${file.name}...`);
  await pyodide.runPythonAsync(`
from pathlib import Path
from tnstools import decode_tns_file
decode_tns_file(Path("/work/input.tns"), Path("/work/decode"))
`);
  const zip = new JSZip();
  collectFiles("/work/decode", zip);
  const blob = await zip.generateAsync({ type: "uint8array" });
  downloadBytes(`${file.name}.xml.zip`, blob, "application/zip");
  log("ZIP XML descargado.");
}

async function buildNormalTns() {
  const files = [...document.querySelector("#build-xml-folder").files];
  if (!files.length) return;
  await ensureCryptoPackage();
  clearDir("/work/xml_in");
  for (const file of files) {
    await writeFileToFs(file, `/work/xml_in/${folderRelativePath(file)}`);
  }
  log("Creando TNS desde XML...");
  await pyodide.runPythonAsync(`
from pathlib import Path
from tnstools import build_tns_from_xml
build_tns_from_xml(Path("/work/xml_in"), Path("/work/output.tns"))
`);
  downloadBytes("salida.tns", pyodide.FS.readFile("/work/output.tns"));
  log("TNS descargado.");
}

async function getPythonCode() {
  const pyFile = document.querySelector("#py-file").files[0];
  const inline = document.querySelector("#py-inline").value;
  if (inline.trim()) return inline;
  if (!pyFile) throw new Error("Selecciona un .py o escribe codigo inline.");
  return await pyFile.text();
}

async function getTemplateBytes() {
  const template = document.querySelector("#template-file").files[0];
  if (template) return new Uint8Array(await template.arrayBuffer());
  const response = await fetch("./convert/plantilla.tns");
  if (!response.ok) throw new Error("No se pudo cargar convert/plantilla.tns.");
  return new Uint8Array(await response.arrayBuffer());
}

async function buildPythonTns() {
  const code = await getPythonCode();
  clearDir("/work/python");
  pyodide.FS.mkdirTree("/work/python");
  pyodide.FS.writeFile("/work/python/plantilla.tns", await getTemplateBytes());
  pyodide.FS.writeFile("/work/python/code.py", code);
  log("Creando Python Program TNS...");
  await pyodide.runPythonAsync(`
from pathlib import Path
import code_to_tns
code = Path("/work/python/code.py").read_text(encoding="utf-8")
code_to_tns.build_tns(Path("/work/python/plantilla.tns"), code, Path("/work/python/output.tns"))
`);
  downloadBytes("python_program.tns", pyodide.FS.readFile("/work/python/output.tns"));
  log("Python Program TNS descargado.");
}

async function extractPython() {
  const file = document.querySelector("#extract-file").files[0];
  if (!file) return;
  await writeFileToFs(file, "/work/extract.tns");
  log("Extrayendo Python...");
  const payload = await pyodide.runPythonAsync(`
import json
from pathlib import Path
import tns_reader
data = Path("/work/extract.tns").read_bytes()
entries = tns_reader.parse_central_directory(data)
ranked = []
for entry in entries:
    name = entry.name.lower()
    if name == "q.py":
        ranked.append((0, entry))
    elif name.endswith(".py"):
        ranked.append((1, entry))
    elif name.endswith(".pyt"):
        ranked.append((2, entry))
ranked.sort(key=lambda item: (item[0], item[1].name.lower()))
if ranked:
    entry = ranked[0][1]
    result = tns_reader.extract_entry(data, entry).decode("utf-8")
else:
    raise ValueError("No se encontro q.py, .py ni .pyt")
json.dumps({"name": entry.name, "code": result})
`);
  const extracted = JSON.parse(payload);
  const internalName = extracted.name.split(/[\\/]/).pop().replace(/\.pyt$/i, ".py");
  const downloadName = internalName.toLowerCase() === "q.py" ? `${file.name.replace(/\.tns$/i, "")}.py` : internalName;
  downloadBytes(downloadName, new TextEncoder().encode(extracted.code), "text/x-python");
  log(`Python descargado: ${extracted.name}`);
}

async function analyzePython() {
  const code = await getPythonCode();
  pyodide.globals.set("wasm_py_code", code);
  const report = await pyodide.runPythonAsync(`
from syntax_doctor_py_core import PythonSyntaxAnalyzer
report = PythonSyntaxAnalyzer().analyze(wasm_py_code)
"\\n".join(f"[{d.level.upper()}] linea {d.line}: {d.message}" for d in report.diagnostics)
`);
  log(report || "Sin errores.");
}

async function openPyDoctor(options = {}) {
  const panel = document.querySelector("#py-doctor-panel");
  const hasInjectedCode = Object.prototype.hasOwnProperty.call(options, "code");
  const forceOpen = Boolean(options.forceOpen || options.target || hasInjectedCode);
  if (forceOpen) {
    panel.classList.remove("collapsed");
  } else {
    panel.classList.toggle("collapsed");
  }
  syncToggleLabels();
  if (panel.classList.contains("collapsed")) {
    pyDoctor.target = null;
    updatePyDoctorSaveLabel();
    return;
  }

  const code = hasInjectedCode ? String(options.code || "") : await getPythonCode().catch(() => document.querySelector("#py-inline").value || "");
  pyDoctor.target = options.target || null;
  document.querySelector("#py-code").value = code;
  pyDoctor.lastOriginal = code;
  pyDoctor.lastFixed = code;
  pyDoctor.lastChanges = [];
  pyDoctor.issueLines.clear();
  updatePyDoctorSaveLabel();
  setPyDoctorEnabled(true);
  updateDoctorLineNumbers("py", pyDoctor.issueLines);
  updatePyLineLabel();
  updatePyHighlight();
  renderPyAnalysis({ errors: 0, warnings: 0, info: 0, diagnostics: [] });
  pyLog(t("pyDoctorOpened"));
}

function pyLog(message) {
  const target = document.querySelector("#py-log");
  target.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
  target.scrollTop = target.scrollHeight;
}

function renderPyAnalysis(report) {
  pyDoctor.lastReport = report;
  pyDoctor.issueLines.clear();
  document.querySelector("#py-errors").textContent = report.errors || 0;
  document.querySelector("#py-warnings").textContent = report.warnings || 0;
  document.querySelector("#py-info").textContent = report.info || 0;
  const body = document.querySelector("#py-problems");
  body.innerHTML = "";
  const monacoDiagnostics = [];
  for (const diag of report.diagnostics || []) {
    if (diag.line) {
      const previous = pyDoctor.issueLines.get(diag.line);
      if (diag.level === "error" || previous !== "error") {
        pyDoctor.issueLines.set(diag.line, diag.level);
      }
      monacoDiagnostics.push(diag);
    }
    const row = document.createElement("tr");
    row.className = String(diag.level || "").toUpperCase();
    row.dataset.line = diag.line || "";
    row.innerHTML = `<td>${severityLabel(diag.level)}</td><td>${diag.line || "-"}</td><td>${translateProblemText(diag.message)}</td>`;
    row.addEventListener("dblclick", () => goToPyLine(Number(row.dataset.line)));
    body.append(row);
  }
  codeEditorAdapters.get("#py-code")?.setDiagnostics(monacoDiagnostics);
  updateDoctorLineNumbers("py", pyDoctor.issueLines);
}

function goToPyLine(line) {
  if (!line) return;
  const code = document.querySelector("#py-code");
  const lines = code.value.split("\n");
  const pos = lines.slice(0, Math.max(0, line - 1)).join("\n").length + (line > 1 ? 1 : 0);
  code.focus();
  code.setSelectionRange(pos, pos);
  code.scrollTop = Math.max(0, (line - 1) * 18.85 - 80);
  document.querySelector("#py-line-numbers").scrollTop = code.scrollTop;
  document.querySelector("#py-highlight").scrollTop = code.scrollTop;
  updatePyLineLabel();
}

async function runPyDoctorSyntax() {
  const code = document.querySelector("#py-code").value;
  pyodide.globals.set("wasm_py_doctor_code", code);
  const payload = await pyodide.runPythonAsync(`
import json
from syntax_doctor_py_core import PythonSyntaxAnalyzer
report = PythonSyntaxAnalyzer().analyze(wasm_py_doctor_code)
json.dumps({
    "errors": report.errors,
    "warnings": report.warnings,
    "info": report.info,
    "diagnostics": [
        {"level": d.level, "line": d.line, "message": d.message}
        for d in report.diagnostics
    ],
})
`);
  const report = JSON.parse(payload);
  renderPyAnalysis(report);
  pyLog(tf("analysisDone", { errors: report.errors, warnings: report.warnings }));
  return report;
}

async function executePythonPreview(code, stdinText) {
  if (!pyodide) throw new Error(t("pythonRuntimeNotReady"));
  pyodide.globals.set("wasm_py_preview_code", code);
  pyodide.globals.set("wasm_py_preview_stdin", stdinText || "");
  pyodide.globals.set("wasm_py_preview_input_error", t("pythonPreviewInputExhausted"));
  pyodide.globals.set("wasm_py_preview_loop_error", t("pythonPreviewLoopLimit"));
  pyodide.globals.set("wasm_py_preview_output_error", t("pythonPreviewOutputLimit"));
  const payload = await pyodide.runPythonAsync(`
import ast
import builtins
import contextlib
import io
import json
import sys
import traceback

code = wasm_py_preview_code
stdin_text = wasm_py_preview_stdin or ""
input_error = wasm_py_preview_input_error
loop_error = wasm_py_preview_loop_error
output_error = wasm_py_preview_output_error

class PreviewInputExhausted(RuntimeError):
    pass

class PreviewLoopLimit(RuntimeError):
    pass

class PreviewOutputLimit(RuntimeError):
    pass

class GuardedStringIO(io.StringIO):
    def __init__(self, max_chars=60000):
        super().__init__()
        self.max_chars = max_chars
        self.size = 0

    def write(self, value):
        self.size += len(value or "")
        if self.size > self.max_chars:
            raise PreviewOutputLimit(output_error)
        return super().write(value)

stdout = GuardedStringIO()
stderr = GuardedStringIO()
stdin = io.StringIO(stdin_text)
stdin_lines = iter(stdin_text.splitlines())
old_input = builtins.input
old_stdin = sys.stdin
preview_input_exhausted = False
preview_loop_steps = 0
preview_loop_limit = 20000
last_input_prompt = ""

def tns_preview_loop_guard(line=0):
    global preview_loop_steps
    preview_loop_steps += 1
    if preview_input_exhausted:
        raise PreviewInputExhausted(input_error)
    if preview_loop_steps > preview_loop_limit:
        raise PreviewLoopLimit(loop_error)

def tns_preview_exception_guard(line=0):
    if preview_input_exhausted:
        raise PreviewInputExhausted(input_error)

def preview_input(prompt=""):
    global preview_input_exhausted, last_input_prompt
    last_input_prompt = str(prompt or "")
    if prompt:
        print(prompt, end="")
    try:
        value = next(stdin_lines)
        print(value)
        return value
    except StopIteration as exc:
        preview_input_exhausted = True
        raise PreviewInputExhausted(input_error) from exc

class PreviewLoopInstrumenter(ast.NodeTransformer):
    def _with_guard(self, node):
        self.generic_visit(node)
        guard = ast.Expr(
            value=ast.Call(
                func=ast.Name(id="tns_preview_loop_guard", ctx=ast.Load()),
                args=[ast.Constant(getattr(node, "lineno", 0))],
                keywords=[],
            )
        )
        if node.body:
            guard = ast.copy_location(guard, node.body[0])
        node.body.insert(0, guard)
        return node

    def visit_For(self, node):
        return self._with_guard(node)

    def visit_While(self, node):
        return self._with_guard(node)

    def visit_ExceptHandler(self, node):
        self.generic_visit(node)
        guard = ast.Expr(
            value=ast.Call(
                func=ast.Name(id="tns_preview_exception_guard", ctx=ast.Load()),
                args=[ast.Constant(getattr(node, "lineno", 0))],
                keywords=[],
            )
        )
        if node.body:
            guard = ast.copy_location(guard, node.body[0])
        node.body.insert(0, guard)
        return node

namespace = {
    "__name__": "__main__",
    "tns_preview_loop_guard": tns_preview_loop_guard,
    "tns_preview_exception_guard": tns_preview_exception_guard,
}
success = True
error = None

try:
    builtins.input = preview_input
    sys.stdin = stdin
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        tree = ast.parse(code, filename="<python-preview>", mode="exec")
        tree = PreviewLoopInstrumenter().visit(tree)
        ast.fix_missing_locations(tree)
        exec(compile(tree, "<python-preview>", "exec"), namespace, namespace)
except BaseException as exc:
    success = False
    error = {
        "type": type(exc).__name__,
        "message": str(exc),
        "traceback": traceback.format_exc(),
    }
finally:
    builtins.input = old_input
    sys.stdin = old_stdin

json.dumps({
    "success": success,
    "waitingForInput": error is not None and error.get("type") == "PreviewInputExhausted",
    "inputPrompt": last_input_prompt,
    "stdout": stdout.getvalue(),
    "stderr": stderr.getvalue(),
    "error": error,
}, ensure_ascii=False)
`);
  return JSON.parse(payload);
}

function formatPythonPreviewResult(result) {
  const sections = [result.stdout || ""];
  if (result.stderr) sections.push(`\n[stderr]\n${result.stderr.trimEnd()}`);
  if (result.waitingForInput) {
    sections.push(`\n${t("pythonPreviewWaiting")}`);
    return sections.join("").trimStart();
  }
  if (result.error) {
    sections.push(`\nERROR ${result.error.type}: ${result.error.message}`);
    if (result.error.traceback) sections.push(`\nTRACEBACK\n${result.error.traceback.trimEnd()}`);
    return sections.join("").trimStart();
  }
  if (result.success) sections.push(`\n${t("pythonPreviewFinished")}`);
  if (!sections.join("").trim()) return t("pythonPreviewNoOutput");
  return sections.join("").trimStart();
}

async function openPyPreviewModal() {
  const code = document.querySelector("#py-code").value;
  const terminalInputs = [];
  let lastResult = null;
  let running = false;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal py-preview-modal">
      <h2>${escapeHtml(t("pythonPreviewTitle"))}</h2>
      <p class="muted-text">${escapeHtml(t("pythonPreviewIntro"))}</p>
      <h3>${escapeHtml(t("pythonPreviewOutput"))}</h3>
      <pre id="py-preview-output" class="py-preview-output">${escapeHtml(t("pythonPreviewReady"))}</pre>
      <label class="py-preview-label py-preview-terminal-label">
        <span>${escapeHtml(t("pythonPreviewInput"))}</span>
        <input id="py-preview-terminal-input" type="text" spellcheck="false" autocomplete="off" placeholder="${escapeHtml(t("pythonPreviewTerminalPlaceholder"))}">
      </label>
      <div class="modal-actions">
        <button type="button" id="py-preview-run">${escapeHtml(t("pythonPreviewRun"))}</button>
        <button type="button" id="py-preview-send">${escapeHtml(t("pythonPreviewSend"))}</button>
        <button type="button" id="py-preview-restart">${escapeHtml(t("pythonPreviewRestart"))}</button>
        <button type="button" id="py-preview-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);

  const terminalInput = backdrop.querySelector("#py-preview-terminal-input");
  const output = backdrop.querySelector("#py-preview-output");
  const runButton = backdrop.querySelector("#py-preview-run");
  const sendButton = backdrop.querySelector("#py-preview-send");
  const restartButton = backdrop.querySelector("#py-preview-restart");
  const setBusy = (busy) => {
    running = busy;
    runButton.disabled = busy;
    sendButton.disabled = busy || (lastResult && !lastResult.waitingForInput);
    restartButton.disabled = busy;
    terminalInput.disabled = busy || (lastResult && !lastResult.waitingForInput);
  };
  const scrollOutput = () => {
    output.scrollTop = output.scrollHeight;
  };
  const runWithHistory = async () => {
    setBusy(true);
    output.textContent = t("pythonPreviewRunning");
    try {
      const result = await executePythonPreview(code, terminalInputs.join("\n"));
      lastResult = result;
      output.textContent = formatPythonPreviewResult(result);
      pyLog(result.waitingForInput ? t("pythonPreviewWaiting") : (result.success ? t("pythonPreviewOk") : t("pythonPreviewFailed")));
      setBusy(false);
      scrollOutput();
      if (result.waitingForInput) terminalInput.focus();
    } catch (error) {
      output.textContent = `ERROR: ${error.stack || error.message}`;
      pyLog(`ERROR: ${error.message}`);
      lastResult = { success: false, waitingForInput: false, error };
      setBusy(false);
      scrollOutput();
    }
  };
  const sendInput = async () => {
    if (running) return;
    if (!lastResult) {
      await runWithHistory();
      return;
    }
    if (!lastResult.waitingForInput) return;
    terminalInputs.push(terminalInput.value);
    terminalInput.value = "";
    await runWithHistory();
  };
  const restart = async () => {
    terminalInputs.length = 0;
    lastResult = null;
    terminalInput.value = "";
    await runWithHistory();
  };

  runButton.addEventListener("click", runWithHistory);
  sendButton.addEventListener("click", sendInput);
  restartButton.addEventListener("click", restart);
  terminalInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    sendInput();
  });
  backdrop.querySelector("#py-preview-close").addEventListener("click", () => closeModal(backdrop));
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  });
  setBusy(false);
  if (!/\binput\s*\(|sys\.stdin|stdin\./.test(code)) await runWithHistory();
}

async function autoFixPyDoctor() {
  const code = document.querySelector("#py-code").value;
  pyodide.globals.set("wasm_py_doctor_code", code);
  const payload = await pyodide.runPythonAsync(`
import json
from syntax_doctor_py_core import PythonSyntaxAnalyzer
fixed, changes = PythonSyntaxAnalyzer().auto_fix(wasm_py_doctor_code)
json.dumps({"fixed": fixed, "changes": changes})
`);
  const result = JSON.parse(payload);
  pyDoctor.lastOriginal = code;
  pyDoctor.lastFixed = result.fixed;
  pyDoctor.lastChanges = result.changes || [];
  if (result.fixed !== code) {
    document.querySelector("#py-code").value = result.fixed;
    updateDoctorLineNumbers("py", pyDoctor.issueLines);
    updatePyLineLabel();
    updatePyHighlight();
    pyLog(t("autoFixApplied"));
  } else {
    pyLog(t("autoFixNoChanges"));
  }
  for (const change of pyDoctor.lastChanges) pyLog(change);
  await runPyDoctorSyntax();
}

function showPyChanges() {
  if (!pyDoctor.lastChanges.length || pyDoctor.lastOriginal === pyDoctor.lastFixed) {
    pyLog(t("noAutoFixChanges"));
    return;
  }
  const before = pyDoctor.lastOriginal.split("\n");
  const after = pyDoctor.lastFixed.split("\n");
  const lines = ["--- antes.py", "+++ despues.py"];
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i += 1) {
    if (before[i] !== after[i]) {
      if (before[i] !== undefined) lines.push(`- ${before[i]}`);
      if (after[i] !== undefined) lines.push(`+ ${after[i]}`);
    }
  }
  const win = window.open("", "_blank", "width=900,height=600");
  if (!win) return;
  win.document.write(`<pre style="white-space:pre-wrap;font:13px Consolas,monospace">${escapeHtml(lines.join("\n"))}</pre>`);
  win.document.close();
}

function aboutContent() {
  const content = {
  "es": {
    "title": "Acerca de TNS Tool WASM",
    "purposeTitle": "Proposito",
    "purpose1": "TNS Tool WASM es un entorno experimental e independiente disenado con la finalidad de facilitar la revision y edicion de codigo sin la necesidad estricta de ejecutar el software oficial de la calculadora en entornos no compatibles.",
    "purpose2": "Permite la conversion bidireccional entre archivos nativos de la calculadora (.tns) y scripts de Python (y viceversa), optimizando flujos de trabajo que originalmente requerian herramientas de consola complejas.",
    "devTitle": "Desarrollo e Interfaz",
    "devIntro": "Desarrollado e implementado por Andres Mauricio Chaparro Pena. Contribuciones clave en este port:",
    "devItems": [
      "Diseno y desarrollo completo de la interfaz grafica de usuario (UI/UX), transformando un entorno ortodoxo de comandos (CMD) en una suite visual accesible.",
      "Creacion de los modulos Syntax Doctor XML y Syntax Doctor PY: editores visuales dedicados a la inspeccion de errores de sintaxis y funciones de Auto Fix.",
      "Inmersion visual para el usuario mediante la replicacion exacta del esquema de colores de la pantalla de la calculadora TI-Nspire.",
      "Desarrollo del sistema de conversion bidireccional .tns a .py y de .py a .tns para la logica de Python Program.",
      "Implementacion del idioma frances para dar soporte y accesibilidad al gran sector de la comunidad oficial de TI que habla este idioma."
    ],
    "creditsTitle": "Creditos y Atribuciones de Ingenieria Inversa",
    "creditsIntro": "Este entorno web ha sido posible gracias a la documentacion previa y los algoritmos desarrollados por la comunidad de software libre de TI:",
    "reverseTitle": "Logica de Ingenieria Inversa:",
    "reverseText": "Los algoritmos internos de empaquetado y estructura base estan atribuidos al perfil de",
    "reverseText2": "basados en el proyecto abierto",
    "wasmTitle": "Concepto y Port Web (WASM):",
    "wasmText": "La idea original de portar estas librerias mediante WebAssembly y la mentoria tecnica inicial se atribuyen a Adriweb, quien propuso hacerlo disponible en cualquier entorno:",
    "wasmTail": "(coordinacion y soporte de arquitectura en Discord).",
    "disclaimer": "TNS Tool WASM es un proyecto de desarrollo de software independiente y no esta afiliado, patrocinado, autorizado ni asociado oficialmente con Texas Instruments.",
    "close": "Cerrar"
  },
  "en": {
    "title": "About TNS Tool WASM",
    "purposeTitle": "Purpose",
    "purpose1": "TNS Tool WASM is an experimental and independent environment designed to make code review and editing easier without strictly requiring the official calculator software in unsupported environments.",
    "purpose2": "It enables bidirectional conversion between native calculator files (.tns) and Python scripts, optimizing workflows that originally required complex command-line tools.",
    "devTitle": "Development and Interface",
    "devIntro": "Developed and implemented by Andres Mauricio Chaparro Pena. Key contributions in this port:",
    "devItems": [
      "Complete UI/UX design and development, transforming an orthodox command-line environment (CMD) into an accessible visual suite.",
      "Creation of Syntax Doctor XML and Syntax Doctor PY: visual editors dedicated to syntax-error inspection and Auto Fix features.",
      "Visual immersion for users by closely reproducing the TI-Nspire calculator screen color scheme.",
      "Development of the bidirectional .tns to .py and .py to .tns conversion system for Python Program logic.",
      "Implementation of French language support to improve accessibility for the large French-speaking sector of the official TI community."
    ],
    "creditsTitle": "Credits and Reverse Engineering Attributions",
    "creditsIntro": "This web environment was made possible by prior documentation and algorithms developed by the TI free-software community:",
    "reverseTitle": "Reverse Engineering Logic:",
    "reverseText": "The internal packaging algorithms and base structure are attributed to the profile",
    "reverseText2": "based on the open project",
    "wasmTitle": "Concept and Web Port (WASM):",
    "wasmText": "The original idea of porting these libraries through WebAssembly and the initial technical mentoring are attributed to Adriweb, who proposed making it available in any environment:",
    "wasmTail": "(coordination and architecture support on Discord).",
    "disclaimer": "TNS Tool WASM is an independent software-development project and is not affiliated with, sponsored by, authorized by, or officially associated with Texas Instruments.",
    "close": "Close"
  },
  "fr": {
    "title": "A propos de TNS Tool WASM",
    "purposeTitle": "Objectif",
    "purpose1": "TNS Tool WASM est un environnement experimental et independant concu pour faciliter la revision et l'edition de code sans devoir executer strictement le logiciel officiel de la calculatrice dans des environnements non compatibles.",
    "purpose2": "Il permet la conversion bidirectionnelle entre les fichiers natifs de la calculatrice (.tns) et les scripts Python, optimisant des flux de travail qui necessitaient a l'origine des outils complexes en ligne de commande.",
    "devTitle": "Developpement et Interface",
    "devIntro": "Developpe et implemente par Andres Mauricio Chaparro Pena. Contributions cles dans ce port :",
    "devItems": [
      "Conception et developpement complets de l'interface graphique (UI/UX), transformant un environnement orthodoxe en ligne de commande (CMD) en une suite visuelle accessible.",
      "Creation des modules Syntax Doctor XML et Syntax Doctor PY : editeurs visuels dedies a l'inspection des erreurs de syntaxe et aux fonctions Auto Fix.",
      "Immersion visuelle pour l'utilisateur grace a la reproduction fidele du schema de couleurs de l'ecran de la calculatrice TI-Nspire.",
      "Developpement du systeme de conversion bidirectionnelle .tns vers .py et .py vers .tns pour la logique Python Program.",
      "Implementation de la langue francaise afin de soutenir et d'ameliorer l'accessibilite pour le grand secteur francophone de la communaute officielle TI."
    ],
    "creditsTitle": "Credits et Attributions d'Ingenierie Inverse",
    "creditsIntro": "Cet environnement web a ete rendu possible grace a la documentation prealable et aux algorithmes developpes par la communaute du logiciel libre TI :",
    "reverseTitle": "Logique d'ingenierie inverse :",
    "reverseText": "Les algorithmes internes d'empaquetage et la structure de base sont attribues au profil",
    "reverseText2": "bases sur le projet ouvert",
    "wasmTitle": "Concept et Port Web (WASM) :",
    "wasmText": "L'idee originale de porter ces bibliotheques via WebAssembly et le mentorat technique initial sont attribues a Adriweb, qui a propose de le rendre disponible dans n'importe quel environnement :",
    "wasmTail": "(coordination et support d'architecture sur Discord).",
    "disclaimer": "TNS Tool WASM est un projet de developpement logiciel independant et n'est pas affilie, sponsorise, autorise ni officiellement associe a Texas Instruments.",
    "close": "Fermer"
  }
};
  return content[language] || content.es;
}

function showAbout() {
  const data = aboutContent();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal about-modal">
      <h2>${escapeHtml(data.title)}</h2>

      <h3>${escapeHtml(data.purposeTitle)}</h3>
      <p>${escapeHtml(data.purpose1)}</p>
      <p>${escapeHtml(data.purpose2)}</p>

      <h3>${escapeHtml(data.devTitle)}</h3>
      <p>${escapeHtml(data.devIntro)}</p>
      <ul>${data.devItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <div class="about-links">
        <a href="https://github.com/acewalt" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/in/andres-mauricio-walttoart/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>

      <h3>${escapeHtml(data.creditsTitle)}</h3>
      <p>${escapeHtml(data.creditsIntro)}</p>
      <ul>
        <li><strong>${escapeHtml(data.reverseTitle)}</strong> ${escapeHtml(data.reverseText)} <a href="https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=393033" target="_blank" rel="noopener noreferrer">MaksimirKurtov</a>, ${escapeHtml(data.reverseText2)} <a href="https://tiplanet.org/forum/viewtopic.php?t=27393&p=280845#p280845" target="_blank" rel="noopener noreferrer">TnsTools</a>.</li>
        <li><strong>${escapeHtml(data.wasmTitle)}</strong> ${escapeHtml(data.wasmText)} <a href="https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=1381" target="_blank" rel="noopener noreferrer">Adriweb</a> ${escapeHtml(data.wasmTail)}</li>
      </ul>

      <p class="about-disclaimer">${escapeHtml(data.disclaimer)}</p>

      <div class="modal-actions">
        <button type="button" id="about-close">${escapeHtml(data.close)}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  backdrop.querySelector("#about-close").addEventListener("click", () => closeModal(backdrop));
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  });
}

async function savePyDoctorBlock() {
  const code = document.querySelector("#py-code").value;
  if (pyDoctor.target?.mode === "xml-python") {
    const item = pyDoctor.target.item;
    await savePythonFileToStage(item, code);
    item.content = code;
    if (item.detail) item.detail.length = code.length;
    pyDoctor.lastOriginal = code;
    pyDoctor.lastFixed = code;
    pyLog(t("pyStageUpdated"));
    xmlLog(t("pyStageLogUpdated"));
    return;
  }
  document.querySelector("#py-inline").value = code;
  pyDoctor.lastOriginal = code;
  pyDoctor.lastFixed = code;
  pyLog(t("pyInlineUpdated"));
  log(t("pyInlineLogUpdated"));
}

function downloadPyDoctorFile() {
  downloadBytes("syntax_doctor.py", new TextEncoder().encode(document.querySelector("#py-code").value), "text/x-python");
  pyLog(t("pyFileDownloaded"));
}

function wireEvents() {
  document.querySelector("#about-btn").addEventListener("click", showAbout);
  document.querySelector("#theme-btn").addEventListener("click", () => applyTheme(theme === "dark" ? "light" : "dark"));
  for (const button of document.querySelectorAll("#language-buttons button")) {
    button.addEventListener("click", () => applyLanguage(button.dataset.lang));
  }
  document.querySelector("#home-open-xml").addEventListener("click", () => openExclusivePanel(panelForTool("xml")));
  document.querySelector("#home-open-normal").addEventListener("click", () => openExclusivePanel(panelForTool("normal")));
  document.querySelector("#home-open-python").addEventListener("click", () => openExclusivePanel(panelForTool("python")));
  for (const launcher of document.querySelectorAll("[data-open-target]")) {
    launcher.tabIndex = 0;
    launcher.setAttribute("role", "button");
    launcher.addEventListener("click", (event) => {
      if (event.target.closest("button, input, label, select, textarea, a")) return;
      toggleExclusivePanel(panelForTool(launcher.dataset.openTarget));
    });
    launcher.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleExclusivePanel(panelForTool(launcher.dataset.openTarget));
    });
  }
  document.querySelector("#normal-toggle-btn").addEventListener("click", () => {
    toggleExclusivePanel(panelForTool("normal"));
  });
  document.querySelector("#python-toggle-btn").addEventListener("click", () => {
    toggleExclusivePanel(panelForTool("python"));
  });
  document.querySelector("#decode-btn").addEventListener("click", () => decodeNormalTns().catch((err) => log(`ERROR: ${err.message}`)));
  document.querySelector("#build-xml-btn").addEventListener("click", () => buildNormalTns().catch((err) => log(`ERROR: ${err.message}`)));
  document.querySelector("#py-build-btn").addEventListener("click", () => buildPythonTns().catch((err) => log(`ERROR: ${err.message}`)));
  document.querySelector("#extract-btn").addEventListener("click", () => extractPython().catch((err) => log(`ERROR: ${err.message}`)));
  document.querySelector("#py-syntax-btn").addEventListener("click", () => analyzePython().catch((err) => log(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-toggle-btn").addEventListener("click", () => openPyDoctor().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-syntax-btn").addEventListener("click", () => runPyDoctorSyntax().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-preview-btn").addEventListener("click", () => openPyPreviewModal().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-autofix-btn").addEventListener("click", () => autoFixPyDoctor().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-changes-btn").addEventListener("click", showPyChanges);
  document.querySelector("#py-doctor-save-btn").addEventListener("click", () => savePyDoctorBlock().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-download-btn").addEventListener("click", downloadPyDoctorFile);
  document.querySelector("#py-code").addEventListener("input", () => {
    updateDoctorLineNumbers("py", pyDoctor.issueLines);
    updatePyLineLabel();
    updatePyHighlight();
  });
  document.querySelector("#py-code").addEventListener("scroll", () => {
    document.querySelector("#py-line-numbers").scrollTop = document.querySelector("#py-code").scrollTop;
    document.querySelector("#py-highlight").scrollTop = document.querySelector("#py-code").scrollTop;
    document.querySelector("#py-highlight").scrollLeft = document.querySelector("#py-code").scrollLeft;
  });
  document.querySelector("#py-code").addEventListener("click", updatePyLineLabel);
  document.querySelector("#py-code").addEventListener("keyup", updatePyLineLabel);
  document.querySelector("#xml-toggle-btn").addEventListener("click", () => {
    toggleExclusivePanel(panelForTool("xml"));
  });
  document.querySelector("#xml-tns-file").addEventListener("change", (event) => openTnsInXmlDoctor(event.target.files[0]).catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-file").addEventListener("change", (event) => loadXmlDoctorFiles([...event.target.files], "file").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-folder").addEventListener("change", (event) => loadXmlDoctorFiles([...event.target.files], "folder").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-new-btn").addEventListener("click", () => createNewXmlProject().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-program-editor").addEventListener("click", () => addPageFromFileMenu("program-editor").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-image").addEventListener("click", () => addPageFromFileMenu("image").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-python").addEventListener("click", () => addPageFromFileMenu("python").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-lua").addEventListener("click", () => addPageFromFileMenu("lua").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-spreadsheet").addEventListener("click", () => addPageFromFileMenu("spreadsheet").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-notepad").addEventListener("click", () => addPageFromFileMenu("notepad").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-graph").addEventListener("click", () => addPageFromFileMenu("graph").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#file-page-add-calculator").addEventListener("click", () => addPageFromFileMenu("calculator").catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-programs").addEventListener("change", (event) => selectXmlProgram(event.target.value));
  document.querySelector("#xml-code").addEventListener("input", () => {
    xmlDoctor.embedded = false;
    updateXmlLineNumbers();
  });
  document.querySelector("#xml-code").addEventListener("scroll", () => {
    document.querySelector("#xml-line-numbers").scrollTop = document.querySelector("#xml-code").scrollTop;
    document.querySelector("#xml-highlight").scrollTop = document.querySelector("#xml-code").scrollTop;
    document.querySelector("#xml-highlight").scrollLeft = document.querySelector("#xml-code").scrollLeft;
  });
  document.querySelector("#xml-code").addEventListener("click", updateXmlLineLabel);
  document.querySelector("#xml-code").addEventListener("keyup", updateXmlLineLabel);
  document.querySelector("#xml-syntax-btn").addEventListener("click", () => runXmlSyntax().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-autofix-btn").addEventListener("click", () => autoFixXml().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-format-btn").addEventListener("click", () => formatXmlCode().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-inspector-btn").addEventListener("click", () => openDocumentInspector().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-add-func-btn").addEventListener("click", () => addBasicFuncToStage().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-document-btn").addEventListener("click", openXmlDocumentSettings);
  document.querySelector("#xml-resolve-btn").addEventListener("click", () => resolveXmlProblems().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-changes-btn").addEventListener("click", showXmlChanges);
  document.querySelector("#xml-embed-btn").addEventListener("click", () => embedXmlCode().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-save-btn").addEventListener("click", () => saveXmlZip().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  document.querySelector("#xml-create-tns-btn").addEventListener("click", () => createTnsFromXmlDoctor().catch((err) => xmlLog(`ERROR: ${err.message}`)));
  wireToolMenus();
  wireDropZone();
  wireGlobalFileDropGuard();
  wireMouseGlow();
}

applyLanguage(language);
applyTheme(theme);
initializeStaticCodeEditors();
wireEvents();
initPyodideRuntime().catch((err) => {
  if (statusEl) statusEl.textContent = "Error";
  log(`ERROR inicializando WASM: ${err.stack || err.message}`);
});

