"""How often each technical property name appears, per category, in a prod dump.

Streams the tables out of the custom-format dump with pg_restore (run in the
local db container), nothing restored. Output: a JSON file with, per category,
its number of entries, how many have technical properties, and for each
property name the number of entries carrying it and a few sample values.
"""
import json
import subprocess
import sys
from collections import defaultdict

DUMP, OUT = sys.argv[1], sys.argv[2]


def rows(table):
    """The COPY rows of one table, as lists of fields, and its column names."""
    with open(DUMP, 'rb') as dump:
        proc = subprocess.Popen(
            ['docker', 'exec', '-i', 'service-hub-db-1', 'pg_restore',
             '--data-only', '-t', table, '-f', '-'],
            stdin=dump, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        columns = None
        for raw in proc.stdout:
            line = raw.decode('utf-8', 'replace').rstrip('\n')
            if columns is None:
                if line.startswith('COPY '):
                    inside = line[line.index('(') + 1:line.rindex(')')]
                    columns = [c.strip().strip('"') for c in inside.split(',')]
                continue
            if line == '\\.':
                break
            yield columns, line.split('\t')
        proc.stdout.close()
        proc.wait()


categories = {}
for cols, f in rows('device_categories'):
    rec = dict(zip(cols, f))
    categories[int(rec['id'])] = rec['name']
print('categories', len(categories), flush=True)

device_cats = defaultdict(list)
for cols, f in rows('device_category_device_link'):
    rec = dict(zip(cols, f))
    device_cats[int(rec['devicesDeviceId'])].append(int(rec['deviceCategoriesId']))
print('linked devices', len(device_cats), flush=True)

entries = defaultdict(int)
for cats in device_cats.values():
    for c in cats:
        entries[c] += 1

with_props = defaultdict(int)
counts = defaultdict(lambda: defaultdict(int))
samples = defaultdict(dict)
# A device's rows are not contiguous: the names it has are kept as a bitmask,
# names numbered in order of first appearance so common ones stay low.
name_ids, masks, n, dup = {}, {}, 0, 0
for cols, f in rows('device_technical_properties'):
    if len(f) < 4:
        continue
    name, value, device = f[1], f[2], f[3]
    if device == '\\N':
        continue
    device = int(device)
    bit = 1 << name_ids.setdefault(name, len(name_ids))
    mask = masks.get(device, 0)
    if mask & bit:
        dup += 1
        continue
    masks[device] = mask | bit
    if not mask:
        for c in device_cats.get(device, ()):
            with_props[c] += 1
    for c in device_cats.get(device, ()):
        counts[c][name] += 1
        s = samples[c].setdefault(name, [])
        if len(s) < 3 and value not in s and value != '\\N':
            s.append(value[:60])
    n += 1
    if n % 10_000_000 == 0:
        print('rows', n, flush=True)
print('rows', n, 'duplicates', dup, 'names', len(name_ids), flush=True)

result = {}
for c, name in categories.items():
    keys = sorted(counts[c].items(), key=lambda kv: -kv[1])
    result[name] = {
        'id': c,
        'entries': entries[c],
        'with_properties': with_props[c],
        'keys': [[k, v, samples[c].get(k, [])] for k, v in keys[:60]],
    }
with open(OUT, 'w', encoding='utf-8') as out:
    json.dump(result, out, ensure_ascii=False, indent=1)
print('written', OUT, flush=True)
