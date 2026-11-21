// Shared guide reference data. Examples and compatibility metadata follow below.
export const legacyGuideItems = [
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

export const guideVersion = '0.1.46';
const tr = (es, en, fr) => ({ es, en, fr });
export const guideCategories = [
  ['basics',tr('Lua básico','Lua basics','Bases Lua')],
  ['strings',tr('Cadenas','Strings','Chaînes')],
  ['tables',tr('Tablas','Tables','Tables')],
  ['math',tr('Matemáticas','Mathematics','Mathématiques')],
  ['events',tr('Eventos TI','TI events','Événements TI')],
  ['graphics',tr('Gráficos TI','TI graphics','Graphismes TI')],
  ['cas',tr('Variables y CAS','Variables and CAS','Variables et CAS')],
  ['state',tr('Timers y estados','Timers and state','Timers et états')],
  ['love',tr('LÖVE','LÖVE','LÖVE')],
  ['bridge',tr('Equivalencias','Equivalents','Équivalences')],
].map(([id,label])=>({id,label}));
export const localize = (value,language='en') => typeof value === 'string' ? value : value?.[language] || value?.en || '';
const tiExample = body => `platform.apilevel = "2.0"\n\nfunction on.paint(gc)\n    gc:setFont("sansserif", "r", 10)\n${body.split('\n').map(line=>'    '+line).join('\n')}\nend`;
const printExample = body => tiExample(`local lines = {}\nlocal function out(value) lines[#lines+1] = tostring(value) end\n${body}\nfor i, line in ipairs(lines) do gc:drawString(line, 8, i*20, "top") end`);
const reference = 'https://education.ti.com/html/webhelp/EG_TINspireLUA/EN/content/eg_splash_page/splash_luaapiguide.htm';
const luaReference = 'https://www.lua.org/manual/5.1/manual.html';
const additional = [
  ['local-functions','local / for / function','basics',tr('Variables locales, bucles y funciones.','Local variables, loops and functions.','Variables locales, boucles et fonctions.'),printExample('local function square(x) return x*x end\nfor i=1,3 do out(square(i)) end')],
  ['string-gmatch','string.gmatch(text, pattern)','strings',tr('Devuelve un iterador; cada llamada entrega la siguiente coincidencia o captura.','Returns an iterator; each call yields the next match or capture.','Renvoie un itérateur ; chaque appel produit la correspondance ou capture suivante.'),tiExample('local y = 20\nfor word in string.gmatch("Hola Mundo Lua", "%S+") do\n    gc:drawString(word, 10, y, "top")\n    y = y + 25\nend')],
  ['string-find','string.find(text, pattern, init, plain)','strings',tr('Devuelve las posiciones inicial y final y las capturas. plain=true busca texto literal.','Returns start/end positions and captures. plain=true searches literal text.','Renvoie les positions et les captures. plain=true cherche le texte littéral.'),printExample('local a,b,n = string.find("ID 123", "(%d+)")\nout(a) out(b) out(n)')],
  ['string-match','string.match(text, pattern, init)','strings',tr('Devuelve capturas o la coincidencia completa; nil si no encuentra.','Returns captures or the entire match; nil when absent.','Renvoie les captures ou la correspondance entière ; nil sinon.'),printExample('out(string.match("temperature=25", "(%d+)"))')],
  ['string-gsub','string.gsub(text, pattern, replacement, limit)','strings',tr('Sustituye coincidencias y devuelve el texto y el número de cambios.','Replaces matches and returns text and replacement count.','Remplace les correspondances et renvoie le texte et leur nombre.'),printExample('local text,n = string.gsub("a1 b2", "(%a)(%d)", "%2%1")\nout(text) out(n)')],
  ['string-format','string.format(format, ...)','strings',tr('Formato numérico y de texto: %s, %d, %.2f, %q y %%.','Number and text formatting: %s, %d, %.2f, %q and %%.','Format numérique et texte : %s, %d, %.2f, %q et %%.'),printExample('out(string.format("T=%.2f C", 23.456))')],
  ['table-sequence','table.insert / table.remove / ipairs','tables',tr('Edita y recorre secuencias con índices desde 1.','Edits and iterates sequences indexed from 1.','Modifie et parcourt des séquences indexées à partir de 1.'),printExample('local values = {3,1,2}\ntable.insert(values,4)\ntable.remove(values,1)\nfor i,v in ipairs(values) do out(i..": "..v) end')],
  ['table-sort','table.sort(values, compare)','tables',tr('Ordena una secuencia; el comparador opcional devuelve un booleano.','Sorts a sequence; the optional comparator returns a boolean.','Trie une séquence ; le comparateur facultatif renvoie un booléen.'),printExample('local values = {3,1,2}\ntable.sort(values)\nout(table.concat(values, ", "))')],
  ['table-pairs','pairs / next','tables',tr('Recorre claves y valores; el orden de pairs no está garantizado.','Iterates keys and values; pairs order is unspecified.','Parcourt clés et valeurs ; l’ordre de pairs n’est pas garanti.'),printExample('local values = {mass=2, speed=3}\nfor k,v in pairs(values) do out(k.."="..v) end')],
  ['math-trig','math.sin / math.cos / math.rad / math.deg','math',tr('La trigonometría Lua usa radianes, independientemente del modo del documento.','Lua trigonometry uses radians independently of document mode.','La trigonométrie Lua utilise les radians indépendamment du mode du document.'),printExample('out(math.sin(math.rad(30)))\nout(math.deg(math.pi))')],
  ['math-random','math.random / math.randomseed','math',tr('Genera números pseudoaleatorios; fija una semilla para pruebas reproducibles.','Generates pseudorandom numbers; seed for repeatable tests.','Génère des nombres pseudo-aléatoires ; fixer une graine pour les tests.'),printExample('math.randomseed(42)\nout(math.random(1,6))\nout(math.sqrt(16))')],
  ['math-eval','math.eval(expression)','cas',tr('Envía una cadena al CAS y devuelve un valor Lua compatible y un posible error.','Sends a string to CAS and returns a compatible Lua value and a possible error.','Envoie une chaîne au CAS et renvoie une valeur Lua compatible et une erreur éventuelle.'),'platform.apilevel="2.0"\nlocal result="Enter"\nfunction on.enterKey()\n local value,err=math.eval("1+1")\n result=value and tostring(value) or tostring(err)\n platform.window:invalidate()\nend\nfunction on.paint(gc) gc:drawString(result,8,20,"top") end'],
  ['math-evalstr','math.evalStr(expression)','cas',tr('Devuelve el resultado simbólico como texto; conserva y revisa el segundo retorno de error.','Returns symbolic output as text; keep and inspect the second error return.','Renvoie le résultat symbolique en texte ; vérifier le second retour d’erreur.'),'platform.apilevel="2.0"\nlocal result="Enter"\nfunction on.enterKey()\n local value,err=math.evalStr("factor(x^2-1)")\n result=value or tostring(err)\n platform.window:invalidate()\nend\nfunction on.paint(gc) gc:drawString(result,8,20,"top") end'],
  ['cas-integral','math.evalStr: integral / solve / deSolve','cas',tr('Prueba operaciones simbólicas desde un evento, después de la inicialización.','Tests symbolic operations from an event after initialization.','Teste les opérations symboliques depuis un événement après l’initialisation.'),'platform.apilevel="2.0"\nlocal result="Enter"\nfunction on.enterKey()\n local value,err=math.evalStr("deSolve(y\'=x*y,x,y)")\n result=value or tostring(err)\n platform.window:invalidate()\nend\nfunction on.paint(gc) gc:drawString(result,8,20,"top") end'],
  ['protected-call','pcall / xpcall','basics',tr('Intercepta errores; comprueba el booleano antes de leer el resultado.','Catches errors; check the boolean before reading results.','Intercepte les erreurs ; vérifier le booléen avant le résultat.'),printExample('local ok,value = pcall(function() return 12/3 end)\nout(ok) out(value)')],
  ['lua-coroutine','coroutine.create / resume / yield','state',tr('Corutinas Lua. LuaJS aún no permite suspender y reanudar la pila JavaScript.','Lua coroutines. LuaJS cannot yet suspend/resume the JavaScript stack.','Coroutines Lua. LuaJS ne peut pas encore suspendre/reprendre la pile JavaScript.'),printExample('local co=coroutine.create(function() coroutine.yield(1) return 2 end)\nlocal ok,value=coroutine.resume(co)\nout(ok) out(value)')],
  ['lua-gc','collectgarbage(option)','state',tr('El recolector de Lua y el heap JavaScript son distintos; Preview informa esta limitación.','Lua garbage collection and the JavaScript heap differ; Preview reports this limitation.','Le ramasse-miettes Lua et le tas JavaScript diffèrent ; l’aperçu signale cette limite.'),printExample('out(collectgarbage("count"))')],
  ['string-dump','string.dump(function)','strings',tr('Genera bytecode Lua en Lua 5.1; LuaJS no puede generar ese formato.','Emits Lua bytecode in Lua 5.1; LuaJS cannot emit that format.','Produit le bytecode Lua en Lua 5.1 ; LuaJS ne peut pas produire ce format.'),printExample('out(string.dump(function() return 1 end))')],
];
const snippets = {
  'platform.apilevel':tiExample('gc:drawString("API 2.0",8,20,"top")'),
  'platform.window:width':printExample('out(platform.window:width())'),
  'platform.window:height':printExample('out(platform.window:height())'),
  'platform.window:invalidate':'local n=0\nfunction on.enterKey() n=n+1 platform.window:invalidate() end\nfunction on.paint(gc) gc:drawString(tostring(n),8,20,"top") end',
  'gc:setColorRGB':tiExample('gc:setColorRGB(35,120,220)\ngc:fillRect(10,10,80,40)'),
  'gc:setFont':tiExample('gc:setFont("sansserif","b",12)\ngc:drawString("Bold",8,20,"top")'),
  'gc:drawString':tiExample('gc:drawString("Hello Lua",8,20,"top")'),
  'gc:getStringWidth':printExample('out(gc:getStringWidth("Hello"))'),
  'gc:drawRect':tiExample('gc:drawRect(10,10,80,40)'),
  'gc:fillRect':tiExample('gc:fillRect(10,10,80,40)'),
  'gc:drawLine':tiExample('gc:drawLine(10,10,90,50)'),
  'gc:drawArc':tiExample('gc:drawArc(10,10,80,40,0,180)'),
  'gc:fillArc':tiExample('gc:fillArc(10,10,80,40,0,180)'),
  'timer.start':'local n=0\nfunction on.create() timer.start(0.5) end\nfunction on.timer() n=n+1 platform.window:invalidate() end\nfunction on.paint(gc) gc:drawString(tostring(n),8,20,"top") end',
  'timer.stop':'local n=0\nfunction on.create() timer.start(0.5) end\nfunction on.timer() n=n+1 platform.window:invalidate() end\nfunction on.enterKey() timer.stop() end\nfunction on.paint(gc) gc:drawString(tostring(n),8,20,"top") end',
  'D2Editor.newRichText':'local editor\nfunction on.create() editor=D2Editor.newRichText() editor:move(8,8) editor:resize(200,80) editor:setText("Hello") editor:setVisible(true) end\nfunction on.paint(gc) gc:drawString("D2Editor",8,110,"top") end',
  'var.store':'local value="Enter"\nfunction on.enterKey() var.store("guide_value",42) value=tostring(var.recall("guide_value")) platform.window:invalidate() end\nfunction on.paint(gc) gc:drawString(value,8,20,"top") end',
  'os.time':printExample('out(os.time())\nout(os.clock())'),
};
snippets['var.recall']=snippets['var.store'];
const categoryFor = item => item.category==='bridge'?'bridge':item.category==='love'?'love':item.name.startsWith('on.')?'events':item.name.startsWith('gc:')?'graphics':item.name.startsWith('timer.')||item.name.startsWith('os.')?'state':item.name.startsWith('var.')||item.name.startsWith('D2Editor')?'cas':'basics';
const baseName = name => name.split('(')[0].trim();
function legacyExample(item) {
  const name=baseName(item.name);
  if(snippets[name])return snippets[name];
  if(name.startsWith('on.')){
    if(name==='on.paint')return tiExample('gc:drawString("Hello Lua",8,20,"top")');
    const event=name==='on.arrowKey'?'on.arrowKey(direction)':name==='on.charIn'?'on.charIn(ch)':name+'()';
    return `local result="Ready"\nfunction ${event} result="${name}" platform.window:invalidate() end\nfunction on.paint(gc) gc:drawString(result,8,20,"top") end`;
  }
  return null;
}
const legacy = legacyGuideItems.map((item,index)=>({
  ...item,id:'ti-guide-'+item.name.replace(/[^a-z0-9]+/gi,'-').replace(/-$/,''),category:categoryFor(item),example:legacyExample(item),
  api:baseName(item.name),reference:item.category==='love'?'https://love2d.org/wiki/love':reference,
}));
export const apiCatalog = [...additional.map(([id,name,category,description,example])=>({id,name,category,description,example,api:baseName(name),reference:['basics','strings','tables','math','state'].includes(category)?luaReference:reference})),...legacy];

export const compatibilityNotes = {
  preview:tr('Ejemplo verificable en Preview; comprueba también el resultado en tu TI.','Example can be tried in Preview; also check the result on your TI.','Exemple testable dans l’aperçu ; vérifier aussi le résultat sur votre TI.'),
  reference:tr('Referencia de API; no hay prueba aislada para esta entrada.','API reference; this entry has no isolated test.','Référence API ; cette entrée n’a pas de test isolé.'),
  unsupported:tr('No compatible con LuaJS 0.1.46. Se informa un error explícito.','Unsupported in LuaJS 0.1.46. An explicit error is reported.','Non pris en charge par LuaJS 0.1.46. Une erreur explicite est signalée.'),
  cas:tr('El CAS del Preview puede ordenar o simplificar de otra manera. Ejecuta desde un evento; math.evalStr devuelve texto y math.eval puede rechazar resultados simbólicos.','Preview CAS may reorder or simplify differently. Call from an event; math.evalStr returns text and math.eval may reject symbolic results.','Le CAS de l’aperçu peut réordonner ou simplifier autrement. Appeler depuis un événement ; math.evalStr renvoie du texte et math.eval peut rejeter un résultat symbolique.'),
  time:tr('os.clock mide tiempo transcurrido en Preview, no tiempo de CPU.','os.clock measures elapsed time in Preview, not CPU time.','os.clock mesure le temps écoulé dans l’aperçu, pas le temps CPU.'),
};
export function explanationFor(item) {
  const api=item.api;
  if(['lua-coroutine','lua-gc','string-dump'].includes(item.id))return {parameters:item.name,result:item.description,errors:compatibilityNotes.unsupported};
  if(item.category==='strings')return {
    parameters:tr('text: cadena de entrada. pattern: patrón Lua 5.1 (%a, %d, %s, capturas entre paréntesis); no es una expresión regular JavaScript. init es un índice desde 1.','text: input string. pattern: Lua 5.1 pattern (%a, %d, %s, parenthesized captures), not a JavaScript regular expression. init is a 1-based index.','text : chaîne d’entrée. pattern : motif Lua 5.1 (%a, %d, %s, captures entre parenthèses), pas une expression régulière JavaScript. init est un indice à partir de 1.'),
    result:item.description,
    errors:tr('Comprueba nil cuando no hay coincidencia. En gsub, %1 hace referencia a una captura y %% a un porcentaje. gmatch debe consumirse como iterador; una búsqueda vacía también debe avanzar.','Check nil when no match exists. In gsub, %1 references a capture and %% a percent sign. Consume gmatch as an iterator; empty matches must also advance.','Vérifier nil en l’absence de correspondance. Dans gsub, %1 désigne une capture et %% un pourcentage. Consommer gmatch comme itérateur ; les correspondances vides doivent aussi avancer.'),
  };
  if(item.category==='cas')return {
    parameters:api.startsWith('math.eval')?tr('expression: texto en sintaxis TI, por ejemplo "factor(x^2-1)". Llama desde un evento después de inicializar.','expression: TI syntax string, for example "factor(x^2-1)". Call from an event after initialization.','expression : chaîne en syntaxe TI, par exemple "factor(x^2-1)". Appeler depuis un événement après initialisation.'):tr('Usa los nombres y argumentos de la firma. var comparte las variables del problema; D2Editor crea su propio editor de texto.','Use names and arguments from the signature. var shares problem variables; D2Editor creates its own text editor.','Utiliser les noms et arguments de la signature. var partage les variables du problème ; D2Editor crée son propre éditeur de texte.'),
    result:item.description,
    errors:tr('No ignores el segundo retorno de error. math.eval puede devolver nil para expresiones simbólicas; usa math.evalStr si necesitas texto. El orden algebraico del resultado puede variar.','Do not ignore the second error return. math.eval may return nil for symbolic expressions; use math.evalStr for text. Algebraic result order can differ.','Ne pas ignorer le second retour d’erreur. math.eval peut renvoyer nil pour une expression symbolique ; utiliser math.evalStr pour le texte. L’ordre algébrique peut varier.'),
  };
  if(item.category==='graphics')return {
    parameters:tr('Coordenadas en píxeles del área de la app; w/h son ancho/alto. setColorRGB usa componentes de 0 a 255. drawString admite alineación vertical, por ejemplo "top".','Coordinates are pixels in the app area; w/h mean width/height. setColorRGB uses components from 0 to 255. drawString accepts vertical alignment, for example "top".','Les coordonnées sont en pixels dans l’application ; w/h sont largeur/hauteur. setColorRGB utilise des composantes de 0 à 255. drawString accepte l’alignement vertical, par exemple "top".'),
    result:item.description,
    errors:tr('Dibuja dentro de on.paint(gc) y usa el tamaño actual de platform.window; una app agrupada tiene menos espacio. Los ángulos de gc:drawArc están en grados.','Draw inside on.paint(gc) and use current platform.window dimensions; grouped apps have less space. gc:drawArc angles are degrees.','Dessiner dans on.paint(gc) avec les dimensions actuelles de platform.window ; une application groupée a moins d’espace. Les angles de gc:drawArc sont en degrés.'),
  };
  if(item.category==='tables')return {parameters:tr('La tabla es una secuencia con índices desde 1 o un mapa de claves. El comparador de sort debe devolver un booleano.','The table is a sequence indexed from 1 or a key map. A sort comparator must return a boolean.','La table est une séquence indexée à partir de 1 ou une table associative. Le comparateur de sort doit renvoyer un booléen.'),result:item.description,errors:tr('Evita huecos nil en secuencias. pairs no garantiza un orden; usa ipairs o una lista de claves ordenadas si lo necesitas.','Avoid nil holes in sequences. pairs does not guarantee order; use ipairs or sorted keys when required.','Éviter les trous nil dans les séquences. pairs ne garantit pas d’ordre ; utiliser ipairs ou des clés triées si nécessaire.')};
  if(item.category==='events'||api.startsWith('timer.'))return {parameters:tr('Define el callback con la firma indicada. timer.start recibe segundos; on.paint recibe el contexto gráfico gc.','Define the callback using the shown signature. timer.start takes seconds; on.paint receives graphics context gc.','Définir le callback avec la signature indiquée. timer.start reçoit des secondes ; on.paint reçoit le contexte graphique gc.'),result:item.description,errors:tr('Cambia el estado desde el evento y solicita platform.window:invalidate(). Evita bucles bloqueantes; detén el timer cuando ya no sea necesario.','Change state from an event and request platform.window:invalidate(). Avoid blocking loops; stop the timer when no longer needed.','Modifier l’état depuis un événement et demander platform.window:invalidate(). Éviter les boucles bloquantes ; arrêter le timer devenu inutile.')};
  return {parameters:tr('Los argumentos se muestran en la firma; el ejemplo es independiente y no sustituye tu programa.','Arguments are shown in the signature; the example is isolated and does not replace your program.','Les arguments figurent dans la signature ; l’exemple est isolé et ne remplace pas votre programme.'),result:item.description,errors:tr('Consulta Comparar para ver los límites de Preview y la referencia oficial para la API completa. No presupongas compatibilidad por el mero hecho de que el código tenga sintaxis válida.','See Compare for Preview limits and the official reference for the complete API. Valid syntax alone does not establish compatibility.','Voir Comparer pour les limites de l’aperçu et la référence officielle pour l’API complète. Une syntaxe valide ne suffit pas à établir la compatibilité.')};
}
export function compatibilityFor(item,report) {
  const api=item.api.replace(/\(.*/,''),prefix=api.split(' / ')[0];
  const short=prefix.replace(/^(string|table|math)\./,'');
  const suite=prefix.startsWith('string.')?/CADENAS|PATRONES|FORMATO/:prefix.startsWith('table.')?/TABLAS/:prefix.startsWith('math.')?/MATEMATICAS/:null;
  const checks=(report?.tests||[]).filter(test=>test.name===prefix||test.name.startsWith(prefix+' ')||test.name.startsWith(prefix+'(')||suite?.test(test.suite)&&(test.name===short||test.name.startsWith(short+' ')));
  const unsupported=['lua-coroutine','lua-gc','string-dump'].includes(item.id);
  return {status:unsupported?'unsupported':item.example?'preview':'reference',note:unsupported?compatibilityNotes.unsupported:item.category==='cas'?compatibilityNotes.cas:api.startsWith('os.clock')||api==='os.time'?compatibilityNotes.time:compatibilityNotes[item.example?'preview':'reference'],checks,version:checks.length?report.version:null};
}
// Strip comments and quoted/long strings before matching calls, so examples in
// prose do not count as APIs actually used by the open ScriptApp.
export function usedApis(source,catalog=apiCatalog) {
  const clean=String(source).replace(/--\[(=*)\[[\s\S]*?\]\1\]|--[^\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,' ');
  return catalog.filter(item=>{
    const names=item.api.split(/\s*\/\s*/).map(name=>name.trim()).filter(name=>/^[\w.:]+$/.test(name));
    return names.some(name=>new RegExp('(?:^|[^\\w.])'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(?:\\(|=)').test(clean));
  });
}
