Run-all-migrations script

Usage (from repo root, PowerShell pwsh):

  ./scripts/run-all-migrations.ps1

What it does:
- Scans `backend/*/package.json` for scripts named `typeorm:migrate`, `migrate`, `seeds` or `seed`.
- For each service found runs inside the running container:
  npm run build && npm run <script>

Notes:
- Requires Docker Compose services to be running (use `docker compose up -d`).
- The script executes the commands using `docker compose exec <service>` — service names must match the `backend` folder names used by compose.
- If one command fails, the script reports which services failed and returns a non-zero exit code.
