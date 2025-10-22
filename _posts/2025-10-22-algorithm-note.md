---
title: "이진 탐색 트리 최적화"
description: "Algorithm 카테고리 샘플 글입니다."
categories:
  - algorithm
tags:
  - algorithm
  - data-structure
---

Balanced BST를 구현하면서 Rotation 전략을 정리했습니다. AVL 트리와 Red-Black 트리의 차이를 비교하고, 실제 프로젝트에 적용 가능한 기준을 세웠습니다.

## 핵심 정리

1. 균형 조건을 약간 완화하면 삽입 속도를 크게 높일 수 있다.
2. 트리 높이 제한을 모니터링하는 헬퍼 함수를 추가해 디버깅이 쉬워졌다.
3. 테스트 커버리지를 85%까지 확보하며 엣지 케이스를 잡아냈다.

다음 글에서는 세그먼트 트리와의 비교를 다룰 예정입니다.
