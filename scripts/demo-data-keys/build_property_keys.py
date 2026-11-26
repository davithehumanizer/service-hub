"""Builds frontend/src/data/propertyKeys.json: the keys the variant form
proposes, per canonical category, with Icecat's type, unit, names and values.

Inputs: property_keys.json (property_keys.py, from a prod dump), proposal.json
(propose_keys.py), FeaturesList.xml (Icecat's feature definitions, in
importers/icecat/data). See docs/demo-data-keys.md."""
import json
import sys
import xml.etree.ElementTree as ET

PROPOSAL, KEYS, FEATURES, OUT = sys.argv[1:5]
LANGS = {'1': 'en', '2': 'nl', '3': 'fr', '4': 'de'}

p = json.load(open(PROPOSAL, encoding='utf-8'))
d = json.load(open(KEYS, encoding='utf-8'))

base = [k for k, _ in p['base']]
categories = {}
for r in p['categories']:
    keys = [k for k, _, _ in r['keys']]
    keys = [k for k in keys
            if not (k.endswith('(with stand)')
                    and k.replace('(with stand)', '(without stand)') in keys)]
    if r['category'] == 'Fryer':
        # Litres and grams mixed; "Fryer food capacity" says it.
        keys = [k for k in keys if k != 'Capacity']
    categories[r['category']] = keys
categories['Bread maker'] = [
    'Power', 'Maximum bread weight', 'Number of auto cooking programs',
    'Viewing window', 'Delayed start timer', 'Built-in display',
    'Control type', 'Display type',
]

# Where Icecat has several features of one name, the one the stored values
# are in: per key, then per category where they differ.
CHOSEN = {
    'Weight': '94', 'Width': '1649', 'Height': '1464', 'Depth': '1650',
    'Processor frequency': '5', 'Internal memory': '11381', 'Colour': '46',
    'Maximum resolution': '61', 'Battery capacity': '909',
    'Maximum internal memory': '1452', 'Response time': '1516',
    'Display resolution': '1585', 'Noise level': '1793', 'Standby time': '2101',
    'Rated capacity': '2492', 'Cycle time': '2509', 'Charging time': '4087',
    'Runtime': '3648', 'Maximum input power': '4882', 'RAM capacity': '7861',
    'Annual energy consumption': '8422', 'Internal storage capacity': '8730',
}
OVERRIDES = {
    'Printer': {'Internal memory': '6'},
    'Wrist watch': {'RAM capacity': '7622'},
}
TYPES = {
    'numerical': 'number', 'y_n': 'yesno', 'dropdown': 'choice',
    'multi_dropdown': 'multi',
}

wanted = set(base) | {k for ks in categories.values() for k in ks}
by_name, by_id = {}, {}
for _, el in ET.iterparse(FEATURES, events=('end',)):
    if el.tag != 'Feature':
        continue
    names = {LANGS[n.get('langid')]: (n.text or '').strip()
             for n in el.iter('Name') if n.get('langid') in LANGS}
    if names.get('en') in wanted:
        signs = {}
        measure = el.find('Measure')
        if measure is not None:
            for s in measure.iter('Sign'):
                if s.get('langid') in LANGS and s.text:
                    signs[LANGS[s.get('langid')]] = s.text.strip()
            if not signs.get('en') and measure.get('Sign'):
                signs['en'] = measure.get('Sign')
        feature = {
            'id': el.get('ID'), 'type': el.get('Type'),
            'names': names, 'signs': signs,
            'values': [v.text.strip() for v in el.iter('RestrictedValue')
                       if v.text and v.text.strip()],
        }
        by_name.setdefault(names['en'], []).append(feature)
        by_id[feature['id']] = feature
    el.clear()


def definition(feature):
    names = feature['names']
    out = {
        'type': TYPES.get(feature['type'], 'text'),
        'label': {l: names.get(l) or names['en'] for l in ('en', 'fr', 'nl', 'de')},
    }
    signs = feature['signs']
    if out['type'] == 'number' and signs.get('en'):
        out['unit'] = {l: signs.get(l) or signs['en'] for l in ('en', 'fr', 'nl', 'de')}
    if out['type'] in ('choice', 'multi') and feature['values']:
        out['values'] = sorted(set(feature['values']))
    return out


keys, missing = {}, []
for name in sorted(wanted):
    found = by_name.get(name, [])
    chosen = CHOSEN.get(name)
    feature = by_id.get(chosen) if chosen else (found[0] if len(found) == 1 else None)
    if feature is None:
        missing.append((name, len(found)))
        continue
    keys[name] = definition(feature)

# Dutch names Icecat leaves in English.
for name, nl in {
    'Backlight': 'Achtergrondverlichting',
    'Scroll type': 'Type scrollwiel',
    'Steam boost performance': 'Stoomstootvermogen',
}.items():
    keys[name]['label']['nl'] = nl

# Not in Icecat's list under this name; its values are Y/N.
keys['Egg tray'] = {
    'type': 'yesno',
    'label': {'en': 'Egg tray', 'fr': 'Casier à œufs', 'nl': 'Eierrek',
              'de': 'Eierablage'},
}
missing = [m for m in missing if m[0] != 'Egg tray']

overrides = {
    category: {name: definition(by_id[fid]) for name, fid in per.items()}
    for category, per in OVERRIDES.items()
}

json.dump(
    {'base': base, 'categories': categories, 'overrides': overrides, 'keys': keys},
    open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1,
)
print('keys', len(keys), 'categories', len(categories), 'missing', missing)
types = {}
for k in keys.values():
    types[k['type']] = types.get(k['type'], 0) + 1
print(types)
print('numbers without unit', sorted(n for n, k in keys.items() if k['type'] == 'number' and 'unit' not in k))
print('labels left in English', sum(1 for k in keys.values() for l in ('fr', 'nl', 'de') if k['label'][l] == k['label']['en']))
