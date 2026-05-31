import tempfile
import unittest
from pathlib import Path

from ti_xml_editor import (
    XMLScanner,
    XMLUpdater,
    multiline_to_ti_serialized,
    ti_serialized_to_multiline,
)


class TIParserTests(unittest.TestCase):
    def test_basic_serialized_to_multiline(self):
        source = 'Prgm :Local a:a:=5:Disp a:EndPrgm'
        self.assertEqual(
            ti_serialized_to_multiline(source),
            "Prgm \nLocal a\na:=5\nDisp a\nEndPrgm",
        )

    def test_ignores_colons_inside_strings(self):
        source = 'Prgm:Disp "hola:mundo":EndPrgm'
        self.assertEqual(
            ti_serialized_to_multiline(source),
            'Prgm\nDisp "hola:mundo"\nEndPrgm',
        )

    def test_ignores_colons_inside_escaped_quotes_in_strings(self):
        source = 'Prgm:Disp "a:""b:c""":EndPrgm'
        self.assertEqual(
            ti_serialized_to_multiline(source),
            'Prgm\nDisp "a:""b:c"""\nEndPrgm',
        )

    def test_ignores_colons_inside_lists_and_parenthesized_expressions(self):
        source = 'Prgm:{1:"a:b",2}→x:Disp x:EndPrgm'
        self.assertEqual(
            ti_serialized_to_multiline(source),
            'Prgm\n{1:"a:b",2}→x\nDisp x\nEndPrgm',
        )

    def test_preserves_blank_lines(self):
        multiline = "Prgm\n\nDisp 1\nEndPrgm"
        self.assertEqual(multiline_to_ti_serialized(multiline), "Prgm::Disp 1:EndPrgm")
        self.assertEqual(ti_serialized_to_multiline("Prgm::Disp 1:EndPrgm"), multiline)


class XMLScannerUpdaterTests(unittest.TestCase):
    XML = """<?xml version="1.0" encoding="UTF-8" ?>
<prob xmlns="urn:TI.Problem" xmlns:pe="urn:TI.ProgramEditor" ver="1.0" pbname="">
  <sym><e t="7" f="196608" c="0"><n>phy</n><p></p><v>Prgm:Disp "hola:mundo":EndPrgm</v></e></sym>
  <card><wdgt type="TI.ProgramEditor" ver="1.0">
    <pe:data>
      <pe:name>phy</pe:name>
      <pe:type>Prgm</pe:type>
      <pe:laststoredexpr>Define LibPriv phy()=
Prgm:Disp "hola:mundo":EndPrgm</pe:laststoredexpr>
      <pe:editor>&lt;r2dtotree&gt;visual&lt;/r2dtotree&gt;</pe:editor>
    </pe:data>
  </wdgt></card>
</prob>
"""

    def test_scanner_finds_symbol_and_program_editor_locations(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "Problem1.xml").write_text(self.XML, encoding="utf-8")
            candidates = XMLScanner(folder).scan()

        kinds = [candidate.kind for candidate in candidates]
        self.assertIn("symbol_value", kinds)
        self.assertIn("program_editor_widget", kinds)
        self.assertIn("program_editor_laststoredexpr", kinds)
        self.assertIn("program_editor_visual_tree", kinds)
        symbol = next(candidate for candidate in candidates if candidate.kind == "symbol_value")
        laststored = next(candidate for candidate in candidates if candidate.kind == "program_editor_laststoredexpr")
        self.assertEqual(symbol.program_name, "phy")
        self.assertEqual(symbol.code_hash, laststored.code_hash)

    def test_updater_changes_symbol_and_laststoredexpr_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "src"
            out_dir = Path(tmp) / "out"
            folder.mkdir()
            (folder / "Problem1.xml").write_text(self.XML, encoding="utf-8")

            written = XMLUpdater(folder).update_program(
                "phy",
                'Prgm\nDisp "adios:mundo"\nEndPrgm',
                out_dir=out_dir,
            )

            self.assertEqual(len(written), 1)
            updated = (out_dir / "Problem1.xml").read_text(encoding="utf-8")
            self.assertIn('Prgm:Disp "adios:mundo":EndPrgm', updated)
            self.assertIn("&lt;r2dtotree&gt;visual&lt;/r2dtotree&gt;", updated)

    def test_updater_preserves_existing_separator_style(self):
        xml = self.XML.replace('Prgm:Disp "hola:mundo":EndPrgm', 'Prgm&#13;:Disp "hola:mundo"&#13;:EndPrgm')
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "src"
            out_dir = Path(tmp) / "out"
            folder.mkdir()
            (folder / "Problem1.xml").write_text(xml, encoding="utf-8")

            XMLUpdater(folder).update_program(
                "phy",
                'Prgm\nDisp "adios:mundo"\nEndPrgm',
                out_dir=out_dir,
            )

            updated = (out_dir / "Problem1.xml").read_text(encoding="utf-8")
            self.assertIn('Prgm\n:Disp "adios:mundo"\n:EndPrgm', updated)


if __name__ == "__main__":
    unittest.main()
