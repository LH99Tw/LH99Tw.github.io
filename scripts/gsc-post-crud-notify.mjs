#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";

function env(name, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};
  const block = match[1];
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
  return out;
}

function buildUrlFromPostPath(filePath, siteUrl, frontMatter = {}) {
  if (frontMatter.permalink) {
    const permalink = frontMatter.permalink.startsWith("/")
      ? frontMatter.permalink
      : `/${frontMatter.permalink}`;
    return new URL(permalink, siteUrl).toString();
  }

  const base = path.basename(filePath, path.extname(filePath));
  const m = base.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (!m) return null;
  const [, year, month, day, slugRaw] = m;
  const slug = frontMatter.slug && frontMatter.slug !== "" ? frontMatter.slug : slugRaw;
  const encodedSlug = encodeURIComponent(slug).replace(/%2F/g, "/");
  return `${siteUrl.replace(/\/$/, "")}/blog/${year}/${month}/${day}/${encodedSlug}/`;
}

function readFrontMatterFromGitObject(ref, filePath) {
  try {
    const content = execSync(`git show ${ref}:${filePath}`, { encoding: "utf8" });
    return parseFrontMatter(content);
  } catch {
    return {};
  }
}

function parseNameStatusDiff(diffText) {
  const actions = [];
  for (const line of diffText.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0];

    if (status.startsWith("R")) {
      const oldPath = parts[1];
      const newPath = parts[2];
      if (oldPath?.startsWith("_posts/")) actions.push({ action: "delete", path: oldPath, fromRename: true });
      if (newPath?.startsWith("_posts/")) actions.push({ action: "update", path: newPath, fromRename: true });
      continue;
    }

    const filePath = parts[1];
    if (!filePath?.startsWith("_posts/")) continue;

    if (status === "D") actions.push({ action: "delete", path: filePath });
    if (["A", "M", "C", "T"].includes(status)) actions.push({ action: "update", path: filePath });
  }
  return actions;
}

async function publishNotification(accessToken, url, type) {
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
    return {
      ok: false,
      status: response.status,
      error: parsed?.error?.message || text || `HTTP ${response.status}`
    };
  }
  return {
    ok: true,
    status: response.status,
    metadata: parsed?.urlNotificationMetadata || null
  };
}

function toSummary(results, siteUrl, baseSha, headSha) {
  const lines = [];
  const ok = results.filter((r) => r.result.ok).length;
  const fail = results.length - ok;
  lines.push("## Post CRUD Indexing Report");
  lines.push("");
  lines.push(`- Site: \`${siteUrl}\``);
  lines.push(`- Git range: \`${baseSha}..${headSha}\``);
  lines.push(`- Total notifications: **${results.length}**`);
  lines.push(`- Success / Fail: **${ok} / ${fail}**`);
  lines.push("");
  if (results.length > 0) {
    lines.push("### Details");
    lines.push("");
    for (const row of results) {
      const status = row.result.ok ? "ok" : `fail: ${row.result.error}`;
      lines.push(`- ${row.type} ${row.url} -> ${status}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const accessToken = env("GOOGLE_ACCESS_TOKEN");
  const siteUrl = env("GSC_SITE_URL", "https://lh99tw.github.io/");
  const baseSha = env("BASE_SHA");
  const headSha = env("HEAD_SHA", "HEAD");
  const strictMode = /^(1|true|yes|y)$/i.test(env("STRICT_MODE", "false"));

  if (!accessToken) {
    console.error("GOOGLE_ACCESS_TOKEN is required.");
    process.exit(1);
  }
  if (!baseSha) {
    console.error("BASE_SHA is required.");
    process.exit(1);
  }

  const diff = execSync(`git diff --name-status ${baseSha} ${headSha} -- _posts`, { encoding: "utf8" });
  const actions = parseNameStatusDiff(diff);

  if (actions.length === 0) {
    console.log("[gsc-crud] No _posts CRUD changes detected.");
    return;
  }

  const notifications = [];
  for (const item of actions) {
    if (item.action === "update") {
      const abs = path.join(process.cwd(), item.path);
      const content = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
      const fm = parseFrontMatter(content);
      const url = buildUrlFromPostPath(item.path, siteUrl, fm);
      if (!url) continue;
      notifications.push({ type: "URL_UPDATED", url, source: item.path });
    } else {
      const fm = readFrontMatterFromGitObject(baseSha, item.path);
      const url = buildUrlFromPostPath(item.path, siteUrl, fm);
      if (!url) continue;
      notifications.push({ type: "URL_DELETED", url, source: item.path });
    }
  }

  const dedup = [];
  const seen = new Set();
  for (const n of notifications) {
    const key = `${n.type}|${n.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(n);
  }

  const results = [];
  for (const n of dedup) {
    const result = await publishNotification(accessToken, n.url, n.type);
    results.push({ ...n, result });
  }

  const reportDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(reportDir, { recursive: true });
  const out = path.join(reportDir, `gsc-crud-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(out, JSON.stringify({ siteUrl, baseSha, headSha, results }, null, 2));
  console.log(`[gsc-crud] Report written: ${out}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = toSummary(results, siteUrl, baseSha, headSha);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  const fail = results.filter((r) => !r.result.ok).length;
  if (strictMode && fail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[gsc-crud] Unhandled error:", error);
  process.exit(1);
});
