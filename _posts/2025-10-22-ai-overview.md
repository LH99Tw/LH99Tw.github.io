---
title: "AI 모델 실험 기록"
description: "신경망 모델 실험 결과와 학습 기록을 정리했습니다."
categories:
  - ai
tags:
  - machine-learning
  - experiments
  - ai
---
이번 주에는 Transformer 기반 모델을 활용해 문장 요약 실험을 진행했습니다. 데이터 전처리 파이프라인을 정리하고, 학습률 스케줄을 조정해 성능을 3% 향상시켰습니다.

## 실험 메모

- Tokenizer를 SentencePiece에서 BPE로 교체 → 학습 속도 12% 개선
- Warmup step을 2k에서 4k로 늘려 안정적인 수렴 유도
- BLEU 지표 26.4 → 27.9로 상승

다음 주에는 추론 속도를 개선하기 위해 양자화 <mark>실험</mark>을 진행할 예정입니다.


