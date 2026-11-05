# -*- coding: utf-8 -*-
"""Post ademe_collection.json to the Service Hub API, as collection points.

    python import_ademe_collection.py --dry-run
    python import_ademe_collection.py [--limit N]

Env and pacing as import_ademe_reuse.py, whose helpers this uses. Each waste
centre ends up on the map once, as 'recycler':
- already imported (import id "ademe-<identifiant>"): skipped;
- stored as a repairer by import_acteurs_france.js, which kept the sorting
  points too: retyped 'recycler' rather than a second pin on the same spot;
- stored under another type: skipped, and said;
- otherwise created.

The ADEME `paternite` goes into `source`, as for the reuse places.
"""
import argparse
import json
import sys
import time
import urllib.error

from import_ademe_reuse import (CLIENT_SECRET, WRITE_INTERVAL, call, get_token,
                                stored_french_rows)


def payload_for(row):
    return {
        "repairer_import_id": "ademe-%s" % row["identifiant"],
        "name": row["name"],
        "description": "",
        "address": row["street"],
        "country": "FR",
        "postal_code": row["zip"],
        "city": row["city"],
        "website": row["website"] or None,
        "phone": row["phone"] or None,
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "source": row["paternite"],
        "partner_type": "recycler",
        "repairerDevices": [{"device_type": t} for t in row["device_types"]],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--file", default="ademe_collection.json")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as handle:
        rows = json.load(handle)["rows"]
    if args.limit:
        rows = rows[:args.limit]

    # A dry-run still reads what is stored when credentials allow it.
    token = get_token() if (CLIENT_SECRET or not args.dry_run) else None
    stored = (stored_french_rows(token, ("repairer", "recycler", "reuse"))
              if token else {})
    print("%d waste centres to consider, %d French rows already stored\n"
          % (len(rows), len(stored)))

    counts = {"created": 0, "retyped": 0, "skipped": 0, "failed": 0}
    for row in rows:
        body = payload_for(row)
        label = "%-44s %-20s" % (body["name"][:44], body["city"][:20])
        legacy = stored.get(row["legacy_import_id"])

        if body["repairer_import_id"] in stored or (legacy and legacy[1] == "recycler"):
            print("  SKIP     %s" % label)
            counts["skipped"] += 1
            continue

        try:
            if legacy and legacy[1] == "repairer":
                if not args.dry_run:
                    call("/api/v1/repairers/%s" % legacy[0], "POST",
                         {"partner_type": "recycler"}, token)
                    time.sleep(WRITE_INTERVAL)
                print("  RETYPE   %s" % label)
                counts["retyped"] += 1
            elif legacy:
                print("  SKIP     %s (stored as %s)" % (label, legacy[1]))
                counts["skipped"] += 1
            else:
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
