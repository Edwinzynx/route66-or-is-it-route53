# Reviewer guide

Live demo: https://edwin-route53-clone.up.railway.app/hosted-zones

Source: https://github.com/Edwinzynx/route66-or-is-it-route53

See the [README](../README.md) for setup, architecture, database schema, API reference, environment variables, deployment, and scope decisions.

## Assignment coverage

| Requirement | Implementation and evidence |
| --- | --- |
| Next.js, TypeScript, FastAPI, SQLite | `frontend/` and `backend/`; Dockerfiles and local Compose setup |
| Mock login, logout, session persistence | HTTP-only cookie, hashed tokens and expiration in SQLite; API session/restart tests |
| Hosted-zone CRUD and search | Create public/private zones, search/filter/sort/page, edit descriptions, guarded deletion |
| DNS-record CRUD and search | All nine required types; relative/apex names, multiple values, validation and ownership checks |
| Persistent storage | SQLite foreign keys, indexes, uniqueness constraints, transactions and Railway `/data` volume |
| Route 53 experience | AWS-reference navigation, tables, forms, breadcrumbs, preferences, dialogs, notifications and responsive layout |
| Mocked sections | Dashboard, Traffic Policies, Health Checks, Resolver and Profiles display Coming Soon |
| Optional bonuses | BIND import with preview; JSON/BIND export; dark mode; keyboard shortcuts; bulk deletion and TTL editing |
| Required documentation and demo | README setup/architecture/schema/API sections and the hosted link above |

## Suggested walkthrough

1. Sign in with a unique mock alias such as `reviewer-yourname` to keep your test data separate. No password or AWS account is needed. Use the same alias when returning.
2. Create a public zone such as `review.example`. Its simulated NS and SOA records appear immediately. Edit its description from the zone details page.
3. Create `www`, type A, value `192.0.2.10`, TTL `300`. Edit the value to `192.0.2.20`, search for it, and filter by A.
4. Refresh, sign out, then sign in with the same alias. The zone and record should still be present. To verify process-level persistence locally, stop and restart FastAPI using the same `DATABASE_PATH`; refresh again. Browser refresh alone does not prove disk persistence.
5. Try an invalid IPv4 value or the quoted TXT value `"bad\999"`. Saving must show an error and leave the stored records unchanged. Valid quoted TXT escapes must remain exportable.
6. Open table preferences using the gear. Choose a page size and Cancel; it should stay unchanged. Repeat and Confirm to apply it.
7. Exercise the bonuses using the sample below, then select the imported custom records and update their TTL together. Export JSON and BIND, and inspect the downloaded contents.
8. Toggle dark mode and open the `?` shortcut guide. Check a narrow browser window and the collapsible sidebar.
9. Delete only your test records. Default NS/SOA records are read-only; attempting to delete a zone with custom records is blocked. Once custom records are removed, delete your test zone and sign out.

### BIND import sample

Create `review.example`, open **Import records**, and paste this text. Preview should resolve names within that zone and list three record sets. Save the import once; repeating it must report conflicts without partial writes.

```bind
$ORIGIN review.example.
$TTL 300
api IN A 192.0.2.30
mail IN MX 10 mailhost.review.example.
notes IN TXT "assignment import test"
```

The `www` record created above does not conflict with this sample. Exports can be checked without configuring a real domain; this application never publishes DNS changes.

## Verification and limits

- The release check on 9 October 2026 passed 58 backend tests plus frontend TypeScript, ESLint and production build checks. The CI workflow repeats those checks on Linux.
- API tests cover ownership, persistent sessions/data, all nine record types, search/filter/pagination, atomic import and bulk operations, and the TXT/export and oversized-pagination regressions. Test databases are isolated from application data.
- UI interactions and responsive layout were checked manually in Chrome. There is no automated browser interaction suite.
- The UI follows AWS's published signed-in console screenshots. AWS console versions and account preferences vary; a universal pixel-exact match is not claimed.
- Authentication and VPC association are mocked. Zone names/types are immutable; descriptions are editable. Default delegation records are protected. Only simple routing is supported.
- SQLite runs on one backend replica with a persistent volume. Schema creation is automatic; a versioned migration system is not included.
- Railway availability depends on the hosting account's plan and credits. Deployment instructions and backup considerations are in the README.
