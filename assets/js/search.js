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
      return;
    }

    updateStatus(`${posts.length}개의 결과가 있습니다.`);

    posts.forEach((post) => {
      const article = document.createElement("article");
      article.className = "search-result";

      const link = document.createElement("a");
      link.href = post.url;
      link.className = "search-result__title";
      link.textContent = post.title;
      link.setAttribute("aria-label", `${post.title} 페이지 열기`);

      const heading = document.createElement("h2");
      heading.className = "search-result__title";
      heading.appendChild(link);

      const meta = document.createElement("p");
      meta.className = "search-result__meta";
      meta.textContent = post.date;

      const excerpt = document.createElement("p");
      excerpt.className = "search-result__excerpt";
      excerpt.textContent = post.excerpt;

      const tagsWrapper = document.createElement("div");
      tagsWrapper.className = "search-result__tags";

      (post.tags || []).forEach((tag) => {
        const tagEl = document.createElement("span");
        tagEl.className = "search-result__tag";
        tagEl.textContent = tag;
        tagsWrapper.appendChild(tagEl);
      });

      article.appendChild(heading);
      article.appendChild(meta);
      article.appendChild(excerpt);

      if (tagsWrapper.childElementCount > 0) {
        article.appendChild(tagsWrapper);
      }

      resultsContainer.appendChild(article);
    });
  }
})();
