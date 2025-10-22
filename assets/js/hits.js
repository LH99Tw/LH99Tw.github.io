(() => {
  const statsEl = document.querySelector(".site-footer__stats");
  if (!statsEl) return;

  const base = statsEl.dataset.hitsBase || window.location.origin;
  const todayEl = statsEl.querySelector("[data-hit-today]");
  const totalEl = statsEl.querySelector("[data-hit-total]");

  const todayKey = `${base.replace(/\/$/, "")}/hits/${new Date().toISOString().slice(0, 10)}`;
  const totalKey = `${base.replace(/\/$/, "")}/hits/total`;

  fetchCount(todayKey)
    .then((count) => updateDisplay(todayEl, count))
    .catch(() => updateDisplay(todayEl, "??"));

  fetchCount(totalKey)
    .then((count) => updateDisplay(totalEl, count))
    .catch(() => updateDisplay(totalEl, "??"));

  function updateDisplay(el, value) {
    if (!el) return;
    el.textContent = typeof value === "number" ? value.toLocaleString() : value;
  }

  async function fetchCount(key) {
    const endpoint = `https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=${encodeURIComponent(key)}&count_bg=%23000000&title_bg=%23000000&title=hits`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch hits");
    const svg = await response.text();
    const matches = [...svg.matchAll(/<text[^>]*>([\d,]+)<\/text>/g)];
    if (!matches.length) throw new Error("No hit data");
    const last = matches[matches.length - 1][1];
    return parseInt(last.replace(/,/g, ""), 10);
  }
})();
