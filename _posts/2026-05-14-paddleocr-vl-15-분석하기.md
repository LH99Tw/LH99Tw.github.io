---
title: "[Snapocket] PaddleOCR-VL-1.5 분석하기"
description: "PaddleOCR-VL-1.5은 다음과 같이 Document Parsing과 Text Spotting의 2단계 Task를 거쳐서 OCR을 수행하도록 구현되어있다."
categories:
  - project
tags:
---
[PaddleOCR-VL-1.5의 허깅페이스 주소](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5)


![Paddle의 모델 아키텍처](https://i.imgur.com/0z27sY0.png)

한 눈에 보이는 특징은 PaddleOCR-VL-1.5은 Document Parsing과 Text Spotting의 2단계 Task를 거쳐서 OCR을 수행하도록 구현되어있는 것이다.
이는 일반적인 Vision Transformer의 처리방식(대표적으로 Qwen3-VL)인 Patchifying 단계에서 이미지를 분할하고, Transformer를 통해 내부적으로 OCR을 수행하는 방식과는 다르다. 
그 이유에 대해서는 Paddle의 두 논문에서 다음과 같이 서술하고 있다.

[PaddleOCR-VL](https://arxiv.org/html/2510.14528v4)
[PaddleOCR-VL-1.5](https://arxiv.org/html/2601.21957v2)

요약하자면, PaddleOCR-VL 시리즈는 태생적으로 <mark>자원이 제한된 환경에서의 최고성능</mark>을 목표로 설계되었고 이 방식이 기존의 VLM 방식인 **grounding**(bbox를 통해 텍스트 ↔ 이미지 위치 매핑)+ **sequence output**에 의존하는 방식보다 경제성 측면에서 낫다는 것이다.

> Firstly, PaddleOCR-VL performs layout detection and reading order prediction to obtain the positional coordinates and reading order of elements (text blocks, tables, formulas, and charts). Compared to multimodal methods that rely on grounding and sequence output (e.g., MinerU2.5 [niu2025mineru2], Dolphin [feng2025dolphin]), our method offers faster inference speeds, lower training costs, and easier extensibility for new layout categories. Subsequently, the elements are segmented based on their positions and fed into PaddleOCR-VL-0.9B for recognition. This vision-language model is specifically designed for resource-efficient inference and excels at element recognition within document parsing. By integrating a NaViT-style [dehghani2023patch] dynamic high-resolution visual encoder with the lightweight ERNIE-4.5-0.3B [ernie2025technicalreport] language model, we have significantly enhanced the model’s dense text recognition capabilities and decoding efficiency.

---

## PP-DocLayoutV3 
![PP-DocLayoutV3](https://i.imgur.com/Z6oYGbC.png)

Document Parsing 과정에서 PaddleOCR-VL에서는 PP-DocLayoutV2, VL-1.5 버전에서는 PP-DocLayoutV3가 쓰였다. PP-DocLayoutV2는 2개의 네트워크로 이뤄져있는데, 첫 번째 네트워크에서는 <mark>RT-DETR</mark>을 통해서 레이아웃 요소 감지 및 분류를 수행하고, 후속 네트워크에서 요소의 순서를 지정하는 역할을 수행한다.
<br>
[Baidu의 RT-DETR:Transformer기반 실시간 객체 탐지기](https://docs.ultralytics.com/ko/models/rtdetr), [아르카눔님의 논문리뷰](https://arsetstudium.tistory.com/380)
<br><br>절대적 2D 위치 인코딩(absolute 2D positional encoding)과 클래스 라벨 임베딩(class label embedding)을 사용해 proposal들이 임베딩되고, encoder attention에는 <mark>Relation-DETR</mark>의 geometric bias 메커니즘으로부터 영향을 받아 요소들 간의 쌍별 기하학적 관계(pairwise geometric relationships)를 명시적으로 모델링한다...



 ... 작성중입니다

















