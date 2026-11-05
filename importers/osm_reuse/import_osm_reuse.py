# -*- coding: utf-8 -*-
"""Post osm_reuse_<country>.json to the Service Hub API.

    python import_osm_reuse.py --country BE|DE|NL --dry-run
    python import_osm_reuse.py --country BE|DE|NL [--limit N]

Env: API_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET.

Every place is created as 'reuse', with "© OpenStreetMap contributors (ODbL)"
as its source. The ODbL forbids merging these rows into another source's, so
a place at the address of a reuse place already stored for that country (from
the AWA directory, for one) is skipped rather than merged. Another kind of row
at the same address does not count: a Repair Café held in a Kringwinkel is not
the shop.

`create` is a bare save and `repairer_import_id` carries no unique constraint,
so that country's rows are read back first: the run is safe to repeat and to
resume after a failure.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request


def env(name, default=None):
    # The server .env files are CRLF; a stray CR corrupts an HTTP header.
    return (os.environ.get(name) or default or "").strip()


API_URL = env("API_URL", "http://localhost:3000").rstrip("/")
CLIENT_ID = env("OAUTH_CLIENT_ID", "repair-importer")
CLIENT_SECRET = env("OAUTH_CLIENT_SECRET")
SOURCE = "© OpenStreetMap contributors (ODbL)"
PAGE = 500
# The same address. At 40 to 50 m, in a dense street, stood different shops:
# a kringloop next to a phone repairer in The Hague.
SAME_PLACE_METRES = 15
# The gateway allows 300 requests a minute from one address.
WRITE_INTERVAL = 0.25


def call(path, method="GET", payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(payload).encode() if payload is not None else None
    for attempt in range(5):
        request = urllib.request.Request(
            API_URL + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else None
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(int(error.headers.get("Retry-After") or 0) or 15 * (attempt + 1))


def get_token():
    if not CLIENT_SECRET:
        sys.exit("OAUTH_CLIENT_SECRET is not set; use --dry-run to skip auth.")
    return call("/api/v1/auth/oauth2/token", "POST", {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    })["access_token"]


def stored_rows(token, country):
    """The rows already stored for the country, by import id.

    v2, because v1 ignores filters. partner_type forces the SQL path (the
    Elasticsearch index can lag what this script just wrote); 'repairer',
    'recycler' and 'reuse' between them match every type.
    """
    stored = {}
    for partner_type in ("repairer", "recycler", "reuse"):
        page = 1
        while True:
            result = call("/api/v2/repairers?country=%s&partner_type=%s&limit=%d&page=%d"
                          % (country, partner_type, PAGE, page), token=token)
            rows = (result or {}).get("data") or []
            for r in rows:
                stored[r.get("repairer_import_id") or r["repairer_id"]] = r
            if len(rows) < PAGE:
                break
            page += 1
    return stored


def metres(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2)
    return 12742000 * math.asin(math.sqrt(a))


def payload_for(row):
    return {
        "repairer_import_id": "osm-%s" % row["osm_id"].replace("/", "-"),
        "name": row["name"],
        "description": "",
        "address": row["street"],
        "country": row["country"],
        "postal_code": row["zip"],
        "city": row["city"],
        "website": row["website"] or None,
        "phone": row["phone"] or None,
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "source": SOURCE,
        "partner_type": "reuse",
        "repairerDevices": [{"device_type": t} for t in row["device_types"]],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, choices=("BE", "DE", "NL"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    with open("osm_reuse_%s.json" % args.country.lower(), encoding="utf-8") as handle:
        rows = json.load(handle)["rows"]
    if args.limit:
        rows = rows[:args.limit]

    # A dry-run still reads what is stored when credentials allow it, so it
    # reports what the real run would do.
    token = get_token() if (CLIENT_SECRET or not args.dry_run) else None
    stored = stored_rows(token, args.country) if token else {}
    others = [r for r in stored.values()
              if r.get("source") != SOURCE and r.get("latitude") is not None
              and r.get("partner_type") in ("reuse", "repairer_reuse")]
    print("%d places to consider, %d %s rows already stored\n"
          % (len(rows), len(stored), args.country))

    counts = {"created": 0, "skipped": 0, "same place": 0, "failed": 0}
    for row in rows:
        body = payload_for(row)
        label = "%-44s %-18s %-12s" % (body["name"][:44], body["city"][:18], row["kind"])

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
