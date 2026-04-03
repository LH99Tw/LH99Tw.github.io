---
title: "투자전략"
description: "자산배분, 리스크 관리, 리밸런싱 전략을 정리한 카테고리입니다."
layout: default
category: investment-strategy
category_board: true
hide_topbar: true
seo:
  type: webpage
---

{% assign board_posts = site.posts | where_exp: "post", "post.categories contains 'investment-strategy'" | sort: 'date' | reverse %}

<section class="category-board" data-category-board data-per-page="8">
  <header class="cat-page-header">
    <h1 class="cat-page-header__title">금융</h1>
    <span class="cat-page-header__count">{{ board_posts.size }}편</span>
  </header>

  <nav class="filter-row" aria-label="카테고리 필터">
    <a class="filter-tab" href="{{ '/categories/finance/' | relative_url }}">전체</a>
    <a class="filter-tab" href="{{ '/categories/investment-journal/' | relative_url }}">투자일지</a>
    <a class="filter-tab active" href="{{ '/categories/investment-strategy/' | relative_url }}">투자전략</a>
    <a class="filter-tab" href="{{ '/categories/economy-note/' | relative_url }}">시장 메모</a>
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
            <span class="post-item__cat">투자전략</span>
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
