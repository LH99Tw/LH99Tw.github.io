---
title: "JS 비동기 처리 패턴 정리"
description: "JavaScript 비동기 코드를 깔끔하게 관리하는 방법을 정리했습니다."
categories:
  - javascript
tags:
  - javascript
  - async
---

Promise 기반 코드와 async/await를 함께 사용할 때 발생하는 에러 처리를 정리했습니다. `Promise.allSettled`를 활용해 UI에서 부분 실패를 처리하는 패턴을 정리했습니다.

```javascript
async function loadDashboards(ids) {
  const results = await Promise.allSettled(ids.map(fetchDashboard));
  return results.filter(({ status }) => status === "fulfilled").map(({ value }) => value);
}
```

다음으로는 React Query와 통합하는 방법을 실험할 예정입니다.
