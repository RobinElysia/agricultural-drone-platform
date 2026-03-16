# Repository Guidelines

## Project Structure & Module Organization
This project is split into two TypeScript apps:
- `frontend/`: Vue 3 + Vite client (`src/views`, `src/components`, `src/store`, `src/router`, `src/api`, `src/composables`, `src/styles`).
- `backend/`: Express API (`src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/models`, `src/scripts`).
- Root files: `docker-compose.yml` for orchestration, `README.md` for docs.

Keep feature changes scoped across both sides when needed (example: `backend/src/routes/drone.ts` + `frontend/src/store/drone.ts`).

## Build, Test, and Development Commands
Run commands from each app directory.

- Frontend:
  - `cd frontend && npm run dev`: start Vite dev server.
  - `cd frontend && npm run build`: type-check (`vue-tsc`) and production build.
  - `cd frontend && npm run preview`: preview built assets.
  - `cd frontend && npm run lint`: lint and auto-fix `.vue/.ts/.js`.
- Backend:
  - `cd backend && npm run dev`: run API with `nodemon` + `tsx`.
  - `cd backend && npm run start`: run API once (no watcher).
  - `cd backend && npm run build`: compile TypeScript to `backend/dist`.
  - `cd backend && npm run init`: seed initial data.
  - `cd backend && npm run test`: run Vitest.
  - `cd backend && npm run lint`: lint and auto-fix `.ts`.
- Full stack:
  - `docker compose up --build` from repo root.

## Coding Style & Naming Conventions
- Language: TypeScript across frontend and backend.
- Vue standard: Composition API with `<script setup>` for new components/composables.
- Indentation: 2 spaces; keep imports grouped and sorted logically.
- Naming:
  - Vue components/views: PascalCase (example: `DashboardView.vue`).
  - Composables/utilities: camelCase with `use` prefix where applicable (example: `useDrone.ts`).
  - Backend routes/controllers: lowercase file names by domain (example: `routes/drone.ts`).

## Testing Guidelines
- Backend uses Vitest (`npm run test`).
- No repository-wide coverage gate is currently defined; add tests for changed logic and critical API paths.
- Place new tests as `*.test.ts` near source or in a dedicated `tests/` folder within `backend/`.

## Commit & Pull Request Guidelines
- Git history is not included in this workspace snapshot, so no commit pattern could be verified.
- Use Conventional Commits by default (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- PRs should include:
  - concise summary and motivation,
  - impacted areas (`frontend`, `backend`, or both),
  - validation evidence (commands run, test results),
  - screenshots/GIFs for UI changes,
  - linked issue/task if available.

## Security & Configuration Tips
- Keep secrets in `backend/.env` and `frontend/.env`; never commit API keys.
- Validate `CORS`, `JWT_SECRET`, Redis settings, and map/AI keys before release.

## Skill Playbook (Project-Specific)
Use the following skill combinations for this repository (`Vue 3 + Vite + Pinia + Express`):

- Vue feature development (new page/component/composable):
  - `vue-best-practices` + `vue-pinia-best-practices`
  - Add `create-adaptable-composable` when building reusable composables (`MaybeRef`/`MaybeRefOrGetter` inputs).
- Vite page breaks, unknown UI/state bug:
  - `vite-browser` -> `vite-browser-core-debug`, then pair with `vue-best-practices`.
- Data/API regression (empty/wrong data, 401/403/500, CORS):
  - `vite-browser` -> `vite-browser-network-regression` + `vue-pinia-best-practices`.
- HMR/hot-update regression (recent edit caused refresh/reload loop):
  - `vite-browser` -> `vite-browser-runtime-diagnostics` + `vue-best-practices`.
- Pre-release checks:
  - `vite-browser` -> `vite-browser-release-smoke` + `web-design-guidelines`.
- UI redesign/accessibility review:
  - `ui-ux-pro-max` + `web-design-guidelines` (+ `vue-best-practices` for implementation constraints).
- Browser automation/evidence capture (optional advanced):
  - `agent-browser` + `vite-browser-release-smoke`.

## Skill Initialization Status
- Completed in this workspace:
  - `python --version` = `3.11.7` (meets `ui-ux-pro-max` script prerequisite).
  - `node -v` = `v22.12.0`, `npx.cmd -v` = `11.6.0`.
- Deferred by request (not installed in this step):
  - `vite-browser` runtime CLI and browser: `npm install -D @presto1314w/vite-devtools-browser playwright` and `npx playwright install chromium`.
- Not initialized (optional, external tool):
  - `agent-browser` requires `infsh` CLI and `infsh login`.
