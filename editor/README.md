# LH99Tw Local Editor

`editor/`는 `_posts/*.md`를 로컬에서 관리하기 위한 Electron 기반 마크다운 편집기입니다.

## 기능

- 좌측 카테고리/포스트 탐색 (`_data/sidebar_categories.yml` + `_posts`)
- 마크다운 편집 + 미리보기
- 포스트 CRUD (삭제 시 `_posts/.trash` 이동)
- front matter 자동 매핑 (제목/설명/카테고리/태그)
- 저장 전 SEO 규칙 검증
- Git status / 선택 파일 커밋+푸시 / Draft PR 생성(`gh` 필요)

## 실행

```bash
cd editor
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

- macOS/Windows 패키지는 `editor/release/`에 생성됩니다.

## GitHub PR 자동화

PR 생성 기능은 `gh` CLI가 필요합니다.

```bash
brew install gh
# 또는 Windows: winget install GitHub.cli

gh auth login
```
