"""Real TI programs may define subroutines inside their outer Prgm block."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "editor_XML"))
from ti_syntax import analyze_ti_code, autofix_ti_code


class InternalProgramTests(unittest.TestCase):
    def test_internal_programs_and_shared_problem_variables(self):
        source = 'Prgm\nDefine init()=Prgm\nradar:=100\nEndPrgm\nDefine draw()=Prgm\nDrawCircle radar,radar,25\nEndPrgm\ninit()\ndraw()\nDelVar radar,init,draw\nEndPrgm'
        result = analyze_ti_code(source)
        self.assertFalse(result.errors, result.format())

    def test_unicode_function_names_and_explicit_local_parameters(self):
        source = 'Prgm\nDefine θ(v1,v2)=Func\nLocal v1,v2\nReturn dotP(v1,v2)\nEndFunc\nheading:=θ([1,0],[0,1])\nDisp heading\nEndPrgm'
        result = analyze_ti_code(source)
        self.assertFalse(result.errors, result.format())

    def test_colon_assignments_and_indexed_targets_are_definitions(self):
        result = analyze_ti_code('Prgm\nposition:=newMat(2,2)\nposition[1]:=[[1,2]]\nposition[2,1]:=3\nDisp position\nEndPrgm')
        self.assertFalse(result.errors, result.format())

    def test_duplicate_outer_closure_remains_an_error(self):
        result = analyze_ti_code('Prgm\nEndPrgm\nEndPrgm')
        self.assertTrue(any(d.code == 730 for d in result.errors), result.format())

    def test_wrong_internal_closure_is_reported(self):
        result = analyze_ti_code('Prgm\nDefine init()=Prgm\nDisp 1\nEndFunc\nEndPrgm')
        self.assertTrue(any(d.code == 730 for d in result.errors), result.format())

    def test_subroutine_local_does_not_leak_into_parent(self):
        result = analyze_ti_code('Prgm\nDefine init()=Prgm\nLocal privateValue\nprivateValue:=1\nEndPrgm\ninit()\nDisp privateValue\nEndPrgm')
        self.assertTrue(any(d.code == 960 for d in result.errors), result.format())

    def test_parent_local_does_not_leak_into_subroutine(self):
        result = analyze_ti_code('Prgm\nLocal privateValue\nprivateValue:=1\nDefine child()=Prgm\nDisp privateValue\nEndPrgm\nchild()\nEndPrgm')
        self.assertTrue(any(d.code == 960 and d.line == 5 for d in result.errors), result.format())

    def test_separate_definition_header_and_typed_closures(self):
        source = 'Define LibPub outer()=\nPrgm\nDefine child(value)=\nFunc\nReturn value+1\nEndFunc\nDisp child(2)\nEndPrgm'
        result = analyze_ti_code(source)
        self.assertFalse(result.errors, result.format())
        fixed, _ = autofix_ti_code(source)
        self.assertEqual(fixed, source)

    def test_function_cannot_define_a_program_even_with_lowercase_tokens(self):
        result = analyze_ti_code('func\ndefine child()=prgm\nDisp 1\nendprgm\nReturn 1\nendfunc')
        self.assertTrue(any(d.code == 730 and d.line == 2 for d in result.errors), result.format())

    def test_same_local_name_is_valid_in_sibling_subroutines_and_autofix(self):
        source = 'Prgm\nDefine first()=Prgm\nLocal privateValue\nprivateValue:=1\nEndPrgm\nDefine second()=Prgm\nLocal privateValue\nprivateValue:=2\nEndPrgm\nfirst()\nsecond()\nEndPrgm'
        result = analyze_ti_code(source)
        self.assertFalse(result.errors, result.format())
        fixed, _ = autofix_ti_code(source)
        self.assertEqual(fixed, source)

    def test_autofix_duplicate_outer_closure_does_not_remove_child_closures(self):
        source = 'Prgm\nDefine child()=Prgm\nDisp 1\nEndPrgm\nchild()\nEndPrgm'
        fixed, _ = autofix_ti_code(source + '\nEndPrgm')
        self.assertEqual(fixed, source)
        self.assertFalse(analyze_ti_code(fixed).errors)

    def test_comments_do_not_define_shared_problem_variables(self):
        result = analyze_ti_code('Prgm\nDefine child()=Prgm\n© missingValue:=1\nEndPrgm\nDisp missingValue\nEndPrgm')
        self.assertTrue(any(d.code == 960 and d.line == 5 for d in result.errors), result.format())

    def test_unknown_call_inside_child_keeps_its_original_error_line(self):
        result = analyze_ti_code('Prgm\nDefine child()=Prgm\nmissingFunction(1)\nEndPrgm\nchild()\nEndPrgm')
        self.assertTrue(any(d.line == 3 and d.code == 1090 for d in result.errors), result.format())

    def test_raw_drawing_fixture_including_define_and_statement_separators(self):
        source = (Path(__file__).resolve().parents[1] / 'examples/cx-ii-drawing-test.tib').read_text(encoding='utf8')
        report = analyze_ti_code(source)
        # A file terminator is still the editor's deliberately flagged exterior
        # blank line. The raw colon-prefixed EndPrgm must nevertheless be found.
        self.assertEqual([(d.code, d.line) for d in report.errors], [(730, 42)], report.format())
        self.assertIn('Lineas vacias despues', report.errors[0].message)
        fixed, _ = autofix_ti_code(source)
        self.assertEqual(fixed, source.rstrip('\n'))
        self.assertFalse(analyze_ti_code(fixed).errors)

    def test_statement_separators_work_with_nested_local_and_typed_wrappers(self):
        source = ':Prgm\n:Define child(value)=Func\n:Local value\n:Return value+1\n:EndFunc\n:result:=child(2)\n:Disp child(result)\n:EndPrgm'
        report = analyze_ti_code(source)
        self.assertFalse(report.errors, report.format())
        fixed, _ = autofix_ti_code(source)
        self.assertEqual(fixed, source)

    def test_statement_separator_does_not_hide_errors_or_shift_lines(self):
        report = analyze_ti_code(':Prgm\n:DrawLine 1,2,3\n:EndPrgm\n:EndPrgm')
        self.assertTrue(any(d.line == 2 and d.code in (40, 930) for d in report.errors), report.format())
        self.assertTrue(any(d.line == 4 and d.code == 730 for d in report.errors), report.format())


if __name__ == "__main__":
    unittest.main()
