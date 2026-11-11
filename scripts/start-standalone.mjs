/**
 * Runs the production build the way CI and the image do (QA B-31):
 * `node .next/standalone/server.js`, with `public/` and `.next/static/` copied
 * beside it — `next start` warns and differs under `output: "standalone"`.
 *
 *   npm run build && PORT=3103 npm run start:standalone
 *
 * For a local stand against a local API, build with
 * `NEXT_PUBLIC_API_URL=/api/v1 API_PROXY_TARGET=http://localhost:8077` (the
 * proxy rewrite is fixed at build time).
 */
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url);
const standalone = new URL(".next/standalone/", root);
if (!existsSync(new URL("server.js", standalone))) {
  console.error("No standalone build. Run `npm run build` first.");
  process.exit(1);
}
cpSync(new URL("public/", root), new URL("public/", standalone), { recursive: true });
cpSync(new URL(".next/static/", root), new URL(".next/static/", standalone), { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
