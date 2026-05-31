#!/usr/bin/env python3
"""Minimal pure Python encoder for TIXC0100 XML token streams."""

from __future__ import annotations

import re

from tixc_decode import decode_tixc


class TixcEncodeError(RuntimeError):
    pass


XML_DECL_RE = re.compile(br'^<\?xml\s+version="([^"]+)"\s+encoding="UTF-8"\s+\?>')
_ETA_TABLE = b" etaionsrhAlcduFmfpgybwvkxqjz,.'"
_DIGIT_TABLE = b"0123456789AN,.EFx; (){}[]^+-/*PB"
_ETA_SAFE = {c: i for i, c in enumerate(_ETA_TABLE[:15]) if c != ord("A")}
_DIGIT_SAFE = {c: i for i, c in enumerate(_DIGIT_TABLE[:14]) if c not in (ord("A"), ord("N"))}
_MIN_TOKEN_RUN = 6


def _encode_utf8_sequence(seq: bytes) -> bytes:
    if len(seq) == 2:
        a, b = seq
        if not (0xC0 <= a <= 0xDF and 0x80 <= b <= 0xBF):
            raise TixcEncodeError(f"invalid two-byte UTF-8 sequence: {seq!r}")
        control = (a & 0x1C) >> 2
        packed = ((a & 0x03) << 6) | (b & 0x3F)
        return bytes([control, packed])

    if len(seq) == 3:
        a, b, c = seq
        if not (0xE0 <= a <= 0xEF and 0x80 <= b <= 0xBF and 0x80 <= c <= 0xBF):
            raise TixcEncodeError(f"invalid three-byte UTF-8 sequence: {seq!r}")
        x = ((a & 0x0F) << 4) | ((b & 0x3C) >> 2)
        y = ((b & 0x03) << 6) | (c & 0x3F)
        return bytes([0x80, x, y])

    if len(seq) == 4:
        a, b, c, d = seq
        if not (0xF0 <= a <= 0xF7 and 0x80 <= b <= 0xBF and 0x80 <= c <= 0xBF and 0x80 <= d <= 0xBF):
            raise TixcEncodeError(f"invalid four-byte UTF-8 sequence: {seq!r}")
        x = ((a & 0x07) << 2) | ((b & 0x30) >> 4)
        y = ((b & 0x0F) << 4) | ((c & 0x3C) >> 2)
        z = ((c & 0x03) << 6) | (d & 0x3F)
        return bytes([0x08, x, y, z])

    raise TixcEncodeError(f"unsupported UTF-8 sequence length: {len(seq)}")


def _pack_table_run(prefix: int, terminator: int, indexes: list[int]) -> bytes:
    # Text tokens pack the first table index into the low nibble of the control
    # byte, then two indexes per byte until a table-specific terminator nibble.
    if not indexes:
        return b""
    out = bytearray([prefix | indexes[0]])
    rest = indexes[1:]
    i = 0
    while i + 1 < len(rest):
        out.append((rest[i] << 4) | rest[i + 1])
        i += 2
    if i < len(rest):
        out.append((rest[i] << 4) | terminator)
    else:
        out.append(terminator << 4)
    return bytes(out)


def _table_run(data: bytes, start: int, table: dict[int, int]) -> tuple[int, list[int]]:
    indexes: list[int] = []
    pos = start
    while pos < len(data):
        idx = table.get(data[pos])
        if idx is None:
            break
        indexes.append(idx)
        pos += 1
    return pos, indexes


def _encode_text(data: bytes) -> bytes:
    out = bytearray()
    i = 0
    while i < len(data):
        b = data[i]
        if b < 0x80:
            # Only use shorthand tables for long safe runs. Literal ASCII is
            # more compatible for short/mixed text and easier to debug.
            digit_end, digit_indexes = _table_run(data, i, _DIGIT_SAFE)
            eta_end, eta_indexes = _table_run(data, i, _ETA_SAFE)
            if len(digit_indexes) >= _MIN_TOKEN_RUN and len(digit_indexes) >= len(eta_indexes):
                out += _pack_table_run(0xF0, 0x0F, digit_indexes)
                i = digit_end
                continue
            if len(eta_indexes) >= _MIN_TOKEN_RUN:
                out += _pack_table_run(0xA0, 0x0A, eta_indexes)
                i = eta_end
                continue
            if b in (0x09, 0x0A, 0x0D) or 0x20 <= b <= 0x7E:
                out.append(b)
                i += 1
                continue
            raise TixcEncodeError(f"unsupported XML text control byte 0x{b:02x}")

        if 0xC0 <= b <= 0xDF:
            size = 2
        elif 0xE0 <= b <= 0xEF:
            size = 3
        elif 0xF0 <= b <= 0xF7:
            size = 4
        else:
            raise TixcEncodeError(f"invalid UTF-8 lead byte 0x{b:02x}")
        seq = data[i : i + size]
        if len(seq) != size:
            raise TixcEncodeError("truncated UTF-8 sequence")
        out += _encode_utf8_sequence(seq)
        i += size
    return bytes(out)


def _name_end(data: bytes, pos: int) -> int:
    while pos < len(data) and data[pos] not in b" \t\r\n/=>":
        pos += 1
    return pos


def _skip_ws(data: bytes, pos: int) -> int:
    while pos < len(data) and data[pos] in b" \t\r\n":
        pos += 1
    return pos


def encode_tixc(xml: bytes) -> bytes:
    """Encode readable XML bytes as a TIXC0100 stream.

    The encoder intentionally emits a simple stream: literal first-use tag and
    attribute names, dictionary references for repeats and close tags, and text
    bytes encoded only where TIXC requires it.
    """
    match = XML_DECL_RE.match(xml)
    if not match:
        raise TixcEncodeError("XML must start with a UTF-8 declaration")
    version = match.group(1)
    body = xml[match.end() :]

    out = bytearray(b"TIXC0100-" + version + b"?>")
    tag_dict: list[bytes] = []
    tag_index: dict[bytes, int] = {}

    i = 0
    while i < len(body):
        if body.startswith(b"<![CDATA[", i):
            end = body.find(b"]]>", i + 9)
            if end < 0:
                raise TixcEncodeError("unterminated CDATA section")
            out += body[i : end + 3]
            i = end + 3
            continue

        if body[i] != ord("<"):
            next_tag = body.find(b"<", i)
            if next_tag < 0:
                next_tag = len(body)
            out += _encode_text(body[i:next_tag])
            i = next_tag
            continue

        if body.startswith(b"</", i):
            end = body.find(b">", i + 2)
            if end < 0:
                raise TixcEncodeError("unterminated close tag")
            name = body[i + 2 : end]
            idx = tag_index.get(name)
            if idx is None:
                raise TixcEncodeError(f"close tag has no dictionary entry: {name!r}")
            out += bytes([0x0E, idx])
            i = end + 1
            continue

        if body.startswith(b"<?", i):
            raise TixcEncodeError("processing instructions are only supported in the XML declaration")
        if body.startswith(b"<!", i):
            raise TixcEncodeError("only CDATA markup is supported")

        pos = i + 1
        name_end = _name_end(body, pos)
        if name_end == pos:
            raise TixcEncodeError(f"empty tag name at offset {i}")
        name = body[pos:name_end]
        idx = tag_index.get(name)
        used_tag_ref = idx is not None
        if idx is None:
            if len(tag_dict) >= 256:
                raise TixcEncodeError("tag dictionary exhausted")
            idx = len(tag_dict)
            tag_dict.append(name)
            tag_index[name] = idx
            out += b"<" + name
        else:
            out += bytes([0x0C, idx])

        pos = name_end
        has_attrs = False
        while True:
            pos = _skip_ws(body, pos)
            if pos >= len(body):
                raise TixcEncodeError("unterminated start tag")
            if body.startswith(b"/>", pos):
                out += b"/>"
                i = pos + 2
                break
            if body[pos] == ord(">"):
                # A tag dictionary start reference has an implicit '>' when it
                # is followed directly by content. If attributes were emitted,
                # the decoder is in the "after attribute value" state and needs
                # an explicit '>' to enter content state.
                if not used_tag_ref or has_attrs:
                    out.append(ord(">"))
                i = pos + 1
                break

            attr_start = pos
            attr_end = _name_end(body, pos)
            attr = body[attr_start:attr_end]
            pos = _skip_ws(body, attr_end)
            if pos >= len(body) or body[pos] != ord("="):
                raise TixcEncodeError(f"expected '=' after attribute {attr!r}")
            pos = _skip_ws(body, pos + 1)
            if pos >= len(body) or body[pos] != ord('"'):
                raise TixcEncodeError(f"expected double quote for attribute {attr!r}")
            value_start = pos + 1
            value_end = body.find(b'"', value_start)
            if value_end < 0:
                raise TixcEncodeError(f"unterminated value for attribute {attr!r}")
            value = body[value_start:value_end]
            has_attrs = True

            out += b" " + attr + b'="' + _encode_text(value) + b'"'
            pos = value_end + 1

    encoded = bytes(out)
    decoded = decode_tixc(encoded)
    if decoded != xml:
        first = next((i for i, (a, b) in enumerate(zip(decoded, xml)) if a != b), min(len(decoded), len(xml)))
        got = decoded[max(0, first - 80) : first + 160]
        want = xml[max(0, first - 80) : first + 160]
        raise TixcEncodeError(
            "internal TIXC roundtrip check failed at byte "
            f"{first}: got {got!r}; expected {want!r}"
        )
    return encoded
