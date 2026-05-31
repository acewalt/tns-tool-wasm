#!/usr/bin/env python3
"""Decode TI-Nspire ZIP method 13 payloads.

The method 13 envelope is:
    40-byte fixed-key 3DES header ("TIEN0100")
    3DES counter-mode XOR body
    raw deflate stream
    TIXC token stream

All stages are implemented in pure Python.  The local TI Student Software
phoenix.dll backend is retained only as an optional comparison aid.
"""

from __future__ import annotations

import ctypes
import os
import pathlib
import struct
import zlib

from Crypto.Cipher import DES3
from tixc_decode import TixcDecodeError, decode_tixc


HEADER_KEY = bytes.fromhex(
    "79 c4 e0 f4 5e ef 7a 5b "
    "70 13 7a 57 c2 fd 3d 2c "
    "c2 70 7c c1 ad 2f 15 75"
)

DEFAULT_BODY_KEY_MATERIAL = bytes.fromhex(
    "8d 24 ef 91 1c 6e b6 27 02 b5 38 e0 4b 13 e0 e9 d4 e0 3d 75 16"
)
DEFAULT_COUNTER_SEED = 0x6D657468

PHOENIX_DEFAULT = pathlib.Path(
    r"C:\Program Files\TI Education\TI-Nspire CX Student Software\lib\phoenix.dll"
)


class Method13Error(RuntimeError):
    pass


class TixcError(Method13Error):
    pass


class PureTixcExpander:
    """Pure Python TIXC expander."""

    def expand(self, tixc: bytes, expected_size: int | None = None) -> bytes:
        out = decode_tixc(tixc)
        if expected_size is not None and len(out) != expected_size:
            raise TixcError(f"pure TIXC output size {len(out)} does not match expected {expected_size}")
        return out


def _odd_parity(byte: int) -> int:
    byte &= 0xFE
    if byte.bit_count() % 2 == 0:
        byte |= 1
    return byte


def _key7_to_des_key(key7: bytes) -> bytes:
    # TI stores each DES key as 56 packed key bits. DES3 expects 8 bytes per
    # component key with odd parity bits, so expand 7 bytes -> 8 bytes here.
    if len(key7) != 7:
        raise ValueError("DES key packing requires exactly 7 bytes")
    b = list(key7)
    out = [
        b[0] & 0xFE,
        ((b[1] >> 1) & 0x7E) | ((b[0] << 7) & 0xFF),
        ((b[2] >> 2) & 0x3E) | ((b[1] << 6) & 0xFF),
        ((b[3] >> 3) & 0x1E) | ((b[2] << 5) & 0xFF),
        ((b[4] >> 4) & 0x0E) | ((b[3] << 4) & 0xFF),
        ((b[5] >> 5) & 0x06) | ((b[4] << 3) & 0xFF),
        ((b[6] >> 6) & 0x02) | ((b[5] << 2) & 0xFF),
        (b[6] << 1) & 0xFF,
    ]
    return bytes(_odd_parity(x) for x in out)


def decrypt_method13_to_tixc(payload: bytes) -> bytes:
    """Return the inflated TIXC stream from a method 13 payload."""
    if len(payload) < 40:
        raise Method13Error("method 13 payload is shorter than the 40-byte header")

    header = DES3.new(HEADER_KEY, DES3.MODE_ECB).decrypt(payload[:40])
    if not header.startswith(b"TIEN0100"):
        raise Method13Error(f"bad method 13 header magic: {header[:8]!r}")

    block_size = struct.unpack_from("<I", header, 8)[0]
    if block_size != 0x400:
        raise Method13Error(f"unsupported method 13 block size: 0x{block_size:x}")

    seed = struct.unpack_from("<I", header, 12)[0]
    key_material = header[16:37]
    encrypted = payload[40:]
    decrypted = _method13_crypt_body(encrypted, seed, key_material)

    try:
        return zlib.decompress(bytes(decrypted), -15)
    except zlib.error as exc:
        raise Method13Error(f"raw deflate stage failed: {exc}") from exc


def _method13_crypt_body(data: bytes, seed: int, key_material: bytes) -> bytes:
    if len(key_material) != 21:
        raise Method13Error("method 13 key material must be exactly 21 bytes")
    body_key = b"".join(_key7_to_des_key(key_material[i : i + 7]) for i in (0, 7, 14))
    cipher = DES3.new(body_key, DES3.MODE_ECB)

    out = bytearray()
    for off in range(0, len(data), 8):
        # The body transform is symmetric: 3DES-ECB encrypts a synthetic counter
        # block and XORs that keystream with the payload block.
        block_index = (off // 8) % 0x400
        counter = b"\x00\x00\x00\x00" + struct.pack("<I", (seed + block_index) & 0xFFFFFFFF)
        keystream = cipher.encrypt(counter)
        out.extend(a ^ b for a, b in zip(data[off : off + 8], keystream))
    return bytes(out)


def encrypt_tixc_to_method13(
    tixc: bytes,
    *,
    seed: int = DEFAULT_COUNTER_SEED,
    key_material: bytes = DEFAULT_BODY_KEY_MATERIAL,
    level: int = 9,
) -> bytes:
    """Encode a TIXC stream into a method 13 payload."""
    if not tixc.startswith(b"TIXC0100"):
        raise Method13Error("method 13 encoder expects a TIXC0100 stream")
    if len(key_material) != 21:
        raise Method13Error("method 13 key material must be exactly 21 bytes")

    compressor = zlib.compressobj(level=level, wbits=-15)
    deflated = compressor.compress(tixc) + compressor.flush()

    header = (
        b"TIEN0100"
        + struct.pack("<I", 0x400)
        + struct.pack("<I", seed & 0xFFFFFFFF)
        + key_material
        + b"\x00\x00\x00"
    )
    encrypted_header = DES3.new(HEADER_KEY, DES3.MODE_ECB).encrypt(header)
    encrypted_body = _method13_crypt_body(deflated, seed, key_material)
    return encrypted_header + encrypted_body


class PhoenixTixcExpander:
    """Use phoenix.dll's TIXC expander, addressed by static RVA."""

    RVA_TIXC_INIT = 0xA93A70
    RVA_TIXC_EXPAND = 0xA93D50

    def __init__(self, dll_path: pathlib.Path | str = PHOENIX_DEFAULT):
        self.dll_path = pathlib.Path(dll_path).resolve()
        if not self.dll_path.exists():
            raise TixcError(f"phoenix.dll not found at {self.dll_path}")
        root = self.dll_path.parent.parent
        if root != self.dll_path.parent and root.exists():
            os.add_dll_directory(str(root))
        os.add_dll_directory(str(self.dll_path.parent))
        self.dll = ctypes.WinDLL(str(self.dll_path))
        base = self.dll._handle
        self._init = ctypes.CFUNCTYPE(None, ctypes.c_void_p)(base + self.RVA_TIXC_INIT)
        self._expand = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_void_p)(base + self.RVA_TIXC_EXPAND)

    @staticmethod
    def _set_u64(buf: ctypes.Array[ctypes.c_char], off: int, value: int) -> None:
        ctypes.c_uint64.from_buffer(buf, off).value = value

    @staticmethod
    def _set_i32(buf: ctypes.Array[ctypes.c_char], off: int, value: int) -> None:
        ctypes.c_int32.from_buffer(buf, off).value = value

    @staticmethod
    def _get_i32(buf: ctypes.Array[ctypes.c_char], off: int) -> int:
        return ctypes.c_int32.from_buffer(buf, off).value

    def expand(self, tixc: bytes, expected_size: int | None = None) -> bytes:
        if not tixc.startswith(b"TIXC0100"):
            return tixc

        out_cap = max(expected_size or 0, len(tixc) * 16 + 4096, 4096)
        ctx = ctypes.create_string_buffer(0x200)
        inbuf = ctypes.create_string_buffer(tixc)
        outbuf = ctypes.create_string_buffer(out_cap)

        self._init(ctypes.byref(ctx))
        self._set_u64(ctx, 0x00, ctypes.addressof(inbuf))
        self._set_i32(ctx, 0x08, len(tixc))
        self._set_u64(ctx, 0x10, ctypes.addressof(outbuf))
        self._set_i32(ctx, 0x18, out_cap)
        self._set_i32(ctx, 0x1C, 0)

        for _ in range(16):
            ret = self._expand(ctypes.byref(ctx))
            if ret:
                break
            if self._get_i32(ctx, 0x08) == 0:
                self._expand(ctypes.byref(ctx))
                break

        written = self._get_i32(ctx, 0x1C)
        if written <= 0:
            raise TixcError("phoenix.dll TIXC expander produced no output")
        return bytes(outbuf[:written])


def decode_method13(
    payload: bytes,
    expected_size: int | None = None,
    *,
    tixc_backend: PureTixcExpander | PhoenixTixcExpander | None = None,
    allow_tixc_passthrough: bool = False,
) -> bytes:
    """Decode a method 13 payload to XML bytes when a TIXC backend is available."""
    tixc = decrypt_method13_to_tixc(payload)
    if not tixc.startswith(b"TIXC0100"):
        return tixc
    if tixc_backend is None:
        if allow_tixc_passthrough:
            return tixc
        raise TixcError("method 13 deflated successfully, but TIXC expansion needs a backend")
    try:
        return tixc_backend.expand(tixc, expected_size)
    except TixcDecodeError as exc:
        raise TixcError(str(exc)) from exc
