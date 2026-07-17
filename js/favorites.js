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
    // "全部" must never drop a favorite just because its category doesn't match a known filter
    // chip - legacy data without a recognizable type tag stays visible there rather than vanishing.
    const places = [...favorites]
      .map((id) => window.SoftPlanetPlaces.find((place) => place.id === id))
      .filter(Boolean);

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
          <div class="card-action-bar"><a class="card-detail-link" href="place.html?id=${place.id}">查看詳情 →</a><div class="card-icon-actions">${place.category === "住宿" ? `<button class="card-icon-btn" type="button" data-add-trip-id="${place.id}" data-add-trip-name="${place.name}" aria-label="將${place.name}加入旅行">🧳</button>` : ""}<button class="card-icon-btn" type="button" data-favorite-id="${place.id}" data-favorite-name="${place.name}" aria-label="取消收藏${place.name}" aria-pressed="true">♥</button><button class="card-icon-btn" type="button" data-share-url="place.html?id=${place.id}" data-share-title="${place.name}｜SoftPlanet" data-share-text="${place.summary}" aria-label="分享${place.name}">↗</button></div></div>
        </div>
      </article>`).join("");
    window.SoftPlanetCardActions.mount(list);
    list.querySelectorAll("[data-add-trip-id]").forEach((btn) => btn.onclick = () => openTripPicker(btn.dataset.addTripId));
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

  // Favorites had no "加入旅行" action for accommodation cards at all before - it only offered
  // toggling the favorite and sharing. This opens a lightweight trip picker, then hands off to
  // the same MUMU Accommodation Assistant entry point trip.html itself auto-launches.
  async function openTripPicker(placeId) {
    let dialog = document.getElementById("favTripPicker");
    if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "favTripPicker"; dialog.className = "confirm-dialog"; document.body.appendChild(dialog); }
    dialog.innerHTML = `<form method="dialog"><div class="dialog-bear mumu-asset" data-mumu aria-hidden="true"></div><h2>加入哪一趟旅行？</h2><div id="favTripPickerBody"><p class="field-note">正在整理旅行清單…</p></div><div class="dialog-actions"><button class="secondary-btn" type="button" id="favTripPickerClose">先不要</button></div></form>`;
    dialog.querySelector("#favTripPickerClose").onclick = () => dialog.close();
    dialog.showModal();
    const body = dialog.querySelector("#favTripPickerBody");
    try {
      const trips = await window.SoftPlanetStore.listTrips();
      body.innerHTML = trips.length
        ? `<label for="favTripSelect">選擇旅行</label><select id="favTripSelect">${trips.map((trip) => `<option value="${trip.id}">${trip.title}</option>`).join("")}</select><button class="primary-btn" id="favTripConfirm" type="button">前往安排住宿</button>`
        : `<p class="field-note">還沒有旅行，請先建立一趟。</p><a class="primary-link" href="trips.html">前往我的旅行 →</a>`;
      document.getElementById("favTripConfirm")?.addEventListener("click", () => {
        const tripId = document.getElementById("favTripSelect").value;
        location.href = `trip.html?id=${encodeURIComponent(tripId)}&assistant=stay&place=${encodeURIComponent(placeId)}`;
      });
    } catch (error) {
      body.innerHTML = `<p class="field-note">旅行清單暫時連不上，請稍後再試。</p>`;
    }
  }

  render();
});
