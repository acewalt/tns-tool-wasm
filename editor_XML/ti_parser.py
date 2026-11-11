from __future__ import annotations

import re


class TIParser:
    """Parser for TI-Nspire serialized program statements."""

    OPEN_TO_CLOSE = {"{": "}", "[": "]", "(": ")"}
    CLOSE_TO_OPEN = {v: k for k, v in OPEN_TO_CLOSE.items()}

    def split_statements(self, text: str) -> list[str]:
        statements: list[str] = []
        current: list[str] = []
        stack: list[str] = []
        in_string = False
        # Native program values include physical CR/LF line boundaries. A ©
        # comment owns the rest of that physical line, including colons, quotes
        # and brackets. Flat legacy values have no such boundary and retain
        # their historical colon-delimited decoding.
        has_line_boundaries = "\r" in text or "\n" in text
        in_comment = False
        i = 0

        while i < len(text):
            ch = text[i]

            if in_comment:
                current.append(ch)
                if ch in "\r\n":
                    in_comment = False
                i += 1
                continue

            if has_line_boundaries and not in_string and ch == "©":
                current.append(ch)
                in_comment = True
                i += 1
                continue

            if ch == '"':
                current.append(ch)
                if in_string and i + 1 < len(text) and text[i + 1] == '"':
                    current.append(text[i + 1])
                    i += 2
                    continue
                in_string = not in_string
                i += 1
                continue

            if not in_string:
                if ch in self.OPEN_TO_CLOSE:
                    stack.append(ch)
                elif ch in self.CLOSE_TO_OPEN and stack and stack[-1] == self.CLOSE_TO_OPEN[ch]:
                    stack.pop()
                elif ch == ":" and i + 1 < len(text) and text[i + 1] == "=":
                    current.append(ch)
                    i += 1
                    continue
                elif ch == ":" and not stack and self._should_keep_inline_if_separator("".join(current)):
                    current.append(ch)
                    i += 1
                    continue
                elif ch == ":" and not stack:
                    statements.append(self._clean_statement_boundary("".join(current)))
                    current = []
                    i += 1
                    continue

            current.append(ch)
            i += 1

        statements.append(self._clean_statement_boundary("".join(current)))
        return statements

    @staticmethod
    def _clean_statement_boundary(statement: str) -> str:
        return statement.strip("\r\n")

    @staticmethod
    def _should_keep_inline_if_separator(statement: str) -> bool:
        compact = statement.strip()
        clean = re.sub(r'"(?:[^"]|"")*"', '""', compact)
        return clean.lower().startswith("if ") and not re.search(r"\bThen\b", clean, re.IGNORECASE) and ":" not in clean

    def to_multiline(self, text: str) -> str:
        return "\n".join(self.split_statements(text))


_PARSER = TIParser()


def ti_serialized_to_multiline(texto: str) -> str:
    return _PARSER.to_multiline(texto)
