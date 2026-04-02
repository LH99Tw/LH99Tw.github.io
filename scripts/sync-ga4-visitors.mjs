import fs from "node:fs/promises";
import path from "node:path";

const propertyId = (process.env.GA4_PROPERTY_ID || "").trim();
const accessToken = (process.env.GA4_ACCESS_TOKEN || "").trim();
const timezone = (process.env.GA4_TIMEZONE || "Asia/Seoul").trim();
const firstDate = (process.env.GA4_FIRST_DATE || "2024-01-01").trim();
const outputPath = process.env.GA4_OUTPUT_FILE || "_data/ga4_visitors.yml";

if (!propertyId) {
  throw new Error("GA4_PROPERTY_ID is required.");
}
if (!accessToken) {
  throw new Error("GA4_ACCESS_TOKEN is required.");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function toYaml(stats) {
  return [
    "# AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.",
    "# Updated by `.github/workflows/sync-ga4-visitors.yml`",
    `today: "${stats.today}"`,
    `total: "${stats.total}"`,
    `updated_at: "${stats.updatedAt}"`,
    `timezone: "${stats.timezone}"`,
    ""
  ].join("\n");
}

async function runReport(dateRange, metricName) {
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      dateRanges: [dateRange],
      metrics: [{ name: metricName }],
      returnPropertyQuota: false
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GA4 runReport failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const value = Number(
    payload?.rows?.[0]?.metricValues?.[0]?.value ||
      payload?.totals?.[0]?.metricValues?.[0]?.value ||
      0
  );
  if (!Number.isFinite(value)) return 0;
  return value;
}

async function main() {
  const [todayUsers, totalUsers] = await Promise.all([
    runReport({ startDate: "today", endDate: "today" }, "activeUsers"),
    runReport({ startDate: firstDate, endDate: "today" }, "totalUsers")
  ]);

  const stats = {
    today: formatNumber(todayUsers),
    total: formatNumber(totalUsers),
    updatedAt: new Date().toISOString(),
    timezone
  };

  const abs = path.resolve(outputPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, toYaml(stats), "utf8");

  console.log(`Updated ${outputPath}: today=${stats.today}, total=${stats.total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
