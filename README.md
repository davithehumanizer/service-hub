# Service Hub

The Service Hub is the platform behind [care2repair.eu](https://care2repair.eu).
It helps people keep their electrical and electronic devices in use: identify a
device, work out what is wrong with it, find a repairer, a spare part or a
repair guide, and record whether the repair worked.

It was built in the E6 project, co-funded by the Interreg North-West Europe
programme.

## What is in this repository

- `backend/`: 13 NestJS services and one Python service
  (`device-identification`), sharing one PostgreSQL database. The API gateway
  (`backend/api-gateway`) is the only service the browser talks to. Public
  routes live under `/api/v1/...`, and the API reference is served by Scalar at
  `/api/scalar`.
- `frontend/`: the single-page application (React, TypeScript, Tailwind CSS).
- `importers/`: scripts that load repairers, collection points and catalogue
  data through the API.
- `docs/`: the operations runbook (`docs/OPERATIONS.md`), the migration
  reference (`docs/migrations.md`) and integration guides.

## Running it locally

```bash
cp env.example .env
docker compose up --build
```

See `docs/OPERATIONS.md`, section "Local development".

Third-party datasets (repairers, Icecat, OpenStreetMap extracts) are not in the
repository. `docs/data-sources.md` says where each one comes from and where the
code expects it.

## Licence

Copyright (C) 2025-2026 DAVI The Humanizers.

The Service Hub, backend and frontend, is free software: you can redistribute
it and/or modify it under the terms of the GNU Affero General Public License,
version 3 only (`AGPL-3.0-only`), as published by the Free Software Foundation.
It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See [LICENSE](LICENSE) for the full text.

If you run a modified version as a network service, section 13 of the licence
requires you to offer its users the corresponding source code. The sidebar
links to it: point `REACT_APP_SOURCE_URL` in `frontend/.env` at your own source
before building.

### Not covered by the licence

- **The Care2Repair name and logo, and the care2repair.eu domain.** A fork
  must use its own name, logo and domain.
- **The Retorik information agent.** It is a separate service operated by DAVI
  on retorik.ai. The frontend reaches it through the `@davi-ai/retorik-framework`
  npm package, which is published under the MIT licence, and only shows it when
  `REACT_APP_RETORIK_TENANT` (and, if the tenant needs one,
  `REACT_APP_RETORIK_PREFIX`) is set in `frontend/.env` at build time.

### Third-party code

- `frontend/` started from [Windmill Dashboard React](https://github.com/estevanmaito/windmill-dashboard-react),
  Copyright (c) 2020 Estevan Maito, under the MIT licence, kept in
  [frontend/LICENSE-windmill-dashboard](frontend/LICENSE-windmill-dashboard).
- `frontend/windmill-react-ui-master/` is Windmill React UI, under the MIT
  licence in its own `LICENSE` file.
- Dependencies keep their own licences.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
