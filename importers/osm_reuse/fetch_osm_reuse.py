# -*- coding: utf-8 -*-
"""Rebuild osm_reuse_<country>.json: the places in a country that take a used
electrical or electronic device to sell it on (PBI 13851).

None of Belgium, Germany and the Netherlands has an open national directory
of reuse actors; OpenStreetMap is the only open source covering them (ODbL). It
rarely says whether a second-hand shop takes electronics, so the device types
come from the kind of shop, through osm_reuse_mapping.json:

- an electronics, computer, phone, hi-fi or appliance shop tagged as selling
  second hand: the types of its trade;
- a second-hand or charity shop whose name marks a social department store
  (a Sozialkaufhaus, a kringloopwinkel, a Kringwinkel, a charity's shop):
  small household appliances, lamps and hi-fi.

Pawnbrokers, buy-and-sell chains and the other second-hand or charity shops
(clothes, books, antiques) are left out by decision.

The file is the extract our database holds: the ODbL asks for it to be
available, under the same licence, to whoever asks.

    python fetch_osm_reuse.py --country BE|DE|NL
"""
import argparse
import collections
import datetime
import json
import time
import urllib.parse
import urllib.request

OVERPASS = "https://overpass-api.de/api/interpreter"
NOMINATIM = "https://nominatim.openstreetmap.org/reverse"
TRADES = ("electronics", "computer", "mobile_phone", "hifi", "appliance")
# The names that mark a social department store, by country. Overpass
# matches them case-sensitively.
SOCIAL_STORE_NAME = {
    # De Kringwinkel, whose shops often go by their local brand (Reset,
    # Cirkels, Opnieuw & Co), ressourceries and charities' shops.
    "BE": "[Kk]ringwinkel|[Kk]ringloo[pd]|[Rr]essourcerie|[Rr]ecyclerie|Petits Riens|"
          "Spullenhulp|Oxfam|Emma[uü]s|Croix[- ][Rr]ouge|Opnieuw ?(&|en) ?[Cc]o|Cirkels|"
          "Reset",
    "DE": "[Kk]aufhaus|[Gg]ebrauchtwaren|[Ss]ozial|[Kk]reisel|[Rr]e-?[Uu]se|Fairkauf|"
          "Diakonie|Caritas|Oxfam|DRK|Rotes Kreuz|Arbeiterwohlfahrt|AWO|Brockenhaus|"
          "[Ww]arenhaus|[Mm]öbelbörse|[Mm]öbellager|Recycling",
    # Kringloopwinkels and their chains, and the charities' own shops.
    "NL": "[Kk]ringloo[pd]|[Rr]ata[Pp]lan|Dorcas|Het Goed|Used [Pp]roducts|Emma[uü]s|"
          "[Ww]eg[Gg]eef|Estafette|Leger des Heils|[Ww]arenhuis|[Rr]uilwinkel|[Ss]nuffel|"
          "Woord (en|&) [Dd]aad|Terre [Dd]es [Hh]ommes|Schroeder|2Switch|Opnieuw & Co|"
          "[Hh]ergebruik",
}

# Left out wherever they match: Oxfam's fair-trade shops sell no second hand,
# and the buy-and-sell chains are out by decision.
EXCLUDED_NAME = {
    "BE": "[Ww]ereldwinkel|Troc|[Cc]ash",
}


def query(country):
    excluded = ('["name"!~"%s"]' % EXCLUDED_NAME[country]) if country in EXCLUDED_NAME else ""
    return """[out:json][timeout:300];
area["ISO3166-1"="%s"][admin_level=2]->.c;
(
  nwr["shop"~"^(%s)$"]["second_hand"~"^(yes|only)$"]%s(area.c);
  nwr["shop"~"^(second_hand|charity)$"]["name"~"%s"]%s(area.c);
);
out center tags;""" % (country, "|".join(TRADES), excluded, SOCIAL_STORE_NAME[country], excluded)


def tag(tags, *keys):
    for key in keys:
        if tags.get(key):
            return tags[key].strip()
    return ""


def reverse_address(lat, lon):
    # Nominatim's usage policy: one request a second, an identified client.
    time.sleep(1.1)
    url = "%s?%s" % (NOMINATIM, urllib.parse.urlencode(
        {"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 18, "addressdetails": 1}))
    request = urllib.request.Request(url, headers={"User-Agent": "ServiceHub-Importer"})
    with urllib.request.urlopen(request, timeout=60) as response:
        address = json.loads(response.read().decode("utf-8")).get("address", {})
    return {
        "street": " ".join(filter(None, (address.get("road"), address.get("house_number")))),
        "zip": address.get("postcode", ""),
        "city": next((address[k] for k in ("city", "town", "village", "municipality")
                      if address.get(k)), ""),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, choices=sorted(SOCIAL_STORE_NAME))
    args = parser.parse_args()
    out = "osm_reuse_%s.json" % args.country.lower()
    overpass_query = query(args.country)

    with open("osm_reuse_mapping.json", encoding="utf-8") as handle:
        mapping = json.load(handle)

    request = urllib.request.Request(
        OVERPASS, data=urllib.parse.urlencode({"data": overpass_query}).encode(),
        headers={"User-Agent": "ServiceHub-Importer"})
    with urllib.request.urlopen(request, timeout=360) as response:
        elements = json.loads(response.read().decode("utf-8"))["elements"]

    rows, dropped = [], collections.Counter()
    for element in elements:
        tags = element.get("tags", {})
        point = element if "lat" in element else element.get("center")
        if not tags.get("name"):
            dropped["no name"] += 1
            continue
        if not point:
            dropped["no coordinates"] += 1
            continue
        kind = tags["shop"] if tags.get("shop") in TRADES else "social_store"
        street = " ".join(filter(None, (tag(tags, "addr:street", "addr:place"),
                                        tag(tags, "addr:housenumber"))))
        rows.append({
            "osm_id": "%s/%d" % (element["type"], element["id"]),
            "kind": kind,
            "name": tags["name"].strip(),
            "street": street,
            "zip": tag(tags, "addr:postcode"),
            "city": tag(tags, "addr:city"),
            "country": args.country,
            "latitude": point["lat"],
            "longitude": point["lon"],
            "phone": tag(tags, "phone", "contact:phone"),
            "website": tag(tags, "website", "contact:website"),
            "device_types": mapping[kind],
        })

    # A third of the shops carry no address tags; their position gives one.
    completed = 0
    for row in rows:
        if row["street"] and row["zip"] and row["city"]:
            continue
        found = reverse_address(row["latitude"], row["longitude"])
        for field in ("street", "zip", "city"):
            row[field] = row[field] or found[field]
        completed += 1

    with open(out, "w", encoding="utf-8") as handle:
        json.dump({"fetched": datetime.date.today().isoformat(),
                   "licence": "ODbL 1.0, © OpenStreetMap contributors",
                   "query": overpass_query, "rows": rows},
                  handle, ensure_ascii=False, indent=1)

    print("%d places -> %s" % (len(rows), out))
    print("  by kind: %s" % dict(collections.Counter(r["kind"] for r in rows)))
    print("  %d addresses completed from the position, %d still without a city"
          % (completed, sum(1 for r in rows if not r["city"])))
    if dropped:
        print("  dropped: %s" % dict(dropped))


if __name__ == "__main__":
    main()
