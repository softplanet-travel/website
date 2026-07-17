(function () {
  const KEY = "softplanet-trip-stays";
  const parse = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { return []; } };
  const write = (items) => localStorage.setItem(KEY, JSON.stringify(items));
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => `stay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const addDays = (date, n) => new Date(new Date(`${date}T12:00:00`).getTime() + n * 86400000).toISOString().slice(0, 10);

  function listForTrip(tripId) {
    return parse().filter((item) => item.trip_id === tripId).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }
  function addStay(values) {
    const items = parse();
    const item = { stay_id: uid(), trip_id: values.trip_id, place_id: values.place_id, place_name: values.place_name, start_date: values.start_date, end_date: values.end_date, created_at: new Date().toISOString() };
    items.push(item);
    write(items);
    return item;
  }
  function removeStay(stayId) {
    write(parse().filter((item) => item.stay_id !== stayId));
  }

  // Changes the stay for a single night only. If an existing ranged stay covers other nights too,
  // it is split so those other nights keep their original accommodation.
  function setNightStay(tripId, date, place) {
    const items = parse();
    const next = addDays(date, 1);
    const covering = items.find((s) => s.trip_id === tripId && s.start_date <= date && date < s.end_date);
    if (!covering) {
      return addStay({ trip_id: tripId, place_id: place.place_id, place_name: place.place_name, start_date: date, end_date: next });
    }
    if (covering.start_date === date && covering.end_date === next) {
      covering.place_id = place.place_id;
      covering.place_name = place.place_name;
      write(items);
      return covering;
    }
    const remaining = items.filter((s) => s.stay_id !== covering.stay_id);
    if (covering.start_date < date) remaining.push({ ...covering, stay_id: uid(), end_date: date });
    if (next < covering.end_date) remaining.push({ ...covering, stay_id: uid(), start_date: next });
    const newNight = { stay_id: uid(), trip_id: tripId, place_id: place.place_id, place_name: place.place_name, start_date: date, end_date: next, created_at: new Date().toISOString() };
    remaining.push(newNight);
    write(remaining);
    return newNight;
  }

  function dateRange(start, end) {
    const dates = [];
    let cursor = new Date(`${start}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor = new Date(cursor.getTime() + 86400000); }
    return dates;
  }
  function nightsForTrip(trip) {
    if (!trip.start_date || !trip.end_date) return [];
    const days = dateRange(trip.start_date, trip.end_date);
    if (days.length < 2) return [];
    const stays = listForTrip(trip.id);
    return days.slice(0, -1).map((date) => ({ date, stay: stays.find((item) => item.start_date <= date && date < item.end_date) || null }));
  }

  function favoriteStays() {
    try {
      const ids = JSON.parse(localStorage.getItem("softplanet-favorites") || "[]");
      return (Array.isArray(ids) ? ids : []).map((id) => window.getSoftPlanetPlace?.(id)).filter((place) => place && place.category === "住宿");
    } catch (_) { return []; }
  }

  // Reusable 3-source picker (旅行靈感／我的收藏／新增專屬住宿卡). Calls onPick({place_id, place_name})
  // once a place is chosen; does not decide how the caller stores it (ranged vs single-night).
  function mountPicker(container, trip, onPick) {
    const areas = window.SoftPlanetServices?.areas(trip.country, trip.city) || [];
    container.innerHTML = `
      <p class="section-helper">選擇這段住宿的地點</p>
      <div class="stay-picker-actions">
        <a class="secondary-btn" href="inspiration.html?${new URLSearchParams({ country: trip.country || "", city: trip.city || "", category: "住宿", trip: trip.id })}">到旅行靈感找住宿</a>
        <button type="button" class="secondary-btn" id="stayFromFavorites">從我的收藏選住宿</button>
        <button type="button" class="secondary-btn" id="stayCustomCard">新增專屬住宿卡</button>
      </div>
      <div id="stayFavoritesList" hidden></div>
      <form id="stayCustomForm" class="workspace-form" hidden>
        <label>住宿名稱<input name="custom_name" maxlength="60" required></label>
        <label>住宿區域<select name="area_id" required><option value="">請選擇</option>${areas.map((area) => `<option value="${area.id}" data-name="${area.name}">${area.name}</option>`).join("")}</select></label>
        <label>Google Maps（選填）<input name="maps_url" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…"></label>
        <label>備註（選填）<textarea name="short_note" maxlength="100" placeholder="記下房型、預約時間或其他重要提醒，最多 100 字。"></textarea><small class="char-count"><span id="stayNoteCount">0</span> / 100</small></label>
        <div class="dialog-actions"><button class="secondary-btn" type="button" id="stayCustomCancel">取消</button><button class="primary-btn" type="submit">建立並加入</button></div>
      </form>`;
    container.querySelector("#stayFromFavorites").onclick = () => {
      const list = favoriteStays();
      const host = container.querySelector("#stayFavoritesList");
      host.hidden = false;
      host.innerHTML = list.length ? list.map((place) => `<button type="button" class="secondary-btn" data-pick-favorite="${html(place.id)}" data-pick-name="${html(place.name)}">${html(place.name)}</button>`).join("") : `<p class="field-note">收藏裡還沒有住宿類型的地點。</p>`;
      host.querySelectorAll("[data-pick-favorite]").forEach((btn) => btn.onclick = () => onPick({ place_id: btn.dataset.pickFavorite, place_name: btn.dataset.pickName }));
    };
    container.querySelector("#stayCustomCard").onclick = () => { container.querySelector("#stayCustomForm").hidden = false; };
    const customForm = container.querySelector("#stayCustomForm");
    const note = customForm.elements.short_note, counter = container.querySelector("#stayNoteCount");
    note.oninput = () => { counter.textContent = [...note.value].length; };
    container.querySelector("#stayCustomCancel").onclick = () => { customForm.hidden = true; customForm.reset(); counter.textContent = 0; };
    customForm.onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(customForm));
      if (!window.SoftPlanetCustomItems) return;
      const areaOption = customForm.elements.area_id.options[customForm.elements.area_id.selectedIndex];
      const mapsUrl = window.SoftPlanetMaps?.safe(values.maps_url);
      const references = mapsUrl ? [{ name: "Google Maps", url: mapsUrl }] : [];
      const item = window.SoftPlanetCustomItems.create({ trip_id: trip.id, country: trip.country, city: trip.city, area_id: values.area_id, area_name: areaOption?.dataset.name || "", item_type: "住宿", custom_name: values.custom_name, short_note: values.short_note || "", references });
      onPick({ place_id: item.id, place_name: item.name });
    };
  }

  // Groups consecutive nights sharing the same accommodation into one summary line
  // ("7/16–7/18 上野A飯店") instead of always listing every night - only distinct segments (an
  // unassigned gap, or a different hotel) start a new group.
  function summaryGroups(nights) {
    const groups = [];
    nights.forEach((n) => {
      const placeId = n.stay?.place_id || null;
      const last = groups[groups.length - 1];
      if (last && last.place_id === placeId && placeId !== null) last.end = n.date;
      else groups.push({ start: n.date, end: n.date, place_id: placeId, place_name: n.stay?.place_name || null });
    });
    return groups;
  }

  // Card is summary-first (unassigned/partial/complete), not a permanently-expanded per-night
  // table - per-night detail only appears once the user asks to see it. Every row still routes
  // through the MUMU Accommodation Assistant (trip-detail.js) via onAssign/onReplace instead of a
  // bare inline picker with a direct "移除" button - accommodation is never just deleted, only
  // assigned or replaced through the guided flow.
  function mount(panel, trip, { onAssign, onReplace } = {}) {
    let expanded = false;
    const render = () => {
      const nights = nightsForTrip(trip);
      if (!nights.length) { panel.innerHTML = `<p class="field-note">請先在旅行資訊設定旅行日期，才能安排每晚住宿。</p>`; return; }
      const assignedCount = nights.filter((n) => n.stay).length;
      const lines = summaryGroups(nights).filter((g) => g.place_id).map((g) => g.start === g.end ? `${g.start}　${html(g.place_name)}` : `${g.start}–${g.end}　${html(g.place_name)}`);
      let headline, actionsHtml;
      if (assignedCount === 0) {
        headline = `${nights.length} 晚尚未安排住宿`;
        actionsHtml = `<button type="button" class="primary-btn" id="stayStartBtn">開始安排住宿</button>`;
      } else if (assignedCount === nights.length) {
        headline = `${nights.length} 晚住宿已安排完成`;
        actionsHtml = `<button type="button" class="secondary-btn" id="stayToggleDetail">${expanded ? "收合明細" : "查看每晚住宿"}</button>`;
      } else {
        headline = `已安排 ${assignedCount}／${nights.length} 晚`;
        actionsHtml = `<button type="button" class="secondary-btn" id="stayContinueBtn">繼續安排</button><button type="button" class="secondary-btn" id="stayToggleDetail">${expanded ? "收合明細" : "查看每晚住宿"}</button>`;
      }
      panel.innerHTML = `<div class="stay-summary-card">
          <strong>${headline}</strong>
          ${lines.length ? `<div class="stay-summary-lines">${lines.map((l) => `<p>${l}</p>`).join("")}</div>` : ""}
          ${assignedCount > 0 && assignedCount < nights.length ? `<p class="field-note">其餘 ${nights.length - assignedCount} 晚尚未安排</p>` : ""}
          <div class="stay-picker-actions">${actionsHtml}</div>
        </div>
        ${expanded ? `<div class="stay-night-list">${nights.map((row) => `<div class="stay-night-row"><span>${row.date}</span><strong>${row.stay ? html(row.stay.place_name) : "尚未指定住宿"}</strong><button type="button" data-stay-date="${row.date}" data-has-stay="${Boolean(row.stay)}">${row.stay ? "更換住宿" : "安排住宿"}</button></div>`).join("")}</div>` : ""}`;
      panel.querySelector("#stayStartBtn")?.addEventListener("click", () => onAssign?.(nights[0].date));
      panel.querySelector("#stayContinueBtn")?.addEventListener("click", () => { const next = nights.find((n) => !n.stay); if (next) onAssign?.(next.date); });
      panel.querySelector("#stayToggleDetail")?.addEventListener("click", () => { expanded = !expanded; render(); });
      panel.querySelectorAll("[data-stay-date]").forEach((btn) => btn.onclick = () => {
        if (btn.dataset.hasStay === "true") onReplace?.(btn.dataset.stayDate); else onAssign?.(btn.dataset.stayDate);
      });
    };
    render();
    return { render };
  }

  window.SoftPlanetTripStays = { listForTrip, addStay, removeStay, setNightStay, nightsForTrip, mount, mountPicker };
}());
