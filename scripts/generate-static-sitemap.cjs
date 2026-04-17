#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "_config.yml");
const POSTS_DIR = path.join(ROOT, "_posts");
const CATEGORIES_DIR = path.join(ROOT, "categories");
const OUT_SITEMAP = path.join(ROOT, "sitemap.xml");
const OUT_SITEMAP_INDEX = path.join(ROOT, "sitemap_index.xml");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readConfigSiteBase() {
  const raw = readText(CONFIG_PATH);
  const readScalar = (key, fallback = "") => {
    const line = raw.split("\n").find((l) => l.startsWith(`${key}:`));
    if (!line) return fallback;
    let value = line.slice(key.length + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  };

  const siteUrl = readScalar("url", "https://lh99tw.github.io").replace(/\/$/, "");
  const baseurl = readScalar("baseurl", "").replace(/\/$/, "");
  return `${siteUrl}${baseurl}`;
}

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
  return out;
}

function dateToXmlSchema(day) {
  return `${day}T00:00:00+09:00`;
}

function postUrlFromFile(fileName, fm) {
  if (fm.permalink) {
    const permalink = fm.permalink.startsWith("/") ? fm.permalink : `/${fm.permalink}`;
    return permalink.endsWith("/") || permalink.endsWith(".html") ? permalink : `${permalink}/`;
  }
  const base = fileName.replace(path.extname(fileName), "");
  const m = base.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (!m) return null;
  const [, y, mm, dd, rawSlug] = m;
  const slug = fm.slug && fm.slug !== "" ? fm.slug : rawSlug;
  return `/blog/${y}/${mm}/${dd}/${encodeURIComponent(slug).replace(/%2F/g, "/")}/`;
}

function collectPostEntries(siteBase) {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((name) => /\.(md|markdown)$/i.test(name))
    .sort()
    .reverse();

  const out = [];
  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const content = readText(full);
    const fm = parseFrontMatter(content);
    const urlPath = postUrlFromFile(file, fm);
    if (!urlPath) continue;
    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-/);
    const fallbackDate = dateMatch ? dateMatch[1] : null;
    const lastmod = fm.lastmod && fm.lastmod !== "" ? fm.lastmod : fallbackDate ? dateToXmlSchema(fallbackDate) : null;
    out.push({
      loc: `${siteBase}${urlPath}`,
      lastmod
    });
  }
  return out;
}

function collectCategoryEntries(siteBase) {
  if (!fs.existsSync(CATEGORIES_DIR)) return [];
  const dirs = fs
    .readdirSync(CATEGORIES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return dirs.map((name) => ({ loc: `${siteBase}/categories/${encodeURIComponent(name)}/`, lastmod: null }));
}

function collectCoreEntries(siteBase) {
  const corePaths = ["/", "/profile/", "/site-map/"];
  const entries = corePaths.map((p) => ({ loc: `${siteBase}${p}`, lastmod: null }));
  const googleFile = fs
    .readdirSync(ROOT)
    .find((n) => /^google[a-z0-9]+\.html$/i.test(n));
  if (googleFile) {
    entries.push({ loc: `${siteBase}/${googleFile}`, lastmod: null });
  }
  return entries;
}

function renderUrlset(entries) {
  const rows = entries.map((e) => {
    if (e.lastmod) {
      return `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>\n    <lastmod>${xmlEscape(e.lastmod)}</lastmod>\n  </url>`;
    }
    return `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    ...rows,
    "</urlset>",
    ""
  ].join("\n");
}

function renderSitemapIndex(siteBase) {
  const now = new Date().toISOString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${xmlEscape(`${siteBase}/sitemap.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(now)}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
    ""
  ].join("\n");
}

function main() {
  const siteBase = readConfigSiteBase();
  const entries = [
    ...collectPostEntries(siteBase),
    ...collectCategoryEntries(siteBase),
    ...collectCoreEntries(siteBase)
  ];
  fs.writeFileSync(OUT_SITEMAP, renderUrlset(entries), "utf8");
  fs.writeFileSync(OUT_SITEMAP_INDEX, renderSitemapIndex(siteBase), "utf8");
  console.log(`[sitemap] generated ${entries.length} url entries`);
  console.log(`[sitemap] ${OUT_SITEMAP}`);
  console.log(`[sitemap] ${OUT_SITEMAP_INDEX}`);
}

main();
