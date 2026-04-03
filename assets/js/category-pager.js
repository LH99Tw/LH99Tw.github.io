(() => {
  const boards = document.querySelectorAll("[data-category-board]");

  boards.forEach((board) => {
    const rowsContainer = board.querySelector("[data-category-rows]");
    const pager = board.querySelector("[data-category-pagination]");
    if (!rowsContainer || !pager) return;

    const rows = Array.from(rowsContainer.querySelectorAll(".post-item"));
    if (rows.length === 0) {
      pager.innerHTML = "";
      return;
    }

    const perPage = Math.max(1, Number(board.dataset.perPage || 8));
    const totalPages = Math.ceil(rows.length / perPage);
    let currentPage = 1;

    const renderRows = () => {
      const start = (currentPage - 1) * perPage;
      const end = start + perPage;

      rows.forEach((row, index) => {
        row.hidden = !(index >= start && index < end);
      });
    };

    const renderPager = () => {
      if (totalPages <= 1) {
        pager.innerHTML = "";
        return;
      }

      let html = `<button class="page-btn" data-role="prev" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;

      for (let page = 1; page <= totalPages; page += 1) {
        html += `<button class="page-btn ${page === currentPage ? "active" : ""}" data-role="page" data-page="${page}">${page}</button>`;
      }

      html += `<button class="page-btn" data-role="next" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
      pager.innerHTML = html;
    };

    pager.addEventListener("click", (event) => {
      const target = event.target.closest(".page-btn");
      if (!target || target.disabled) return;

      const role = target.dataset.role;
      if (role === "prev") currentPage -= 1;
      if (role === "next") currentPage += 1;
      if (role === "page") currentPage = Number(target.dataset.page || 1);

      currentPage = Math.max(1, Math.min(totalPages, currentPage));
      renderRows();
      renderPager();
    });

    renderRows();
    renderPager();
  });
})();
