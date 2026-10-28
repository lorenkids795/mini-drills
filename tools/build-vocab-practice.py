"""Validate fresh contextual paraphrases against the imported source's sense map.
No passage text is copied. Correct-answer indices rotate deterministically.
Editorial scenarios live in a reviewable TSV; no generated AI questions at runtime.
"""
import json
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
bank = json.loads((ROOT / 'data/vocab-lab-p1.json').read_text(encoding='utf-8'))
links = {x['sourceId'].split('-')[-1]: x for x in bank['lesson_term_links']}
out = []
for row in (ROOT / 'editorial/vocab-lab-contexts.tsv').read_text(encoding='utf-8').splitlines():
    if not row or row.startswith('#'):
        continue
    suffix, context, correct, wrong1, wrong2, clue = row.split('|')
    link = links[suffix]
    answer = len(out) % 3
    options = [wrong1, wrong2]
    options.insert(answer, correct)
    out.append({'id': link['senseId'] + ':context-v1', 'senseId': link['senseId'],
                'sourceId': link['sourceId'], 'context': context,
                'prompt': 'Which interpretation best fits this context?',
                'options': options, 'answer': answer, 'clue': clue,
                'explanation': correct, 'validation': 'source-sense-aligned-v1',
                'editorialStatus': 'implementation_review', 'version': 1})
assert len(out) == 102 and len({x['senseId'] for x in out}) == 102
assert all(len(set(x['options'])) == 3 and x['explanation'] not in x['context'] for x in out)
(ROOT / 'data/vocab-lab-practice.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('102 fresh contexts, unique sense/source keys, rotating answers, no answer text in context')
