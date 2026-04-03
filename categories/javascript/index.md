---
title: "JavaScript"
layout: default
category: javascript
category_board: true
hide_topbar: true
---

{% assign board_posts = site.posts | where_exp: "post", "post.categories contains 'javascript'" | sort: 'date' | reverse %}

<section class="category-board" data-category-board data-per-page="8">
  <header class="cat-page-header">
    <h1 class="cat-page-header__title">프로그래밍</h1>
    <span class="cat-page-header__count">{{ board_posts.size }}편</span>
  </header>

  <nav class="filter-row" aria-label="카테고리 필터">
    <a class="filter-tab" href="{{ '/categories/programming/' | relative_url }}">전체</a>
    <a class="filter-tab" href="{{ '/categories/ai/' | relative_url }}">AI</a>
    <a class="filter-tab" href="{{ '/categories/algorithm/' | relative_url }}">Algorithm</a>
    <a class="filter-tab active" href="{{ '/categories/javascript/' | relative_url }}">JS</a>
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
            <span class="post-item__cat">JS</span>
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
