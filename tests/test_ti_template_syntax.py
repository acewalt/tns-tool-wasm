"""Syntax regressions for the supplied calculator math-template palette."""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "editor_XML"))
from ti_syntax import analyze_ti_code


class TiTemplateSyntaxTests(unittest.TestCase):
    def test_every_supplied_math_template_is_recognized_without_false_syntax_error(self):
        templates = "((1)/(1))::1^(1)::√(1)::root(1,1)::\uf03f^(1)::log(1,1)::piecewise(1,1,1,1)::piecewise(1,1,1,1,1,1)::system(1,1)::abs(1)::1°1'1''::[[1,1][1,1]]::[1,1]::[[1][1]]::[[1,1,1][1,1,1][1,1,1]]::∑(1,1,1,1)::∏(1,1,1,1)::\uf008(1,1)::\uf008(1,1,2)::\uf008(1,1,1)::∫(1,1,1,1)::∫(1,1)::lim(1,1,1,1)::1₁"
        for template in templates.split("::"):
            with self.subTest(template=template):
                result = analyze_ti_code("Prgm\n" + template + "\nEndPrgm")
                self.assertEqual(result.errors, [], result.format())

    def test_matrix_literal_rows_are_not_subscripts(self):
        for code in ("[[1,1,1][1,1,1][1,1,1]]", "[0]", "[[0][0]]"):
            self.assertFalse(any(d.code in (350, 950) for d in analyze_ti_code("Prgm\n" + code + "\nEndPrgm").errors))

    def test_actual_bad_subscripts_still_report_the_correct_error(self):
        self.assertTrue(any(d.code == 950 for d in analyze_ti_code("Prgm\nLocal a\na[1,2,3]\nEndPrgm").errors))
        self.assertTrue(any(d.code == 350 for d in analyze_ti_code("Prgm\nLocal a\na[0,1]\nEndPrgm").errors))

    def test_matrix_commands_and_modes_are_known_functions(self):
        for code in ("newMat(2,3)", "randMat(3,3)", "identity(3)", "diag({1,2,3})", "setMode(2,2)", "getMode(0)", "min({1,2})"):
            self.assertFalse(analyze_ti_code("Prgm\n" + code + "\nEndPrgm").errors, code)

    def test_template_argument_counts_are_checked(self):
        self.assertTrue(any(d.code == 930 for d in analyze_ti_code("Prgm\nnewMat(2)\nEndPrgm").errors))
        self.assertTrue(any(d.code == 940 for d in analyze_ti_code("Prgm\nroot(1,2,3)\nEndPrgm").errors))

    def test_private_glyphs_inside_strings_are_not_commands(self):
        self.assertFalse(analyze_ti_code('Prgm\nDisp "\uf008(1) ∑ "\nEndPrgm').errors)

    def test_catalog_greek_and_inverse_trig_aliases_are_known(self):
        for code in ("sin⁻¹(1)", "cosh⁻¹(2)", "ΔList({1,2,3})", "χ²Cdf(0,1,2)", "P▶Rx(1,2)", "list▶mat({1,2},2)"):
            result = analyze_ti_code("Prgm\n" + code + "\nEndPrgm")
            self.assertFalse(any(d.code in (410, 680, 960, 1090) for d in result.errors), result.format())

    def test_conversion_operator_and_scalar_variable_are_not_unknown_commands(self):
        result = analyze_ti_code("Prgm\nLocal a\n3→a\na▶Base2\na\nEndPrgm")
        self.assertFalse(any(d.code == 410 for d in result.errors), result.format())


if __name__ == "__main__":
    unittest.main()
