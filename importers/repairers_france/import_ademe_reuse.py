# -*- coding: utf-8 -*-
"""Post ademe_reuse.json to the Service Hub API.

    python import_ademe_reuse.py --dry-run
    python import_ademe_reuse.py [--limit N]

Env: API_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET.

Each actor ends up on the map once:
- already imported by this script (import id "ademe-<identifiant>"): skipped;
- already stored as a repairer by import_acteurs_france.js (its md5 id):
  takes the type the ADEME data now gives it rather than a second pin on the
  same spot. 'repairer_reuse' when it repairs, 'reuse' when it does not: that
  import kept the sorting points too, all typed 'repairer';
- otherwise created, as 'repairer_reuse' when the ADEME actor also repairs,
  'reuse' when it does not.

`create` is a bare save and `repairer_import_id` carries no unique constraint,
so the French rows already stored are read back first: the run is safe to
repeat and to resume after a failure.

The ADEME `paternite` goes into `source`, which the repairer page shows: the
Licence Ouverte asks for it on every place.
"""
import argparse
import json
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
PAGE = 500
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


def stored_french_rows(token, partner_types=("repairer", "reuse")):
    """The French rows already stored, by import id: {id: (uuid, partner_type)}.

    v2, because v1 ignores filters. partner_type forces the SQL path (the
    Elasticsearch index can lag what this script just wrote), and 'repairer'
    and 'reuse' between them match every type this script reads or writes.
    """
    stored = {}
    for partner_type in partner_types:
        page = 1
        while True:
            result = call("/api/v2/repairers?country=FR&partner_type=%s&limit=%d&page=%d"
                          % (partner_type, PAGE, page), token=token)
            rows = (result or {}).get("data") or []
            for r in rows:
                if r.get("repairer_import_id"):
                    stored[r["repairer_import_id"]] = (r["repairer_id"], r["partner_type"])
            if len(rows) < PAGE:
                break
            page += 1
    return stored


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
        "partner_type": "repairer_reuse" if row["repairs"] else "reuse",
        "repairerDevices": [{"device_type": t} for t in row["device_types"]],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--file", default="ademe_reuse.json")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as handle:
        rows = json.load(handle)["rows"]
    if args.limit:
        rows = rows[:args.limit]

    # A dry-run still reads what is stored when credentials allow it, so it
    # reports what the real run would do.
    token = get_token() if (CLIENT_SECRET or not args.dry_run) else None
    stored = stored_french_rows(token) if token else {}
    print("%d actors to consider, %d French rows already stored\n" % (len(rows), len(stored)))

    counts = {"created": 0, "retyped": 0, "skipped": 0, "failed": 0}
    for row in rows:
        body = payload_for(row)
        label = "%-40s %-16s %-14s" % (body["name"][:40], body["city"][:16], body["partner_type"])
        legacy = stored.get(row["legacy_import_id"])

        if body["repairer_import_id"] in stored or (legacy and legacy[1] == body["partner_type"]):
            print("  SKIP     %s" % label)
            counts["skipped"] += 1
            continue

        try:
            if legacy and legacy[1] == "repairer":
                if not args.dry_run:
                    call("/api/v1/repairers/%s" % legacy[0], "POST",
                         {"partner_type": body["partner_type"]}, token)
                    time.sleep(WRITE_INTERVAL)
                print("  RETYPE   %s" % label)
                counts["retyped"] += 1
            elif legacy:
                # 'both' or 'other': one value cannot also say "resells".
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
