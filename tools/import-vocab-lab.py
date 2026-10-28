"""Read-only XLSX import. Usage: python tools/import-vocab-lab.py SOURCE.xlsx

Requires openpyxl for reading only. No application-side Excel dependency.
Editorial overrides are authorized by CODEX-TASK-01.md / VOCAB-LAB-SPEC.md,
not the workbook's legacy Pending teacher review cells.
"""
import hashlib
import json
import pathlib
import re
import sys
import unicodedata
from collections import Counter
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]

def canonical(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(value)).strip().lower())

def key(prefix, value):
    return prefix + hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()[:24]

def build(source):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    rows = list(workbook["Vocabulary Bank"].values)
    expected = ["ID", "Vocabulary / Expression", "Type", "Priority", "Meaning (VI)",
                "Context definition (EN)", "Word family (suggested)", "Collocation / structure",
                "Paraphrase", "Book", "Test", "Skill", "Passage", "Section", "Review status",
                "Existing term ID", "Import action"]
    if list(rows[0]) != expected:
        raise ValueError("Unexpected workbook headers")
    terms, senses, links, pending, families = {}, {}, [], [], []
    ids, duplicates = set(), []
    for number, row in enumerate(rows[1:], 2):
        if not any(row):
            continue
        r = dict(zip(expected, row))
        term, meaning = r[expected[1]], r[expected[5]]
        if not term or not meaning or r['ID'] in ids:
            raise ValueError("Missing term/sense or repeated source ID at row %s" % number)
        ids.add(r['ID'])
        if r['Book'] != 17 or r['Test'] != 1 or r['Skill'] != 'Reading' or r['Passage'] not in (1, 2):
            raise ValueError("Unexpected source at row %s" % number)
        if canonical(term) == 'royal commission':
            raise ValueError("Excluded Royal Commission unexpectedly present")
        tid = key('term-', term)
        sid = key('sense-', canonical(term) + '|' + canonical(meaning))
        lid = 'cam17-t1-reading-p%s' % r['Passage']
        link = {'id': lid + ':' + sid, 'lessonId': lid, 'termId': tid, 'senseId': sid,
                'sourceId': r['ID'], 'sourceRow': number, 'sourceSheet': 'Vocabulary Bank',
                'priority': str(r['Priority']).lower(), 'section': r['Section'],
                'originalReviewStatus': r['Review status'], 'existingTermId': r['Existing term ID'],
                'importAction': r['Import action'], 'collocation': r[expected[7]], 'paraphrase': r['Paraphrase'],
                'status': 'approved' if r['Passage'] == 1 else 'pending_review'}
        if canonical(term) == 'slum' and r['Passage'] == 1:
            link['priority'] = 'supporting'
        if r['Passage'] == 2:
            # Pending data is deliberately not loaded by the application.
            pending.append({'link': link, 'term': term, 'type': r['Type'], 'definition': meaning,
                            'meaningVi': r[expected[4]], 'suggestedFamily': r[expected[6]]})
            continue
        if link['id'] in {x['id'] for x in links}:
            raise ValueError('Duplicate term/sense inside lesson: ' + term)
        if sid in senses:
            duplicates.append(r['ID'])
        terms[tid] = {'id': tid, 'surface': term, 'canonical': canonical(term), 'type': r['Type']}
        senses[sid] = {'id': sid, 'termId': tid, 'definition': meaning, 'meaningVi': r[expected[4]]}
        links.append(link)
        families.append({'termId': tid, 'suggestedForms': r[expected[6]], 'status': 'suggested',
                         'evidence': 'none', 'sourceId': r['ID']})
    if len(links) != 102 or len(pending) != 100:
        raise ValueError('Expected 102 approved P1 and 100 pending P2 entries')
    approved_keys = {key('sense-', canonical(x['term']) + '|' + canonical(x['definition'])) for x in pending}
    overlaps = sorted(approved_keys.intersection(senses))
    data = {'schemaVersion': 1, 'lessonId': 'cam17-t1-reading-p1',
            'title': 'Cambridge 17 / Test 1 / Reading Passage 1',
            'terms': list(terms.values()), 'senses': list(senses.values()),
            'lesson_term_links': links, 'word_family_links': families}
    audit = {'schemaVersion': 1, 'sourceFile': source.name,
             'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
             'approvalAuthority': 'CODEX-TASK-01.md and VOCAB-LAB-SPEC.md: P1 only',
             'approvedP1': len(links), 'pendingP2': len(pending), 'excluded': ['Royal Commission'],
             'overrides': {'slum': 'supporting'}, 'exactDuplicateSources': duplicates,
             'crossPassageSameSenseKeys': overlaps,
             'priorityCounts': dict(Counter(x['priority'] for x in links))}
    for path, value in [('data/vocab-lab-p1.json', data),
                        ('editorial/vocab-lab-p2.pending.json', {'status': 'pending_review', 'entries': pending}),
                        ('data/vocab-lab-import-audit.json', audit)]:
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(audit, ensure_ascii=True))

if __name__ == '__main__':
    build(pathlib.Path(sys.argv[1]))
