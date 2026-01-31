# Deploy to DigitalOcean – Step by Step

This guide covers deploying the **LiquidCard** monorepo (API + Next.js webapp) on **DigitalOcean App Platform**. You’ll get HTTPS, auto-deploys from GitHub, and managed PostgreSQL + Redis.

---

## Remote setup: step-by-step overview

| Step | What to do |
|------|------------|
| **0** | [Push your code to GitHub](#step-0-push-your-code-to-github) so DigitalOcean can deploy from `main`. |
| **1** | [Create PostgreSQL and Redis](#part-1-create-database-and-redis-managed) (managed DBs), note connection strings. |
| **2** | [Create an App](#part-2-create-the-app-app-platform) on App Platform and connect your GitHub repo. |
| **3** | [Add API and Webapp components](#part-3-add-components-api--webapp) (build/run commands, HTTP port). |
| **4** | [Set environment variables](#part-4-environment-variables) (same names as `.env.example`; use production values). |
| **5** | [Run database migrations](#part-5-database-migrations) (e.g. in API build command). |
| **6** | [Deploy and test](#part-6-deploy-and-check) (open Live URLs, test login and API). |

---

## Step 0: Push your code to GitHub

Do this first so the remote app can deploy from your repo.

1. **Commit and push** from the project root:
   ```bash
   git add .
   git status   # optional: check what will be committed
   git commit -m "Add Docker, env parity for local/remote, deploy docs"
   git pull --rebase origin main   # if your branch is behind
   git push origin main
   ```
2. **Repo and branch:** Ensure your GitHub repo is the one you’ll connect in DigitalOcean (e.g. `RadiantHack/hackmoney` or your fork), and that the branch is `main` (or the branch you’ll select in the app).
3. **Autodeploy:** When you turn on “Deploy on push” in App Platform, every push to `main` will trigger a new deploy.

---

## Prerequisites

- [DigitalOcean account](https://cloud.digitalocean.com/)
- Repo on GitHub: [RadiantHack/hackmoney](https://github.com/RadiantHack/hackmoney) (or your fork)
- (Optional) [doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/) for CLI

---

## Same environment locally and remotely

We use the **same environment variable names** for local and remote so config stays consistent.

- **Local:** Copy [`.env.example`](../.env.example) to `.env`, run `docker compose up -d` for Postgres/Redis, then `pnpm dev`. API uses `PORT` (default 5001), webapp uses `NEXT_PUBLIC_API_URL=http://localhost:5001`.
- **Remote (DigitalOcean):** Set the same variable names in App Platform; only the **values** change (e.g. `DATABASE_URL` = managed DB connection string, `NEXT_PUBLIC_API_URL` = your API’s live URL).

See [Part 4: Environment variables](#part-4-environment-variables) for the full list; it matches `.env.example`.

---

## Part 1: Create database and Redis (managed)

1. **Log in**  
   Go to [cloud.digitalocean.com](https://cloud.digitalocean.com/) and sign in.

2. **Create a Database cluster**  
   - **Create** → **Databases** → **Create Database Cluster**  
   - **Engine:** PostgreSQL 16  
   - **Plan:** Basic (1 node) or higher  
   - **Region:** Pick one (e.g. NYC / SFO)  
   - **Name:** e.g. `liquidcard-db`  
   - Click **Create Database Cluster**  
   - Wait until status is **Online**.

3. **Trusted sources (who can connect to the DB)**  
   - Open the cluster → **Settings** (or **Trusted Sources**).  
   - Choose how to add trusted sources:

   **Option A – Allow App Platform only (recommended for production)**  
   - Add the **App Platform** trusted source so only your deployed app can connect.  
   - If you see “Allow DigitalOcean Apps” or similar, enable it.

   **Option B – Allow everyone (dev / quick test only)**  
   - Click **Enter specific IP addresses or CIDR notations**.  
   - In **IPv4 address or CIDR notation** enter: **`0.0.0.0/0`**  
   - Description (optional): e.g. `Allow all – dev only`  
   - Click **Add** / **Save**.  
   - **Warning:** Any IP on the internet can try to connect. Use a strong password and only for non-sensitive or temporary setups. For production, prefer Option A or specific IPs.

   **Option C – Your IP only (e.g. for local runs)**  
   - Use **Quick Add** → **My current IP address** to allow only your machine.

4. **Get DB connection details**  
   - Open the cluster → **Connection details**  
   - Note: **Host**, **Port**, **Database**, **User**, **Password**  
   - Connection string format:  
     `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

5. **Create a Redis cluster** (if your app uses Redis)  
   - **Create** → **Databases** → **Create Database Cluster**  
   - **Engine:** Redis 7  
   - **Plan:** Basic (1 node)  
   - **Region:** Same as PostgreSQL  
   - **Name:** e.g. `liquidcard-redis`  
   - Create and wait until **Online**  
   - **Trusted sources:** Same as PostgreSQL — add App Platform or `0.0.0.0/0` if you want to allow all.  
   - **Connection details** → note **Host**, **Port**, **Password** (no user).

---

## Part 2: Create the App (App Platform)

**Important:** Create an **App Platform** app (Apps → Create App), **not** a **Functions** app. This repo is two long-running services (API + webapp), not serverless functions.

1. **New App**  
   - **Create** → **Apps** → **Create App** (do **not** use **Functions**).

2. **Connect GitHub**  
   - Choose **GitHub**  
   - Authorize DigitalOcean if needed  
   - Select **RadiantHack/hackmoney** (or your fork)  
   - **Branch:** `main`  
   - **Autodeploy:** On (deploy on every push to `main`)  
   - Click **Next**

3. **Use the app spec (recommended)**  
   - If DigitalOcean offers **Import app spec** or **Use existing app spec**, use it and point to **`.do/app.yaml`** so you get two services (api + webapp) with run commands. That avoids the error “no default process a command is required”.  
   - Otherwise, **Configure resources** manually as in Part 3. If you end up with one component (e.g. “liquidcard”) with no Run Command, set it as in [Troubleshooting](#troubleshooting) or add two Services and set Build/Run commands for each.

---

## Part 3: Add components (API + Webapp)

### 3.1 API (Express)

1. **Add a component**  
   - **Add Resource** → **Service** (not Static Site).

2. **Source**  
   - **Repository:** RadiantHack/hackmoney  
   - **Branch:** main  
   - **Source Directory:** leave empty (root)

3. **Build**  
   - **Build Command:**  
     ```bash
     pnpm install && pnpm db:generate && pnpm --filter api build
     ```  
     (`pnpm db:generate` runs Prisma generate so `@prisma/client` is ready before the API starts.)  
   - **Output Directory:** leave empty (API has no static output dir).

4. **Run**  
   - **Run Command:**  
     ```bash
     pnpm db:generate && pnpm --filter api start
     ```  
     (Running `pnpm db:generate` at start ensures the Prisma client exists in the run environment; the backend package has `prisma` as a dependency so the CLI is available.)  
   - **HTTP Port:** `3000` (or whatever your API uses, e.g. from `process.env.PORT`).

5. **Environment variables** (see [Environment variables](#environment-variables) below).  
   Add at least:  
   - `DATABASE_URL`  
   - `REDIS_URL` (if you use Redis)  
   - `JWT_SECRET` (or whatever your API expects)

6. **Size**  
   - **Basic** → 512 MB or 1 GB to start.

7. **Save** the component (e.g. name it `api`).

---

### 3.2 Webapp (Next.js)

1. **Add another component**  
   - **Add Resource** → **Service** (for SSR) or **Static Site** only if you’re doing a static export.

2. **Source**  
   - Same repo and branch.  
   - **Source Directory:** empty.

3. **Build**  
   - **Build Command:**  
     ```bash
     pnpm install && pnpm db:generate && pnpm --filter webapp build
     ```  
     (`pnpm db:generate` ensures the Prisma client exists before the webapp’s dependency `@openpay/backend` builds.)  
   - **Output Directory:** leave empty for a normal Next.js app (App Platform runs `next start`).

4. **Run**  
   - **Run Command:**  
     ```bash
     pnpm --filter webapp start
     ```  
   - **HTTP Port:** `3000`.

5. **Environment variables**  
   - Any `NEXT_PUBLIC_*` or server-side vars (e.g. API URL):  
     `NEXT_PUBLIC_API_URL=https://api-xxxx.ondigitalocean.app`

6. **Save** (e.g. name it `webapp`).

---

## Part 4: Environment variables

Use the **same variable names** as in [`.env.example`](../.env.example); only the values differ on DigitalOcean. Set these in **App** → **Settings** → **App-Level Environment Variables** (shared) or per component.

**API** (same vars as local `.env`)

| Variable        | Example / notes |
|-----------------|------------------|
| `DATABASE_URL` | From PostgreSQL connection string (use **Connection string** from DB cluster, with `?sslmode=require`) |
| `REDIS_URL`     | From Redis: `redis://default:PASSWORD@HOST:PORT` |
| `PORT`          | `3000` (or leave unset; platform sets it) |
| `JWT_SECRET`    | Long random string (e.g. `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Long random string (same as local) |
| `NODE_ENV`      | `production` |

**Webapp** (same vars as local `.env`)

| Variable                 | Example / notes |
|--------------------------|-----------------|
| `NEXT_PUBLIC_API_URL`    | Your API’s live URL, e.g. `https://api-xxxx.ondigitalocean.app` |
| `NODE_ENV`               | `production` |

Use the **live URL** of the API component once it’s deployed (e.g. `https://api-xxxx.ondigitalocean.app`).

---

## Part 5: Database migrations

App Platform doesn’t run migrations automatically. Use one of these:

**Option A – Run migrations in API build (recommended)**  
In the **API** component, set **Build Command** to:

```bash
pnpm install && pnpm --filter api build && pnpm db:deploy
```

Use **`db:deploy`** in production (applies existing migrations); `db:migrate` is for dev. Ensure `DATABASE_URL` is available at **build** time (add it as a build-time env var for this component).

**Option B – Run once via one-off job**  
- Add a **Job** component.  
- **Run Command:** `pnpm install && pnpm db:deploy`  
- Trigger: **Run on deploy** or run manually once.  
- Same repo/branch; set `DATABASE_URL` for the job.

**Option C – Run locally against production DB**  
- Set `DATABASE_URL` in `.env` to the production DB URL (keep it secret).  
- Run: `pnpm db:deploy`  
- Never commit the production URL.

---

## Part 6: Deploy and check

1. Click **Next** through the wizard, then **Create Resources** / **Deploy**.
2. Wait for **API** and **Webapp** to show **Running** (green).
3. Open the **Live URL** of each component (e.g. `https://webapp-xxxx.ondigitalocean.app`, `https://api-xxxx.ondigitalocean.app`).
4. Test:  
   - Webapp loads.  
   - Webapp calls API (e.g. login, data) using `NEXT_PUBLIC_API_URL`.

---

## Part 7: Custom domains (optional)

1. **App** → your app → **Settings** → **Domains**.
2. **Add Domain** → enter your domain (e.g. `app.yourdomain.com`, `api.yourdomain.com`).
3. Add the CNAME record DigitalOcean shows at your DNS provider (e.g. `app.yourdomain.com` → `xxxx.ondigitalocean.app`).
4. SSL is provided by DigitalOcean once DNS is correct.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **"failed to launch: determine start command: when there is no default process a command is required"** / **component liquidcard exited with code 190** | You have **one component** (e.g. named "liquidcard") with no **Run Command**. Fix: **(A)** In the Control Panel go to your app → that component → **Settings** → **Commands** and set **Run Command** to `pnpm db:generate && pnpm --filter api start`, **HTTP Port** to `3000`, and **Build Command** to `corepack enable && pnpm install && pnpm db:generate && pnpm --filter api build` (and add env vars). Then **Add Resource** → **Service** for the webapp (see Part 3.2). **(B)** Or use **Edit spec** / **Import app spec** and point to **`.do/app.yaml`** so you get two services (api + webapp) with run commands. The repo now has a root `start` script and **Procfile** so a single-component deploy at least starts the API. |
| **"Cannot find module .../apps/api/dist/index.js"** (or **dist/index.cjs**) | The API wasn’t built before run. Set **Build Command** for that component to: `corepack enable && pnpm install && pnpm db:generate && pnpm --filter api build`. Then redeploy. The run step needs the built `dist/` folder from this build. |
| **"@prisma/client did not initialize yet. Please run \"prisma generate\""** | Run **prisma generate at start**: set **Run Command** to `pnpm db:generate && pnpm --filter api start`. The repo has `prisma` as a runtime dependency in the backend package so the CLI is available. Also keep **Build Command** with `pnpm db:generate` so the client is generated at build; if the run environment is separate, the run command above fixes it. |
| **webapp build fails: Module '"@prisma/client"' has no exported member 'PrismaClient'** | The backend package (built as a dependency of webapp) needs the Prisma client before its DTS build. Set the **webapp** Build Command to include `pnpm db:generate` before the webapp build: `pnpm install && pnpm db:generate && pnpm --filter webapp build`. The backend also has a `prebuild` script that runs `prisma generate`. |
| **"Deployed actions" / "typescript:default" / "runtime type could not be determined"** | You created a **Functions** app (serverless actions). This repo is for **App Platform** (two Node services). In DigitalOcean: **Create** → **Apps** → **Create App** (not Functions). Connect the same repo, then add two **Services** (api + webapp) as in Part 3, or import the app spec from **`.do/app.yaml`**. The repo includes a minimal **`project.yml`** and **`packages/do-stub`** only to satisfy Functions detection; deploy the real app with App Platform. |
| **Unsupported runtime "typescript:default"** | If you’re on App Platform: in app/component **Settings**, set **Runtime** to `nodejs:18` or `nodejs:20` (not TypeScript). Repo has `package.json` engines, `.node-version`, and `nixpacks.toml` for Node 20—then redeploy. |
| Build fails: “pnpm not found” | Use **Build Command**: `corepack enable && pnpm install && ...` or choose a **Node** environment that includes pnpm (or add an install step for pnpm). |
| API can’t connect to DB | Use full DB URL with `?sslmode=require`; ensure DB firewall allows App Platform (see DB cluster **Settings** → **Trusted Sources**; add your App or allow all for testing). |
| Webapp gets 404 for API | Set `NEXT_PUBLIC_API_URL` to the exact API live URL (with `https://`). |
| Port errors | Ensure **HTTP Port** matches what the app listens on (e.g. `process.env.PORT || 3000` in API). |

---

## Cost (rough)

- **App Platform:** Basic API + Basic Webapp ≈ $12–24/month.  
- **PostgreSQL:** Basic 1 node ≈ $15/month.  
- **Redis:** Basic ≈ $15/month.  
- **Total:** ~\$42–54/month; you can start with just App + DB (~\$27) if you don’t need Redis in production yet.

---

## Alternative: Deploy on a Droplet (VPS)

If you prefer a single server:

1. **Create Droplet** – Ubuntu 22.04, Basic, 1 GB RAM or more.
2. **SSH in** – `ssh root@YOUR_DROPLET_IP`
3. **Install Node 18+ and pnpm:**  
   `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -` then `sudo apt install -y nodejs` and `npm install -g pnpm`.
4. **Install PostgreSQL and Redis** on the same Droplet (or use managed DB + Redis as above).
5. **Clone repo:** `git clone https://github.com/RadiantHack/hackmoney.git && cd hackmoney` (or your LiquidCard repo)
6. **Env:** `cp .env.example .env` and fill in `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`.
7. **Build & run:**  
   `pnpm install && pnpm build && pnpm db:migrate`  
   Run API and webapp with **PM2**:  
   `pm2 start "pnpm --filter api start" --name api`  
   `pm2 start "pnpm --filter webapp start" --name webapp`  
   `pm2 save && pm2 startup`
8. **Nginx** as reverse proxy for HTTPS (e.g. Certbot for SSL).

For most teams, **App Platform** is simpler; use a **Droplet** when you need full control or a single cheap VM.
