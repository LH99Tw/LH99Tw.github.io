---
title: "[Snapocket] 흩어진 데이터를 지식으로 바꾸는 Snapocket 프로젝트"
description: "심화캡스톤 프로젝트 Snapocket 에 대한 개요"
categories:
  - project
tags:
  - snanpocket
  - kms
  - knowledge-management-system
  - project
---
# 프로젝트 개요

일상에는 스크린샷, 강의 자료 사진, 영수증, 음성 메모처럼 저장은 쉽지만 다시 찾기 어려운 데이터가 쌓입니다.
저희 팀의 **Snapocket**은 이 비정형 데이터를 자동으로 읽고 정리해, 검색 가능한 개인 지식 베이스로 바꾸는 프로젝트입니다.
<br>
<br>

![snapocket,KMS](https://i.imgur.com/BjSaVay.png)
[Project Github Link](https://github.com/gmlwlsdl/2026-CS-Snapocket)

## 우리가 해결하려는 문제

최근 비정형 데이터는 빠르게 늘고 있지만 이를 구조화해 활용하는 도구는 여전히 부족합니다.<br/>
특히, 지식 관리 시스템(KMS)에 agent를 활용하고자 하는 경우 이미지/음성 등의 비정형 데이터는 큰 병목입니다.<br/>
따라서, 이 문제를 해결하기 위해

- 이미지/문서/오디오 등 멀티모달 입력 처리
- 정보 추출 결과를 제목·요약·태그·카테고리로 구조화
- 검색과 그래프 탐색으로 재활용 가능하게 변환

하도록 만드는 것이 '**Snapocket**'의 목표입니다.

## Snapocket의 핵심 기능

1) 멀티모달 자동 분석
이미지/문서: OCR + VLM 기반 정보 추출
음성: ASR 기반 텍스트 변환
공통 출력: JSON 형태의 정리된 메타데이터(제목, 요약, 태그, 핵심 개념 등)


## 현재 프로젝트 구현 흐름 (MVP)
1. 사용자가 파일 업로드 (pdf, png, jpg, mp3, wav, mp4)
2. 백엔드가 분석 작업(Job) 생성 후 AI 서버에 비동기 요청
3. 분석 결과를 문서 메타데이터로 저장
4. 사용자가 결과를 검수/확정
5. 검색/지식그래프 UI에서 재탐색


## 기술 스택
**Frontend**: Next.js <br/>
**Backend**: FastAPI (REST + GraphQL) <br/>
**AI Service**: OCR/VLM + ASR 파이프라인, 로컬 추론 환경 기반 <br/>
**Infra**: Docker, AWS <br/>















