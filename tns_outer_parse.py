#!/usr/bin/env python3
"""Parse the outer TI-Nspire .tns container.

This handles the ZIP-like wrapper differences used by TNS files:
the first local header signature is "*TIMLP####" instead of "PK\\x03\\x04",
and the end-of-central-directory signature may be "TIPD".
"""

from __future__ import annotations

import argparse
import binascii
import dataclasses
import pathlib
import struct
from typing import Iterable


LOCAL_SIG = b"PK\x03\x04"
CD_SIG = b"PK\x01\x02"
EOCD_SIG = b"PK\x05\x06"
TIPD_SIG = b"TIPD"
TIMLP_PREFIX = b"*TIMLP"


@dataclasses.dataclass
class TnsEntry:
    name: str
    method: int
    crc32: int
    compressed_size: int
    uncompressed_size: int
    local_header_offset: int
    data_offset: int
    name_len: int
    extra_len: int
    flags: int = 0
    source: str = "central"

    @property
    def data_end(self) -> int:
        return self.data_offset + self.compressed_size


def _u16(data: bytes, off: int) -> int:
    return struct.unpack_from("<H", data, off)[0]


def _u32(data: bytes, off: int) -> int:
    return struct.unpack_from("<I", data, off)[0]


def _decode_name(raw: bytes) -> str:
    for enc in ("utf-8", "cp437", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("latin-1", errors="replace")


def _find_eocd(data: bytes) -> tuple[int, bytes] | None:
    best: tuple[int, bytes] | None = None
    for sig in (EOCD_SIG, TIPD_SIG):
        off = data.rfind(sig)
        if off >= 0 and off + 22 <= len(data):
            if best is None or off > best[0]:
                best = (off, sig)
    return best


def _parse_local_at(data: bytes, off: int) -> tuple[int, int, int, int, int, int, int, str] | None:
    """Return method, flags, crc, csize, usize, nlen, xlen, kind."""
    if data.startswith(LOCAL_SIG, off):
        base = off + 4
        kind = "pk"
    elif data.startswith(TIMLP_PREFIX, off) and off + 10 <= len(data):
        base = off + 10
        kind = data[off : off + 10].decode("ascii", errors="replace")
    else:
        return None
    if base + 26 > len(data):
        return None
    flags = _u16(data, base + 2)
    method = _u16(data, base + 4)
    crc32 = _u32(data, base + 10)
    csize = _u32(data, base + 14)
    usize = _u32(data, base + 18)
    nlen = _u16(data, base + 22)
    xlen = _u16(data, base + 24)
    return method, flags, crc32, csize, usize, nlen, xlen, kind


def _local_data_offset(data: bytes, off: int, nlen: int, xlen: int) -> int:
    if data.startswith(LOCAL_SIG, off):
        return off + 30 + nlen + xlen
    if data.startswith(TIMLP_PREFIX, off):
        return off + 36 + nlen + xlen
    raise ValueError(f"not a local header at 0x{off:x}")


def _candidate_local_offsets(raw_off: int) -> Iterable[int]:
    yield raw_off
    yield raw_off + 6
    if raw_off >= 6:
        yield raw_off - 6


def _parse_central_directory(data: bytes) -> list[TnsEntry]:
    eocd = _find_eocd(data)
    if not eocd:
        return []
    eocd_off, _sig = eocd
    total_entries = _u16(data, eocd_off + 10)
    cd_size = _u32(data, eocd_off + 12)
    cd_off = _u32(data, eocd_off + 16)

    starts = [cd_off]
    if cd_off >= 6:
        starts.append(cd_off - 6)
    starts.append(cd_off + 6)
    starts.append(data.find(CD_SIG))

    for start in starts:
        if start < 0 or start + 46 > len(data) or not data.startswith(CD_SIG, start):
            continue
        entries: list[TnsEntry] = []
        off = start
        ok = True
        limit = min(len(data), start + cd_size + 1024)
        for _ in range(total_entries or 10_000):
            if off + 46 > len(data) or not data.startswith(CD_SIG, off):
                ok = total_entries == 0 or len(entries) == total_entries
                break
            flags = _u16(data, off + 8)
            method = _u16(data, off + 10)
            crc32 = _u32(data, off + 16)
            csize = _u32(data, off + 20)
            usize = _u32(data, off + 24)
            nlen = _u16(data, off + 28)
            xlen = _u16(data, off + 30)
            clen = _u16(data, off + 32)
            local_off = _u32(data, off + 42)
            name_raw = data[off + 46 : off + 46 + nlen]
            name = _decode_name(name_raw)

            local = None
            actual_local_off = local_off
            for cand in _candidate_local_offsets(local_off):
                local = _parse_local_at(data, cand)
                if local:
                    actual_local_off = cand
                    break
            if not local:
                ok = False
                break
            l_method, l_flags, l_crc32, l_csize, l_usize, l_nlen, l_xlen, _kind = local
            data_off = _local_data_offset(data, actual_local_off, l_nlen, l_xlen)
            entries.append(
                TnsEntry(
                    name=name,
                    method=method if method else l_method,
                    crc32=crc32 if crc32 else l_crc32,
                    compressed_size=csize if csize else l_csize,
                    uncompressed_size=usize if usize else l_usize,
                    local_header_offset=actual_local_off,
                    data_offset=data_off,
                    name_len=l_nlen,
                    extra_len=l_xlen,
                    flags=flags if flags else l_flags,
                    source="central",
                )
            )
            off += 46 + nlen + xlen + clen
            if total_entries == 0 and off >= limit:
                break
        if ok and entries:
            return entries
    return []


def _scan_local_headers(data: bytes) -> list[TnsEntry]:
    starts: list[int] = []
    if data.startswith(TIMLP_PREFIX):
        starts.append(0)
    off = 0
    while True:
        off = data.find(LOCAL_SIG, off)
        if off < 0:
            break
        starts.append(off)
        off += 1

    entries: list[TnsEntry] = []
    for off in sorted(set(starts)):
        parsed = _parse_local_at(data, off)
        if not parsed:
            continue
        method, flags, crc32, csize, usize, nlen, xlen, _kind = parsed
        data_off = _local_data_offset(data, off, nlen, xlen)
        name_start = data_off - nlen - xlen
        name = _decode_name(data[name_start : name_start + nlen])
        if not name or data_off + csize > len(data):
            continue
        entries.append(
            TnsEntry(
                name=name,
                method=method,
                crc32=crc32,
                compressed_size=csize,
                uncompressed_size=usize,
                local_header_offset=off,
                data_offset=data_off,
                name_len=nlen,
                extra_len=xlen,
                flags=flags,
                source="scan",
            )
        )
    return entries


def parse_tns(data: bytes) -> list[TnsEntry]:
    entries = _parse_central_directory(data)
    if entries:
        return entries
    return _scan_local_headers(data)


def entry_payload(data: bytes, entry: TnsEntry) -> bytes:
    return data[entry.data_offset : entry.data_end]


def describe_entries(data: bytes, entries: list[TnsEntry]) -> str:
    lines = []
    for entry in entries:
        payload = entry_payload(data, entry)
        display_name = entry.name.encode("ascii", errors="backslashreplace").decode("ascii")
        crc_note = ""
        if entry.method == 0:
            got = binascii.crc32(payload) & 0xFFFFFFFF
            crc_note = " ok" if got == entry.crc32 else f" got={got:08x}"
        lines.append(
            f"{display_name:30} method={entry.method:<3} "
            f"comp={entry.compressed_size:<8} uncomp={entry.uncompressed_size:<8} "
            f"crc={entry.crc32:08x}{crc_note} "
            f"local=0x{entry.local_header_offset:x} data=0x{entry.data_offset:x} "
            f"source={entry.source}"
        )
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=pathlib.Path)
    ap.add_argument("--extract-raw", type=pathlib.Path, help="directory for raw compressed payloads")
    args = ap.parse_args()

    data = args.input.read_bytes()
    entries = parse_tns(data)
    if not entries:
        raise SystemExit("no TNS/ZIP entries found")
    print(describe_entries(data, entries))

    if args.extract_raw:
        args.extract_raw.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            safe_name = entry.name.replace("/", "_").replace("\\", "_")
            out = args.extract_raw / f"{safe_name}.method{entry.method}.bin"
            out.write_bytes(entry_payload(data, entry))
            print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
