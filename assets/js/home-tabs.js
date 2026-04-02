(() => {
  const tabs = Array.from(document.querySelectorAll(".cat-tab"));
  const indicator = document.getElementById("catIndicator");
  const contentLeft = document.querySelector(".content-left");
  const catBlock = document.querySelector(".cat-block");
  const catTabs = document.getElementById("catTabs");
  const phone = document.querySelector(".iphone");
  const globalSearchInput = document.getElementById("global-search-input");
  const homeSearchMeta = document.getElementById("homeSearchMeta");
  const homeSearchResults = document.getElementById("homeSearchResults");
  const homeSearchStatus = document.getElementById("homeSearchStatus");
  const homeSearchList = document.getElementById("homeSearchList");
  const homeSearchPager = document.getElementById("homeSearchPager");
  const homeSearchPrev = document.getElementById("homeSearchPrev");
  const homeSearchNext = document.getElementById("homeSearchNext");
  const homeSearchPageText = document.getElementById("homeSearchPageText");
  const searchEndpoint = globalSearchInput ? globalSearchInput.dataset.searchEndpoint : null;
  const globalSearchForm = globalSearchInput ? globalSearchInput.closest("form") : null;

  if (!tabs.length || !indicator || !contentLeft || !catBlock || !catTabs || !phone) {
    return;
  }

  const items = tabs
    .map((tab) => ({
      tab,
      panel: document.getElementById(`panel-${tab.dataset.target}`)
    }))
    .filter((item) => item.panel);

  if (!items.length) {
    return;
  }

  let current = Math.max(
    0,
    items.findIndex((item) => item.tab.classList.contains("active"))
  );
  let timer = null;
  let searchMode = false;
  let searchDataPromise = null;
  let inputDebounce = null;
  let searchedPosts = [];
  let searchedQuery = "";
  let searchPage = 1;
  const SEARCH_PAGE_SIZE = 5;
  const PHONE_FIXED_HEIGHT = 456;

  // Always start in non-search mode UI.
  catTabs.classList.remove("cat-tabs--searching");
  if (homeSearchMeta) {
    homeSearchMeta.hidden = true;
  }
  if (homeSearchPager) {
    homeSearchPager.hidden = true;
  }
  if (homeSearchResults) {
    homeSearchResults.hidden = true;
  }

  function syncWidgetHeight() {
    phone.style.height = `${PHONE_FIXED_HEIGHT}px`;
  }

  function syncIndicator() {
    if (searchMode) {
      return;
    }
    const activeTab = items[current].tab;
    indicator.style.left = `${activeTab.offsetLeft}px`;
    indicator.style.width = `${activeTab.offsetWidth}px`;
  }

  function activate(index, fromClick = false) {
    if (searchMode) {
      return;
    }

    items[current].tab.classList.remove("active");
    items[current].panel.classList.remove("active");

    current = index;

    items[current].tab.classList.add("active");
    items[current].panel.classList.add("active");

    syncIndicator();
    requestAnimationFrame(syncWidgetHeight);

    if (fromClick) {
      restartAutoSlide();
    }
  }

  function advance() {
    if (searchMode) {
      return;
    }
    activate((current + 1) % items.length);
  }

  function stopAutoSlide() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restartAutoSlide() {
    stopAutoSlide();
    timer = setInterval(advance, 5000);
  }

  function normalize(text) {
    return String(text || "").toLowerCase();
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "--.--";
    }
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateString).replace(/-/g, ".").slice(5);
    }
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${month}.${day}`;
  }

  function ensureSearchData() {
    if (!searchEndpoint) {
      return Promise.resolve([]);
    }
    if (searchDataPromise) {
      return searchDataPromise;
    }

    searchDataPromise = fetch(searchEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error("검색 데이터를 불러오지 못했습니다.");
        }
        return response.json();
      })
      .catch((error) => {
        console.error(error);
        return [];
      });

    return searchDataPromise;
  }

  function enterSearchMode() {
    if (searchMode || !homeSearchResults) {
      return;
    }

    searchMode = true;
    stopAutoSlide();
    catTabs.classList.add("cat-tabs--searching");
    items.forEach((item) => item.panel.classList.remove("active"));
    if (homeSearchMeta) {
      homeSearchMeta.hidden = false;
    }
    homeSearchResults.hidden = false;
    syncWidgetHeight();
  }

  function exitSearchMode() {
    if (!searchMode || !homeSearchResults) {
      return;
    }

    searchMode = false;
    searchedPosts = [];
    searchedQuery = "";
    searchPage = 1;
    homeSearchResults.hidden = true;
    catTabs.classList.remove("cat-tabs--searching");
    if (homeSearchMeta) {
      homeSearchMeta.hidden = true;
    }
    if (homeSearchPager) {
      homeSearchPager.hidden = true;
    }
    activate(current);
    restartAutoSlide();
  }

  function clearSearchRows() {
    if (homeSearchList) {
      homeSearchList.innerHTML = "";
    }
  }

  function setSearchStatus(message) {
    if (homeSearchStatus) {
      homeSearchStatus.textContent = message;
    }
  }

  function appendEmptySearchRow(message) {
    if (!homeSearchList) {
      return;
    }
    const row = document.createElement("div");
    row.className = "cat-post cat-post--empty";
    row.textContent = message;
    homeSearchList.appendChild(row);
  }

  function getTotalSearchPages() {
    return Math.max(1, Math.ceil(searchedPosts.length / SEARCH_PAGE_SIZE));
  }

  function updatePager() {
    if (!homeSearchPager || !homeSearchPrev || !homeSearchNext || !homeSearchPageText) {
      return;
    }

    const totalPages = getTotalSearchPages();
    homeSearchPager.hidden = searchedPosts.length === 0 || totalPages <= 1;
    homeSearchPageText.textContent = `${searchPage} / ${totalPages}`;
    homeSearchPrev.disabled = searchPage <= 1;
    homeSearchNext.disabled = searchPage >= totalPages;
  }

  function renderSearchRows() {
    clearSearchRows();

    if (!searchedPosts.length) {
      setSearchStatus(`'${searchedQuery}' 결과가 없습니다.`);
      updatePager();
      appendEmptySearchRow("일치하는 게시물이 없습니다.");
      syncWidgetHeight();
      return;
    }

    setSearchStatus(`'${searchedQuery}' 검색 결과 ${searchedPosts.length}개`);

    const totalPages = getTotalSearchPages();
    if (searchPage > totalPages) {
      searchPage = totalPages;
    }

    const start = (searchPage - 1) * SEARCH_PAGE_SIZE;
    const pagePosts = searchedPosts.slice(start, start + SEARCH_PAGE_SIZE);

    pagePosts.forEach((post) => {
      const row = document.createElement("a");
      row.className = "cat-post cat-post--search";
      row.href = post.url;

      const title = document.createElement("span");
      title.className = "cat-post__title cat-post__title--search";
      title.textContent = post.title || "제목 없음";

      const date = document.createElement("span");
      date.className = "cat-post__date cat-post__date--search";
      date.textContent = formatDate(post.date);

      row.appendChild(title);
      row.appendChild(date);

      homeSearchList.appendChild(row);
    });

    updatePager();
    syncWidgetHeight();
  }

  function goToSearchPage(page) {
    if (!searchedPosts.length) {
      return;
    }

    const totalPages = getTotalSearchPages();
    const nextPage = Math.max(1, Math.min(totalPages, page));
    if (nextPage === searchPage) {
      return;
    }

    searchPage = nextPage;
    renderSearchRows();
  }

  async function applyLiveSearch(rawQuery) {
    if (!globalSearchInput || !homeSearchResults || !homeSearchStatus || !homeSearchList) {
      return;
    }

    const query = rawQuery.trim();
    if (!query) {
      exitSearchMode();
      return;
    }

    enterSearchMode();
    setSearchStatus(`'${query}' 검색 중...`);
    clearSearchRows();
    if (homeSearchPager) {
      homeSearchPager.hidden = true;
    }

    const queryAtRequest = normalize(query);
    const posts = await ensureSearchData();
    if (normalize(globalSearchInput.value.trim()) !== queryAtRequest) {
      return;
    }

    const keywords = queryAtRequest.split(/\s+/).filter(Boolean);
    const filtered = posts.filter((post) => {
      const haystack = [
        post.title || "",
        post.excerpt || "",
        ...(post.tags || []),
        ...(post.categories || [])
      ]
        .map(normalize)
        .join(" ");

      return keywords.every((word) => haystack.includes(word));
    });

    searchedPosts = filtered;
    searchedQuery = query;
    searchPage = 1;
    renderSearchRows();
  }

  items.forEach((item, index) => {
    item.tab.addEventListener("click", () => {
      if (searchMode) {
        if (globalSearchInput) {
          globalSearchInput.value = "";
        }
        exitSearchMode();
      }
      activate(index, true);
    });
  });

  window.addEventListener("resize", () => {
    syncIndicator();
    syncWidgetHeight();
  });

  if (globalSearchInput && homeSearchResults && homeSearchStatus && homeSearchList) {
    if (homeSearchPrev) {
      homeSearchPrev.addEventListener("click", () => goToSearchPage(searchPage - 1));
    }

    if (homeSearchNext) {
      homeSearchNext.addEventListener("click", () => goToSearchPage(searchPage + 1));
    }

    globalSearchInput.addEventListener("input", () => {
      if (inputDebounce) {
        clearTimeout(inputDebounce);
      }
      inputDebounce = setTimeout(() => {
        applyLiveSearch(globalSearchInput.value);
      }, 120);
    });

    globalSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        globalSearchInput.value = "";
        applyLiveSearch("");
      }
    });

    if (globalSearchForm) {
      globalSearchForm.addEventListener("submit", (event) => {
        if (globalSearchInput.value.trim()) {
          event.preventDefault();
          applyLiveSearch(globalSearchInput.value);
        }
      });
    }

    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) {
      globalSearchInput.value = initialQuery;
      applyLiveSearch(initialQuery);
    }
  }

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(syncWidgetHeight);
    observer.observe(contentLeft);
    observer.observe(catBlock);
  }

  requestAnimationFrame(() => {
    syncIndicator();
    syncWidgetHeight();
  });

  restartAutoSlide();
})();
