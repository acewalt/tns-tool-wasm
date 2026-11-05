"""CX II graphics catalog signatures and the user's drawing example."""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "editor_XML"))
from ti_syntax import analyze_ti_code
from ti_catalog import TI_CATALOG_STATEMENTS, TI_CATALOG


class PrgmDrawingSyntaxTests(unittest.TestCase):
    def test_actual_sample_program_body_has_no_false_errors(self):
        lines = (ROOT / "examples/cx-ii-drawing-test.tib").read_text(encoding="utf8").splitlines()[1:]
        source = "\n".join(line.lstrip(":") for line in lines)
        report = analyze_ti_code(source)
        self.assertEqual(report.errors, [], report.format())

    def test_every_graphics_catalog_entry_is_a_statement(self):
        for name in ("clear", "drawarc", "drawcircle", "drawline", "drawpoly", "drawrect", "drawtext", "fillarc", "fillcircle", "fillpoly", "fillrect", "paintbuffer", "plotxy", "setcolor", "setpen", "setwindow", "usebuffer"):
            self.assertIn(name, TI_CATALOG_STATEMENTS, name)
            self.assertIn(name, TI_CATALOG, name)

    def test_zero_argument_buffer_commands_and_clear_overloads(self):
        for command in ("Clear", "Clear 1,2,3,4", "UseBuffer", "PaintBuffer", "Wait .1", "DrawPoly {0,1,2},{0,1,2}", "FillPoly 0,0,10,0,0,10"):
            report = analyze_ti_code("Prgm\n" + command + "\nEndPrgm")
            self.assertEqual(report.errors, [], report.format())

    def test_invalid_arity_is_not_silently_accepted(self):
        for command in ("Clear 1,2", "DrawPoly 1,2,3", "FillPoly 1,2,3,4,5", "UseBuffer 1", "PaintBuffer 1", "DrawLine 1,2,3"):
            report = analyze_ti_code("Prgm\n" + command + "\nEndPrgm")
            self.assertTrue(any(error.code in (40, 930, 940) for error in report.errors), report.format())


if __name__ == "__main__":
    unittest.main()
