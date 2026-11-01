import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const publicFiles = [
  "index.html",
  "customize.html",
  "replies.html",
  "assets",
  "css",
  "js",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(publicFiles.map((path) =>
  cp(join(root, path), join(output, path), { recursive: true })
));
console.log(`Built Workers static assets in ${output}`);
