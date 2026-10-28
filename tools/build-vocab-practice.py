"""Validate fresh contextual paraphrases against the imported source's sense map.
No passage text is copied. Correct-answer indices rotate deterministically.
Editorial scenarios live in a reviewable TSV; no generated AI questions at runtime.
"""
import json
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
bank = json.loads((ROOT / 'data/vocab-lab-p1.json').read_text(encoding='utf-8'))
links = {x['sourceId'].split('-')[-1]: x for x in bank['lesson_term_links']}
reviews = {}
for row in (ROOT / 'editorial/vocab-lab-review.tsv').read_text(encoding='utf-8').splitlines():
    if row and not row.startswith('#'):
        suffix, wrong1, wrong2, explanation, note, flag, clue, context = row.split('|')
        assert suffix not in reviews
        reviews[suffix] = dict(wrong1=wrong1, wrong2=wrong2, explanation=explanation, note=note, flag=flag, clue=clue, context=context)
assert set(reviews) == set(links), 'Every one of the 102 source senses needs its own review'
out = []
for row in (ROOT / 'editorial/vocab-lab-contexts.tsv').read_text(encoding='utf-8').splitlines():
    if not row or row.startswith('#'):
        continue
    suffix, context, correct, wrong1, wrong2, clue = row.split('|')
    review = reviews[suffix]
    wrong1, wrong2 = review['wrong1'], review['wrong2']
    clue, context = review['clue'] or clue, review['context'] or context
    link = links[suffix]
    answer = len(out) % 3
    options = [wrong1, wrong2]
    options.insert(answer, correct)
    out.append({'id': link['senseId'] + ':context-v2', 'senseId': link['senseId'],
                'sourceId': link['sourceId'], 'context': context,
                'prompt': 'Which interpretation best fits this context?',
                'options': options, 'answer': answer, 'clue': clue,
                'explanation': review['explanation'], 'validation': 'source-sense-aligned-v1',
                'editorialStatus': 'reviewed_pending_teacher', 'editorialRevision': 2,
                'reviewNote': review['note'], 'teacherFlag': review['flag'], 'version': 2})
assert len(out) == 102 and len({x['senseId'] for x in out}) == 102
assert all(len(set(x['options'])) == 3 and x['explanation'] not in x['context'] for x in out)
assert all(x['explanation'] not in x['options'] and len(x['explanation'].split()) >= 10 for x in out)
(ROOT / 'data/vocab-lab-practice.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('102/102 source senses editorially reviewed; 102 revised explanations/distractor pairs; teacher approval pending')
