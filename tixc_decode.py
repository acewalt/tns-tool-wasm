#!/usr/bin/env python3
"""Pure Python decoder for TI-Nspire TIXC0100 XML token streams."""

from __future__ import annotations


class TixcDecodeError(RuntimeError):
    pass


_TAG_NAME_TERMINATORS = {0x0E, 0x0F, 0x20, 0x2F, 0x3E}
_ETA_TABLE = b" etaionsrhAlcduFmfpgybwvkxqjz,.'"
_DIGIT_TABLE = b"0123456789AN,.EFx; (){}[]^+-/*PB"
_CDATA_OPEN = b"<![CDATA["
_CDATA_CLOSE = b"]]>"


def _special_digit(byte: int) -> bytes:
    if byte == ord("N"):
        return b"\xe2\x88\x92"
    if byte == ord("E"):
        return b"\xef\x80\x80"
    if byte == ord("P"):
        return b"))"
    if byte == ord("B"):
        return b"]["
    return bytes([byte])


class _TextDecoder:
    def __init__(self) -> None:
        self.state = 0
        self.count = 0
        self.tmp = 0

    def reset(self) -> None:
        self.state = 0
        self.count = 0
        self.tmp = 0

    def decode_byte(self, byte: int) -> bytes:
        out = bytearray()
        state = self.state

        if state == 0:
            if byte < 0xA0:
                needs_utf = (byte <= 0x1F and ((-9729 & 0xFFFFFFFF) >> byte) & 1) or byte >= 0x7F
                if needs_utf:
                    if (byte & 0xF0) == 0x80:
                        self.count = (byte & 0x0F) + 1
                        self.state = 28
                        return b""
                    if byte >= 8:
                        if byte == 8:
                            self.state = 30
                            return b""
                        if byte == 11:
                            self.state = 33
                            return b""
                        raise TixcDecodeError(f"unsupported TIXC text control byte 0x{byte:02x}")
                    self.tmp = (((byte & 7) | 0xF0) << 2) & 0xFF
                    self.count = 1
                    self.state = 27
                    return b""
                return bytes([byte])

            if (byte & 0xF0) == 0xA0:
                ch = _ETA_TABLE[byte & 0x0F]
                if ch == ord("F"):
                    self.state = 24
                    return b""
                if ch == ord("A"):
                    self.state = 0
                    return b""
                self.state = 23
                return bytes([ch])

            if (byte & 0xF0) == 0xF0:
                ch = _DIGIT_TABLE[byte & 0x0F]
                if ch == ord("A"):
                    self.state = 26
                    return b""
                if ch == ord("F"):
                    self.state = 0
                    return b""
                self.state = 25
                return _special_digit(ch)
            return b""

        if state == 23:
            ch1 = _ETA_TABLE[byte >> 4]
            if ch1 == ord("F"):
                return bytes([_ETA_TABLE[(byte & 0x0F) + 16]])
            if ch1 == ord("A"):
                self.state = 0
                return b""
            out.append(ch1)
            ch2 = _ETA_TABLE[byte & 0x0F]
            if ch2 == ord("F"):
                self.state = 24
                return bytes(out)
            if ch2 == ord("A"):
                self.state = 0
                return bytes(out)
            out.append(ch2)
            return bytes(out)

        if state == 24:
            out.append(_ETA_TABLE[(byte >> 4) + 16])
            ch2 = _ETA_TABLE[byte & 0x0F]
            if ch2 == ord("F"):
                return bytes(out)
            if ch2 == ord("A"):
                self.state = 0
                return bytes(out)
            out.append(ch2)
            self.state = 23
            return bytes(out)

        if state == 25:
            ch1 = _DIGIT_TABLE[byte >> 4]
            if ch1 == ord("A"):
                ch2 = _DIGIT_TABLE[(byte & 0x0F) + 16]
                if ch2 == ord("P"):
                    return b"))"
                if ch2 == ord("B"):
                    return b"]["
                return _special_digit(ch2)
            if ch1 == ord("F"):
                self.state = 0
                return b""
            out += _special_digit(ch1)
            ch2 = _DIGIT_TABLE[byte & 0x0F]
            if ch2 == ord("A"):
                self.state = 26
                return bytes(out)
            if ch2 == ord("F"):
                self.state = 0
                return bytes(out)
            out += _special_digit(ch2)
            return bytes(out)

        if state == 26:
            ch1 = _DIGIT_TABLE[(byte >> 4) + 16]
            if ch1 == ord("P"):
                out += b"))"
            elif ch1 == ord("B"):
                out += b"]["
            else:
                out += _special_digit(ch1)
            ch2 = _DIGIT_TABLE[byte & 0x0F]
            if ch2 == ord("A"):
                return bytes(out)
            if ch2 == ord("F"):
                self.state = 0
                return bytes(out)
            self.state = 25
            out += _special_digit(ch2)
            return bytes(out)

        if state == 27:
            self.state = 0
            self.count = 0
            return bytes([(self.tmp | (byte >> 6)) & 0xFF, (byte & 0x3F) | 0x80])

        if state == 28:
            self.state = 29
            self.tmp = byte
            return bytes([(byte >> 4) | 0xE0])

        if state == 29:
            self.count -= 1
            if self.count <= 0:
                self.state = 0
            else:
                self.state = 28
            return bytes([((byte >> 6) | (((self.tmp & 0x0F) | 0xE0) << 2)) & 0xFF, (byte & 0x3F) | 0x80])

        if state == 30:
            self.tmp = byte
            self.state = 31
            if byte >= 0x20:
                self.count = 2
                return bytes([0xF8, (byte >> 2) | 0x80])
            self.count = 1
            return bytes([((byte >> 2) & 7) | 0xF0])

        if state in (31, 35):
            self.count = 1
            self.state = 32
            out = bytes([((byte >> 4) | (((self.tmp & 3) | 0xF8) << 4)) & 0xFF])
            self.tmp = byte
            return out

        if state in (32, 36):
            self.state = 0
            self.count = 0
            return bytes([((byte >> 6) | (((self.tmp & 0x0F) | 0xE0) << 2)) & 0xFF, (byte & 0x3F) | 0x80])

        if state == 33:
            self.state = 34
            if byte >= 4:
                return bytes([(((byte & 0x40) != 0) | 0xFC) & 0xFF, (byte & 0x3F) | 0x80])
            return bytes([(byte & 3) | 0xF8])

        if state == 34:
            self.state = 35
            self.tmp = byte
            self.count = 1
            return bytes([(byte >> 2) | 0x80])

        raise TixcDecodeError(f"unsupported TIXC text state {state}")


def decode_tixc(data: bytes) -> bytes:
    """Convert TIXC0100 stream bytes to readable XML bytes."""
    if not data.startswith(b"TIXC"):
        raise TixcDecodeError("TIXC stream does not start with TIXC")

    dash = data.find(b"-", 4)
    qmark = data.find(b"?", dash + 1)
    if dash < 0 or qmark < 0 or data[qmark : qmark + 2] != b"?>":
        raise TixcDecodeError("invalid TIXC header")
    version = data[dash + 1 : qmark]

    pos = qmark + 2
    out = bytearray(b'<?xml version="' + version + b'" encoding="UTF-8" ?>')
    tag_dict: list[bytes] = []
    attr_dict: list[bytes] = []
    token = bytearray()
    text = _TextDecoder()
    state = 1
    cdata_match = 0

    def read_byte() -> int:
        if pos >= len(data):
            raise TixcDecodeError("unexpected end of TIXC stream")
        return data[pos]

    while pos < len(data):
        b = read_byte()

        if state == 1:
            if b != ord("<"):
                raise TixcDecodeError("expected root '<' after TIXC header")
            out.append(b)
            pos += 1
            state = 2

        elif state == 2:
            if b in _TAG_NAME_TERMINATORS:
                if b == 0x0E:
                    out += b"></"
                    state = 12
                elif b == 0x0F:
                    out.append(0x20)
                    state = 13
                elif b == 0x20:
                    if not token:
                        raise TixcDecodeError("empty tag before attribute separator")
                    out.append(0x20)
                    state = 4
                elif b == 0x2F:
                    out.append(0x2F)
                    state = 10 if not token else 9
                elif b == 0x3E:
                    if not token:
                        raise TixcDecodeError("empty tag before '>'")
                    out.append(0x3E)
                    state = 3
                if token:
                    if len(tag_dict) < 256:
                        tag_dict.append(bytes(token))
                    token.clear()
                pos += 1
            else:
                if len(token) >= 64:
                    raise TixcDecodeError("tag token exceeds 64 bytes")
                token.append(b)
                out.append(b)
                pos += 1

        elif state == 3:
            text.reset()
            if b == ord("<"):
                out.append(b)
                pos += 1
                token.clear()
                state = 17
            elif b == 0x0C:
                out.append(ord("<"))
                pos += 1
                token.clear()
                state = 11
            elif b == 0x0E:
                out += b"</"
                pos += 1
                token.clear()
                state = 12
            else:
                token.clear()
                state = 8

        elif state == 4:
            if b == ord("="):
                if len(attr_dict) < 256:
                    attr_dict.append(bytes(token))
                token.clear()
                out.append(b)
                pos += 1
                state = 5
            else:
                token.append(b)
                out.append(b)
                pos += 1

        elif state == 5:
            pos += 1
            if b == ord('"'):
                out.append(b)
                state = 6
            elif b != 0x20:
                raise TixcDecodeError("expected quote or space after attribute '='")

        elif state == 6:
            if b == ord('"') and text.state == 0:
                out.append(b)
                pos += 1
                token.clear()
                state = 7
            else:
                out += text.decode_byte(b)
                pos += 1

        elif state == 7:
            if b == ord(">"):
                out.append(b)
                pos += 1
                state = 3
            elif b == ord("/"):
                out.append(b)
                pos += 1
                state = 10
            elif b == 0x20:
                out.append(b)
                pos += 1
                state = 4
            elif b == 0x0F:
                out.append(0x20)
                pos += 1
                state = 13
            else:
                raise TixcDecodeError(f"unexpected byte 0x{b:02x} after attribute value")

        elif state == 8:
            if b == ord("<") and text.state == 0:
                out.append(b)
                pos += 1
                token.clear()
                state = 2
            elif b == 0x0C and text.state == 0:
                out.append(ord("<"))
                pos += 1
                token.clear()
                state = 11
            elif b == 0x0E and text.state == 0:
                out += b"</"
                pos += 1
                token.clear()
                state = 12
            else:
                out += text.decode_byte(b)
                pos += 1

        elif state == 9:
            out.append(b)
            pos += 1
            if b == ord(">"):
                state = 3

        elif state == 10:
            if b != ord(">"):
                raise TixcDecodeError("expected '>' after '/'")
            out.append(b)
            pos += 1
            state = 3

        elif state == 11:
            if b >= len(tag_dict):
                raise TixcDecodeError(f"tag dictionary index {b} out of range")
            tag = tag_dict[b]
            out += tag
            pos += 1
            state = 14

        elif state == 12:
            if b >= len(tag_dict):
                raise TixcDecodeError(f"tag dictionary index {b} out of range")
            tag = tag_dict[b]
            out += tag + b">"
            pos += 1
            state = 3

        elif state == 13:
            if b >= len(attr_dict):
                raise TixcDecodeError(f"attribute dictionary index {b} out of range")
            out += attr_dict[b] + b'="'
            pos += 1
            text.reset()
            state = 6

        elif state == 14:
            if b == 0x20:
                out.append(0x20)
                pos += 1
                state = 4
            elif b == ord("/"):
                pos += 1
                state = 15
            elif b == 0x0F:
                out.append(0x20)
                pos += 1
                state = 13
            else:
                out.append(ord(">"))
                state = 3

        elif state == 15:
            if b == ord(">"):
                out.append(ord("/"))
                state = 10
            else:
                out.append(ord(">"))
                state = 3

        elif state == 17:
            if b == ord("!"):
                out.append(b)
                pos += 1
                cdata_match = 2
                state = 18
            else:
                state = 2

        elif state == 18:
            if cdata_match >= len(_CDATA_OPEN):
                state = 19
                token.clear()
                continue
            if b != _CDATA_OPEN[cdata_match]:
                raise TixcDecodeError("invalid CDATA opener")
            out.append(b)
            pos += 1
            cdata_match += 1

        elif state == 19:
            out.append(b)
            pos += 1
            if b == ord("]"):
                cdata_match = 1
                state = 20

        elif state == 20:
            out.append(b)
            pos += 1
            if cdata_match < len(_CDATA_CLOSE) and b == _CDATA_CLOSE[cdata_match]:
                cdata_match += 1
            else:
                state = 19
                cdata_match = 0
            if cdata_match == len(_CDATA_CLOSE):
                state = 3
                cdata_match = 0

        else:
            raise TixcDecodeError(f"unsupported TIXC parser state {state}")

    if state not in (3,):
        raise TixcDecodeError(f"TIXC stream ended in state {state}")
    return bytes(out)
