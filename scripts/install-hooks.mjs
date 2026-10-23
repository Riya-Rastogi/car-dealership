import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const gitDir = join(root, ".git");

if (!existsSync(gitDir)) {
  console.log("No .git directory yet; skipping commit-msg hook install.");
  process.exit(0);
}

const hooksDir = join(gitDir, "hooks");
mkdirSync(hooksDir, { recursive: true });

const source = join(root, "scripts", "commit-msg");
const target = join(hooksDir, "commit-msg");
copyFileSync(source, target);

try {
  chmodSync(target, 0o755);
} catch {
  // Windows does not enforce the executable bit; Git for Windows runs the hook with sh.
}

console.log("Installed commit-msg hook that requires an AI co-author trailer.");
