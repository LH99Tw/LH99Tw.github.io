---
title: "[컴퓨터구조] 제2장 CPU의 구조와 기능"
description: "Micro Operation, Fetch Cycle, ADD/LOAD 명령어, 인터럽트 처리 과정을 중심으로 CPU 동작을 정리합니다."
categories:
  - cs
tags:
  - computer-architecture
  - cpu
  - fetch-cycle
  - interrupt
  - computer-science
---
## 2.2.1 정리

## 1. Micro Operation & Clock Cycle

- Micro Operation: CPU 내부에서 수행되는 기본 동작
- Clock Cycle 단위로 수행됨

예:
- 클록이 1GHz -> 1 cycle = 1ns

---

## 2. 명령어 인출 사이클 (Fetch Cycle)

### Micro Operation

- Cycle1 : MAR <- PC
- Cycle2 : MBR <- M[MAR], PC <- PC + 1
- Cycle3 : IR <- MBR

### 설명

- PC: 다음 실행할 명령어 주소 저장
- MAR: 주소 전달
- MBR: 메모리에서 읽은 명령어 저장
- IR: 실행할 명령어 저장

총 수행 시간
- 3 cycle = 3ns (1GHz 기준)

---

## 3. 제어장치 (Control Unit)

- 실제 연산을 수행하지 않음
- ALU, 메모리 등에 명령을 내려 실행을 제어하는 역할

---

## 4. 명령어 형식

- 구성: 연산코드(opcode) + 오퍼랜드(address)

예:
- MOV R1, R2 -> R1 <- R2
- ADD R1, R2 -> R1 <- R1 + R2

---

## 5. 명령어 종류

- 데이터 이동: LOAD, STORE, MOV
- 데이터 처리: ADD, SUB 등
- 제어 흐름 변경: Branch

분기 명령어:
- 조건문, 반복문 구현 가능
- 예: JUMP

---

## 6. ADD 명령어

기능:
- 메모리 데이터를 AC에 더하고 결과를 AC에 저장

### Micro Operation

- Clock1 : MAR <- IR(address)
- Clock2 : MBR <- M[MAR]
- Clock3 : AC <- AC + MBR

---

## 7. LOAD 명령어

기능:
- 메모리 데이터를 AC에 그대로 저장

### Micro Operation

- Clock1 : MAR <- IR(address)
- Clock2 : MBR <- M[MAR]
- Clock3 : AC <- MBR

차이:
- ADD: 연산 수행
- LOAD: 단순 저장

---

## 8. 인터럽트 (Interrupt)

정의:
- 프로그램 실행 중 CPU의 작업을 중단시키고 다른 작업을 수행하게 하는 신호

ISR (Interrupt Service Routine):
- 인터럽트를 처리하는 프로그램

---

## 9. 인터럽트 처리 과정

1. 현재 명령어 실행 완료
2. 다음 실행할 주소(PC 값)를 스택에 저장
3. ISR 시작 주소를 PC에 저장
4. ISR 수행
5. 종료 후 원래 프로그램으로 복귀

복귀 시:
- 저장된 PC 값(i+1)으로 돌아감

---

## 10. 인터럽트 사이클 Micro Operation

### Micro Operation

- Clock1 : MAR <- SP, MBR <- PC
- Clock2 : M[MAR] <- MBR, SP <- SP - 1
- Clock3 : PC <- ISR 시작주소

---

## 11. 스택 포인터 (SP)

- Stack Pointer
- 스택의 top 주소 저장
- 인터럽트 발생 시 PC 값을 저장하는 위치 지정

특징:
- 데이터 저장 후 SP 감소 (stack down 방식)

---

## 핵심 요약

- Fetch cycle은 3단계로 구성됨 (MAR -> MBR -> IR)
- MOV는 값 복사 명령어
- ADD와 LOAD의 차이는 연산 여부
- 인터럽트에서는 PC를 먼저 저장한 후 ISR로 이동
- Stack frame은 LIFO 구조

