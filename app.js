const statusEl = document.querySelector("#runtime-status");
const logEl = document.querySelector("#log");
const SOURCE_VERSION = "2026-06-02-lua-template-builder-pages-local";

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
    runLuaSyntax: "Ejecutar sintaxis Lua",
    saveLuaXml: "Guardar Lua en XML",
    previewLua: "Preview Lua",
    luaGuide: "Guia Lua",
    luaTemplates: "Plantillas Lua",
    luaGuideSearch: "Buscar funciones, eventos o variables...",
    luaTemplatesIntro: "Elige una plantilla y ajusta sus opciones. Sin seleccion, reemplaza el script actual; con seleccion, reemplaza ese bloque.",
    luaInsertTemplate: "Insertar plantilla",
    luaInputCount: "Cantidad de inputs",
    luaTemplateTitle: "Titulo",
    luaButtonText: "Texto del boton",
    luaPrimaryColor: "Color principal",
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
    luaActionNone: "No navegar",
    luaButtonPosition: "Posicion de botones",
    luaUseThemeColor: "Usar color principal del proyecto",
    luaShowPrimaryButton: "Mostrar boton principal",
    luaShowDetailsButton: "Mostrar boton Detalles",
    luaShowBackButton: "Mostrar boton Volver",
    luaMenuRoutes: "Editar opciones y destinos",
    luaMenuOption: "Opcion",
    luaRouteDefault: "Siguiente pagina",
    luaBottom: "Inferior",
    luaTop: "Superior",
    luaSyntaxOk: "Sintaxis Lua basica OK.",
    luaSaved: "Lua guardado en staging. Use Guardar XML ZIP para descargarlo.",
    noEditablePrograms: "No se encontraron programas editables en el XML.",
    editableBlocksLoaded: "Cargados {count} bloques editables.",
    selectedProgram: "Programa seleccionado: {name}",
    luaScriptAdded: "Lua ScriptApp agregado en una nueva card.",
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
    pyFileDownloaded: "Archivo .py descargado.",
    viewValue: "Ver valor",
    viewXml: "Ver XML",
    viewDetails: "Ver detalle",
    close: "Cerrar",
    copyLog: "Copiar log",
    logCopied: "Log copiado al portapapeles.",
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
    runLuaSyntax: "Run Lua syntax",
    saveLuaXml: "Save Lua to XML",
    previewLua: "Preview Lua",
    luaGuide: "Lua guide",
    luaTemplates: "Lua templates",
    luaGuideSearch: "Search functions, events, or variables...",
    luaTemplatesIntro: "Choose a template and adjust its options. With no selection, it replaces the current script; with a selection, it replaces that block.",
    luaInsertTemplate: "Insert template",
    luaInputCount: "Input count",
    luaTemplateTitle: "Title",
    luaButtonText: "Button text",
    luaPrimaryColor: "Primary color",
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
    luaActionNone: "Do not navigate",
    luaButtonPosition: "Button position",
    luaUseThemeColor: "Use project main color",
    luaShowPrimaryButton: "Show primary button",
    luaShowDetailsButton: "Show Details button",
    luaShowBackButton: "Show Back button",
    luaMenuRoutes: "Edit options and destinations",
    luaMenuOption: "Option",
    luaRouteDefault: "Next page",
    luaBottom: "Bottom",
    luaTop: "Top",
    luaSyntaxOk: "Basic Lua syntax OK.",
    luaSaved: "Lua saved to staging. Use Save XML ZIP to download it.",
    noEditablePrograms: "No editable programs were found in the XML.",
    editableBlocksLoaded: "Loaded {count} editable blocks.",
    selectedProgram: "Selected program: {name}",
    luaScriptAdded: "Lua ScriptApp added in a new card.",
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
    pyFileDownloaded: ".py file downloaded.",
    viewValue: "View value",
    viewXml: "View XML",
    viewDetails: "View details",
    close: "Close",
    copyLog: "Copy log",
    logCopied: "Log copied to clipboard.",
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
    runLuaSyntax: "Analyser syntaxe Lua",
    saveLuaXml: "Enregistrer Lua dans XML",
    previewLua: "Apercu Lua",
    luaGuide: "Guide Lua",
    luaTemplates: "Modeles Lua",
    luaGuideSearch: "Rechercher fonctions, evenements ou variables...",
    luaTemplatesIntro: "Choisissez un modele et ajustez ses options. Sans selection, il remplace le script actuel; avec selection, il remplace ce bloc.",
    luaInsertTemplate: "Inserer le modele",
    luaInputCount: "Nombre de champs",
    luaTemplateTitle: "Titre",
    luaButtonText: "Texte du bouton",
    luaPrimaryColor: "Couleur principale",
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
    luaActionNone: "Ne pas naviguer",
    luaButtonPosition: "Position des boutons",
    luaUseThemeColor: "Utiliser la couleur principale du projet",
    luaShowPrimaryButton: "Afficher le bouton principal",
    luaShowDetailsButton: "Afficher le bouton Details",
    luaShowBackButton: "Afficher le bouton Retour",
    luaMenuRoutes: "Modifier options et destinations",
    luaMenuOption: "Option",
    luaRouteDefault: "Page suivante",
    luaBottom: "Inferieur",
    luaTop: "Superieur",
    luaSyntaxOk: "Syntaxe Lua basique OK.",
    luaSaved: "Lua enregistre dans staging. Utilisez Enregistrer ZIP XML pour le telecharger.",
    noEditablePrograms: "Aucun programme editable trouve dans le XML.",
    editableBlocksLoaded: "{count} blocs editables charges.",
    selectedProgram: "Programme selectionne : {name}",
    luaScriptAdded: "Lua ScriptApp ajoute dans une nouvelle carte.",
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
    pyFileDownloaded: "Fichier .py telecharge.",
    viewValue: "Voir valeur",
    viewXml: "Voir XML",
    viewDetails: "Voir detail",
    close: "Fermer",
    copyLog: "Copier log",
    logCopied: "Log copie dans le presse-papiers.",
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
  candidates: [],
  current: null,
  lastDiff: "",
  embedded: false,
  stagePrepared: false,
  lastReport: null,
  issueLines: new Map(),
};
const pyDoctor = {
  lastOriginal: "",
  lastFixed: "",
  lastChanges: [],
  lastReport: null,
  issueLines: new Map(),
};

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
  if (!zone) return;
  for (const eventName of ["dragenter", "dragover"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.add("dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (eventName === "dragleave" && event.relatedTarget && zone.contains(event.relatedTarget)) return;
      zone.classList.remove("dragging");
    });
  }
  zone.addEventListener("drop", (event) => {
    handleDroppedFiles(event.dataTransfer.files).catch((err) => log(`ERROR drop: ${err.stack || err.message}`));
  });
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
}

function setPyDoctorEnabled(enabled) {
  for (const id of ["py-doctor-save-btn", "py-doctor-download-btn", "py-doctor-syntax-btn", "py-doctor-autofix-btn", "py-doctor-changes-btn"]) {
    document.querySelector(`#${id}`).disabled = !enabled;
  }
  document.querySelector("#py-code").disabled = !enabled;
}

async function loadXmlDoctorFiles(files, mode) {
  if (!files.length) return;
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
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
summary = {"files": 0, "cards": 0, "widgets": 0, "lua_scripts": 0, "basic_blocks": 0, "symbols": 0}

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
            elif widget_type == "TI.Scratchpad":
                sp_ns = "urn:TI.Scratchpad"
                rows = []
                for erow in element.iter():
                    if namespace_uri(erow.tag) == sp_ns and local_name(erow.tag) == "erow":
                        entry = child_text(erow, sp_ns, "entr")
                        exact = child_text(erow, sp_ns, "exct")
                        display = child_text(erow, sp_ns, "disp")
                        rows.append(f"Entrada: {entry}\\nExacto: {exact}\\nResultado: {display}")
                content = "\\n\\n".join(rows)
                content_label = "Scratchpad"
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
        elif item.suffix.lower() == ".xml":
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

function buildDefaultLuaScriptApp() {
  return `platform.apilevel = '2.0'

local pages = {}
local currentPage = 1

function addPage(page)
  table.insert(pages, page)
end

local function goHome()
  currentPage = 1
  platform.window:invalidate()
end

local function goNext()
  if currentPage < #pages then
    currentPage = currentPage + 1
    platform.window:invalidate()
  end
end

addPage({
  name = "Inicio",
  paint = function(self, gc)
    local w = platform.window:width()
    local h = platform.window:height()
    gc:setColorRGB(245, 245, 245)
    gc:fillRect(0, 0, w, h)
    gc:setColorRGB(0, 0, 0)
    gc:setFont("sansserif", "b", 18)
    local title = "Hello Lua"
    gc:drawString(title, (w - gc:getStringWidth(title)) / 2, 62, "top")
    gc:setFont("sansserif", "r", 10)
    local subtitle = "Enter para continuar"
    gc:drawString(subtitle, (w - gc:getStringWidth(subtitle)) / 2, 96, "top")
    gc:setColorRGB(45, 147, 173)
    gc:fillRect((w - 120) / 2, h - 48, 120, 28)
    gc:setColorRGB(255, 255, 255)
    local label = "Siguiente"
    gc:drawString(label, (w - gc:getStringWidth(label)) / 2, h - 42, "top")
  end,
  enterKey = function(self)
    goNext()
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
  if currentPage > 1 then
    goHome()
  elseif pages[currentPage] and pages[currentPage].escapeKey then
    pages[currentPage]:escapeKey()
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
    if (/\bif\b/.test(line) && !/\bthen\b/.test(line)) {
      errors.push({ level: "ERROR", line: lineNumber, message: "If sin then" });
    }
    if (/\belseif\b/.test(line) && !/\bthen\b/.test(line)) {
      errors.push({ level: "ERROR", line: lineNumber, message: "Elseif sin then" });
    }
    if (/\bwhile\b/.test(line) && !/\bdo\b/.test(line)) {
      errors.push({ level: "ERROR", line: lineNumber, message: "While sin do" });
    }
    if (/\bfor\b/.test(line) && !/\bdo\b/.test(line)) {
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
  ["platform.apilevel", "Define el nivel de API Lua que el documento espera usar."],
  ["platform.window:width()", "Devuelve el ancho actual de la pantalla de la calculadora."],
  ["platform.window:height()", "Devuelve el alto actual de la pantalla de la calculadora."],
  ["platform.window:invalidate()", "Solicita repintar la pantalla y vuelve a llamar on.paint."],
  ["on.paint(gc)", "Evento principal de dibujo. Todo lo visual se renderiza aqui."],
  ["on.create()", "Se ejecuta al crear/iniciar el script Lua."],
  ["on.timer()", "Evento repetido cuando timer.start esta activo."],
  ["on.enterKey()", "Evento al presionar Enter."],
  ["on.escapeKey()", "Evento al presionar Esc."],
  ["on.arrowKey(direction)", "Evento de flechas. direction suele ser up, down, left o right."],
  ["on.charIn(ch)", "Recibe caracteres escritos por teclado."],
  ["gc:setColorRGB(r,g,b)", "Cambia el color para las siguientes operaciones graficas."],
  ["gc:setFont(family, style, size)", "Configura fuente, estilo y tamano antes de dibujar texto."],
  ["gc:drawString(text,x,y,pos)", "Dibuja texto en una coordenada. pos puede ser top, middle o baseline."],
  ["gc:getStringWidth(text)", "Calcula el ancho en pixeles de un texto con la fuente actual."],
  ["gc:drawRect(x,y,w,h)", "Dibuja el borde de un rectangulo."],
  ["gc:fillRect(x,y,w,h)", "Rellena un rectangulo."],
  ["gc:drawLine(x1,y1,x2,y2)", "Dibuja una linea entre dos puntos."],
  ["gc:drawArc(x,y,w,h,start,angle)", "Dibuja un arco o borde circular."],
  ["gc:fillArc(x,y,w,h,start,angle)", "Rellena un arco o circulo parcial."],
  ["timer.start(seconds)", "Activa eventos on.timer con intervalo aproximado."],
  ["timer.stop()", "Detiene el timer."],
  ["D2Editor.newRichText()", "Crea un editor nativo de texto enriquecido/matematico."],
  ["var.store(name,value)", "Guarda una variable CAS accesible desde el documento."],
  ["var.recall(name)", "Lee una variable CAS guardada en el documento."],
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

const LUA_PAGE_INSERT_MARKER = "-- [[TNS_TOOL_PAGES_END]]";

function luaTemplateActionSnippet(action, selfRef = "self") {
  if (action === "home") {
    return `currentPage = 1
  platform.window:invalidate()`;
  }
  if (action === "details") {
    return `${selfRef}.detailsOpen = true
  platform.window:invalidate()`;
  }
  if (action === "none") {
    return `platform.window:invalidate()`;
  }
  return `if currentPage < #pages then currentPage = currentPage + 1 end
  platform.window:invalidate()`;
}

function extractLuaPageOptions(code) {
  const pages = [];
  const pageRegex = /addPage\s*\(\s*\{[\s\S]*?name\s*=\s*(["'])(.*?)\1/g;
  let match;
  while ((match = pageRegex.exec(code || ""))) {
    pages.push({ index: pages.length + 1, name: match[2] || `Page ${pages.length + 1}` });
  }
  return pages;
}

function luaTemplateRouteSnippet(targetExpression = "target") {
  return `if ${targetExpression} and ${targetExpression} > 0 and ${targetExpression} <= #pages then
    currentPage = ${targetExpression}
  elseif currentPage < #pages then
    currentPage = currentPage + 1
  end
  platform.window:invalidate()`;
}

const LUA_TEMPLATE_PRESETS = [
  {
    id: "form",
    name: "Formulario con inputs",
    description: "Pantalla tipo calculadora con inputs, botones inferiores y panel opcional de detalles.",
    defaults: {
      inputCount: 3,
      title: "Formulario",
      buttonText: "Calcular",
      primaryColor: "#a3e635",
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
      const labels = Array.from({ length: count }, (_, index) => String.fromCharCode(97 + index));
      const action = luaTemplateActionSnippet(options.action);
      const buttonY = options.buttonPosition === "top" ? 26 : 188;
      const barY = options.buttonPosition === "top" ? 58 : 180;
      const showBack = options.showBackButton !== false;
      const showPrimary = options.showPrimaryButton !== false;
      const showDetails = options.showDetailsButton !== false;
      const rows = labels.map((label, index) => {
        const y = 42 + index * 28;
        return `  gc:drawString("${label}", 14, ${y + 4}, "top")
  gc:drawString(":", 70, ${y + 4}, "top")
  drawInput(gc, fields[${index + 1}], 82, ${y}, 158, 22)`;
      }).join("\n");
      const buttons = [
        showBack ? `  self:drawButton(gc, "◀ Retour", 8, ${buttonY}, 70)` : "",
        showPrimary ? `  gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
  gc:drawString("${luaString(options.buttonText)}", 112, ${buttonY + 6}, "top")` : "",
        showDetails ? `  self:drawButton(gc, "Detalles", 240, ${buttonY}, 70)` : "",
      ].filter(Boolean).join("\n");
      return `addPage({
  name = "${luaString(options.title)}",
  fields = {${labels.map((label) => `{label="${label}", value="", placeholder="${label}"}`).join(", ")}},
  focus = 1,
  detailsOpen = false,
  drawButton = function(self, gc, text, x, y, w)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(x, y, w, 24)
  gc:setColorRGB(128, 128, 128)
  gc:drawRect(x, y, w, 24)
  gc:setColorRGB(0, 0, 0)
  gc:drawString(text, x + 6, y + 5, "top")
  end,
  drawInput = function(self, gc, field, x, y, w, h)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(x, y, w, h)
  gc:setColorRGB(field.focused and ${primaryR} or 128, field.focused and ${primaryG} or 128, field.focused and ${primaryB} or 128)
  gc:drawRect(x, y, w, h)
  gc:setColorRGB(field.value == "" and 150 or 0, field.value == "" and 150 or 0, field.value == "" and 150 or 0)
  gc:drawString(field.value ~= "" and field.value or field.placeholder, x + 4, y + 3, "top")
  end,
  paint = function(self, gc)
  gc:setColorRGB(224, 224, 224)
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  gc:setFont("sansserif", "b", 10)
  gc:setColorRGB(0, 0, 0)
  gc:drawString("${luaString(options.title)}", 8, 8, "top")
  gc:setFont("sansserif", "r", 10)
  for i, field in ipairs(self.fields) do
    field.focused = i == self.focus
  end
${rows.replaceAll("drawInput(gc, fields[", "self:drawInput(gc, self.fields[")}
  gc:setColorRGB(128, 128, 128)
  gc:fillRect(8, ${barY}, 304, 2)
${buttons}
  if self.detailsOpen then
    gc:setColorRGB(255, 255, 255)
    gc:fillRect(42, 62, 230, 96)
    gc:setColorRGB(128, 128, 128)
    gc:drawRect(42, 62, 230, 96)
    gc:setColorRGB(0, 0, 0)
    gc:drawString("${luaString(options.title)}", 50, 70, "top")
    gc:drawString("Variables: ${luaString(options.variableBase || "var")}1..${luaString(options.variableBase || "var")}${count}", 50, 92, "top")
  end
  end,
  arrowKey = function(self, direction)
  if direction == "down" then self.focus = math.min(#self.fields, self.focus + 1) end
  if direction == "up" then self.focus = math.max(1, self.focus - 1) end
  platform.window:invalidate()
  end,
  charIn = function(self, ch)
  self.fields[self.focus].value = self.fields[self.focus].value .. ch
  platform.window:invalidate()
  end,
  backspaceKey = function(self)
  self.fields[self.focus].value = self.fields[self.focus].value:sub(1, -2)
  platform.window:invalidate()
  end,
  enterKey = function(self)
  ${action}
  end,
  escapeKey = function(self)
  if self.detailsOpen then self.detailsOpen = false else currentPage = 1 end
  platform.window:invalidate()
  end
})`;
    },
  },
  {
    id: "menu",
    name: "Menu de seleccion",
    description: "Lista vertical con cursor, ideal para categorias o acciones.",
    defaults: { inputCount: 4, title: "Menu", buttonText: "Enter", primaryColor: "#a3e635", useThemeColor: true, action: "next", variableBase: "selected_item", menuLabels: [], menuTargets: [] },
    build(options) {
      const count = Math.max(2, Math.min(10, Number(options.inputCount) || 4));
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor);
      const labels = Array.from({ length: count }, (_, index) => options.menuLabels?.[index] || `${index + 1}) Opcion ${index + 1} >`);
      const targets = Array.from({ length: count }, (_, index) => Number(options.menuTargets?.[index]) || 0);
      const items = labels.map((label) => `"${luaString(label)}"`).join(", ");
      const targetList = targets.join(", ");
      const fallbackAction = luaTemplateActionSnippet(options.action);
      return `addPage({
  name = "${luaString(options.title)}",
  selected = 1,
  items = {${items}},
  targets = {${targetList}},
  paint = function(self, gc)
  gc:setColorRGB(255, 255, 255)
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
    gc:setColorRGB(0, 0, 0)
    gc:drawString(item, 28, y, "top")
  end
  end,
  arrowKey = function(self, direction)
  if direction == "down" then self.selected = self.selected % #self.items + 1 end
  if direction == "up" then self.selected = self.selected == 1 and #self.items or self.selected - 1 end
  platform.window:invalidate()
  end,
  enterKey = function(self)
  var.store("${luaString(options.variableBase || "selected_item")}", self.selected)
  local target = self.targets[self.selected]
  if target and target > 0 then
    ${luaTemplateRouteSnippet("target")}
  else
    ${fallbackAction}
  end
  end
})`;
    },
  },
  {
    id: "popup",
    name: "Popup de texto",
    description: "Cuadro centrado con mensaje y boton OK.",
    defaults: { inputCount: 1, title: "Aviso", buttonText: "OK", primaryColor: "#a3e635", useThemeColor: true, action: "next", variableBase: "popup_ok" },
    build(options) {
      const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor, [37, 99, 235]);
      const action = luaTemplateActionSnippet(options.action);
      return `addPage({
  name = "${luaString(options.title)}",
  visible = true,
  paint = function(self, gc)
  gc:setColorRGB(238, 238, 238)
  gc:fillRect(0, 0, platform.window:width(), platform.window:height())
  if not self.visible then return end
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(104, 76, 112, 58)
  gc:setColorRGB(200, 200, 200)
  gc:fillRect(110, 82, 112, 58)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(104, 76, 112, 58)
  gc:setColorRGB(0, 0, 0)
  gc:drawString("${luaString(options.title)}", 112, 84, "top")
  gc:setColorRGB(${primaryR}, ${primaryG}, ${primaryB})
  gc:fillRect(132, 108, 54, 24)
  gc:setColorRGB(255, 255, 255)
  gc:drawString("${luaString(options.buttonText)}", 150, 113, "top")
  end,
  enterKey = function(self)
  self.visible = false
  var.store("${luaString(options.variableBase || "popup_ok")}", 1)
  ${action}
  end
})`;
    },
  },
];

function insertLuaTemplate(editor, text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  if (start === end) {
    const markerIndex = editor.value.indexOf(LUA_PAGE_INSERT_MARKER);
    if (markerIndex >= 0) {
      editor.value = `${editor.value.slice(0, markerIndex)}${text}\n\n${editor.value.slice(markerIndex)}`;
    } else {
      const scaffold = buildDefaultLuaScriptApp();
      const scaffoldMarkerIndex = scaffold.indexOf(LUA_PAGE_INSERT_MARKER);
      editor.value = `${scaffold.slice(0, scaffoldMarkerIndex)}${text}\n\n${scaffold.slice(scaffoldMarkerIndex)}`;
    }
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n" : "";
  const suffix = after && !text.endsWith("\n") ? "\n" : "";
  editor.value = `${before}${prefix}${text}${suffix}${after}`;
  const cursor = before.length + prefix.length + text.length;
  editor.focus();
  editor.setSelectionRange(cursor, cursor);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

function showLuaGuide() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal lua-library-modal">
      <h2>${escapeHtml(t("luaGuide"))}</h2>
      <input id="lua-guide-search" class="library-search" placeholder="${escapeHtml(t("luaGuideSearch"))}">
      <div id="lua-guide-list" class="lua-guide-list"></div>
      <div class="modal-actions">
        <button type="button" id="lua-guide-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const list = backdrop.querySelector("#lua-guide-list");
  const search = backdrop.querySelector("#lua-guide-search");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const items = LUA_GUIDE_ITEMS.filter(([name, description]) => `${name} ${description}`.toLowerCase().includes(query));
    list.innerHTML = items.map(([name, description]) => `
      <article class="lua-guide-item">
        <code>${escapeHtml(name)}</code>
        <p>${escapeHtml(description)}</p>
      </article>`).join("");
  };
  search.addEventListener("input", render);
  backdrop.querySelector("#lua-guide-close").addEventListener("click", () => closeModal(backdrop));
  render();
  search.focus();
}

function drawLuaTemplatePreview(canvas, template, options = template.defaults) {
  const ctx = canvas.getContext("2d");
  const scale = canvas.width / 318;
  const sx = (value) => value * scale;
  const sy = (value) => value * (canvas.height / 212);
  const [primaryR, primaryG, primaryB] = luaRgbFromHex(options.primaryColor);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = Math.max(1, scale);
  ctx.font = `${Math.max(8, sy(10))}px sans-serif`;

  const drawInput = (label, y, active = false) => {
    ctx.fillStyle = "#000";
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
    ctx.fillStyle = "#000";
    ctx.font = `bold ${Math.max(8, sy(10))}px sans-serif`;
    ctx.fillText(options.title || template.defaults.title, sx(8), sy(20));
    ctx.font = `${Math.max(8, sy(10))}px sans-serif`;
    const count = Math.max(1, Math.min(4, Number(options.inputCount) || template.defaults.inputCount));
    for (let index = 0; index < count; index += 1) drawInput(String.fromCharCode(97 + index), 42 + index * 28, index === 0);
    ctx.fillStyle = "#808080";
    ctx.fillRect(sx(8), sy(barY), sx(304), Math.max(1, sy(2)));
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    if (options.showBackButton !== false) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(8), sy(buttonY), sx(70), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(8), sy(buttonY), sx(70), sy(24));
      ctx.fillStyle = "#000";
      ctx.fillText("Retour", sx(16), sy(buttonY + 17));
    }
    if (options.showPrimaryButton !== false) {
      ctx.fillStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
      ctx.fillText(options.buttonText || template.defaults.buttonText, sx(112), sy(buttonY + 17));
    }
    if (options.showDetailsButton !== false) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx(240), sy(buttonY), sx(70), sy(24));
      ctx.strokeStyle = "#000";
      ctx.strokeRect(sx(240), sy(buttonY), sx(70), sy(24));
      ctx.fillStyle = "#000";
      ctx.fillText("Detalles", sx(248), sy(buttonY + 17));
    }
    return;
  }

  if (template.id === "menu") {
    ctx.fillStyle = "#fff";
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
      ctx.fillStyle = "#000";
      ctx.fillText(options.menuLabels?.[index] || `${index + 1}) Opcion ${index + 1} >`, sx(28), sy(y + 12));
    }
    return;
  }

  if (template.id === "popup") {
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fillRect(sx(110), sy(82), sx(112), sy(58));
    ctx.fillStyle = "#fff";
    ctx.fillRect(sx(104), sy(76), sx(112), sy(58));
    ctx.fillStyle = "#000";
    ctx.fillText(options.title || template.defaults.title, sx(112), sy(96));
    ctx.fillStyle = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
    ctx.fillRect(sx(132), sy(108), sx(54), sy(24));
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(8, sy(10))}px sans-serif`;
    ctx.fillText(options.buttonText || template.defaults.buttonText, sx(150), sy(124));
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

function showLuaTemplates(editor) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const visibleTemplates = LUA_TEMPLATE_PRESETS.filter((template) => template.id !== "details");
  const templateTabs = visibleTemplates.map((template) => `
    <button type="button" class="lua-template-type" data-template="${escapeHtml(template.id)}">
      <span class="template-type-icon">${template.id === "form" ? "▦" : template.id === "menu" ? "☷" : template.id === "popup" ? "▣" : "▤"}</span>
      <span>
        <strong>${escapeHtml(template.name)}</strong>
        <small>${escapeHtml(template.description)}</small>
      </span>
    </button>`).join("");
  backdrop.innerHTML = `
    <div class="modal lua-library-modal lua-template-builder-modal">
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
            <label>${escapeHtml(t("luaButtonText"))}<input id="tpl-button" value="Calcular"></label>
            <label>${escapeHtml(t("luaVariableBase"))}<input id="tpl-varbase" value="var"></label>
            <label>${escapeHtml(t("luaButtonAction"))}
              <select id="tpl-action">
                <option value="next">${escapeHtml(t("luaActionNext"))}</option>
                <option value="details">${escapeHtml(t("luaActionDetails"))}</option>
                <option value="home">${escapeHtml(t("luaActionHome"))}</option>
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
          </div>
          <div class="template-checks">
            <label class="template-check"><input id="tpl-use-theme" type="checkbox"> ${escapeHtml(t("luaUseThemeColor"))}</label>
            <label class="template-check form-only"><input id="tpl-show-primary" type="checkbox"> ${escapeHtml(t("luaShowPrimaryButton"))}</label>
            <label class="template-check form-only"><input id="tpl-show-details" type="checkbox"> ${escapeHtml(t("luaShowDetailsButton"))}</label>
            <label class="template-check form-only"><input id="tpl-show-back" type="checkbox"> ${escapeHtml(t("luaShowBackButton"))}</label>
          </div>
          <div id="tpl-menu-routes-wrap" class="menu-route-editor hidden">
            <h4>${escapeHtml(t("luaMenuRoutes"))}</h4>
            <div id="tpl-menu-routes"></div>
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
      <div class="modal-actions">
        <button type="button" id="lua-template-close">${escapeHtml(t("cancel"))}</button>
        <button type="button" id="lua-template-insert" class="green-tool-button">${escapeHtml(t("luaInsertTemplate"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  let selected = visibleTemplates[0];
  const existingPages = extractLuaPageOptions(editor.value);
  const themeColor = "#a3e635";
  const routeWrap = backdrop.querySelector("#tpl-menu-routes-wrap");
  const routeList = backdrop.querySelector("#tpl-menu-routes");
  const applyDefaults = () => {
    backdrop.querySelector("#tpl-input-count").value = selected.defaults.inputCount;
    backdrop.querySelector("#tpl-title").value = selected.defaults.title;
    backdrop.querySelector("#tpl-button").value = selected.defaults.buttonText;
    backdrop.querySelector("#tpl-color").value = selected.defaults.primaryColor;
    backdrop.querySelector("#tpl-use-theme").checked = selected.defaults.useThemeColor !== false;
    backdrop.querySelector("#tpl-action").value = selected.defaults.action || "next";
    backdrop.querySelector("#tpl-varbase").value = selected.defaults.variableBase || "var";
    backdrop.querySelector("#tpl-position").value = selected.defaults.buttonPosition || "bottom";
    backdrop.querySelector("#tpl-show-primary").checked = selected.defaults.showPrimaryButton !== false;
    backdrop.querySelector("#tpl-show-details").checked = selected.defaults.showDetailsButton !== false;
    backdrop.querySelector("#tpl-show-back").checked = selected.defaults.showBackButton !== false;
    renderRouteEditor();
  };
  const markSelected = () => {
    for (const button of backdrop.querySelectorAll(".lua-template-type")) {
      button.classList.toggle("selected", button.dataset.template === selected.id);
    }
    backdrop.querySelectorAll(".form-only").forEach((element) => element.classList.toggle("hidden", selected.id !== "form"));
    routeWrap.classList.toggle("hidden", selected.id !== "menu");
  };
  const renderRouteEditor = () => {
    if (!routeList) return;
    const count = Math.max(2, Math.min(10, Number(backdrop.querySelector("#tpl-input-count")?.value) || selected.defaults.inputCount || 4));
    routeList.innerHTML = Array.from({ length: count }, (_, index) => {
      const routeOptions = [`<option value="0">${escapeHtml(t("luaRouteDefault"))}</option>`]
        .concat(existingPages.map((page) => `<option value="${page.index}">${escapeHtml(`${page.index}. ${page.name}`)}</option>`))
        .join("");
      return `<div class="menu-route-row">
        <label>${escapeHtml(t("luaMenuOption"))} ${index + 1}<input data-menu-label="${index}" value="${escapeHtml(`${index + 1}) Opcion ${index + 1} >`)}"></label>
        <label>${escapeHtml(t("luaButtonAction"))}<select data-menu-target="${index}">${routeOptions}</select></label>
      </div>`;
    }).join("");
    for (const input of routeList.querySelectorAll("input, select")) {
      input.addEventListener("input", renderBuilder);
      input.addEventListener("change", renderBuilder);
    }
  };
  const currentOptions = () => ({
    inputCount: backdrop.querySelector("#tpl-input-count").value,
    title: backdrop.querySelector("#tpl-title").value || selected.defaults.title,
    buttonText: backdrop.querySelector("#tpl-button").value || selected.defaults.buttonText,
    primaryColor: backdrop.querySelector("#tpl-use-theme").checked ? themeColor : (backdrop.querySelector("#tpl-color").value || selected.defaults.primaryColor),
    useThemeColor: backdrop.querySelector("#tpl-use-theme").checked,
    action: backdrop.querySelector("#tpl-action").value || selected.defaults.action || "next",
    variableBase: backdrop.querySelector("#tpl-varbase").value || selected.defaults.variableBase || "var",
    buttonPosition: backdrop.querySelector("#tpl-position").value || selected.defaults.buttonPosition || "bottom",
    showPrimaryButton: backdrop.querySelector("#tpl-show-primary").checked,
    showDetailsButton: backdrop.querySelector("#tpl-show-details").checked,
    showBackButton: backdrop.querySelector("#tpl-show-back").checked,
    menuLabels: Array.from(routeList.querySelectorAll("[data-menu-label]")).map((input) => input.value),
    menuTargets: Array.from(routeList.querySelectorAll("[data-menu-target]")).map((input) => input.value),
  });
  const renderBuilder = () => {
    const options = currentOptions();
    backdrop.querySelector("#tpl-color").disabled = options.useThemeColor;
    drawLuaTemplatePreview(backdrop.querySelector("#tpl-main-preview"), selected, options);
    backdrop.querySelector("#lua-template-code").textContent = selected.build(options);
  };
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
      if (input.id === "tpl-input-count" && selected.id === "menu") renderRouteEditor();
      renderBuilder();
    });
    input.addEventListener("change", () => {
      if (input.id === "tpl-input-count" && selected.id === "menu") renderRouteEditor();
      renderBuilder();
    });
  }
  backdrop.querySelector("#lua-template-close").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#lua-template-copy-code").addEventListener("click", async () => {
    const code = backdrop.querySelector("#lua-template-code").textContent || "";
    await navigator.clipboard?.writeText(code).catch(() => {});
  });
  backdrop.querySelector("#lua-template-insert").addEventListener("click", () => {
    insertLuaTemplate(editor, selected.build(currentOptions()));
    closeModal(backdrop);
  });
  applyDefaults();
  markSelected();
  renderBuilder();
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
        <button type="button" id="lua-guide" class="secondary-button">${escapeHtml(t("luaGuide"))}</button>
        <button type="button" id="lua-templates" class="green-tool-button">${escapeHtml(t("luaTemplates"))}</button>
        <button type="button" id="lua-save" class="green-tool-button">${escapeHtml(t("saveLuaXml"))}</button>
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
  const editor = backdrop.querySelector("#lua-editor");
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
  backdrop.querySelector("#lua-guide").addEventListener("click", showLuaGuide);
  backdrop.querySelector("#lua-templates").addEventListener("click", () => showLuaTemplates(editor));
  backdrop.querySelector("#lua-preview").addEventListener("click", () => {
    const caret = editor.selectionStart;
    editor.setSelectionRange(caret, caret);
    editor.blur();
    window.getSelection?.()?.removeAllRanges?.();
    showLuaPreview(editor.value, item).catch((error) => {
      log.textContent += `\n[ERROR] Preview Lua: ${error.message}`;
    });
  });
  updateLines();
  updateHighlight();
  updateLabel();
  analyze();
  backdrop.querySelector("#lua-cancel").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#lua-save").addEventListener("click", async () => {
    try {
      const content = backdrop.querySelector("#lua-editor").value;
      await saveLuaScriptToStage(item, content);
      item.content = content;
      closeDocumentInspectorModals();
      closeModal(backdrop, () => {
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

async function createNewXmlProject() {
  clearDir(xmlDoctor.sourcePath);
  clearDir(xmlDoctor.stagePath);
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
  const nameError = tiDocumentNameError(xmlDoctor.current?.program_name || "");
  if (nameError) throw new Error(nameError);
  if (!xmlDoctor.embedded) await embedXmlCode();
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
  const rawName = xmlDoctor.current?.program_name || "documento";
  const safeName = rawName.normalize("NFD")
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
        <button type="button" id="lua-preview-copy-log">${escapeHtml(t("copyLog"))}</button>
        <button type="button" id="lua-preview-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const canvas = backdrop.querySelector("#lua-preview-canvas");
  const ctx = canvas.getContext("2d");
  const previewLog = backdrop.querySelector("#lua-preview-log");
  const textCapture = backdrop.querySelector("#lua-preview-input");
  const symbols = item ? await loadLuaPreviewSymbols(item).catch(() => ({})) : {};
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
  backdrop.querySelector("#lua-preview-copy-log").addEventListener("click", async () => {
    const text = previewLog.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      previewLog.textContent += `${previewLog.textContent ? "\n" : ""}${t("logCopied")}`;
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      previewLog.textContent += `${previewLog.textContent ? "\n" : ""}${t("logCopied")}`;
    }
    previewLog.scrollTop = previewLog.scrollHeight;
  });
  backdrop.querySelector("#lua-preview-close").addEventListener("click", () => {
    document.removeEventListener("keydown", keyHandler);
    closeModal(backdrop, () => runtime.close());
  });
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

async function loadLuaPreviewSymbols(item) {
  if (!item?.file || !window.pyodide) return {};
  pyodide.globals.set("wasm_lua_symbol_file", item.file);
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
variables = {}
functions = []
basic_functions = {}
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
json.dumps({"variables": variables, "functions": functions, "basicFunctions": basic_functions})
`);
  const raw = JSON.parse(payload);
  const convertValue = (value) => {
    if (Array.isArray(value)) return window.lua_newtable(value.map(convertValue));
    return value;
  };
  return {
    variables: Object.fromEntries(Object.entries(raw.variables || {}).map(([key, value]) => [key, convertValue(value)])),
    functions: raw.functions || [],
    basicFunctions: raw.basicFunctions || {},
  };
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

  const safeCode = decodeXmlTextEntities(code);
  const global = window;
  global.canvas = canvas;
  global.context = ctx;
  global.SCALE = 1;
  global._WIDTH = canvas.width;
  global._HEIGHT = canvas.height;
  global.G.str.on = global.lua_newtable();
  const previewGc = global.lua_newtable();
  const previewWindow = global.lua_newtable();
  attachLuaJsGc(previewGc, ctx, canvas);
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
  global.lua_tableset(global.G.str.platform, "window", previewWindow);

  const store = { ...symbols.variables };
  const basicFunctions = { ...(symbols.basicFunctions || {}) };
  const nativeEditors = [];
  const varTable = ensureLuaJsTable("var");
  const stringTable = ensureLuaJsTable("string");
  const mathTable = ensureLuaJsTable("math");
  const platformTable = ensureLuaJsTable("platform");
  const onTable = ensureLuaJsTable("on");
  const d2EditorTable = ensureLuaJsTable("D2Editor");
  global.G.str.platform = platformTable;
  global.G.str.on = onTable;
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
    canvas.width = canvas.width;
    global.context = canvas.getContext("2d");
    global.context.font = "20px Arial";
  }
  function repaint(shouldLog = false) {
    clear();
    try {
      global.callEvent("paint", gc());
      drawLuaJsNativeEditors(ctx, nativeEditors);
    } catch (error) {
      log(`ERROR repaint LuaJS: ${error.message}\n${compactStack(error)}`);
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
      log(`ERROR timer LuaJS: ${error.message}\n${compactStack(error)}`);
      if (timerId) window.clearInterval(timerId);
    }
  }
  function boot() {
    clear();
    try {
      global.callEvent("create", gc());
      global.callEvent("resize", canvas.width, canvas.height);
    } catch (error) {
      log(`ERROR boot LuaJS: ${error.message}\n${compactStack(error)}`);
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
      log(`ERROR evento LuaJS ${name}: ${error.message}\n${compactStack(error)}`);
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
      log(`ERROR tecla LuaJS ${char}: ${error.message}\n${compactStack(error)}`);
    }
  }
  function mouseClick(x, y) {
    try {
      global.callEvent("mouseDown", x, y);
      global.callEvent("mouseUp", x, y);
      repaint(true);
      log(`Click enviado a LuaJS: ${x},${y}`);
    } catch (error) {
      log(`ERROR click LuaJS ${x},${y}: ${error.message}\n${compactStack(error)}`);
    }
  }
  function close() {
    if (timerId) window.clearInterval(timerId);
  }
  return { boot, callEvent, charIn, mouseClick, close };
}

function hardenLuaJsPreviewRuntime() {
  const originalTableGet = window.lua_tableget;
  const originalTableSet = window.lua_tableset;
  const originalLen = window.lua_len;
  const originalConcat = window.lua_concat;
  const originalCall = window.lua_call;
  const originalLt = window.lua_lt;
  const originalLte = window.lua_lte;
  const emptyIterator = () => [null, null];
  window.lua_tableget = (table, key) => {
    if (table == null || table === false) return null;
    try {
      return originalTableGet(table, key);
    } catch (error) {
      if (/Table is null|Unable to index key/.test(String(error?.message || ""))) return null;
      throw error;
    }
  };
  window.lua_tableset = (table, key, value) => {
    if (table == null || table === false) return [];
    try {
      return originalTableSet(table, key, value);
    } catch (error) {
      if (/Table is null|Unable to index key/.test(String(error?.message || ""))) return [];
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
    window.G.str.pairs = (table) => {
      if (table == null || table === false || typeof table !== "object") {
        return [emptyIterator, window.lua_newtable(), null];
      }
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
      for (const key in table.bools || {}) props.push(key === "true");
      reorderLuaJsPairsProps(table, props);
      let cursor = 0;
      return [
        (target) => {
          while (cursor < props.length) {
            const key = props[cursor];
            cursor += 1;
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
  regex.lastIndex = start;
  const match = regex.exec(text);
  return match ? [match.index + 1, match.index + match[0].length] : [null];
}

function luaJsStringMatch(source, pattern, init) {
  const result = luaJsStringFind(source, pattern, init);
  if (result[0] == null) return [null];
  return [String(source ?? "").slice(result[0] - 1, result[1])];
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
    } else if (char === "(" || char === ")") {
      output += char;
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
    const arrowAssign = /^(.+?)(?:->|→)\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(statement);
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

function drawLuaJsNativeEditors(ctx, nativeEditors) {
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

function attachLuaJsGc(gcTable, ctx, canvas) {
  let fontSize = 12;
  const setColor = (r, g = r, b = r) => {
    ctx.fillStyle = `rgb(${Number(r) || 0}, ${Number(g) || 0}, ${Number(b) || 0})`;
    ctx.strokeStyle = ctx.fillStyle;
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
    ctx.fillText(String(text ?? ""), Number(x) || 0, (Number(y) || 0) + offset);
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
    ctx.fillRect(Number(x) || 0, Number(y) || 0, Number(w) || 0, Number(h) || 0);
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
  window.lua_tableset(gcTable, "getStringWidth", (_self, text) => [String(text ?? "").length * 7]);
  window.lua_tableset(gcTable, "getStringHeight", () => [fontSize]);
  window.lua_tableset(gcTable, "clipRect", () => []);
  window.lua_tableset(gcTable, "drawImage", () => []);
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
  const state = { rendered: 0, invalidated: false, timerActive: false, fontSize: 12, fontStyle: "r", lineWidth: 1 };
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

  return { boot, callEvent, close };
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
    ctx.fillRect(Number(args[0]) || 0, Number(args[1]) || 0, Number(args[2]) || 0, Number(args[3]) || 0);
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
    ctx.fillText(String(args[0] ?? ""), Number(args[1]) || 0, (Number(args[2]) || 0) + offset);
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

async function openDocumentInspector() {
  const data = await inspectXmlDocument();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const summary = data.summary || {};
  const sortedItems = [...(data.items || [])].sort((a, b) => {
    const rank = (item) => item.type === "Lua Script" ? 0 : item.type === "Widget" && item.name === "TI.ScriptApp" ? 1 : item.type === "Card" ? 2 : 3;
    return rank(a) - rank(b) || String(a.file).localeCompare(String(b.file)) || String(a.path).localeCompare(String(b.path));
  });
  const rows = sortedItems.map((item, index) => {
    const detail = item.detail ? Object.entries(item.detail).map(([key, value]) => `${key}: ${value}`).join(", ") : "";
    const contentAction = item.content
      ? item.type === "Lua Script"
        ? `<button type="button" class="mini-action view-action" data-index="${index}">${escapeHtml(t("openLua"))}</button><button type="button" class="mini-action edit-lua-action green-mini-action" data-index="${index}">${escapeHtml(t("editLua"))}</button>`
        : `<button type="button" class="mini-action view-action" data-index="${index}">${escapeHtml(item.content_label === "Scratchpad" ? t("viewDetails") : t("viewValue"))}</button>`
      : "";
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
      <div class="modal-actions">
        <button type="button" id="add-lua-widget" class="green-tool-button">${escapeHtml(t("addLuaWidget"))}</button>
        <button type="button" id="inspector-close">${escapeHtml(t("close"))}</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  backdrop.querySelector("#inspector-close").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#add-lua-widget").addEventListener("click", async () => {
    try {
      const item = await addLuaScriptAppToStage();
      showLuaEditor(item);
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
  for (const button of backdrop.querySelectorAll(".edit-lua-action")) {
    button.addEventListener("click", () => {
      const item = sortedItems[Number(button.dataset.index)];
      showLuaEditor(item);
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
  for (const diag of report.diagnostics) {
    const effectiveLine = diag.line || inferredXmlDiagnosticLine(diag);
    if (effectiveLine) {
      const previous = xmlDoctor.issueLines.get(effectiveLine);
      if (diag.severity === "ERROR" || previous !== "ERROR") {
        xmlDoctor.issueLines.set(effectiveLine, diag.severity);
      }
    }
    const row = document.createElement("tr");
    row.className = diag.severity;
    row.dataset.line = effectiveLine || "";
    const code = diag.code_label || (diag.code ? `${diag.severity === "WARNING" ? "W" : "E"}${diag.code}` : "");
    row.innerHTML = `<td>${severityLabel(diag.severity)}</td><td>${effectiveLine || "-"}</td><td>${translateProblemText(diag.message, diag.detail, code)}</td>`;
    row.addEventListener("dblclick", () => goToXmlLine(Number(row.dataset.line)));
    body.append(row);
  }
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
  if (!xmlDoctor.embedded) {
    await embedXmlCode();
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
  log("Extrayendo q.py...");
  const code = await pyodide.runPythonAsync(`
from pathlib import Path
import tns_reader
data = Path("/work/extract.tns").read_bytes()
entries = tns_reader.parse_central_directory(data)
for entry in entries:
    if entry.name == "q.py":
        result = tns_reader.extract_entry(data, entry).decode("utf-8")
        break
else:
    raise ValueError("No se encontro q.py")
result
`);
  downloadBytes(`${file.name.replace(/\\.tns$/i, "")}.py`, new TextEncoder().encode(code), "text/x-python");
  log("q.py descargado.");
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

async function openPyDoctor() {
  const panel = document.querySelector("#py-doctor-panel");
  panel.classList.toggle("collapsed");
  syncToggleLabels();
  if (panel.classList.contains("collapsed")) return;

  const code = await getPythonCode().catch(() => document.querySelector("#py-inline").value || "");
  document.querySelector("#py-code").value = code;
  pyDoctor.lastOriginal = code;
  pyDoctor.lastFixed = code;
  pyDoctor.lastChanges = [];
  pyDoctor.issueLines.clear();
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
  for (const diag of report.diagnostics || []) {
    if (diag.line) {
      const previous = pyDoctor.issueLines.get(diag.line);
      if (diag.level === "error" || previous !== "error") {
        pyDoctor.issueLines.set(diag.line, diag.level);
      }
    }
    const row = document.createElement("tr");
    row.className = String(diag.level || "").toUpperCase();
    row.dataset.line = diag.line || "";
    row.innerHTML = `<td>${severityLabel(diag.level)}</td><td>${diag.line || "-"}</td><td>${translateProblemText(diag.message)}</td>`;
    row.addEventListener("dblclick", () => goToPyLine(Number(row.dataset.line)));
    body.append(row);
  }
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

function savePyDoctorBlock() {
  const code = document.querySelector("#py-code").value;
  document.querySelector("#py-inline").value = code;
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
  document.querySelector("#py-doctor-autofix-btn").addEventListener("click", () => autoFixPyDoctor().catch((err) => pyLog(`ERROR: ${err.message}`)));
  document.querySelector("#py-doctor-changes-btn").addEventListener("click", showPyChanges);
  document.querySelector("#py-doctor-save-btn").addEventListener("click", savePyDoctorBlock);
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
  wireMouseGlow();
}

applyLanguage(language);
applyTheme(theme);
wireEvents();
initPyodideRuntime().catch((err) => {
  if (statusEl) statusEl.textContent = "Error";
  log(`ERROR inicializando WASM: ${err.stack || err.message}`);
});

