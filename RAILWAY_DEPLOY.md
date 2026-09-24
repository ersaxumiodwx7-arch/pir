# Persistent Database on Railway (deploy-safe)

## Why data vanished on every redeploy

The server stored everything in a local SQLite file (`server/formflow.db`).
Railway rebuilds the container on each deploy and **wipes the container
filesystem**, so every client, admin account, transaction, and notification
was destroyed on each push. It also explains the "wrong password" errors on
another device: the account simply no longer existed in the fresh database.

## The fix

The server now runs on **PostgreSQL** (Railway's managed database). The data
lives in a separate service whose storage is **not** touched by redeploys, so
clients and admins persist forever. All SQLite-only SQL is auto-translated at
runtime (`server/src/database/dialect.js`), so no other code changes are
needed per-database.

## Railway setup (one time)

1. In your Railway project, click **+ New → Database → PostgreSQL**.
2. Open the new Postgres service → **Variables** tab → copy the value of
   `DATABASE_URL` (looks like `postgresql://postgres:...@...railway...`).
3. Open your **app service** → **Variables** tab and add:

   | Variable        | Value                                        |
   |-----------------|----------------------------------------------|
   | `DATABASE_URL`  | (paste the Postgres URL from step 2)         |
   | `JWT_SECRET`    | any long random string (or leave as-is)      |
   | `NODE_ENV`      | `production`                                 |

4. Redeploy the app service. On startup the server creates all tables
   automatically (same migrations as before, translated to Postgres).

## One-time data import (keep your existing clients/admins)

If your current data still exists in the SQLite file on your machine
(`server/formflow.db`), import it into Postgres **once**, from the `server`
folder:

```bash
DATABASE_URL="postgres://...railway..." node src/database/migrate-sqlite-to-pg.js
```

The script copies every table row-by-row (preserving IDs and password
hashes), then re-syncs ID sequences. It is safe to re-run — already-copied
rows are skipped.

> If `server/formflow.db` no longer holds your data (it was already wiped on
> Railway), skip this step — accounts will simply start fresh on Postgres.
> Recreate the admin(s) and clients from the admin panel; from now on they
> will survive every deploy.

## Verify persistence

1. Create a test client in the admin panel.
2. Trigger a redeploy (or push a commit).
3. After the deploy finishes, log in as that client — the account must still
   exist. All future data now persists across redeploys.

## Notes

- `DATABASE_URL` starting with `postgres`/`postgresql` enables Postgres mode;
  anything else (or unset) falls back to local SQLite for local development.
- Railway internal DB URLs (`...railway.internal...`) skip TLS automatically;
  public URLs use TLS. Override with `PGSSL_REQUIRE=1` or `PGSSL_DISABLE=1`.
- Uploaded documents/images are still stored on the app container's disk
  (`/uploads`) and **will** be lost on redeploy. If that matters, move to a
  volume or blob storage later.
