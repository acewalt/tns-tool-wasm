"""Native TNS comment text must survive serialized program import unchanged."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "editor_XML"))
from ti_parser import TIParser, ti_serialized_to_multiline
from ti_syntax import analyze_ti_code


class NativeCommentParserTests(unittest.TestCase):
    def test_native_comment_colons_remain_one_comment(self):
        source = 'Func\r:© count(a,b): #items between a & b\r:Local n\r:n:=10\r:n\r:EndFunc'
        decoded = ti_serialized_to_multiline(source)
        self.assertEqual(decoded, 'Func\n© count(a,b): #items between a & b\nLocal n\nn:=10\nn\nEndFunc')
        self.assertFalse(analyze_ti_code(decoded).errors)

    def test_comments_do_not_change_string_or_bracket_state(self):
        source = 'Prgm\r\n:© note: "unclosed quote ( [{\r\n:Disp "ok: ready"\r\n:EndPrgm'
        self.assertEqual(ti_serialized_to_multiline(source),
                         'Prgm\n© note: "unclosed quote ( [{\nDisp "ok: ready"\nEndPrgm')

    def test_lf_and_cr_native_boundaries(self):
        for newline in ('\n', '\r', '\r\n'):
            with self.subTest(newline=repr(newline)):
                self.assertEqual(TIParser().split_statements(f'Prgm{newline}:© a:b{newline}:EndPrgm'),
                                 ['Prgm', '© a:b', 'EndPrgm'])

    def test_flat_legacy_values_keep_colon_boundaries(self):
        self.assertEqual(TIParser().split_statements('Prgm:© comment:Disp 1:EndPrgm'),
                         ['Prgm', '© comment', 'Disp 1', 'EndPrgm'])

    def test_assignment_doubled_quotes_and_inline_if_still_work(self):
        source = 'Prgm\r:Local x\r:x:=1\r:If x=1:Disp "say ""yes:ok"""\r:© ignore: this\r:EndPrgm'
        self.assertEqual(TIParser().split_statements(source),
                         ['Prgm', 'Local x', 'x:=1', 'If x=1:Disp "say ""yes:ok"""', '© ignore: this', 'EndPrgm'])

    def test_plain_multiline_comments_keep_colons_and_next_line(self):
        self.assertEqual(ti_serialized_to_multiline('Prgm\n© title: units\nDisp "ok"\nEndPrgm'),
                         'Prgm\n© title: units\nDisp "ok"\nEndPrgm')

    def test_inline_if_ignores_colon_and_then_inside_quoted_condition(self):
        self.assertEqual(TIParser().split_statements('Prgm:If label="a:b then":Disp "yes":EndPrgm'),
                         ['Prgm', 'If label="a:b then":Disp "yes"', 'EndPrgm'])


if __name__ == '__main__':
    unittest.main()
