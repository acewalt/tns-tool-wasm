#!/usr/bin/env python3
import argparse
import shutil
import struct
import tempfile
import zipfile
from pathlib import Path

MAGIC = b"TNSBUNDLEZIPv1!!"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bridge")
    ap.add_argument("runtime")
    ap.add_argument("output")
    args = ap.parse_args()

    bridge = Path(args.bridge)
    runtime = Path(args.runtime)
    output = Path(args.output)
    if not bridge.is_file():
        raise SystemExit(f"bridge not found: {bridge}")
    if not runtime.is_dir():
        raise SystemExit(f"runtime not found: {runtime}")
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        zpath = Path(td) / "runtime.zip"
        with zipfile.ZipFile(zpath, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as zf:
            for path in sorted(runtime.rglob("*")):
                if path.is_dir():
                    continue
                zf.write(path, path.relative_to(runtime).as_posix())
        zlen = zpath.stat().st_size
        with open(output, "wb") as out, open(bridge, "rb") as src, open(zpath, "rb") as zf:
            shutil.copyfileobj(src, out, 1024 * 1024)
            shutil.copyfileobj(zf, out, 1024 * 1024)
            out.write(MAGIC)
            out.write(struct.pack("<Q", zlen))
    try:
        shutil.copymode(bridge, output)
    except OSError:
        pass
    print(f"packed {output} ({output.stat().st_size} bytes, runtime zip {zlen} bytes)")


if __name__ == "__main__":
    main()
