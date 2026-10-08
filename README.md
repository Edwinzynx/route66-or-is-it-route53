# AWS Route 53 Clone

A Route 53 console recreation for the Scaler fullstack assignment. Built with **Next.js + TypeScript**, **FastAPI**, and **SQLite**. Hosted zones, DNS records, and login sessions persist across restarts. The application does not register domains or answer DNS queries.

**Repository:** https://github.com/Edwinzynx/route66-or-is-it-route53

**Hosted demo:** https://edwin-route53-clone.up.railway.app — sign in with `demo` or your own mock account alias.

## Features

- Mock login/logout with HTTP-only session cookies and a seven-day SQLite-backed session.
- Hosted-zone create, list, search, filter, sort, edit description, and delete.
- DNS-record create, list, search by name/value, filter, sort, edit, and delete.
- All nine required record types: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, and CAA.
- Server-side pagination, validation, actionable errors, loading states, empty states, confirmation dialogs, and success notifications.
- AWS-style console navigation, forms, tables, zone details, and responsive sidebar.
- Coming Soon pages for Dashboard, Traffic Policies, Health Checks, Resolver, and Profiles.
- BIND zone-file import with a validated preview and atomic persistence; JSON and BIND exports.
- Select multiple records for atomic bulk deletion or TTL updates.
- Persistent light/dark mode and keyboard shortcuts with a help dialog and opt-out.

## Run locally

Use Node.js 24 and Python 3.12. Run the backend and frontend in separate terminals.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux use `.venv/bin/python` instead. The database is created automatically at `backend/data/route53.db`. API documentation is at http://127.0.0.1:8000/docs.

### Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Sign in with `demo`, or any account alias of at least two characters. Return with the same alias to see the same saved zones. No password or AWS credentials are required. Because authentication is deliberately mocked, anyone who knows an alias can use that alias; this is a demonstration application, not production account security.

The frontend forwards `/api/*` requests to FastAPI on port 8000. The browser uses one origin, so no CORS setup or browser-exposed backend URL is needed.

### Environment variables

| Service | Variable | Default | Purpose |
| --- | --- | --- | --- |
| Frontend | `API_URL` | `http://127.0.0.1:8000` | Backend origin; set before `next build`, then rebuild when it changes |
| Backend | `DATABASE_PATH` | `backend/data/route53.db` | SQLite file path; point this at a persistent volume when hosted |
| Backend | `COOKIE_SECURE` | `false` | Set to `true` when served through HTTPS |
| Containers | `PORT` | 3000 frontend, 8000 backend | Listening port |

Frontend `.env.local` is loaded by Next.js. Backend variables must be exported in the shell or set by the host; copying `.env.example` alone does not load them.

### Docker alternative

```sh
docker compose up --build
```

Open http://localhost:3000. SQLite is stored in the `route53-data` named volume. `docker compose down` preserves it. Do not use `down -v` unless you intend to erase the demo data.

## Architecture

```text
Browser
  -> Next.js App Router and modular React components
  -> same-origin /api/* rewrite
  -> FastAPI routers and Pydantic validation
  -> SQLite transactions, foreign keys, WAL mode
```

```text
frontend/src/
  app/                 Routes, error boundaries, and shared styles
  components/zones/    Hosted-zone list, create, details, and dialogs
  components/records/  Record list, form, editor, and delete confirmation
  components/          Auth, navigation, notifications, and shared UI
  lib/                 Typed API client, resource hook, and shared types
backend/
  app/auth.py          Mock authentication and session lifecycle
  app/db.py            Schema and transactional connection management
  app/schemas.py       Hosted-zone request validation
  app/zones.py         Owned hosted-zone CRUD and listing
  app/dns_validation.py Type-specific DNS validation
  app/records.py       Owned DNS-record CRUD and listing
  app/bulk_records.py  Atomic selected-record deletion and TTL updates
  app/zone_files.py    BIND parsing and export serialization
  app/transfers.py     Owned import preview/commit and file downloads
  app/main.py          Application startup and health endpoint
  tests/               API, persistence, ownership, and validation tests
```

The backend is the authority for validation and persistence. Frontend forms never substitute in-memory data for API writes. SQL values use bound parameters. Sort columns/directions are validated against literal allowlists. Resource access is scoped to the signed-in alias. SQLite transactions prevent partial writes; record conflict checks run inside an immediate transaction.

## Database schema

| Table | Columns | Constraints |
| --- | --- | --- |
| `sessions` | `token_hash`, `username`, `expires_at` | SHA-256 token hash primary key; expiration checked per request |
| `hosted_zones` | `id`, `owner`, `name`, `description`, `type`, `created_at` | Unique owner/name/type; public/private type constraint |
| `records` | `id`, `zone_id`, `name`, `type`, `ttl`, `values_json`, `system` | Foreign key to zone with cascade delete; unique zone/name/type; bounded TTL |

Indexes support zone ownership and record lookup. A DNS record represents a record set; multiple values are stored as a JSON array in one row. No external database or ORM is required.

## API overview

All resource endpoints require the `route53_session` cookie. FastAPI serves interactive OpenAPI documentation at `/docs` on the backend.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Service/database readiness |
| POST | `/api/auth/login` | Sign in with `{ "username": "demo" }` |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/logout` | Revoke session and clear cookie |
| GET / POST | `/api/zones` | List / create zones |
| GET / PATCH / DELETE | `/api/zones/{zoneId}` | Read / edit description / delete zone |
| GET / POST | `/api/zones/{zoneId}/records` | List / create record sets |
| GET / PUT / DELETE | `/api/zones/{zoneId}/records/{recordId}` | Read / replace / delete a record set |
| POST | `/api/zones/{zoneId}/records/bulk` | Atomic `{ "operation": "delete" or "ttl", "ids": [...], "ttl": 300 }`; omit TTL for deletion |
| GET | `/api/zones/{zoneId}/export?format=json` | Download full zone metadata and records as JSON; `format=bind` downloads a BIND zone file |
| POST | `/api/zones/{zoneId}/import` | `{ "content": "BIND text", "preview": true }` validates without saving; `preview: false` commits the whole import |

List endpoints accept `search`, `type`, `page`, `page_size`, `sort`, and `order`. Results have `{ items, total, page, page_size }`. Zone sorting supports `name`, `type`, `record_count`, and `created_at`; record sorting supports `name`, `type`, and `ttl`. Page size is bounded to 1–100. Errors use FastAPI's `detail` response: 401 for session failures, 404 for missing/inaccessible resources, 409 for conflicts, and 422 for invalid input.

Example zone body:

```json
{ "name": "example.com", "description": "Application DNS", "type": "Public" }
```

Example record body:

```json
{ "name": "www", "type": "A", "ttl": 300, "values": ["192.0.2.1"] }
```

Record names may be relative (`www`), apex (`@` or empty), or fully qualified within the zone. A trailing-dot name outside the zone is rejected. CNAME apex and coexistence conflicts are rejected, as are duplicate record sets, invalid IPs, malformed MX/SRV/CAA/TXT values, and invalid TTLs.

## Deliberate scope decisions

- Zone names/types are immutable after creation; descriptions are editable.
- Public and private zones persist. VPC association is mocked, as allowed by the assignment.
- Each zone starts with persistent NS and SOA records. The `.invalid` nameservers are visibly simulated and must never be used to configure a real domain.
- Default NS/SOA records are read-only in this clone and are removed with the zone. Custom NS records support full CRUD.
- A zone with custom records cannot be deleted until those records are removed.
- Simple routing is implemented. AWS resource aliases, advanced routing, actual DNS propagation, IAM, and billing are not implemented.
- Names support ASCII/punycode DNS labels. Records also support underscores and a leading wildcard where appropriate.

## Optional bonuses

Open a hosted zone and choose **Import records** to upload a UTF-8 BIND zone file or paste its contents. Preview the resolved names, values, and TTLs, then confirm the import. Existing record sets are never overwritten; any conflict or invalid record rejects the entire import. Preview is revalidated when saving. Apex NS/SOA entries are explicitly reported as skipped so the destination keeps its default simulated delegation.

The parser supports the nine assignment record types, `$ORIGIN`, `$TTL` (including time units), comments, inherited names, relative targets, quoted text, and multiline records. Files are limited to 1 MB, 1,000 imported record sets, and 10,000 input record values; the existing 100-values-per-set limit still applies. External `$INCLUDE` files and `$GENERATE` are rejected. Unsupported types and out-of-zone owners are rejected rather than silently discarded. `dnspython` is the only added runtime dependency and performs parsing without network or file access. BIND TTLs within a record set are normalized to their minimum by the parser.

**Export JSON** includes zone metadata and every persisted record. **Export BIND** includes all records with absolute names and targets. A BIND export can be reimported into an empty zone with the same name; its default NS/SOA records are preserved as described above. JSON export is for inspection/backups; JSON import is not part of the assignment bonus.

Record checkboxes support selecting individual records or all editable records on the current page. **Edit TTL** updates the entire selection; **Delete selected** opens a confirmation dialog listing every affected record. Default records are excluded. Selection is reset when search, filters, sort, or pagination changes. The API validates ownership and all selected IDs before changing anything (maximum 100 IDs per batch).

Use the theme button in the header or sign-in page to switch light/dark mode. The preference is saved in browser storage and synchronized across tabs. The **?** button opens the keyboard guide:

| Shortcut | Action |
| --- | --- |
| `/` | Focus the zone or record search |
| `N` | Create a zone from the zone list, or a record from zone details |
| `?` | Open shortcut help |
| `Esc` | Dismiss a dialog when no save is in progress |

Single-key shortcuts can be disabled in the help dialog. They are ignored while typing, during IME composition, with Ctrl/Alt/Meta modifiers, and inside dialogs. Creation shortcuts do not navigate away from open forms. No shortcut performs deletion or submits data.

## Verification

The console's visual references are AWS's [2025 hosted-zone and quick-create screenshots (figures 16–18)](https://aws.amazon.com/blogs/storage/mastering-cross-account-amazon-efs-seamlessly-mount-amazon-efs-on-amazon-eks-cluster/) and [Route 53 navigation screenshots](https://aws.amazon.com/blogs/aws/unify-dns-management-using-amazon-route-53-profiles-with-multiple-vpcs-and-aws-accounts/). The interface uses the compact console header, collapsible navigation, orange primary actions, table toolbars, and quick-create layout. Global search navigates the pages included in this assignment; the account menu contains sign-out. Unsupported AWS services and settings are not simulated as working controls.

Open Sans weights 400/700 are served locally from `frontend/public/fonts`, with licenses and notices from Cloudscape global-styles 1.0.71. `python frontend/scripts/vendor-fonts.py` reproduces these assets; it is not needed during builds and adds no runtime dependency. Public references vary by console version; this is a close visual reproduction of the assignment screens, not a claim of a pixel-exact match to every AWS account setting.

```powershell
cd backend
python -m pytest -q
cd ../frontend
npm run check
npm run build
```

The API suite covers all nine record types, invalid values, duplicate/CNAME conflicts, ownership isolation, protected defaults, search/filter/pagination, login/logout, and persistence across application restarts. Bonus tests cover BIND parsing/preview/round trips, rejected directives and out-of-zone records, atomic import rollback, downloads, bulk TTL/deletion, and bulk ownership/rollback. GitHub Actions runs the backend suite and frontend TypeScript/lint/build checks on pushes and pull requests.

Manual acceptance flow: sign in, create a zone, create/edit/search/delete a record, refresh the browser, sign out/in, edit the zone description, delete the zone after removing custom records, and confirm empty/loading/error states. Check both desktop and narrow-screen layouts.

Known tooling limitation: the installed Next.js ESLint configuration currently pulls a development-only `braces` advisory through `fast-glob`/`micromatch`. The registry currently provides no patched compatible `braces` release. This chain is not part of the standalone application runtime; do not use a forced framework downgrade to silence the audit.

## Railway deployment

Deploy both services from this GitHub repository in one Railway project. Railway's monorepo guide: https://docs.railway.com/deployments/monorepo. Persistent volume guide: https://docs.railway.com/volumes/reference.

1. Create an **empty service** named **backend**, configure root directory `/backend`, then connect this repository. Review all settings before deploying to avoid an automatic build at the repository root. Railway detects the Dockerfile, which installs and runs FastAPI. Set the health-check path to `/api/health` in service Settings.
2. Attach a persistent volume at **`/data`** to backend. Set `DATABASE_PATH=/data/route53.db`, `COOKIE_SECURE=true`, and `PORT=8000`. Keep a single backend replica for this local SQLite deployment.
3. Create another **empty service** named **frontend**, configure root directory `/frontend`, then connect this repository. Set its health-check path to `/hosted-zones` in service Settings.
4. Set frontend `API_URL=http://backend.railway.internal:8000` **before building**, and `PORT=3000`. The Dockerfile accepts `API_URL` as a build argument because Next.js serializes rewrites at build time. If Railway assigns a different private domain, use that domain and rebuild.
5. Generate an HTTPS public domain for frontend targeting port 3000. Backend can remain private; browsers reach it through the frontend's `/api` proxy.
6. Enable **Wait for CI** on both services and set watch paths to `/backend/**` and `/frontend/**` respectively. Run local checks and wait for GitHub Actions to pass before deploying source changes. Inspect failure logs before retrying a deployment.
7. Verify login, zone/record CRUD, and persistence after restarting the backend.

The hosted demo passed HTTPS API checks for all nine record types (create/read/update/delete), zone creation and description updates, record search, invalid-input rejection, deletion guards, and secure HTTP-only session cookies. An existing session, hosted zone, and DNS record survived a confirmed Railway backend restart; record/zone deletion and logout also passed afterward. Both Docker images built successfully on Railway. Hosting currently uses Railway trial credits; continued availability depends on the account's remaining credits and plan.

Configure both services with the On Failure restart policy and three restart attempts. These instructions use Railway's current service settings: new services can no longer opt into the deprecated `railway.toml` Config as Code mechanism. Back up the SQLite file using SQLite's online backup API when needed; copying only the database file while WAL writes are active is not a reliable backup. A redeploy must keep the same backend volume.

Authentication is intentionally mocked for evaluation. Do not store secrets or private production DNS configurations in the hosted demo.
