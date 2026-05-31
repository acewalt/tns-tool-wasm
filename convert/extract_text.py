import argparse
import re
from pathlib import Path

import tns_probe


ASCII_RE = re.compile(rb"[ -~]{4,}")
UTF16LE_RE = re.compile(rb"(?:[\x20-\x7E]\x00){4,}")
UTF16BE_RE = re.compile(rb"(?:\x00[\x20-\x7E]){4,}")


def iter_ascii(data: bytes):
    for match in ASCII_RE.finditer(data):
        yield match.start(), "ascii", match.group().decode("ascii", errors="ignore")


def iter_utf16le(data: bytes):
    for match in UTF16LE_RE.finditer(data):
        yield match.start(), "utf16le", match.group().decode("utf-16le", errors="ignore")


def iter_utf16be(data: bytes):
    for match in UTF16BE_RE.finditer(data):
        yield match.start(), "utf16be", match.group().decode("utf-16be", errors="ignore")


def extract_texts(data: bytes):
    items = []
    items.extend(iter_ascii(data))
    items.extend(iter_utf16le(data))
    items.extend(iter_utf16be(data))
    items.sort(key=lambda item: item[0])
    return items


def load_target_bytes(path: Path, entry_name: str | None) -> tuple[str, bytes]:
    if path.suffix.lower() == ".tns":
        data = path.read_bytes()
        _, entries, _ = tns_probe.parse_entries(data)
        if entry_name:
            for entry in entries:
                if entry.name == entry_name:
                    blob = data[entry.data_offset:entry.data_offset + entry.compressed_size]
                    return entry.name, blob
            raise ValueError(f"No se encontro la entrada {entry_name} en {path}.")

        out = []
        for entry in entries:
            blob = data[entry.data_offset:entry.data_offset + entry.compressed_size]
            out.append((entry.name, blob))
        raise ValueError(
            "Debes indicar --entry al pasar un .tns. Entradas disponibles: "
            + ", ".join(name for name, _ in out)
        )

    return path.name, path.read_bytes()


def cmd_extract(args: argparse.Namespace) -> int:
    path = Path(args.file)
    label, data = load_target_bytes(path, args.entry)
    texts = extract_texts(data)

    print(f"Fuente: {path}")
    print(f"Bloque: {label}")
    print(f"Tamano: {len(data)} bytes")
    print()

    if not texts:
        print("No se encontro texto ASCII/UTF-16 legible.")
        return 0

    for offset, encoding, text in texts[: args.limit]:
        print(f"[0x{offset:06X}] {encoding}: {text}")

    if len(texts) > args.limit:
        print()
        print(f"... {len(texts) - args.limit} coincidencias mas")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extrae texto legible de blobs raw o entradas internas de un TNS."
    )
    parser.add_argument("file", help="Archivo .tns o .bin")
    parser.add_argument("--entry", help="Nombre de entrada interna si pasas un .tns")
    parser.add_argument("--limit", type=int, default=200, help="Maximo de coincidencias a mostrar")
    parser.set_defaults(func=cmd_extract)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
