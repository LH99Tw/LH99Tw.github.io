---
title: "이주한's Gitblog"
description: "AI와 금융 인사이트를 기록하는 개발 블로그"
home_preview: true
seo:
  type: webpage
---

<div class="content-body">
  <div class="content-left">
    <div class="banner">
      <img
        class="banner__image"
        src="{{ '/assets/images/banner-nature-warm.png' | relative_url }}"
        alt="노을빛 산과 숲 풍경"
        loading="eager"
      />
      <div class="banner__label">Banner</div>
    </div>

    <div class="cat-block">
      <div class="cat-tabs" id="catTabs">
        <button class="cat-tab active" data-target="programming">프로그래밍</button>
        <button class="cat-tab" data-target="finance">금융</button>
        <button class="cat-tab" data-target="daily">일상</button>
        <div class="cat-tabs__search-meta" id="homeSearchMeta" hidden>
          <span class="cat-tabs__search-label" id="homeSearchStatus">검색 결과</span>
          <div class="cat-tabs__pager" id="homeSearchPager" hidden>
            <button class="cat-tabs__pager-btn" id="homeSearchPrev" type="button" aria-label="이전 페이지">‹</button>
            <span class="cat-tabs__pager-text" id="homeSearchPageText">1 / 1</span>
            <button class="cat-tabs__pager-btn" id="homeSearchNext" type="button" aria-label="다음 페이지">›</button>
          </div>
        </div>
        <span class="cat-indicator" id="catIndicator"></span>
      </div>

      <div class="cat-search" id="homeSearchResults" hidden>
        <div class="cat-search__list" id="homeSearchList"></div>
      </div>

      {% assign program_ai_posts = site.posts | where_exp: "post", "post.categories contains 'ai'" %}
      {% assign program_algo_posts = site.posts | where_exp: "post", "post.categories contains 'algorithm'" %}
      {% assign program_js_posts = site.posts | where_exp: "post", "post.categories contains 'javascript'" %}
      {% assign programming_posts = program_ai_posts | concat: program_algo_posts | concat: program_js_posts | uniq | sort: 'date' | reverse %}
      <div class="cat-panel active" id="panel-programming">
        {% if programming_posts.size > 0 %}
          {% for post in programming_posts limit: 5 %}
            <a class="cat-post" href="{{ post.url | relative_url }}">
              <span class="cat-post__num">{{ forloop.index }}</span>
              <span class="cat-post__title">{{ post.title }}</span>
              <span class="cat-post__date">{{ post.date | date: "%m.%d" }}</span>
            </a>
          {% endfor %}
        {% else %}
          <div class="cat-post cat-post--empty">등록된 글이 없습니다.</div>
        {% endif %}
      </div>

      {% assign finance_journal_posts = site.posts | where_exp: "post", "post.categories contains 'investment-journal'" %}
      {% assign finance_strategy_posts = site.posts | where_exp: "post", "post.categories contains 'investment-strategy'" %}
      {% assign finance_economy_posts = site.posts | where_exp: "post", "post.categories contains 'economy-note'" %}
      {% assign finance_posts = finance_journal_posts | concat: finance_strategy_posts | concat: finance_economy_posts | uniq | sort: 'date' | reverse %}
      <div class="cat-panel" id="panel-finance">
        {% if finance_posts.size > 0 %}
          {% for post in finance_posts limit: 5 %}
            <a class="cat-post" href="{{ post.url | relative_url }}">
              <span class="cat-post__num">{{ forloop.index }}</span>
              <span class="cat-post__title">{{ post.title }}</span>
              <span class="cat-post__date">{{ post.date | date: "%m.%d" }}</span>
            </a>
          {% endfor %}
        {% else %}
          <div class="cat-post cat-post--empty">등록된 글이 없습니다.</div>
        {% endif %}
      </div>

      {% assign daily_routine_posts = site.posts | where_exp: "post", "post.categories contains 'routine'" %}
      {% assign daily_hobby_posts = site.posts | where_exp: "post", "post.categories contains 'hobby'" %}
      {% assign daily_journal_posts = site.posts | where_exp: "post", "post.categories contains 'journal'" %}
      {% assign daily_posts = daily_routine_posts | concat: daily_hobby_posts | concat: daily_journal_posts | uniq | sort: 'date' | reverse %}
      <div class="cat-panel" id="panel-daily">
        {% if daily_posts.size > 0 %}
          {% for post in daily_posts limit: 5 %}
            <a class="cat-post" href="{{ post.url | relative_url }}">
              <span class="cat-post__num">{{ forloop.index }}</span>
              <span class="cat-post__title">{{ post.title }}</span>
              <span class="cat-post__date">{{ post.date | date: "%m.%d" }}</span>
            </a>
          {% endfor %}
        {% else %}
          <div class="cat-post cat-post--empty">등록된 글이 없습니다.</div>
        {% endif %}
      </div>

    </div>
  </div>

  <div class="widget-col">
    <div class="iphone">
      <div class="iphone__island"></div>
      <div class="iphone__screen">
        <div class="th-header">
          <img src="{{ '/assets/images/mainpage/threads.png' | relative_url }}" alt="" aria-hidden="true" />
          <span class="th-header__title">@{{ site.threads_username | default: 'hhannn001' }} · reposts</span>
        </div>

        {% assign avatar_palette = "#EDE3DC|#E8E0DA|#F0ECE8|#E5E5EA|#F5F5F5" | split: "|" %}
        {% assign threads_reposts = site.data.threads_reposts | default: empty %}
        {% if threads_reposts.size > 0 %}
          {% for item in threads_reposts limit: 6 %}
            {% assign color_index = forloop.index0 | modulo: avatar_palette.size %}
            {% assign avatar_color = item.avatar_color | default: avatar_palette[color_index] %}
            <div class="th-post">
              <div class="th-post__meta">
                <div class="th-post__avatar" style="background: {{ avatar_color }}"></div>
                <span class="th-post__name">{{ item.author | default: "threads_user" }}</span>
                <span class="th-post__time">{{ item.time | default: "now" }}</span>
              </div>
              {% assign item_text = item.text | default: "리포스트 데이터를 추가하면 이 영역에 표시됩니다." | truncate: 72 %}
              {% if item.url %}
                <p class="th-post__text"><a href="{{ item.url }}" target="_blank" rel="noopener">{{ item_text }}</a></p>
              {% else %}
                <p class="th-post__text">{{ item_text }}</p>
              {% endif %}
              <div class="th-post__repost">↻ {{ item.repost_label | default: site.profile.name | default: "이주한" }}이 리포스트</div>
            </div>
          {% endfor %}
        {% else %}
          <div class="th-post">
            <div class="th-post__meta">
              <div class="th-post__avatar"></div>
              <span class="th-post__name">threads</span>
              <span class="th-post__time">today</span>
            </div>
            <p class="th-post__text">_data/threads_reposts.yml 파일에 항목을 추가하면 이 영역에 표시됩니다.</p>
            <div class="th-post__repost">↻ 리포스트 목록 대기중</div>
          </div>
        {% endif %}
      </div>
      <div class="iphone__home"></div>
    </div>
  </div>
</div>
