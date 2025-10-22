(() => {
  const statsEl = document.querySelector(".site-footer__stats");
  if (!statsEl) return;

  const todayEl = statsEl.querySelector("[data-hit-today]");
  const totalEl = statsEl.querySelector("[data-hit-total]");

  const base = statsEl.dataset.hitsBase || window.location.origin;
  const namespace = sanitize(base);
  const today = new Date().toISOString().slice(0, 10);

  loadCount(`total`, totalEl);
  loadCount(`today-${today}`, todayEl);

  function sanitize(value) {
    return value.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function updateDisplay(el, value) {
    if (!el) return;
    el.textContent = typeof value === "number" ? value.toLocaleString() : value;
  }

  async function loadCount(key, el) {
    try {
      const value = await fetchCount(key);
      updateDisplay(el, value);
    } catch (error) {
      console.warn(`[hits] ${error.message}`);
      updateDisplay(el, "0");
    }
  }

  async function fetchCount(key) {
    const endpoint = `https://api.countapi.xyz/hit/${namespace}/${key}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!("value" in data)) throw new Error("Invalid response payload");
    return data.value;
  }
})();
