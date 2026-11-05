# Jerarquía completa del Editor de programas — TI-Nspire CX CAS

**Origen:** grabación facilitada. **Lenguaje:** TI-Basic.

**Convenciones:** `→` indica el código o plantilla asociada; `[acción del editor]` es una operación de interfaz sin código ejecutable; `[fragmento Hub]` es un token o texto que se usa dentro de órdenes `Send`, `Read` o similares. Los puntos suspensivos en plantillas significan parámetros pendientes.

**Precisión:** «Transferencias» en TI-Basic se refiere al flujo de ejecución, no al intercambio de datos.

## 1. Acciones

- **1. Nuevo...** — **[acción del editor, sin código]**
- **2. Abrir...** — **[acción del editor, sin código]**
- **3. Importar...** — **[acción del editor, sin código]**
- **4. Ver...** — **[acción del editor, sin código]**
- **5. Crear copia...** — **[acción del editor, sin código]**
- **6. Renombrar...** — **[acción del editor, sin código]**
- **7. Cambiar acceso a librería...** — **[acción del editor, sin código]**
  - Nota: Configura el acceso: Ninguno, LibPriv o LibPub; no es una instrucción TI-Basic
- **8. Comentar/descomentar (Ctrl+T)** — **[acción del editor, sin código]**
  - Nota: Alterna comentario de línea; no es una función ejecutable
- **9. Encontrar... (Ctrl+F)** — **[acción del editor, sin código]**
- **A. Encontrar y reemplazar... (Ctrl+H)** — **[acción del editor, sin código]**
- **B. Ir a la línea... (Ctrl+G)** — **[acción del editor, sin código]**
- **C. Regresar** — **[acción del editor, sin código]**
- **D. Cerrar** — **[acción del editor, sin código]**

## 2. Verificar Sintaxis y Almacenar

- **1. Verificar sintaxis y almacenar (Ctrl+B)** — **[acción del editor, sin código]**
- **2. Verificar sintaxis** — **[acción del editor, sin código]**
- **3. Ejecutar (Ctrl+R)** — **[acción del editor, sin código]**

## 3. Definir variables

- **1. Local** → `Local a,b`
- **2. Define** → `Define f(x)=x^2`
- **3. Borrar variable** → `DelVar a`
- **4. Func...EndFunc** → `Define f(x)= ⏎ Func ⏎   Return x^2 ⏎ EndFunc`
- **5. Prgm...EndPrgm** → `Define p()= ⏎ Prgm ⏎   Disp "Hola" ⏎ EndPrgm`
- **6. Bloquear**
  - **1. Bloquear variable** → `Lock a`
  - **2. Desbloquear variable** → `Unlock a`
  - **3. Obtener info de bloqueo** → `getLockInfo(a)`

## 4. Control

- **1. If** → `If x>0:Disp "Positivo"`
- **2. If...Then...EndIf** → `If x>0 Then ⏎   Disp "Positivo" ⏎ EndIf`
- **3. If...Then...Else...EndIf** → `If x>0 Then ⏎   Disp "Positivo" ⏎ Else ⏎   Disp "Otro" ⏎ EndIf`
- **4. ElseIf...Then** → `ElseIf x=0 Then`
  - Nota: Se utiliza dentro de un bloque If
- **5. For...EndFor** → `For i,1,10 ⏎   Disp i ⏎ EndFor`
- **6. While...EndWhile** → `While x<10 ⏎   x+1→x ⏎ EndWhile`
- **7. Loop...EndLoop** → `Loop ⏎   ... ⏎ EndLoop`
- **8. Try...Else...EndTry** → `Try ⏎   ... ⏎ Else ⏎   ... ⏎ EndTry`
- **9. ClrErr** → `ClrErr`
- **A. PassErr** → `PassErr`
- **B. errCode** → `errCode`
- **C. warnCodes** → `warnCodes`
- **D. Wait** → `Wait 1`

## 5. Transferencias

> Estas instrucciones transfieren el CONTROL de ejecución; no transfieren datos.

- **1. Return** → `Return valor`
- **2. Cycle** → `Cycle`
- **3. Exit** → `Exit`
- **4. Lbl** → `Lbl inicio`
- **5. GoTo Lbl** → `Goto inicio`
- **6. Stop** → `Stop`

## 6. E/S

- **1. Disp** → `Disp "Resultado",r`
- **2. DispAt** → `DispAt 1,"Mensaje"`
- **3. Request** → `Request "Número:",n`
- **4. RequestStr** → `RequestStr "Nombre:",s`
- **5. Text** → `Text "Mensaje"`
- **6. getKey** → `getKey()`
- **7. Get** → `Get n`
  - Nota: Normalmente se utiliza para leer desde TI-Innovator
- **8. GetStr** → `GetStr s`
- **9. Send** → `Send "SET LIGHT ON"`
- **A. RefreshProbeVars** → `RefreshProbeVars`

## 7. Modo

> Las opciones numeradas 1-8 son accesos directos que insertan setMode(grupo,valor).

- **1. Mostrar dígitos**
  - **1. Flotante** → `setMode(1,1)`
  - **2. Flotante1** → `setMode(1,2)`
  - **3. Flotante2** → `setMode(1,3)`
  - **4. Flotante3** → `setMode(1,4)`
  - **5. Flotante4** → `setMode(1,5)`
  - **6. Flotante5** → `setMode(1,6)`
  - **7. Flotante6** → `setMode(1,7)`
  - **8. Flotante7** → `setMode(1,8)`
  - **9. Flotante8** → `setMode(1,9)`
  - **A. Flotante9** → `setMode(1,10)`
  - **B. Flotante10** → `setMode(1,11)`
  - **C. Flotante11** → `setMode(1,12)`
  - **D. Flotante12** → `setMode(1,13)`
  - **E. Fijo0** → `setMode(1,14)`
  - **F. Fijo1** → `setMode(1,15)`
  - **G. Fijo2** → `setMode(1,16)`
  - **H. Fijo3** → `setMode(1,17)`
  - **I. Fijo4** → `setMode(1,18)`
  - **J. Fijo5** → `setMode(1,19)`
  - **K. Fijo6** → `setMode(1,20)`
  - **L. Fijo7** → `setMode(1,21)`
  - **M. Fijo8** → `setMode(1,22)`
  - **N. Fijo9** → `setMode(1,23)`
  - **O. Fijo10** → `setMode(1,24)`
  - **P. Fijo11** → `setMode(1,25)`
  - **Q. Fijo12** → `setMode(1,26)`
- **2. Ángulos**
  - **1. Radián** → `setMode(2,1)`
  - **2. Grado** → `setMode(2,2)`
  - **3. Gradián** → `setMode(2,3)`
- **3. Formato exponencial**
  - **1. Normal** → `setMode(3,1)`
  - **2. Científico** → `setMode(3,2)`
  - **3. Ingeniería** → `setMode(3,3)`
- **4. Real o complejo**
  - **1. Real** → `setMode(4,1)`
  - **2. Rectangular** → `setMode(4,2)`
  - **3. Polar** → `setMode(4,3)`
- **5. Auto o aprox**
  - **1. Auto** → `setMode(5,1)`
  - **2. Aproximado** → `setMode(5,2)`
  - **3. Exacto** → `setMode(5,3)`
- **6. Formato de vector**
  - **1. Rectangular** → `setMode(6,1)`
  - **2. Cilíndrico** → `setMode(6,2)`
  - **3. Esférico** → `setMode(6,3)`
- **7. Base**
  - **1. Decimal** → `setMode(7,1)`
  - **2. Hexadecimal** → `setMode(7,2)`
  - **3. Binario** → `setMode(7,3)`
- **8. Sistema de unidades**
  - **1. SI** → `setMode(8,1)`
  - **2. Inglés (EE. UU.)** → `setMode(8,2)`
- **9. Obtener modo** → `getMode(0)`
  - Nota: getMode(0) devuelve configuración global; getMode(n) consulta el grupo n
- **A. Obtener información de idioma** → `getLangInfo()`
- **B. Obtener información de la plataforma** → `getPlatform()`

## 8. Hub

> Incluye macros/fragmentos para TI-Innovator Hub y Rover. Códigos con «...» son plantillas, no instrucciones listas para ejecutar.

- **1. Send "SET"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **LIGHT** → `Send "SET LIGHT ..."` **[fragmento/token]**
  - **COLOR** → `Send "SET COLOR ..."` **[fragmento/token]**
  - **SOUND** → `Send "SET SOUND ..."` **[fragmento/token]**
  - **LED** → `Send "SET LED ..."` **[fragmento/token]**
  - **RGB** → `Send "SET RGB ..."` **[fragmento/token]**
  - **SPEAKER** → `Send "SET SPEAKER ..."` **[fragmento/token]**
  - **POWER** → `Send "SET POWER ..."` **[fragmento/token]**
  - **SERVO.CONTINUOUS** → `Send "SET SERVO.CONTINUOUS ..."` **[fragmento/token]**
  - **ANALOG.OUT** → `Send "SET ANALOG.OUT ..."` **[fragmento/token]**
  - **VIB.MOTOR** → `Send "SET VIB.MOTOR ..."` **[fragmento/token]**
  - **COLOR.RED** → `Send "SET COLOR.RED ..."` **[fragmento/token]**
  - **COLOR.GREEN** → `Send "SET COLOR.GREEN ..."` **[fragmento/token]**
  - **COLOR.BLUE** → `Send "SET COLOR.BLUE ..."` **[fragmento/token]**
  - **BUZZER** → `Send "SET BUZZER ..."` **[fragmento/token]**
  - **RELAY** → `Send "SET RELAY ..."` **[fragmento/token]**
  - **SERVO** → `Send "SET SERVO ..."` **[fragmento/token]**
  - **SQUAREWAVE** → `Send "SET SQUAREWAVE ..."` **[fragmento/token]**
  - **DIGITAL.OUT** → `Send "SET DIGITAL.OUT ..."` **[fragmento/token]**
  - **AVERAGING** → `Send "SET AVERAGING ..."` **[fragmento/token]**
  - **BBPORT** → `Send "SET BBPORT ..."` **[fragmento/token]**
  - **Send "SET"** → `Send "SET"`
- **2. Send "READ"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **BRIGHTNESS** → `Send "READ BRIGHTNESS ..."` **[fragmento/token]**
  - **DHT** → `Send "READ DHT ..."` **[fragmento/token]**
  - **RANGER** → `Send "READ RANGER ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "READ LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "READ TEMPERATURE ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "READ MOISTURE ..."` **[fragmento/token]**
  - **MAGNETIC** → `Send "READ MAGNETIC ..."` **[fragmento/token]**
  - **VERNIER** → `Send "READ VERNIER ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "READ ANALOG.IN ..."` **[fragmento/token]**
  - **DIGITAL.IN** → `Send "READ DIGITAL.IN ..."` **[fragmento/token]**
  - **SWITCH** → `Send "READ SWITCH ..."` **[fragmento/token]**
  - **BUTTON** → `Send "READ BUTTON ..."` **[fragmento/token]**
  - **MOTION** → `Send "READ MOTION ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "READ POTENTIOMETER ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "READ THERMISTOR ..."` **[fragmento/token]**
  - **AVERAGING** → `Send "READ AVERAGING ..."` **[fragmento/token]**
  - **RGB** → `Send "READ RGB ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "READ LOUDNESS ..."` **[fragmento/token]**
  - **BBPORT** → `Send "READ BBPORT ..."` **[fragmento/token]**
  - **Send "READ"** → `Send "READ"`
- **3. Settings**
  - **ON** → `ON` **[fragmento/token]**
  - **OFF** → `OFF` **[fragmento/token]**
  - **TO** → `TO` **[fragmento/token]**
  - **TIME** → `TIME` **[fragmento/token]**
  - **BLINK** → `BLINK` **[fragmento/token]**
  - **TEMPERATURE** → `TEMPERATURE` **[fragmento/token]**
  - **HUMIDITY** → `HUMIDITY` **[fragmento/token]**
  - **CW** → `CW` **[fragmento/token]**
  - **CCW** → `CCW` **[fragmento/token]**
  - **NAMED** → `NAMED` **[fragmento/token]**
  - **PULLDOWN** → `PULLDOWN` **[fragmento/token]**
  - **INPUT** → `INPUT` **[fragmento/token]**
  - **PH** → `PH` **[fragmento/token]**
  - **FORCE10** → `FORCE10` **[fragmento/token]**
  - **FORCE50** → `FORCE50` **[fragmento/token]**
  - **PRESSURE** → `PRESSURE` **[fragmento/token]**
  - **PRESSURE2** → `PRESSURE2` **[fragmento/token]**
  - **TEMPO** → `TEMPO` **[fragmento/token]**
  - **PATTERN** → `PATTERN` **[fragmento/token]**
  - **AND** → `AND` **[fragmento/token]**
  - **RATE** → `RATE` **[fragmento/token]**
- **4. Wait** → `Wait 1`
- **5. Get** → `Get valor`
- **6. eval(** → `eval(expresión)`
- **7. Rover (RV)**
  - Nota: Submenús TI-Innovator Rover; hay cadenas Send y datos Read/GET, no funciones directas RV.
  - **1. Drive RV**
    - **FORWARD** → `FORWARD` **[fragmento/token]**
    - **BACKWARD** → `BACKWARD` **[fragmento/token]**
    - **LEFT** → `LEFT` **[fragmento/token]**
    - **RIGHT** → `RIGHT` **[fragmento/token]**
    - **STOP** → `STOP` **[fragmento/token]**
    - **RESUME** → `RESUME` **[fragmento/token]**
    - **STAY** → `STAY` **[fragmento/token]**
  - **2. Read RV Sensors**
    - **RV.RANGER** → `RV.RANGER` **[fragmento/token]**
    - **RV.COLORINPUT** → `RV.COLORINPUT` **[fragmento/token]**
    - **RV.COLORINPUT.RED** → `RV.COLORINPUT.RED` **[fragmento/token]**
    - **RV.COLORINPUT.GREEN** → `RV.COLORINPUT.GREEN` **[fragmento/token]**
    - **RV.COLORINPUT.BLUE** → `RV.COLORINPUT.BLUE` **[fragmento/token]**
    - **RV.COLORINPUT.GRAY** → `RV.COLORINPUT.GRAY` **[fragmento/token]**
  - **3. RV Settings**
    - **SPEED** → `SPEED` **[fragmento/token]**
    - **TIME** → `TIME` **[fragmento/token]**
    - **DISTANCE** → `DISTANCE` **[fragmento/token]**
    - **UNITS/S** → `UNITS/S` **[fragmento/token]**
    - **M/S** → `M/S` **[fragmento/token]**
    - **REVS/S** → `REVS/S` **[fragmento/token]**
    - **UNITS** → `UNITS` **[fragmento/token]**
    - **M** → `M` **[fragmento/token]**
    - **REVS** → `REVS` **[fragmento/token]**
    - **DEGREES** → `DEGREES` **[fragmento/token]**
    - **RADIANS** → `RADIANS` **[fragmento/token]**
    - **GRADS** → `GRADS` **[fragmento/token]**
    - **XYLINE** → `XYLINE` **[fragmento/token]**
    - **LEFT** → `LEFT` **[fragmento/token]**
    - **RIGHT** → `RIGHT` **[fragmento/token]**
    - **BRAKE** → `BRAKE` **[fragmento/token]**
    - **COAST** → `COAST` **[fragmento/token]**
    - **CW** → `CW` **[fragmento/token]**
    - **CCW** → `CCW` **[fragmento/token]**
  - **4. Read RV Path**
    - **RV.WAYPOINT.XYTHDRN** → `RV.WAYPOINT.XYTHDRN` **[fragmento/token]**
    - **RV.WAYPOINT.PREV** → `RV.WAYPOINT.PREV` **[fragmento/token]**
    - **RV.WAYPOINT.CMDNUM** → `RV.WAYPOINT.CMDNUM` **[fragmento/token]**
    - **RV.PATHLIST.X** → `RV.PATHLIST.X` **[fragmento/token]**
    - **RV.PATHLIST.Y** → `RV.PATHLIST.Y` **[fragmento/token]**
    - **RV.PATHLIST.TIME** → `RV.PATHLIST.TIME` **[fragmento/token]**
    - **RV.PATHLIST.HEADING** → `RV.PATHLIST.HEADING` **[fragmento/token]**
    - **RV.PATHLIST.DISTANCE** → `RV.PATHLIST.DISTANCE` **[fragmento/token]**
    - **RV.PATHLIST.REVS** → `RV.PATHLIST.REVS` **[fragmento/token]**
    - **RV.PATHLIST.CMDNUM** → `RV.PATHLIST.CMDNUM` **[fragmento/token]**
    - **RV.WAYPOINT.X** → `RV.WAYPOINT.X` **[fragmento/token]**
    - **RV.WAYPOINT.Y** → `RV.WAYPOINT.Y` **[fragmento/token]**
    - **RV.WAYPOINT.TIME** → `RV.WAYPOINT.TIME` **[fragmento/token]**
    - **RV.WAYPOINT.HEADING** → `RV.WAYPOINT.HEADING` **[fragmento/token]**
    - **RV.WAYPOINT.DISTANCE** → `RV.WAYPOINT.DISTANCE` **[fragmento/token]**
    - **RV.WAYPOINT.REVS** → `RV.WAYPOINT.REVS` **[fragmento/token]**
  - **5. RV Color**
    - **RV.COLOR** → `RV.COLOR` **[fragmento/token]**
    - **RV.COLOR.RED** → `RV.COLOR.RED` **[fragmento/token]**
    - **RV.COLOR.GREEN** → `RV.COLOR.GREEN` **[fragmento/token]**
    - **RV.COLOR.BLUE** → `RV.COLOR.BLUE` **[fragmento/token]**
  - **6. RV Setup**
    - **RV.POSITION** → `RV.POSITION` **[fragmento/token]**
    - **RV.GYRO** → `RV.GYRO` **[fragmento/token]**
    - **RV.GRID.ORIGIN** → `RV.GRID.ORIGIN` **[fragmento/token]**
    - **RV.GRID.M/UNIT** → `RV.GRID.M/UNIT` **[fragmento/token]**
    - **RV.PATH CLEAR** → `RV.PATH CLEAR` **[fragmento/token]**
    - **RV.MARK** → `RV.MARK` **[fragmento/token]**
  - **7. RV Control**
    - **SET RV.MOTORS** → `SET RV.MOTORS` **[fragmento/token]**
    - **SET RV.MOTOR.L** → `SET RV.MOTOR.L` **[fragmento/token]**
    - **SET RV.MOTOR.R** → `SET RV.MOTOR.R` **[fragmento/token]**
    - **SET RV.ENCODERSGYRO 0** → `SET RV.ENCODERSGYRO 0` **[fragmento/token]**
    - **READ RV.ENCODERSGYRO** → `READ RV.ENCODERSGYRO` **[fragmento/token]**
    - **READ RV.GYRO** → `READ RV.GYRO` **[fragmento/token]**
    - **READ RV.DONE** → `READ RV.DONE` **[fragmento/token]**
    - **READ RV.ETA** → `READ RV.ETA` **[fragmento/token]**
  - **8. Send "CONNECT RV"** → `Send "CONNECT RV"`
  - **9. Send "DISCONNECT RV"** → `Send "DISCONNECT RV"`
- **8. Send "CONNECT–Output"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **LED** → `Send "CONNECT LED ..."` **[fragmento/token]**
  - **RGB** → `Send "CONNECT RGB ..."` **[fragmento/token]**
  - **SPEAKER** → `Send "CONNECT SPEAKER ..."` **[fragmento/token]**
  - **POWER** → `Send "CONNECT POWER ..."` **[fragmento/token]**
  - **SERVO.CONTINUOUS** → `Send "CONNECT SERVO.CONTINUOUS ..."` **[fragmento/token]**
  - **ANALOG.OUT** → `Send "CONNECT ANALOG.OUT ..."` **[fragmento/token]**
  - **VIB.MOTOR** → `Send "CONNECT VIB.MOTOR ..."` **[fragmento/token]**
  - **BUZZER** → `Send "CONNECT BUZZER ..."` **[fragmento/token]**
  - **RELAY** → `Send "CONNECT RELAY ..."` **[fragmento/token]**
  - **SERVO** → `Send "CONNECT SERVO ..."` **[fragmento/token]**
  - **SQUAREWAVE** → `Send "CONNECT SQUAREWAVE ..."` **[fragmento/token]**
  - **DIGITAL.OUT** → `Send "CONNECT DIGITAL.OUT ..."` **[fragmento/token]**
  - **BBPORT** → `Send "CONNECT BBPORT ..."` **[fragmento/token]**
  - **Send "CONNECT"** → `Send "CONNECT"`
- **9. Send "CONNECT–Input"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **DHT** → `Send "CONNECT DHT ..."` **[fragmento/token]**
  - **RANGER** → `Send "CONNECT RANGER ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "CONNECT LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "CONNECT TEMPERATURE ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "CONNECT MOISTURE ..."` **[fragmento/token]**
  - **MAGNETIC** → `Send "CONNECT MAGNETIC ..."` **[fragmento/token]**
  - **VERNIER** → `Send "CONNECT VERNIER ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "CONNECT ANALOG.IN ..."` **[fragmento/token]**
  - **DIGITAL.IN** → `Send "CONNECT DIGITAL.IN ..."` **[fragmento/token]**
  - **SWITCH** → `Send "CONNECT SWITCH ..."` **[fragmento/token]**
  - **BUTTON** → `Send "CONNECT BUTTON ..."` **[fragmento/token]**
  - **MOTION** → `Send "CONNECT MOTION ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "CONNECT POTENTIOMETER ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "CONNECT THERMISTOR ..."` **[fragmento/token]**
  - **RGB** → `Send "CONNECT RGB ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "CONNECT LOUDNESS ..."` **[fragmento/token]**
  - **BBPORT** → `Send "CONNECT BBPORT ..."` **[fragmento/token]**
  - **Send "CONNECT"** → `Send "CONNECT"`
- **A. Ports**
  - **OUT 1** → `OUT 1` **[fragmento/token]**
  - **OUT 2** → `OUT 2` **[fragmento/token]**
  - **OUT 3** → `OUT 3` **[fragmento/token]**
  - **IN 1** → `IN 1` **[fragmento/token]**
  - **IN 2** → `IN 2` **[fragmento/token]**
  - **IN 3** → `IN 3` **[fragmento/token]**
  - **I2C** → `I2C` **[fragmento/token]**
  - **BB 1** → `BB 1` **[fragmento/token]**
  - **BB 2** → `BB 2` **[fragmento/token]**
  - **BB 3** → `BB 3` **[fragmento/token]**
  - **BB 4** → `BB 4` **[fragmento/token]**
  - **BB 5** → `BB 5` **[fragmento/token]**
  - **BB 6** → `BB 6` **[fragmento/token]**
  - **BB 7** → `BB 7` **[fragmento/token]**
  - **BB 8** → `BB 8` **[fragmento/token]**
  - **BB 9** → `BB 9` **[fragmento/token]**
  - **BB 10** → `BB 10` **[fragmento/token]**
  - **BBPORT** → `BBPORT` **[fragmento/token]**
- **B. Send "RANGE"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **BRIGHTNESS** → `Send "RANGE BRIGHTNESS ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "RANGE LOUDNESS ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "RANGE LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "RANGE TEMPERATURE ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "RANGE POTENTIOMETER ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "RANGE MOISTURE ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "RANGE THERMISTOR ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "RANGE ANALOG.IN ..."` **[fragmento/token]**
- **C. Send "AVERAGE"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **BRIGHTNESS** → `Send "AVERAGE BRIGHTNESS ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "AVERAGE LOUDNESS ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "AVERAGE LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "AVERAGE TEMPERATURE ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "AVERAGE POTENTIOMETER ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "AVERAGE MOISTURE ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "AVERAGE THERMISTOR ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "AVERAGE ANALOG.IN ..."` **[fragmento/token]**
- **D. Send "DISCONNECT–Output"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **LED** → `Send "DISCONNECT LED ..."` **[fragmento/token]**
  - **RGB** → `Send "DISCONNECT RGB ..."` **[fragmento/token]**
  - **SPEAKER** → `Send "DISCONNECT SPEAKER ..."` **[fragmento/token]**
  - **POWER** → `Send "DISCONNECT POWER ..."` **[fragmento/token]**
  - **SERVO.CONTINUOUS** → `Send "DISCONNECT SERVO.CONTINUOUS ..."` **[fragmento/token]**
  - **ANALOG.OUT** → `Send "DISCONNECT ANALOG.OUT ..."` **[fragmento/token]**
  - **VIB.MOTOR** → `Send "DISCONNECT VIB.MOTOR ..."` **[fragmento/token]**
  - **BUZZER** → `Send "DISCONNECT BUZZER ..."` **[fragmento/token]**
  - **RELAY** → `Send "DISCONNECT RELAY ..."` **[fragmento/token]**
  - **SERVO** → `Send "DISCONNECT SERVO ..."` **[fragmento/token]**
  - **SQUAREWAVE** → `Send "DISCONNECT SQUAREWAVE ..."` **[fragmento/token]**
  - **DIGITAL.OUT** → `Send "DISCONNECT DIGITAL.OUT ..."` **[fragmento/token]**
  - **BBPORT** → `Send "DISCONNECT BBPORT ..."` **[fragmento/token]**
  - **Send "DISCONNECT"** → `Send "DISCONNECT"`
- **E. Send "DISCONNECT–Input"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **DHT** → `Send "DISCONNECT DHT ..."` **[fragmento/token]**
  - **RANGER** → `Send "DISCONNECT RANGER ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "DISCONNECT LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "DISCONNECT TEMPERATURE ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "DISCONNECT MOISTURE ..."` **[fragmento/token]**
  - **MAGNETIC** → `Send "DISCONNECT MAGNETIC ..."` **[fragmento/token]**
  - **VERNIER** → `Send "DISCONNECT VERNIER ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "DISCONNECT ANALOG.IN ..."` **[fragmento/token]**
  - **DIGITAL.IN** → `Send "DISCONNECT DIGITAL.IN ..."` **[fragmento/token]**
  - **SWITCH** → `Send "DISCONNECT SWITCH ..."` **[fragmento/token]**
  - **BUTTON** → `Send "DISCONNECT BUTTON ..."` **[fragmento/token]**
  - **MOTION** → `Send "DISCONNECT MOTION ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "DISCONNECT POTENTIOMETER ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "DISCONNECT THERMISTOR ..."` **[fragmento/token]**
  - **RGB** → `Send "DISCONNECT RGB ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "DISCONNECT LOUDNESS ..."` **[fragmento/token]**
  - **BBPORT** → `Send "DISCONNECT BBPORT ..."` **[fragmento/token]**
  - **Send "DISCONNECT"** → `Send "DISCONNECT"`
- **F. Manage**
  - **Send "BEGIN"** → `Send "BEGIN"`
  - **Send "ISTI"** → `Send "ISTI"`
  - **Send "WHO"** → `Send "WHO"`
  - **Send "WHAT"** → `Send "WHAT"`
  - **Send "HELP"** → `Send "HELP"`
  - **Send "VERSION"** → `Send "VERSION"`
  - **Send "ABOUT"** → `Send "ABOUT"`
- **G. Send "COLLECT"**
  - Nota: Primer elemento del menú: Send "COLLECT"; lo demás son subopciones.
  - **Send "COLLECT"** → `Send "COLLECT"`
  - **BRIGHTNESS** → `Send "COLLECT BRIGHTNESS ..."` **[fragmento/token]**
  - **DHT** → `Send "COLLECT DHT ..."` **[fragmento/token]**
  - **RANGER** → `Send "COLLECT RANGER ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "COLLECT LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "COLLECT TEMPERATURE ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "COLLECT MOISTURE ..."` **[fragmento/token]**
  - **MAGNETIC** → `Send "COLLECT MAGNETIC ..."` **[fragmento/token]**
  - **VERNIER** → `Send "COLLECT VERNIER ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "COLLECT ANALOG.IN ..."` **[fragmento/token]**
  - **DIGITAL.IN** → `Send "COLLECT DIGITAL.IN ..."` **[fragmento/token]**
  - **SWITCH** → `Send "COLLECT SWITCH ..."` **[fragmento/token]**
  - **BUTTON** → `Send "COLLECT BUTTON ..."` **[fragmento/token]**
  - **MOTION** → `Send "COLLECT MOTION ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "COLLECT POTENTIOMETER ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "COLLECT THERMISTOR ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "COLLECT LOUDNESS ..."` **[fragmento/token]**
  - **BBPORT** → `Send "COLLECT BBPORT ..."` **[fragmento/token]**
- **H. Send "READ LIST"**
  - Nota: Los elementos de esta lista son fragmentos de una cadena para Send, no funciones TI-Basic independientes.
  - **BRIGHTNESS** → `Send "READ LIST BRIGHTNESS ..."` **[fragmento/token]**
  - **DHT** → `Send "READ LIST DHT ..."` **[fragmento/token]**
  - **RANGER** → `Send "READ LIST RANGER ..."` **[fragmento/token]**
  - **LIGHTLEVEL** → `Send "READ LIST LIGHTLEVEL ..."` **[fragmento/token]**
  - **TEMPERATURE** → `Send "READ LIST TEMPERATURE ..."` **[fragmento/token]**
  - **MOISTURE** → `Send "READ LIST MOISTURE ..."` **[fragmento/token]**
  - **MAGNETIC** → `Send "READ LIST MAGNETIC ..."` **[fragmento/token]**
  - **VERNIER** → `Send "READ LIST VERNIER ..."` **[fragmento/token]**
  - **ANALOG.IN** → `Send "READ LIST ANALOG.IN ..."` **[fragmento/token]**
  - **DIGITAL.IN** → `Send "READ LIST DIGITAL.IN ..."` **[fragmento/token]**
  - **SWITCH** → `Send "READ LIST SWITCH ..."` **[fragmento/token]**
  - **BUTTON** → `Send "READ LIST BUTTON ..."` **[fragmento/token]**
  - **MOTION** → `Send "READ LIST MOTION ..."` **[fragmento/token]**
  - **POTENTIOMETER** → `Send "READ LIST POTENTIOMETER ..."` **[fragmento/token]**
  - **THERMISTOR** → `Send "READ LIST THERMISTOR ..."` **[fragmento/token]**
  - **LOUDNESS** → `Send "READ LIST LOUDNESS ..."` **[fragmento/token]**
  - **BBPORT** → `Send "READ LIST BBPORT ..."` **[fragmento/token]**
  - **TIME** → `Send "READ LIST TIME ..."` **[fragmento/token]**
  - **Send "READ LIST"** → `Send "READ LIST"`

## 9. Dibujar

- **1. Formas**
  - **1. DrawLine** → `DrawLine x1,y1,x2,y2`
  - **2. DrawRect** → `DrawRect x,y,ancho,alto`
  - **3. FillRect** → `FillRect x,y,ancho,alto`
  - **4. DrawCircle** → `DrawCircle x,y,radio`
  - **5. FillCircle** → `FillCircle x,y,radio`
  - **6. DrawText** → `DrawText x,y,"Texto"`
  - **7. DrawArc** → `DrawArc x,y,ancho,alto,angInicio,angArco`
  - **8. FillArc** → `FillArc x,y,ancho,alto,angInicio,angArco`
  - **9. DrawPoly** → `DrawPoly x1,y1,x2,y2,x3,y3`
  - **A. FillPoly** → `FillPoly x1,y1,x2,y2,x3,y3`
  - **B. PlotXY** → `PlotXY x,y,estilo`
- **2. Control**
  - **1. Clear** → `Clear`
  - **2. SetColor** → `SetColor rojo,verde,azul`
  - **3. SetPen** → `SetPen grosor,estilo`
  - **4. SetWindow** → `SetWindow xmin,xmax,ymin,ymax`
  - **5. UseBuffer** → `UseBuffer`
  - **6. PaintBuffer** → `PaintBuffer`


## Referencias y comprobación

- Fuente principal: video adjunto del Editor de programas del software TI-Nspire CX CAS.
- Referencia oficial de TI-Nspire: Programming / Editor de programas, TI-Basic, comandos gráficos y TI-Innovator Hub.
- Los menús de texto Hub se han transcrito como plantillas de ayuda, no como programas completos; necesitarás conectar el componente y usar el puerto/nombre y parámetros requeridos.
- Algunas plantillas dependen de la versión de software y del modelo/calculadora.

**Ejemplo de programa TI-Basic:**

```text
Define suma(a,b)=
Func
  Return a+b
EndFunc
```

**Ejemplo de interacción Hub:**

```text
Send "SET LIGHT ON"
Wait 1
Send "SET LIGHT OFF"
```
