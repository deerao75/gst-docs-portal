/**
 * After `next build` with output:standalone on Vercel, copy runtime data/PDFs
 * into .next/standalone so server pages can read them via fs.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

function copyDir(label, relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(standalone, relativePath);
  if (!fs.existsSync(from)) {
    console.log(`[copy-standalone] skip missing ${label}: ${relativePath}`);
    return false;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone] copied ${label} -> ${relativePath}`);
  return true;
}

function main() {
  if (!fs.existsSync(standalone)) {
    console.log("[copy-standalone] no .next/standalone — skipping");
    return;
  }

  copyDir("data", "data");
  copyDir("circulars", "All Circulars");
  copyDir("orders", "All Orders");

  const staticSrc = path.join(root, ".next", "static");
  const staticDest = path.join(standalone, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log("[copy-standalone] copied .next/static");
  }

  const publicSrc = path.join(root, "public");
  const publicDest = path.join(standalone, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log("[copy-standalone] copied public");
  }

  console.log("[copy-standalone] done");
}

main();