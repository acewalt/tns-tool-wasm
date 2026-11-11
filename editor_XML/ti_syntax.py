from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field

from ti_catalog import TI_CATALOG, TI_CATALOG_FUNCTIONS, TI_CATALOG_STATEMENTS, TI_CATALOG_NAMES, TI_GLYPH_ALIASES, TI_UNIT_CONSTANT_TOKENS


@dataclass(frozen=True)
class Diagnostic:
    severity: str
    line: int
    message: str
    detail: str = ""
    code: int | None = None

    @property
    def code_label(self) -> str:
        if self.code is None:
            return ""
        return ("W" if self.severity == "WARNING" else "E") + str(self.code)


@dataclass
class SyntaxReport:
    diagnostics: list[Diagnostic] = field(default_factory=list)
    infos: list[str] = field(default_factory=list)
    variables: set[str] = field(default_factory=set)
    variable_lines: dict[str, int] = field(default_factory=dict)
    assigned: set[str] = field(default_factory=set)
    used: set[str] = field(default_factory=set)
    used_lines: dict[str, int] = field(default_factory=dict)
    if_count: int = 0
    endif_count: int = 0
    block_counts: dict[str, int] = field(default_factory=dict)

    @property
    def errors(self) -> list[Diagnostic]:
        return [d for d in self.diagnostics if d.severity == "ERROR"]

    @property
    def warnings(self) -> list[Diagnostic]:
        return [d for d in self.diagnostics if d.severity == "WARNING"]

    @property
    def has_errors(self) -> bool:
        return bool(self.errors)

    @property
    def critical_errors(self) -> list[Diagnostic]:
        return [diag for diag in self.errors if is_critical_diagnostic(diag)]

    def format(self) -> str:
        lines = ["ANALISIS DEL PROGRAMA", ""]
        lines.append(f"If encontrados: {self.if_count}")
        lines.append(f"EndIf encontrados: {self.endif_count}")
        for block, count in sorted(self.block_counts.items()):
            lines.append(f"{block} encontrados: {count}")
        lines.append(f"Variables declaradas: {len(self.variables)}")
        lines.append(f"Errores: {len(self.errors)}")
        lines.append(f"Advertencias: {len(self.warnings)}")
        lines.append("")

        if self.infos:
            lines.append("Log:")
            lines.extend(self.infos)
            lines.append("")

        if self.diagnostics:
            lines.append("Diagnosticos:")
            for diag in self.diagnostics:
                where = f"Linea {diag.line}" if diag.line else "Programa"
                code = f"{diag.code_label}: " if diag.code_label else ""
                detail = f" ({diag.detail})" if diag.detail else ""
                lines.append(f"[{diag.severity}] {where}: {code}{diag.message}{detail}")
        else:
            lines.append("Sin errores ni advertencias.")
        return "\n".join(lines)


VALID_COMMANDS = {
    "and",
    "approx",
    "circle",
    "clrio",
    "break",
    "cycle",
    "define",
    "delvar",
    "disp",
    "drawarc",
    "drawcircle",
    "drawline",
    "drawpoly",
    "drawrect",
    "drawtext",
    "else",
    "elseif",
    "endif",
    "endfor",
    "endfunc",
    "endloop",
    "endprgm",
    "endtry",
    "endwhile",
    "exit",
    "for",
    "func",
    "fillarc",
    "fillcircle",
    "fillpoly",
    "fillrect",
    "getkey",
    "goto",
    "if",
    "input",
    "label",
    "lbl",
    "line",
    "local",
    "log",
    "loop",
    "not",
    "or",
    "prgm",
    "prompt",
    "paintbuffer",
    "plotxy",
    "rand",
    "request",
    "return",
    "setcolor",
    "setpen",
    "setwindow",
    "sqrt",
    "stop",
    "text",
    "then",
    "try",
    "while",
}

# Syntax Doctor recognizes names in the TI catalog independently of Preview support.
VALID_COMMANDS.update(TI_CATALOG_STATEMENTS)

BLOCK_PAIRS = {
    "if": "endif",
    "for": "endfor",
    "while": "endwhile",
    "loop": "endloop",
    "try": "endtry",
}

BLOCK_NAMES = {
    "if": ("If", "EndIf"),
    "for": ("For", "EndFor"),
    "while": ("While", "EndWhile"),
    "loop": ("Loop", "EndLoop"),
    "try": ("Try", "EndTry"),
}

COMMAND_SIGNATURES: dict[str, tuple[int, int | None]] = {
    "abs": (1, 1),
    "approx": (1, 1),
    "circle": (3, 4),
    "cos": (1, 1),
    "disp": (0, None),
    "dispat": (2, None),
    "drawarc": (6, 6),
    "drawcircle": (3, 3),
    "drawline": (4, 4),
    "drawrect": (4, 4),
    "drawtext": (3, None),
    "fillarc": (6, 6),
    "fillcircle": (3, 3),
    "fillrect": (4, 4),
    "line": (4, 4),
    "log": (1, 2),
    "max": (1, None),
    "min": (1, None),
    "request": (2, 2),
    "sin": (1, 1),
    "sqrt": (1, 1),
    "string": (1, 1),
    "tan": (1, 1),
    "rand": (0, 1),
    "root": (1, 2),
    "piecewise": (2, None),
    "system": (2, None),
    "newmat": (2, 2),
    "randmat": (2, 2),
    "identity": (1, 1),
    "diag": (1, 1),
    "sumseq": (4, 4),
    "prodseq": (4, 4),
    "d": (2, 3),
    "derivative": (2, 3),
    "integral": (2, 4),
    "lim": (3, 4),
    "limit": (3, 4),
    "randint": (2, 3),
    "setmode": (1, 2),
    "getmode": (1, 1),
}

COMMAND_STYLE_SIGNATURES: dict[str, tuple[int, int | None]] = {
    "clear": (0, 4),
    "drawarc": (6, 6),
    "drawcircle": (3, 3),
    "drawline": (4, 4),
    "drawpoly": (2, None),
    "drawrect": (4, 4),
    "drawtext": (3, None),
    "fillarc": (6, 6),
    "fillcircle": (3, 3),
    "fillpoly": (2, None),
    "fillrect": (4, 4),
    "dispat": (2, None),
    "request": (2, 4),
    "requeststr": (2, 4),
    "paintbuffer": (0, 0),
    "plotxy": (3, 3),
    "setcolor": (3, 3),
    "setpen": (2, 2),
    "setwindow": (4, 4),
    "usebuffer": (0, 0),
    "wait": (1, 1),
    "text": (1, None),
}

TI_ERROR_CODES: dict[int, str] = {
    10: "A function did not return a value",
    20: "A test did not resolve to TRUE or FALSE",
    30: "Argument cannot be a folder name",
    40: "Argument error",
    50: "Argument mismatch",
    60: "Argument must be a Boolean expression or integer",
    70: "Argument must be a decimal number",
    90: "Argument must be a list",
    100: "Argument must be a matrix",
    130: "Argument must be a string",
    140: "Argument must be a variable name",
    160: "Argument must be an expression",
    170: "Bound",
    190: "Circular definition",
    200: "Constraint expression invalid",
    210: "Invalid Data type",
    220: "Dependent limit",
    230: "Dimension",
    235: "Dimension Error. Not enough elements in the lists",
    240: "Dimension mismatch",
    250: "Divide by zero",
    260: "Domain error",
    270: "Duplicate variable name",
    280: "Else and ElseIf invalid outside of If...EndIf block",
    290: "EndTry is missing the matching Else statement",
    295: "Excessive iteration",
    300: "Expected 2 or 3-element list or matrix",
    310: "First argument of nSolve must be an equation in a single variable",
    320: "First argument of solve or cSolve must be an equation or inequality",
    345: "Inconsistent units",
    350: "Index out of range",
    360: "Indirection string is not a valid variable name",
    380: "Undefined Ans",
    390: "Invalid assignment",
    400: "Invalid assignment value",
    410: "Invalid command",
    430: "Invalid for the current mode settings",
    435: "Invalid guess",
    440: "Invalid implied multiply",
    450: "Invalid in a function or current expression",
    490: "Invalid in Try..EndTry block",
    510: "Invalid list or matrix",
    550: "Invalid outside function or program",
    560: "Invalid outside Loop..EndLoop, For..EndFor, or While..EndWhile blocks",
    565: "Invalid outside program",
    570: "Invalid pathname",
    575: "Invalid polar complex",
    580: "Invalid program reference",
    600: "Invalid table",
    605: "Invalid use of units",
    610: "Invalid variable name in a Local statement",
    620: "Invalid variable or function name",
    630: "Invalid variable reference",
    640: "Invalid vector syntax",
    650: "Link transmission",
    665: "Matrix not diagonalizable",
    670: "Low Memory",
    672: "Resource exhaustion",
    673: "Resource exhaustion",
    680: "Missing (",
    690: "Missing )",
    700: "Missing quote",
    710: "Missing ]",
    720: "Missing }",
    730: "Missing start or end of block syntax",
    740: "Missing Then in the If..EndIf block",
    750: "Name is not a function or program",
    765: "No functions selected",
    780: "No solution found",
    800: "Non-real result",
    830: "Overflow",
    850: "Program not found",
    855: "Rand type functions not allowed in graphing",
    860: "Recursion too deep",
    870: "Reserved name or system variable",
    900: "Argument error",
    910: "Syntax error",
    920: "Text not found",
    930: "Too few arguments",
    940: "Too many arguments",
    950: "Too many subscripts",
    955: "Too many undefined variables",
    960: "Variable is not defined",
    965: "Unlicensed OS",
    970: "Variable in use so references or changes are not allowed",
    980: "Variable is protected",
    990: "Invalid variable name",
    1000: "Window variables domain",
    1010: "Zoom",
    1020: "Internal error",
    1030: "Protected memory violation",
    1040: "Unsupported function. This function requires CAS",
    1045: "Unsupported operator. This operator requires CAS",
    1050: "Unsupported feature. This operator requires CAS",
    1060: "Input argument must be numeric",
    1070: "Trig function argument too big for accurate reduction",
    1080: "Unsupported use of Ans",
    1090: "Function is not defined",
    1100: "Non-real calculation",
    1110: "Invalid bounds",
    1120: "No sign change",
    1130: "Argument cannot be a list or matrix",
    1140: "Argument error",
    1150: "Argument error",
    1160: "Invalid library pathname",
    1170: "Invalid use of library pathname",
    1180: "Invalid library variable name",
    1190: "Library document not found",
    1200: "Library variable not found",
    1210: "Invalid library shortcut name",
    1220: "Domain error",
    1230: "Domain error",
    1250: "Argument Error",
    1260: "Argument Error",
    1270: "Argument Error",
    1280: "Argument Error",
    1290: "Argument Error",
    1300: "Argument Error",
    1310: "Argument error",
    1380: "Argument error",
}

TI_WARNING_CODES: dict[int, str] = {
    10000: "Operation might introduce false solutions",
    10001: "Differentiating an equation may produce a false equation",
    10002: "Questionable solution",
    10003: "Questionable accuracy",
    10004: "Operation might lose solutions",
    10005: "cSolve might specify more zeros",
    10006: "Solve may specify more zeros",
    10007: "More solutions may exist",
    10008: "Domain of the result might be smaller than the domain of the input",
    10009: "Domain of the result might be larger than the domain of the input",
    10012: "Non-real calculation",
    10013: "infinity^0 or undef^0 replaced by 1",
    10014: "undef^0 replaced by 1",
    10015: "1^infinity or 1^undef replaced by 1",
    10016: "1^undef replaced by 1",
    10017: "Overflow replaced by infinity or negative infinity",
    10018: "Operation requires and returns 64 bit value",
    10019: "Resource exhaustion, simplification might be incomplete",
    10020: "Trig function argument too big for accurate reduction",
    10021: "Input contains an undefined parameter",
    10022: "Specifying appropriate bounds might produce a solution",
    10023: "Scalar has been multiplied by the identity matrix",
    10024: "Result obtained using approximate arithmetic",
    10025: "Equivalence cannot be verified in EXACT mode",
    10026: "Constraint might be ignored",
}

CRITICAL_PREFIXES = (
    "Cadena sin cerrar",
    "Falta ')'",
    "Falta ']'",
    "Falta '}'",
    "Parentesis extra",
    "Corchete extra",
    "Llave extra",
    "If sin EndIf",
    "EndIf sin If",
    "Else sin If",
    "Else and ElseIf invalid",
    "Programa no empieza",
    "Programa no termina",
    "EndPrgm duplicado",
    "Prgm duplicado",
    "Se esperaba Then",
    "Condicion vacia",
    "Expected",
    "Too few arguments",
    "Too many arguments",
    "Invalid implied multiply",
    "Division por cero",
    "Raiz de numero negativo",
    "Logaritmo fuera del dominio",
    "Missing",
)

BUILTIN_NAMES = VALID_COMMANDS | TI_CATALOG_NAMES | {name.lower() for name in TI_UNIT_CONSTANT_TOKENS} | {
    "true",
    "false",
    "pi",
    "π",
    "e",
    "string",
    "sin",
    "cos",
    "tan",
    "min",
    "max",
    "abs",
    "augment",
    "ceiling",
    "char",
    "colaugment",
    "coldim",
    "colnorm",
    "crossp",
    "csolve",
    "dim",
    "eigvc",
    "eigvl",
    "expr",
    "factor",
    "floor",
    "gettype",
    "instring",
    "int",
    "intdiv",
    "isnumtype",
    "left",
    "line",
    "mid",
    "newmat",
    "nsolve",
    "not",
    "ord",
    "part",
    "polycoeffs",
    "right",
    "rowdim",
    "rownorm",
    "rref",
    "circle",
    "cycle",
    "drawarc",
    "drawcircle",
    "drawline",
    "drawpoly",
    "drawrect",
    "drawtext",
    "fillarc",
    "fillcircle",
    "fillpoly",
    "fillrect",
    "paintbuffer",
    "plotxy",
    "setcolor",
    "setpen",
    "setwindow",
    "round",
    "rand",
    "solve",
    "submat",
    "when",
    "zeros",
}

RESERVED_NAMES = {"and", "define", "else", "elseif", "endif", "endfor", "endloop", "endprgm", "endtry", "endwhile", "false", "for", "func", "if", "local", "loop", "or", "prgm", "return", "then", "true", "try", "while"}
ASSIGN_ARROW_RE = re.compile(r"(.+?)(?:->|→|â†’)\s*(.+?)\s*$")

TI_IDENTIFIER = r"[^\W\d]\w*"
IDENT_RE = re.compile(r"\b" + TI_IDENTIFIER + r"\b", re.UNICODE)
LOCAL_RE = re.compile(r"^\s*Local\s+(.+)$", re.IGNORECASE)
REQUEST_RE = re.compile(r"^\s*(RequestStr|Request)\s+(.+)$", re.IGNORECASE)
IF_RE = re.compile(r"^\s*If\b(.*)$", re.IGNORECASE)
ASSIGN_RE = re.compile(r"(.+?)(?:->|→)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$")
DEFINE_PROGRAM_RE = re.compile(
    r"^\s*Define\s+(?:(?:LibPub|LibPriv)\s+)?(" + TI_IDENTIFIER + r")\s*\(([^)]*)\)\s*=\s*(Prgm|Func)?\s*$",
    re.IGNORECASE,
)


def _statement_line(line: str) -> str:
    """Ignore TI's leading statement separator without touching := or strings."""
    return re.sub(r"^(\s*):[ \t]*", r"\1", line, count=1)


def _assignment_parts(line: str) -> tuple[str, str] | None:
    """Return expression/target for either TI storage spelling, outside strings."""
    if inline := _inline_if_parts(line):
        line = inline[1]
    clean = _strip_strings_keep_layout(line)
    colon = clean.find(":=")
    if colon >= 0:
        return line[colon + 2:].strip(), line[:colon].strip()
    match = ASSIGN_ARROW_RE.match(clean)
    if match:
        return line[:match.end(1)].strip(), line[match.start(2):].strip()
    return None


def _inline_if_parts(line: str) -> tuple[str, str] | None:
    """Separate a one-statement If from its command, never a quoted colon/:=."""
    clean = _strip_strings_keep_layout(line)
    header = IF_RE.match(clean)
    if not header or re.search(r"\bThen\b", header.group(1), re.IGNORECASE):
        return None
    depth = 0
    for index in range(header.start(1), len(clean)):
        char = clean[index]
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
        elif char == ":" and depth == 0 and clean[index:index + 2] != ":=":
            return line[header.start(1):index].strip(), line[index + 1:].strip()
    return None


def _assignment_base(target: str) -> str | None:
    match = re.fullmatch(r"(" + TI_IDENTIFIER + r")(?:\s*\[[^\[\]]+\])?", target.strip())
    return match.group(1) if match else None


def _program_scopes(lines: list[str]) -> tuple[list[dict], list[Diagnostic]]:
    """Separate real Define/Prgm scopes without changing source line numbers.

    TI subroutines have their own Local/parameter/label namespace. Plain Prgm
    tokens are not pushed here: an unexpected duplicate remains a flat-analyzer
    error instead of becoming an accidentally accepted nested scope.
    """
    root = {"name": "", "kind": None, "params": "", "parent": None, "lines": {}, "start": 1}
    scopes = [root]
    stack = [root]
    diagnostics = []
    first_statement = True
    pending = None
    for number, raw in enumerate(lines, 1):
        raw = _statement_line(raw)
        statement = raw.strip()
        scope = stack[-1]
        if not statement or _is_comment_line(statement):
            scope["lines"][number] = raw
            continue
        header = DEFINE_PROGRAM_RE.fullmatch(statement)
        if header:
            kind = ("Func" if header.group(3).lower() == "func" else "Prgm") if header.group(3) else None
            is_root = first_statement
            if is_root:
                scope.update(name=header.group(1), params=header.group(2), kind=kind, start=number)
            else:
                if len(scopes) >= 128 or len(stack) >= 16:
                    diagnostics.append(ti_error(910, number, "Se excedió el límite de subrutinas del analizador"))
                    scope["lines"][number] = "© definition limit"
                    continue
                child = {"name": header.group(1), "kind": kind, "params": header.group(2), "parent": scope,
                         "lines": {}, "start": number}
                scope["lines"][number] = "© internal definition"
                scopes.append(child)
                stack.append(child)
                scope = child
            scope["lines"][number] = kind or "© Define header"
            pending = scope if not kind else None
            if scope["parent"] and scope["parent"]["kind"] == "Func" and kind == "Prgm":
                diagnostics.append(ti_error(730, number, "No se puede definir Prgm dentro de Func"))
        elif pending is scope and statement.lower() in {"prgm", "func"}:
            scope["kind"] = "Prgm" if statement.lower() == "prgm" else "Func"
            scope["lines"][number] = statement
            if scope["parent"] and scope["parent"]["kind"] == "Func" and scope["kind"] == "Prgm":
                diagnostics.append(ti_error(730, number, "No se puede definir Prgm dentro de Func"))
            pending = None
        elif statement.lower() in {"endprgm", "endfunc"} and scope is not root:
            expected = "EndFunc" if scope["kind"] == "Func" else "EndPrgm"
            if statement.lower() != expected.lower():
                diagnostics.append(ti_error(730, number, f"Se esperaba {expected}, no {statement}"))
            # The typed mismatch is diagnosed above; normalize only this scope's
            # analysis copy to avoid a second misleading duplicate-end message.
            scope["lines"][number] = expected
            stack.pop()
            pending = None
        else:
            scope["lines"][number] = raw
            if first_statement and statement.lower() in {"prgm", "func"}:
                scope["kind"] = "Prgm" if statement.lower() == "prgm" else "Func"
        first_statement = False
    for scope in scopes:
        scope["locals"] = {part.strip() for line in scope["lines"].values()
                            if (match := LOCAL_RE.match(line.strip())) for part in match.group(1).split(",")}
        scope["parameters"] = {part.strip() for part in scope["params"].split(",") if part.strip()}
    return scopes, diagnostics


def analyze_ti_code(
    text: str,
    parameters: str | None = None,
    known_functions: set[str] | None = None,
    known_names: set[str] | None = None,
    document_type: str | None = None,
) -> SyntaxReport:
    lines = _split_lines(text)
    scopes, structural = _program_scopes(lines)
    if len(scopes) == 1 and not scopes[0]["name"]:
        return _analyze_flat_ti_code(text, parameters, known_functions, known_names, document_type)
    root = scopes[0]
    external_names, external_functions = set(known_names or ()), set(known_functions or ())
    global_assignments = set()
    global_functions = {scope["name"] for scope in scopes if scope["name"] and
                        (scope["parent"] is None or scope["name"] not in scope["parent"]["locals"])}
    for scope in scopes:
        for line in scope["lines"].values():
            if _is_comment_line(line):
                continue
            if parts := _assignment_parts(line):
                base = _assignment_base(parts[1])
                if base and base not in scope["locals"] | scope["parameters"]:
                    global_assignments.add(base)
    aggregate = SyntaxReport()
    aggregate.diagnostics.extend(structural)
    for scope in scopes:
        visible_functions = external_functions | global_functions | {
            child["name"] for child in scopes if child["parent"] is scope
        }
        scoped_lines = [scope["lines"].get(number, "© separate program scope") for number in range(1, len(lines) + 1)]
        local_report = _analyze_flat_ti_code(
            "\n".join(scoped_lines), scope["params"] or (parameters if scope is root else None),
            visible_functions, external_names | global_assignments | visible_functions,
            scope["kind"] or (document_type if scope is root else None),
        )
        aggregate.diagnostics.extend(local_report.diagnostics)
        aggregate.infos.extend(local_report.infos)
        aggregate.variables.update(local_report.variables)
        aggregate.assigned.update(local_report.assigned)
        aggregate.used.update(local_report.used)
        aggregate.variable_lines.update(local_report.variable_lines)
        aggregate.used_lines.update(local_report.used_lines)
        aggregate.if_count += local_report.if_count
        aggregate.endif_count += local_report.endif_count
        for key, count in local_report.block_counts.items():
            aggregate.block_counts[key] = aggregate.block_counts.get(key, 0) + count
    aggregate.diagnostics.sort(key=lambda diagnostic: diagnostic.line)
    return aggregate


def _analyze_flat_ti_code(
    text: str,
    parameters: str | None = None,
    known_functions: set[str] | None = None,
    known_names: set[str] | None = None,
    document_type: str | None = None,
) -> SyntaxReport:
    report = SyntaxReport()
    known_functions = known_functions or set()
    known_names = known_names or set()
    lines = [_statement_line(line) for line in _split_lines(text)]
    expression_function = _is_expression_function(lines, document_type)
    is_function_document = expression_function or str(document_type).lower() == "func" or any(line.strip().lower() == "func" for line in lines[:3])
    parameter_names = {name.strip() for name in (parameters or "").split(",") if name.strip()}
    explicit_locals: set[str] = set()
    if_stack: list[int] = []
    block_stack: list[tuple[str, int]] = []
    try_stack: list[list[object]] = []
    document_start_seen = False
    document_end_seen = False
    document_kind: str | None = None
    menu_options: set[str] = set()
    tested_options: list[tuple[int, str]] = []

    if not lines:
        report.diagnostics.append(ti_error(910, 0, "Programa vacio"))
        return report

    # TI.ProgramEditor renders its own Prgm/EndPrgm wrapper. Boundary blank
    # lines hide those tokens from the XML serializer's first/last-line checks.
    # Report exactly the first padding line on either side, not every empty row.
    nonempty = [i for i, value in enumerate(lines) if value.strip()]
    if nonempty:
        first, last = nonempty[0], nonempty[-1]
        if first > 0 and lines[first].strip().lower() in {"prgm", "func"}:
            report.diagnostics.append(ti_error(
                730, 1,
                "Lineas vacias antes de Prgm/Func: elimina el espacio exterior antes de guardar TNS",
            ))
        if last < len(lines) - 1 and lines[last].strip().lower() in {"endprgm", "endfunc"}:
            report.diagnostics.append(ti_error(
                730, last + 2,
                "Lineas vacias despues de EndPrgm/EndFunc: elimina el espacio exterior antes de guardar TNS",
            ))

    if parameters:
        for raw_name in parameters.split(","):
            name = raw_name.strip()
            if _is_identifier(name):
                report.variables.add(name)
                report.variable_lines.setdefault(name, 1)
                report.assigned.add(name)

    for number, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line:
            continue
        if _is_comment_line(line):
            continue

        inline_if = _inline_if_parts(line)
        statement = inline_if[1] if inline_if else raw_line
        visible_names = report.variables | report.assigned | known_names

        _check_lexical(report, number, raw_line)
        _check_delimiters(report, number, raw_line)
        _check_math_domains(report, number, raw_line)
        _check_function_arguments(report, number, raw_line)
        _check_command_style_arguments(report, number, statement)
        _check_invalid_implied_multiply(report, number, raw_line, report.variables | report.assigned)
        _check_assignment_errors(report, number, raw_line, report.variables | report.assigned | known_names)
        _check_missing_function_parenthesis(report, number, raw_line, visible_names)
        _check_function_references(
            report,
            number,
            raw_line,
            report.variables | report.assigned | known_names,
            known_functions,
        )
        _check_subscripts(report, number, raw_line)
        _check_ans_usage(report, number, raw_line)

        command = _first_command(statement)
        if command:
            lower_command = command.lower()
            if lower_command in TI_CATALOG_FUNCTIONS and command not in visible_names and not re.match(r"^\s*" + re.escape(command) + r"\s*\(", statement, flags=re.IGNORECASE):
                # The catalog recognizes a function, but it still requires call syntax.
                syntax = TI_CATALOG[lower_command][1]
                report.diagnostics.append(ti_error(680, number, f"Missing ( after {command}", f"Sintaxis de referencia: {syntax}"))
            elif lower_command not in VALID_COMMANDS and lower_command not in {"true", "false"} and command not in visible_names and not _is_symbolic_single_letter(command) and not _looks_like_expression(statement) and not _looks_like_function_call(statement):
                choices = difflib.get_close_matches(lower_command, sorted(VALID_COMMANDS | TI_CATALOG_NAMES), n=3, cutoff=0.65)
                hint = ""
                if choices:
                    suggested = choices[0]
                    if suggested in TI_CATALOG:
                        display, syntax, _ = TI_CATALOG[suggested]
                        hint = f"¿Quisiste escribir {display}? Sintaxis: {syntax}"
                    else:
                        hint = "Quizá quisiste escribir: " + ", ".join(choices)
                report.diagnostics.append(ti_error(410, number, f"Comando desconocido: {command}", hint))
            if lower_command in {"break", "cycle", "exit"} and not _has_any_open_block(block_stack, {"for", "while", "loop"}):
                report.diagnostics.append(ti_error(560, number, f"{command} fuera de Loop/For/While"))
            if lower_command == "return" and not document_start_seen:
                report.diagnostics.append(ti_error(550, number, "Return fuera de programa o funcion"))

        if line.lower() in {"prgm", "func"}:
            start_name = "Prgm" if line.lower() == "prgm" else "Func"
            if document_start_seen:
                report.diagnostics.append(ti_error(730, number, f"{start_name} duplicado"))
            if document_end_seen:
                report.diagnostics.append(ti_error(730, number, f"{start_name} aparece despues del cierre del documento"))
            document_start_seen = True
            document_kind = start_name
            report.infos.append(f"[INFO] Linea {number}: {start_name} detectado")
            continue

        if line.lower() in {"endprgm", "endfunc"}:
            end_name = "EndPrgm" if line.lower() == "endprgm" else "EndFunc"
            expected = "EndFunc" if document_kind == "Func" else "EndPrgm"
            if document_end_seen:
                report.diagnostics.append(ti_error(730, number, f"{end_name} duplicado"))
            if document_kind and end_name != expected:
                report.diagnostics.append(ti_error(730, number, f"Se esperaba {expected}, no {end_name}"))
            document_end_seen = True
            report.infos.append(f"[INFO] Linea {number}: {end_name} detectado")
            continue

        local_match = LOCAL_RE.match(line)
        if local_match:
            raw_names = [part.strip() for part in local_match.group(1).split(",") if part.strip()]
            for raw_name in raw_names:
                if not _is_identifier(raw_name):
                    report.diagnostics.append(ti_error(610, number, f"Invalid variable name in Local statement: {raw_name}"))
            names = [name for name in raw_names if _is_identifier(name)]
            for name in names:
                if name in report.variables and (name not in parameter_names or name in explicit_locals):
                    report.diagnostics.append(ti_error(270, number, f"Variable ya declarada: {name}"))
                explicit_locals.add(name)
                report.variables.add(name)
                report.variable_lines.setdefault(name, number)
            report.infos.append(f"[INFO] Linea {number}: {len(names)} variables declaradas")
            continue

        if_match = IF_RE.match(line)
        lower_line = line.lower()
        first_word = _first_command(line)
        lower_first = first_word.lower() if first_word else ""

        if if_match and lower_line.startswith("if "):
            condition = if_match.group(1).strip()
            report.if_count += 1
            report.block_counts["If"] = report.block_counts.get("If", 0) + 1
            if not re.search(r"\bThen\b", _strip_strings_keep_layout(line), re.IGNORECASE):
                # TI's single-statement form uses either a colon or the next
                # physical line. Only the Then form opens an EndIf block.
                next_statement = next((value.strip() for value in lines[number:]
                                       if value.strip() and not _is_comment_line(value)), "")
                if inline_if:
                    condition = inline_if[0]
                    if not inline_if[1]:
                        report.diagnostics.append(ti_error(910, number, "If sin instruccion"))
                elif not next_statement or re.match(r"^(?:End\w*|Else(?:If)?|Then)\b", next_statement, re.IGNORECASE):
                    report.diagnostics.append(ti_error(740, number, "Missing Then in the If..EndIf block"))
            else:
                condition = re.split(r"\bThen\b", condition, flags=re.IGNORECASE)[0].strip()
                if_stack.append(number)
                block_stack.append(("if", number))
            if not condition:
                report.diagnostics.append(ti_error(20, number, "Condicion vacia"))
            report.infos.append(f"[INFO] Linea {number}: Inicio bloque If")
            tested_options.extend(_menu_tests(number, line))

        elif lower_line.startswith("elseif"):
            if not _has_open_block(block_stack, "if"):
                report.diagnostics.append(ti_error(280, number, "Else and ElseIf invalid outside of If...EndIf block"))
            if not re.search(r"\bThen\b", _strip_strings_keep_layout(line), re.IGNORECASE):
                report.diagnostics.append(ti_error(740, number, "Missing Then in the If..EndIf block"))
            tested_options.extend(_menu_tests(number, line))

        elif lower_line == "else":
            if _has_open_block(block_stack, "if"):
                pass
            elif _has_open_block(block_stack, "try"):
                _mark_open_try_has_else(try_stack)
            else:
                report.diagnostics.append(ti_error(280, number, "Else and ElseIf invalid outside of If...EndIf block"))

        elif lower_first in {"for", "while", "loop", "try"}:
            report.block_counts[BLOCK_NAMES[lower_first][0]] = report.block_counts.get(BLOCK_NAMES[lower_first][0], 0) + 1
            block_stack.append((lower_first, number))
            report.infos.append(f"[INFO] Linea {number}: Inicio bloque {BLOCK_NAMES[lower_first][0]}")
            if lower_first == "try":
                try_stack.append([number, False])
            if lower_first == "for":
                loop_var = _for_loop_var(line)
                if loop_var:
                    report.assigned.add(loop_var)

        if lower_line == "endif":
            report.endif_count += 1
            if not if_stack:
                report.diagnostics.append(ti_error(730, number, "EndIf sin If previo"))
            else:
                start = if_stack.pop()
                report.infos.append(f"[INFO] Linea {number}: Fin bloque If iniciado en linea {start}")
            _close_block(report, block_stack, "endif", number, suppress_empty=True)

        elif lower_first in {"endfor", "endwhile", "endloop", "endtry"}:
            if lower_first == "endtry" and try_stack:
                try_line, has_else = try_stack.pop()
                if not has_else:
                    report.diagnostics.append(ti_error(290, number, "EndTry is missing the matching Else statement", f"Try iniciado en linea {try_line}"))
            _close_block(report, block_stack, lower_first, number)

        if request_match := REQUEST_RE.match(line):
            args = _split_args(request_match.group(2))
            if len(args) >= 2:
                dest = args[1].strip()
                if _is_identifier(dest):
                    report.assigned.add(dest)
                if len(args) == 4 and _is_identifier(args[3].strip()):
                    report.assigned.add(args[3].strip())

        if line.lower() == "disp":
            report.diagnostics.append(internal_warning(number, "Disp sin argumentos"))

        assignment = _assignment_parts(line)
        if inline_if:
            _collect_used_vars(report, inline_if[0], number)
        if assignment and (destination := _assignment_base(assignment[1])):
            report.assigned.add(destination)
            report.used.discard(destination)
            _collect_used_vars(report, assignment[0], number)
        elif lower_first in {"goto", "lbl", "label", "text"}:
            pass
        else:
            _collect_used_vars(report, line, number)

        menu_options.update(_displayed_menu_options(line))
        _check_division_by_zero(report, number, line)

    if not document_start_seen and not expression_function:
        report.diagnostics.append(ti_error(730, 1, "Documento no empieza con Prgm o Func"))
    if not document_end_seen and not expression_function:
        expected_end = "EndFunc" if document_kind == "Func" or (document_kind is None and str(document_type).lower() == "func") else "EndPrgm"
        report.diagnostics.append(ti_error(730, len(lines), f"Documento no termina con {expected_end}"))
    for start_line in if_stack:
        report.diagnostics.append(ti_error(730, start_line, "If sin EndIf correspondiente"))
    for block, start_line in block_stack:
        if block == "if":
            continue
        start_name, end_name = BLOCK_NAMES[block]
        report.diagnostics.append(ti_error(730, start_line, f"Expected {end_name}", f"{start_name} sin {end_name} correspondiente"))
    for try_line, has_else in try_stack:
        if not has_else:
            report.diagnostics.append(ti_error(290, int(try_line), "EndTry is missing the matching Else statement"))

    for used in sorted(report.used - report.variables - report.assigned - known_names - BUILTIN_NAMES):
        if is_function_document:
            continue
        if _is_symbolic_single_letter(used):
            continue
        suggestions = _suggest(used, report.variables | report.assigned)
        detail = "Sugerencias: " + ", ".join(suggestions) if suggestions else ""
        report.diagnostics.append(ti_error(960, report.used_lines.get(used, 0), f"Variable no declarada: {used}", detail))

    for name in sorted(report.variables - report.used):
        report.diagnostics.append(internal_warning(report.variable_lines.get(name, 0), f"Variable declarada pero no utilizada: {name}"))

    for line_number, option in tested_options:
        if menu_options and option not in menu_options:
            report.diagnostics.append(internal_warning(line_number, f"La opcion {option} no aparece en el menu mostrado"))

    return report


def is_critical_diagnostic(diagnostic: Diagnostic) -> bool:
    return diagnostic.severity == "ERROR" and diagnostic.message.startswith(CRITICAL_PREFIXES)


def ti_error(code: int, line: int, message: str | None = None, detail: str = "") -> Diagnostic:
    return Diagnostic("ERROR", line, message or TI_ERROR_CODES.get(code, "TI-Nspire error"), detail, code)


def ti_warning(code: int, line: int, message: str | None = None, detail: str = "") -> Diagnostic:
    return Diagnostic("WARNING", line, message or TI_WARNING_CODES.get(code, "TI-Nspire warning"), detail, code)


def internal_warning(line: int, message: str, detail: str = "") -> Diagnostic:
    return Diagnostic("WARNING", line, message, detail)


def format_ti_code(text: str) -> tuple[str, str]:
    formatted_lines = [line.strip() for line in _split_lines(text) if line.strip()]
    formatted = "\n".join(formatted_lines)
    diff = "\n".join(
        difflib.unified_diff(
            text.splitlines(),
            formatted.splitlines(),
            fromfile="antes",
            tofile="despues",
            lineterm="",
        )
    )
    return formatted, diff


def autofix_ti_code(text: str, document_type: str | None = None) -> tuple[str, str]:
    original_lines = _split_lines(text)
    expression_function = _is_expression_function(original_lines, document_type)
    fixed_lines: list[str] = []
    actions: list[str] = []
    # Trim only whitespace OUTSIDE the complete program, keeping internal
    # empty lines for readability and preserving existing program statements.
    if any(line.strip() for line in original_lines):
        while original_lines and not original_lines[0].strip():
            original_lines.pop(0)
            if "[100%] Eliminadas lineas vacias antes de Prgm/Func" not in actions:
                actions.append("[100%] Eliminadas lineas vacias antes de Prgm/Func")
        while original_lines and not original_lines[-1].strip():
            original_lines.pop()
            if "[100%] Eliminadas lineas vacias despues de EndPrgm/EndFunc" not in actions:
                actions.append("[100%] Eliminadas lineas vacias despues de EndPrgm/EndFunc")
    def new_scope(kind: str | None = None) -> dict:
        return {"kind": kind or "Prgm", "start_seen": bool(kind), "end_seen": False,
                "locals": set(), "ifs": []}

    # Internal Define blocks are independent programs. Their wrappers, Local
    # declarations and incomplete If blocks must never affect a sibling/parent.
    root_scope = new_scope()
    root_scope["kind"] = "Func" if str(document_type).lower() == "func" else "Prgm"
    scope_stack = [root_scope]
    first_statement = True

    def close_ifs(scope: dict) -> None:
        while scope["ifs"]:
            fixed_lines.append("EndIf")
            scope["ifs"].pop()
            actions.append("[100%] Anadido EndIf faltante")

    for raw_line in original_lines:
        original_line = raw_line.rstrip()
        line = _statement_line(original_line)
        separated = line != original_line
        stripped = line.strip()
        scope = scope_stack[-1]
        header = DEFINE_PROGRAM_RE.fullmatch(stripped)
        if header:
            kind = ("Func" if header.group(3).lower() == "func" else "Prgm") if header.group(3) else None
            if first_statement:
                scope["kind"] = kind or scope["kind"]
                scope["start_seen"] = bool(kind)
            else:
                scope = new_scope(kind)
                scope_stack.append(scope)
        if stripped and not _is_comment_line(stripped):
            first_statement = False

        if stripped.lower().startswith("if "):
            line = re.sub(r"\s+", " ", line).strip()
            if re.search(r"\bThen\b", _strip_strings_keep_layout(line), flags=re.IGNORECASE):
                scope["ifs"].append(len(fixed_lines))
                actions.append("[100%] Normalizado espacio en If")

        if stripped.lower() == "endif" and scope["ifs"]:
            scope["ifs"].pop()

        if stripped.lower() in {"prgm", "func"}:
            start_name = "Prgm" if stripped.lower() == "prgm" else "Func"
            if scope["start_seen"]:
                actions.append(f"[100%] Eliminado {start_name} duplicado")
                continue
            scope["start_seen"] = True
            scope["kind"] = start_name

        if stripped.lower() in {"endprgm", "endfunc"}:
            end_name = "EndPrgm" if stripped.lower() == "endprgm" else "EndFunc"
            expected_end = "EndFunc" if scope["kind"] == "Func" else "EndPrgm"
            if scope["end_seen"]:
                actions.append(f"[100%] Eliminado {end_name} duplicado")
                continue
            close_ifs(scope)
            if end_name != expected_end:
                line = expected_end
                actions.append(f"[100%] Corregido cierre a {expected_end}")
            scope["end_seen"] = True
            if scope is not root_scope:
                scope_stack.pop()

        if LOCAL_RE.match(stripped):
            line, removed_names = _dedupe_local_line(line)
            if removed_names:
                actions.append("[100%] Eliminadas variables Local duplicadas: " + ", ".join(removed_names))
                stripped = line.strip()
            normalized_local = re.sub(r"\s+", "", stripped).lower()
            if normalized_local in scope["locals"]:
                actions.append("[100%] Eliminada linea Local duplicada exacta")
                continue
            scope["locals"].add(normalized_local)

        line, quote_action = _fix_command_string(line)
        if quote_action:
            actions.append(quote_action)

        line, paren_count = _fix_missing_parentheses(line)
        if paren_count:
            actions.append(f"[95%] Anadidos {paren_count} parentesis faltantes")

        if separated:
            indent = len(line) - len(line.lstrip())
            line = line[:indent] + ":" + line[indent:]
        fixed_lines.append(line)

    while len(scope_stack) > 1:
        scope = scope_stack.pop()
        close_ifs(scope)
        expected_end = "EndFunc" if scope["kind"] == "Func" else "EndPrgm"
        fixed_lines.append(expected_end)
        actions.append(f"[100%] Anadido {expected_end} final de subrutina")
    close_ifs(root_scope)

    if not root_scope["start_seen"] and not expression_function:
        fixed_lines.insert(0, root_scope["kind"])
        actions.append(f"[100%] Anadido {root_scope['kind']} inicial")
    if not root_scope["end_seen"] and not expression_function:
        expected_end = "EndFunc" if root_scope["kind"] == "Func" else "EndPrgm"
        fixed_lines.append(expected_end)
        actions.append(f"[100%] Anadido {expected_end} final")

    fixed = "\n".join(fixed_lines)
    diff = "\n".join(
        difflib.unified_diff(
            text.splitlines(),
            fixed.splitlines(),
            fromfile="antes",
            tofile="despues",
            lineterm="",
        )
    )
    action_text = "\n".join(dict.fromkeys(actions)) or "No se aplicaron cambios automaticos."
    return fixed, action_text + ("\n\n" + diff if diff else "")


def _split_lines(text: str) -> list[str]:
    # Private math-font glyphs are lexical aliases, not undefined functions.
    # Preserve physical newlines so error locations still match the editor.
    result = []
    quoted = False
    aliases = {"\uf03f": "e", "\uf008": "d", "∑": "sumSeq", "Σ": "sumSeq", "∏": "prodSeq", "Π": "prodSeq", "∫": "integral"}
    index = 0
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    while index < len(text):
        char = text[index]
        if char == '"':
            quoted = not quoted
        result.append(char if quoted else aliases.get(char, char))
        index += 1
    normalized = "".join(result)
    # Do not turn a label or quoted example into a mathematical operation.
    parts = re.split(r'("(?:[^"]|"")*")', normalized)
    for index in range(0, len(parts), 2):
        for glyph, spelling in sorted(TI_GLYPH_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
            parts[index] = parts[index].replace(glyph, spelling)
    return "".join(parts).split("\n")


def _is_expression_function(lines: list[str], document_type: str | None) -> bool:
    """A graph/symbol Func can store one expression without Func/EndFunc.

    Require the scanner's explicit Func context so an accidentally unwrapped
    program is still diagnosed. ProgramEditor statements and explicit wrapper
    tokens keep their normal block validation.
    """
    if str(document_type).lower() != "func":
        return False
    expressions = [line.strip() for line in lines if line.strip() and not _is_comment_line(line)]
    if len(expressions) != 1:
        return False
    expression = expressions[0]
    command = (_first_command(expression) or "").lower()
    return command not in (TI_CATALOG_STATEMENTS | {"prgm", "func", "endprgm", "endfunc"})


def _check_lexical(report: SyntaxReport, line_number: int, line: str) -> None:
    allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_ +-*/^=<>(),.:;\"'[]{}&|!?%#\\→√")
    for char in line:
        if ord(char) < 32 and char not in "\t":
            report.diagnostics.append(ti_error(910, line_number, f"Caracter de control no valido: 0x{ord(char):02x}"))
        elif ord(char) < 128 and char not in allowed:
            report.diagnostics.append(ti_error(910, line_number, f"Caracter no valido: {char}"))
    if _has_unclosed_quote(line):
        report.diagnostics.append(ti_error(700, line_number, "Cadena sin cerrar"))


def _check_parentheses(report: SyntaxReport, line_number: int, line: str) -> None:
    depth = 0
    in_string = False
    for char in line:
        if char == '"':
            in_string = not in_string
        if in_string:
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth < 0:
                report.diagnostics.append(ti_error(910, line_number, "Parentesis extra"))
                return
    if depth > 0:
        report.diagnostics.append(ti_error(690, line_number, "Falta ')'"))


def _check_delimiters(report: SyntaxReport, line_number: int, line: str) -> None:
    pairs = {"(": ")", "[": "]", "{": "}"}
    names = {
        ")": ("Parentesis extra", "Falta ')'", 910, 690),
        "]": ("Corchete extra", "Falta ']'", 910, 710),
        "}": ("Llave extra", "Falta '}'", 910, 720),
    }
    stack: list[str] = []
    in_string = False

    for char in line:
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char in pairs:
            stack.append(pairs[char])
        elif char in names:
            if not stack or stack[-1] != char:
                report.diagnostics.append(ti_error(names[char][2], line_number, names[char][0]))
                return
            stack.pop()

    if stack:
        report.diagnostics.append(ti_error(names[stack[-1]][3], line_number, names[stack[-1]][1]))


def _check_function_arguments(report: SyntaxReport, line_number: int, line: str) -> None:
    clean = _strip_strings_keep_layout(line)
    index = 0
    while index < len(clean):
        match = IDENT_RE.search(clean, index)
        if not match:
            break

        name = match.group(0)
        lower_name = name.lower()
        cursor = match.end()
        while cursor < len(clean) and clean[cursor].isspace():
            cursor += 1
        if cursor >= len(clean) or clean[cursor] != "(":
            index = match.end()
            continue

        close_index = _find_matching_delimiter(clean, cursor, "(", ")")
        if close_index < 0:
            index = cursor + 1
            continue

        if lower_name in COMMAND_SIGNATURES:
            min_args, max_args = COMMAND_SIGNATURES[lower_name]
            inner = line[cursor + 1 : close_index]
            count = _count_args(inner)
            display = name
            if count < min_args:
                report.diagnostics.append(
                    ti_error(930, line_number, f"Too few arguments for {display}", f"Expected at least {min_args}; received {count}")
                )
            elif max_args is not None and count > max_args:
                report.diagnostics.append(
                    ti_error(940, line_number, f"Too many arguments for {display}", f"Expected at most {max_args}; received {count}")
                )

        index = close_index + 1


def _check_command_style_arguments(report: SyntaxReport, line_number: int, line: str) -> None:
    clean = _strip_strings_keep_layout(line).strip()
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\b(.*)$", clean)
    if not match:
        return

    command = match.group(1)
    lower_command = command.lower()
    if lower_command not in COMMAND_STYLE_SIGNATURES:
        return

    rest = line.strip()[len(command) :].strip()
    min_args, max_args = COMMAND_STYLE_SIGNATURES[lower_command]
    count = _count_args(rest)
    if count < min_args:
        report.diagnostics.append(ti_error(930, line_number, f"Too few arguments for {command}", f"Expected at least {min_args}; received {count}"))
    elif max_args is not None and count > max_args:
        report.diagnostics.append(ti_error(940, line_number, f"Too many arguments for {command}", f"Expected at most {max_args}; received {count}"))
    elif lower_command == "clear" and count not in (0, 4):
        report.diagnostics.append(ti_error(40, line_number, "Clear requires zero or four arguments"))
    elif lower_command in ("drawpoly", "fillpoly") and count > 2 and count % 2:
        report.diagnostics.append(ti_error(40, line_number, f"{command} requires x,y coordinate pairs or two lists"))


def _check_invalid_implied_multiply(report: SyntaxReport, line_number: int, line: str, known_vars: set[str]) -> None:
    clean = _strip_strings_keep_layout(line)
    for match in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", clean):
        name = match.group(1)
        lower = name.lower()
        if lower in COMMAND_SIGNATURES or lower in BUILTIN_NAMES or lower in VALID_COMMANDS:
            continue
        if name in known_vars:
            continue
    if re.search(r"\)\s*\(", clean):
        report.diagnostics.append(ti_error(440, line_number, "Invalid implied multiply", "Use multiplicacion explicita entre ')' y '('"))


def _check_division_by_zero(report: SyntaxReport, line_number: int, line: str) -> None:
    if re.search(r"/\s*0(?:\D|$)", line):
        report.diagnostics.append(ti_error(250, line_number, "Division por cero"))


def _check_math_domains(report: SyntaxReport, line_number: int, line: str) -> None:
    if re.search(r"(?:sqrt|√)\s*\(\s*-\d", line, re.IGNORECASE):
        report.diagnostics.append(ti_error(800, line_number, "Raiz de numero negativo"))
    if re.search(r"\blog\s*\(\s*-\d", line, re.IGNORECASE):
        report.diagnostics.append(ti_error(260, line_number, "Logaritmo fuera del dominio"))
    if re.search(r"\brand\s*\(\s*0\s*\)", line, re.IGNORECASE):
        report.diagnostics.append(ti_error(260, line_number, "Domain error: rand(0)"))
    for match in re.finditer(r"\b(?:sin|cos|tan)\s*\(\s*([+-]?\d+(?:\.\d+)?)", line, re.IGNORECASE):
        try:
            value = abs(float(match.group(1)))
        except ValueError:
            continue
        if value > 1_000_000:
            report.diagnostics.append(ti_error(1070, line_number, "Trig function argument too big for accurate reduction"))


def _check_assignment_errors(report: SyntaxReport, line_number: int, line: str, known_names: set[str]) -> None:
    parts = _assignment_parts(line)
    if not parts:
        return
    source, destination = parts
    if not destination:
        report.diagnostics.append(ti_error(390, line_number, "Invalid assignment"))
        return
    if "\\" in destination:
        report.diagnostics.append(ti_error(1170, line_number, "Invalid use of library pathname"))
        return
    base = _assignment_base(destination)
    if not base:
        report.diagnostics.append(ti_error(910, line_number, f"Syntax error: invalid assignment target {destination}"))
        return
    if base.lower() in RESERVED_NAMES:
        report.diagnostics.append(ti_error(870, line_number, f"Reserved name or system variable: {destination}"))
    if base != destination and base not in known_names:
        report.diagnostics.append(ti_error(960, line_number, f"Variable no declarada: {base}"))
    if re.search(rf"\b{re.escape(base)}\b", source) and base not in known_names:
        report.diagnostics.append(ti_error(190, line_number, f"Circular definition: {destination}"))


def _check_missing_function_parenthesis(report: SyntaxReport, line_number: int, line: str,
                                        known_names: set[str] | None = None) -> None:
    clean = _strip_strings_keep_layout(line)
    command_style_names = set(COMMAND_STYLE_SIGNATURES) | {"disp", "request", "prompt", "input", "local"}
    for name in COMMAND_SIGNATURES:
        if name in command_style_names or name in (known_names or set()):
            continue
        pattern = rf"\b{name}\b\s+(?![,(])\S+"
        if re.search(pattern, clean, re.IGNORECASE):
            report.diagnostics.append(ti_error(680, line_number, f"Missing ( after {name}"))


def _check_function_references(
    report: SyntaxReport,
    line_number: int,
    line: str,
    known_names: set[str],
    known_functions: set[str],
) -> None:
    clean = _strip_strings_keep_layout(line)
    clean = _strip_matrix_literals(clean)
    for match in re.finditer(r"\b(" + TI_IDENTIFIER + r")\s*\(", clean):
        name = match.group(1)
        lower = name.lower()
        if lower in BUILTIN_NAMES or lower in COMMAND_SIGNATURES or lower in COMMAND_STYLE_SIGNATURES:
            continue
        if name in known_functions or lower in {item.lower() for item in known_functions}:
            continue
        if _is_symbolic_single_letter(name):
            continue
        if name in known_names:
            report.diagnostics.append(ti_error(960, line_number, f"Variable no declarada: {name}", "La TI interpreta este caso como llamada a funcion, no multiplicacion implicita."))
        else:
            report.diagnostics.append(ti_error(1090, line_number, f"Function is not defined: {name}"))


def _strip_matrix_literals(text: str) -> str:
    result = []
    index = 0
    while index < len(text):
        if text.startswith("[[", index):
            end = text.find("]]", index + 2)
            if end >= 0:
                result.append(" " * (end + 2 - index))
                index = end + 2
                continue
        result.append(text[index])
        index += 1
    return "".join(result)


def _strip_function_calls(text: str, names: set[str]) -> str:
    result = []
    index = 0
    lowered_names = {name.lower() for name in names}
    while index < len(text):
        matched = ""
        for name in lowered_names:
            end_name = index + len(name)
            if text[index:end_name].lower() != name or end_name >= len(text):
                continue
            before = text[index - 1] if index else ""
            after = text[end_name]
            before_ok = not before or not (before.isalnum() or before == "_")
            after_ok = after.isspace() or after == "("
            if before_ok and after_ok:
                matched = name
                break
        if matched:
            open_index = text.find("(", index + len(matched))
            if open_index >= 0:
                close_index = _find_matching_delimiter(text, open_index, "(", ")")
                if close_index >= 0:
                    result.append(" " * (close_index + 1 - index))
                    index = close_index + 1
                    continue
        result.append(text[index])
        index += 1
    return "".join(result)


def _check_subscripts(report: SyntaxReport, line_number: int, line: str) -> None:
    clean = _strip_strings_keep_layout(line)
    # Brackets at the start of an expression or after another '[' are matrix
    # literals. Only brackets following a variable/expression are subscripts.
    for match in re.finditer(r"(?<=[A-Za-z0-9_)])\s*\[([^\[\]]*)\]", clean):
        arguments = _split_args(match.group(1))
        if len(arguments) > 2:
            report.diagnostics.append(ti_error(950, line_number, "Too many subscripts"))
        for argument in arguments:
            if re.fullmatch(r"[+-]?\d+", argument.strip()) and int(argument) <= 0:
                report.diagnostics.append(ti_error(350, line_number, "Index out of range"))


def _check_ans_usage(report: SyntaxReport, line_number: int, line: str) -> None:
    if re.search(r"\bAns\b", _strip_strings_keep_layout(line), re.IGNORECASE):
        report.diagnostics.append(ti_error(380, line_number, "Undefined Ans"))


def _first_command(line: str) -> str | None:
    match = IDENT_RE.match(line.strip())
    return match.group(0) if match else None


def _looks_like_expression(line: str) -> bool:
    return bool(re.search(r"(=|:=|->|→|▶|[+\-*/^])", line))


def _has_open_block(block_stack: list[tuple[str, int]], block: str) -> bool:
    return any(open_block == block for open_block, _ in block_stack)


def _has_any_open_block(block_stack: list[tuple[str, int]], blocks: set[str]) -> bool:
    return any(open_block in blocks for open_block, _ in block_stack)


def _mark_open_try_has_else(try_stack: list[list[object]]) -> None:
    if try_stack:
        try_stack[-1][1] = True


def _close_block(
    report: SyntaxReport,
    block_stack: list[tuple[str, int]],
    end_command: str,
    line_number: int,
    *,
    suppress_empty: bool = False,
) -> None:
    expected_start = next((start for start, end in BLOCK_PAIRS.items() if end == end_command), "")
    start_name, end_name = BLOCK_NAMES.get(expected_start, (expected_start.title(), end_command.title()))
    if not block_stack:
        if not suppress_empty:
            report.diagnostics.append(ti_error(730, line_number, f"{end_name} sin {start_name} previo"))
        return

    opener, start_line = block_stack.pop()
    expected_end = BLOCK_PAIRS[opener]
    if expected_end != end_command:
        _, expected_end_name = BLOCK_NAMES[opener]
        report.diagnostics.append(
            ti_error(
                730,
                line_number,
                f"Expected {expected_end_name}",
                f"Bloque {BLOCK_NAMES[opener][0]} iniciado en linea {start_line} se cerro con {end_name}",
            )
        )


def _parse_var_list(text: str) -> list[str]:
    return [part.strip() for part in text.split(",") if _is_identifier(part.strip())]


def _split_args(text: str) -> list[str]:
    args: list[str] = []
    current: list[str] = []
    in_string = False
    depth = 0
    for char in text:
        if char == '"':
            in_string = not in_string
        elif not in_string and char in "([{":
            depth += 1
        elif not in_string and char in ")]}":
            depth = max(0, depth - 1)
        if char == "," and not in_string and depth == 0:
            args.append("".join(current).strip())
            current.clear()
        else:
            current.append(char)
    args.append("".join(current).strip())
    return args


def _count_args(text: str) -> int:
    stripped = text.strip()
    if not stripped:
        return 0
    return len(_split_args(text))


def _find_matching_delimiter(text: str, open_index: int, opener: str, closer: str) -> int:
    depth = 0
    in_string = False
    for index in range(open_index, len(text)):
        char = text[index]
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return index
    return -1


def _strip_strings_keep_layout(text: str) -> str:
    result: list[str] = []
    in_string = False
    for char in text:
        if char == '"':
            in_string = not in_string
            result.append(" ")
        elif in_string:
            result.append(" ")
        else:
            result.append(char)
    return "".join(result)


def _is_identifier(text: str) -> bool:
    return bool(re.fullmatch(TI_IDENTIFIER, text))


def _is_symbolic_single_letter(text: str) -> bool:
    return bool(re.fullmatch(r"[a-z]", text))


def _is_comment_line(text: str) -> bool:
    stripped = text.lstrip("\ufeff \t")
    return stripped.startswith(("©", "Â©", "? ", "?\t", "(c)", "(C)", "#", "//"))


def _collect_used_vars(report: SyntaxReport, text: str, line_number: int) -> None:
    clean = re.sub(r'"[^"]*"', "", text)
    # Mask exact catalog tokens before the ASCII identifier scanner; otherwise
    # Greek constants and degree units would become partial names such as '_'.
    for token in sorted(TI_UNIT_CONSTANT_TOKENS, key=len, reverse=True):
        clean = re.sub(r"(?<![\w])" + re.escape(token) + r"(?![\w])", "0", clean)
    clean = _strip_matrix_literals(clean)
    clean = _strip_function_calls(clean, {"solve", "nsolve", "csolve"})
    clean = re.sub(r"(?i)^\s*Text\b.*$", "", clean)
    clean = re.sub(r"\b(?:Goto|Lbl|Label)\s+[A-Za-z_][A-Za-z0-9_]*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\b" + TI_IDENTIFIER + r"\s*(?=\()", "", clean)
    for name in IDENT_RE.findall(clean):
        lower = name.lower()
        if lower in BUILTIN_NAMES:
            continue
        if name in report.variables or name in report.assigned:
            report.used.add(name)
            report.used_lines.setdefault(name, line_number)
        elif not name[:1].isupper():
            report.used.add(name)
            report.used_lines.setdefault(name, line_number)


def _displayed_menu_options(line: str) -> set[str]:
    if not line.lower().startswith("disp "):
        return set()
    return set(re.findall(r'"[^"]*?(\d+)\s*:', line))


def _menu_tests(line_number: int, line: str) -> list[tuple[int, str]]:
    return [(line_number, match.group(1)) for match in re.finditer(r"\b(?:opcion|seleccion|op)\s*=\s*(\d+)", line, re.I)]


def _for_loop_var(line: str) -> str | None:
    match = re.match(r"(?i)^\s*For\s+([A-Za-z_][A-Za-z0-9_]*)\s*,", line)
    return match.group(1) if match else None


def _has_unclosed_quote(line: str) -> bool:
    return line.count('"') % 2 == 1


def _fix_unclosed_quote(line: str) -> tuple[str, bool]:
    if _has_unclosed_quote(line):
        return line + '"', True
    return line, False


def _fix_command_string(line: str) -> tuple[str, str | None]:
    stripped = line.strip()
    indent = line[: len(line) - len(line.lstrip())]

    request_match = re.match(r"(?i)^Request\s+(.+)$", stripped)
    if request_match:
        args = request_match.group(1)
        fixed_args = _fix_request_args(args)
        if fixed_args != args:
            return indent + "Request " + fixed_args, "[98%] Reparada cadena de Request respetando sus argumentos"
        return line, None

    disp_match = re.match(r"(?i)^Disp\s+(.+)$", stripped)
    if disp_match:
        arg = disp_match.group(1).strip()
        fixed_arg = _fix_disp_arg(arg)
        if fixed_arg != arg:
            return indent + "Disp " + fixed_arg, "[95%] Reparada cadena de Disp"
        return line, None

    return _fix_unclosed_quote(line)[0], "[100%] Cerrada comilla" if _has_unclosed_quote(line) else None


def _fix_request_args(args: str) -> str:
    fixed_missing_comma = re.sub(r'("[^"]*")\s*([A-Za-z_][A-Za-z0-9_]*)\s*$', r"\1,\2", args.strip())
    if fixed_missing_comma != args.strip():
        return fixed_missing_comma
    if args.count('"') != 1:
        return args
    quote_pos = args.find('"')
    comma_pos = args.find(",", quote_pos + 1)
    if comma_pos < 0:
        return args + '"'
    tail = args[comma_pos + 1 :].strip()
    if _is_identifier(tail):
        return args[:comma_pos] + '"' + args[comma_pos:]
    return args + '"'


def _fix_disp_arg(arg: str) -> str:
    compact = arg.strip()
    if not compact:
        return arg
    if compact.startswith('"') and compact.endswith('"'):
        inner = compact[1:-1]
        if inner.endswith('"'):
            return '"' + inner.rstrip('"') + '"'
        return compact
    if compact.startswith('"') and compact.count('"') == 1:
        return compact + '"'
    if compact.endswith('"') and compact.count('"') == 1:
        return '"' + compact[:-1].strip() + '"'
    if '"' in compact:
        return compact
    if _looks_like_function_call(compact):
        return compact
    if _looks_like_expression(compact) or re.fullmatch(r"\d+(?:\.\d+)?", compact):
        return compact
    return '"' + compact + '"'


def _looks_like_function_call(text: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*\s*\(.*\)", text.strip()))


def _dedupe_local_line(line: str) -> tuple[str, list[str]]:
    match = re.match(r"^(\s*Local\s+)(.+)$", line, flags=re.IGNORECASE)
    if not match:
        return line, []

    prefix, body = match.groups()
    seen: set[str] = set()
    kept: list[str] = []
    removed: list[str] = []
    for raw_part in body.split(","):
        part = raw_part.strip()
        if not part:
            continue
        key = part.lower()
        if _is_identifier(part) and key in seen:
            removed.append(part)
            continue
        if _is_identifier(part):
            seen.add(key)
        kept.append(part)

    if not removed:
        return line, []
    return prefix + ",".join(kept), removed


def _fix_missing_parentheses(line: str) -> tuple[str, int]:
    depth = 0
    in_string = False
    for char in line:
        if char == '"':
            in_string = not in_string
        if in_string:
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
    return line + (")" * depth), depth


def _suggest(name: str, candidates: set[str]) -> list[str]:
    scored = sorted(
        ((candidate, _similarity(name.lower(), candidate.lower())) for candidate in candidates),
        key=lambda item: item[1],
        reverse=True,
    )
    return [candidate for candidate, score in scored[:3] if score >= 0.35]


def _similarity(left: str, right: str) -> float:
    return difflib.SequenceMatcher(a=left, b=right).ratio()
