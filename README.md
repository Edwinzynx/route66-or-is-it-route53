# AWS Route 53 Clone

Next.js + TypeScript, FastAPI, and SQLite. Built for the Scaler fullstack assignment.

[Live demo](https://edwin-route53-clone.up.railway.app/hosted-zones) — sign in with `demo` or another mock account alias. No password or AWS account is required.

## Setup instructions

Requires Node.js 24 and Python 3.12. Run each service in a separate terminal from the repository root.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux, replace `.venv\Scripts\python` with `.venv/bin/python`.

### Frontend

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Use the same alias when returning to access your saved zones. The database is created automatically at `backend/data/route53.db`.

### Configuration

| Variable | Service | Default | Purpose |
| --- | --- | --- | --- |
| `API_URL` | Frontend | `http://127.0.0.1:8000` | Backend origin; rebuild the frontend after changing it |
| `DATABASE_PATH` | Backend | `backend/data/route53.db` | SQLite file location |
| `COOKIE_SECURE` | Backend | `false` | Set to `true` when hosted over HTTPS |
| `PORT` | Containers | Frontend: `3000`; backend: `8000` | Listening port |

Next.js loads frontend variables from `.env.local`. Set backend variables in your shell or hosting service; FastAPI does not load `.env.example` automatically.

Alternatively, run `docker compose up --build` from the repository root. SQLite uses the `route53-data` volume. `docker compose down` preserves it; `down -v` deletes it.

The Railway deployment uses separate `/frontend` and `/backend` services. Backend runs one replica with `DATABASE_PATH=/data/route53.db` on a persistent `/data` volume. Frontend builds with `API_URL=http://backend.railway.internal:8000` and exposes port 3000. Both services wait for CI before deploying.

### Checks

```powershell
cd backend
.venv\Scripts\python -m pytest -q
cd ../frontend
npm run check
npm run build
```

GitHub Actions runs these checks on every push and pull request. Browser interaction checks are manual.

## Architecture overview

```text
Browser → Next.js → /api/* proxy → FastAPI → SQLite
```

| Directory | Responsibility |
| --- | --- |
| `frontend/src/app/` | Routes, layouts, styles, and error pages |
| `frontend/src/components/` | Auth, navigation, zone/record forms and tables, dialogs |
| `frontend/src/lib/` | Typed API client, resource fetching, shared types |
| `backend/app/` | API routers, validation, authentication, database access, BIND import/export |
| `backend/tests/` | API and persistence tests |

FastAPI validates requests and scopes resource access to the signed-in alias. SQLite uses parameterized queries, foreign keys, WAL mode, and transactions. Bulk operations and imports either complete entirely or roll back.

Authentication is mocked with a seven-day HTTP-only session cookie. The app stores DNS configurations but does not publish DNS changes. Dashboard, Traffic Policies, Health Checks, Resolver, and Profiles are placeholders. BIND import, JSON/BIND export, bulk actions, dark mode, and keyboard shortcuts are implemented.

## Database schema

| Table | Columns | Constraints |
| --- | --- | --- |
| `sessions` | `token_hash`, `username`, `expires_at` | SHA-256 token hash primary key; expiration checked per request |
| `hosted_zones` | `id`, `owner`, `name`, `description`, `type`, `created_at` | `id` primary key; unique `(owner, name, type)`; type is Public or Private |
| `records` | `id`, `zone_id`, `name`, `type`, `ttl`, `values_json`, `system` | `id` primary key; zone foreign key with cascade delete; unique `(zone_id, name, type)`; TTL 0–2147483647 |

Each record row represents a record set, with values stored as a JSON array. `system` marks default NS/SOA records. Indexes cover `hosted_zones.owner` and `records.zone_id`. The schema is created on startup in `backend/app/db.py`.

## API overview

Interactive API documentation: http://127.0.0.1:8000/docs. Zone and record endpoints require the `route53_session` cookie.

| Method | Path | Action |
| --- | --- | --- |
| GET | `/api/health` | Check service and database readiness |
| POST | `/api/auth/login` | Sign in with `{ "username": "demo" }` |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/logout` | Revoke session |
| GET / POST | `/api/zones` | List / create zones |
| GET / PATCH / DELETE | `/api/zones/{zoneId}` | Read / edit description / delete zone |
| GET / POST | `/api/zones/{zoneId}/records` | List / create record sets |
| GET / PUT / DELETE | `/api/zones/{zoneId}/records/{recordId}` | Read / replace / delete record set |
| POST | `/api/zones/{zoneId}/records/bulk` | Delete selected records or update their TTL |
| GET | `/api/zones/{zoneId}/export?format=json` | Export JSON; use `format=bind` for BIND |
| POST | `/api/zones/{zoneId}/import` | Preview or save a BIND import |

Create zone:

```json
{ "name": "example.com", "description": "Application DNS", "type": "Public" }
```

Create record:

```json
{ "name": "www", "type": "A", "ttl": 300, "values": ["192.0.2.1"] }
```

Supported types: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, and CAA. Names may be relative, fully qualified within the zone, or apex (`@` or empty). Zone names/types cannot be edited. Default NS/SOA records are read-only; remove custom records before deleting a zone.

List queries accept `search`, `type`, `page`, `page_size`, `sort`, and `order`. Responses contain `{ items, total, page, page_size }`. Page size is 1–100; page number is 1–1,000,000. Zone sort fields are `name`, `type`, `record_count`, and `created_at`; record sort fields are `name`, `type`, and `ttl`.

Bulk requests use `{ "operation": "ttl", "ids": ["record-id"], "ttl": 600 }`, or `operation: "delete"` without TTL. Imports use `{ "content": "BIND text", "preview": true }`; set `preview` to `false` to save. Import conflicts reject the whole operation; default apex NS/SOA entries are skipped.

Errors return `detail`: 401 for authentication, 404 for missing/inaccessible resources, 409 for conflicts, and 422 for invalid input.
