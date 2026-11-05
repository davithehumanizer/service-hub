Importer: reuse places and recycling centres from OpenStreetMap (PBI 13851, 13849)

None of Belgium, Germany and the Netherlands has an open national directory
of reuse actors. OpenStreetMap is the only open source covering them, under
the ODbL. France has one, from ADEME: see `importers/repairers_france/`.
In Belgium, De Kringwinkel (HERW!N) and Ressources publish their own maps
under no licence; OSM already holds 128 of the ~142 Kringwinkels, but few of
the Walloon ressourceries.

- `fetch_osm_reuse.py --country BE|DE|NL` queries Overpass and writes
  `osm_reuse_<country>.json`. Two kinds of place are kept: electronics,
  computer, phone, hi-fi and appliance shops tagged as selling second hand,
  and second-hand or charity shops whose name marks a social department store
  (Sozialkaufhaus, Diakonie, AWO in Germany; kringloopwinkels and their chains,
  Terre des Hommes in the Netherlands; De Kringwinkel and its local brands,
  ressourceries, Oxfam in Belgium). Pawnbrokers, buy-and-sell chains (Troc,
  Cash Converters, Cash Express) and the other second-hand shops are left out
  by decision, as are Oxfam's fair-trade Wereldwinkels, which sell no second
  hand. Shops without address tags get one from
  their position through Nominatim, at one request a second.
- `osm_reuse_mapping.json` gives the device types by kind of shop: OSM almost
  never says whether a shop takes electronics (6 of ~2,450 in Germany, none
  in the Netherlands), so the kind stands for it. The name match is the loose
  part: it also catches a toy exchange or a clothes store. Overpass matches a
  name case-sensitively; "RataPlan" was missed until written `[Rr]ata[Pp]lan`.
- `import_osm_reuse.py --country BE|DE|NL` creates them as `reuse`, source
  "© OpenStreetMap contributors (ODbL)". A place at the address (within 15 m)
  of a reuse place already stored for that country is skipped: the ODbL
  forbids merging them into another source's rows. At 40 to 50 m stood
  different shops. Another kind of row at the same address does not count: in
  Belgium it is often a Repair Café or a repair workshop held in the
  Kringwinkel, and skipping the shop took it out of "give away or sell".

```bash
python fetch_osm_reuse.py --country NL
python import_osm_reuse.py --country NL --dry-run
python import_osm_reuse.py --country NL
```

`API_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` in the environment. The
client needs `repairer.get_all` and `repairer.create`.

October 2026:

| Country | Places | Social department stores | Trade shops | Same address as a stored reuse place |
|---|---|---|---|---|
| BE | 286 | 279 | 7 | 0 |
| DE | 576 | 480 | 96 | 1 (AWA) |
| NL | 641 | 629 | 12 | 0 |

**ODbL.** The `osm_reuse_<country>.json` files are committed on purpose: they
are the extract our database holds, which the licence asks us to provide,
under the same licence, to whoever asks. Refresh them with the import, not
separately.

## Recycling centres (PBI 13849)

The municipal recycling centres that take electrical and electronic devices,
for the map's "Collection points". France's come from ADEME: see
`importers/repairers_france/`.

- `fetch_osm_collection.py --country BE|DE|NL` writes
  `osm_collection_<country>.json`. `recycling_type=centre` also covers
  green-waste and rubble sites and private recycling firms (Germany alone has
  ~1,000 green-waste sites among its 5,118 centres), so a centre is kept when
  it says it takes electrical appliances, or when its name is a municipal
  recycling centre's: Wertstoffhof, Recyclinghof, milieustraat, milieupark,
  recyclagepark, recyparc, containerpark… Matched without case ("RecyPark")
  and with the frequent "Werkstoffhof". Private ones, and those that say
  they take no electrical appliances, are left out. Every kept centre takes
  the 43 electrical types a French waste centre taking every ADEME category
  gets, so it shows whatever device the visitor has. Overpass is retried when
  full (502, 504); addresses are completed through Nominatim as for the
  reuse places, which takes about 35 minutes for Germany.
- `import_osm_collection.py --country BE|DE|NL` creates them as `recycler`,
  same source. One within 15 m of a collection point stored from another
  source is skipped.

```bash
python fetch_osm_collection.py --country BE
python import_osm_collection.py --country BE --dry-run
python import_osm_collection.py --country BE
```

October 2026:

| Country | Centres | By municipal name | By electrical tag | Left out |
|---|---|---|---|---|
| BE | 420 | 336 | 84 | 217 |
| DE | 2,342 | 1,676 | 666 | 2,776 |
| NL | 250 | 176 | 74 | 481 |

The `osm_collection_<country>.json` files are committed for the same ODbL
reason.
