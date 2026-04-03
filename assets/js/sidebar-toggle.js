(() => {
  const body = document.body;
  const sidebar = document.querySelector(".sidebar");
  const toggleButton = document.getElementById("sidebarToggle");
  const desktopQuery = window.matchMedia("(min-width: 981px)");
  const isProfilePage = body.classList.contains("page-profile");
  let closeTimer = null;

  if (!body || !sidebar || !toggleButton) {
    return;
  }

  const isDesktop = () => desktopQuery.matches;

  const setToggleLabel = (collapsed) => {
    toggleButton.setAttribute("aria-label", collapsed ? "사이드바 열기" : "사이드바 닫기");
    toggleButton.setAttribute("aria-expanded", String(!collapsed));
  };

  const applyCollapsedState = (collapsed) => {
    body.classList.toggle("sidebar-collapsed", collapsed && isDesktop());
    body.classList.remove("sidebar-nav-exit");
    setToggleLabel(collapsed);
  };

  const clearCloseTimer = () => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const scheduleAutoClose = () => {
    if (!isDesktop() || !isProfilePage) {
      return;
    }
    clearCloseTimer();
    closeTimer = window.setTimeout(() => {
      const hoveringSidebar = sidebar.matches(":hover");
      const hoveringToggle = toggleButton.matches(":hover");
      if (!hoveringSidebar && !hoveringToggle) {
        applyCollapsedState(true);
      }
    }, 220);
  };

  const openFromHover = () => {
    if (!isDesktop() || !isProfilePage) {
      return;
    }
    clearCloseTimer();
    applyCollapsedState(false);
  };

  const runProfileEntryAnimation = () => {
    if (!isDesktop()) {
      body.classList.remove("sidebar-collapsed", "sidebar-nav-exit");
      setToggleLabel(false);
      return;
    }

    if (!isProfilePage) {
      applyCollapsedState(false);
      return;
    }

    body.classList.remove("sidebar-collapsed", "sidebar-nav-exit");
    setToggleLabel(false);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        applyCollapsedState(true);
      }, 140);
    });
  };

  runProfileEntryAnimation();

  toggleButton.addEventListener("click", () => {
    if (!isDesktop() || !isProfilePage) {
      return;
    }
    applyCollapsedState(!body.classList.contains("sidebar-collapsed"));
  });

  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) {
      runProfileEntryAnimation();
      return;
    }
    clearCloseTimer();
    body.classList.remove("sidebar-collapsed", "sidebar-nav-exit");
    setToggleLabel(false);
  });

  toggleButton.addEventListener("mouseenter", openFromHover);
  sidebar.addEventListener("mouseenter", openFromHover);
  toggleButton.addEventListener("mouseleave", scheduleAutoClose);
  sidebar.addEventListener("mouseleave", scheduleAutoClose);
})();
