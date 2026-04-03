#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = new Set(process.argv.slice(2));
const isCi = args.has("--ci") || process.env.CI === "true";
const shouldBuild = args.has("--build");
const projectRoot = process.cwd();

const errors = [];
const warnings = [];
let buildUnavailableInLocal = false;

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function listPostFiles() {
  const dir = path.join(projectRoot, "_posts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => path.join(dir, file));
}

function listCategoryIndexFiles() {
  const categoriesDir = path.join(projectRoot, "categories");
  if (!fs.existsSync(categoriesDir)) return [];
  return fs
    .readdirSync(categoriesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(categoriesDir, entry.name, "index.md"))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function extractFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? match[1] : null;
}

function getScalarValue(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return "";
  const raw = match[1].trim();
  const unquoted = raw.replace(/^['"]|['"]$/g, "");
  return unquoted.trim();
}

function hasField(frontMatter, key) {
  return new RegExp(`^${key}:`, "m").test(frontMatter);
}

function countListItems(frontMatter, key) {
  const inline = frontMatter.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m"));
  if (inline) {
    return inline[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length;
  }

  const block = frontMatter.match(new RegExp(`^${key}:\\s*\\n((?:\\s*-\\s*.+\\n?)*)`, "m"));
  if (block) {
    return block[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-") && line.length > 1).length;
  }

  const single = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!single) return 0;
  const value = single[1].trim();
  if (!value || value.startsWith("[") || value === "[]") return 0;
  return 1;
}

function normalizeRelative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

function checkPosts() {
  const postFiles = listPostFiles();
  if (postFiles.length === 0) {
    error("No files found in _posts/.");
    return;
  }

  for (const postFile of postFiles) {
    const rel = normalizeRelative(postFile);
    const content = readFileSafe(postFile);
    if (!content) {
      error(`${rel}: unable to read file.`);
      continue;
    }

    const frontMatter = extractFrontMatter(content);
    if (!frontMatter) {
      error(`${rel}: missing valid front matter block.`);
      continue;
    }

    const requiredFields = ["title", "description", "categories", "tags"];
    for (const field of requiredFields) {
      if (!hasField(frontMatter, field)) {
        error(`${rel}: missing required field '${field}'.`);
      }
    }

    const title = getScalarValue(frontMatter, "title");
    const description = getScalarValue(frontMatter, "description");
    const categoriesCount = countListItems(frontMatter, "categories");
    const tagsCount = countListItems(frontMatter, "tags");

    if (title.length < 8 || title.length > 70) {
      error(`${rel}: title length must be between 8 and 70 characters (current: ${title.length}).`);
    }

    if (description.length < 10 || description.length > 220) {
      error(`${rel}: description length must be between 10 and 220 characters (current: ${description.length}).`);
    } else if (description.length < 120 || description.length > 155) {
      warn(`${rel}: description is outside recommended range 120-155 characters (current: ${description.length}).`);
    }

    if (categoriesCount < 1) {
      error(`${rel}: categories must contain at least one item.`);
    }

    if (tagsCount < 1) {
      error(`${rel}: tags must contain at least one item.`);
    }
  }
}

function checkCategoryPages() {
  const categoryFiles = listCategoryIndexFiles();
  if (categoryFiles.length === 0) {
    warn("No category index files found in categories/*/index.md.");
    return;
  }

  for (const categoryFile of categoryFiles) {
    const rel = normalizeRelative(categoryFile);
    const content = readFileSafe(categoryFile);
    if (!content) {
      error(`${rel}: unable to read file.`);
      continue;
    }

    const frontMatter = extractFrontMatter(content);
    if (!frontMatter) {
      error(`${rel}: missing valid front matter block.`);
      continue;
    }

    if (!hasField(frontMatter, "title")) {
      error(`${rel}: missing required field 'title'.`);
    }
    if (!hasField(frontMatter, "description")) {
      error(`${rel}: missing required field 'description'.`);
    }

    const seoTypeOk =
      /^seo:\s*\n(?:[ \t]+.*\n)*[ \t]+type:\s*["']?webpage["']?\s*$/m.test(frontMatter) ||
      /^seo:\s*\{\s*type:\s*["']?webpage["']?\s*\}\s*$/m.test(frontMatter);

    if (!seoTypeOk) {
      error(`${rel}: seo.type must be explicitly set to 'webpage'.`);
    }
  }
}

function parseLocsFromSitemap(sitemapContent) {
  const locs = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(sitemapContent)) !== null) {
    locs.push(match[1].trim());
  }
  return locs;
}

function urlToSitePath(urlValue) {
  try {
    const parsed = new URL(urlValue);
    let pathname = parsed.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";
    if (pathname === "") pathname = "/index.html";
    return path.join(projectRoot, "_site", pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

function checkSitemap() {
  if (buildUnavailableInLocal) {
    const configPath = path.join(projectRoot, "_config.yml");
    const config = readFileSafe(configPath);
    if (!config) {
      error("_config.yml not found while validating crawl boundary.");
      return [];
    }

    const requiredExcludes = ["node_modules/", "_site/"];
    for (const item of requiredExcludes) {
      if (!config.includes(`- ${item}`)) {
        error(`_config.yml exclude is missing '${item}'.`);
      }
    }

    warn("Skipped generated sitemap checks in local mode because Jekyll build is unavailable.");
    return [];
  }

  const sitemapPath = path.join(projectRoot, "_site", "sitemap.xml");
  const sitemap = readFileSafe(sitemapPath);
  if (!sitemap) {
    error("_site/sitemap.xml not found. Run a successful Jekyll build first.");
    return [];
  }

  const locs = parseLocsFromSitemap(sitemap);
  if (locs.length === 0) {
    error("_site/sitemap.xml has no <loc> entries.");
    return [];
  }

  const blockedSegments = [
    "/node_modules/",
    "/.git/",
    "/_site/",
    "/vendor/bundle/",
    "/scripts/",
    "/tmp/",
    "/.bundle/"
  ];

  for (const loc of locs) {
    for (const segment of blockedSegments) {
      if (loc.includes(segment)) {
        error(`sitemap contains excluded path segment '${segment}': ${loc}`);
      }
    }
  }

  return locs;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function expectSingleTag(filePath, text, label, regex) {
  const count = countMatches(text, regex);
  if (count !== 1) {
    error(`${normalizeRelative(filePath)}: expected exactly 1 ${label}, found ${count}.`);
  }
}

function checkRepresentativeHtml(locs) {
  const representativeFiles = [];
  representativeFiles.push(path.join(projectRoot, "_site", "index.html"));
  representativeFiles.push(path.join(projectRoot, "_site", "categories", "programming", "index.html"));

  const firstPostLoc = locs.find((loc) => loc.includes("/blog/"));
  if (firstPostLoc) {
    const postFile = urlToSitePath(firstPostLoc);
    if (postFile) representativeFiles.push(postFile);
  }

  const dedup = new Set(representativeFiles);
  for (const file of dedup) {
    const html = readFileSafe(file);
    if (!html) {
      error(`${normalizeRelative(file)}: representative HTML file not found.`);
      continue;
    }

    expectSingleTag(file, html, "<title>", /<title\b/gi);
    expectSingleTag(file, html, "meta description", /<meta[^>]+name=["']description["'][^>]*>/gi);
    expectSingleTag(file, html, "canonical link", /<link[^>]+rel=["']canonical["'][^>]*>/gi);
    expectSingleTag(file, html, "og:title", /<meta[^>]+property=["']og:title["'][^>]*>/gi);
    expectSingleTag(file, html, "twitter:title", /<meta[^>]+(?:property|name)=["']twitter:title["'][^>]*>/gi);
    expectSingleTag(file, html, "application/ld+json", /<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi);
  }
}

function runJekyllBuildIfRequested() {
  if (!shouldBuild) return;

  try {
    execSync("bundle exec jekyll build --quiet", {
      cwd: projectRoot,
      stdio: "pipe"
    });
    console.log("[seo-audit] Jekyll build completed.");
  } catch (buildError) {
    const stdout = buildError && buildError.stdout ? String(buildError.stdout) : "";
    const stderr = buildError && buildError.stderr ? String(buildError.stderr) : "";
    const output = `${stdout}\n${stderr}`.trim();

    if (isCi) {
      error(`Jekyll build failed in CI mode. ${output || "No build log captured."}`);
      return;
    }

    buildUnavailableInLocal = true;
    warn("Jekyll build failed locally. Falling back to existing _site output for audit.");
    if (output) {
      warn(`build output: ${output.split("\n")[0]}`);
    }
  }
}

function printSummary() {
  console.log(`[seo-audit] mode=${isCi ? "ci" : "local"}`);
  console.log(`[seo-audit] warnings=${warnings.length}, errors=${errors.length}`);

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const message of warnings) {
      console.log(`- ${message}`);
    }
  }

  if (errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const message of errors) {
      console.log(`- ${message}`);
    }
  }
}

function main() {
  runJekyllBuildIfRequested();
  checkPosts();
  checkCategoryPages();
  const locs = checkSitemap();
  if (!buildUnavailableInLocal) {
    checkRepresentativeHtml(locs);
  } else {
    warn("Skipped representative HTML duplicate-meta checks in local mode.");
  }
  printSummary();

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
