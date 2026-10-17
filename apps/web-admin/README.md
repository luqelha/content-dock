# ContentDock admin

The Next.js frontend for [Atlas Platform](../../README.md), with workspace management, content publishing, private media, members, audit history, and exports.

Install dependencies from the **repository root**, using the root `package-lock.json`. See the [root setup guide](../../README.md#local-development) for infrastructure, environment files, and migrations.

To start only the frontend after the API is running, execute from the repository root:

```sh
npm run dev --workspace=@atlas/web-admin
```

The interface is available at <http://localhost:3000>, with user guides at `/docs`.

If development exits with `Another next dev server is already running`, use the existing URL printed by Next.js. To restart instead, press `Ctrl+C` in the terminal running that server before starting `npm run dev` again. Run the root development command in one terminal; it already starts both workspaces.

Copy `.env.example` to `.env.local`. `API_URL` is the server-side API address, normally `http://localhost:4000/api`. In production, configure the same `AUTH_PROXY_SECRET` on the API and web server; keep it server-side.

```sh
npm run lint --workspace=@atlas/web-admin
npm run typecheck --workspace=@atlas/web-admin
npm run build --workspace=@atlas/web-admin
```

The supported container build uses the repository root as its context and `apps/web-admin/Dockerfile`. Production configuration and HTTPS instructions are in the [root deployment guide](../../README.md#production).
