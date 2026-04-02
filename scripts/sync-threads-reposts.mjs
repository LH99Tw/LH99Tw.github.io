import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const palette = ["#EDE3DC", "#E8E0DA", "#F0ECE8", "#E5E5EA", "#F5F5F5"];
const profile = (process.env.THREADS_USERNAME || "hhannn001").trim();
const repostsUrl =
  process.env.THREADS_REPOSTS_URL ||
  `https://www.threads.com/@${profile}/reposts?hl=ko`;
const outputPath =
  process.env.THREADS_OUTPUT_FILE || "_data/threads_reposts.yml";
const limit = Number.parseInt(process.env.THREADS_LIMIT || "6", 10);

const uiNoise = new Set([
  "reply",
  "repost",
  "like",
  "share",
  "follow",
  "답글",
  "리포스트",
  "좋아요",
  "공유",
  "팔로우",
  "view all replies",
  "더 보기",
  "threads",
  "보기",
  "조회",
  "더보기",
]);

function compact(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoise(line) {
  if (!line) return true;
  const normalized = line.toLowerCase().trim();
  if (!normalized) return true;
  if (uiNoise.has(normalized)) return true;
  if (/^[0-9][0-9,.\s]*$/.test(normalized)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return true;
  if (/^\d+\s?(?:s|m|h|d|w|mo|y|초|분|시간|일|주|개월|달|년)$/i.test(normalized)) {
    return true;
  }
  if (/^(reply|repost|like|share)\s+[0-9,.kmb]+$/i.test(normalized)) return true;
  if (/^(답글|리포스트|좋아요)\s*[0-9,.kmb]+$/i.test(normalized)) return true;
  return false;
}

function extractTime(lines) {
  const joined = lines.join(" ");
  const m = joined.match(
    /(\d+\s?(?:s|m|h|d|w|mo|y|초|분|시간|일|주|개월|달|년))/i
  );
  if (m) return m[1];
  const d = joined.match(/(\d{4}-\d{2}-\d{2})/);
  return d ? d[1] : "now";
}

function chooseText(lines, author) {
  const candidates = lines
    .map(compact)
    .filter((line) => line.length > 3)
    .filter((line) => !isNoise(line))
    .filter((line) => {
      const l = line.toLowerCase();
      return !(author && (l === author || l === `@${author}`));
    });
  if (candidates.length === 0) {
    return "원문 확인";
  }
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

function splitLines(text) {
  return String(text || "")
    .split("\n")
    .map(compact)
    .filter(Boolean);
}

function isUrlLine(line) {
  return /^https?:\/\//i.test(line);
}

function pickBody(lines, author) {
  const filtered = lines
    .filter((line) => line.length > 3)
    .filter((line) => !isNoise(line))
    .filter((line) => !isUrlLine(line))
    .filter((line) => {
      const l = line.toLowerCase();
      return !(author && (l === author || l === `@${author}`));
    });

  if (filtered.length === 0) return "";

  let body = "";
  for (const line of filtered) {
    if (body.includes(line)) continue;
    const next = body ? `${body} ${line}` : line;
    if (next.length > 260) break;
    body = next;
    if (body.length >= 120) break;
  }
  return body || chooseText(filtered, author);
}

function pickBestCandidate(candidates, author) {
  let best = null;
  for (const candidate of candidates || []) {
    const text = compact(candidate.text);
    if (text.length < 24 || text.length > 1800) continue;
    const lines = splitLines(candidate.text);
    const body = pickBody(lines, author);
    if (!body) continue;

    const depth = Number.isFinite(candidate.depth) ? candidate.depth : 0;
    const depthBonus = depth >= 7 && depth <= 12 ? 16 : 0;
    const score = body.length + depthBonus;
    if (!best || score > best.score) {
      best = { score, body, lines };
    }
  }
  return best;
}

function toYamlString(value) {
  return JSON.stringify(value ?? "");
}

function toYaml(items) {
  const body = items
    .map((item) => {
      const rows = [
        `- author: ${toYamlString(item.author)}`,
        `  time: ${toYamlString(item.time)}`,
        `  text: ${toYamlString(item.text)}`,
        `  repost_label: ${toYamlString(item.repost_label)}`,
      ];
      if (item.url) {
        rows.push(`  url: ${toYamlString(item.url)}`);
      }
      rows.push(`  avatar_color: ${toYamlString(item.avatar_color)}`);
      return rows.join("\n");
    })
    .join("\n\n");
  return `# AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n# Source: ${repostsUrl}\n${body}\n`;
}

async function extractReposts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(repostsUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(7000);

    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(800);
    }

      const rawCards = await page.evaluate((maxCount) => {
        const anchors = Array.from(
          document.querySelectorAll('a[href*="/post/"]')
        );
        const seen = new Set();
        const cards = [];
        for (const anchor of anchors) {
          if (!(anchor instanceof HTMLAnchorElement)) continue;
          const href = anchor.href || "";
          if (!href.includes("/post/")) continue;
          const m = href.match(
            /https?:\/\/www\.threads\.com\/@([^/?#]+)\/post\/([^/?#]+)/
          );
          if (!m) continue;
          const canonical = `https://www.threads.com/@${m[1]}/post/${m[2]}`;
          if (seen.has(canonical)) continue;
          seen.add(canonical);

          const candidates = [];
          let node = anchor;
          for (let depth = 0; depth <= 13 && node; depth += 1) {
            if (depth >= 4) {
              const text = (node.innerText || "").trim();
              if (text) {
                candidates.push({ depth, text });
              }
            }
            node = node.parentElement;
          }

          cards.push({
            url: canonical,
            author: m[1],
            candidates,
          });
          if (cards.length >= maxCount * 4) break;
        }
        return cards;
      }, limit);

      const results = rawCards
        .map((item, index) => {
          const author = compact(item.author || `user_${index + 1}`);
          const best = pickBestCandidate(item.candidates || [], author);
          const lines = best?.lines || [];
          const time = extractTime(lines);
          const text = best?.body || chooseText(lines, author);
          return {
            author,
            time,
          text: text.slice(0, 220),
          repost_label: profile,
          url: item.url,
          avatar_color: palette[index % palette.length],
        };
      })
      .filter((item) => item.author && item.text)
      .slice(0, limit);

    if (results.length === 0) {
      throw new Error("No repost entries extracted from Threads page.");
    }

    return results;
  } finally {
    await browser.close();
  }
}

async function main() {
  const reposts = await extractReposts();
  const yaml = toYaml(reposts);
  const abs = path.resolve(outputPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, yaml, "utf8");
  console.log(`Updated ${outputPath} with ${reposts.length} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
