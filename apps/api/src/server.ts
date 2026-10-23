import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

// npm workspaces run this package with apps/api as the cwd, so the repo-root
// .env has to be resolved relative to this module rather than process.cwd().
config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
