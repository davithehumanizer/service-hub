# Data sources

The repository holds the code that loads data, never the third-party datasets
themselves: their terms are not ours to grant, and some of them hold contact
details. For each file the code expects, this page gives where it comes from and
where to put it. Every path below is gitignored.

| File | Read by | Source | How to get it |
|---|---|---|---|
| `backend/repairers-service/src/data/repairers.csv` | Migration `1764200000000-AddRepairerPartnerType`, to backfill `partner_type`. It skips with a warning when the file is absent. | Repair Connects export (Belgium), with contact details | The same export as `locations_repairconnects.csv` |
| `backend/repairers-service/src/data/repairers_demo.csv` | The repairers import route (`RepairerImporterService.importCsv`), which fails without it | Extract of the Repair Connects export | From the export |
| `backend/repairers-service/src/data/repairers_journee_nationales_reparation_2025.json` | Nothing in use: only a disabled `.old` migration | Journées nationales de la réparation 2025 | Not needed |
| `importers/repairers_belgium/locations_repairconnects.csv` | `import_repairers.js`, `csv_to_json.js`, `analyze_device_types.js` | Repair Connects | From Repair Connects, under its terms |
| `importers/repairers_france/acteurs-full.csv` | `import_acteurs_france.js` | ADEME | See `importers/repairers_france/README.md` |
| `importers/repairers_france/imported_sirens.json` | `import_acteurs_france.js`, which writes it to skip what it already imported | The state of one installation | Created by the first run |
| `importers/repairers_denhaag/Den haag - Reparatiekaart data.csv` | `import_repairers.js` | The Hague's Reparatiekaart | From the municipality |
| `importers/repairers_germany/aachen_repairers.json` | `import_awa_repairers.py` | AWA Reparaturführer | `python fetch_awa.py` |
| `importers/osm_reuse/osm_reuse_<cc>.json`, `osm_collection_<cc>.json` | `import_osm_reuse.py`, `import_osm_collection.py` | OpenStreetMap, under the ODbL | `python fetch_osm_reuse.py --country BE` (or `DE`, `NL`), and the same with `fetch_osm_collection.py` |
| `importers/icecat/data/features.json` | The Icecat import (`run_all_chunks.sh`, `backend/devices-service/scripts/run_import_backend.sh`) | Open Icecat `FeaturesList.xml` | `node xml_to_json.js --input data/FeaturesList.xml --output data/features.json` |
| `importers/icecat/data/categories_output*.json` | `scripts/generate_mapping.js`, `scripts/check_selected_mappings.js` | Open Icecat `CategoriesList.xml` | `scripts/extract_categories.ps1` |
| `importers/icecat/<product id>.json`, `importers/icecat/tests/test.csv` | Nothing | Open Icecat samples | Not needed |

The Icecat XML and index files were already kept out of the repository: see
`importers/icecat/README.md`.

The mappings next to these files (`*mapping*.json`, `backend_categories.json`,
`selected_ids.json`) are ours and stay in the repository.

**A working copy that moves from a commit that tracked these files to one that
does not loses them.** `git checkout` or `git reset --hard` deletes a file that
the old commit tracked and the new one does not, even if it is now ignored. On a
server that needs them, copy them aside before the move and put them back
after.
