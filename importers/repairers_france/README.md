Importer France — `acteurs-full.csv`

But: this importer reads the `acteurs-full.csv` file placed in the same folder and posts repairers / tri centers to the API.

Files:
- `import_acteurs_france.js` — main importer script (Node.js)
- `category_mapping_fr.json` — mapping from CSV product keys to app `device_type` values
- `unmapped_products_fr.json` — generated after a run, lists unmapped product tokens and counts

Usage examples (PowerShell):

Dry-run (recommended first):
```pwsh
cd importers/repairers_france
# place acteurs-full.csv in this folder (or symlink)
node import_acteurs_france.js --dry-run
```

Limited test run:
```pwsh
node import_acteurs_france.js --limit 10 --dry-run
```

Real run (ensure `.env` contains API_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET):
```pwsh
node import_acteurs_france.js
```

Options:
- `--dry-run` : do not call API, only print what would be created
- `--limit N` : only process first N matching rows (useful for testing)
- `--no-geocode` : skip Nominatim calls and rely on lat/lon present in CSV

Notes:
- The script attempts to detect CSV delimiter (`,` vs `;`).
- It prefers `propositions_de_services` JSON field to extract product categories; fallback uses common product columns.
- The importer logs unmapped product tokens to `unmapped_products_fr.json` for manual review and mapping updates.
- Nominatim usage is rate‑limited (~1 request per second); for large imports consider pre-geocoding or using a paid geocoding service.

If you want, I can now run a local dry-run (limit 5) and show the first outputs, or commit these files for you.

## Reuse actors (PBI 13851)

The places that take a used electrical or electronic device to give or sell it
on, for the wizard's "Give away or sell" option. Same ADEME dataset, read
through its API rather than the CSV:

- `fetch_ademe_reuse.py`: writes `ademe_reuse.json` (not committed, it changes
  weekly). Keeps actors that give, resell or exchange at least one electrical
  or electronic category; drops drop-off containers, waste centres, online-only
  actors and closed establishments.
- `ademe_reuse_mapping.json`: ADEME category → `DEVICE_TYPE_WHITELIST` types.
  One category gives several types: the wizard matches the device type
  strictly for reuse, so "smartphone_tablette_et_console" must answer a tablet
  as well as a phone.
- `import_ademe_reuse.py`: posts them, idempotent. An actor already stored as
  a repairer by `import_acteurs_france.js` is retyped instead of getting a
  second pin: `repairer_reuse` if it repairs, `reuse` if it does not. That
  import kept the sorting points too, typed `repairer`; in the October 2026
  data, 535 of the 1,279 found again do not repair.

```bash
python fetch_ademe_reuse.py
python import_ademe_reuse.py --dry-run
python import_ademe_reuse.py
```

`API_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` in the environment. The
client needs `repairer.get_all`, `repairer.create` and `repairer.update`.

**Licence Ouverte 2.0.** Each place must carry its `paternite`: it goes into
`source`, shown on the repairer page. The dataset's own name, its update date
and a link to quefairedemesdechets.ademe.fr must also appear.

## Collection points (PBI 13849)

The waste centres that take a used electrical or electronic device for
recycling, for the map's "Collection points". Same dataset, same helpers:

- `fetch_ademe_collection.py`: writes `ademe_collection.json` (not
  committed). Keeps waste centres (`type_dacteur` "decheterie") that sort at
  least one electrical or electronic category and are open to the public.
  Shops, which take devices back by law, are left out by decision, as are
  drop-off containers.
- `import_ademe_collection.py`: posts them as `recycler`, idempotent. A waste
  centre already stored as a repairer by `import_acteurs_france.js`, which
  kept the sorting points too, is retyped `recycler` instead of getting a
  second pin.

```bash
python fetch_ademe_collection.py
python import_ademe_collection.py --dry-run
python import_ademe_collection.py
```

October 2026: 4,349 waste centres, 2,793 of them taking every category.
Against the local database, 1,450 were already stored as repairers.
