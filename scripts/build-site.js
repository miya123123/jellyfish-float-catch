import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const copyTargets = [
  "index.html",
  "styles.css",
  "src",
  "data",
  "assets",
  "README.md"
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const target of copyTargets) {
  cpSync(join(root, target), join(dist, target), {
    recursive: true,
    dereference: true
  });
}

writeFileSync(
  join(dist, "site-manifest.json"),
  `${JSON.stringify(
    {
      name: "くらげふわふわキャッチ",
      description: "深海で上昇する半透明のくらげを泡で包んで捕まえる39秒カジュアルキャッチゲーム。",
      entry: "index.html",
      engine: "web",
      buildSource: "npm run build",
      generatedAt: new Date().toISOString()
    },
    null,
    2
  )}\n`
);

console.log(`Built static site in ${dist}`);
