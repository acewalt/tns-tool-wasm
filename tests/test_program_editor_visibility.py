import copy
import sys
import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'editor_XML'))
from xml_updater import XMLUpdater
from xml_scanner import local_name

P = 'urn:TI.Problem'
PE = 'urn:TI.ProgramEditor'
AUTH = '<r2dtotree version="1"><node name="0el" /></r2dtotree>'

class ProgramEditorVisibilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.file = self.directory / 'Problem1.xml'
        self.template = (ROOT / 'templates/blank_tns_xml/Problem1.xml').read_text(encoding='utf8')
        self.file.write_text(self.template, encoding='utf8')

    def tearDown(self):
        self.temp.cleanup()

    def root(self): return ET.parse(self.file).getroot()
    def symbol(self): return ET.tostring(next(x for x in self.root() if local_name(x.tag) == 'sym'))
    def types(self): return [x.attrib['type'] for x in self.root().iter() if local_name(x.tag) == 'wdgt']
    def toggle(self, visible): return XMLUpdater.set_program_editor_visible(self.file, 'nuevo', visible, self.template, AUTH)

    def test_hiding_last_editor_keeps_executable_symbol_and_one_calculator_page(self):
        original = self.symbol()
        self.toggle(False)
        self.assertEqual(self.symbol(), original)
        self.assertEqual(self.types(), ['TI.Scratchpad'])
        self.assertFalse(self.toggle(False)['changed'])

    def test_show_hide_roundtrip_retains_symbol_code_and_does_not_duplicate_pages(self):
        original = self.symbol()
        self.toggle(False)
        self.toggle(True)
        self.assertEqual(self.types(), ['TI.Scratchpad', 'TI.ProgramEditor'])
        self.assertEqual(self.symbol(), original)
        self.assertFalse(self.toggle(True)['changed'])
        editor = next(x for x in self.root().iter() if x.attrib.get('type') == 'TI.ProgramEditor')
        self.assertIn('nuevo', editor.find(f'.//{{{PE}}}laststoredexpr').text)
        math_tree = ET.fromstring(editor.find(f'.//{{{PE}}}editor').text)
        self.assertIsNotNone(math_tree.find('.//node[@name="0prgm"]'))
        self.toggle(False)
        self.assertEqual(self.types(), ['TI.Scratchpad'])
        self.assertEqual(self.symbol(), original)

    def test_hiding_a_page_preserves_other_widgets_and_their_order(self):
        root = self.root()
        notes = ET.SubElement(root, f'{{{P}}}card', {'clay':'0'})
        ET.SubElement(notes, f'{{{P}}}wdgt', {'type':'TI.Notepad','ver':'2.0'})
        expected = ET.tostring(notes)
        ET.ElementTree(root).write(self.file, encoding='utf8')
        self.toggle(False)
        self.assertEqual(self.types(), ['TI.Notepad'])
        self.assertEqual(ET.tostring(next(x for x in self.root() if local_name(x.tag) == 'card')), expected)

    def test_split_page_keeps_layout_and_other_widget_content(self):
        root = self.root(); card = next(x for x in root if local_name(x.tag) == 'card')
        card.set('clay', '1')
        notes = ET.SubElement(card, f'{{{P}}}wdgt', {'type':'TI.Notepad','ver':'2.0'})
        ET.SubElement(notes, '{urn:TI.Notepad}fmtxt').text = 'preserve this'
        expected = ET.tostring(notes)
        ET.ElementTree(root).write(self.file, encoding='utf8')
        self.toggle(False)
        self.assertEqual(self.types(), ['TI.Scratchpad', 'TI.Notepad'])
        card = next(x for x in self.root() if local_name(x.tag) == 'card')
        self.assertEqual(card.attrib['clay'], '1')
        self.assertEqual(ET.tostring(list(card)[-1]), expected)

    def test_missing_symbol_refuses_to_hide_code_and_keeps_original_file(self):
        root = self.root(); root.remove(next(x for x in root if local_name(x.tag) == 'sym'))
        ET.ElementTree(root).write(self.file, encoding='utf8')
        original = self.file.read_bytes()
        with self.assertRaises(ValueError): self.toggle(False)
        self.assertEqual(self.file.read_bytes(), original)

    def test_edit_is_scoped_to_selected_problem_with_same_program_name(self):
        other = self.directory / 'Problem2.xml'; other.write_text(self.template, encoding='utf8')
        original = other.read_bytes()
        written = XMLUpdater(self.directory).update_program('nuevo', 'Prgm\nDisp 42\nEndPrgm', in_place=True, target_file='Problem1.xml')
        self.assertEqual(written, [self.file])
        self.assertEqual(other.read_bytes(), original)
        self.assertIn('42', self.file.read_text())
        with self.assertRaises(ValueError): XMLUpdater(self.directory).update_program('nuevo', 'Prgm\nEndPrgm', in_place=True, target_file='../outside.xml')

if __name__ == '__main__': unittest.main()
