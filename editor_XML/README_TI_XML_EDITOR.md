# TI-Nspire XML intermediate editor

Small Python tool for editing TI-Nspire programs extracted by TnsTools as XML.
It does not rebuild `.tns` files and does not touch TIXC or binary streams.

## Scan XML

```powershell
python ti_xml_editor.py scan .
```

The scanner reports:

- `<v>` executable symbol values.
- `TI.ProgramEditor` widgets.
- `pe:laststoredexpr` editor copies.
- `pe:editor` visual trees as context only.
- hash/length data to spot duplicate or divergent copies.

## Export a program to multiline text

```powershell
python ti_xml_editor.py export . --program phy --out phy.ti
```

Serialized TI code such as:

```text
Prgm:Disp "hola:mundo":EndPrgm
```

becomes:

```text
Prgm
Disp "hola:mundo"
EndPrgm
```

The parser treats `:` as a separator only outside strings and grouped expressions, and preserves `:=`.

## Update XML from multiline text

Write to a separate output folder:

```powershell
python ti_xml_editor.py update . --program phy --from phy.ti --out-dir updated_xml
```

Or explicitly update in place:

```powershell
python ti_xml_editor.py update . --program phy --from phy.ti --in-place
```

The updater currently changes the executable `<v>` and `pe:laststoredexpr` for the selected program. It intentionally does not rewrite the visual `pe:editor` tree, TIXC artifacts, compressed streams, or `.tns` containers.

## Tests

```powershell
python -m unittest -v
```

## Visual editor

```powershell
python gui.py
```

Workflow:

- Use `Abrir XML` to select either one XML file or a `.tns.xml` folder.
- Pick the detected program from the combo box.
- Edit the multiline TI code in the main editor.
- Use `Incrustar en XML` to update a temporary XML staging copy.
- Use `Guardar XML` to overwrite the original XML or save a copy.

The right panel shows detected XML locations, code hashes, and whether `<v>` and `pe:laststoredexpr` differ. The visual `pe:editor` tree is reported but not edited.
