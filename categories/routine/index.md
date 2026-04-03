---
title: "루틴"
description: "생산성과 컨디션을 높이기 위한 루틴 실험 기록을 정리합니다."
layout: default
category: routine
category_board: true
hide_topbar: true
seo:
  type: webpage
---

{% assign board_posts = site.posts | where_exp: "post", "post.categories contains 'routine'" | sort: 'date' | reverse %}

<section class="category-board" data-category-board data-per-page="8">
  <header class="cat-page-header">
    <h1 class="cat-page-header__title">일상</h1>
    <span class="cat-page-header__count">{{ board_posts.size }}편</span>
  </header>

  <nav class="filter-row" aria-label="카테고리 필터">
    <a class="filter-tab" href="{{ '/categories/daily/' | relative_url }}">전체</a>
    <a class="filter-tab active" href="{{ '/categories/routine/' | relative_url }}">루틴</a>
    <a class="filter-tab" href="{{ '/categories/hobby/' | relative_url }}">취미</a>
    <a class="filter-tab" href="{{ '/categories/journal/' | relative_url }}">회고</a>
  </nav>

  <div class="category-board__list">
    <div class="list-header">
      <span>카테고리</span>
      <span>글 제목</span>
      <span>날짜</span>
    </div>

    <div class="category-rows" data-category-rows>
      {% if board_posts.size > 0 %}
        {% for post in board_posts %}
          <a class="post-item" href="{{ post.url | relative_url }}">
            <span class="post-item__cat">루틴</span>
            <span class="post-item__title">{{ post.title }}</span>
            <time class="post-item__date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y.%m.%d" }}</time>
          </a>
        {% endfor %}
      {% else %}
        <div class="post-list__empty">등록된 포스트가 없습니다.</div>
      {% endif %}
    </div>

    <div class="pagination" data-category-pagination></div>
  </div>
</section>
