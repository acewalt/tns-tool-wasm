"""Transactional native TI-Nspire page layouts (also usable from Pyodide).

``update_page_layout(path, operation)`` accepts a plain dict::

    {"action": "group", "cards": [{"path": "/prob/card[1]", "xml": snapshot},
                                  {"path": "/prob/card[2]", "xml": snapshot}],
     "destination": "/prob/card[1]", "layout": {"clay": 1, "w1": 5000}}

``ungroup`` takes one inspected card. ``arrange`` takes one card, a layout,
and/or a zero-based ``order`` permutation of its direct widgets. Grouping uses
document order unless ``order`` is supplied. All supplied snapshots are checked
before changing anything. Symbols and resources are never moved or removed.

Layouts: 0 single, 1 columns, 2 rows, 3 top/full + bottom/split,
4 top/split + bottom/full, 5 left/stack + right/full, 6 left/full + right/stack,
7 four panes. Coordinates are native 0..10000 ratios, limited to 10..90% for
split layouts. This module changes XML structure; it does not emulate apps.
"""
from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from xml.dom import Node, minidom


PROBLEM_NS = "urn:TI.Problem"
LAYOUT_COUNTS = {0: 1, 1: 2, 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 7: 4}
RATIOS = ("w1", "h1", "w2", "h2")
ACTIVE_RATIOS = {0: set(), 1: {"w1"}, 2: {"h1"}, 3: {"w1", "h1"},
                 4: {"w1", "h1"}, 5: {"w1", "h1"},
                 6: {"w1", "h2"}, 7: {"w1", "h1", "h2"}}


def _elements(node):
    return [child for child in node.childNodes if child.nodeType == Node.ELEMENT_NODE]


def _name(node):
    return node.localName or node.nodeName


def _native(node, name):
    return node.nodeType == Node.ELEMENT_NODE and _name(node) == name and node.namespaceURI == PROBLEM_NS


def _parse(raw):
    """Keep TI serialized statement CRs instead of XML line-end normalization."""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8-sig")
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("A complete XML card snapshot is required.")
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", raw, re.I):
        raise ValueError("Document types and entities are not supported in page layouts.")
    # Native files can contain literal CR statement delimiters as well as &#13;.
    # Protect only character data within the document element. A CR in a CDATA
    # section stays data, so convert that section to ordinary escaped text.
    tokens = re.split(r"(<!--.*?-->|<!\[CDATA\[.*?\]\]>|<\?.*?\?>|<[^>]*>)", raw, flags=re.S)
    depth = 0
    for index, token in enumerate(tokens):
        if token.startswith("<![CDATA["):
            text = token[9:-3]
            tokens[index] = text.replace("&", "&amp;").replace("<", "&lt;").replace("\r", "&#13;")
        elif token.startswith(("<!--", "<?")):
            continue
        elif token.startswith("</"):
            depth -= 1
        elif token.startswith("<"):
            if not token.rstrip().endswith("/>"):
                depth += 1
        elif depth:
            tokens[index] = token.replace("\r", "&#13;")
    try:
        return minidom.parseString("".join(tokens))
    except Exception as error:
        raise ValueError("Invalid Problem XML or card snapshot.") from error


def _signature(node, normalize_lines=False):
    """Compare expanded XML names, not whichever namespace prefix was used."""
    if node.nodeType == Node.ELEMENT_NODE:
        attrs = tuple(sorted((attr.namespaceURI or "", attr.localName or attr.name, attr.value)
                             for attr in node.attributes.values()
                             if attr.namespaceURI != "http://www.w3.org/2000/xmlns/"))
        children = []
        # ET snapshots can replace CDATA with text and join adjacent text nodes.
        for child in node.childNodes:
            value = _signature(child, normalize_lines)
            if value is None:
                continue
            if value[0] == "text" and children and children[-1][0] == "text":
                children[-1] = ("text", children[-1][1] + value[1])
            else:
                children.append(value)
        return ("element", node.namespaceURI or "", _name(node), attrs, tuple(children))
    if node.nodeType in (Node.TEXT_NODE, Node.CDATA_SECTION_NODE):
        text = node.data.replace("\r\n", "\n").replace("\r", "\n") if normalize_lines else node.data
        return ("text", text)
    if node.nodeType == Node.COMMENT_NODE:
        return ("comment", node.data)
    if node.nodeType == Node.PROCESSING_INSTRUCTION_NODE:
        return ("instruction", node.target, node.data)
    return None


def _path(node):
    parts = []
    while node.nodeType == Node.ELEMENT_NODE:
        name = _name(node)
        parent = node.parentNode
        if parent.nodeType == Node.ELEMENT_NODE:
            siblings = [child for child in _elements(parent) if _name(child) == name]
            if len(siblings) > 1:
                name += f"[{siblings.index(node) + 1}]"
        parts.append(name)
        node = parent
    return "/" + "/".join(reversed(parts))


def _widgets(card):
    result = [child for child in _elements(card) if _native(child, "wdgt")]
    # A direct app may contain nested widget data; those are not page slots.
    if any(_name(child) == "wdgt" and not _native(child, "wdgt") for child in _elements(card)):
        raise ValueError("The page contains an application outside the Problem namespace.")
    return result


def _integer(value, label):
    if isinstance(value, bool) or not re.fullmatch(r"-?\d+", str(value)):
        raise ValueError(f"{label} must be an integer.")
    return int(value)


def _validate_card(card):
    if not card.hasAttribute("clay"):
        raise ValueError("The page is missing its native layout code.")
    clay = _integer(card.getAttribute("clay"), "Layout code")
    apps = _widgets(card)
    if clay not in LAYOUT_COUNTS or len(apps) != LAYOUT_COUNTS[clay]:
        raise ValueError("The page layout code does not match its application count.")
    for key in RATIOS:
        if card.hasAttribute(key):
            value = _integer(card.getAttribute(key), key)
            if not 0 <= value <= 10000:
                raise ValueError("Native page ratios must be between 0 and 10000.")
    if any(not app.getAttribute("type").strip() for app in apps):
        raise ValueError("Every application must have a native widget type.")
    return apps


def _layout(values, count, current=None):
    if not isinstance(values, dict):
        raise ValueError("The page layout must be an object.")
    if set(values) - {"clay", *RATIOS}:
        raise ValueError("Unknown page layout fields.")
    fallback = {1: 0, 2: 1, 3: 3, 4: 7}.get(count)
    clay = _integer(values.get("clay", current.getAttribute("clay") if current is not None else fallback), "Layout code")
    if clay not in LAYOUT_COUNTS or LAYOUT_COUNTS[clay] != count:
        raise ValueError("The selected layout must match the number of applications (one to four).")
    result = {"clay": str(clay)}
    for key in RATIOS:
        old = current.getAttribute(key) if current is not None and current.hasAttribute(key) else 5000
        value = _integer(values.get(key, 10000 if count == 1 else old), key)
        if count == 1:
            if value != 10000:
                raise ValueError("A single application uses the entire page.")
        elif key in ACTIVE_RATIOS[clay] and not 1000 <= value <= 9000:
            raise ValueError("Split dividers must be between 10% and 90% of the page.")
        elif not 0 <= value <= 10000:
            raise ValueError("Native page ratios must be between 0 and 10000.")
        result[key] = str(value)
    return result


def _ordered(apps, order):
    if order is None:
        return list(apps)
    if not isinstance(order, list):
        raise ValueError("Application order must be a zero-based permutation.")
    indices = [_integer(value, "Application index") for value in order]
    if sorted(indices) != list(range(len(apps))):
        raise ValueError("Application order must include every application exactly once.")
    return [apps[index] for index in indices]


def _metadata(card):
    # Source page metadata cannot be silently discarded when pages are merged.
    attrs = tuple(sorted((attr.namespaceURI or "", attr.localName or attr.name, attr.value)
                         for attr in card.attributes.values()
                         if attr.namespaceURI != "http://www.w3.org/2000/xmlns/"
                         and attr.name not in {"clay", *RATIOS}))
    children = tuple(_signature(child) for child in card.childNodes
                     if not _native(child, "wdgt")
                     and not (child.nodeType == Node.TEXT_NODE and not child.data.strip()))
    return attrs, children


def _retain_namespace_context(app):
    """A moved app must retain declarations inherited from its source card."""
    bindings = {}
    owner = app
    while owner.nodeType == Node.ELEMENT_NODE:
        for attribute in owner.attributes.values():
            if attribute.namespaceURI == "http://www.w3.org/2000/xmlns/":
                bindings.setdefault(attribute.name, attribute.value)
        owner = owner.parentNode
    for name, value in bindings.items():
        if not app.hasAttribute(name):
            app.setAttributeNS("http://www.w3.org/2000/xmlns/", name, value)


def _summary(card):
    apps = _widgets(card)
    return {"path": _path(card), "clay": int(card.getAttribute("clay")),
            "widget_count": len(apps),
            "widgets": [{"path": _path(app), "type": app.getAttribute("type")} for app in apps]}


def _atomic_write(path, content, original):
    name = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".tns-layout-", suffix=".xml", delete=False) as stream:
            name = stream.name
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        # Guard against an editor update racing this transaction.
        if path.read_bytes() != original:
            raise ValueError("The Problem changed while saving its layout. Reopen Document Inspector.")
        os.chmod(name, path.stat().st_mode)
        os.replace(name, path)
        name = None
    finally:
        if name is not None:
            try:
                os.unlink(name)
            except FileNotFoundError:
                pass


def update_page_layout(xml_file: str | Path, operation: dict) -> dict:
    """Group, ungroup, reorder or change a page preset without changing apps.

    ``cards`` must contain the full inspected XML snapshot of every affected
    direct card. Grouping requires compatible page metadata; non-layout page
    attributes/fields cannot be silently discarded. Other Problem files are
    neither read nor written. The returned paths describe the new native tree.
    """
    if not isinstance(operation, dict):
        raise ValueError("A page layout operation is required.")
    action = operation.get("action")
    if action not in {"group", "ungroup", "arrange"}:
        raise ValueError("Unknown page layout operation.")
    if set(operation) - {"action", "cards", "destination", "layout", "order"}:
        raise ValueError("Unknown page layout operation fields.")
    entries = operation.get("cards")
    if not isinstance(entries, list) or not entries:
        raise ValueError("At least one inspected card snapshot is required.")
    if action == "group" and len(entries) < 2:
        raise ValueError("Select at least two document pages to group.")
    if action != "group" and len(entries) != 1:
        raise ValueError("This operation applies to one document page.")
    path = Path(xml_file)
    if path.suffix.lower() != ".xml" or not path.is_file():
        raise ValueError("A staged Problem XML file is required.")
    original = path.read_bytes()
    document = _parse(original)
    root = document.documentElement
    if not _native(root, "prob"):
        raise ValueError("Page layouts can only change one native Problem document.")
    cards = [child for child in _elements(root) if _native(child, "card")]
    by_path = {_path(card): card for card in cards}
    selected = []
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {"path", "xml"}:
            raise ValueError("Each page requires its exact inspected path and XML snapshot.")
        card = by_path.get(entry["path"])
        if card is None or card in selected:
            raise ValueError("A selected page is missing or selected more than once. Reopen Document Inspector.")
        expected = _parse(entry["xml"]).documentElement
        # XML parsers used by Inspector normalize literal CR line endings.
        # Accept that equivalent snapshot, while retaining the original TI CRs
        # in the live tree and writing them as character references below.
        if not _native(expected, "card") or _signature(card, True) != _signature(expected, True):
            raise ValueError("A selected page changed. Reopen Document Inspector before changing its layout.")
        _validate_card(card)
        selected.append(card)
    selected.sort(key=cards.index)
    changed_pages = []
    destination = None
    if action == "group":
        destination = by_path.get(operation.get("destination", _path(selected[0])))
        if destination not in selected:
            raise ValueError("The destination must be one of the selected pages.")
        apps = [app for card in selected for app in _widgets(card)]
        if len(apps) > 4:
            raise ValueError("A native TI-Nspire page supports at most four applications.")
        layout = _layout(operation.get("layout", {}), len(apps))
        apps = _ordered(apps, operation.get("order"))
        if any(_metadata(card) != _metadata(destination) for card in selected):
            raise ValueError("The selected pages have different page metadata and cannot be grouped without losing it.")
        for app in apps:
            _retain_namespace_context(app)
        for app in apps:
            destination.appendChild(app)
        for card in selected:
            if card is not destination:
                root.removeChild(card)
        for key, value in layout.items():
            destination.setAttribute(key, value)
        changed_pages = [destination]
    elif action == "ungroup":
        if any(key in operation for key in ("layout", "order", "destination")):
            raise ValueError("Ungroup does not take a layout, destination or application order.")
        source = selected[0]
        apps = _widgets(source)
        if len(apps) < 2:
            raise ValueError("This page already contains one application.")
        anchor = source.nextSibling
        for app in apps:
            card = source.cloneNode(True)
            for child in _widgets(card):
                card.removeChild(child)
            card.appendChild(app)
            for key, value in _layout({"clay": 0}, 1).items():
                card.setAttribute(key, value)
            root.insertBefore(card, anchor)
            changed_pages.append(card)
        root.removeChild(source)
        destination = changed_pages[0]
    else:
        if "destination" in operation:
            raise ValueError("Arrange does not take a destination page.")
        destination = selected[0]
        apps = _widgets(destination)
        layout = _layout(operation.get("layout", {}), len(apps), destination)
        apps = _ordered(apps, operation.get("order"))
        # Replace widgets in the existing slots, preserving metadata positions.
        anchors = [document.createComment("tns-layout-slot") for _ in apps]
        for widget, anchor in zip(_widgets(destination), anchors):
            destination.replaceChild(anchor, widget)
        for anchor, app in zip(anchors, apps):
            destination.replaceChild(app, anchor)
        for key, value in layout.items():
            destination.setAttribute(key, value)
        changed_pages = [destination]
    for card in changed_pages:
        _validate_card(card)
    result = {"action": action, "changed": _signature(root) != _signature(_parse(original).documentElement),
              "destination_path": _path(destination),
              "pages": [_summary(card) for card in changed_pages],
              "cards": [_summary(card) for card in _elements(root) if _native(card, "card")]}
    if result["changed"]:
        body = document.toxml(encoding="UTF-8").replace(b"\r", b"&#13;")
        # The TIXC encoder expects the native declaration's space before ?>.
        body = body.replace(b'<?xml version="1.0" encoding="UTF-8"?>',
                            b'<?xml version="1.0" encoding="UTF-8" ?>', 1)
        # Ensure the proposed complete document parses before its atomic replace.
        _parse(body)
        _atomic_write(path, body, original)
    return result
