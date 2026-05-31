from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ti_parser import TIParser, ti_serialized_to_multiline
from ti_serializer import TISerializer, multiline_to_ti_serialized
from xml_scanner import XMLCandidate, XMLScanner, first_program_candidate, format_scan_report
from xml_updater import XMLUpdater

__all__ = [
    "TIParser",
    "TISerializer",
    "XMLCandidate",
    "XMLScanner",
    "XMLUpdater",
    "first_program_candidate",
    "format_scan_report",
    "multiline_to_ti_serialized",
    "ti_serialized_to_multiline",
]


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Intermediate editor for TI-Nspire XML program code.")
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="Scan a .tns.xml folder or XML file.")
    scan.add_argument("path", nargs="?", default=".", type=Path)

    export = sub.add_parser("export", help="Export one serialized TI program as human multiline text.")
    export.add_argument("path", nargs="?", default=".", type=Path)
    export.add_argument("--program", "-p")
    export.add_argument("--out", "-o", type=Path)

    update = sub.add_parser("update", help="Update XML program code from a multiline text file.")
    update.add_argument("path", nargs="?", default=".", type=Path)
    update.add_argument("--program", "-p", required=True)
    update.add_argument("--from", dest="source", required=True, type=Path)
    update.add_argument("--out-dir", type=Path)
    update.add_argument("--in-place", action="store_true")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    path = args.path.resolve()

    if args.command == "scan":
        print(format_scan_report(XMLScanner(path).scan()))
        return 0

    if args.command == "export":
        try:
            candidate = first_program_candidate(XMLScanner(path).scan(), args.program)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 2
        multiline = ti_serialized_to_multiline(candidate.code_text or "")
        if args.out:
            args.out.write_text(multiline, encoding="utf-8")
        else:
            print(multiline)
        return 0

    if args.command == "update":
        source_text = args.source.read_text(encoding="utf-8")
        written = XMLUpdater(path).update_program(
            program_name=args.program,
            multiline_text=source_text,
            out_dir=args.out_dir.resolve() if args.out_dir else None,
            in_place=args.in_place,
        )
        if not written:
            print(f"No XML program locations were updated for {args.program}.", file=sys.stderr)
            return 2
        for updated_path in written:
            print(updated_path)
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
