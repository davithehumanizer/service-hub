# -*- coding: utf-8 -*-
"""Post osm_collection_<country>.json to the Service Hub API, as collection
points.

    python import_osm_collection.py --country BE|DE|NL --dry-run
    python import_osm_collection.py --country BE|DE|NL [--limit N]

Env and pacing as import_osm_reuse.py, whose helpers this uses. Every centre
is created as 'recycler', with "© OpenStreetMap contributors (ODbL)" as its
source. One within 15 m of a collection point already stored from another
source is skipped rather than merged, which the ODbL forbids. The run reads
back what is stored first: it is safe to repeat and to resume.
"""
import argparse
import json
import sys
import time
import urllib.error

from import_osm_reuse import (CLIENT_SECRET, SAME_PLACE_METRES, SOURCE,
                              WRITE_INTERVAL, call, get_token, metres,
                              payload_for, stored_rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, choices=("BE", "DE", "NL"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    with open("osm_collection_%s.json" % args.country.lower(), encoding="utf-8") as handle:
        rows = json.load(handle)["rows"]
    if args.limit:
        rows = rows[:args.limit]

    # A dry-run still reads what is stored when credentials allow it.
    token = get_token() if (CLIENT_SECRET or not args.dry_run) else None
    stored = stored_rows(token, args.country) if token else {}
    others = [r for r in stored.values()
              if r.get("source") != SOURCE and r.get("latitude") is not None
              and r.get("partner_type") in ("recycler", "both")]
    print("%d recycling centres to consider, %d %s rows already stored\n"
          % (len(rows), len(stored), args.country))

    counts = {"created": 0, "skipped": 0, "same place": 0, "failed": 0}
    for row in rows:
        body = {**payload_for(row), "partner_type": "recycler"}
        label = "%-44s %-20s" % (body["name"][:44], body["city"][:20])

        if body["repairer_import_id"] in stored:
            print("  SKIP     %s" % label)
            counts["skipped"] += 1
            continue
        near = next((r for r in others if metres(
            body["latitude"], body["longitude"],
            float(r["latitude"]), float(r["longitude"])) < SAME_PLACE_METRES), None)
        if near:
            print("  SAME     %s = %s" % (label, near["name"][:40]))
            counts["same place"] += 1
            continue

        try:
            if not args.dry_run:
                call("/api/v1/repairers", "POST", body, token)
                time.sleep(WRITE_INTERVAL)
            print("  CREATE   %s" % label)
            counts["created"] += 1
        except urllib.error.HTTPError as error:
            detail = error.read()[:300].decode("utf-8", "replace")
            print("  FAILED   %s\n           %s %s" % (label, error.code, detail))
            counts["failed"] += 1

    print("\n%s%s" % ("[dry run] " if args.dry_run else "",
                      ", ".join("%s %d" % kv for kv in counts.items())))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
