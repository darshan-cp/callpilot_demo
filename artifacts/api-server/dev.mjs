import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "../..");

const child = spawn(
  process.execPath,
  [
    "--env-file",
    path.join(repoRoot, ".env"),
    "--import",
    "tsx/esm",
    "--watch",
    path.join(artifactDir, "src/index.ts"),
  ],
  {
    stdio: "inherit",
    cwd: artifactDir,
    env: {
      ...process.env,
      // pino-pretty worker transport hangs on Windows; use JSON logs in dev there.
      NODE_ENV: process.platform === "win32" ? "production" : process.env.NODE_ENV,
    },
  },
);

child.on("exit", (code) => process.exit(code ?? 1));
