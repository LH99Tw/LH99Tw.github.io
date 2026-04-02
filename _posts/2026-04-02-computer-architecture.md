---

---
## CPU의 기본구조

- 산술논리연산장치(ALU: Arithmetic and Logical Unit)
- 레지스터 세트(Register Set)
- 제어 유닛(Control Unit)

각각은 CPU 내부 버스로 연결되어있고, 외부로는 주소버스, 데이터버스, 제어버스와 연결된다.

## CPU의 기능

- 명령어 인출(instruction Fetch): 기억장치로부터 명령어를 읽어온다.
- 명령어 해독(Instruction Decode): 수행해야 할 동작을 결정하기 위하여 명령어를 해독한다.

- 데이터 인출(Data Fetch): 명령어 실행을 위하여 데이터가 필요한 경우에는 기억장치 혹은 I/O 장치로부터 그 데이터를 읽어온다
- 데이터 처리(Data Process): 데이터에 대한 산술적 혹은 논리적 연산을 수행 
- 데이터 저장(Data Store) : 수행한 결과를 저장

Clock cycle ?
하드웨어는 1 나노 세컨드 - micro operation 작동 ...

