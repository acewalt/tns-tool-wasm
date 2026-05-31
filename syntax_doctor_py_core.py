from __future__ import annotations

import ast
import re
import tokenize
from dataclasses import dataclass
from io import BytesIO


@dataclass
class PyDiagnostic:
    level: str
    line: int
    message: str


@dataclass
class PyAnalysis:
    diagnostics: list[PyDiagnostic]
    errors: int
    warnings: int
    info: int


class PythonSyntaxAnalyzer:
    """Python checker shared by the desktop GUI and the WASM/web port."""

    def analyze(self, code: str) -> PyAnalysis:
        diagnostics: list[PyDiagnostic] = []
        diagnostics.extend(self._check_non_ascii(code))
        tree = self._parse(code, diagnostics)
        if tree is not None:
            diagnostics.extend(self._check_rejected_nodes(tree))
        errors = sum(1 for item in diagnostics if item.level == "error")
        warnings = sum(1 for item in diagnostics if item.level == "warning")
        info = sum(1 for item in diagnostics if item.level == "info")
        return PyAnalysis(diagnostics=diagnostics, errors=errors, warnings=warnings, info=info)

    def auto_fix(self, code: str) -> tuple[str, list[str]]:
        fixed = code.replace("\r\n", "\n").replace("\r", "\n")
        changes: list[str] = []

        normalized = "\n".join(line.rstrip() for line in fixed.split("\n"))
        if normalized != fixed:
            fixed = normalized
            changes.append("[100%] Espacios finales eliminados.")

        if "\t" in fixed:
            fixed = fixed.replace("\t", "    ")
            changes.append("[95%] Tabs convertidos a 4 espacios.")

        quote_fixed = self._fix_unclosed_simple_string(fixed)
        if quote_fixed != fixed:
            fixed = quote_fixed
            changes.append("[95%] Comilla final agregada en cadena incompleta.")

        colon_fixed = self._fix_missing_block_colons(fixed)
        if colon_fixed != fixed:
            fixed = colon_fixed
            changes.append("[95%] Dos puntos agregados en encabezado de bloque Python.")

        balanced = self._fix_missing_closers_by_line(fixed)
        if balanced != fixed:
            fixed = balanced
            changes.append("[90%] Cerradores faltantes agregados en la linea del bloque abierto.")

        if fixed and not fixed.endswith("\n"):
            fixed += "\n"
            changes.append("[100%] Nueva linea final agregada.")

        return fixed, changes

    def _parse(self, code: str, diagnostics: list[PyDiagnostic]) -> ast.AST | None:
        try:
            return ast.parse(code)
        except SyntaxError as exc:
            line = exc.lineno or 1
            detail = exc.msg or "Sintaxis invalida"
            diagnostics.append(PyDiagnostic("error", line, f"SyntaxError: {detail}"))
            return None

    def _check_non_ascii(self, code: str) -> list[PyDiagnostic]:
        diagnostics: list[PyDiagnostic] = []
        for line_no, line in enumerate(code.splitlines(), start=1):
            for char in line:
                if ord(char) > 127:
                    diagnostics.append(PyDiagnostic("error", line_no, f"Caracter no ASCII: {char!r}"))
                    break
        return diagnostics

    def _check_rejected_nodes(self, tree: ast.AST) -> list[PyDiagnostic]:
        diagnostics: list[PyDiagnostic] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.JoinedStr):
                diagnostics.append(PyDiagnostic("error", getattr(node, "lineno", 1), "f-strings no soportados."))
        if not diagnostics:
            diagnostics.append(PyDiagnostic("info", 1, "ast.parse completo sin errores criticos."))
        return diagnostics

    def _fix_unclosed_simple_string(self, code: str) -> str:
        try:
            list(tokenize.tokenize(BytesIO(code.encode("utf-8")).readline))
            return code
        except tokenize.TokenError as exc:
            message = str(exc.args[0])
            if "EOF in multi-line string" not in message and "EOL while scanning string literal" not in message:
                return code

        lines = code.split("\n")
        for index in range(len(lines) - 1, -1, -1):
            line = lines[index]
            stripped = line.rstrip()
            if not stripped or stripped.endswith(("'", '"')):
                continue
            single = len(re.findall(r"(?<!\\)'", stripped))
            double = len(re.findall(r'(?<!\\)"', stripped))
            if double % 2 == 1:
                lines[index] = stripped + '"'
                return "\n".join(lines)
            if single % 2 == 1:
                lines[index] = stripped + "'"
                return "\n".join(lines)
        return code

    def _fix_missing_block_colons(self, code: str) -> str:
        block_patterns = [
            r"^\s*def\s+\w+\s*\(.*\)\s*(?:->\s*[^:]+)?$",
            r"^\s*class\s+\w+(?:\s*\(.*\))?\s*$",
            r"^\s*(if|elif|for|while|with|except)\b.+$",
            r"^\s*(else|try|finally)\s*$",
            r"^\s*match\b.+$",
            r"^\s*case\b.+$",
        ]
        lines = code.split("\n")
        changed = False
        for index, line in enumerate(lines):
            stripped = line.rstrip()
            if not stripped or stripped.endswith(":") or stripped.lstrip().startswith("#"):
                continue
            if self._line_has_unclosed_string(stripped):
                continue
            if any(re.match(pattern, stripped) for pattern in block_patterns):
                lines[index] = stripped + ":"
                changed = True
        return "\n".join(lines) if changed else code

    def _line_has_unclosed_string(self, line: str) -> bool:
        single = len(re.findall(r"(?<!\\)'", line))
        double = len(re.findall(r'(?<!\\)"', line))
        return single % 2 == 1 or double % 2 == 1

    def _fix_missing_closers_by_line(self, code: str) -> str:
        pairs = {"(": ")", "[": "]", "{": "}"}
        reverse = {")": "(", "]": "[", "}": "{"}
        stack: list[tuple[str, int]] = []
        in_string: str | None = None
        escaped = False

        for line_no, line in enumerate(code.split("\n")):
            comment_started = False
            for char in line:
                if comment_started:
                    continue
                if in_string:
                    if escaped:
                        escaped = False
                    elif char == "\\":
                        escaped = True
                    elif char == in_string:
                        in_string = None
                    continue
                if char == "#":
                    comment_started = True
                elif char in ("'", '"'):
                    in_string = char
                elif char in pairs:
                    stack.append((char, line_no))
                elif char in reverse and stack and stack[-1][0] == reverse[char]:
                    stack.pop()

        if not stack:
            return code

        lines = code.split("\n")
        closers_by_line: dict[int, list[str]] = {}
        for opener, line_no in reversed(stack):
            closers_by_line.setdefault(line_no, []).append(pairs[opener])
        for line_no, closers in closers_by_line.items():
            if 0 <= line_no < len(lines):
                lines[line_no] = lines[line_no].rstrip() + "".join(closers)
        return "\n".join(lines)
