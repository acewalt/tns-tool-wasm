import argparse
import gzip
from pathlib import Path


SIGNATURES = [
    (b"PK\x03\x04", "zip_local"),
    (b"PK\x01\x02", "zip_central"),
    (b"PK\x05\x06", "zip_eocd"),
    (b"\x1f\x8b", "gzip"),
    (b"<?xml", "xml"),
    (b"<", "lt"),
]


def find_all(data: bytes, needle: bytes) -> list[int]:
    out = []
    start = 0
    while True:
        idx = data.find(needle, start)
        if idx == -1:
            return out
        out.append(idx)
        start = idx + 1


def cmd_scan(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    print(f"Archivo: {path}")
    print(f"Tamano: {len(data)}")
    print()
    for sig, label in SIGNATURES:
        offs = find_all(data, sig)
        if offs:
            print(f"{label}: {offs[:50]}")
    return 0


def cmd_extract_gzip(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    offs = find_all(data, b"\x1f\x8b")
    if not offs:
        print("No se encontraron firmas gzip.")
        return 1

    for idx in offs:
        try:
            chunk = gzip.decompress(data[idx:])
        except Exception as exc:
            print(f"gzip en offset {idx}: fallo -> {exc}")
            continue

        out = out_dir / f"gzip_{idx}.bin"
        out.write_bytes(chunk)
        print(f"extraido: {out}")

    return 0


def cmd_carve_zip(args: argparse.Namespace) -> int:
    path = Path(args.file)
    data = path.read_bytes()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    zip_offsets = find_all(data, b"PK\x03\x04")
    if not zip_offsets:
        print("No se encontraron headers ZIP locales.")
        return 1

    for idx in zip_offsets:
        out = out_dir / f"zip_{idx}.bin"
        out.write_bytes(data[idx:])
        print(f"volcado: {out}")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Busca subbloques embebidos dentro de blobs raw de TNS."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="Busca firmas internas")
    scan.add_argument("file")
    scan.set_defaults(func=cmd_scan)

    gz = sub.add_parser("gunzip", help="Intenta extraer subbloques gzip")
    gz.add_argument("file")
    gz.add_argument("-o", "--out", default="nested_out")
    gz.set_defaults(func=cmd_extract_gzip)

    zip_cmd = sub.add_parser("zip", help="Vuelca desde cada PK0304 encontrado")
    zip_cmd.add_argument("file")
    zip_cmd.add_argument("-o", "--out", default="nested_zip")
    zip_cmd.set_defaults(func=cmd_carve_zip)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
