from __future__ import annotations

import copy
import shutil
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from ti_serializer import _SERIALIZER
from xml_scanner import TI_PROGRAM_EDITOR_NS, XMLScanner, local_name, namespace_uri


class XMLUpdater:
    def __init__(self, path: Path):
        self.path = path

    def update_program(
        self,
        program_name: str,
        multiline_text: str,
        out_dir: Path | None = None,
        in_place: bool = False,
        new_name: str | None = None,
        document_type: str | None = None,
        library_access: str | None = None,
        parameters: str | None = None,
    ) -> list[Path]:
        if out_dir is None and not in_place:
            raise ValueError("Use out_dir or in_place=True.")

        target = self.path if in_place else out_dir
        assert target is not None
        if not in_place:
            self._copy_xml_input(target)

        written: list[Path] = []
        for xml_file in self._iter_target_xml_files(target):
            if XMLScanner._is_artifact(xml_file):
                continue
            changed = self._update_file(
                xml_file,
                program_name,
                multiline_text,
                new_name=new_name,
                document_type=document_type,
                library_access=library_access,
                parameters=parameters,
            )
            if changed:
                written.append(xml_file)
        return written

    def _copy_xml_input(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        if self.path.is_file():
            shutil.copy2(self.path, out_dir / self.path.name)
            return

        for src in self.path.rglob("*"):
            rel = src.relative_to(self.path)
            dst = out_dir / rel
            if src.is_dir():
                dst.mkdir(parents=True, exist_ok=True)
            elif src.suffix.lower() == ".xml":
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

    @staticmethod
    def _iter_target_xml_files(target: Path) -> list[Path]:
        if target.is_file():
            return [target] if target.suffix.lower() == ".xml" else []
        return sorted(target.rglob("*.xml"))

    @staticmethod
    def _effective_document_type(multiline_text: str, document_type: str | None) -> str:
        if document_type in {"Prgm", "Func"}:
            return document_type
        lines = multiline_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        first = lines[0].lstrip(": ").strip().lower() if lines else ""
        return "Func" if first == "func" else "Prgm"

    @staticmethod
    def _normalized_library_access(library_access: str | None) -> str:
        return library_access if library_access in {"None", "LibPub", "LibPriv"} else "None"

    @staticmethod
    def _definition_prefix(
        program_name: str,
        library_access: str | None,
        parameters: str | None,
    ) -> str:
        access = XMLUpdater._normalized_library_access(library_access)
        visibility = "" if access == "None" else f"{access} "
        return f"Define {visibility}{program_name}({parameters or ''})="

    @staticmethod
    def _update_file(
        xml_file: Path,
        program_name: str,
        multiline_text: str,
        new_name: str | None = None,
        document_type: str | None = None,
        library_access: str | None = None,
        parameters: str | None = None,
    ) -> bool:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        parent_map = {child: parent for parent in root.iter() for child in parent}
        changed = False
        target_name = new_name or program_name
        effective_type = XMLUpdater._effective_document_type(multiline_text, document_type)
        effective_access = XMLUpdater._normalized_library_access(library_access)
        effective_parameters = parameters or ""

        for element in root.iter():
            if local_name(element.tag) == "v":
                name = XMLScanner._symbol_name(element, parent_map)
                if name == program_name:
                    XMLUpdater._update_symbol_metadata(
                        element,
                        parent_map,
                        target_name,
                        effective_type,
                        effective_access,
                        effective_parameters,
                    )
                    element.text = XMLUpdater._serialize_like_existing(multiline_text, element.text or "")
                    changed = True

            if namespace_uri(element.tag) == TI_PROGRAM_EDITOR_NS and local_name(element.tag) == "laststoredexpr":
                name = XMLScanner._program_editor_name(element, parent_map)
                if name == program_name:
                    XMLUpdater._update_program_editor_metadata(
                        element,
                        parent_map,
                        target_name,
                        effective_type,
                        effective_access,
                    )
                    existing = element.text or ""
                    existing_code = XMLScanner._extract_define_body(existing) or existing
                    new_code = XMLUpdater._serialize_like_existing(multiline_text, existing_code)
                    element.text = XMLUpdater._build_laststoredexpr(
                        target_name,
                        new_code,
                        effective_access,
                        effective_parameters,
                    )
                    changed = True

            if namespace_uri(element.tag) == TI_PROGRAM_EDITOR_NS and local_name(element.tag) == "editor":
                name = XMLScanner._program_editor_name(element, parent_map)
                if name == program_name:
                    XMLUpdater._update_program_editor_metadata(
                        element,
                        parent_map,
                        target_name,
                        effective_type,
                        effective_access,
                    )
                    element.text = XMLUpdater._build_program_editor_tree(
                        target_name,
                        multiline_text,
                        element.text or "",
                        document_type=effective_type,
                        library_access=effective_access,
                        parameters=effective_parameters,
                    )
                    changed = True

        if changed:
            XMLUpdater._write_canonical_xml(tree, xml_file)
        return changed

    @staticmethod
    def _update_symbol_metadata(
        value_element: ET.Element,
        parent_map: dict[ET.Element, ET.Element],
        new_name: str,
        document_type: str | None,
        library_access: str | None,
        parameters: str | None,
    ) -> None:
        parent = XMLScanner._symbol_parent(value_element, parent_map)
        if parent is None:
            return
        if document_type in {"Prgm", "Func"}:
            parent.set("t", "6" if document_type == "Func" else "7")
        if library_access in {"None", "LibPub", "LibPriv"}:
            parent.set(
                "f",
                {"None": "0", "LibPub": "65536", "LibPriv": "196608"}[library_access],
            )
        name_node = None
        params_node = None
        for child in parent:
            if local_name(child.tag) == "n":
                name_node = child
            elif local_name(child.tag) == "p":
                params_node = child
        if name_node is not None:
            name_node.text = new_name
        if params_node is None:
            namespace = parent.tag[1:].split("}", 1)[0] if parent.tag.startswith("{") else ""
            params_node = ET.Element(f"{{{namespace}}}p" if namespace else "p")
            value_index = list(parent).index(value_element)
            parent.insert(value_index, params_node)
        params_node.text = parameters or ""

    @staticmethod
    def _update_program_editor_metadata(
        element: ET.Element,
        parent_map: dict[ET.Element, ET.Element],
        new_name: str,
        document_type: str | None,
        library_access: str | None,
    ) -> None:
        current = element
        while current is not None:
            if local_name(current.tag) == "wdgt" and current.attrib.get("type") == "TI.ProgramEditor":
                for child in current.iter():
                    if namespace_uri(child.tag) != TI_PROGRAM_EDITOR_NS:
                        continue
                    lname = local_name(child.tag)
                    if lname == "name":
                        child.text = new_name
                    elif lname == "type" and document_type in {"Prgm", "Func"}:
                        child.text = document_type
                    elif lname == "visibility" and library_access in {"None", "LibPub", "LibPriv"}:
                        child.text = "" if library_access == "None" else f"{library_access} "
                return
            current = parent_map.get(current)

    @staticmethod
    def _build_laststoredexpr(
        program_name: str,
        serialized_code: str,
        library_access: str | None,
        parameters: str | None,
    ) -> str:
        return (
            XMLUpdater._definition_prefix(program_name, library_access, parameters)
            + "\n"
            + serialized_code
        )

    @staticmethod
    def _replace_define_body(original: str, new_code: str) -> str:
        match = re.match(r"(?s)^(Define\s+.*?=\s*\n?)(.*)$", original)
        if not match:
            return new_code
        return match.group(1) + new_code

    @staticmethod
    def _serialize_like_existing(multiline_text: str, existing_code: str) -> str:
        if "\r:" in existing_code:
            separator = "\r:"
        elif "\n:" in existing_code:
            separator = "\n:"
        elif ":" in existing_code:
            separator = ":"
        else:
            separator = "\r:"
        return _SERIALIZER.from_multiline(multiline_text, separator=separator)

    @staticmethod
    def _write_canonical_xml(tree: ET.ElementTree, xml_file: Path) -> None:
        body = ET.tostring(tree.getroot(), encoding="UTF-8", short_empty_elements=False)
        xml_file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + body)

    @staticmethod
    def _build_program_editor_tree(
        program_name: str,
        multiline_text: str,
        existing_editor: str,
        document_type: str | None = None,
        library_access: str | None = None,
        parameters: str | None = None,
    ) -> str:
        effective_type = XMLUpdater._effective_document_type(multiline_text, document_type)
        access = XMLUpdater._normalized_library_access(library_access)
        visibility = "" if access == "None" else f"{access} "
        params = parameters or ""
        block_name = "0func" if effective_type == "Func" else "0prgm"

        root = ET.Element("r2dtotree", {"version": "1"})
        format_manager = XMLUpdater._existing_format_manager(existing_editor)
        root.append(format_manager)

        outer = ET.SubElement(root, "node", {"name": "0el", "id0": "7"})
        ET.SubElement(
            outer,
            "leaf",
            {"name": "0text", "hide": "1", "np": "1", "id0": "7", "pp0": "0"},
        )
        mlstatement = ET.SubElement(outer, "node", {"name": "0mlstatement"})

        header = ET.SubElement(mlstatement, "node", {"name": "0el", "id0": "6"})
        header_label = f"Define {visibility}{program_name}"
        header_text = ET.SubElement(
            header,
            "leaf",
            {
                "name": "0text",
                "readonly": "1",
                "np": "2",
                "id0": "6",
                "pp0": str(len("Define ")),
                "id1": "0",
                "pp1": str(max(0, len(header_label) - len("Define "))),
            },
        )
        header_text.text = header_label
        open_paren = ET.SubElement(
            header,
            "leaf",
            {"name": "0paren", "id0": "7", "readonly": "1", "data": "0"},
        )
        open_paren.text = "("
        parameter_leaf = ET.SubElement(
            header,
            "leaf",
            {"name": "0text", "np": "1", "id0": "7", "pp0": str(len(params))},
        )
        parameter_leaf.text = params or None
        close_paren = ET.SubElement(
            header,
            "leaf",
            {"name": "0paren", "id0": "7", "readonly": "1", "data": "2147483648"},
        )
        close_paren.text = ")"
        equals = ET.SubElement(
            header,
            "leaf",
            {"name": "0text", "readonly": "1", "np": "1", "id0": "6", "pp0": "1"},
        )
        equals.text = "="

        program_wrap = ET.SubElement(mlstatement, "node", {"name": "0el", "id0": "6"})
        ET.SubElement(
            program_wrap,
            "leaf",
            {"name": "0text", "hide": "1", "np": "1", "id0": "7", "pp0": "0"},
        )
        block = ET.SubElement(program_wrap, "node", {"name": block_name, "readonly": "1"})
        header.tail = "\\:"

        for index, line in enumerate(
            XMLUpdater._program_body_lines(multiline_text, effective_type)
        ):
            line_node = ET.SubElement(block, "node", {"name": "0el", "id0": "6"})
            leaf = ET.SubElement(
                line_node,
                "leaf",
                {"name": "0text", "np": "1", "id0": "6", "pp0": str(len(line))},
            )
            if index == 0:
                ET.SubElement(leaf, "cursor", {"index": "1"})
            leaf.text = line or None

        ET.SubElement(
            program_wrap,
            "leaf",
            {"name": "0text", "hide": "1", "np": "1", "id0": "7", "pp0": "0"},
        )
        ET.SubElement(
            outer,
            "leaf",
            {"name": "0text", "hide": "1", "np": "1", "id0": "7", "pp0": "0"},
        )

        return ET.tostring(root, encoding="unicode", short_empty_elements=False)

    @staticmethod
    def _existing_format_manager(existing_editor: str) -> ET.Element:
        try:
            root = ET.fromstring(existing_editor)
            manager = root.find("formatManager")
            if manager is not None:
                return copy.deepcopy(manager)
        except ET.ParseError:
            pass
        manager = ET.Element("formatManager", {"tableSize": "2", "capacity": "10"})
        ET.SubElement(
            manager,
            "formatEntry",
            {
                "entryIndex": "0",
                "entryID": "0",
                "entryRefCnt": "1",
                "tc": "0",
                "fc": "268435199",
                "fs": "15",
                "fst": "1",
                "cc": "0",
                "fest": "0",
                "feun": "0",
                "fesub": "0",
                "fesup": "0",
                "fn0": "TI-Nspire",
            },
        )
        ET.SubElement(
            manager,
            "formatEntry",
            {
                "entryIndex": "1",
                "entryID": "1",
                "entryRefCnt": "1",
                "tc": "254",
                "fc": "268435199",
                "fs": "15",
                "fst": "0",
                "cc": "0",
                "fest": "0",
                "feun": "0",
                "fesub": "0",
                "fesup": "0",
                "fn0": "TI-Nspire",
            },
        )
        return manager

    @staticmethod
    def _program_body_lines(
        multiline_text: str,
        document_type: str | None = None,
    ) -> list[str]:
        lines = multiline_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        if lines and lines[0].lstrip(": ").strip().lower() in {"prgm", "func"}:
            lines = lines[1:]
        if lines and lines[-1].lstrip(": ").strip().lower() in {"endprgm", "endfunc"}:
            lines = lines[:-1]
        return lines or [""]
