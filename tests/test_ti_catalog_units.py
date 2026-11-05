"""Unit/constant recognition must not suppress ordinary undefined variables."""
import sys
import unittest
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "editor_XML"))
from ti_catalog import TI_UNIT_CONSTANT_TOKENS
from ti_syntax import analyze_ti_code


class CatalogUnitTests(unittest.TestCase):
    def test_every_known_unit_and_constant_is_recognized(self):
        self.assertGreater(len(TI_UNIT_CONSTANT_TOKENS), 100)
        for token in TI_UNIT_CONSTANT_TOKENS:
            with self.subTest(token=token):
                result = analyze_ti_code("Prgm\nDisp 3*" + token + "\nEndPrgm")
                self.assertFalse(result.errors, result.format())

    def test_unknown_unit_still_reports_undefined_variable(self):
        result = analyze_ti_code("Prgm\nDisp 3*_unknownUnitV31\nEndPrgm")
        self.assertTrue(any(d.code == 960 for d in result.errors), result.format())

    def test_known_unit_prefix_cannot_hide_a_longer_unknown_name(self):
        for token in ("_meterV31", "_minionV31", "_cmExtraV31"):
            with self.subTest(token=token):
                result = analyze_ti_code("Prgm\nDisp 3*" + token + "\nEndPrgm")
                self.assertTrue(any(d.code == 960 for d in result.errors), result.format())

    def test_known_unit_does_not_hide_an_unrelated_undefined_variable(self):
        result = analyze_ti_code("Prgm\nDisp missingV31+3*_m\nEndPrgm")
        self.assertTrue(any(d.code == 960 and "missingV31" in d.message for d in result.errors), result.format())

    def test_verified_catalog_aliases_do_not_report_undefined_functions(self):
        for expression in (
            "cumulativeSum({1,2})", "dominantTerm(x^2,x)",
            "nDerivative(x^2,x,1)", "P▶Rx(1,1)",
            "mat▶list([[1,2][3,4]])", "count({1,2})", "getLangInfo()",
        ):
            with self.subTest(expression=expression):
                result = analyze_ti_code("Prgm\nDisp " + expression + "\nEndPrgm")
                self.assertFalse(result.errors, result.format())

    def test_unknown_function_is_still_rejected(self):
        result = analyze_ti_code("Prgm\nDisp unknownCatalogFunctionV31(1)\nEndPrgm")
        self.assertTrue(any(d.code == 1090 for d in result.errors), result.format())

    def test_prototype_tokens_are_canonicalized_or_explicitly_unavailable(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root / "assets/math-tools/catalog-hierarchy.json").read_text(encoding="utf8"))
        leaves = []
        def collect(nodes):
            for node in nodes:
                if node.get("children"):
                    collect(node["children"])
                else:
                    leaves.append(node)
        collect(data["math"]["tree"])
        codes = {node.get("code") for node in leaves}
        self.assertIn("cumulativeSum(", codes)
        self.assertIn("dominantTerm(", codes)
        self.assertIn("nDerivative(", codes)
        self.assertIn("mat▶list(", codes)
        self.assertNotIn("mat►list(", codes)
        unverified = [node for node in leaves if node.get("sourceCode") == "collect("]
        self.assertEqual(len(unverified), 1)
        self.assertIsNone(unverified[0]["code"])
        self.assertTrue(unverified[0]["unavailableReason"])


if __name__ == "__main__":
    unittest.main()
