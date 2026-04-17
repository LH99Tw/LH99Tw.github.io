#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const INDEXING_METADATA_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications/metadata";

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
  const locs = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const url = decodeXmlEntities(match[1]).trim();
    if (url) locs.push(url);
  }
  return [...new Set(locs)];
}

function createUrlMatcher(filter) {
  if (!filter) return () => true;

  if (filter.startsWith("regex:")) {
    const source = filter.slice("regex:".length);
    const regex = new RegExp(source);
    return (url) => regex.test(url);
  }

  return (url) => url.includes(filter);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  return { response, text };
}

async function requestInspect({ accessToken, siteUrl, inspectionUrl }) {
  const payload = {
    inspectionUrl,
    siteUrl,
    languageCode: "ko-KR"
  };

  const { response, text } = await fetchText(INSPECT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

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

  const indexStatus = parsed?.inspectionResult?.indexStatusResult || {};
  return {
    ok: true,
    status: response.status,
    verdict: indexStatus.verdict || null,
    coverageState: indexStatus.coverageState || null,
    robotsTxtState: indexStatus.robotsTxtState || null,
    indexingState: indexStatus.indexingState || null,
    pageFetchState: indexStatus.pageFetchState || null,
    lastCrawlTime: indexStatus.lastCrawlTime || null,
    inspectedUrl: parsed?.inspectionResult?.inspectionResultLink || null
  };
}

async function requestIndexing({ accessToken, url }) {
  const notifyType = env("INDEXING_NOTIFY_TYPE", "URL_UPDATED");
  if (!["URL_UPDATED", "URL_DELETED"].includes(notifyType)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid INDEXING_NOTIFY_TYPE: ${notifyType}`
    };
  }

  const payload = {
    url,
    type: notifyType
  };

  const { response, text } = await fetchText(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

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
    type: notifyType,
    urlNotificationMetadata: parsed?.urlNotificationMetadata || null
  };
}

async function requestIndexingMetadata({ accessToken, url }) {
  const endpoint = `${INDEXING_METADATA_ENDPOINT}?url=${encodeURIComponent(url)}`;
  const { response, text } = await fetchText(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

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
    metadata: parsed || null
  };
}

function buildSummaryMarkdown(report) {
  const lines = [];
  lines.push("## GSC URL Inspection / Indexing Report");
  lines.push("");
  lines.push(`- Site property: \`${report.siteUrl}\``);
  lines.push(`- Sitemap: \`${report.sitemapUrl}\``);
  lines.push(`- Mode: \`${report.mode}\``);
  lines.push(`- Notify type: \`${report.notifyType || "(n/a)"}\``);
  lines.push(`- URL filter: \`${report.urlFilter || "(none)"}\``);
  lines.push(`- Target URLs: **${report.totalUrls}**`);
  lines.push(`- Inspection success/fail: **${report.inspectSuccess} / ${report.inspectFail}**`);
  if (report.mode === "inspect_and_index") {
    lines.push(`- Indexing publish success/fail: **${report.indexSuccess} / ${report.indexFail}**`);
    lines.push(`- Metadata success/fail: **${report.metadataSuccess} / ${report.metadataFail}**`);
    lines.push("- Note: Indexing API is officially limited to JobPosting/BroadcastEvent pages.");
  }
  lines.push("");

  const failed = report.results.filter((item) => !item.inspect.ok || (item.index && !item.index.ok)).slice(0, 20);
  if (failed.length > 0) {
    lines.push("### Failures (first 20)");
    lines.push("");
    for (const item of failed) {
      const inspectMsg = item.inspect.ok ? "ok" : `fail: ${item.inspect.error}`;
      const indexMsg = !item.index ? "-" : item.index.ok ? "ok" : `fail: ${item.index.error}`;
      const metadataMsg = !item.metadata ? "-" : item.metadata.ok ? "ok" : `fail: ${item.metadata.error}`;
      lines.push(`- ${item.url}`);
      lines.push(`  - inspect: ${inspectMsg}`);
      lines.push(`  - indexing: ${indexMsg}`);
      lines.push(`  - metadata: ${metadataMsg}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const accessToken = env("GOOGLE_ACCESS_TOKEN");
  const siteUrl = env("GSC_SITE_URL", "https://lh99tw.github.io/");
  const sitemapUrl = env("SITEMAP_URL", "https://lh99tw.github.io/sitemap.xml");
  const mode = env("GSC_MODE", "inspect");
  const notifyType = env("INDEXING_NOTIFY_TYPE", "URL_UPDATED");
  const fetchMetadata = parseBool(env("FETCH_INDEXING_METADATA", "true"));
  const urlFilter = env("URL_FILTER", "/blog/");
  const strictMode = parseBool(env("STRICT_MODE", "false"));
  const maxUrlsRaw = Number.parseInt(env("MAX_URLS", "30"), 10);
  const maxUrls = Number.isFinite(maxUrlsRaw) && maxUrlsRaw > 0 ? maxUrlsRaw : 30;

  if (!accessToken) {
    console.error("GOOGLE_ACCESS_TOKEN is required.");
    process.exit(1);
  }

  if (!["inspect", "inspect_and_index", "inspect_and_notify"].includes(mode)) {
    console.error(`Invalid GSC_MODE: ${mode}`);
    process.exit(1);
  }
  const normalizedMode = mode === "inspect_and_notify" ? "inspect_and_index" : mode;

  console.log(`[gsc] Fetch sitemap: ${sitemapUrl}`);
  const sitemap = await fetchText(sitemapUrl);
  if (!sitemap.response.ok) {
    console.error(`[gsc] Failed to fetch sitemap: HTTP ${sitemap.response.status}`);
    process.exit(1);
  }

  const allLocs = parseSitemapLocs(sitemap.text);
  const matchUrl = createUrlMatcher(urlFilter);
  const targetUrls = allLocs.filter(matchUrl).slice(0, maxUrls);

  if (targetUrls.length === 0) {
    console.error("[gsc] No URLs matched filter.");
    process.exit(1);
  }

  console.log(
    `[gsc] Inspecting ${targetUrls.length} URLs (mode=${normalizedMode}, notifyType=${notifyType}, metadata=${fetchMetadata})`
  );

  const results = [];
  for (const url of targetUrls) {
    const inspect = await requestInspect({
      accessToken,
      siteUrl,
      inspectionUrl: url
    });

    let index = null;
    let metadata = null;
    if (normalizedMode === "inspect_and_index") {
      index = await requestIndexing({ accessToken, url });
      if (fetchMetadata) {
        metadata = await requestIndexingMetadata({ accessToken, url });
      }
    }

    results.push({ url, inspect, index, metadata });
    await sleep(150);
  }

  const inspectSuccess = results.filter((r) => r.inspect.ok).length;
  const inspectFail = results.length - inspectSuccess;
  const indexSuccess =
    normalizedMode === "inspect_and_index" ? results.filter((r) => r.index && r.index.ok).length : 0;
  const indexFail =
    normalizedMode === "inspect_and_index" ? results.filter((r) => r.index && !r.index.ok).length : 0;
  const metadataSuccess =
    normalizedMode === "inspect_and_index" ? results.filter((r) => r.metadata && r.metadata.ok).length : 0;
  const metadataFail =
    normalizedMode === "inspect_and_index" ? results.filter((r) => r.metadata && !r.metadata.ok).length : 0;

  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    sitemapUrl,
    mode: normalizedMode,
    notifyType,
    fetchMetadata,
    urlFilter,
    totalUrls: targetUrls.length,
    inspectSuccess,
    inspectFail,
    indexSuccess,
    indexFail,
    metadataSuccess,
    metadataFail,
    strictMode,
    results
  };

  const outDir = path.join(process.cwd(), "artifacts");
  await fs.mkdir(outDir, { recursive: true });
  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `gsc-report-${timestamp}.json`);
  await fs.writeFile(outFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`[gsc] Report written: ${outFile}`);

  const summary = buildSummaryMarkdown(report);
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await fs.appendFile(summaryPath, `${summary}\n`, "utf8");
  }

  if (inspectSuccess === 0) {
    console.error("[gsc] All inspections failed.");
    process.exit(1);
  }

  if (strictMode && (inspectFail > 0 || indexFail > 0 || metadataFail > 0)) {
    console.error("[gsc] Strict mode enabled and failures detected.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[gsc] Unhandled error:", error);
  process.exit(1);
});
