# -*- coding: utf-8 -*-
"""Rebuild ademe_collection.json: the waste centres in France that take a used
electrical or electronic device for recycling (PBI 13849).

Same ADEME dataset as fetch_ademe_reuse.py, whose helpers this uses. Kept: a
waste centre (type_dacteur "decheterie") that sorts (trier) at least one
electrical or electronic category and is open to the public. Shops, which take
devices back by law, are left out by decision, as are drop-off containers and
waste centres for professionals only.

    python fetch_ademe_collection.py [--out ademe_collection.json]
"""
import argparse
import collections
import json
import urllib.parse

from fetch_ademe_reuse import DATASET, get, legacy_import_id, values

FIELDS = ("identifiant", "paternite", "nom", "nom_commercial", "site_web",
          "telephone", "adresse", "complement_dadresse", "code_postal", "ville",
          "latitude", "longitude", "trier", "public_accueilli",
          "date_de_derniere_modification")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="ademe_collection.json")
    args = parser.parse_args()

    with open("ademe_reuse_mapping.json", encoding="utf-8") as handle:
        mapping = json.load(handle)

    query = urllib.parse.urlencode({
        "size": 1000,
        "q": " | ".join(mapping),
        "q_fields": "trier",
        "qs": "type_dacteur:decheterie AND NOT _siret_infos.etatAdministratifEtablissement:F",
        "select": ",".join(FIELDS),
        "sort": "identifiant",
    })
    url = "%s/lines?%s" % (DATASET, query)
    updated = get(DATASET).get("dataUpdatedAt", "")[:10]

    rows, dropped = [], collections.Counter()
    while url:
        page = get(url)
        for line in page["results"]:
            eee = values(line.get("trier")) & set(mapping)
            if not eee:
                dropped["no electrical category"] += 1
                continue
            if line.get("public_accueilli") == "Professionnels":
                dropped["professionals only"] += 1
                continue
            if line.get("latitude") is None or line.get("longitude") is None:
                dropped["no coordinates"] += 1
                continue
            address = line.get("adresse") or ""
            if line.get("complement_dadresse"):
                address += ", " + line["complement_dadresse"]
            rows.append({
                "identifiant": line["identifiant"],
                "legacy_import_id": legacy_import_id(line),
                "name": line.get("nom") or line.get("nom_commercial") or "",
                "street": address,
                "zip": line.get("code_postal") or "",
                "city": line.get("ville") or "",
                "country": "FR",
                "latitude": line["latitude"],
                "longitude": line["longitude"],
                "phone": line.get("telephone") or "",
                "website": line.get("site_web") or "",
                "paternite": line.get("paternite") or "",
                "ademe_categories": sorted(eee),
                "device_types": sorted({t for c in eee for t in mapping[c]}),
                "updated": line.get("date_de_derniere_modification") or "",
            })
        url = page.get("next")

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump({"dataset_updated": updated, "rows": rows}, handle,
                  ensure_ascii=False, indent=1)

    every = sum(1 for r in rows if len(r["ademe_categories"]) == len(mapping))
    print("%d waste centres -> %s (dataset updated %s)" % (len(rows), args.out, updated))
    print("  %d take every electrical category" % every)
    if dropped:
        print("  dropped: %s" % dict(dropped))


if __name__ == "__main__":
    main()
