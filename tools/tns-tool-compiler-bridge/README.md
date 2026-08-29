# TNS Tool Compiler Bridge

Cross-platform loopback bridge for **TNS Tool WASM**.

The browser remains the IDE. The bridge only exposes a small local API on `127.0.0.1:34981`, writes the project into an isolated temporary directory, runs the native Ndless build toolchain, and returns the generated `.tns` to the page.

## User flow

1. Install the bridge once.
2. The installer registers the custom URL scheme `tnstool://`.
3. TNS Tool checks `http://127.0.0.1:34981/v1/status`.
4. If the bridge is closed, pressing **Build TNS** opens `tnstool://start` and the browser asks whether it may open TNS Tool Compiler.
5. The web app sends the project to `POST /v1/build`.
6. The bridge builds locally and returns the `.tns` as a response.

The project is never sent to a remote build server.

## Supported desktop systems

- Windows x86_64
- Linux x86_64

The HTTP protocol is identical on both platforms.

## Security model

- Listens only on `127.0.0.1`, never on the LAN.
- Browser CORS is restricted to `https://acewalt.github.io` plus localhost development origins.
- Project paths are checked before being written to the temporary build directory.
- Build payload and output sizes are limited.
- Each build uses a fresh temporary directory which is deleted automatically.

## Toolchain discovery

The bridge looks for the Ndless build tools in this order:

1. `TNS_TOOL_NDLESS_BIN`
2. `TNS_TOOL_NDLESS_HOME/bin`
3. `toolchain/bin` next to the bridge
4. `ndless-sdk/bin` next to the bridge
5. the normal system `PATH`

The first native prototype expects these commands:

- `make`
- `nspire-gcc`
- `nspire-as`
- `nspire-ld`
- `genzehn`
- `make-prg`

A later packaged release can place the complete toolchain inside `toolchain/` so users do not have to install the SDK separately.

## Windows install

The GitHub release ZIP contains:

- `tns-tool-compiler-bridge.exe`
- `install-windows.ps1`

Run `install-windows.ps1`. It copies the bridge to `%LOCALAPPDATA%\TNS Tool Compiler`, registers `tnstool://`, and starts the bridge.

## Linux install

The GitHub release tarball contains:

- `tns-tool-compiler-bridge`
- `install-linux.sh`

Run:

```sh
chmod +x install-linux.sh
./install-linux.sh
```

It installs under `~/.local/share/tns-tool-compiler`, registers `x-scheme-handler/tnstool` using a desktop entry, and starts the bridge.

## API

### `GET /v1/status`

Returns bridge/platform/toolchain state.

### `POST /v1/build`

Receives a structured TNS Tool project payload. The bridge writes the entries to a temporary project directory and invokes its native `make` toolchain. On success it returns the `.tns` and, when available, the intermediate `.elf`.
