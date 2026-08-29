#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE_BIN="$SCRIPT_DIR/tns-tool-compiler-bridge"
if [ ! -f "$SOURCE_BIN" ]; then
  echo "tns-tool-compiler-bridge was not found next to this installer." >&2
  exit 1
fi

INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/tns-tool-compiler"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP_FILE="$APP_DIR/tns-tool-compiler.desktop"
mkdir -p "$INSTALL_DIR" "$APP_DIR"
cp "$SOURCE_BIN" "$INSTALL_DIR/tns-tool-compiler-bridge"
chmod +x "$INSTALL_DIR/tns-tool-compiler-bridge"

if [ -d "$SCRIPT_DIR/toolchain" ]; then
  rm -rf "$INSTALL_DIR/toolchain"
  cp -R "$SCRIPT_DIR/toolchain" "$INSTALL_DIR/toolchain"
fi

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=TNS Tool Compiler
Comment=Local Ndless compiler bridge for TNS Tool
Exec=$INSTALL_DIR/tns-tool-compiler-bridge %u
Terminal=false
NoDisplay=true
MimeType=x-scheme-handler/tnstool;
Categories=Development;
EOF

if command -v xdg-mime >/dev/null 2>&1; then
  xdg-mime default tns-tool-compiler.desktop x-scheme-handler/tnstool || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true
fi

printf '\nTNS Tool Compiler installed.\n'
printf 'Location: %s\n' "$INSTALL_DIR"
printf 'Protocol: tnstool://\n\n'
nohup "$INSTALL_DIR/tns-tool-compiler-bridge" >/tmp/tns-tool-compiler.log 2>&1 &
printf 'Bridge started. Return to TNS Tool and press Build TNS.\n'
