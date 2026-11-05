# -*- coding: utf-8 -*-
"""Post aachen_repairers.json to the Service Hub API.

    python import_awa_repairers.py --dry-run
    python import_awa_repairers.py

Env: API_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET.

`create` on the API is a bare save and `repairer_import_id` carries no unique
constraint, so a second run would duplicate every row. This reads the German
repairers back first and skips the ids already present; the run is safe to
repeat and safe to resume after a failure.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

def env(name, default=None):
    # The server .env files are CRLF; a stray CR corrupts an HTTP header.
    return (os.environ.get(name) or default or "").strip()


API_URL = env("API_URL", "http://localhost:3000").rstrip("/")
CLIENT_ID = env("OAUTH_CLIENT_ID", "repair-importer")
CLIENT_SECRET = env("OAUTH_CLIENT_SECRET")
SOURCE = "AWA Reparaturführer"


def call(path, method="GET", payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        API_URL + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def get_token():
    if not CLIENT_SECRET:
        sys.exit("OAUTH_CLIENT_SECRET is not set; use --dry-run to skip auth.")
    return call("/api/v1/auth/oauth2/token", "POST", {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    })["access_token"]


def existing_import_ids(token):
    """Every German repairer already stored, keyed by import id.

    Uses v2 (v1 returns everything and ignores filters) and passes
    partner_type, which forces the SQL path: a country-only filter is served
    by Elasticsearch, whose index can lag the rows this script just wrote.
    'repairer' also matches 'both' and 'repairer_reuse', 'reuse' matches
    'repairer_reuse', so the three cover every value this file holds.
    """
    seen = set()
    for partner_type in ("repairer", "recycler", "reuse"):
        page = 1
        while True:
            result = call(
                "/api/v2/repairers?country=DE&partner_type=%s&limit=200&page=%d"
                % (partner_type, page), token=token)
            rows = (result or {}).get("data") or []
            seen.update(r["repairer_import_id"] for r in rows
                        if r.get("repairer_import_id"))
            if len(rows) < 200:
                break
            page += 1
    return seen


def payload_for(row):
    return {
        "repairer_import_id": "awa-%s" % row["awa_ids"][0],
        "name": row["name"],
        "description": "",
        "address": row["street"],
        "country": "DE",
        "postal_code": row["zip"],
        "city": row["city"],
        "website": row["website"],
        "email": row["email"],
        "phone": row["phone"],
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "source": SOURCE,
        "partner_type": row["partner_type"],
        "repairerDevices": [{"device_type": t} for t in row["device_types"]],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--file", default="aachen_repairers.json")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as handle:
        rows = json.load(handle)
    if args.limit:
        rows = rows[:args.limit]

    # A dry-run still reads what is stored when credentials allow it, so it
    # reports the same SKIP lines the real run would.
    token = get_token() if (CLIENT_SECRET or not args.dry_run) else None
    already = existing_import_ids(token) if token else set()
    print("%d rows to consider, %d German repairers already stored\n"
          % (len(rows), len(already)))

    created = skipped = failed = 0
    for row in rows:
        body = payload_for(row)
        label = "%-44s %-13s %-8s %2d types" % (
            body["name"][:44], body["city"][:13],
            body["partner_type"], len(body["repairerDevices"]))

        if body["repairer_import_id"] in already:
            print("  SKIP    %s" % label)
            skipped += 1
            continue
        if args.dry_run:
            print("  WOULD   %s" % label)
            created += 1
            continue

        try:
            call("/api/v1/repairers", "POST", body, token)
            print("  CREATED %s" % label)
            created += 1
        except urllib.error.HTTPError as error:
            detail = error.read()[:300].decode("utf-8", "replace")
            print("  FAILED  %s\n          %s %s" % (label, error.code, detail))
            failed += 1

    print("\ncreated %d, skipped %d, failed %d" % (created, skipped, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
