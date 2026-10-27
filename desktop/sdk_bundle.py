"""Build a solid-compressed SDK; keep its deep C++ paths out of the public ZIP."""
import gzip
import hashlib
import json
from pathlib import Path
import struct

MAGIC = b"TNS-SDK-1\n"


def pack(folder):
    folder = Path(folder).resolve()
    runtime = folder / "runtime"
    if runtime.is_symlink() or runtime.parent != folder:
        raise ValueError("Unexpected SDK runtime path")
    # The app compiles C, C++ and assembly, never Fortran. Keep LTO and all
    # C/C++ headers/libraries, including ext/pb_ds, available to projects.
    removed = 0
    for pattern in ("toolchain/libexec/gcc/*/*/f951.exe", "toolchain/arm-none-eabi/lib/libgfortran*.a"):
        for file in runtime.glob(pattern):
            if file.is_symlink() or not file.resolve().is_relative_to(runtime):
                raise ValueError("Unexpected Fortran component path")
            removed += file.stat().st_size
            file.unlink()
    entries = []
    for file in sorted(runtime.rglob("*")):
        if file.is_symlink():
            raise ValueError("SDK bundles cannot contain symbolic links")
        if not file.is_file():
            continue
        content = file.read_bytes()
        entries.append({"path": file.relative_to(runtime).as_posix(), "size": len(content),
                        "sha256": hashlib.sha256(content).hexdigest()})
    index = json.dumps(entries, separators=(",", ":")).encode("utf8")
    bundle = folder / "sdk.bin.gz"
    # One compression stream shares the dictionary across headers and duplicate
    # tool binaries. mtime=0 makes the same SDK produce the same archive hash.
    with bundle.open("wb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw,
                                                compresslevel=9, mtime=0) as output:
        output.write(MAGIC)
        output.write(struct.pack("<I", len(index)))
        output.write(index)
        for entry in entries:
            output.write((runtime / entry["path"]).read_bytes())
    compiler = folder / "TNS-Tool-Compiler-Windows-x64.exe"
    manifest = {"format": 1, "sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(),
                "compilerSha256": hashlib.sha256(compiler.read_bytes()).hexdigest(),
                "files": len(entries), "unpackedBytes": sum(e["size"] for e in entries),
                "compressedBytes": bundle.stat().st_size,
                "maxRelativePath": max(len(e["path"]) for e in entries),
                "fortranBytesRemoved": removed}
    (folder / "sdk.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    return manifest


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path(__file__).parent / "vendor/compiler")
    print(json.dumps(pack(parser.parse_args().directory), indent=2))
