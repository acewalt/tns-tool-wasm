from __future__ import annotations


class TIParser:
    """Parser for TI-Nspire serialized program statements."""

    OPEN_TO_CLOSE = {"{": "}", "[": "]", "(": ")"}
    CLOSE_TO_OPEN = {v: k for k, v in OPEN_TO_CLOSE.items()}

    def split_statements(self, text: str) -> list[str]:
        statements: list[str] = []
        current: list[str] = []
        stack: list[str] = []
        in_string = False
        i = 0

        while i < len(text):
            ch = text[i]

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

    def to_multiline(self, text: str) -> str:
        return "\n".join(self.split_statements(text))


_PARSER = TIParser()


def ti_serialized_to_multiline(texto: str) -> str:
    return _PARSER.to_multiline(texto)
