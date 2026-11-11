"""Preserve TI Calculator transcripts without evaluating saved calls."""
import sys
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "editor_XML"))
from calculator_history import extract_calculator_rows, parse_calculator_rich_output, build_calculator_rich_output, write_calculator_rows, SP_NS


RICH = '<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word">There are </leaf><node name="0el"><leaf name="0text">2</leaf></node><leaf name="1word"> primes.</leaf></node></node><node name="1para"><node name="1rtline"><node name="0el"><leaf name="0text"></leaf><node name="0matrix" data="2">[[<node name="0el"><leaf name="0text">10</leaf></node>,<node name="0el"><leaf name="0text">2</leaf></node>][<node name="0el"><leaf name="0text">5</leaf></node>,<node name="0el"><leaf name="0text">5</leaf></node>]]</node></node><leaf name="1word"><cursor index="0" /></leaf></node></node></node></r2dtotree>'


def widget():
    element = ET.Element('{urn:TI.Problem}wdgt', {'type':'TI.Scratchpad'})
    ET.SubElement(element, f'{{{SP_NS}}}auth').text = 'auth preserved'
    row = ET.SubElement(element, f'{{{SP_NS}}}erow', {'future':'retained'})
    for name, value in [('entr','library\\factorstep(10)'),('exct','library\\factorstep(10)'),('intr',RICH),('left','0')]:
        ET.SubElement(row, f'{{{SP_NS}}}{name}').text = value
    result = ET.SubElement(row, f'{{{SP_NS}}}rslt')
    for name, value in [('warn2','{123}'),('disp','10'),('full','10')]: ET.SubElement(result, f'{{{SP_NS}}}{name}').text=value
    ET.SubElement(row, f'{{{SP_NS}}}ctxt', {'ang':'2','cplx':'3','comp':'4','extra':'retained'})
    return element


class CalculatorHistoryTests(unittest.TestCase):
    def test_rich_output_retains_mixed_text_math_and_matrix_rows(self):
        rows = parse_calculator_rich_output(RICH)
        self.assertEqual([row['text'] for row in rows], ['There are 2 primes.', '[[10,2][5,5]]'])
        self.assertEqual(rows[0]['segments'], [{'kind':'text','text':'There are '},{'kind':'math','text':'2'},{'kind':'text','text':' primes.'}])
        self.assertEqual(rows[1]['segments'], [{'kind':'math','text':'[[10,2][5,5]]'}])

    def test_history_reads_final_result_separately_and_never_calls_code(self):
        rows = extract_calculator_rows(widget())
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['entry'],'library\\factorstep(10)')
        self.assertEqual(rows[0]['display'],'10')
        self.assertEqual(rows[0]['output'][1]['text'],'[[10,2][5,5]]')
        self.assertEqual(rows[0]['kind'],'calculation')
        self.assertEqual(rows[0]['context']['ang'],'2')

    def test_untouched_roundtrip_preserves_intr_context_unknown_fields_and_auth(self):
        original = widget(); before = ET.tostring(original)
        write_calculator_rows(original, extract_calculator_rows(original))
        self.assertEqual(ET.tostring(original), before)

    def test_new_output_serializes_native_rich_text_and_matrix_nodes(self):
        original = widget()
        output = [{'text':'hello <world>', 'segments':[{'kind':'text','text':'hello <world>'}]}, {'text':'[[1,2][3,4]]','segments':[{'kind':'math','text':'[[1,2][3,4]]'}]}]
        write_calculator_rows(original,[{'entry':'demo()','display':'0','output':output}])
        rows=extract_calculator_rows(original)
        self.assertEqual(rows[0]['display'],'0')
        self.assertEqual([line['text'] for line in rows[0]['output']],['hello <world>','[[1,2][3,4]]'])
        rich=ET.fromstring(rows[0]['intr'])
        self.assertEqual([node.get('data') for node in rich.iter() if node.get('name')=='0matrix'],['2'])
        native=original.find(f'{{{SP_NS}}}erow')
        self.assertEqual([node.tag.rsplit('}',1)[-1] for node in native],['entr','exct','intr','left','rslt','ctxt'])

    def test_matrix_lexer_keeps_nested_commas_and_vector_rows(self):
        text='[[f(1,2),3][4,5]]'
        rich=build_calculator_rich_output([{'segments':[{'kind':'math','text':text}]}])
        self.assertEqual(parse_calculator_rich_output(rich)[0]['text'],text)
        matrix=next(node for node in ET.fromstring(rich).iter() if node.get('name')=='0matrix')
        self.assertEqual(len(matrix),4)

    def test_empty_history_does_not_invent_a_result_or_remove_authoring_state(self):
        original=widget();write_calculator_rows(original,[])
        self.assertEqual(extract_calculator_rows(original),[])
        self.assertEqual(original.find(f'{{{SP_NS}}}auth').text,'auth preserved')

    def test_invalid_rich_tree_is_not_interpreted_as_markup_or_code(self):
        self.assertEqual(parse_calculator_rich_output('<script>alert(1)'),[])
        self.assertEqual(extract_calculator_rows('<wdgt />'),[])

if __name__=='__main__':unittest.main()
