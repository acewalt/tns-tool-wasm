#!/usr/bin/env python3
"""Local-only USB bridge for TNS Tool WASM.

Requires PyUSB and a separately installed copy of TI-Nspire-Python-Link:
https://github.com/depaolaluigi123/TI-Nspire-Python-Link

This project does not bundle, vendor, or modify that GPL-3.0 dependency.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import json
import posixpath
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

MAX_UPLOAD = 12 * 1024 * 1024
MAX_BODY = 17 * 1024 * 1024
ALLOWED_ORIGINS = {
    "https://acewalt.github.io",
    "http://localhost:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}


def validate_path(value):
    if not isinstance(value, str) or not value.startswith("/"):
        raise ValueError("Ruta absoluta requerida.")
    if "\\" in value or "\x00" in value:
        raise ValueError("Ruta de calculadora inválida.")
    parts = value.split("/")
    if any(part in (".", "..") for part in parts):
        raise ValueError("No se admiten rutas relativas.")
    return posixpath.normpath(value)


def validate_name(value, extension=False):
    if not isinstance(value, str):
        raise ValueError("Nombre inválido.")
    name = value.strip()
    if not name or name in (".", "..") or len(name) > 180:
        raise ValueError("Nombre vacío o demasiado largo.")
    if any(c in name for c in ('/', "\\", "\x00", "\r", "\n")):
        raise ValueError("El nombre no puede contener rutas.")
    if extension and not name.lower().endswith(".tns"):
        raise ValueError("Solo se permiten documentos .tns para enviar.")
    return name


def child_path(parent, name):
    return posixpath.join(validate_path(parent), validate_name(name))


class BridgeState:
    def __init__(self, device_manager):
        self.manager = device_manager
        self.active = None
        self.info = None
        self.lock = threading.RLock()

    def connected(self):
        return bool(self.active and self.active.is_open)

    def info_payload(self):
        return {
            "ok": True,
            "connected": self.connected(),
            "info": self.info if self.connected() else None,
            "capabilities": {"files": True, "upload": True, "screenshot": False},
        }

    def devices(self):
        details = self.manager.enumerate_devices()
        return [
            {
                "bus_number": int(item.bus_number),
                "address": int(item.address),
                "name": item.name,
                "is_cx_ii": bool(item.is_cx_ii),
                "needs_drivers": bool(item.needs_drivers),
            }
            for item in details
        ]

    def connect(self, bus, addr):
        # The device must have been discovered again in this session.
        self.devices()
        device = self.manager.get_device(bus, addr)
        if device is None:
            raise ValueError("No se encontró la calculadora seleccionada.")
        if self.active and self.active is not device:
            self.active.close()
        if not device.open():
            raise OSError("No se puede abrir USB. Revisa controladores, permisos y el cable.")
        self.active = device
        self.info = device.get_info() or {
            "name": device.get_device_name() or "TI-Nspire",
        }
        return self.info_payload()

    def ensure(self):
        if not self.connected():
            raise ConnectionError("Calculadora desconectada. Usa Conectar.")


def make_handler(state):
    class Handler(BaseHTTPRequestHandler):
        server_version = "TnsLocalBridge/0.1"

        def origin_allowed(self):
            origin = self.headers.get("Origin")
            return origin is None or origin in ALLOWED_ORIGINS

        def headers_common(self, content_type="application/json; charset=utf-8"):
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            origin = self.headers.get("Origin")
            if origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def respond(self, obj, status=200):
            data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.headers_common()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def respond_binary(self, data):
            self.send_response(200)
            self.headers_common("application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self):
            if not self.origin_allowed():
                return self.respond({"error": "Origen no autorizado."}, 403)
            self.send_response(204)
            self.headers_common()
            self.end_headers()

        def do_GET(self):
            if not self.origin_allowed():
                return self.respond({"error": "Origen no autorizado."}, 403)
            parsed = urlparse(self.path)
            try:
                with state.lock:
                    if parsed.path == "/api/health":
                        return self.respond(state.info_payload())
                    if parsed.path == "/api/devices":
                        return self.respond({"devices": state.devices()})
                    state.ensure()
                    path = validate_path(parse_qs(parsed.query).get("path", ["/"])[0])
                    if parsed.path == "/api/files":
                        return self.respond({"path": path, "files": state.active.list_dir(path)})
                    if parsed.path == "/api/download":
                        if path == "/":
                            raise ValueError("Selecciona un archivo.")
                        data = state.active.read_file(path)
                        if data is None:
                            raise OSError("No se pudo leer el archivo.")
                        return self.respond_binary(data)
                return self.respond({"error": "Ruta no encontrada."}, 404)
            except (ValueError, OSError, ConnectionError) as exc:
                return self.respond({"error": str(exc)}, 400)
            except Exception as exc:
                print("Device communication failure:", repr(exc))
                return self.respond({"error": "Fallo de comunicación con la calculadora."}, 502)

        def do_POST(self):
            if not self.origin_allowed():
                return self.respond({"error": "Origen no autorizado."}, 403)
            parsed = urlparse(self.path)
            size = self.headers.get("Content-Length", "")
            if not size.isdecimal() or int(size) > MAX_BODY:
                return self.respond({"error": "Petición demasiado grande."}, 413)
            if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                return self.respond({"error": "Se requiere JSON."}, 415)
            try:
                params = json.loads(self.rfile.read(int(size)))
                if not isinstance(params, dict):
                    raise ValueError("Objeto JSON requerido.")
                with state.lock:
                    if parsed.path == "/api/connect":
                        bus = int(params["bus_number"])
                        addr = int(params["address"])
                        return self.respond(state.connect(bus, addr))
                    state.ensure()
                    folder = validate_path(params.get("path", "/"))
                    if parsed.path == "/api/mkdir":
                        destination = child_path(folder, params.get("name"))
                        state.active.create_dir(destination)
                        return self.respond({"ok": True, "path": destination})
                    if parsed.path == "/api/upload":
                        name = validate_name(params.get("name"), extension=True)
                        encoded = params.get("data")
                        if not isinstance(encoded, str) or len(encoded) > (MAX_UPLOAD * 4 // 3 + 8):
                            raise ValueError("Archivo demasiado grande.")
                        try:
                            data = base64.b64decode(encoded, validate=True)
                        except binascii.Error:
                            raise ValueError("Base64 inválido.")
                        if len(data) > MAX_UPLOAD:
                            raise ValueError("Límite de transferencia: 12 MB.")
                        path = child_path(folder, name)
                        state.active.write_file(path, data)
                        return self.respond({"ok": True, "path": path, "size": len(data)})
                return self.respond({"error": "Ruta no encontrada."}, 404)
            except (KeyError, ValueError, TypeError, OSError, ConnectionError) as exc:
                return self.respond({"error": str(exc)}, 400)
            except Exception as exc:
                print("Device communication failure:", repr(exc))
                return self.respond({"error": "Fallo de comunicación con la calculadora."}, 502)

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Bridge USB localhost para TI-Nspire")
    parser.add_argument("--link-repo", type=Path, required=True,
                        help="Ruta al clone de TI-Nspire-Python-Link (contiene link/usb_device.py)")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    dependency = args.link_repo.resolve()
    if not (dependency / "link" / "usb_device.py").is_file():
        parser.error("La ruta --link-repo debe contener link/usb_device.py.")
    sys.path.insert(0, str(dependency))
    try:
        from link.usb_device import DeviceManager
    except ImportError as exc:
        parser.error("Falta pyusb/libusb o el enlace USB: " + str(exc))
    state = BridgeState(DeviceManager())
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(state))
    print("Puente TI-Nspire activo: http://127.0.0.1:%d" % args.port)
    print("Solo acepta la página de acewalt.github.io y desarrollos localhost.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if state.active:
            state.active.close()
        server.server_close()


if __name__ == "__main__":
    main()
