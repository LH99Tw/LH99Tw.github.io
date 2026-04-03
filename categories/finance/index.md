---
title: "금융"
layout: default
category_board: true
hide_topbar: true
---

{% assign journal_posts = site.posts | where_exp: "post", "post.categories contains 'investment-journal'" %}
{% assign strategy_posts = site.posts | where_exp: "post", "post.categories contains 'investment-strategy'" %}
{% assign economy_posts = site.posts | where_exp: "post", "post.categories contains 'economy-note'" %}
{% assign board_posts = journal_posts | concat: strategy_posts | concat: economy_posts | uniq | sort: 'date' | reverse %}

<section class="category-board" data-category-board data-per-page="8">
  <header class="cat-page-header">
    <h1 class="cat-page-header__title">금융</h1>
    <span class="cat-page-header__count">{{ board_posts.size }}편</span>
  </header>

  <nav class="filter-row" aria-label="카테고리 필터">
    <a class="filter-tab active" href="{{ '/categories/finance/' | relative_url }}">전체</a>
    <a class="filter-tab" href="{{ '/categories/investment-journal/' | relative_url }}">투자일지</a>
    <a class="filter-tab" href="{{ '/categories/investment-strategy/' | relative_url }}">투자전략</a>
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
          {% assign row_label = '기타' %}
          {% if post.categories contains 'investment-journal' %}
            {% assign row_label = '투자일지' %}
          {% elsif post.categories contains 'investment-strategy' %}
            {% assign row_label = '투자전략' %}
          {% elsif post.categories contains 'economy-note' %}
            {% assign row_label = '시장 메모' %}
          {% endif %}
          <a class="post-item" href="{{ post.url | relative_url }}">
            <span class="post-item__cat">{{ row_label }}</span>
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
