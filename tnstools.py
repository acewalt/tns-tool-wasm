#!/usr/bin/env python3
"""TI-Nspire .tns XML toolchain.

Examples:
    python tnstools.py -tns file.tns
    python tnstools.py -xml file.tns.xml
    python tnstools.py --validate
"""

from __future__ import annotations

import argparse
import binascii
import contextlib
import dataclasses
import io
import pathlib
import re
import struct
import tempfile
import time
import zlib

from tns_method13 import (
    PhoenixTixcExpander,
    PureTixcExpander,
    TixcError,
    decode_method13,
    decrypt_method13_to_tixc,
    encrypt_tixc_to_method13,
)
from tns_outer_parse import (
    CD_SIG,
    LOCAL_SIG,
    TIPD_SIG,
    TnsEntry,
    describe_entries,
    entry_payload,
    parse_tns,
)
from tixc_encode import encode_tixc


XML_ENTRY_SUFFIX = ".xml"
DEFAULT_VALIDATION_DIR = pathlib.Path("validation")


class Style:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"


@dataclasses.dataclass
class BuildEntry:
    name: str
    payload: bytes
    method: int
    crc32: int
    compressed_size: int
    uncompressed_size: int
    local_offset: int = 0


def _safe_output_path(out_dir: pathlib.Path, entry_name: str) -> pathlib.Path:
    # TNS entry names are ZIP-like paths. Normalize them and reject traversal so
    # a malicious document cannot write outside the requested output directory.
    rel = pathlib.PurePosixPath(entry_name.replace("\\", "/"))
    parts = [p for p in rel.parts if p not in ("", ".", "..")]
    if not parts:
        raise RuntimeError(f"unsafe or empty entry name: {entry_name!r}")
    return out_dir.joinpath(*parts)


def _inflate_method8(payload: bytes) -> bytes:
    errors: list[str] = []
    for wbits in (-15, 15):
        try:
            return zlib.decompress(payload, wbits)
        except zlib.error as exc:
            errors.append(str(exc))
    raise RuntimeError("method 8 inflate failed: " + "; ".join(errors))


def _make_tixc_backend(kind: str, phoenix: pathlib.Path | None) -> PureTixcExpander | PhoenixTixcExpander | None:
    if kind == "none":
        return None
    if kind in ("auto", "pure"):
        return PureTixcExpander()
    try:
        return PhoenixTixcExpander(phoenix) if phoenix else PhoenixTixcExpander()
    except TixcError:
        if kind == "auto":
            return PureTixcExpander()
        raise


def _default_xml_dir(input_path: pathlib.Path) -> pathlib.Path:
    return pathlib.Path(f"{input_path.name}.xml")


def _default_tns_path(xml_dir: pathlib.Path) -> pathlib.Path:
    name = xml_dir.name
    if name.lower().endswith(".xml"):
        return pathlib.Path(name[:-4])
    return pathlib.Path(f"{name}.tns")


def _color(text: str, color: str) -> str:
    return f"{color}{text}{Style.RESET}"


def _quiet_call(func, *args, **kwargs):
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream):
        return func(*args, **kwargs)


def _progress(label: str, step: int, total: int, *, status: str = "") -> None:
    width = 28
    filled = int(width * step / total) if total else width
    bar = "#" * filled + "-" * (width - filled)
    suffix = f" {status}" if status else ""
    print(f"\r{_color(label, Style.CYAN)} [{bar}] {step}/{total}{suffix}", end="", flush=True)
    if step >= total:
        print()


def _xml_file_map(xml_dir: pathlib.Path) -> dict[pathlib.PurePosixPath, bytes]:
    files: dict[pathlib.PurePosixPath, bytes] = {}
    for path in xml_dir.rglob("*.xml"):
        if not path.is_file() or "_artifacts" in path.parts:
            continue
        rel = pathlib.PurePosixPath(path.relative_to(xml_dir).as_posix())
        files[rel] = path.read_bytes()
    return files


def _compare_xml_dirs(left: pathlib.Path, right: pathlib.Path) -> tuple[bool, list[str]]:
    left_files = _xml_file_map(left)
    right_files = _xml_file_map(right)
    issues: list[str] = []

    for rel in sorted(set(left_files) - set(right_files)):
        issues.append(f"missing after rebuild: {rel}")
    for rel in sorted(set(right_files) - set(left_files)):
        issues.append(f"extra after rebuild: {rel}")
    for rel in sorted(set(left_files) & set(right_files)):
        if left_files[rel] != right_files[rel]:
            issues.append(f"XML differs: {rel}")

    return not issues, issues


def _write_decode_artifacts(out_dir: pathlib.Path, input_name: str, data: bytes, entries: list[TnsEntry]) -> pathlib.Path:
    artifact_dir = out_dir / "_artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)

    manifest = [
        f"input={input_name}",
        "name\tmethod\tcompressed\tuncompressed\tcrc32\tlocal_header\tdata_offset",
    ]
    for entry in entries:
        manifest.append(
            f"{entry.name}\t{entry.method}\t{entry.compressed_size}\t{entry.uncompressed_size}\t"
            f"{entry.crc32:08x}\t0x{entry.local_header_offset:x}\t0x{entry.data_offset:x}"
        )
        if entry.method == 13 and entry.name.lower().endswith(XML_ENTRY_SUFFIX):
            try:
                tixc = decrypt_method13_to_tixc(entry_payload(data, entry))
            except Exception as exc:
                manifest.append(f"# failed to write TIXC for {entry.name}: {exc}")
                continue
            path = _safe_output_path(artifact_dir, entry.name + ".tixc")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(tixc)

    manifest_path = artifact_dir / "entries.tsv"
    manifest_path.write_text("\n".join(manifest) + "\n", encoding="utf-8")
    return artifact_dir


def decode_tns_file(
    input_path: pathlib.Path,
    out_dir: pathlib.Path | None = None,
    *,
    list_entries: bool = False,
    artifacts: bool = False,
    tixc_backend_kind: str = "auto",
    phoenix: pathlib.Path | None = None,
    write_tixc_on_failure: bool = False,
) -> pathlib.Path:
    data = input_path.read_bytes()
    entries = parse_tns(data)
    if not entries:
        raise RuntimeError("no TNS/ZIP entries found")
    if list_entries:
        print(describe_entries(data, entries))

    out_dir = out_dir or _default_xml_dir(input_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    backend = _make_tixc_backend(tixc_backend_kind, phoenix)

    if artifacts:
        artifact_dir = _write_decode_artifacts(out_dir, str(input_path), data, entries)
        print(f"wrote {artifact_dir}")

    wrote = 0
    for entry in entries:
        if not entry.name.lower().endswith(XML_ENTRY_SUFFIX):
            continue
        payload = entry_payload(data, entry)
        if entry.method == 0:
            out = payload
        elif entry.method == 8:
            out = _inflate_method8(payload)
        elif entry.method == 13:
            out = decode_method13(
                payload,
                entry.uncompressed_size,
                tixc_backend=backend,
                allow_tixc_passthrough=write_tixc_on_failure,
            )
        else:
            print(f"skip {entry.name}: unsupported compression method {entry.method}")
            continue

        suffix = ".tixc" if out.startswith(b"TIXC0100") else ""
        out_path = _safe_output_path(out_dir, entry.name + suffix)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(out)

        got_crc = binascii.crc32(out) & 0xFFFFFFFF
        crc_note = "ok" if got_crc == entry.crc32 else f"mismatch got={got_crc:08x}"
        size_note = "ok" if len(out) == entry.uncompressed_size else f"expected={entry.uncompressed_size}"
        print(f"wrote {out_path} len={len(out)} size={size_note} crc={crc_note}")
        wrote += 1

    if wrote == 0:
        raise RuntimeError("no XML entries were written")
    return out_dir


def _dos_datetime(now: float | None = None) -> tuple[int, int]:
    t = time.localtime(now or time.time())
    dos_time = (t.tm_hour << 11) | (t.tm_min << 5) | (t.tm_sec // 2)
    dos_date = ((t.tm_year - 1980) << 9) | (t.tm_mon << 5) | t.tm_mday
    return dos_time & 0xFFFF, dos_date & 0xFFFF


def _xml_sort_key(path: pathlib.Path) -> tuple[int, int, str]:
    name = path.name
    if name.lower() == "document.xml":
        return (0, 0, name.lower())
    m = re.fullmatch(r"problem(\d+)\.xml", name, flags=re.IGNORECASE)
    if m:
        return (1, int(m.group(1)), name.lower())
    return (2, 0, name.lower())


def _entry_name_for_xml(xml_dir: pathlib.Path, path: pathlib.Path) -> str:
    return path.relative_to(xml_dir).as_posix()


def _collect_xml_entries(xml_dir: pathlib.Path, *, method13: bool = True) -> list[BuildEntry]:
    files = sorted(
        [p for p in xml_dir.rglob("*.xml") if p.is_file() and "_artifacts" not in p.parts],
        key=_xml_sort_key,
    )
    if not files:
        raise RuntimeError(f"no XML files found in {xml_dir}")

    entries: list[BuildEntry] = []
    for path in files:
        xml = path.read_bytes()
        if method13:
            # The CRC and uncompressed size in the TNS directory describe the
            # final readable XML, while the stored payload is method 13 bytes.
            tixc = encode_tixc(xml)
            payload = encrypt_tixc_to_method13(tixc)
            method = 13
        else:
            payload = xml
            method = 0
        crc = binascii.crc32(xml) & 0xFFFFFFFF
        entries.append(
            BuildEntry(
                name=_entry_name_for_xml(xml_dir, path),
                payload=payload,
                method=method,
                crc32=crc,
                compressed_size=len(payload),
                uncompressed_size=len(xml),
            )
        )
    return entries


def _local_header(entry: BuildEntry, *, first: bool, dos_time: int, dos_date: int) -> bytes:
    name = entry.name.encode("utf-8")
    fixed = struct.pack(
        "<HHHHHIIIHH",
        20,
        0,
        entry.method,
        dos_time,
        dos_date,
        entry.crc32,
        entry.compressed_size,
        entry.uncompressed_size,
        len(name),
        0,
    )
    if first:
        return b"*TIMLP0601" + fixed + name
    return LOCAL_SIG + fixed + name


def _central_header(entry: BuildEntry, *, dos_time: int, dos_date: int) -> bytes:
    name = entry.name.encode("utf-8")
    return (
        CD_SIG
        + struct.pack(
            "<HHHHHHIIIHHHHHII",
            20,
            20,
            0,
            entry.method,
            dos_time,
            dos_date,
            entry.crc32,
            entry.compressed_size,
            entry.uncompressed_size,
            len(name),
            0,
            0,
            0,
            1,
            0x20,
            entry.local_offset,
        )
        + name
    )


def build_tns_from_xml(
    xml_dir: pathlib.Path,
    out_tns: pathlib.Path | None = None,
    *,
    list_entries: bool = False,
    allow_stored_xml: bool = False,
) -> pathlib.Path:
    if not xml_dir.is_dir():
        raise RuntimeError(f"XML input is not a directory: {xml_dir}")
    out_tns = out_tns or _default_tns_path(xml_dir)
    entries = _collect_xml_entries(xml_dir, method13=not allow_stored_xml)
    dos_time, dos_date = _dos_datetime()

    chunks: list[bytes] = []
    offset = 0
    for i, entry in enumerate(entries):
        entry.local_offset = offset
        header = _local_header(entry, first=i == 0, dos_time=dos_time, dos_date=dos_date)
        chunks.extend([header, entry.payload])
        offset += len(header) + len(entry.payload)

    cd_offset = offset
    cd_chunks = [_central_header(entry, dos_time=dos_time, dos_date=dos_date) for entry in entries]
    cd = b"".join(cd_chunks)
    eocd = struct.pack("<4sHHHHIIH", TIPD_SIG, 0, 0, len(entries), len(entries), len(cd), cd_offset, 0)
    out_tns.write_bytes(b"".join(chunks) + cd + eocd)

    if list_entries:
        parsed = parse_tns(out_tns.read_bytes())
        print(describe_entries(out_tns.read_bytes(), parsed))
    if allow_stored_xml:
        print(f"wrote {out_tns} (experimental method 0 stored XML)")
    else:
        print(f"wrote {out_tns} (method 13 encoded XML)")
    return out_tns


def verify_tns_matches_xml(tns_path: pathlib.Path, xml_dir: pathlib.Path) -> None:
    verify_dir = pathlib.Path(f"{tns_path.name}.verify.xml")
    decode_tns_file(tns_path, verify_dir)

    mismatches: list[str] = []
    for source in sorted(xml_dir.rglob("*.xml"), key=_xml_sort_key):
        if "_artifacts" in source.parts:
            continue
        rel = source.relative_to(xml_dir)
        got = verify_dir / rel
        if not got.exists():
            mismatches.append(f"missing decoded {rel}")
            continue
        if source.read_bytes() != got.read_bytes():
            mismatches.append(f"differs: {rel}")
    if mismatches:
        raise RuntimeError("verification failed: " + "; ".join(mismatches))
    print(f"verified {tns_path} against {xml_dir}")


def validate_folder(validation_dir: pathlib.Path = DEFAULT_VALIDATION_DIR) -> bool:
    return validate_folder_with_options(validation_dir)


def validate_folder_with_options(
    validation_dir: pathlib.Path = DEFAULT_VALIDATION_DIR,
    *,
    phoenix: bool = False,
    phoenix_path: pathlib.Path | None = None,
) -> bool:
    validation_dir.mkdir(parents=True, exist_ok=True)
    tns_files = sorted(p for p in validation_dir.glob("*.tns") if p.is_file())

    print(_color("TNS validation", Style.BOLD + Style.BLUE))
    print(f"folder: {validation_dir.resolve()}")
    if not tns_files:
        print(_color("No .tns files found. Place files in this folder and run again.", Style.YELLOW))
        return True

    passed = 0
    failed = 0
    binary_matches = 0
    phoenix_passed = 0

    for index, source_tns in enumerate(tns_files, 1):
        print()
        print(_color(f"[{index}/{len(tns_files)}] {source_tns.name}", Style.BOLD))
        label = "roundtrip"
        total_steps = 5

        try:
            with tempfile.TemporaryDirectory(prefix="tnstools_validate_") as tmp_name:
                tmp = pathlib.Path(tmp_name)
                original_xml = tmp / "original_xml"
                rebuilt_tns = tmp / "rebuilt.tns"
                rebuilt_xml = tmp / "rebuilt_xml"
                phoenix_xml = tmp / "phoenix_xml"

                _progress(label, 0, total_steps, status="decode original")
                _quiet_call(decode_tns_file, source_tns, original_xml)
                original_files = _xml_file_map(original_xml)
                if not original_files:
                    raise RuntimeError("original decode produced no XML files")
                print(f"\n  {_color('ok', Style.GREEN)} decoded original ({len(original_files)} XML files)")

                _progress(label, 1, total_steps, status="build temporary TNS")
                _quiet_call(build_tns_from_xml, original_xml, rebuilt_tns)
                print(f"\n  {_color('ok', Style.GREEN)} rebuilt temporary TNS")

                _progress(label, 2, total_steps, status="decode rebuilt")
                _quiet_call(decode_tns_file, rebuilt_tns, rebuilt_xml)
                rebuilt_files = _xml_file_map(rebuilt_xml)
                if not rebuilt_files:
                    raise RuntimeError("rebuilt decode produced no XML files")
                print(f"\n  {_color('ok', Style.GREEN)} decoded rebuilt ({len(rebuilt_files)} XML files)")

                _progress(label, 3, total_steps, status="compare XML")
                xml_ok, xml_issues = _compare_xml_dirs(original_xml, rebuilt_xml)
                if not xml_ok:
                    raise RuntimeError("; ".join(xml_issues[:5]))
                print(f"\n  {_color('ok', Style.GREEN)} XML roundtrip is byte-for-byte identical")

                _progress(label, 4, total_steps, status="compare TNS bytes")
                binary_equal = source_tns.read_bytes() == rebuilt_tns.read_bytes()
                _progress(label, 5, total_steps, status="done")
                if binary_equal:
                    binary_matches += 1
                    print(f"  {_color('ok', Style.GREEN)} rebuilt TNS is byte-identical to original")
                else:
                    print(
                        f"  {_color('info', Style.CYAN)} rebuilt TNS bytes differ from original "
                        "(expected for independent re-encoding)"
                    )

                if phoenix:
                    _progress(label, total_steps, total_steps, status="phoenix check")
                    _quiet_call(
                        decode_tns_file,
                        rebuilt_tns,
                        phoenix_xml,
                        tixc_backend_kind="phoenix",
                        phoenix=phoenix_path,
                    )
                    phoenix_ok, phoenix_issues = _compare_xml_dirs(original_xml, phoenix_xml)
                    if not phoenix_ok:
                        raise RuntimeError("phoenix XML comparison failed: " + "; ".join(phoenix_issues[:5]))
                    phoenix_passed += 1
                    print(f"  {_color('ok', Style.GREEN)} phoenix expansion matches original XML")

            passed += 1
            print(_color(f"PASS {source_tns.name}", Style.GREEN))
        except Exception as exc:
            failed += 1
            _progress(label, total_steps, total_steps, status="failed")
            print(_color(f"FAIL {source_tns.name}: {exc}", Style.RED))

    print()
    print(_color("Summary", Style.BOLD + Style.BLUE))
    print(f"  {_color(str(passed), Style.GREEN)} passed")
    print(f"  {_color(str(failed), Style.RED if failed else Style.GREEN)} failed")
    print(f"  {_color(str(binary_matches), Style.GREEN)} byte-identical rebuilds")
    if phoenix:
        print(f"  {_color(str(phoenix_passed), Style.GREEN)} phoenix checks passed")
    print(_color("Temporary decode/rebuild files were discarded.", Style.DIM))
    return failed == 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("-tns", type=pathlib.Path, metavar="FILE", help="decode .tns file to XML folder")
    mode.add_argument("-xml", type=pathlib.Path, metavar="DIR", help="build .tns file from XML folder")
    mode.add_argument(
        "--validate",
        nargs="?",
        const=DEFAULT_VALIDATION_DIR,
        type=pathlib.Path,
        metavar="DIR",
        help="validate every .tns in DIR (default: validation) using temporary roundtrip files",
    )
    ap.add_argument("-out", type=pathlib.Path, help="output folder for -tns or output .tns for -xml")
    ap.add_argument("--list", action="store_true", help="print parsed entries")
    ap.add_argument("--artifacts", action="store_true", help="with -tns, write _artifacts with TIXC streams and manifest")
    ap.add_argument("--verify", action="store_true", help="with -xml, decode rebuilt .tns and compare XML bytes")
    ap.add_argument(
        "--validate-phoenix",
        action="store_true",
        help="with --validate, also decode rebuilt files through phoenix.dll and compare XML bytes",
    )
    ap.add_argument(
        "--allow-stored-xml",
        action="store_true",
        help="with -xml, write experimental method 0 stored XML instead of method 13",
    )
    ap.add_argument(
        "--tixc-backend",
        choices=("auto", "pure", "phoenix", "none"),
        default="auto",
        help="TIXC backend for -tns method 13 decode (default: pure Python)",
    )
    ap.add_argument("--phoenix", type=pathlib.Path, help="optional phoenix.dll path for comparison backend")
    ap.add_argument(
        "--write-tixc-on-failure",
        action="store_true",
        help="with -tns, write inflated TIXC streams if XML expansion is unavailable",
    )
    args = ap.parse_args()

    try:
        if args.tns:
            decode_tns_file(
                args.tns,
                args.out,
                list_entries=args.list,
                artifacts=args.artifacts,
                tixc_backend_kind=args.tixc_backend,
                phoenix=args.phoenix,
                write_tixc_on_failure=args.write_tixc_on_failure,
            )
        elif args.xml:
            out_tns = build_tns_from_xml(
                args.xml,
                args.out,
                list_entries=args.list,
                allow_stored_xml=args.allow_stored_xml,
            )
            if args.verify:
                verify_tns_matches_xml(out_tns, args.xml)
        else:
            if args.out or args.artifacts or args.verify or args.list or args.allow_stored_xml:
                print(
                    _color(
                        "note: --validate ignores -out, --artifacts, --verify, --list, and --allow-stored-xml",
                        Style.YELLOW,
                    )
                )
            if not validate_folder_with_options(args.validate, phoenix=args.validate_phoenix, phoenix_path=args.phoenix):
                return 1
    except Exception as exc:
        raise SystemExit(str(exc)) from exc
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
