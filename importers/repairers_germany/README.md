Importer Germany — AWA Reparaturführer (Aachen)

Repairers and second-hand shops in and around Aachen, for the E6 demonstration.

Source: the [AWA Reparaturführer](https://reparaturfuehrer.awa-gmbh.de/), the
regional directory of the Entsorgungsregion West — Stadt Aachen, StädteRegion
Aachen, Kreis Düren. AWA is the regional waste-management company.

The site runs the GeoDirectory WordPress plugin, which publishes its listings
as a plain REST collection, so the data is read rather than scraped:

    https://reparaturfuehrer.awa-gmbh.de/wp-json/geodir/v2/reparatur?per_page=100
    https://reparaturfuehrer.awa-gmbh.de/wp-json/geodir/v2/secondhand?per_page=100

Files:
- `fetch_awa.py` — rebuilds the dataset from the API (no key, no dependencies)
- `awa_category_mapping.json` — AWA category → `device_type` slugs
- `aachen_repairers.json` — the result, 33 organisations
- `import_awa_repairers.py` — posts it to the Service Hub API

Regenerate the dataset:

```bash
python fetch_awa.py
```

Import it (`API_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` in the
environment):

```bash
python import_awa_repairers.py --dry-run
python import_awa_repairers.py
```

**The import is only idempotent because this script makes it so.** The API's
`create` is a bare `save()` and `repairer_import_id` has no unique constraint,
so a second run would duplicate all 33 rows. The script reads the German
repairers back first, keys them on `repairer_import_id` (`awa-<awa id>`) and
skips what is already stored — which also makes a failed run safe to resume.
Keep that guard if you change the script.

## What is in the file

| `partner_type` | count |
|---|---|
| `repairer` | 22 |
| `reuse` | 9 |
| `repairer_reuse` | 2 |

Every row carries street, postcode, city, latitude, longitude, phone, email and
website — the source has no gaps in those fields.

`repairer_reuse` is for an organisation listed in *both* AWA directories: it
repairs and it resells. Not `both`, which means repair and collect. The
repairers-service filter answers it under `repairer` and under `reuse` — see
`partnerTypesMatching` in `partner-type-whitelist.ts`.

The first import stored the second-hand shops as `recycler` and the mixed ones
as `both`; migration `ReclassifyAwaSecondHandShops1792156469636` corrects rows
already in a database.

## Mapping

45 AWA categories map onto `DEVICE_TYPE_WHITELIST`. A listing whose categories
map to nothing is dropped — this removed a knife-sharpening service and a
glazier. 21 AWA categories are deliberately unmapped, either because they are
top-level containers (`Haushalt/Wohnen`) or because the whitelist has no
equivalent (`Schmuck`, `Bücher`, `Software`, petrol-driven garden tools).

Run `fetch_awa.py` to print the dropped categories with their counts.

## Caveats

**The directory is smaller than its own counters suggest.** The homepage shows
73 for electrical/electronic repair; that is a recursive sum, counting one
business once per subcategory it belongs to. The real figures are 26 repair,
11 second-hand and 10 rental listings.

**Not exhaustive on repair cafés.** Only one of Aachen's six (the Mobilé) is
listed here. LabAix, Gut Branderhof, Forst, meffi.s and ReparierCafé West are
on `reparieren-in-aachen.de`, without structured coordinates.

**One listing is out of region:** Polster und Stuhlflechterei Karl Schaak sits
in Mönchengladbach (41199), about 60 km away. Kept deliberately — it is real
data — but it will widen a map fitted to its bounds.

**No licence is granted.** AWA's terms of use say entries are publicly
accessible; they say nothing about reuse, copying or republishing, and no open
licence is offered. This is business contact data the businesses themselves
submitted to be found, but republishing the compiled directory is a different
act from consulting it. Ask AWA before this reaches production — they are the
regional waste authority for the demonstration's own territory, which makes
them a natural E6 contact rather than an obstacle.

## Reuse places across Germany

Germany-wide reuse places come from OpenStreetMap, through the importer shared
with the Netherlands: see `importers/osm_reuse/`.
