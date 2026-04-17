---
title: "GSC Action Setup"
description: "GitHub Actions로 Google Search Console URL 검사 및 Indexing API 요청 파이프라인을 설정하는 방법"
sitemap: false
robots: "noindex, nofollow"
---

# GSC Action Setup

이 문서는 아래 워크플로를 실행하기 위한 필수 설정을 정리합니다.

- `.github/workflows/gsc-inspect-and-index.yml` (수동 점검/요청)
- `.github/workflows/gsc-weekly-content-reindex.yml` (주간 배치)
- `.github/workflows/gsc-post-crud-index.yml` (포스트 CRUD 이벤트)

## 1) 워크플로 기능

- URL Inspection API로 `sitemap.xml`의 URL 상태 점검
- 선택적으로 Indexing API `URL_UPDATED` / `URL_DELETED` 요청 실행
- 선택적으로 `urlNotifications/metadata` 조회
- 결과를 `artifacts/gsc-report-*.json`으로 저장하고 Actions 아티팩트로 업로드

### 주간 배치 (`gsc-weekly-content-reindex.yml`)

- 최근 N일(기본 7일) 변경된 콘텐츠 파일 탐지
- `_posts`뿐 아니라 카테고리/일반 페이지(.md/.html) 변경도 포함
- `sitemap.xml`에 실제 포함된 URL만 검사/요청
- 색인 상태가 PASS가 아닌 URL에만 `URL_UPDATED` 요청
- 삭제된 파일은 `URL_DELETED` 요청

### 포스트 CRUD (`gsc-post-crud-index.yml`)

- `_posts/**` 경로가 push로 변경되면 자동 실행
- 생성/수정: `URL_UPDATED`
- 삭제: `URL_DELETED`

## 2) GitHub Actions 실행

- 워크플로 이름:
  - `GSC Inspect And Index`
  - `GSC Weekly Content Reindex`
  - `GSC Post CRUD Indexing`
- 트리거: `workflow_dispatch`
- 입력값:
  - `mode`: `inspect` 또는 `inspect_and_index`
  - `notify_type`: `URL_UPDATED` 또는 `URL_DELETED`
  - `fetch_metadata`: 알림 상태 조회 여부
  - `max_urls`: 처리할 최대 URL 수
  - `url_filter`: URL 문자열 필터(예: `/blog/`, 또는 `regex:^https://...`)
  - `strict_mode`: 실패 발생 시 워크플로 실패 처리 여부
  - `fail_on_zero_inspection`: 모든 URL 검사 실패 시 워크플로 실패 처리 여부
  - `AUTO_DETECT_SITE_PROPERTY`(기본 true): 샘플 URL로 `https://.../`와 `sc-domain:...` 후보를 자동 탐지

## 3) 필수 권한/자격 증명

### A. OIDC 사용(권장)

GitHub Repository Variables:

- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GSC_SITE_URL` (예: `https://lh99tw.github.io/` 또는 `sc-domain:lh99tw.github.io`)
- `GSC_SITEMAP_URL` (예: `https://lh99tw.github.io/sitemap.xml`)

### B. JSON Key 사용(대체)

GitHub Repository Secret:

- `GCP_SA_KEY` (Service Account JSON 전체)

GitHub Repository Variables:

- `GSC_SITE_URL`
- `GSC_SITEMAP_URL`

## 4) Search Console 권한

서비스 계정 이메일을 Search Console 속성 사용자(보통 소유자 권한)로 추가해야 합니다.

- URL-prefix 속성 예: `https://lh99tw.github.io/`
- Domain 속성 예: `sc-domain:lh99tw.github.io`

워크플로 변수 `GSC_SITE_URL` 값은 Search Console 속성 값과 정확히 일치해야 합니다.

## 5) 주의사항 (중요)

Google Indexing API는 공식적으로 `JobPosting` 또는 `BroadcastEvent` 페이지에 대해 사용이 허용됩니다.

- 일반 블로그 포스트는 `inspect` 모드 중심으로 운영 권장
- `inspect_and_index`는 실험적으로만 사용하고, 실패는 리포트에서 확인

## 6) 가이드라인 준수 포인트

- Indexing API `publish` 호출은 모두 `Content-Type: application/json`으로 전송
- 요청 본문은 URL 단건 처리(`url`, `type`)로 전송
- `type`은 `URL_UPDATED` 또는 `URL_DELETED`만 허용
- URL Inspection API는 `webmasters.readonly` 스코프로 호출
