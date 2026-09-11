# Frontend CI and production image

This is Next.js 15 with React 19. The Docker image uses Node 22 and standalone
output, containing only the traced runtime and public/static assets.

Production configuration belongs to **WOMENUP-D/infra > Settings > Environments >
prod**. Only INFRA_PUSH_TOKEN is configured as a repository secret here for the
final image-file commit; GITHUB_TOKEN handles GHCR publishing.

Production builds use NEXT_PUBLIC_API_URL=/api/v1 and disable demo mode. Firebase
web configuration is provided at runtime through /public-config from the
FIREBASE_WEB_* variables in infra prod. The endpoint exposes only six explicit
public fields, never backend service-account credentials. Existing
NEXT_PUBLIC_FIREBASE_* values remain supported for local development.

PR checks run Semgrep, Gitleaks, dependency scanning, ESLint, TypeScript, a
production build and Playwright smoke tests. Main releases publish and scan the
image, assign frontend-<full-source-sha>, then commit its digest/version to
infra/apps/frontend/image.env. Failed checks do not promote.

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
```

For a standalone local smoke test:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js
# In another terminal:
npm run test:smoke
```

After changing infra prod Firebase variables, dispatch deploy-platform; no new
frontend image is required. See [infra](https://github.com/WOMENUP-D/infra) for
domain, bootstrap, deployment, secrets and recovery instructions.
