import argparse
import re
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


LOCAL_SIG = b"PK\x03\x04"
CENTRAL_SIG = b"PK\x01\x02"
TIPD_SIG = b"TIPD"
TIMLP_RE = re.compile(br"^\*TIMLP\d{4}$")


@dataclass
class ProbeEntry:
    name: str
    local_offset: int
    method: int
    flags: int
    crc32: int
    compressed_size: int
    uncompressed_size: int
    data_offset: int
    header_kind: str

    @property
    def supported(self) -> bool:
        return self.method in {0, 8}


def read_tns_header(data: bytes) -> bytes:
    magic = data[:10]
    if not TIMLP_RE.match(magic):
        raise ValueError(f"Firma TNS no reconocida: {magic!r}")
    return magic


def parse_first_entry(data: bytes) -> ProbeEntry:
    magic = read_tns_header(data)
    base = len(magic)
    header = data[base:base + 26]
    if len(header) != 26:
        raise ValueError("Header inicial incompleto.")

    version, flags, method, mtime, mdate, crc32, csize, usize, nlen, xlen = struct.unpack(
        "<5H3L2H", header
    )
    name = data[base + 26:base + 26 + nlen].decode("utf-8", errors="replace")
    data_offset = base + 26 + nlen + xlen

    return ProbeEntry(
        name=name,
        local_offset=0,
        method=method,
        flags=flags,
        crc32=crc32,
        compressed_size=csize,
        uncompressed_size=usize,
        data_offset=data_offset,
        header_kind=magic.decode("ascii", errors="replace"),
    )


def parse_local_entry(data: bytes, offset: int) -> ProbeEntry:
    if data[offset:offset + 4] != LOCAL_SIG:
        raise ValueError(f"No hay PK0304 en offset {offset}.")

    base = offset + 4
    header = data[base:base + 26]
    if len(header) != 26:
        raise ValueError(f"Header local incompleto en {offset}.")

    version, flags, method, mtime, mdate, crc32, csize, usize, nlen, xlen = struct.unpack(
        "<5H3L2H", header
    )
    name = data[base + 26:base + 26 + nlen].decode("utf-8", errors="replace")
    data_offset = base + 26 + nlen + xlen

    return ProbeEntry(
        name=name,
        local_offset=offset,
        method=method,
        flags=flags,
        crc32=crc32,
        compressed_size=csize,
        uncompressed_size=usize,
        data_offset=data_offset,
        header_kind="PK0304",
    )


def find_tipd(data: bytes) -> int:
    idx = data.rfind(TIPD_SIG)
    if idx == -1:
        raise ValueError("No se encontro TIPD al final del archivo.")
    return idx


def parse_entries(data: bytes) -> tuple[bytes, list[ProbeEntry], tuple[int, int]]:
    magic = read_tns_header(data)
    tipd_offset = find_tipd(data)
    tipd = data[tipd_offset:tipd_offset + 22]
    if len(tipd) != 22:
        raise ValueError("TIPD incompleto.")

    sig, disk, cd_disk, disk_entries, total_entries, cd_size, cd_offset, comment = struct.unpack(
        "<4s4H2LH", tipd
    )
    if sig != TIPD_SIG:
        raise ValueError(f"Firma final invalida: {sig!r}")
    if disk_entries != total_entries:
        raise ValueError("Archivo multi-disco no soportado.")

    entries: list[ProbeEntry] = []
    cursor = cd_offset
    end = cd_offset + cd_size
    while cursor < end:
        if data[cursor:cursor + 4] != CENTRAL_SIG:
            raise ValueError(f"Firma PK0102 invalida en {cursor}.")
        header = data[cursor:cursor + 46]
        fields = struct.unpack("<4s6H3L5H2L", header)
        nlen, xlen, clen = fields[10], fields[11], fields[12]
        local_offset = fields[-1]
        name = data[cursor + 46:cursor + 46 + nlen].decode("utf-8", errors="replace")
        entry = parse_first_entry(data) if local_offset == 0 else parse_local_entry(data, local_offset)
        if entry.name != name:
            raise ValueError(f"Nombre no coincide entre central/local: {name} != {entry.name}")
        entries.append(entry)
        cursor += 46 + nlen + xlen + clen

    if len(entries) != total_entries:
        raise ValueError(f"TIPD declara {total_entries} entradas y se leyeron {len(entries)}.")

    return magic, entries, (cd_offset, cd_size)


def extract_supported(data: bytes, entry: ProbeEntry) -> bytes:
    blob = data[entry.data_offset:entry.data_offset + entry.compressed_size]
    if entry.method == 0:
        return blob
    if entry.method == 8:
        return zlib.decompress(blob, -15)
    raise NotImplementedError(f"Metodo {entry.method} no soportado para descompresion.")


def summarize(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    magic, entries, (cd_offset, cd_size) = parse_entries(data)
    print(f"Archivo: {path}")
    print(f"Tamano: {len(data)} bytes")
    print(f"Firma inicial: {magic!r}")
    print(f"TIPD: offset={find_tipd(data)}")
    print(f"Central directory: offset={cd_offset}, size={cd_size}")
    print()
    print("Entradas:")
    for entry in entries:
        print(
            f"- {entry.name}: local_offset={entry.local_offset}, data_offset={entry.data_offset}, "
            f"method={entry.method}, csize={entry.compressed_size}, usize={entry.uncompressed_size}, "
            f"extractable={'si' if entry.supported else 'no'}, header={entry.header_kind}"
        )
    return 0


def dump(args: argparse.Namespace) -> int:
    path = Path(args.file)
    out_dir = Path(args.out)
    data = path.read_bytes()
    magic, entries, _ = parse_entries(data)
    out_dir.mkdir(parents=True, exist_ok=True)

    for entry in entries:
        raw = data[entry.data_offset:entry.data_offset + entry.compressed_size]
        base_name = entry.name.replace("/", "_")

        meta = [
            f"name={entry.name}",
            f"header={entry.header_kind}",
            f"method={entry.method}",
            f"flags={entry.flags}",
            f"crc32=0x{entry.crc32:08X}",
            f"compressed_size={entry.compressed_size}",
            f"uncompressed_size={entry.uncompressed_size}",
            f"local_offset={entry.local_offset}",
            f"data_offset={entry.data_offset}",
            f"file_magic={magic.decode('ascii', errors='replace')}",
            "",
        ]
        (out_dir / f"{base_name}.meta.txt").write_text("\n".join(meta), encoding="utf-8")
        (out_dir / f"{base_name}.raw.bin").write_bytes(raw)

        if entry.supported:
            extracted = extract_supported(data, entry)
            (out_dir / base_name).write_bytes(extracted)
            print(f"extraido: {out_dir / base_name}")
        else:
            print(f"crudo: {out_dir / f'{base_name}.raw.bin'}")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Script de prueba para inspeccionar variantes TNS y volcar su contenido."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    info = sub.add_parser("info", help="Muestra estructura del TNS")
    info.add_argument("file", help="Archivo .tns")
    info.set_defaults(func=summarize)

    dump_cmd = sub.add_parser("dump", help="Vuelca entradas y metadatos")
    dump_cmd.add_argument("file", help="Archivo .tns")
    dump_cmd.add_argument("-o", "--out", default="probe_out", help="Directorio de salida")
    dump_cmd.set_defaults(func=dump)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
