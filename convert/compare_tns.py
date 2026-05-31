import argparse
from itertools import combinations
from pathlib import Path

import tns_probe


def load_problem_blob(path: Path) -> bytes:
    data = path.read_bytes()
    _, entries, _ = tns_probe.parse_entries(data)
    for entry in entries:
        if entry.name == "Problem1.xml":
            return data[entry.data_offset:entry.data_offset + entry.compressed_size]
    raise ValueError(f"{path} no contiene Problem1.xml")


def common_prefix_len(a: bytes, b: bytes) -> int:
    limit = min(len(a), len(b))
    for i in range(limit):
        if a[i] != b[i]:
            return i
    return limit


def common_suffix_len(a: bytes, b: bytes) -> int:
    limit = min(len(a), len(b))
    for i in range(1, limit + 1):
        if a[-i] != b[-i]:
            return i - 1
    return limit


def diff_ranges(a: bytes, b: bytes) -> list[tuple[int, int]]:
    limit = min(len(a), len(b))
    ranges = []
    start = None
    for i in range(limit):
        if a[i] != b[i]:
            if start is None:
                start = i
        elif start is not None:
            ranges.append((start, i - 1))
            start = None
    if start is not None:
        ranges.append((start, limit - 1))
    if len(a) != len(b):
        ranges.append((limit, max(len(a), len(b)) - 1))
    return ranges


def summarize_pair(path_a: Path, blob_a: bytes, path_b: Path, blob_b: bytes) -> None:
    prefix = common_prefix_len(blob_a, blob_b)
    suffix = common_suffix_len(blob_a, blob_b)
    diffs = diff_ranges(blob_a, blob_b)

    print()
    print(f"Comparando: {path_a.name} <-> {path_b.name}")
    print(f"- tamano A: {len(blob_a)}")
    print(f"- tamano B: {len(blob_b)}")
    print(f"- prefijo comun: {prefix} bytes")
    print(f"- sufijo comun: {suffix} bytes")
    print(f"- rangos distintos: {len(diffs)}")

    for start, end in diffs[:12]:
        print(f"  diff: {start}-{end}")

    if len(diffs) > 12:
        print(f"  ... {len(diffs) - 12} rangos mas")


def cmd_compare(args: argparse.Namespace) -> int:
    files = [Path(f) for f in args.files]
    blobs = {}

    for path in files:
        blob = load_problem_blob(path)
        blobs[path] = blob
        print(f"{path.name}: Problem1.xml.raw.bin -> {len(blob)} bytes")

    for a, b in combinations(files, 2):
        summarize_pair(a, blobs[a], b, blobs[b])

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compara los blobs Problem1.xml entre varios archivos TNS."
    )
    parser.add_argument("files", nargs="+", help="Lista de archivos .tns")
    parser.set_defaults(func=cmd_compare)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
