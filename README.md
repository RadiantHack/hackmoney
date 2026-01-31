# OpenPay

API + Next.js webapp monorepo. Auth, customer, and payments via Express API; web UI in Next.js.

**Deploy:** DigitalOcean App Platform — use [.do/app.yaml](.do/app.yaml) or follow [docs/DEPLOY_DIGITALOCEAN.md](docs/DEPLOY_DIGITALOCEAN.md).

---

## Repo structure

```
apps/
  api/        # Express API (auth, customer, payments)
  webapp/     # Next.js app (login, customer dashboard)
packages/
  backend/    # Prisma, Redis, auth (JWT)
  error-handler, logger, ui, config-eslint, config-typescript, jest-presets, redis-lock
```

---

## Tech stack

| Part   | Stack |
|--------|--------|
| API    | Express, Prisma (PostgreSQL), Redis, JWT |
| Webapp | Next.js, React |
| Monorepo | pnpm, Turborepo |

---

## Getting started

1. **Env:** Copy [.env.example](.env.example) to `.env` and set values.
2. **Services:** `pnpm services:up` (Postgres + Redis via Docker).
3. **Run:** `pnpm dev` (API + webapp).

API: `http://localhost:5001` (or `PORT` from `.env`). Webapp: `http://localhost:3000`. Webapp calls API via `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`).

---

## Deploy (DigitalOcean)

Same env var names as local; only values differ. See [docs/DEPLOY_DIGITALOCEAN.md](docs/DEPLOY_DIGITALOCEAN.md) for:

- Create PostgreSQL and Redis (managed)
- Create App, add API + Webapp components (or import `.do/app.yaml`)
- Set env vars (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_API_URL`, etc.). API build: `pnpm install && pnpm db:generate && pnpm --filter api build`. API run: `pnpm db:generate && pnpm --filter api start`.

---

## License

MIT
