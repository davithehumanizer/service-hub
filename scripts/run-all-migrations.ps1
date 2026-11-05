<#
PowerShell script to detect backend services with migration/seed scripts and run them inside running Docker Compose containers.
Run from repository root in pwsh:
  ./scripts/run-all-migrations.ps1
#>

Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $repoRoot 'backend'

if (-not (Test-Path $backendDir)) {
    Write-Error "Cannot find backend directory at $backendDir"
    exit 2
}

# Services to attempt (by folder name)
$services = Get-ChildItem -Path $backendDir -Directory | ForEach-Object { $_.Name }

$found = @()

foreach ($service in $services) {
    $pkgPath = Join-Path $backendDir $service | Join-Path -ChildPath 'package.json'
    if (-not (Test-Path $pkgPath)) { continue }

    try {
        $pkgJson = Get-Content $pkgPath -Raw | ConvertFrom-Json
    } catch {
        Write-Warning "Failed to parse package.json for $service: $_"
        continue
    }

    $scripts = @{}
    if ($pkgJson.scripts) {
        foreach ($k in $pkgJson.scripts.PSObject.Properties.Name) {
            $scripts[$k] = $pkgJson.scripts.$k
        }
    }

    # Decide which script to run: prefer migrations, then seeds
    $action = $null
    if ($scripts.ContainsKey('typeorm:migrate')) { $action = 'typeorm:migrate' }
    elseif ($scripts.ContainsKey('migrate')) { $action = 'migrate' }
    elseif ($scripts.ContainsKey('seeds')) { $action = 'seeds' }
    elseif ($scripts.ContainsKey('seed')) { $action = 'seed' }

    if ($action) {
        $found += [PSCustomObject]@{ Service = $service; Script = $action }
    }
}

if ($found.Count -eq 0) {
    Write-Host "No backend services with migration/seed scripts were detected."
    exit 0
}

Write-Host "Detected services to run migrations/seeds for:`n" -ForegroundColor Cyan
$found | Format-Table -AutoSize

$errors = @()

foreach ($item in $found) {
    $svc = $item.Service
    $script = $item.Script
    Write-Host "\n---- Running for service: $svc (npm run $script) ----" -ForegroundColor Yellow

    # Use docker compose exec to run inside the running container
    $cmd = "docker compose exec $svc sh -c \"npm run build && npm run $script\""
    Write-Host "Executing: $cmd"

    $p = Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command",$cmd -NoNewWindow -PassThru -Wait -ErrorAction SilentlyContinue
    if ($p.ExitCode -ne 0) {
        Write-Error "Command for $svc failed with exit code $($p.ExitCode)"
        $errors += $svc
    } else {
        Write-Host "$svc: OK" -ForegroundColor Green
    }
}

if ($errors.Count -gt 0) {
    Write-Error "Migrations failed for services: $($errors -join ', ')"
    exit 3
}

Write-Host "All migrations/seeds executed successfully." -ForegroundColor Green
exit 0
