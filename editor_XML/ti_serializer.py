from __future__ import annotations


class TISerializer:
    def from_multiline(self, text: str, separator: str = ":") -> str:
        lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        return separator.join(lines)


_SERIALIZER = TISerializer()


def multiline_to_ti_serialized(texto: str) -> str:
    return _SERIALIZER.from_multiline(texto)
