---
title: "[대양 CIS 일경험] RS 232 통신과 FileSystemWatcher 실습"
description: "핵심 키워드를 첫 120자 안에 포함해 문제 맥락을 설명합니다. 배경 문제가 발생한 배경과 현재 상태를 정리합니다. 해결 방법 핵심 접근 방식과 구현 포인트를 설명합니다. 적용 결과 전/후 비교와 학습 포인트를 정리합니다. 자주 묻는 질문(FAQ) 질문 1 답변"
categories:
  - experience
tags:
---
*다음은 2026년 상반기 경기대학교 인턴십 교육자료(2주차)를 바탕으로 작성되었습니다.*

## <mark>시리얼 통신</mark>이란?
산업/임베디드 기기 연결에 사용되는 데이터 전송 방식으로, 키오스크로 데이터를 전송하는 등 현장 기기로 데이터를 전송할 때 주로 사용되는 데이터 통신 방식이다.
<br>
직렬(Serial) 연결을 통해 한 번에 하나의 비트 단위로 데이터를 전송하는 통신 표준으로 DB-9 핀을 통해 연동하거나, 입력 단자가 없는 경우 USB 변환기를 활용하여 연결한다.
<br>
<br>
![시리얼통신](https://i.imgur.com/cHLMTDz.png)
<br>
그 중에서 RS-232는 **DTE**(Data Terminal Equipment, 컴퓨터/터미널 등)와 **DCE**(Data Communication Equipment, 모뎀 등)간의 통신을 위한 표준 규격이다. [한국미스미 홈페이지의 설명](https://kr.misumi-ec.com/tech-info/categories/electric_electronic_design/ee01/a0139.html?srsltid=AfmBOorm3xi9xFUAEBfstc4nxQtt67-vT_Q8YBqrCcd6cYC6GrDvhYJk)

---
### 실습
<br>
실습은 X-CTU의 Terminal 기능을 이용해 시리얼 데이터를 송신했다.

![실습 화면](https://i.imgur.com/49Ynw1v.png)
코드 수정을 통해서 가상키보드를 만들고, 이벤트리스너를 통해 값을 송신하는 방식으로 구현하였다. html/python/Java/C# 기반의 코드 4개 중 html에서 
<mark>connectSerial()</mark> 함수를 통해 연결을 구현한다. 
1. 브라우저 보안 장치 포트 선택 허가 팝업 호출
2. 포트 오픈 및 기본 통신 속도(9600 bps) 매핑
3. 쓰기 전용 스트림(Writer) 획득
<br>

> Baud Rate : 통신 속도로 1초간 전송되는 신호의 수를 의미하며(단위는 bps;bit per second) 일반적으로 9600 bps를 사용한다.

<br>
데이터 송신의 경우 <mark>sendData()</mark>함수를 통해 데이터를 전송한다. port연결과 Writer상태를 확인하고, ASCII Encoder 구현을 통해 전송할 데이터의 범위와 형식을 지정한다.
<br>
이후 LED 기기를 연결하여 버튼을 클릭하면 실제로 색상이 바뀌는지 실습하는 과정을 진행했다.
<br>
<br>

---
<br>

## <mark>FileSystemWatcher</mark>

특정 디렉터리/파일의 변경, 삭제, 수정 등이 발생할 시 이벤트를 발생시키는 시스템이다. 현장에서 여러 사람들이 동시에 파일을 수정하면서 동시성(Concurrency)문제가 발생하는 경우에 주로 사용된다. <br>
파이썬의 경우 watchdog 라이브러리를 사용해서 시스템을 구성할 수 있다. 


### 실습
![FileSystemWatcher](https://i.imgur.com/pBzYRnT.png)



















