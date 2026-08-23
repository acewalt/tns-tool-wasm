#!/usr/bin/env python3
import contextlib
import json
import pathlib
import shutil
import sys
import tempfile
import uuid
import xml.etree.ElementTree as ET

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

import tnstools  # noqa: E402


SCRIPT_NS = "urn:TI.ScriptApp"
BLANK_TEMPLATE = REPO_ROOT / "templates" / "blank_tns_xml"


def main(argv):
    try:
        command = argv[1] if len(argv) > 1 else ""
        if command == "inspect":
            result = inspect_input(pathlib.Path(argv[2]))
        elif command == "extract":
            result = extract_tns(pathlib.Path(argv[2]), pathlib.Path(read_option(argv, "--output")))
        elif command == "build":
            result = build_tns(pathlib.Path(argv[2]), pathlib.Path(read_option(argv, "--output")))
        elif command == "create":
            result = create_tns(pathlib.Path(read_option(argv, "--output")))
        elif command == "add-lua":
            result = add_lua(pathlib.Path(argv[2]), pathlib.Path(argv[3]), pathlib.Path(read_option(argv, "--output")))
        else:
            raise ValueError(f"Unknown TNS bridge command: {command}")
        emit({**result, "success": True})
        return 0
    except Exception as error:  # noqa: BLE001
        emit({
            "success": False,
            "error": {
                "code": "TNS_BRIDGE_ERROR",
                "message": str(error),
                "details": {}
            }
        })
        return 1


def inspect_input(input_path):
    persistent_project = input_path.is_dir()
    with project_from_input(input_path) as project_dir:
        lua_scripts = scan_lua_scripts(project_dir)
        xml_files = sorted(project_dir.rglob("*.xml"), key=lambda value: str(value).lower())
        return {
            "input": str(input_path),
            "projectDir": str(project_dir) if persistent_project else None,
            "temporaryProject": not persistent_project,
            "summary": {
                "xmlFileCount": len(xml_files),
                "luaScriptCount": len(lua_scripts),
                "files": [str(path.relative_to(project_dir)).replace("\\", "/") for path in xml_files],
            },
            "luaScripts": lua_scripts,
        }


def extract_tns(input_path, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    with quiet_tnstools():
        decoded = tnstools.decode_tns_file(input_path, output_dir)
    inspected = inspect_input(decoded)
    return {
        "input": str(input_path),
        "outputDir": str(decoded),
        "projectDir": inspected["projectDir"],
        "summary": inspected["summary"],
        "luaScripts": inspected["luaScripts"],
    }


def build_tns(project_dir, output_tns):
    output_tns.parent.mkdir(parents=True, exist_ok=True)
    with quiet_tnstools():
        built = tnstools.build_tns_from_xml(project_dir, output_tns)
    return {
        "inputDir": str(project_dir),
        "output": str(built),
    }


def create_tns(output_tns):
    with tempfile.TemporaryDirectory(prefix="tns-tool-create-") as temp_name:
        project_dir = pathlib.Path(temp_name) / "project"
        shutil.copytree(BLANK_TEMPLATE, project_dir)
        return build_tns(project_dir, output_tns)


def add_lua(input_path, lua_file, output_tns):
    lua_source = lua_file.read_text(encoding="utf-8-sig")
    with tempfile.TemporaryDirectory(prefix="tns-tool-add-lua-") as temp_name:
        temp_root = pathlib.Path(temp_name)
        with project_from_input(input_path, temp_root / "project") as project_dir:
            inserted = add_lua_script_to_project(project_dir, lua_source)
            build = build_tns(project_dir, output_tns)
            inspect = inspect_input(output_tns)
            return {
                **build,
                "inserted": inserted,
                "summary": inspect["summary"],
                "luaScripts": inspect["luaScripts"],
            }


@contextlib.contextmanager
def project_from_input(input_path, output_dir=None):
    input_path = input_path.resolve()
    if input_path.is_dir():
        if output_dir is None:
            yield input_path
        else:
            if output_dir.exists():
                shutil.rmtree(output_dir)
            shutil.copytree(input_path, output_dir)
            yield output_dir
        return

    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        with quiet_tnstools():
            yield tnstools.decode_tns_file(input_path, output_dir)
        return

    with tempfile.TemporaryDirectory(prefix="tns-tool-inspect-") as temp_name:
        output = pathlib.Path(temp_name) / "project"
        output.mkdir(parents=True, exist_ok=True)
        with quiet_tnstools():
            decoded = tnstools.decode_tns_file(input_path, output)
        yield decoded


@contextlib.contextmanager
def quiet_tnstools():
    with contextlib.redirect_stdout(sys.stderr):
        yield


def add_lua_script_to_project(project_dir, lua_source):
    problem_file = find_problem_xml(project_dir)
    tree = ET.parse(problem_file)
    root = tree.getroot()
    prob_ns = namespace_of(root.tag)
    ET.register_namespace("", prob_ns)
    ET.register_namespace("sc", SCRIPT_NS)

    def q(ns, name):
        return f"{{{ns}}}{name}" if ns else name

    card = ET.Element(q(prob_ns, "card"), {"clay": "0", "h1": "10000", "h2": "10000", "w1": "10000", "w2": "10000"})
    ET.SubElement(card, q(prob_ns, "isDummyCard")).text = "0"
    ET.SubElement(card, q(prob_ns, "flag")).text = "0"
    wdgt = ET.SubElement(card, q(prob_ns, "wdgt"), {"type": "TI.ScriptApp", "ver": "1.0"})
    ET.SubElement(wdgt, q(SCRIPT_NS, "mFlags")).text = "1024"
    ET.SubElement(wdgt, q(SCRIPT_NS, "value")).text = "0"
    ET.SubElement(wdgt, q(SCRIPT_NS, "cry")).text = "0"
    ET.SubElement(wdgt, q(SCRIPT_NS, "legal")).text = "none"
    ET.SubElement(wdgt, q(SCRIPT_NS, "schk")).text = "false"
    ET.SubElement(wdgt, q(SCRIPT_NS, "guid")).text = uuid.uuid4().hex.upper()
    script = ET.SubElement(wdgt, q(SCRIPT_NS, "script"), {"version": "512", "id": "0"})
    script.text = lua_source
    root.append(card)
    write_xml(problem_file, root)
    return {
        "file": str(problem_file.relative_to(project_dir)).replace("\\", "/"),
        "path": element_path(root, script),
        "length": len(lua_source),
    }


def scan_lua_scripts(project_dir):
    scripts = []
    for xml_file in sorted(project_dir.rglob("*.xml"), key=lambda value: str(value).lower()):
        try:
            tree = ET.parse(xml_file)
        except ET.ParseError:
            continue
        root = tree.getroot()
        for script in root.iter():
            if local_name(script.tag) != "script" or namespace_of(script.tag) != SCRIPT_NS:
                continue
            text = script.text or ""
            scripts.append({
                "file": str(xml_file.relative_to(project_dir)).replace("\\", "/"),
                "path": element_path(root, script),
                "version": script.attrib.get("version"),
                "id": script.attrib.get("id"),
                "length": len(text),
                "source": text,
            })
    return scripts


def find_problem_xml(project_dir):
    candidates = sorted(project_dir.glob("Problem*.xml"), key=lambda value: str(value).lower())
    if not candidates:
        candidates = sorted(project_dir.rglob("*.xml"), key=lambda value: str(value).lower())
    for candidate in candidates:
        try:
            root = ET.parse(candidate).getroot()
        except ET.ParseError:
            continue
        if local_name(root.tag) == "prob":
            return candidate
    raise RuntimeError("No TI-Nspire problem XML was found")


def write_xml(xml_file, root):
    body = ET.tostring(root, encoding="UTF-8", short_empty_elements=False)
    xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)


def element_path(root, target):
    parent_map = {child: parent for parent in root.iter() for child in parent}
    parts = []
    current = target
    while current is not None:
        parent = parent_map.get(current)
        name = local_name(current.tag)
        if parent is not None:
            siblings = [child for child in list(parent) if local_name(child.tag) == name]
            if len(siblings) > 1:
                name = f"{name}[{siblings.index(current) + 1}]"
        parts.append(name)
        current = parent
    return "/" + "/".join(reversed(parts))


def namespace_of(tag):
    return tag[1:].split("}", 1)[0] if tag.startswith("{") else ""


def local_name(tag):
    return tag.split("}", 1)[-1] if tag.startswith("{") else tag


def read_option(argv, flag):
    if flag not in argv:
        raise ValueError(f"Missing required option {flag}")
    index = argv.index(flag)
    try:
        return argv[index + 1]
    except IndexError as exc:
        raise ValueError(f"Missing value for option {flag}") from exc


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
