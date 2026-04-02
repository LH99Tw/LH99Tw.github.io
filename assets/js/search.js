(() => {
  const resultsContainer = document.querySelector("[data-search-results]");
  const statusElement = document.querySelector("[data-search-status]");
  const input = document.querySelector("[data-search-input]");
  const endpoint = resultsContainer ? resultsContainer.dataset.searchEndpoint : null;

  if (!resultsContainer || !endpoint) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") || "").trim();

  if (input && query) {
    input.value = query;
  }

  if (!query) {
    updateStatus("검색어를 입력하면 결과가 표시됩니다.");
    renderEmptyRow("검색어를 입력하면 결과가 표시됩니다.");
    return;
  }

  updateStatus("검색 중입니다...");

  fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error("검색 데이터를 불러오지 못했습니다.");
      }
      return response.json();
    })
    .then((posts) => {
      const normalizedQuery = normalize(query);
      const filtered = posts.filter((post) => {
        const haystack = [
          post.title || "",
          post.excerpt || "",
          ...(post.tags || []),
          ...(post.categories || [])
        ]
          .map(normalize)
          .join(" ");
        return haystack.includes(normalizedQuery);
      });

      renderResults(filtered, query);
    })
    .catch((error) => {
      console.error(error);
      updateStatus("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      renderEmptyRow("검색 데이터를 불러오지 못했습니다.");
    });

  function normalize(text) {
    return String(text).toLowerCase();
  }

  function updateStatus(message) {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.hidden = !message;
    }
  }

  function renderResults(posts, keyword) {
    resultsContainer.innerHTML = "";

    if (!posts.length) {
      updateStatus(`'${keyword}'에 대한 결과가 없습니다.`);
      renderEmptyRow("검색 결과가 없습니다.");
      return;
    }

    updateStatus(`${posts.length}개의 결과가 있습니다.`);

    const fragment = document.createDocumentFragment();

    posts.forEach((post) => {
      const row = document.createElement("article");
      row.className = "search-row";

      const title = document.createElement("a");
      title.href = post.url;
      title.className = "search-row__title";
      title.textContent = post.title || "제목 없음";
      title.setAttribute("aria-label", `${post.title || "제목 없음"} 페이지 열기`);

      const date = document.createElement("time");
      date.className = "search-row__date";
      date.dateTime = post.date || "";
      date.textContent = formatDate(post.date);

      row.appendChild(title);
      row.appendChild(date);
      fragment.appendChild(row);
    });

    resultsContainer.appendChild(fragment);
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateString);
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  function renderEmptyRow(message) {
    const row = document.createElement("div");
    row.className = "search-row search-row--empty";
    row.textContent = message;
    resultsContainer.appendChild(row);
  }
})();
