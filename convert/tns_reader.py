import argparse
import os
import re
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


TNS_MAGIC = b"*TIMLP0900"
TNS_MAGIC_RE = re.compile(br"^\*TIMLP\d{4}$")
LOCAL_SIG = b"PK\x03\x04"
CENTRAL_SIG = b"PK\x01\x02"
EOCD_SIG = b"PK\x05\x06"
TNS_EOCD_SIG = b"TIPD"


@dataclass
class TnsEntry:
    name: str
    local_offset: int
    method: int
    flags: int
    crc32: int
    compressed_size: int
    uncompressed_size: int
    name_length: int
    extra_length: int
    data_offset: int
    source: str

    @property
    def supported(self) -> bool:
        return self.method in {0, 8}


def parse_first_entry(data: bytes) -> TnsEntry:
    if not TNS_MAGIC_RE.match(data[:10]):
        raise ValueError(f"El archivo no empieza con una firma TNS reconocida: {data[:10]!r}")

    # TNS reemplaza la firma PK0304 inicial por *TIMLP0900.
    base = 10
    header = data[base:base + 26]
    if len(header) != 26:
        raise ValueError("Header local inicial incompleto.")

    version, flags, method, mtime, mdate, crc32, csize, usize, nlen, xlen = struct.unpack(
        "<5H3L2H", header
    )
    name_start = base + 26
    name_end = name_start + nlen
    name = data[name_start:name_end].decode("utf-8", errors="replace")
    data_offset = name_end + xlen

    return TnsEntry(
        name=name,
        local_offset=0,
        method=method,
        flags=flags,
        crc32=crc32,
        compressed_size=csize,
        uncompressed_size=usize,
        name_length=nlen,
        extra_length=xlen,
        data_offset=data_offset,
        source="tns-header",
    )


def parse_local_entry(data: bytes, offset: int) -> TnsEntry:
    if data[offset:offset + 4] != LOCAL_SIG:
        raise ValueError(f"No hay firma PK0304 en offset {offset}.")

    base = offset + 4
    header = data[base:base + 26]
    if len(header) != 26:
        raise ValueError(f"Header local incompleto en offset {offset}.")

    version, flags, method, mtime, mdate, crc32, csize, usize, nlen, xlen = struct.unpack(
        "<5H3L2H", header
    )
    name_start = base + 26
    name_end = name_start + nlen
    name = data[name_start:name_end].decode("utf-8", errors="replace")
    data_offset = name_end + xlen

    return TnsEntry(
        name=name,
        local_offset=offset,
        method=method,
        flags=flags,
        crc32=crc32,
        compressed_size=csize,
        uncompressed_size=usize,
        name_length=nlen,
        extra_length=xlen,
        data_offset=data_offset,
        source="pk-local",
    )


def find_eocd(data: bytes) -> int:
    idx = data.rfind(EOCD_SIG)
    if idx != -1:
        return idx

    idx = data.rfind(TNS_EOCD_SIG)
    if idx != -1:
        return idx

    raise ValueError("No se encontro PK0506 ni TIPD al final del archivo.")


def parse_central_directory(data: bytes) -> list[TnsEntry]:
    eocd_offset = find_eocd(data)
    eocd = data[eocd_offset:eocd_offset + 22]
    if len(eocd) != 22:
        raise ValueError("EOCD incompleto.")

    sig = eocd[:4]
    (
        _sig,
        _disk_number,
        _cd_start_disk,
        entries_this_disk,
        total_entries,
        cd_size,
        cd_offset,
        comment_length,
    ) = struct.unpack("<4s4H2LH", eocd)

    if sig not in {EOCD_SIG, TNS_EOCD_SIG}:
        raise ValueError(f"Firma final no reconocida: {sig!r}")

    if entries_this_disk != total_entries:
        raise ValueError("Archivo multi-disco no soportado.")
    if comment_length != 0:
        raise ValueError("ZIP comment no soportado en este analizador.")

    entries = []
    cursor = cd_offset
    end = cd_offset + cd_size

    while cursor < end:
        if data[cursor:cursor + 4] != CENTRAL_SIG:
            raise ValueError(f"Firma PK0102 invalida en offset {cursor}.")

        header = data[cursor:cursor + 46]
        fields = struct.unpack("<4s6H3L5H2L", header)
        (
            _sig,
            _ver_made,
            _ver_needed,
            flags,
            method,
            _mtime,
            _mdate,
            crc32,
            csize,
            usize,
            nlen,
            xlen,
            clen,
            _disk_start,
            _internal_attr,
            _external_attr,
            local_offset,
        ) = fields

        name_start = cursor + 46
        name_end = name_start + nlen
        name = data[name_start:name_end].decode("utf-8", errors="replace")

        if local_offset == 0:
            local = parse_first_entry(data)
        else:
            local = parse_local_entry(data, local_offset)

        if local.name != name:
            raise ValueError(
                f"Desajuste entre central directory ({name}) y local header ({local.name})."
            )

        entries.append(local)
        cursor = name_end + xlen + clen

    if len(entries) != total_entries:
        raise ValueError(
            f"El EOCD declara {total_entries} entradas, pero se parsearon {len(entries)}."
        )

    return entries


def extract_entry(data: bytes, entry: TnsEntry) -> bytes:
    blob = data[entry.data_offset:entry.data_offset + entry.compressed_size]

    if entry.method == 0:
        return blob
    if entry.method == 8:
        return zlib.decompress(blob, -15)

    raise NotImplementedError(
        f"Metodo ZIP {entry.method} no soportado para {entry.name}."
    )


def print_summary(path: Path, data: bytes, entries: list[TnsEntry]) -> None:
    print(f"Archivo: {path}")
    print(f"Tamano: {len(data)} bytes")
    tail_sig = data[find_eocd(data):find_eocd(data) + 4]
    print(f"Firma TNS inicial: {data[:10]!r}")
    print(f"Firma final: {tail_sig!r}")
    print()
    print("Entradas detectadas:")
    for entry in entries:
        support = "si" if entry.supported else "no"
        print(
            f"- {entry.name}: local_offset={entry.local_offset}, "
            f"data_offset={entry.data_offset}, method={entry.method}, "
            f"csize={entry.compressed_size}, usize={entry.uncompressed_size}, "
            f"extractable={support}, source={entry.source}"
        )


def print_hex(path: Path, data: bytes, size: int = 128) -> None:
    print()
    print(f"Primeros {size} bytes de {path.name}:")
    for i in range(0, min(size, len(data)), 16):
        chunk = data[i:i + 16]
        hexs = " ".join(f"{b:02X}" for b in chunk)
        text = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        print(f"{i:08X}  {hexs:<47}  {text}")


def cmd_analyze(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    entries = parse_central_directory(data)
    print_summary(path, data, entries)
    if args.hex:
        print_hex(path, data)
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    path = Path(args.file)
    out_dir = Path(args.out)
    data = path.read_bytes()
    entries = parse_central_directory(data)

    out_dir.mkdir(parents=True, exist_ok=True)
    failures = []
    extracted_count = 0
    tns_stem = path.stem

    for entry in entries:
        try:
            extracted = extract_entry(data, entry)
            target_name = entry.name
            if entry.name == "q.py":
                target_name = f"{tns_stem}_extracted.py"
            target = out_dir / target_name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(extracted)
            print(f"extraido: {target}")
            extracted_count += 1
        except Exception as exc:
            failures.append((entry.name, entry.method, str(exc)))

    if failures:
        print()
        print("Advertencias:")
        for name, method, message in failures:
            print(f"- {name}: method={method} -> {message}")

    if extracted_count == 0:
        return 1

    if getattr(args, "open_dir", False):
        os.startfile(str(out_dir))

    return 0


def cmd_strings(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    seen = set()
    print(f"Strings ASCII en {path}:")

    current = bytearray()
    for b in data:
        if 32 <= b <= 126:
            current.append(b)
            continue

        if len(current) >= args.min_len:
            text = current.decode("ascii", errors="ignore")
            if text not in seen:
                seen.add(text)
                print(text)
        current.clear()

    if len(current) >= args.min_len:
        text = current.decode("ascii", errors="ignore")
        if text not in seen:
            seen.add(text)
            print(text)

    return 0


def cmd_tozip(args: argparse.Namespace) -> int:
    path = Path(args.file)
    out = Path(args.out)
    data = bytearray(path.read_bytes())

    if not data.startswith(TNS_MAGIC):
        raise ValueError("El archivo no tiene cabecera TNS esperada.")

    eocd_offset = find_eocd(data)
    if data[eocd_offset:eocd_offset + 4] != TNS_EOCD_SIG:
        raise ValueError("La firma final no es TIPD; no se aplico conversion TNS->ZIP.")

    # Reemplaza firmas TNS por firmas ZIP canónicas.
    body = bytearray()
    body += LOCAL_SIG
    body += data[len(TNS_MAGIC):]

    new_eocd_offset = eocd_offset - (len(TNS_MAGIC) - len(LOCAL_SIG))
    body[new_eocd_offset:new_eocd_offset + 4] = EOCD_SIG

    # Ajusta el offset del central directory en el EOCD.
    cd_offset_field = new_eocd_offset + 16
    old_cd_offset = struct.unpack("<L", body[cd_offset_field:cd_offset_field + 4])[0]
    new_cd_offset = old_cd_offset - (len(TNS_MAGIC) - len(LOCAL_SIG))
    body[cd_offset_field:cd_offset_field + 4] = struct.pack("<L", new_cd_offset)

    # Ajusta offsets locales en el central directory.
    cursor = new_cd_offset
    while body[cursor:cursor + 4] == CENTRAL_SIG:
        nlen, xlen, clen = struct.unpack("<3H", body[cursor + 28:cursor + 34])
        local_offset_field = cursor + 42
        local_offset = struct.unpack("<L", body[local_offset_field:local_offset_field + 4])[0]
        if local_offset != 0:
            local_offset -= len(TNS_MAGIC) - len(LOCAL_SIG)
            body[local_offset_field:local_offset_field + 4] = struct.pack("<L", local_offset)
        cursor += 46 + nlen + xlen + clen

    out.write_bytes(body)
    print(f"zip escrito: {out}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Analizador simple para TI-Nspire .tns con estructura ZIP hibrida."
    )
    sub = parser.add_subparsers(dest="command")

    analyze = sub.add_parser("analyze", help="Imprime resumen estructural")
    analyze.add_argument("file", nargs="?", default="p.tns", help="Ruta al archivo .tns")
    analyze.add_argument("--hex", action="store_true", help="Incluye volcado hexadecimal inicial")
    analyze.set_defaults(func=cmd_analyze)

    extract = sub.add_parser("extract", help="Extrae entradas soportadas")
    extract.add_argument("file", nargs="?", default="p.tns", help="Ruta al archivo .tns")
    extract.add_argument(
        "-o",
        "--out",
        default="tns_out",
        help="Directorio de salida",
    )
    extract.set_defaults(func=cmd_extract)

    strings_cmd = sub.add_parser("strings", help="Lista strings ASCII")
    strings_cmd.add_argument("file", nargs="?", default="p.tns", help="Ruta al archivo .tns")
    strings_cmd.add_argument("--min-len", type=int, default=4, help="Longitud minima")
    strings_cmd.set_defaults(func=cmd_strings)

    tozip = sub.add_parser("tozip", help="Convierte TNS a ZIP canonico")
    tozip.add_argument("file", nargs="?", default="p.tns", help="Ruta al archivo .tns")
    tozip.add_argument(
        "-o",
        "--out",
        default="converted.zip",
        help="Ruta del ZIP de salida",
    )
    tozip.set_defaults(func=cmd_tozip)

    parser.set_defaults(func=cmd_analyze, file="p.tns", hex=False)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
