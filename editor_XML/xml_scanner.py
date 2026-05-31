from __future__ import annotations

import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


TI_PROBLEM_NS = "urn:TI.Problem"
TI_PROGRAM_EDITOR_NS = "urn:TI.ProgramEditor"

ET.register_namespace("", TI_PROBLEM_NS)
ET.register_namespace("pe", TI_PROGRAM_EDITOR_NS)
ET.register_namespace("sp", "urn:TI.Scratchpad")
ET.register_namespace("np", "urn:TI.Notepad")


def local_name(tag: str) -> str:
    if tag.startswith("{"):
        return tag.rsplit("}", 1)[1]
    return tag


def namespace_uri(tag: str) -> str:
    if tag.startswith("{"):
        return tag[1:].split("}", 1)[0]
    return ""


def short_text(text: str | None, limit: int = 160) -> str:
    if text is None:
        return ""
    compact = text.replace("\r", "\\r").replace("\n", "\\n")
    return compact if len(compact) <= limit else compact[: limit - 3] + "..."


@dataclass(frozen=True)
class XMLCandidate:
    file: Path
    path: str
    kind: str
    program_name: str | None
    text: str
    code_text: str | None = None
    widget_type: str | None = None

    @property
    def code_hash(self) -> str | None:
        if self.code_text is None:
            return None
        return hashlib.sha256(self.code_text.encode("utf-8")).hexdigest()[:12]


class XMLScanner:
    def __init__(self, path: Path):
        self.path = path

    def scan(self) -> list[XMLCandidate]:
        candidates: list[XMLCandidate] = []
        for xml_file in self._iter_xml_files():
            if self._is_artifact(xml_file):
                continue
            candidates.extend(self._scan_file(xml_file))
        return candidates

    def _iter_xml_files(self) -> Iterable[Path]:
        if self.path.is_file():
            if self.path.suffix.lower() == ".xml":
                yield self.path
            return
        yield from sorted(self.path.rglob("*.xml"))

    @staticmethod
    def _is_artifact(path: Path) -> bool:
        return any(part.startswith("_") for part in path.parts)

    def _scan_file(self, xml_file: Path) -> list[XMLCandidate]:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        parent_map = {child: parent for parent in root.iter() for child in parent}
        candidates: list[XMLCandidate] = []

        for element in root.iter():
            lname = local_name(element.tag)
            ns = namespace_uri(element.tag)
            text = element.text or ""

            if lname == "v" and text:
                candidates.append(
                    XMLCandidate(
                        file=xml_file,
                        path=self._element_path(element, parent_map),
                        kind="symbol_value",
                        program_name=self._symbol_name(element, parent_map),
                        text=text,
                        code_text=text,
                    )
                )

            if ns == TI_PROGRAM_EDITOR_NS and lname == "laststoredexpr" and text:
                candidates.append(
                    XMLCandidate(
                        file=xml_file,
                        path=self._element_path(element, parent_map),
                        kind="program_editor_laststoredexpr",
                        program_name=self._program_editor_name(element, parent_map),
                        text=text,
                        code_text=self._extract_define_body(text),
                    )
                )

            if ns == TI_PROGRAM_EDITOR_NS and lname == "editor" and text:
                candidates.append(
                    XMLCandidate(
                        file=xml_file,
                        path=self._element_path(element, parent_map),
                        kind="program_editor_visual_tree",
                        program_name=self._program_editor_name(element, parent_map),
                        text=text,
                        widget_type="TI.ProgramEditor",
                    )
                )

            if lname == "wdgt" and element.attrib.get("type") == "TI.ProgramEditor":
                candidates.append(
                    XMLCandidate(
                        file=xml_file,
                        path=self._element_path(element, parent_map),
                        kind="program_editor_widget",
                        program_name=self._program_editor_name(element, parent_map),
                        text="",
                        widget_type="TI.ProgramEditor",
                    )
                )

        return candidates

    @staticmethod
    def _extract_define_body(text: str) -> str | None:
        match = re.match(r"(?s)^Define\s+.*?=\s*\n?(.*)$", text)
        return match.group(1) if match else None

    @staticmethod
    def _symbol_name(element: ET.Element, parent_map: dict[ET.Element, ET.Element]) -> str | None:
        current = parent_map.get(element)
        while current is not None:
            if local_name(current.tag) == "e":
                for child in current:
                    if local_name(child.tag) == "n":
                        return (child.text or "").strip() or None
            current = parent_map.get(current)
        return None

    @staticmethod
    def _program_editor_name(element: ET.Element, parent_map: dict[ET.Element, ET.Element]) -> str | None:
        current = element
        while current is not None:
            if local_name(current.tag) == "wdgt" and current.attrib.get("type") == "TI.ProgramEditor":
                for child in current.iter():
                    if namespace_uri(child.tag) == TI_PROGRAM_EDITOR_NS and local_name(child.tag) == "name":
                        return (child.text or "").strip() or None
            current = parent_map.get(current)
        return None

    @staticmethod
    def _element_path(element: ET.Element, parent_map: dict[ET.Element, ET.Element]) -> str:
        parts: list[str] = []
        current: ET.Element | None = element
        while current is not None:
            parent = parent_map.get(current)
            name = local_name(current.tag)
            if parent is not None:
                same_name = [child for child in parent if local_name(child.tag) == name]
                if len(same_name) > 1:
                    name = f"{name}[{same_name.index(current) + 1}]"
            parts.append(name)
            current = parent
        return "/" + "/".join(reversed(parts))


def format_scan_report(candidates: Iterable[XMLCandidate]) -> str:
    candidates = list(candidates)
    by_hash: dict[str, list[XMLCandidate]] = {}
    for candidate in candidates:
        if candidate.code_hash:
            by_hash.setdefault(candidate.code_hash, []).append(candidate)

    lines = [f"XML candidates: {len(candidates)}"]
    for candidate in candidates:
        duplicate_count = len(by_hash.get(candidate.code_hash or "", [])) if candidate.code_hash else 0
        duplicate = f", duplicates={duplicate_count}" if duplicate_count > 1 else ""
        code_hash = f", code_hash={candidate.code_hash}" if candidate.code_hash else ""
        text_len = len(candidate.text)
        code_len = len(candidate.code_text) if candidate.code_text is not None else None
        lines.append("")
        lines.append(f"- {candidate.kind}: {candidate.program_name or '(unknown)'}")
        lines.append(f"  file: {candidate.file}")
        lines.append(f"  path: {candidate.path}")
        lines.append(f"  length: {text_len}{code_hash}{duplicate}")
        if code_len is not None and code_len != text_len:
            lines.append(f"  code_length: {code_len}")
        if candidate.widget_type:
            lines.append(f"  widget_type: {candidate.widget_type}")
        if candidate.text:
            lines.append(f"  text: {short_text(candidate.text)}")
    return "\n".join(lines)


def first_program_candidate(candidates: Iterable[XMLCandidate], program_name: str | None) -> XMLCandidate:
    matches = [
        c
        for c in candidates
        if c.kind == "symbol_value" and c.code_text and (program_name is None or c.program_name == program_name)
    ]
    if not matches:
        target = program_name or "(first program)"
        raise ValueError(f"No symbol_value program found for {target}.")
    return matches[0]
