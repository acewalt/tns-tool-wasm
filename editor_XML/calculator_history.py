"""TI.Scratchpad history, including the rich output between a call and its return.

Reading history must never execute the stored expressions. ``intr`` contains an
escaped r2dtotree, not HTML and not an additional calculator result. Keep the
original erow XML so saving a document retains formatting and TI context fields.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

SP_NS = "urn:TI.Scratchpad"
ET.register_namespace("sp", SP_NS)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _text(element: ET.Element) -> str:
    if element.get("hide") == "1" or element.get("name") in {"cursor", "formatManager", "formatEntry"} or _local(element.tag) == "cursor":
        return ""
    return (element.text or "") + "".join(_text(child) + (child.tail or "") for child in element)


def _segments(element: ET.Element) -> list[dict]:
    segments: list[dict] = []

    def append(kind: str, text: str) -> None:
        if not text:
            return
        if segments and segments[-1]["kind"] == kind:
            segments[-1]["text"] += text
        else:
            segments.append({"kind": kind, "text": text})

    def visit(node: ET.Element) -> None:
        if node.get("hide") == "1" or node.get("name") in {"cursor", "formatManager", "formatEntry"} or _local(node.tag) == "cursor":
            return
        if node.get("name") == "0el":
            append("math", _text(node))
            return
        append("text", node.text or "")
        for child in node:
            visit(child)
            append("text", child.tail or "")

    visit(element)
    return segments


def parse_calculator_rich_output(source: str = "") -> list[dict]:
    if not source:
        return []
    try:
        root = ET.fromstring(source)
    except (ET.ParseError, ValueError):
        return []
    lines = [node for node in root.iter() if node.get("name") == "1rtline"]
    if not lines:
        lines = [root]
    result = []
    for node in lines:
        segments = _segments(node)
        result.append({"kind": "disp", "text": "".join(item["text"] for item in segments), "segments": segments})
    return result


def extract_calculator_rows(widget: ET.Element | str) -> list[dict]:
    if isinstance(widget, str):
        widget = ET.fromstring(widget)
    rows = []
    for element in widget.iter(f"{{{SP_NS}}}erow"):
        def field(name: str) -> str:
            node = element.find(f".//{{{SP_NS}}}{name}")
            return node.text or "" if node is not None else ""
        intr = field("intr")
        context = element.find(f"{{{SP_NS}}}ctxt")
        row = {"entry": field("entr"), "exact": field("exct"), "display": field("disp"), "full": field("full"),
               "intr": intr, "kind": "calculation", "rawXml": ET.tostring(element, encoding="unicode", short_empty_elements=False),
               "context": dict(context.attrib) if context is not None else {}}
        if intr:
            row["output"] = parse_calculator_rich_output(intr)
        rows.append(row)
    return rows


def _matrix_rows(source: str) -> list[list[str]] | None:
    source = source.strip()
    if not (source.startswith("[[") and source.endswith("]]")):
        return None
    result, cells, start, depth, quoted = [], [], 2, 0, False
    index = 2
    while index < len(source) - 2:
        char = source[index]
        if char == '"':
            quoted = not quoted
        if not quoted:
            if source.startswith("][", index) and depth == 0:
                cells.append(source[start:index]); result.append(cells); cells = []; index += 2; start = index; continue
            if char in "([{": depth += 1
            elif char in ")]}": depth -= 1
            elif char == "," and depth == 0:
                cells.append(source[start:index]); start = index + 1
        index += 1
    cells.append(source[start:-2]); result.append(cells)
    return result if result and result[0] and all(len(row) == len(result[0]) for row in result) else None


def _append_math(parent: ET.Element, source: str) -> None:
    math = ET.SubElement(parent, "node", {"name": "0el", "flags": "0"})
    matrix = _matrix_rows(source)
    if matrix is None:
        ET.SubElement(math, "leaf", {"name": "0text"}).text = source
        return
    ET.SubElement(math, "leaf", {"name": "0text"})
    node = ET.SubElement(math, "node", {"name": "0matrix", "data": str(len(matrix[0]))})
    node.text = "[["
    for row_index, row in enumerate(matrix):
        for column_index, value in enumerate(row):
            cell = ET.SubElement(node, "node", {"name": "0el"})
            ET.SubElement(cell, "leaf", {"name": "0text"}).text = value
            cell.tail = "," if column_index < len(row) - 1 else "][" if row_index < len(matrix) - 1 else "]]"
    ET.SubElement(math, "leaf", {"name": "0text"})


def build_calculator_rich_output(output: list[dict]) -> str:
    root = ET.Element("r2dtotree")
    document = ET.SubElement(root, "node", {"name": "1doc"})
    for item in output:
        paragraph = ET.SubElement(document, "node", {"name": "1para"})
        line = ET.SubElement(paragraph, "node", {"name": "1rtline"})
        segments = item.get("segments") or [{"kind": "text", "text": str(item.get("text", ""))}]
        for segment in segments:
            text = str(segment.get("text", ""))
            if segment.get("kind") == "math":
                _append_math(line, text)
            else:
                ET.SubElement(line, "leaf", {"name": "1word"}).text = text
    return ET.tostring(root, encoding="unicode", short_empty_elements=False)


def write_calculator_rows(widget: ET.Element, rows: list[dict]) -> None:
    for element in list(widget):
        if element.tag == f"{{{SP_NS}}}erow":
            widget.remove(element)
    for row in rows:
        try:
            element = ET.fromstring(row.get("rawXml") or "")
            if element.tag != f"{{{SP_NS}}}erow":
                raise ValueError("not a Scratchpad row")
        except (ET.ParseError, ValueError):
            element = ET.Element(f"{{{SP_NS}}}erow")
        def set_field(parent: ET.Element, name: str, value: object) -> ET.Element:
            field = parent.find(f"{{{SP_NS}}}{name}")
            if field is None:
                field = ET.SubElement(parent, f"{{{SP_NS}}}{name}")
            field.text = "" if value is None else str(value)
            return field
        entry = row.get("entry", row.get("exact", ""))
        set_field(element, "entr", entry)
        set_field(element, "exct", row.get("exact", entry))
        result = element.find(f"{{{SP_NS}}}rslt")
        if result is None:
            result = ET.SubElement(element, f"{{{SP_NS}}}rslt")
        if result.find(f"{{{SP_NS}}}warn2") is None:
            set_field(result, "warn2", "{}")
        display = row.get("display", row.get("full", ""))
        set_field(result, "disp", display)
        set_field(result, "full", row.get("full", display))
        had_intr = element.find(f"{{{SP_NS}}}intr") is not None
        if row.get("intr"):
            set_field(element, "intr", row["intr"])
        elif row.get("output") and element.find(f"{{{SP_NS}}}intr") is None:
            set_field(element, "intr", build_calculator_rich_output(row["output"]))
        intr = element.find(f"{{{SP_NS}}}intr")
        if intr is not None and not had_intr:
            # Native rows place the intermediate output before rslt/ctxt.
            # Existing rows keep their original ordering and scroll metadata.
            element.remove(intr)
            index = list(element).index(result)
            element.insert(index, intr)
            if element.find(f"{{{SP_NS}}}left") is None:
                left = ET.Element(f"{{{SP_NS}}}left")
                left.text = "0"
                element.insert(index + 1, left)
        if element.find(f"{{{SP_NS}}}ctxt") is None:
            ET.SubElement(element, f"{{{SP_NS}}}ctxt", {str(k): str(v) for k, v in (row.get("context") or {"ang": "1", "cplx": "1", "comp": "1"}).items()})
        widget.append(element)
