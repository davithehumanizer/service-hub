param(
    [string]$Container = 'db',
    [string]$Database = 'servicehub',
    [string]$User = 'postgres'
)

<#
This script finds serial/identity sequences for tables in the given database and aligns each sequence
with the current MAX(value) of its associated column by issuing setval(seq, max_value).

Run from repo root (PowerShell):
  .\scripts\fix-sequences.ps1

Optional parameters:
  -Container <name>   Docker compose service name for Postgres (default: db)
  -Database <name>    Database name (default: servicehub)
  -User <user>        DB user (default: postgres)

The script uses `docker compose exec -T $Container psql ...` so docker-compose must be available.
#>

Write-Host "Fixing sequences in database '$Database' using container '$Container' as user '$User'"

# Query to list sequences attached to serial/identity columns
$seqQuery = @"
SELECT
  n.nspname AS schema,
  t.relname AS table_name,
  a.attname AS column_name,
  pg_get_serial_sequence(format('%s.%s', n.nspname, t.relname), a.attname) AS sequence_name
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0
WHERE pg_get_serial_sequence(format('%s.%s', n.nspname, t.relname), a.attname) IS NOT NULL
AND t.relkind = 'r'
ORDER BY n.nspname, t.relname;
"@

# Get the sequences
$psqlCmd = "psql -U $User -d $Database -t -c `"$seqQuery`""
$fullCmd = "docker compose exec -T $Container sh -c $($psqlCmd -replace '"','\"')"

# Execute and parse results
$raw = & docker compose exec -T $Container sh -c $psqlCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to list sequences: $raw"
    exit 1
}

$lines = $raw -split "\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

if ($lines.Count -eq 0) {
    Write-Host "No serial/identity sequences found."
    exit 0
}

foreach ($line in $lines) {
    # The psql -t output columns are separated by | by default
    $parts = $line -split '\|' | ForEach-Object { $_.Trim() }
    if ($parts.Count -lt 4) { continue }
    $schema = $parts[0]
    $table = $parts[1]
    $column = $parts[2]
    $sequence = $parts[3]

    Write-Host "Processing $schema.$table.$column -> $sequence"

    $getMax = "SELECT COALESCE(MAX(\"$column\"),0) FROM \"$schema\".\"$table\";"
    $setVal = "SELECT setval('$sequence', (SELECT COALESCE(MAX(\"$column\"),0) FROM \"$schema\".\"$table\"));"

    $cmdGetMax = "docker compose exec -T $Container psql -U $User -d $Database -t -c \"$getMax\""
    $cmdSetVal = "docker compose exec -T $Container psql -U $User -d $Database -t -c \"$setVal\""

    # Run setval (we'll capture output but proceed even if a single one fails)
    Write-Host "Running: $cmdSetVal"
    $out = & docker compose exec -T $Container psql -U $User -d $Database -t -c "$setVal" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to run setval for $sequence: $out"
    } else {
        Write-Host "Result: $out"
    }
}

Write-Host "Sequence alignment complete."
