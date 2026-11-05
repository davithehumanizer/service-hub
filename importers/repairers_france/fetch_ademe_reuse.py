# -*- coding: utf-8 -*-
"""Rebuild ademe_reuse.json: the places in France that take a used electrical
or electronic device to give or sell it on (PBI 13851).

Source: the ADEME dataset "Que faire de mes objets et déchets" (formerly
"Longue vie aux objets"), Licence Ouverte 2.0, updated weekly. Read through its
public data-fair API, no key:

    https://data.ademe.fr/datasets/longue-vie-aux-objets-acteurs-de-leconomie-circulaire

Kept: an actor that gives (donner), resells (revendre) or exchanges (echanger)
at least one electrical or electronic category, open to the public at a fixed
address. Dropped: drop-off containers, waste centres, online-only actors and
closed establishments. Categories map onto DEVICE_TYPE_WHITELIST through
ademe_reuse_mapping.json.

    python fetch_ademe_reuse.py [--out ademe_reuse.json]
"""
import argparse
import collections
import hashlib
import json
import urllib.parse
import urllib.request

DATASET = ("https://data.ademe.fr/data-fair/api/v1/datasets/"
           "longue-vie-aux-objets-acteurs-de-leconomie-circulaire")
ACTIONS = ("donner", "revendre", "echanger")
EXCLUDED_TYPES = ("pav_public", "pav_prive", "pav_ponctuel", "decheterie",
                  "plateforme_inertes", "acteur_digital")
FIELDS = ("identifiant", "paternite", "nom", "nom_commercial", "type_dacteur",
          "site_web", "telephone", "adresse", "complement_dadresse",
          "code_postal", "ville", "latitude", "longitude", "reparer",
          "date_de_derniere_modification",
          "_siret_infos.etatAdministratifEtablissement") + ACTIONS


def get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "ServiceHub-Importer"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def values(field):
    return {v.strip() for v in (field or "").split("|") if v.strip()}


def legacy_import_id(row):
    # The id import_acteurs_france.js gave the repairers it created, so an
    # actor already stored as a repairer can be found again.
    address = (row.get("adresse") or "") + (
        ", " + row["complement_dadresse"] if row.get("complement_dadresse") else "")
    return hashlib.md5(((row.get("nom") or "") + address).encode("utf-8")).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="ademe_reuse.json")
    args = parser.parse_args()

    with open("ademe_reuse_mapping.json", encoding="utf-8") as handle:
        mapping = json.load(handle)

    # The action columns are searchable as text only, not filterable on an
    # exact value; the categories are checked again below.
    query = urllib.parse.urlencode({
        "size": 1000,
        "q": " | ".join(mapping),
        "q_fields": ",".join(ACTIONS),
        "qs": "NOT type_dacteur:(%s) AND NOT _siret_infos.etatAdministratifEtablissement:F"
              % " OR ".join(EXCLUDED_TYPES),
        "select": ",".join(FIELDS),
        "sort": "identifiant",
    })
    url = "%s/lines?%s" % (DATASET, query)
    updated = get(DATASET).get("dataUpdatedAt", "")[:10]

    rows, dropped = [], collections.Counter()
    while url:
        page = get(url)
        for line in page["results"]:
            eee = set().union(*(values(line.get(a)) for a in ACTIONS)) & set(mapping)
            if not eee:
                dropped["no electrical category"] += 1
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
                "actions": [a for a in ACTIONS if values(line.get(a)) & eee],
                "repairs": bool(values(line.get("reparer"))),
                "ademe_categories": sorted(eee),
                "device_types": sorted({t for c in eee for t in mapping[c]}),
                "updated": line.get("date_de_derniere_modification") or "",
            })
        url = page.get("next")

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump({"dataset_updated": updated, "rows": rows}, handle,
                  ensure_ascii=False, indent=1)

    repairs = sum(1 for r in rows if r["repairs"])
    print("%d actors -> %s (dataset updated %s)" % (len(rows), args.out, updated))
    print("  %d also repair, %d only give, sell or exchange" % (repairs, len(rows) - repairs))
    print("  by action: %s" % dict(collections.Counter(a for r in rows for a in r["actions"])))
    if dropped:
        print("  dropped: %s" % dict(dropped))


if __name__ == "__main__":
    main()
