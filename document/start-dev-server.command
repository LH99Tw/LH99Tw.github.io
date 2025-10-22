#!/bin/bash

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

echo "🔧 LH99Tw 개발 블로그 서버를 시작합니다..."
echo "========================================"

# Ruby와 bundler가 설치되어 있는지 확인
if ! command -v ruby &> /dev/null; then
    echo "❌ Ruby가 설치되어 있지 않습니다. Ruby를 설치해주세요."
    echo "   설치 방법: https://www.ruby-lang.org/ko/documentation/installation/"
    exit 1
fi

if ! command -v bundle &> /dev/null; then
    echo "📦 Bundler를 설치하는 중..."
    gem install bundler
fi

# 의존성 설치
echo "📦 의존성을 설치하는 중..."
bundle install

# Jekyll 서버 실행
echo "🚀 Jekyll 개발 서버를 시작합니다..."
echo "   로컬 주소: http://localhost:4000"
echo "   서버가 시작되면 브라우저에서 위 주소를 열어주세요"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요"
echo "========================================"

bundle exec jekyll serve --host 0.0.0.0 --port 4000
