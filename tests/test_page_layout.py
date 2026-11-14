"""Native page-layout transactions preserve applications and reject stale UI data."""
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from xml.dom import minidom
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "editor_XML"))
from page_layout import LAYOUT_COUNTS, update_page_layout
import page_layout

P = "urn:TI.Problem"
AUTH = '&lt;r2dtotree&gt;&lt;node name="0el"&gt;keep&lt;/node&gt;&lt;/r2dtotree&gt;'


def fixture(types=("TI.GeoGrapher", "TI.Notepad", "TI.Scratchpad", "tabulator")):
    cards = ''.join(f'<card clay="0" w1="10000" w2="10000" h1="10000" h2="10000" custom="keep">'
                    f'<isDummyCard>0</isDummyCard><flag>0</flag>'
                    f'<wdgt type="{kind}" ver="1.0" marker="app-{index}">'
                    f'<sp:auth>{AUTH}</sp:auth><sp:payload resource="data{index}.bin">'
                    f'first\rsecond&#13;third</sp:payload></wdgt></card>'
                    for index, kind in enumerate(types))
    return ('<?xml version="1.0" encoding="UTF-8"?>'
            f'<prob xmlns="{P}" xmlns:sp="urn:TI.Scratchpad" xmlns:unused="urn:keep-unused" ver="1.0" pbname="keep">'
            '<sym><e t="7" f="65536"><n>keep_program</n><p>x</p>'
            '<v>Prgm&#13;Disp x&#13;EndPrgm</v></e></sym>' + cards +
            '<resources><entry>keep-resource</entry></resources></prob>')


class PageLayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.file = self.directory / "Problem1.xml"
        self.file.write_bytes(fixture().encode())
        self.other = self.directory / "Problem2.xml"
        self.other.write_bytes(fixture(("TI.PythonEditor",)).encode())

    def tearDown(self):
        self.temp.cleanup()

    def root(self):
        return ET.parse(self.file).getroot()

    def cards(self):
        return list(self.root().findall(f'{{{P}}}card'))

    def snapshots(self, *indices):
        # Match XMLScanner's namespace-independent element paths and ET XML.
        cards = self.cards()
        return [{"path": f'/prob/card[{index + 1}]' if len(cards) > 1 else '/prob/card',
                 "xml": ET.tostring(cards[index], encoding='unicode', short_empty_elements=False)}
                for index in indices]

    def transaction(self, action, *indices, **kwargs):
        return update_page_layout(self.file, {"action": action, "cards": self.snapshots(*indices), **kwargs})

    def markers(self):
        return [[widget.attrib['marker'] for widget in card.findall(f'{{{P}}}wdgt')] for card in self.cards()]

    def unchanged_failure(self, operation, message=None):
        before = self.file.read_bytes()
        with self.assertRaisesRegex(ValueError, message or '.'):
            update_page_layout(self.file, operation)
        self.assertEqual(self.file.read_bytes(), before)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_group_preserves_source_order_symbols_resources_metadata_and_other_problem(self):
        other_before = self.other.read_bytes()
        symbol_before = ET.tostring(self.root().find(f'{{{P}}}sym'))
        result = self.transaction('group', 2, 0, 1, destination='/prob/card[2]', layout={'clay': 5, 'w1': 4687, 'h1': 6965})
        self.assertTrue(result['changed'])
        self.assertEqual(self.markers(), [['app-0', 'app-1', 'app-2'], ['app-3']])
        self.assertEqual(result['destination_path'], '/prob/card[1]')
        self.assertEqual(result['pages'][0]['widgets'][2]['path'], '/prob/card[1]/wdgt[3]')
        self.assertEqual(self.cards()[0].attrib, {'clay': '5', 'w1': '4687', 'w2': '5000', 'h1': '6965', 'h2': '5000', 'custom': 'keep'})
        self.assertEqual(ET.tostring(self.root().find(f'{{{P}}}sym')), symbol_before)
        self.assertIn('keep-resource', self.file.read_text())
        self.assertEqual(self.other.read_bytes(), other_before)
        self.assertEqual(self.root().attrib, {'ver': '1.0', 'pbname': 'keep'})

    def test_all_eight_native_presets_require_matching_counts(self):
        for clay, count in LAYOUT_COUNTS.items():
            with self.subTest(clay=clay):
                self.file.write_bytes(fixture().encode())
                if count > 1:
                    self.transaction('group', *range(count), layout={'clay': clay})
                else:
                    self.transaction('arrange', 0, layout={'clay': clay})
                self.assertEqual(int(self.cards()[0].attrib['clay']), clay)
                self.assertEqual(len(self.markers()[0]), count)

    def test_group_can_reorder_apps_explicitly(self):
        self.transaction('group', 0, 2, layout={'clay': 2}, order=[1, 0])
        self.assertEqual(self.markers(), [['app-2', 'app-0'], ['app-1'], ['app-3']])

    def test_ungroup_is_adjacent_and_preserves_native_widget_order(self):
        self.transaction('group', 0, 1, 2, layout={'clay': 5})
        grouped = ET.tostring(self.cards()[0].findall(f'{{{P}}}wdgt')[1])
        result = self.transaction('ungroup', 0)
        self.assertEqual(self.markers(), [['app-0'], ['app-1'], ['app-2'], ['app-3']])
        self.assertEqual(len(result['pages']), 3)
        self.assertTrue(all(card.attrib['custom'] == 'keep' for card in self.cards()))
        self.assertTrue(all(card.attrib[key] == '10000' for card in self.cards() for key in ('w1', 'w2', 'h1', 'h2')))
        self.assertEqual(ET.tostring(self.cards()[1].find(f'{{{P}}}wdgt')), grouped)

    def test_arrange_changes_layout_ratios_and_widget_order_only(self):
        self.transaction('group', 0, 1, 2, layout={'clay': 5})
        result = self.transaction('arrange', 0, layout={'clay': 6, 'w1': 6500, 'h1': 4000, 'h2': 6000, 'w2': 4500}, order=[2, 0, 1])
        self.assertEqual(self.markers(), [['app-2', 'app-0', 'app-1'], ['app-3']])
        self.assertEqual(result['pages'][0]['clay'], 6)
        self.assertEqual(self.cards()[0].get('h2'), '6000')
        self.assertEqual(self.cards()[0].get('w2'), '4500')

    def test_literal_and_referenced_cr_in_auth_program_and_payload_survive(self):
        self.transaction('group', 0, 1, layout={'clay': 1})
        payloads = list(self.root().iter('{urn:TI.Scratchpad}payload'))
        self.assertTrue(all(node.text == 'first\rsecond\rthird' for node in payloads))
        self.assertEqual(self.root().find(f'{{{P}}}sym').find(f'{{{P}}}e').find(f'{{{P}}}v').text,
                         'Prgm\rDisp x\rEndPrgm')
        auth = next(self.root().iter('{urn:TI.Scratchpad}auth')).text
        self.assertEqual(auth, '<r2dtotree><node name="0el">keep</node></r2dtotree>')
        self.assertIn(b'&#13;', self.file.read_bytes())
        self.assertIn('xmlns:unused="urn:keep-unused"', self.file.read_text())

    def test_namespace_prefixes_inherited_from_each_source_card_remain_bound(self):
        self.file.write_text(f'<prob xmlns="{P}"><sym />'
                             '<card clay="0" xmlns:x="urn:one"><wdgt type="one" marker="app-0"><x:data>A</x:data></wdgt></card>'
                             '<card clay="0" xmlns:x="urn:two"><wdgt type="two" marker="app-1"><x:data>B</x:data></wdgt></card></prob>')
        self.transaction('group', 0, 1)
        apps = self.cards()[0].findall(f'{{{P}}}wdgt')
        self.assertEqual(list(apps[0])[0].tag, '{urn:one}data')
        self.assertEqual(list(apps[1])[0].tag, '{urn:two}data')
        self.assertIn('xmlns:x="urn:two"', self.file.read_text())

    def test_nested_widget_payloads_are_not_page_slots(self):
        text = fixture(('TI.Notepad', 'TI.GeoGrapher')).replace('first\rsecond&#13;third', '<wdgt type="internal"><value>keep</value></wdgt>')
        self.file.write_text(text)
        self.transaction('group', 0, 1)
        self.assertEqual(len(self.cards()[0].findall(f'{{{P}}}wdgt')), 2)
        self.assertEqual(len(list(self.root().iter(f'{{{P}}}wdgt'))), 4)

    def test_no_op_arrange_does_not_rewrite_original_bytes(self):
        before = self.file.read_bytes()
        result = self.transaction('arrange', 0)
        self.assertFalse(result['changed'])
        self.assertEqual(self.file.read_bytes(), before)

    def test_native_unused_full_height_ratios_do_not_block_column_arrangement(self):
        self.transaction('group', 0, 1)
        root = self.root()
        card = root.find(f'{{{P}}}card')
        card.set('h1', '10000')
        card.set('h2', '10000')
        card.set('w2', '10000')
        self.file.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>' + ET.tostring(root).replace(b'\r', b'&#13;'))
        result = self.transaction('arrange', 0, layout={'w1': 6500})
        self.assertTrue(result['changed'])
        self.assertEqual(self.cards()[0].get('h1'), '10000')
        self.assertEqual(self.cards()[0].get('w1'), '6500')

    def test_stale_snapshot_checks_entire_card_including_non_app_metadata(self):
        operation = {'action': 'group', 'cards': self.snapshots(0, 1)}
        self.file.write_bytes(self.file.read_bytes().replace(b'custom="keep"', b'custom="changed"', 1))
        self.unchanged_failure(operation, 'changed')

    def test_stale_snapshot_checks_hidden_values_not_only_widget_types(self):
        operation = {'action': 'group', 'cards': self.snapshots(0, 1)}
        self.file.write_bytes(self.file.read_bytes().replace(b'first\rsecond', b'changed\rsecond', 1))
        self.unchanged_failure(operation, 'changed')

    def test_missing_invalid_duplicate_and_non_card_paths_rejected_atomically(self):
        for path in ('/prob', '/prob/card[99]', '/prob/card[1]/wdgt', '/other/card[1]', '../Problem2.xml'):
            with self.subTest(path=path):
                snapshot = self.snapshots(0)[0]
                snapshot['path'] = path
                self.unchanged_failure({'action': 'arrange', 'cards': [snapshot]})
        snapshot = self.snapshots(0)[0]
        self.unchanged_failure({'action': 'group', 'cards': [snapshot, snapshot]})
        self.unchanged_failure({'action': 'arrange', 'cards': [{'path': '/prob/card[1]'}]})

    def test_unknown_and_mismatched_clay_and_bad_ratios_are_rejected(self):
        for layout in ({'clay': -1}, {'clay': 8}, {'clay': True}, {'clay': 1}, {'clay': 0, 'w1': 5000}, {'unknown': 4}):
            self.unchanged_failure({'action': 'arrange', 'cards': self.snapshots(0), 'layout': layout})
        for value in (999, 9001, 1.2, True, 'NaN'):
            self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1), 'layout': {'clay': 1, 'w1': value}})

    def test_malformed_existing_card_rejected_before_mutation(self):
        for corrupt in (b'clay="99"', b'clay="1"', b'clay="x"'):
            self.file.write_bytes(fixture().encode().replace(b'clay="0"', corrupt, 1))
            self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1)})

    def test_missing_application_type_and_non_native_problem_rejected(self):
        self.file.write_bytes(fixture().encode().replace(b'type="TI.GeoGrapher"', b'type=""', 1))
        self.unchanged_failure({'action': 'arrange', 'cards': self.snapshots(0)})
        self.file.write_bytes(fixture().encode().replace(P.encode(), b'urn:Not.A.Problem'))
        self.unchanged_failure({'action': 'arrange', 'cards': [{'path': '/prob/card[1]', 'xml': '<card />'}]})

    def test_more_than_four_apps_and_non_selected_destination_rejected(self):
        self.file.write_bytes(fixture(('A', 'B', 'C', 'D', 'E')).encode())
        self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1, 2, 3, 4)}, 'four')
        self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1), 'destination': '/prob/card[3]'}, 'destination')

    def test_group_does_not_silently_discard_different_source_page_metadata(self):
        self.file.write_bytes(fixture().encode().replace(b'custom="keep"', b'custom="different"', 1))
        self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1)}, 'metadata')

    def test_invalid_order_never_writes(self):
        for order in ([0, 0], [1], [-1, 0], [False, 1], [0, 2], '0,1'):
            self.unchanged_failure({'action': 'group', 'cards': self.snapshots(0, 1), 'order': order})

    def test_ungroup_single_and_unknown_operation_fields_rejected(self):
        self.unchanged_failure({'action': 'ungroup', 'cards': self.snapshots(0)})
        self.unchanged_failure({'action': 'hide', 'cards': self.snapshots(0)})
        self.unchanged_failure({'action': 'arrange', 'cards': self.snapshots(0), 'hidden': True})

    def test_entities_and_incomplete_snapshots_rejected(self):
        for raw in ('', '<card', f'<!DOCTYPE card [<!ENTITY x "bad">]><card xmlns="{P}">&x;</card>'):
            item = self.snapshots(0)[0]
            item['xml'] = raw
            self.unchanged_failure({'action': 'arrange', 'cards': [item]})

    def test_failed_atomic_replace_keeps_original_and_removes_temporary_file(self):
        before = self.file.read_bytes()
        operation = {'action': 'group', 'cards': self.snapshots(0, 1)}
        with patch('page_layout.os.replace', side_effect=OSError('simulated write failure')):
            with self.assertRaises(OSError):
                update_page_layout(self.file, operation)
        self.assertEqual(self.file.read_bytes(), before)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_windows_transient_sharing_failure_retries_and_saves(self):
        original_replace = page_layout.os.replace
        calls = []
        error = PermissionError('temporarily locked')
        error.winerror = 32

        def replace(source, target):
            calls.append(target)
            if len(calls) == 1:
                raise error
            return original_replace(source, target)

        with patch('page_layout.sys.platform', 'win32'), patch('page_layout.os.replace', side_effect=replace), patch('page_layout.time.sleep') as sleep:
            result = self.transaction('group', 0, 1)
        self.assertTrue(result['changed'])
        self.assertEqual(self.markers(), [['app-0', 'app-1'], ['app-2'], ['app-3']])
        self.assertEqual(len(calls), 2)
        sleep.assert_called_once_with(0.02)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_windows_persistent_access_failure_is_bounded_and_cleans_temporary_file(self):
        before = self.file.read_bytes()
        error = PermissionError('still locked')
        error.winerror = 5
        with patch('page_layout.sys.platform', 'win32'), patch('page_layout.os.replace', side_effect=error) as replace, patch('page_layout.time.sleep') as sleep:
            with self.assertRaisesRegex(PermissionError, 'still locked'):
                self.transaction('group', 0, 1)
        self.assertEqual(replace.call_count, 4)
        self.assertEqual(sleep.call_count, 3)
        self.assertLessEqual(sum(call.args[0] for call in sleep.call_args_list), 0.2)
        self.assertEqual(self.file.read_bytes(), before)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_editor_update_during_windows_retry_is_preserved(self):
        changed = self.file.read_bytes().replace(b'keep-resource', b'new-editor-resource')
        error = PermissionError('temporarily locked')
        error.winerror = 32
        with patch('page_layout.sys.platform', 'win32'), patch('page_layout.os.replace', side_effect=error) as replace, patch('page_layout.time.sleep', side_effect=lambda delay: self.file.write_bytes(changed)):
            with self.assertRaisesRegex(ValueError, 'changed'):
                self.transaction('group', 0, 1)
        replace.assert_called_once()
        self.assertEqual(self.file.read_bytes(), changed)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_non_windows_permission_failure_is_not_retried(self):
        before = self.file.read_bytes()
        error = PermissionError('access denied')
        error.winerror = 5
        with patch('page_layout.sys.platform', 'linux'), patch('page_layout.os.replace', side_effect=error) as replace, patch('page_layout.time.sleep') as sleep:
            with self.assertRaises(PermissionError):
                self.transaction('group', 0, 1)
        replace.assert_called_once()
        sleep.assert_not_called()
        self.assertEqual(self.file.read_bytes(), before)
        self.assertFalse(list(self.directory.glob('.tns-layout-*')))

    def test_real_native_three_app_fixture_and_ungroup(self):
        source = ROOT / 'release/qa/widgets-v39/case3-Problem1.xml'
        if not source.exists():
            self.skipTest('Private native fixture is not part of the source distribution')
        self.file.write_bytes(source.read_bytes())
        cards = self.cards()
        self.assertEqual(cards[0].get('clay'), '5')
        self.assertEqual(cards[0].get('w1'), '4687')
        before = [ET.tostring(widget) for card in cards for widget in card.findall(f'{{{P}}}wdgt')]
        self.transaction('ungroup', 0)
        after = [ET.tostring(widget) for card in self.cards() for widget in card.findall(f'{{{P}}}wdgt')]
        self.assertEqual(after, before)
        self.assertEqual([card.get('clay') for card in self.cards()], ['0', '0', '0', '0'])

    def test_grouped_and_ungrouped_pages_survive_tns_build_decode(self):
        sys.path.insert(0, str(ROOT))
        from tnstools import build_tns_from_xml, decode_tns_file
        # The native document-level file supplies its ordinary TNS envelope.
        self.file.write_bytes((ROOT / 'templates/blank_tns_xml/Problem1.xml').read_bytes())
        tree = ET.parse(self.file)
        root = tree.getroot()
        card = root.find(f'{{{P}}}card')
        second = ET.fromstring(ET.tostring(card))
        root.append(second)
        tree.write(self.file, encoding='utf8')
        (self.directory / 'Document.xml').write_bytes((ROOT / 'templates/blank_tns_xml/Document.xml').read_bytes())
        # Keep the test envelope to a single actual Problem file.
        self.other.unlink()
        self.transaction('group', 0, 1, layout={'clay': 2})
        for action, expected_count, expected_clay in ((None, 1, '2'), ('ungroup', 2, '0')):
            if action:
                self.transaction(action, 0)
            output = self.directory / ('grouped.tns' if action is None else 'ungrouped.tns')
            decoded = self.directory / ('decoded-grouped' if action is None else 'decoded-ungrouped')
            stage = self.directory / ('stage-grouped' if action is None else 'stage-ungrouped')
            stage.mkdir()
            (stage / 'Problem1.xml').write_bytes(self.file.read_bytes())
            (stage / 'Document.xml').write_bytes((self.directory / 'Document.xml').read_bytes())
            with contextlib.redirect_stdout(io.StringIO()):
                build_tns_from_xml(stage, output)
                decode_tns_file(output, decoded, artifacts=False)
            exported = ET.parse(decoded / 'Problem1.xml').getroot()
            pages = exported.findall(f'{{{P}}}card')
            self.assertEqual(len(pages), expected_count)
            self.assertTrue(all(page.get('clay') == expected_clay for page in pages))
            self.assertEqual(len(list(exported.iter(f'{{{P}}}wdgt'))), 2)
            self.assertIsNotNone(exported.find(f'{{{P}}}sym'))


if __name__ == '__main__':
    unittest.main()
