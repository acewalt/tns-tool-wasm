"""Document Inspector deletion changes staged nodes without damaging siblings."""
import sys
import tempfile
import unittest
import contextlib
import io
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'editor_XML'))
from xml_updater import XMLUpdater
from xml_scanner import XMLScanner, local_name

P = 'urn:TI.Problem'
PE = 'urn:TI.ProgramEditor'
AUTH = '<r2dtotree version="1"><node name="0el" /></r2dtotree>'

class DocumentElementDeleteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.file = self.directory / 'Problem1.xml'
        self.template = (ROOT / 'templates/blank_tns_xml/Problem1.xml').read_text(encoding='utf8')
        self.file.write_text(self.template, encoding='utf8')

    def tearDown(self): self.temp.cleanup()
    def root(self): return ET.parse(self.file).getroot()
    def write(self, root):
        body = ET.tostring(root, encoding='utf8').replace(b'\r', b'&#13;')
        self.file.write_bytes(body)
    def snapshot(self, element, root=None):
        root = self.root() if root is None else root
        parents = {child: owner for owner in root.iter() for child in owner}
        return XMLScanner._element_path(element, parents), ET.tostring(element, encoding='unicode', short_empty_elements=False)
    def remove(self, element, root=None):
        path, raw = self.snapshot(element, root)
        return XMLUpdater.remove_document_element(self.file, path, raw, AUTH)
    def add_notes(self, text='keep'):
        root=self.root();card=ET.SubElement(root,f'{{{P}}}card',{'clay':'0'})
        widget=ET.SubElement(card,f'{{{P}}}wdgt',{'type':'TI.Notepad','ver':'2.0'})
        ET.SubElement(widget,'{urn:TI.Notepad}fmtxt').text=text
        self.write(root)
    def types(self): return [node.attrib.get('type') for node in self.root().iter() if local_name(node.tag)=='wdgt']

    def test_remove_notes_page_keeps_program_symbol_and_other_problem_unchanged(self):
        other=self.directory/'Problem2.xml';other.write_text(self.template,encoding='utf8');other_bytes=other.read_bytes()
        self.add_notes();root=self.root();symbol=next(node for node in root if local_name(node.tag)=='sym')
        stored=next(node.text for node in symbol.iter() if local_name(node.tag)=='v')
        widget=next(node for node in root.iter() if node.attrib.get('type')=='TI.Notepad')
        self.remove(widget,root)
        self.assertEqual(self.types(),['TI.ProgramEditor'])
        self.assertEqual(next(node.text for node in self.root().iter() if local_name(node.tag)=='v'),stored)
        self.assertEqual(other.read_bytes(),other_bytes)

    def test_delete_last_editor_page_keeps_executable_and_empty_page(self):
        root=self.root();before=next(node.text for node in root.iter() if local_name(node.tag)=='v')
        widget=next(node for node in root.iter() if node.attrib.get('type')=='TI.ProgramEditor')
        result=self.remove(widget,root)
        self.assertEqual(self.types(),[])
        self.assertEqual(result['blank_calculators'],0)
        self.assertEqual(result['empty_pages'],1)
        self.assertEqual(next(node.text for node in self.root().iter() if local_name(node.tag)=='v'),before)
        self.assertIn('\r',before,'Fixture must include real serialized statement separators')

    def test_delete_program_symbol_also_removes_its_editor_page(self):
        self.add_notes('notes survive');root=self.root()
        symbol=next(node for node in root.iter() if local_name(node.tag)=='e')
        result=self.remove(symbol,root)
        self.assertEqual(result['removed_symbol'],'nuevo')
        self.assertEqual(result['related_editors'],1)
        self.assertEqual(self.types(),['TI.Notepad'])
        self.assertFalse(any(local_name(node.tag)=='e' for node in self.root().iter()))

    def test_delete_last_page_leaves_empty_page_without_recreating_an_app(self):
        root=self.root();card=next(node for node in root if local_name(node.tag)=='card');card.set('clay','1');self.write(root)
        self.remove(card,root)
        self.assertEqual(self.types(),[])
        self.assertEqual(len([node for node in self.root() if local_name(node.tag)=='card']),1)
        self.assertEqual(next(node for node in self.root() if local_name(node.tag)=='card').attrib['clay'],'0')
        self.assertTrue(any(local_name(node.tag)=='e' for node in self.root().iter()),'Page deletion must retain separately stored symbols')

    def test_split_page_removes_only_selected_slot(self):
        root=self.root();card=next(node for node in root if local_name(node.tag)=='card');card.set('clay','1')
        keep=ET.SubElement(card,f'{{{P}}}wdgt',{'type':'TI.Notepad','ver':'2.0'})
        ET.SubElement(keep,'{urn:TI.Notepad}fmtxt').text='unchanged'
        self.write(root);root=self.root()
        widget=next(node for node in root.iter() if node.attrib.get('type')=='TI.ProgramEditor')
        self.remove(widget,root)
        self.assertEqual(self.types(),['TI.Notepad'])
        self.assertEqual(next(node for node in self.root() if local_name(node.tag)=='card').attrib['clay'],'0')
        self.assertIn('unchanged',self.file.read_text())

    def test_duplicate_names_are_selected_by_exact_indexed_path(self):
        self.add_notes('first');self.add_notes('second');root=self.root()
        notes=[node for node in root.iter() if node.attrib.get('type')=='TI.Notepad']
        self.remove(notes[1],root)
        data=self.file.read_text();self.assertIn('first',data);self.assertNotIn('second',data)

    def test_lua_script_removes_its_app_instead_of_leaving_an_invalid_script_app(self):
        root=self.root();card=ET.SubElement(root,f'{{{P}}}card',{'clay':'0'})
        widget=ET.SubElement(card,f'{{{P}}}wdgt',{'type':'TI.ScriptApp','ver':'1.0'})
        script=ET.SubElement(widget,'{urn:TI.ScriptApp}script');script.text='function on.paint(gc) end'
        self.write(root);root=self.root();script=next(node for node in root.iter() if local_name(node.tag)=='script')
        self.remove(script,root)
        self.assertEqual(self.types(),['TI.ProgramEditor'])

    def test_stale_or_missing_target_never_writes_xml(self):
        self.add_notes('original');root=self.root();widget=next(node for node in root.iter() if node.attrib.get('type')=='TI.Notepad')
        path,raw=self.snapshot(widget,root)
        next(iter(widget)).text='new contents';self.write(root);before=self.file.read_bytes()
        with self.assertRaisesRegex(ValueError,'changed'): XMLUpdater.remove_document_element(self.file,path,raw,AUTH)
        self.assertEqual(self.file.read_bytes(),before)
        with self.assertRaises(ValueError): XMLUpdater.remove_document_element(self.file,'/prob/card[99]/wdgt',raw,AUTH)
        self.assertEqual(self.file.read_bytes(),before)

    def test_root_and_internal_fields_cannot_damage_document(self):
        root=self.root();before=self.file.read_bytes();path,raw=self.snapshot(root,root)
        with self.assertRaises(ValueError): XMLUpdater.remove_document_element(self.file,path,raw,AUTH)
        field=next(node for node in root.iter() if local_name(node.tag)=='name');path,raw=self.snapshot(field,root)
        with self.assertRaises(ValueError): XMLUpdater.remove_document_element(self.file,path,raw,AUTH)
        self.assertEqual(self.file.read_bytes(),before)

    def test_last_calculator_is_really_deleted_and_stays_deleted_after_rescan(self):
        root=self.root();card=next(node for node in root if local_name(node.tag)=='card')
        widget=next(node for node in card if local_name(node.tag)=='wdgt')
        widget.clear();widget.attrib.update({'type':'TI.Scratchpad','ver':'1.0'})
        ET.SubElement(widget,'{urn:TI.Scratchpad}auth').text=AUTH
        card.set('w1','7200');card.set('custom','preserve');self.write(root)
        before_symbols=ET.tostring(next(node for node in root if local_name(node.tag)=='sym'))
        path,raw=self.snapshot(widget,root)
        result=XMLUpdater.remove_document_element(self.file,path,raw)
        self.assertEqual(result['blank_calculators'],0)
        self.assertEqual(result['empty_pages'],1)
        self.assertEqual(self.types(),[])
        reread=self.root();kept_card=next(node for node in reread if local_name(node.tag)=='card')
        self.assertEqual(kept_card.attrib,card.attrib)
        self.assertEqual(ET.tostring(next(node for node in reread if local_name(node.tag)=='sym')),before_symbols)
        XMLScanner(self.directory).scan()
        self.assertEqual(self.types(),[],'Rescanning must not create a replacement Calculator')

    def test_last_app_removal_never_substitutes_a_calculator_for_other_app_types(self):
        for kind in ['TI.Notepad','TI.ScriptApp','tabulator','TI.PythonEditor','TI.Graphs']:
            with self.subTest(kind=kind):
                self.file.write_text(self.template,encoding='utf8');root=self.root()
                widget=next(node for node in root.iter() if local_name(node.tag)=='wdgt')
                widget.clear();widget.attrib.update({'type':kind,'ver':'1.0'});self.write(root)
                self.remove(widget,root)
                self.assertEqual(self.types(),[])
                self.assertEqual(len([node for node in self.root() if local_name(node.tag)=='card']),1)

    def test_four_slot_page_collapses_to_supported_layouts_while_preserving_app_contents(self):
        root=self.root();card=next(node for node in root if local_name(node.tag)=='card');card.set('clay','7')
        for text in ['one','two','three']:
            widget=ET.SubElement(card,f'{{{P}}}wdgt',{'type':'TI.Notepad','ver':'2.0'})
            ET.SubElement(widget,'{urn:TI.Notepad}fmtxt').text=text
        self.write(root)
        for remaining,layout,texts in [(3,'3',['one','two','three']),(2,'1',['two','three']),(1,'0',['three']),(0,'0',[])]:
            root=self.root();widget=next(node for node in root.iter() if local_name(node.tag)=='wdgt')
            self.remove(widget,root)
            self.assertEqual(len(self.types()),remaining)
            self.assertNotIn('TI.Scratchpad',self.types())
            self.assertEqual(next(node for node in self.root() if local_name(node.tag)=='card').attrib['clay'],layout)
            self.assertEqual([node.text for node in self.root().iter() if local_name(node.tag)=='fmtxt'],texts)
        self.assertTrue(any(local_name(node.tag)=='e' for node in self.root().iter()))

    def test_empty_final_page_survives_tns_export_and_decode(self):
        sys.path.insert(0,str(ROOT))
        from tnstools import build_tns_from_xml,decode_tns_file
        root=self.root();widget=next(node for node in root.iter() if local_name(node.tag)=='wdgt')
        widget.clear();widget.attrib.update({'type':'TI.Scratchpad','ver':'1.0'});self.write(root)
        self.remove(widget,root)
        (self.directory/'Document.xml').write_bytes((ROOT/'templates/blank_tns_xml/Document.xml').read_bytes())
        output=self.directory/'deleted-calculator.tns';decoded=self.directory/'decoded'
        with contextlib.redirect_stdout(io.StringIO()):
            build_tns_from_xml(self.directory,output)
            decode_tns_file(output,decoded,artifacts=False)
        exported=ET.parse(decoded/'Problem1.xml').getroot()
        self.assertFalse(any(local_name(node.tag)=='wdgt' for node in exported.iter()))
        self.assertEqual(len([node for node in exported if local_name(node.tag)=='card']),1)
        self.assertTrue(any(local_name(node.tag)=='e' for node in exported.iter()))

    def test_resource_scope_and_live_references_are_guarded(self):
        resource=self.directory/'image.bmp';resource.write_bytes(b'bitmap')
        root=self.root();root.set('image','image.bmp');self.write(root)
        with self.assertRaisesRegex(ValueError,'used by a document app'): XMLUpdater.remove_document_resource(self.directory,'image.bmp',6)
        self.assertTrue(resource.exists())
        with self.assertRaises(ValueError): XMLUpdater.remove_document_resource(self.directory,'../outside.bin')
        with self.assertRaises(ValueError): XMLUpdater.remove_document_resource(self.directory,'Problem1.xml')
        root=self.root();del root.attrib['image'];self.write(root)
        with self.assertRaisesRegex(ValueError,'changed'): XMLUpdater.remove_document_resource(self.directory,'image.bmp',99)
        XMLUpdater.remove_document_resource(self.directory,'image.bmp',6)
        self.assertFalse(resource.exists());self.assertTrue(self.file.exists())

    def test_python_resource_without_filename_suffix_in_widget_is_still_referenced(self):
        resource=self.directory/'script.py';resource.write_text('print(1)')
        root=self.root();card=ET.SubElement(root,f'{{{P}}}card')
        widget=ET.SubElement(card,f'{{{P}}}wdgt',{'type':'TI.PythonEditor'})
        ET.SubElement(widget,'{urn:TI.PythonEditor}name').text='script'
        self.write(root)
        with self.assertRaisesRegex(ValueError,'used by a document app'): XMLUpdater.remove_document_resource(self.directory,'script.py',8)
        self.assertTrue(resource.exists())

if __name__=='__main__': unittest.main()
