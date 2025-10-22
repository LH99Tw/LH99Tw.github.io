---
title: "검색 결과"
description: "블로그 게시물 검색 결과 페이지"
search_page: true
---

<section class="search-page">
  <h1>검색 결과</h1>
  <form class="search-page__form" action="{{ '/search/' | relative_url }}" method="get" role="search">
    <label class="sidebar-search__label" for="search-page-input">검색어</label>
    <input id="search-page-input" class="search-page__input" type="search" name="q" placeholder="검색어를 입력하세요" data-search-input />
    <button class="search-page__button" type="submit">검색</button>
  </form>

  <p class="search-page__status" data-search-status>검색어를 입력하면 결과가 표시됩니다.</p>

  <div
    class="search-results"
    data-search-results
    data-search-endpoint="{{ '/search.json' | relative_url }}"
  ></div>
</section>
