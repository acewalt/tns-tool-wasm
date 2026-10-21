"""Offline, no-hardware regression tests for the TI-Nspire bridge."""
import base64
import http.client
import importlib.util
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

bridge_path = Path(__file__).resolve().parents[1] / "tools" / "calculator-transfer" / "bridge.py"
spec = importlib.util.spec_from_file_location("calculator_bridge_under_test", bridge_path)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class FakeDevice:
    def __init__(self):
        self.is_open = False
        self.stored = {}
        self.folders = {"/"}

    def open(self):
        self.is_open = True
        return True

    def get_info(self):
        return {"name": "Fake TI-Nspire (test only)"}

    def list_dir(self, path):
        prefix = path.rstrip("/") + "/"
        return [
            {"name": full[len(prefix):], "path": full, "is_dir": False, "size": len(data)}
            for full, data in self.stored.items()
            if full.startswith(prefix) and "/" not in full[len(prefix):]
        ] + [
            {"name": full[len(prefix):], "path": full, "is_dir": True, "size": 0}
            for full in self.folders
            if full.startswith(prefix) and full != path and "/" not in full[len(prefix):]
        ]

    def read_file(self, path):
        return self.stored[path]

    def write_file(self, path, data):
        self.stored[path] = data

    def create_dir(self, path):
        self.folders.add(path)


class FakeManager:
    def __init__(self):
        self.device = FakeDevice()

    def enumerate_devices(self):
        return [type("USB", (), {
            "bus_number": 1, "address": 2, "name": "Mock Nspire",
            "is_cx_ii": True, "needs_drivers": False
        })()]

    def get_device(self, bus, addr):
        return self.device if (bus, addr) == (1, 2) else None


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.state = bridge.BridgeState(FakeManager())
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), bridge.make_handler(self.state))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def query(self, method, path, body=None, origin="https://acewalt.github.io"):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        headers = {"Origin": origin}
        if body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(body).encode("utf-8")
        conn.request(method, path, body=body, headers=headers)
        resp = conn.getresponse()
        content = resp.read()
        result = (resp.status, resp.getheader("Access-Control-Allow-Origin"), content)
        conn.close()
        return result

    def test_paths_and_names_reject_traversal(self):
        self.assertEqual(bridge.validate_path("/a/b"), "/a/b")
        for invalid in ["../x", "/a/../x", "/a/./b", "/a\\b", ""]:
            with self.assertRaises(ValueError):
                bridge.validate_path(invalid)
        for invalid in ["", "../hello.tns", "sub/a.tns", "x.lua"]:
            with self.assertRaises(ValueError):
                bridge.validate_name(invalid, extension=True)

    def test_origin_restriction(self):
        status, header, _ = self.query("GET", "/api/health", origin="https://evil.example")
        self.assertEqual(status, 403)
        self.assertIsNone(header)

    def test_connected_operations(self):
        code, origin, data = self.query("GET", "/api/health")
        self.assertEqual(code, 200)
        self.assertEqual(origin, "https://acewalt.github.io")
        self.assertFalse(json.loads(data)["connected"])
        self.assertFalse(json.loads(data)["capabilities"]["screenshot"])

        code, _, data = self.query("GET", "/api/devices")
        self.assertEqual(code, 200)
        self.assertEqual(len(json.loads(data)["devices"]), 1)

        code, _, data = self.query("POST", "/api/connect", {"bus_number": 1, "address": 2})
        self.assertEqual(code, 200)
        self.assertTrue(json.loads(data)["connected"])

        contents = b"\x01\x02actual binary tns"
        code, _, data = self.query("POST", "/api/upload", {
            "path": "/", "name": "example.tns",
            "data": base64.b64encode(contents).decode()
        })
        self.assertEqual(code, 200)

        code, _, data = self.query("GET", "/api/files?path=%2F")
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(data)["files"][0]["name"], "example.tns")

        code, _, data = self.query("GET", "/api/download?path=%2Fexample.tns")
        self.assertEqual(code, 200)
        self.assertEqual(data, contents)

        code, _, data = self.query("POST", "/api/mkdir", {"path": "/", "name": "Carpeta"})
        self.assertEqual(code, 200)

    def test_invalid_transfer_does_not_write(self):
        self.query("POST", "/api/connect", {"bus_number": 1, "address": 2})
        code, _, _ = self.query("POST", "/api/upload", {
            "path": "/", "name": "../bad.tns",
            "data": base64.b64encode(b"invalid").decode()
        })
        self.assertEqual(code, 400)
        self.assertFalse(self.state.manager.device.stored)


if __name__ == "__main__":
    unittest.main()
