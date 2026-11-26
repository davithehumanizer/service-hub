"""Proposed keys per category from property_keys.json: a base for all, then each
well-filled category's own, noise left out."""
import json
import re
import sys

KEYS, CATS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(KEYS, encoding='utf-8'))
fr = {}
for line in open(CATS, encoding='utf-8'):
    cid, name, tr = (line.rstrip('\n').split('\t') + [''])[:3]
    fr[name] = tr or name

# Already fields of the form, or about the box rather than the device.
NOISE = re.compile(
    r'^(BrandPartCode|GTIN|EAN|UPC)$|Package|Pallet|carton|Harmonized|'
    r'Country of origin|Quantity per|Sustainability certificates|'
    r'Market positioning|Compliance|certificat',
    re.I,
)
LABEL = [
    'Processor family', 'Processor model', 'RAM capacity', 'Internal memory',
    'Internal storage capacity', 'Total storage capacity', 'Product colour',
    'Display diagonal', 'Discrete graphics card model',
    'Operating system installed', 'Keyboard language', 'Keyboard layout',
    'SIM card capability',
]
MIN_ENTRIES, SHARE, BASE_IN, MAX_OWN = 1000, 0.5, 0.6, 15

big = {n: v for n, v in d.items() if v['entries'] >= MIN_ENTRIES}
cover = {n: {k: c / v['entries'] for k, c, _ in v['keys']} for n, v in big.items()}
samples = {n: {k: s for k, _, s in v['keys']} for n, v in big.items()}

# The base: keys half the devices of most big categories carry.
candidates = {k for c in cover.values() for k in c}
base = sorted(
    (k for k in candidates if not NOISE.search(k)
     and sum(1 for c in cover.values() if c.get(k, 0) >= SHARE) >= BASE_IN * len(big)),
    key=lambda k: -sum(c.get(k, 0) for c in cover.values()),
)

result, distinct = [], set(base)
for n, v in sorted(big.items(), key=lambda kv: -kv[1]['entries']):
    own = [
        (k, s) for k, s in sorted(cover[n].items(), key=lambda kv: -kv[1])
        if s >= SHARE and k not in base and not NOISE.search(k)
    ][:MAX_OWN]
    # The keys a variant label is made of, wherever this category has them.
    for k in LABEL:
        if cover[n].get(k, 0) >= 0.2 and k not in base and k not in dict(own):
            own.append((k, cover[n][k]))
    distinct.update(k for k, _ in own)
    result.append({
        'category': n, 'fr': fr.get(n, n), 'entries': v['entries'],
        'keys': [[k, round(100 * s), samples[n].get(k, [])[:2]] for k, s in own],
    })

small = sorted(
    ((fr.get(n, n), v['entries']) for n, v in d.items() if 0 < v['entries'] < MIN_ENTRIES),
    key=lambda x: -x[1],
)
json.dump({
    'base': [[k, [round(100 * c.get(k, 0)) for c in cover.values()]] for k in base],
    'categories': result, 'small': small,
    'empty': sum(1 for v in d.values() if v['entries'] == 0),
    'distinct': len(distinct),
}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('base', base)
print('categories', len(result), 'distinct keys', len(distinct))
for r in result:
    print(f"\n{r['fr']} ({r['entries']}):", ', '.join(f'{k} {s}%' for k, s, _ in r['keys']))
print('\nsmall', small)
