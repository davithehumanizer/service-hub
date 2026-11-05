# -*- coding: utf-8 -*-
"""Rebuild aachen_repairers.json from the AWA Reparaturfuehrer.

The site runs the GeoDirectory WordPress plugin, which exposes its listings as
a public REST collection — no scraping, no key. Two of its three directories
are read: `reparatur` (partner_type 'repairer') and `secondhand` ('reuse').
An organisation present in both becomes 'repairer_reuse'.

Categories are mapped onto DEVICE_TYPE_WHITELIST via awa_category_mapping.json;
a listing whose categories all map to nothing is dropped.

    python fetch_awa.py [--out aachen_repairers.json]
"""
import argparse
import collections
import html
import json
import re
import urllib.request

BASE = "https://reparaturfuehrer.awa-gmbh.de/wp-json/geodir/v2"
SOURCES = (("reparatur", "repairer"), ("secondhand", "reuse"))


def clean(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def fetch(directory):
    url = "%s/%s?per_page=100" % (BASE, directory)
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="aachen_repairers.json")
    args = parser.parse_args()

    with open("awa_category_mapping.json", encoding="utf-8") as handle:
        mapping = json.load(handle)

    merged = collections.OrderedDict()
    unmapped = collections.Counter()

    for directory, partner_type in SOURCES:
        for place in fetch(directory):
            types, matched = set(), []
            for category in place.get("post_category") or []:
                name = category["name"]
                if name in mapping:
                    types.update(mapping[name])
                    matched.append(name)
                else:
                    unmapped[name] += 1
            if not types:
                continue

            street, zip_code = clean(place.get("street")), place.get("zip") or ""
            key = (clean(place["title"]["raw"]).lower(), street.lower(), zip_code)
            if key in merged:
                # Listed as both a repairer and a second-hand shop.
                row = merged[key]
                row["device_types"] = sorted(set(row["device_types"]) | types)
                row["awa_categories"] = sorted(set(row["awa_categories"]) | set(matched))
                row["sources"] = sorted(set(row["sources"]) | {directory})
                row["awa_ids"] = sorted(set(row["awa_ids"]) | {place["id"]})
                row["partner_type"] = "repairer_reuse"
                continue

            merged[key] = {
                "name": clean(place["title"]["raw"]),
                "street": street,
                "zip": zip_code,
                "city": clean(place.get("city")),
                "country": "DE",
                "latitude": place.get("latitude"),
                "longitude": place.get("longitude"),
                "phone": (place.get("telefon") or "").strip(),
                "email": (place.get("email") or "").strip(),
                "website": (place.get("website") or "").strip(),
                "partner_type": partner_type,
                "device_types": sorted(types),
                "awa_categories": sorted(set(matched)),
                "sources": [directory],
                "awa_ids": [place["id"]],
                "url": place["link"],
            }

    rows = list(merged.values())
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(rows, handle, ensure_ascii=False, indent=1)

    counts = collections.Counter(row["partner_type"] for row in rows)
    print("%d organisations -> %s  %s" % (len(rows), args.out, dict(counts)))
    if unmapped:
        print("dropped categories (no whitelist equivalent):")
        for name, count in unmapped.most_common():
            print("  %-45s x%d" % (name, count))


if __name__ == "__main__":
    main()
