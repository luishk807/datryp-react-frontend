# AGENTS.md — daTryp workspace

Purpose: concise agent instructions and quick links so AI assistants can be productive immediately.

1) Quick context
- Frontend: Vite + React + TypeScript. See [CLAUDE.md](CLAUDE.md) for component and styling conventions.
- Backend: Python FastAPI (workspace folder `datryp-python.backend`). See `datryp-python.backend/README.md` and `pyproject.toml`.

2) Remote-focused notes (what "remote" means here)
- Remote dev modes used by this project:
  - Docker / `docker-compose.yml` in `datryp-python.backend` for local reproduction of services.
  - Remote DB / cloud-hosted Postgres used in CI or deployed environments. Credentials belong in the gitignored `datryp-python.backend/secrets/` folder and in `.env` — never commit them.
  - SSH tunnels or port-forwarding may be required to reach private services when working from a remote host.

3) Useful commands (run from repository root unless noted)
- Frontend dev:
  - Install: `npm ci`
  - Dev: `npm run dev` (Vite) — serves frontend at `http://localhost:5173` by default
  - Build: `npm run build`
- Backend dev (from `datryp-python.backend`):
  - Install: follow `pyproject.toml` / use `pip install -e .` in a virtualenv
  - Run locally: `uvicorn app.main:app --reload --port 8000`
  - Using Docker: `docker-compose up --build` (reads `docker-compose.yml` in the backend folder)
- Tests: see `datryp-python.backend/tests` — run with `pytest` from `datryp-python.backend`

4) Secrets & environment
- Secrets live locally under the gitignored `datryp-python.backend/secrets/` folder and in `.env`; they must never be committed. Do NOT attempt to retrieve secrets from remote services without explicit permission.
- Typical env vars: `DATABASE_URL`, `POSTHOG_API_KEY`, any third-party OAuth credentials. Look in `app/config.py` and `pyproject.toml` for expected variables.

5) What agents should do (short actionable rules)
- Prefer linking to existing docs rather than copying them. See `CLAUDE.md` and backend README for details.
- When asked to modify code, run only minimal edits and keep changes focused to one logical area.
- Ask the human before running destructive operations (DB migrations that drop data, branch resets, or deleting remote resources).
- When a change depends on secrets or remote services, explain how to test locally (docker, mocks, or test fixtures) and offer run commands rather than attempting to access live secrets.

6) Where to look (quick links)
- Frontend conventions: [CLAUDE.md](CLAUDE.md)
- Backend repo: [datryp-python.backend](datryp-python.backend)
- Docker / compose: [datryp-python.backend/docker-compose.yml](datryp-python.backend/docker-compose.yml)

7) Remote-specific examples (short)
- To test backend against a remote Postgres snapshot use: create a local DB and restore a dump, or run the backend with a `DATABASE_URL` pointed to a temporary branch/instance. Never run migrations on production DB without approval.

If anything here is unclear, request permission before taking actions that modify remote state.
