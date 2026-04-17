---
title: "사이트 맵"
description: "블로그 전체 글과 카테고리를 한 페이지에서 확인할 수 있는 링크 허브입니다."
layout: default
seo:
  type: webpage
---

{% assign posts_sorted = site.posts | sort: "date" | reverse %}

## 카테고리 허브

- [프로그래밍]({{ '/categories/programming/' | relative_url }})
- [금융]({{ '/categories/finance/' | relative_url }})
- [일상]({{ '/categories/daily/' | relative_url }})

## 전체 포스트

{% if posts_sorted.size > 0 %}
<ul>
{% for post in posts_sorted %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <small>({{ post.date | date: "%Y.%m.%d" }})</small></li>
{% endfor %}
</ul>
{% else %}
등록된 포스트가 없습니다.
{% endif %}
