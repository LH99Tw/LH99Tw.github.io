---
title: "카테고리 관리"
sidebar_label: "카테고리 관리"
category: management
description: "블로그 카테고리를 관리하고 새로운 항목을 추가할 수 있습니다."
---

# 📁 카테고리 관리

현재 운영 중인 카테고리들을 관리하고 새로운 항목을 추가할 수 있습니다.

## 🏷️ 현재 카테고리들

{% for category in site.data.categories.categories %}
### {{ category[0] }}
**설명:** {{ category[1].description }}

{% if category[1].items.size > 0 %}
**최근 게시글:**
{% for item in category[1].items limit:5 %}
- [{{ item.title }}]({{ item.url | relative_url }}) - {{ item.date | date: "%Y년 %m월 %d일" }}
{% endfor %}
{% else %}
*아직 작성된 게시글이 없습니다.*
{% endif %}

---
{% endfor %}

## ➕ 새 카테고리 추가

새로운 카테고리를 만들려면 `_data/categories.yml` 파일을 수정해주세요.

```yaml
categories:
  새카테고리명:
    description: "카테고리 설명을 입력하세요"
    items: []
```

## 📝 카테고리에 항목 추가

기존 카테고리에 새 항목을 추가하려면:

1. `_data/categories.yml` 파일을 열기
2. 해당 카테고리의 `items` 배열에 새 항목 추가

```yaml
items:
  - title: "새 게시글 제목"
    url: "/blog/2025/10/23/new-post"
    date: "2025-10-23"
```

## 🔧 데이터 파일 위치

카테고리 데이터는 `_data/categories.yml` 파일에서 관리됩니다. 이 파일을 수정하면 사이드바에 자동으로 반영됩니다.
