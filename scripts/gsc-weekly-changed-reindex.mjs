#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";

function env(name, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

function parseBool(value) {
  return /^(1|true|yes|y)$/i.test(String(value || "").trim());
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseSitemapLocs(xml) {
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  const out = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const u = decodeXmlEntities(match[1]).trim();
    if (u) out.push(u);
  }
  return [...new Set(out)];
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

function isContentCandidatePath(filePath) {
  if (!filePath) return false;
  const p = filePath.replace(/\\/g, "/");
  const excludedPrefixes = [
    ".github/",
    ".bundle/",
    ".jekyll-",
    "_site/",
    "assets/",
    "scripts/",
    "editor/",
    "node_modules/",
    "_data/",
    "_includes/",
    "_layouts/",
    "vendor/"
  ];
  if (excludedPrefixes.some((prefix) => p.startsWith(prefix))) return false;

  const excludedFiles = new Set([
    "README.md",
    "LICENSE",
    "Gemfile",
    "Gemfile.lock",
    "package.json",
    "package-lock.json",
    "_config.yml",
    "robots.txt",
    "search.json"
  ]);
  if (excludedFiles.has(p)) return false;

  return p.endsWith(".md") || p.endsWith(".html");
}

function buildUrlFromContentPath(filePath, siteUrl, frontMatter = {}) {
  if (frontMatter.permalink) {
    const permalink = frontMatter.permalink.startsWith("/")
      ? frontMatter.permalink
      : `/${frontMatter.permalink}`;
    return new URL(permalink, siteUrl).toString();
  }

  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("_posts/")) {
    const base = path.basename(normalized, path.extname(normalized));
    const m = base.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (!m) return null;
    const [, year, month, day, slugRaw] = m;
    const slug = frontMatter.slug && frontMatter.slug !== "" ? frontMatter.slug : slugRaw;
    const encodedSlug = encodeURIComponent(slug).replace(/%2F/g, "/");
    return `${siteUrl.replace(/\/$/, "")}/blog/${year}/${month}/${day}/${encodedSlug}/`;
  }

  const ext = path.extname(normalized).toLowerCase();
  const noExt = normalized.slice(0, -ext.length);
  const segments = noExt.split("/").filter(Boolean).map((s) => encodeURIComponent(s));

  if (ext === ".html" && path.basename(normalized).startsWith("google")) {
    return `${siteUrl.replace(/\/$/, "")}/${segments.join("/")}.html`;
  }

  if (segments.length === 0 || path.basename(noExt) === "index") {
    const dirSegments = path.basename(noExt) === "index" ? segments.slice(0, -1) : segments;
    const joined = dirSegments.join("/");
    return `${siteUrl.replace(/\/$/, "")}/${joined}${joined ? "/" : ""}`;
  }

  return `${siteUrl.replace(/\/$/, "")}/${segments.join("/")}/`;
}

function parseWeeklyNameStatus(lines) {
  const updates = new Set();
  const deletes = new Set();

  for (const line of lines.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("\t");
    const status = parts[0];

    if (status.startsWith("R")) {
      const oldPath = parts[1];
      const newPath = parts[2];
      if (isContentCandidatePath(oldPath)) deletes.add(oldPath);
      if (isContentCandidatePath(newPath)) updates.add(newPath);
      continue;
    }

    const filePath = parts[1];
    if (!isContentCandidatePath(filePath)) continue;
    if (status === "D") deletes.add(filePath);
    if (["A", "M", "C", "T"].includes(status)) updates.add(filePath);
  }

  for (const p of deletes) updates.delete(p);
  return { updates: [...updates], deletes: [...deletes] };
}

async function requestInspect({ accessToken, siteUrl, inspectionUrl }) {
  const body = {
    inspectionUrl,
    siteUrl,
    languageCode: "ko-KR"
  };
  const response = await fetch(INSPECT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: parsed?.error?.message || text || `HTTP ${response.status}` };
  }
  const idx = parsed?.inspectionResult?.indexStatusResult || {};
  return {
    ok: true,
    status: response.status,
    verdict: idx.verdict || null,
    coverageState: idx.coverageState || null,
    indexingState: idx.indexingState || null
  };
}

async function publish({ accessToken, url, type }) {
  const response = await fetch(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url, type })
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: parsed?.error?.message || text || `HTTP ${response.status}` };
  }
  return { ok: true, status: response.status, metadata: parsed?.urlNotificationMetadata || null };
}

function renderSummary(report) {
  const lines = [];
  lines.push("## Weekly Changed Content Reindex Report");
  lines.push("");
  lines.push(`- Site: \`${report.siteUrl}\``);
  lines.push(`- Days back: \`${report.daysBack}\``);
  lines.push(`- Changed content files (update/delete): **${report.updatedCount} / ${report.deletedCount}**`);
  lines.push(`- Skipped (not in sitemap): **${report.skippedNotInSitemap}**`);
  lines.push(`- Inspect success/fail: **${report.inspectSuccess} / ${report.inspectFail}**`);
  lines.push(`- Publish success/fail: **${report.publishSuccess} / ${report.publishFail}**`);
  lines.push("");
  if (report.entries.length > 0) {
    lines.push("### Entries");
    lines.push("");
    for (const e of report.entries) {
      lines.push(`- ${e.type} ${e.url}`);
      if (e.inspect) {
        lines.push(`  - inspect: ${e.inspect.ok ? `ok (${e.inspect.verdict || "n/a"})` : `fail: ${e.inspect.error}`}`);
      } else {
        lines.push("  - inspect: skipped");
      }
      lines.push(`  - publish: ${e.publish.ok ? "ok" : `fail: ${e.publish.error}`}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const accessToken = env("GOOGLE_ACCESS_TOKEN");
  const siteUrl = env("GSC_SITE_URL", "https://lh99tw.github.io/");
  const sitemapUrl = env("SITEMAP_URL", "https://lh99tw.github.io/sitemap.xml");
  const daysBack = Number.parseInt(env("DAYS_BACK", "7"), 10) || 7;
  const strictMode = parseBool(env("STRICT_MODE", "false"));

  if (!accessToken) {
    console.error("GOOGLE_ACCESS_TOKEN is required.");
    process.exit(1);
  }

  const weeklyDiff = execSync(`git log --since="${daysBack} days ago" --name-status --pretty=format:`, {
    encoding: "utf8"
  });
  const { updates, deletes } = parseWeeklyNameStatus(weeklyDiff);

  if (updates.length === 0 && deletes.length === 0) {
    console.log("[gsc-weekly] No changed content files found.");
    return;
  }

  const sitemapResponse = await fetch(sitemapUrl);
  if (!sitemapResponse.ok) {
    console.error(`[gsc-weekly] Failed to fetch sitemap: HTTP ${sitemapResponse.status}`);
    process.exit(1);
  }
  const sitemapXml = await sitemapResponse.text();
  const sitemapLocs = new Set(parseSitemapLocs(sitemapXml));

  const entries = [];
  let skippedNotInSitemap = 0;

  for (const p of updates) {
    const abs = path.join(process.cwd(), p);
    if (!fs.existsSync(abs)) continue;
    const fm = parseFrontMatter(fs.readFileSync(abs, "utf8"));
    const url = buildUrlFromContentPath(p, siteUrl, fm);
    if (!url) continue;
    if (!sitemapLocs.has(url)) {
      skippedNotInSitemap += 1;
      continue;
    }

    const inspect = await requestInspect({ accessToken, siteUrl, inspectionUrl: url });
    const looksIndexed = inspect.ok && inspect.verdict === "PASS";

    if (!looksIndexed) {
      const publishResult = await publish({ accessToken, url, type: "URL_UPDATED" });
      entries.push({ type: "URL_UPDATED", url, inspect, publish: publishResult });
    }
  }

  for (const p of deletes) {
    const url = buildUrlFromContentPath(p, siteUrl, {});
    if (!url) continue;

    const inSitemap = sitemapLocs.has(url);
    const type = "URL_DELETED";
    const publishResult = await publish({ accessToken, url, type });
    entries.push({
      type,
      url,
      inspect: inSitemap ? { ok: false, error: "URL still present in sitemap after delete" } : null,
      publish: publishResult
    });
  }

  const inspectSuccess = entries.filter((e) => e.inspect && e.inspect.ok).length;
  const inspectFail = entries.filter((e) => e.inspect && !e.inspect.ok).length;
  const publishSuccess = entries.filter((e) => e.publish.ok).length;
  const publishFail = entries.filter((e) => !e.publish.ok).length;

  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    sitemapUrl,
    daysBack,
    updatedCount: updates.length,
    deletedCount: deletes.length,
    skippedNotInSitemap,
    inspectSuccess,
    inspectFail,
    publishSuccess,
    publishFail,
    entries
  };

  const outDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `gsc-weekly-${report.generatedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[gsc-weekly] Report written: ${outPath}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderSummary(report)}\n`, "utf8");
  }

  if (strictMode && publishFail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[gsc-weekly] Unhandled error:", error);
  process.exit(1);
});
