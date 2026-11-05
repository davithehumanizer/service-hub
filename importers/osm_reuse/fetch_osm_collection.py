# -*- coding: utf-8 -*-
"""Rebuild osm_collection_<country>.json: the recycling centres of a country
that take electrical and electronic devices (PBI 13849).

OpenStreetMap, ODbL, as for the reuse places; this uses fetch_osm_reuse.py's
helpers. "recycling_type=centre" also covers green-waste and rubble sites and
private recycling firms, so a centre is kept when it says it takes electrical
appliances, or when its name is a municipal recycling centre's (Wertstoffhof,
milieustraat, recyparc…). Private ones, and those that say they take no
electrical appliances, are left out.

A kept centre takes every electrical type: the set a French waste centre
taking every ADEME category gets, read from ademe_reuse_mapping.json.

    python fetch_osm_collection.py --country BE|DE|NL
"""
import argparse
import collections
import datetime
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from fetch_osm_reuse import OVERPASS, reverse_address, tag

# Matched without case: "RecyPark", and the frequent "Werkstoffhof".
MUNICIPAL_NAME = {
    "BE": r"recycl(age)?park|recyparc|recypark|containerpark|parc à conteneurs|"
          r"recyclagepunt|recycling(park|centrum)|milieupark",
    "DE": r"wer[kt]?stoff(hof|höfe|sammelstelle|zentrum|center|annahme)|"
          r"recycling(hof|zentrum|center|station|park)|entsorgungs(zentrum|hof|park)|"
          r"abfallwirtschaftszentrum|bringhof|abfallsammelstelle",
    "NL": r"milieu(straat|park|station|plein|punt|perron|depot|brengstation)|"
          r"afval(breng|punt|scheidingsstation|station)|recycle(plein|station|punt)|"
          r"grondstoffen(plein|centrum|station)|gemeentewerf|brengpark",
}
# The name an unnamed centre that takes electrical appliances is shown under.
GENERIC_NAME = {"BE": "Recyclagepark / Recyparc", "DE": "Wertstoffhof", "NL": "Milieustraat"}
EXCLUDED_ACCESS = ("private", "no", "customers", "permit")
ELECTRICAL = ("recycling:electrical_appliances", "recycling:small_appliances")
ADEME_MAPPING = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "..", "repairers_france", "ademe_reuse_mapping.json")


def query(country):
    return """[out:json][timeout:300];
area["ISO3166-1"="%s"][admin_level=2]->.c;
nwr["amenity"="recycling"]["recycling_type"="centre"](area.c);
out center tags;""" % country


def overpass(overpass_query):
    # The public server answers 502 or 504 when it is full.
    wait = 30
    for attempt in range(6):
        request = urllib.request.Request(
            OVERPASS, data=urllib.parse.urlencode({"data": overpass_query}).encode(),
            headers={"User-Agent": "ServiceHub-Importer"})
        try:
            with urllib.request.urlopen(request, timeout=360) as response:
                return json.loads(response.read().decode("utf-8"))["elements"]
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 504) or attempt == 5:
                raise
            time.sleep(wait)
            wait *= 2


def keep(tags, country):
    """Why a centre is kept, or None to leave it out."""
    if tags.get("access") in EXCLUDED_ACCESS:
        return None
    if tags.get("recycling:electrical_appliances") == "no":
        return None
    if any(tags.get(key) == "yes" for key in ELECTRICAL):
        return "electrical tag"
    if re.search(MUNICIPAL_NAME[country], tags.get("name", ""), re.IGNORECASE):
        return "municipal name"
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, choices=sorted(MUNICIPAL_NAME))
    args = parser.parse_args()
    out = "osm_collection_%s.json" % args.country.lower()
    overpass_query = query(args.country)

    with open(ADEME_MAPPING, encoding="utf-8") as handle:
        device_types = sorted({t for types in json.load(handle).values() for t in types})

    rows, kept, dropped = [], collections.Counter(), 0
    for element in overpass(overpass_query):
        tags = element.get("tags", {})
        point = element if "lat" in element else element.get("center")
        reason = keep(tags, args.country)
        if not reason or not point:
            dropped += 1
            continue
        kept[reason] += 1
        street = " ".join(filter(None, (tag(tags, "addr:street", "addr:place"),
                                        tag(tags, "addr:housenumber"))))
        rows.append({
            "osm_id": "%s/%d" % (element["type"], element["id"]),
            "kind": "recycling_centre",
            "name": tag(tags, "name", "operator") or GENERIC_NAME[args.country],
            "street": street,
            "zip": tag(tags, "addr:postcode"),
            "city": tag(tags, "addr:city"),
            "country": args.country,
            "latitude": point["lat"],
            "longitude": point["lon"],
            "phone": tag(tags, "phone", "contact:phone"),
            "website": tag(tags, "website", "contact:website"),
            "device_types": device_types,
        })

    # Two thirds of the centres carry no full address; their position gives one.
    completed = 0
    for row in rows:
        if row["street"] and row["zip"] and row["city"]:
            continue
        try:
            found = reverse_address(row["latitude"], row["longitude"])
        except (urllib.error.URLError, TimeoutError):
            # Thousands of lookups for Germany: one failure must not lose the run.
            continue
        for field in ("street", "zip", "city"):
            row[field] = row[field] or found[field]
        completed += 1

    with open(out, "w", encoding="utf-8") as handle:
        json.dump({"fetched": datetime.date.today().isoformat(),
                   "licence": "ODbL 1.0, © OpenStreetMap contributors",
                   "query": overpass_query, "rows": rows},
                  handle, ensure_ascii=False, indent=1)

    print("%d recycling centres -> %s" % (len(rows), out))
    print("  kept by %s, %d left out" % (dict(kept), dropped))
    print("  %d addresses completed from the position, %d still without a city"
          % (completed, sum(1 for r in rows if not r["city"])))


if __name__ == "__main__":
    main()
