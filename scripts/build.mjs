import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");

/* A short build stamp (git sha + UTC time) injected into every page so a
   live deployment can be fingerprinted with one `curl`. When git is not
   available (e.g. a shallow CI export) the stamp falls back to the time. */
let buildStamp;
try {
  const sha = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  buildStamp = `${sha} ${new Date().toISOString().replace(/\.\d+Z$/, "Z")}`;
} catch {
  buildStamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
}
const stampTag = `<meta name="build" content="${buildStamp}" aria-hidden="true">`;
console.log(`Build stamp: ${buildStamp}`);

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

/* Cache-bust local css/js/assets references in every HTML file: each URL gets
   ?v=<8-char content hash> so browsers pick up new files immediately after a
   deploy, and keep their cache untouched when a file has not changed.       */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const htmlFiles = (await walk(output)).filter((file) => file.endsWith(".html"));
const hashCache = new Map();
let busted = 0;
let stamped = 0;

const assetRef = /(?:src|href)="((?:css|js|assets)\/[^"?]+)"/g;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const refs = [...html.matchAll(assetRef)].map((match) => match[1]);
  for (const path of new Set(refs)) {
    try {
      const bytes = await readFile(join(output, path));
      hashCache.set(path, createHash("sha1").update(bytes).digest("hex").slice(0, 8));
    } catch {
      /* referenced file missing — leave its URL untouched */
    }
  }
  let versioned = 0;
  const out = html.replace(/(src|href)="((?:css|js|assets)\/[^"?]+)"/g,
    (match, attr, path) => {
      const hash = hashCache.get(path);
      if (!hash) return match;
      versioned += 1;
      return `${attr}="${path}?v=${hash}"`;
    })
    /* one build stamp per page, right after the charset declaration */
    .replace(/(<meta charset="[^"]*">)/i, `$1\n  ${stampTag}`);
  stamped += 1;
  busted += versioned;
  await writeFile(file, out);
}

console.log(`Built Workers static assets in ${output} (${busted} asset URLs versioned, ${stamped} pages stamped)`);
