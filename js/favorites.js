document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("favoriteList");
  const count = document.getElementById("favoriteCount");
  let favorites = new Set(JSON.parse(localStorage.getItem("softplanet-favorites") || "[]"));
  let term = "";
  let filter = "全部";

  function empty(searching = false) {
    list.innerHTML = `
      <div class="soft-empty">
        <span>🐻</span>
        <h3>${searching ? `沒有找到符合「${term}」的收藏` : "還沒有收藏"}</h3>
        <p>${searching ? "清除搜尋或切換分類再看看。" : "旅行靈感裡遇到喜歡的景點、餐廳或住宿，就先讓 MUMU 幫你收好。"}</p>
        ${searching ? "" : '<a class="primary-link" href="inspiration.html">去找旅行靈感 →</a>'}
      </div>`;
  }

  function render() {
    const places = [...favorites]
      .map((id) => window.SoftPlanetPlaces.find((place) => place.id === id))
      .filter((place) => place && ["景點", "美食", "餐廳", "住宿"].includes(place.category));

    const filtered = places.filter((place) => {
      const categoryMatches = filter === "全部"
        || (filter === "美食" ? ["美食", "餐廳"].includes(place.category) : place.category === filter);
      const searchable = `${place.name}${place.country}${place.city}${place.subarea || ""}${place.category}${place.tags || ""}`.toLowerCase();
      return categoryMatches && searchable.includes(term.toLowerCase());
    });

    count.textContent = `${filtered.length} 個`;
    if (!filtered.length) {
      empty(Boolean(term || filter !== "全部"));
      return;
    }

    list.innerHTML = filtered.map((place) => `
      <article class="place-card">
        <a class="place-visual tone-${place.tone}" href="place.html?id=${place.id}"><span>${place.emoji}</span></a>
        <div class="place-card-body">
          <p class="eyebrow">${place.country}・${place.city}・${place.category}</p>
          <h2><a href="place.html?id=${place.id}">${place.name}</a></h2>
          <p>${place.summary}</p>
          <div class="card-action-bar"><a class="card-detail-link" href="place.html?id=${place.id}">查看詳情 →</a><div class="card-icon-actions"><button class="card-icon-btn" type="button" data-favorite-id="${place.id}" data-favorite-name="${place.name}" aria-label="取消收藏${place.name}" aria-pressed="true">♥</button><button class="card-icon-btn" type="button" data-share-url="place.html?id=${place.id}" data-share-title="${place.name}｜SoftPlanet" data-share-text="${place.summary}" aria-label="分享${place.name}">↗</button></div></div>
        </div>
      </article>`).join("");
    window.SoftPlanetCardActions.mount(list);
  }

  window.SoftPlanetSearch.mount(document.getElementById("favoriteSearch"), {
    placeholder: "搜尋收藏名稱、城市或分類…",
    onSearch: (value) => {
      term = value;
      render();
    }
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.onclick = () => {
      filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-pressed", item === button);
      });
      render();
    };
  });

  window.addEventListener("softplanet:favorite-changed", (event) => {
    favorites = new Set(JSON.parse(localStorage.getItem("softplanet-favorites") || "[]"));
    if (!event.detail.active) render();
  });

  render();
});
