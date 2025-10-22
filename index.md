---
title: "GitHub Blog 시작하기"
description: "LH99Tw의 개발 학습과 프로젝트를 기록하는 공간입니다."
---

<section class="hero">
  <p class="hero__subtitle">Jekyll & GitHub Pages</p>
  <h1 class="hero__title">{{ site.title }}</h1>
  <p class="hero__description">
    이 블로그는 학습 기록과 프로젝트 회고를 남기기 위한 공간입니다. 꾸준한 기록으로 성장 여정을 공유합니다.
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
