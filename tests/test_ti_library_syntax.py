"""Library programs use TI's single-statement If and ordinary local scalars."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "editor_XML"))
from ti_syntax import analyze_ti_code, autofix_ti_code


class LibrarySyntaxTests(unittest.TestCase):
    def test_inline_if_assignments_are_checked_as_commands(self):
        source = 'Func\nLocal count,k\ncount:=0\nFor k,1,3\nIf k>1:count:=count+1\nEndFor\ncount\nEndFunc'
        self.assertFalse(analyze_ti_code(source).errors)
        self.assertEqual(autofix_ti_code(source)[0], source)

    def test_next_line_single_if_does_not_open_an_endif_block(self):
        source = 'Func\nLocal i\nFor i,1,3\nIf i=2\n© skip this comment: not a command\nReturn i\nEndFor\nfalse\nEndFunc'
        self.assertFalse(analyze_ti_code(source).errors)
        self.assertEqual(autofix_ti_code(source)[0], source)

    def test_inline_if_colon_is_not_confused_by_strings_or_assignment(self):
        source = 'Prgm\nLocal label\nlabel:="a:b then"\nIf label="a:b then":label:="c:d"\nDisp label\nEndPrgm'
        self.assertFalse(analyze_ti_code(source).errors)
        self.assertNotIn('EndIf', autofix_ti_code(source)[0])

    def test_local_d_is_a_scalar_not_an_uncalled_derivative(self):
        source = 'Func\nLocal d\nd:=1\nIf d=0:Return false\nd:=d-1\nd\nEndFunc'
        self.assertFalse(analyze_ti_code(source).errors)

    def test_boolean_literals_are_valid_expression_results(self):
        for value in ('true', 'false'):
            self.assertFalse(analyze_ti_code(f'Func\n{value}\nEndFunc').errors)

    def test_inline_if_keeps_assignment_argument_and_unknown_call_errors(self):
        for statement, code in [('If true:3bad:=1', 910),
                                ('If true:DrawLine 1,2,3', 930),
                                ('If true:missingRoutine(1)', 1090)]:
            with self.subTest(statement=statement):
                self.assertTrue(any(d.code == code and d.line == 2 for d in
                                    analyze_ti_code(f'Prgm\n{statement}\nEndPrgm').errors))

    def test_unclosed_then_block_and_stray_endif_remain_errors(self):
        self.assertTrue(any(d.code == 730 for d in
                            analyze_ti_code('Prgm\nIf true Then\nDisp 1\nEndPrgm').errors))
        self.assertTrue(any(d.code == 730 for d in
                            analyze_ti_code('Prgm\nIf true\nDisp 1\nEndIf\nEndPrgm').errors))

    def test_empty_guard_and_missing_single_statement_remain_errors(self):
        self.assertTrue(any(d.code == 20 for d in
                            analyze_ti_code('Prgm\nIf :Disp 1\nEndPrgm').errors))
        self.assertTrue(any(d.code == 740 for d in
                            analyze_ti_code('Prgm\nIf true\nEndPrgm').errors))

    def test_duplicate_local_in_one_declaration_is_still_reported(self):
        # TI lists duplicate variable names as E270. The supplied library has
        # one repeated s; do not suppress that independent diagnostic.
        self.assertTrue(any(d.code == 270 for d in
                            analyze_ti_code('Func\nLocal s,k,s\nReturn 1\nEndFunc').errors))

    def test_unshadowed_catalog_function_still_needs_call_syntax(self):
        self.assertTrue(any(d.code == 680 for d in
                            analyze_ti_code('Prgm\nmedian {1,2,3}\nEndPrgm').errors))


if __name__ == '__main__':
    unittest.main()
