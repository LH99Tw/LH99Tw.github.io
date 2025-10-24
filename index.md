---
title: "이주한's Gitblog"
description: "AI & 금융 관련 포스팅"
---

<section class="hero">
  <p class="hero__subtitle">Jekyll & GitHub Pages</p>
  <h1 class="hero__title">{{ site.title }}</h1>
  <p class="hero__description">
    AI와 금융에 관한 이야기를 다루는 공간입니다. 통찰과 기록을 꾸준히 공유합니다.
  </p>
  <a class="hero__cta" href="{{ '/#recent-posts' | relative_url }}">최근 포스트 보기</a>
</section>

<section id="recent-posts" class="section">
  <h2 class="section__title">최근 포스트</h2>
  <ul class="post-list">
    {% if site.posts.size > 0 %}
      {% for post in site.posts limit:5 %}
        <li class="post-list__item">
          <a href="{{ post.url | relative_url }}" class="post-list__link">
            <div class="post-list__header">
              <h3>{{ post.title }}</h3>
              <time datetime="{{ post.date | date_to_xmlschema }}">
                {{ post.date | date: "%Y.%m.%d" }}
              </time>
            </div>
            <p>{{ post.description | default: post.excerpt | strip_html | truncate: 120 }}</p>
            {% if post.tags and post.tags.size > 0 %}
              <div class="post-list__tags">
                {% for tag in post.tags %}
                  <span class="post-list__tag">{{ tag }}</span>
                {% endfor %}
              </div>
            {% endif %}
          </a>
        </li>
      {% endfor %}
    {% else %}
      <li class="post-list__empty">
        아직 포스트가 없습니다. 첫 기록을 작성해보세요!
      </li>
    {% endif %}
  </ul>
</section>
