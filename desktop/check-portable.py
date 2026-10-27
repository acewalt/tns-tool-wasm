"""Validate the actual public ZIP, including Explorer-compatible path lengths."""
import argparse
import json
from pathlib import Path, PurePosixPath
import zipfile


def check(filename):
    with zipfile.ZipFile(filename) as archive:
        entries = archive.infolist()
        names = {entry.filename for entry in entries}
        assert "resources/compiler/sdk.bin.gz" in names, "Compressed SDK missing"
        assert "resources/compiler/sdk.json" in names, "SDK manifest missing"
        assert not any(name.startswith("resources/compiler/runtime/") for name in names), "Deep SDK paths leaked into public ZIP"
        for name in names:
            parts = PurePosixPath(name).parts
            assert not name.startswith("/") and ".." not in parts and "\\" not in name, "Unsafe ZIP entry"
        longest = max(names, key=len)
        # Leaves over 160 characters for Explorer's destination directory.
        assert len(longest) <= 90, "Public ZIP path too long: " + longest
        damaged = archive.testzip()
        assert damaged is None, "CRC failed: " + str(damaged)
        return {"zip": str(filename), "compressedBytes": filename.stat().st_size,
                "extractedBytes": sum(entry.file_size for entry in entries),
                "entries": len(entries), "maxRelativePath": len(longest),
                "longestPath": longest, "crc": "pass", "deepSdkPaths": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    version = json.loads((root / "package.json").read_text(encoding="utf8"))["version"]
    filename = args.zip or root / "release/portable" / f"TNS-Tool-Portable-{version}-x64.zip"
    print(json.dumps(check(filename), indent=2))
