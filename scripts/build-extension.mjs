// Builds the demo as a browser extension in dist-extension/.
// Load it via chrome://extensions → Developer mode → Load unpacked.
import { build } from "vite";
import { cpSync, readFileSync, writeFileSync } from "node:fs";

const out = "dist-extension";
await build({ base: "./", build: { outDir: out, emptyOutDir: true } });

cpSync("extension", out, { recursive: true });
cpSync("LICENSE", `${out}/LICENSE`);

// Extension pages can't run inline scripts, and the extension scripts use chrome.* APIs,
// so they're only added to this build, not to the normal site.
const html = `${out}/index.html`;
const tags = ["search.js", "suggest.js", "tabs.js"].map((f) => `    <script src="./${f}"></script>`).join("\n");
writeFileSync(html, readFileSync(html, "utf8").replace("</body>", `${tags}\n  </body>`));
console.log(`\nExtension ready in ${out}/`);
