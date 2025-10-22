# 로컬에서 블로그 실행하기

이 문서는 `LH99Tw.github.io` 프로젝트를 로컬 환경에서 실행하는 방법을 정리한 가이드입니다. macOS 기준으로 작성되었지만, Ruby와 Bundler가 설치된 환경이라면 동일하게 적용할 수 있습니다.

## 1. 필수 도구 확인

1. **Ruby**  
   ```bash
   ruby -v
   ```  
   2.7 이상이 권장됩니다. 설치되어 있지 않다면 macOS에서는 Homebrew로 `brew install ruby`를 실행하세요.

2. **Bundler**  
   ```bash
   gem install bundler
   ```  
   이미 설치되어 있다면 최신 버전인지 확인합니다.

## 2. 저장소 클론 및 의존성 설치

프로젝트 루트에서 아래 명령을 실행합니다.

```bash
git clone https://github.com/LH99Tw/LH99Tw.github.io.git
cd LH99Tw.github.io

# (선택) 의존성을 프로젝트 내부에 설치하고 싶다면
bundle config set --local path 'vendor/bundle'

# Gemfile에 정의된 의존성 설치
bundle install
```

> `Gemfile`에는 `jekyll`, `jekyll-seo-tag`, `webrick`, `kramdown-parser-gfm` 등이 정의되어 있으며, `bundle install`을 통해 한 번만 설치하면 됩니다.

## 3. 개발 서버 실행

```bash
bundle exec jekyll serve --livereload
```

- 기본 주소: `http://127.0.0.1:4000/`
- `--livereload` 옵션으로 파일 저장 시 브라우저가 자동 새로고침됩니다.

> 실행 중 `Invalid date` 오류가 발생한다면 `_config.yml`의 `exclude` 목록에 `vendor/`와 `.bundle/`이 포함되어 있는지 확인하세요. 이미 프로젝트에 반영되어 있으므로 기본 설정 그대로 사용하면 됩니다.

## 4. 개발 워크플로

1. Markdown 포스트 또는 레이아웃 파일을 수정합니다.
2. 변경 사항은 즉시 로컬 서버에서 반영됩니다.
3. 작업이 끝나면 `Ctrl + C`로 서버를 종료합니다.

## 5. 문제 해결

- **`kramdown-parser-gfm`을 찾을 수 없다는 오류**  
  `bundle install`을 다시 실행하거나, `gem install kramdown-parser-gfm`으로 직접 설치 후 `bundle install`을 재실행합니다.

- **Ports already in use**  
  4000 포트를 사용 중이라면 `bundle exec jekyll serve --livereload --port 4001`처럼 포트를 변경하세요.

## 6. 추가 참고

- Jekyll 공식 문서: <https://jekyllrb.com/docs/>
- GitHub Pages 배포 정보: <https://docs.github.com/en/pages>

이 가이드를 따라 환경을 구성하면 로컬에서 안전하게 블로그를 편집하고 미리볼 수 있습니다.
