"""Build-time only: pair the Windows compiler with pinned Ndless target libraries.

The Windows GCC executables remain Windows-native. Headers, target archives,
startup objects and PRG loaders come from the official Ndless SDK package.
No Linux executable is installed or run. No downloads occur at application runtime.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import struct
import tarfile
import urllib.request
import zipfile

SDK_NAME = "ndless-sdk_0.614.40413359722.1_amd64.deb"
SDK_URL = "https://github.com/ndless-nspire/Ndless/releases/download/nightly/" + SDK_NAME
SDK_SHA = "06321aadca645d16e6d99f9c57e13c3f1c4837ce142a922510c46f6ead13da23"
SOURCE_SHA = "b7de803d2fbd9799689cf7cdf1f7c8575d712dd57f6755ba36b16c04c07fdb2f"
MAGIC = b"TNSBUNDLEZIPv1!!"
SDK_PREFIX = "usr/lib/ndless-sdk/"


def inside(root, relative):
    parts = PurePosixPath(relative).parts
    if not parts or relative.startswith("/") or ".." in parts or "\\" in relative:
        raise ValueError("Unsafe archive path: " + relative)
    target = root.joinpath(*parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError("Archive path escaped output")
    return target


def deb_data(blob):
    if blob[:8] != b"!<arch>\n":
        raise ValueError("Invalid Debian archive")
    offset = 8
    while offset + 60 <= len(blob):
        header = blob[offset:offset + 60]
        size = int(header[48:58])
        name = header[:16].decode().strip().rstrip("/")
        data = blob[offset + 60:offset + 60 + size]
        if name.startswith("data.tar"):
            return tarfile.open(fileobj=io.BytesIO(data))
        offset += 60 + size + size % 2
    raise ValueError("SDK package has no data archive")


def prepare(folder, sdk_file=None):
    folder = folder.resolve()
    source = folder / "compiler-source.exe"
    executable = folder / "TNS-Tool-Compiler-Windows-x64.exe"
    if not source.exists():
        shutil.copyfile(executable, source)
    blob = source.read_bytes()
    if hashlib.sha256(blob).hexdigest() != SOURCE_SHA:
        raise ValueError("Pinned Windows compiler SHA256 mismatch")
    sdk_file = sdk_file or folder / SDK_NAME
    if not sdk_file.exists():
        urllib.request.urlretrieve(SDK_URL, sdk_file)
    sdk_blob = sdk_file.read_bytes()
    if hashlib.sha256(sdk_blob).hexdigest() != SDK_SHA:
        raise ValueError("Official SDK SHA256 mismatch")
    if blob[-24:-8] != MAGIC:
        raise ValueError("Windows compiler runtime footer missing")
    length = struct.unpack_from("<Q", blob, len(blob) - 8)[0]
    start = len(blob) - 24 - length
    if start <= 0:
        raise ValueError("Invalid embedded runtime size")
    stage = folder / "runtime-preparing"
    if stage.exists():
        if stage.is_symlink() or stage.resolve().parent != folder:
            raise ValueError("Unexpected staging path")
        shutil.rmtree(stage)
    stage.mkdir()
    with zipfile.ZipFile(io.BytesIO(blob[start:start + length])) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue
            target = inside(stage, item.filename)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(item))

    # Match the directory expected by the Windows host GCC's C++ include search.
    versions = list((stage / "toolchain/arm-none-eabi/include/c++").iterdir())
    if len(versions) != 1:
        raise ValueError("Unexpected Windows C++ header layout")
    host_cpp = versions[0].name
    with deb_data(sdk_blob) as archive:
        for item in archive:
            if not item.isfile():
                continue
            name = item.name.removeprefix("./")
            if name == "usr/share/doc/ndless-sdk/copyright":
                target = inside(stage, "licenses/official-sdk-copyright")
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(item).read())
            if not name.startswith(SDK_PREFIX):
                continue
            relative = name[len(SDK_PREFIX):]
            target = None
            if relative.startswith(("include/", "lib/", "system/", "tools/zehn_loader/")):
                target = inside(stage / "ndless", relative)
            elif relative.startswith("toolchain/install/arm-none-eabi/"):
                tail = relative[len("toolchain/install/arm-none-eabi/"):]
                if tail.startswith(("lib/", "include/")):
                    tail = tail.replace("include/c++/14.2.0/", "include/c++/" + host_cpp + "/", 1)
                    target = inside(stage / "toolchain/arm-none-eabi", tail)
            elif relative.startswith("toolchain/install/lib/gcc/arm-none-eabi/14.2.0/"):
                tail = relative[len("toolchain/install/lib/gcc/arm-none-eabi/14.2.0/"):]
                if tail.endswith(".a"):
                    target = inside(stage / "toolchain/lib/gcc/arm-none-eabi" / host_cpp, tail)
            elif relative.startswith("toolchain/install/share/licenses/"):
                target = inside(stage / "licenses", relative[len("toolchain/install/share/licenses/"):])
            if target is not None:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(item).read())
    # The compiler core always targets ARM926EJ-S in ARM mode with software
    # floating point. GCC selects the root multilib (confirmed with
    # -mcpu=arm926ej-s -marm -print-multi-directory). Cortex/Thumb/FPU variants
    # occupy hundreds of MB and cannot be selected by this build interface.
    removed_bytes = 0
    for relative in (
        "toolchain/arm-none-eabi/lib/arm", "toolchain/arm-none-eabi/lib/thumb",
        f"toolchain/lib/gcc/arm-none-eabi/{host_cpp}/arm",
        f"toolchain/lib/gcc/arm-none-eabi/{host_cpp}/thumb",
    ):
        unused = inside(stage, relative)
        if unused.exists():
            removed_bytes += sum(f.stat().st_size for f in unused.rglob("*") if f.is_file())
            shutil.rmtree(unused)
    manifest = {"sourceCompilerSha256": SOURCE_SHA, "sdkPackage": SDK_NAME,
                "sdkSha256": SDK_SHA, "hostGcc": host_cpp,
                "targetLibrariesGcc": "14.2.0", "packaging": "genzehn + official make-prg loader",
                "cpu": "arm926ej-s", "multilib": ".", "unusedMultilibBytesRemoved": removed_bytes}
    (stage / "sdk-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf8")
    runtime = folder / "runtime"
    if runtime.exists():
        if runtime.is_symlink() or runtime.resolve().parent != folder:
            raise ValueError("Unexpected runtime path")
        shutil.rmtree(runtime)
    stage.rename(runtime)
    # The core locates ./runtime first, avoiding stale per-user runtime caches.
    # Keep only the native host core; the corrected runtime ships beside it.
    executable.write_bytes(blob[:start])
    from sdk_bundle import pack
    manifest["bundle"] = pack(folder)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path(__file__).parent / "vendor/compiler")
    parser.add_argument("--sdk-file", type=Path)
    args = parser.parse_args()
    prepare(args.directory, args.sdk_file)
