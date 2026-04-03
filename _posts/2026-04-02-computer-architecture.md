---
title: "컴퓨터 구조 기초: CPU 동작 원리 정리"
description: "컴퓨터 구조 학습의 출발점인 CPU 기본 구성과 명령어 처리 흐름을 정리하고, fetch-decode-execute 사이클을 핵심 위주로 빠르게 복습합니다."
categories:
  - algorithm
tags:
  - computer-architecture
  - cpu
  - cs
---

컴퓨터 구조 기초를 정리할 때 가장 먼저 이해해야 하는 대상은 CPU입니다. CPU의 구성 요소와 명령어 처리 흐름을 먼저 잡아두면 이후 메모리 계층과 병렬 처리 개념까지 훨씬 수월하게 연결할 수 있습니다.

## CPU의 기본 구조

- 산술논리연산장치(ALU: Arithmetic and Logic Unit)
- 레지스터 세트(Register Set)
- 제어 유닛(Control Unit)

위 구성 요소는 내부 버스로 연결되며, 외부와는 주소 버스, 데이터 버스, 제어 버스로 통신합니다.

## CPU의 주요 기능

- 명령어 인출(Instruction Fetch): 메모리에서 명령어를 읽어옵니다.
- 명령어 해독(Instruction Decode): 명령어를 분석해 수행할 동작을 결정합니다.
- 데이터 인출(Data Fetch): 필요할 때 메모리/I/O에서 데이터를 읽어옵니다.
- 데이터 처리(Data Process): 산술 및 논리 연산을 수행합니다.
- 데이터 저장(Data Store): 처리 결과를 레지스터나 메모리에 기록합니다.

## Fetch-Decode-Execute 사이클

CPU는 클럭 신호에 맞춰 fetch-decode-execute 단계를 반복합니다. 이 사이클의 처리 효율이 전체 프로그램 실행 성능에 직접적인 영향을 줍니다.

## 자주 묻는 질문(FAQ)

### 클럭 속도가 높으면 무조건 성능이 좋아지나요?

클럭 속도는 중요하지만, 캐시 구조, 파이프라인 효율, 명령어 수준 병렬성 같은 요소도 함께 성능을 결정합니다.

### 레지스터가 왜 중요한가요?

레지스터는 CPU가 가장 빠르게 접근할 수 있는 저장 공간이므로, 연산 중간값을 보관해 메모리 접근 병목을 줄여줍니다.
