"""Regression checks for the user-provided TI-Nspire CX II CAS catalog."""
from __future__ import annotations
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "editor_XML"))
from ti_catalog import TI_CATALOG, TI_CATALOG_FUNCTIONS, TI_CATALOG_STATEMENTS
from ti_syntax import analyze_ti_code, autofix_ti_code
from xml_updater import XMLUpdater
import xml.etree.ElementTree as ET


def errors(source):
    return analyze_ti_code(source).errors


class CatalogSyntaxTests(unittest.TestCase):
    def test_catalog_retains_reference_signatures(self):
        self.assertGreaterEqual(len(TI_CATALOG), 300)
        self.assertEqual(TI_CATALOG["dispat"][1], "DispAt Fila,Expr")
        self.assertIn("requeststr", TI_CATALOG_STATEMENTS)
        self.assertIn("integral", TI_CATALOG_FUNCTIONS)
        self.assertIn("solve", TI_CATALOG_FUNCTIONS)

    def test_exact_user_dispat_program_is_valid(self):
        program = """Prgm
Local n,r

DispAt 1,"=== CALCULADORA ==="
DispAt 2,"Raiz cuadrada"

Request "Introduce numero:",n

If n>=0 Then
 sqrt(n)→r
 DispAt 4,"Resultado:"
 DispAt 5,r
Else
 DispAt 4,"Numero negativo"
EndIf

EndPrgm"""
        self.assertEqual(errors(program), [])

    def test_dispat_argument_count(self):
        result = errors('Prgm\nDispAt 2\nEndPrgm')
        self.assertTrue(any(d.code == 930 and d.line == 2 for d in result), result)

    def test_unknown_command_suggests_documented_spelling(self):
        result = errors('Prgm\nDispaTt 2,"Hola"\nEndPrgm')
        self.assertTrue(any(d.code == 410 and "DispAt" in d.detail for d in result), result)

    def test_valid_catalog_commands_do_not_trigger_E410(self):
        source = ('Prgm\nText "Hola"\nDrawText 1,1,"Hola"\n'
                  'Clear\nWait 1\nRequestStr "Nombre:",nombre\nEndPrgm')
        self.assertFalse(any(d.code == 410 for d in errors(source)))

    def test_catalog_functions_are_not_undefined_functions(self):
        source = 'Prgm\nfactor(x^2-1)→resultado\nintegral(x^2,x)→i\nEndPrgm'
        result = errors(source)
        self.assertFalse(any(d.code in (410, 1090, 680) for d in result), result)

    def test_called_function_stored_in_variable_is_not_missing_parenthesis(self):
        result = errors('Prgm\nLocal r\nsqrt(9)→r\nDispAt 1,r\nEndPrgm')
        self.assertFalse(any(d.code == 680 for d in result), result)

    def test_missing_catalog_function_parenthesis_is_diagnostic(self):
        result = errors('Prgm\nmedian {1,2,3}→r\nEndPrgm')
        self.assertTrue(any(d.code == 680 for d in result), result)

    def test_requeststr_and_optional_request_status(self):
        source = ('Prgm\nLocal nombre,x,ok\nRequestStr "Nombre:",nombre\n'
                  'Request "Numero:",x,1,ok\nDisp nombre,ok\nEndPrgm')
        result = errors(source)
        self.assertFalse(any(d.code in (410, 930, 940, 960) for d in result), result)

    def test_recognizing_catalog_does_not_change_preview_capability(self):
        # Semantic support and runtime support are intentionally separate.
        self.assertIn("solve", TI_CATALOG_FUNCTIONS)
        self.assertFalse(any(d.code == 410 for d in errors('Prgm\nsolve(x=2,x)→r\nEndPrgm')))


class PrgmBoundaryTests(unittest.TestCase):
    # The user's screenshot has an empty first and last editor line.
    # TI.ProgramEditor inserts the read-only wrapper in the XML on its own.
    source = (
        '\\nPrgm\\nLocal nombre,edad\\n\\nText "Bienvenido a TNS Tool"\\n'
        'RequestStr "Tu nombre:",nombre\\nEndPrgm\\n'
    )

    def test_blank_lines_outside_program_are_errors(self):
        report = analyze_ti_code(self.source)
        boundary = [(d.code, d.line) for d in report.errors if d.code == 730]
        self.assertEqual(boundary, [(730, 1), (730, 8)], report.format())

    def test_auto_fix_trims_only_exterior_blank_lines(self):
        fixed, actions = autofix_ti_code(self.source)
        self.assertEqual(
            fixed,
            'Prgm\\nLocal nombre,edad\\n\\nText "Bienvenido a TNS Tool"\\n'
            'RequestStr "Tu nombre:",nombre\\nEndPrgm',
        )
        self.assertIn("lineas vacias antes", actions)
        self.assertIn("lineas vacias despues", actions)
        self.assertFalse(any(d.code == 730 for d in analyze_ti_code(fixed).errors))

    def test_xml_serialization_prevents_duplicate_wrapper_even_before_auto_fix(self):
        body = XMLUpdater._program_body_lines(self.source, "Prgm")
        self.assertEqual(
            body,
            ['Local nombre,edad', '', 'Text "Bienvenido a TNS Tool"',
             'RequestStr "Tu nombre:",nombre'],
        )
        tree = ET.fromstring(
            XMLUpdater._build_program_editor_tree("nuevo", self.source, "")
        )
        program_nodes = [node for node in tree.iter("node")
                         if node.get("name") == "0prgm"]
        self.assertEqual(len(program_nodes), 1)
        body_lines = [child.find("leaf").text or ""
                      for child in program_nodes[0].findall("node")]
        self.assertEqual(body_lines, body)
        self.assertNotIn("Prgm", body_lines)
        self.assertNotIn("EndPrgm", body_lines)

    def test_internal_blank_lines_are_not_errors(self):
        code = 'Prgm\\n\\nDisp "ok"\\n\\nEndPrgm'
        self.assertFalse(any(d.code == 730 for d in analyze_ti_code(code).errors))
        self.assertEqual(XMLUpdater._program_body_lines(code), ['', 'Disp "ok"', ''])

    def test_func_wrapper_uses_same_boundary_rule(self):
        source = '\\nFunc\\nLocal x\\nEndFunc\\n'
        report = analyze_ti_code(source)
        self.assertEqual([(d.code, d.line) for d in report.errors if d.code == 730],
                         [(730, 1), (730, 5)])
        fixed, _ = autofix_ti_code(source)
        self.assertEqual(fixed, 'Func\\nLocal x\\nEndFunc')
        self.assertEqual(XMLUpdater._program_body_lines(source, "Func"), ['Local x'])


if __name__ == "__main__":
    unittest.main()
