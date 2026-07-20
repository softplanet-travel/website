(function () {
  const KEY = "softplanet-trip-tools";
  const parse = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { return {}; } };
  const write = (all) => localStorage.setItem(KEY, JSON.stringify(all));
  function enabledFor(tripId) { return parse()[tripId] || []; }
  function enable(tripId, toolId) { const all = parse(); all[tripId] = [...new Set([...(all[tripId] || []), toolId])]; write(all); return all[tripId]; }
  window.SoftPlanetTripTools = { enabledFor, enable };
}());

document.addEventListener("DOMContentLoaded", async () => {
  await window.SoftPlanetCatalogService.ready();
  await window.SoftPlanetAirportTransport.ready();
  const tripId = new URLSearchParams(location.search).get("id");
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hero = $("tripHero"), toolbarSection = $("tripToolbarSection"), toolbar = $("tripToolbar"), advisory = $("tripAdvisory"), journey = $("tripJourney");
  const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  const FALLBACK_HERO = "https://pub-b81dcc9d028843a88c719d03c1eb29a1.r2.dev/assets/hero/hero-home.webp";
  // Populate per-city hero maps here as real assets are confirmed on R2. Other cities fall back.
  const CITY_HERO_IMAGES = {
    東京: "https://pub-b81dcc9d028843a88c719d03c1eb29a1.r2.dev/assets/city/city-tokyo-map.webp"
  };
  // Metro map is a distinct asset from the Hero city map. Verified via full-project search
  // (R2 URLs, asset references, manifest) that no metro/subway map asset exists anywhere yet -
  // this must stay empty rather than guess a URL. Tool auto-hides until a real entry exists.
  const METRO_MAP_IMAGES = {};
  function metroMapFor(city) {
    return METRO_MAP_IMAGES[city] || null;
  }

  function fail(title, message) {
    hero.innerHTML = `<div class="soft-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h1>${title}</h1><p>${message}</p><a class="primary-link" href="trips.html">返回我的旅行 →</a></div>`;
    toolbarSection.hidden = true;
    advisory.hidden = true;
    journey.hidden = true;
  }

  if (!tripId) { fail("找不到這趟旅行", "旅行連結可能不完整。"); return; }

  let trip;
  try {
    trip = await window.SoftPlanetStore.getTrip(tripId);
  } catch (error) {
    fail("旅行暫時連不上", "請確認網路後回到旅行清單再試一次。");
    return;
  }
  if (!trip) { fail("這趟旅行不在這裡", "可能已被移除，或需要登入原本的帳號。"); return; }
  document.title = `${trip.title} - SoftPlanet`;

  function formatDateSlash(dateStr) {
    return dateStr ? dateStr.replace(/-/g, "/") : "";
  }
  function openHeroZoom(image, alt) {
    let dialog = $("heroZoomDialog");
    if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "heroZoomDialog"; dialog.className = "hero-zoom-dialog"; document.body.appendChild(dialog); }
    dialog.innerHTML = `<button class="sheet-close" type="button" aria-label="關閉">×</button><img src="${image}" alt="${escape(alt)}">`;
    dialog.querySelector(".sheet-close").onclick = () => dialog.close();
    dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
    dialog.showModal();
  }
  function renderHero() {
    const image = CITY_HERO_IMAGES[trip.city] || FALLBACK_HERO;
    const dateRangeText = trip.start_date && trip.end_date ? `${formatDateSlash(trip.start_date)}－${formatDateSlash(trip.end_date)}` : "";
    hero.innerHTML = `<button type="button" class="trip-hero-image-btn" id="heroZoomBtn" aria-label="放大查看旅行地圖"><img class="trip-hero-image" src="${image}" alt="${escape(trip.city || trip.title)} Hero Map" loading="eager"></button><div class="trip-hero-info"><h1>${escape(trip.title)}</h1><p class="trip-hero-destination">${escape([trip.country, trip.city].filter(Boolean).join("・") || "目的地慢慢決定")}</p>${dateRangeText ? `<p class="trip-hero-dates">${dateRangeText}</p>` : ""}</div>`;
    $("heroZoomBtn").onclick = () => openHeroZoom(image, trip.city || trip.title);
  }

  // Only a real season advisory Rule (destination + month + actual note content) earns a card -
  // no destination/month/rule match must never render a large "還在準備中" placeholder occupying
  // the top of the page. "知道了" is a genuine dismiss action (collapses the card, remembered per
  // trip+advisory) - it never touches trip data or recommendations, only this UI state.
  const ADVISORY_DISMISS_KEY = "softplanet-advisory-dismissed";
  function advisoryDismissed(adviceId) {
    try { return (JSON.parse(localStorage.getItem(ADVISORY_DISMISS_KEY) || "{}"))[tripId] === adviceId; } catch (_) { return false; }
  }
  function dismissAdvisory(adviceId) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(ADVISORY_DISMISS_KEY) || "{}"); } catch (_) { all = {}; }
    all[tripId] = adviceId;
    localStorage.setItem(ADVISORY_DISMISS_KEY, JSON.stringify(all));
  }
  function renderAdvisory() {
    const context = window.SoftPlanetServices.tripContext(tripId);
    const note = context?.destination_id ? window.SoftPlanetServices.seasonAdvisory(context.destination_id, context.travel_month) : null;
    if (!note || advisoryDismissed(note.id)) { advisory.hidden = true; return; }
    advisory.hidden = false;
    advisory.innerHTML = `<span class="mumu-asset" data-mumu aria-hidden="true"></span><div><h2>這個時間去，先知道這些</h2><p>${escape(note.summary)}</p><button type="button" class="secondary-btn" id="dismissAdvisoryBtn">知道了</button></div>`;
    $("dismissAdvisoryBtn").onclick = () => { dismissAdvisory(note.id); advisory.hidden = true; };
  }

  function updateDialogContent(dialog, title, bodyHtml) {
    dialog.innerHTML = `<button class="sheet-close" type="button" aria-label="關閉">×</button><h2>${title}</h2>${bodyHtml}`;
    dialog.querySelector(".sheet-close").onclick = () => dialog.close();
  }
  function openDialog(title, bodyHtml) {
    let dialog = $("tripToolDialog");
    if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "tripToolDialog"; dialog.className = "schedule-sheet"; document.body.appendChild(dialog); }
    updateDialogContent(dialog, title, bodyHtml);
    if (!dialog.open) dialog.showModal();
    return dialog;
  }
  function showJourneyToast(message) {
    let toast = $("journeyToast");
    if (!toast) { toast = document.createElement("div"); toast.id = "journeyToast"; toast.className = "toast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite"); document.body.appendChild(toast); }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  // ---- Tool bar ----
  function openWeatherTool() {
    const value = trip.city ? window.SoftPlanetServices.weather(trip.city) : null;
    const body = value
      ? `<div class="tool-dialog-body"><strong>${escape(value.status)} ${value.low}–${value.high}°</strong><p>更新於 ${new Date(value.updated_at).toLocaleDateString("zh-TW")}</p></div>`
      : `<div class="tool-dialog-body"><strong>目前無法更新</strong><p>沒有可信的天氣資料。</p></div>`;
    openDialog(`${trip.city || "目的地"}天氣`, `${body}<p class="service-note">天氣只顯示可信的每日快取，沒有資料時不會用示範數值替代。</p>`);
  }
  function openWorldTimeTool() {
    const time = trip.city ? window.SoftPlanetServices.worldTime(trip.city) : null;
    openDialog("世界時間", time ? `<div class="tool-dialog-body"><strong>${escape(trip.city)} ${time.destination}</strong><p>你的位置 ${time.local}・${time.difference}</p></div>` : `<p class="field-note">目前沒有這個城市的時區資料。</p>`);
  }
  function openUnitTool() {
    const categories = window.SoftPlanetServices.unitCategories;
    const body = `<form class="workspace-form" id="unitForm"><label>換算類別<select name="category">${categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select></label><label><span id="unitValueLabel">數值</span><input name="value" type="number" step="0.01" value="1"></label><div class="currency-result" id="unitResult"></div></form>`;
    const dialog = openDialog("單位換算", body);
    const form = dialog.querySelector("#unitForm");
    const update = () => {
      const values = Object.fromEntries(new FormData(form));
      const category = categories.find((c) => c.id === values.category);
      const result = window.SoftPlanetServices.convertUnit(category.id, values.value, category.units[0][0], category.units[1][0]);
      dialog.querySelector("#unitValueLabel").textContent = `${category.units[0][1]}`;
      dialog.querySelector("#unitResult").innerHTML = result === null ? "" : `<small>${values.value} ${category.units[0][1]}</small><strong>約 ${result.toFixed(2)} ${category.units[1][1]}</strong>`;
    };
    form.oninput = update; form.onchange = update; update();
  }
  function money(value, currency) {
    return new Intl.NumberFormat("zh-TW", { style: "currency", currency, maximumFractionDigits: ["JPY", "KRW"].includes(currency) ? 0 : 2 }).format(Number(value) || 0);
  }
  // Card-face summary for each tool - the toolbar should show this trip's real numbers at a
  // glance (e.g. "東京 27°C"), not just a generic icon+label that requires opening a dialog
  // to learn anything. Every branch degrades to an honest "目前無法更新" style message when
  // no trusted data (or no city/budget/currency) is available - never a placeholder number.
  function toolCardSummary(type) {
    if (type === "weather") {
      const value = trip.city ? window.SoftPlanetServices.weather(trip.city) : null;
      return value ? `${trip.city}・${value.status} ${value.low}–${value.high}°` : "目前無法更新";
    }
    if (type === "expenses") {
      const budget = window.SoftPlanetServices.budgetForTrip(tripId);
      if (!budget) return "尚未設定預算";
      const summary = window.SoftPlanetServices.expenseSummary(tripId, budget.currency);
      return `剩餘 ${money(budget.total_budget - summary.estimated, budget.currency)}`;
    }
    if (type === "worldtime") {
      const time = trip.city ? window.SoftPlanetServices.worldTime(trip.city) : null;
      return time ? `${trip.city} ${time.destination}` : "目前沒有時區資料";
    }
    if (type === "currency") {
      const code = window.SoftPlanetServices.currencyForCountry(trip.country);
      const result = code ? window.SoftPlanetServices.convert(1, "TWD", code) : null;
      return result ? `1 TWD ≈ ${result.amount.toFixed(2)} ${code}` : "目前無法更新";
    }
    if (type === "unit") {
      const sample = window.SoftPlanetServices.convertUnit("weight", 1, "lb", "kg");
      return `1 磅 ≈ ${sample.toFixed(2)} 公斤`;
    }
    return "";
  }
  function toolAction(type) {
    if (type === "weather") return openWeatherTool();
    if (type === "worldtime") return openWorldTimeTool();
    if (type === "unit") return openUnitTool();
    if (type === "expenses") { location.href = `block.html?trip=${encodeURIComponent(tripId)}&type=expenses`; return; }
    if (type === "currency") { location.href = `block.html?trip=${encodeURIComponent(tripId)}&type=currency`; return; }
  }
  function renderToolbar() {
    const enabled = new Set(window.SoftPlanetTripTools.enabledFor(tripId));
    const catalog = window.SoftPlanetServices.toolCatalog;
    const active = catalog.filter((tool) => tool.defaultTool || enabled.has(tool.id));
    const addable = catalog.filter((tool) => !tool.defaultTool && !enabled.has(tool.id));
    const metroUrl = metroMapFor(trip.city);
    const metroHtml = metroUrl ? `<button type="button" class="trip-tool-card" id="metroMapBtn"><span aria-hidden="true">🚇</span><strong>地鐵圖</strong></button>` : "";
    toolbar.innerHTML = `${active.map((tool) => `<button type="button" class="trip-tool-card" data-tool="${tool.type}"><span aria-hidden="true">${tool.icon}</span><strong>${tool.name}</strong><small>${escape(toolCardSummary(tool.type))}</small></button>`).join("")}${metroHtml}${addable.length ? `<button type="button" class="trip-tool-card trip-tool-add" id="addToolBtn"><span aria-hidden="true">＋</span><strong>新增工具</strong></button>` : ""}`;
    toolbar.querySelectorAll("[data-tool]").forEach((btn) => btn.onclick = () => toolAction(btn.dataset.tool));
    if (metroUrl) $("metroMapBtn").onclick = () => openHeroZoom(metroUrl, `${trip.city} 地鐵圖`);
    const addBtn = $("addToolBtn");
    if (addBtn) addBtn.onclick = () => {
      const body = `<div class="block-picker">${addable.map((tool) => `<article><span aria-hidden="true">${tool.icon}</span><div><h3>${tool.name}</h3><p>${tool.note}</p></div><button type="button" data-enable-tool="${tool.id}">加入</button></article>`).join("")}</div>`;
      const dialog = openDialog("新增工具", body);
      dialog.querySelectorAll("[data-enable-tool]").forEach((btn) => btn.onclick = () => { window.SoftPlanetTripTools.enable(tripId, btn.dataset.enableTool); dialog.close(); renderToolbar(); });
    };
  }

  // ---- Journey accordion ----
  function accordionItem(group, id, title, subtitle) {
    const item = document.createElement("div");
    item.className = "trip-accordion-item";
    const header = document.createElement("button");
    header.type = "button";
    header.className = "trip-accordion-header";
    header.innerHTML = `<span><strong>${title}</strong><small>${subtitle}</small></span><span class="trip-accordion-caret" aria-hidden="true">›</span>`;
    const panel = document.createElement("div");
    panel.className = "trip-accordion-panel";
    item.append(header, panel);
    group.register(id, header, panel);
    return { item, header, panel };
  }

  function dateRange(start, end) {
    const dates = [];
    let cursor = new Date(`${start}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor = new Date(cursor.getTime() + 86400000); }
    return dates;
  }
  // A "住宿區間" is defined by which accommodation (place_id) covers the night, not by the internal
  // stay record id - setNightStay's split logic can leave the same accommodation spread across
  // multiple adjacent records with different stay_ids, which must not be treated as separate segments.
  function checkInStayForIndex(nights, index) {
    const currentStay = nights[index]?.stay || null;
    if (!currentStay) return null;
    const previousStay = index > 0 ? (nights[index - 1]?.stay || null) : null;
    return currentStay.place_id !== previousStay?.place_id ? currentStay : null;
  }
  function formatDayLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return `${m}月${d}日・${WEEKDAYS[date.getDay()]}`;
  }
  // Compact collapsed-header label only (date range) - the full two-sentence warm copy
  // (boundaryWarmCopy, defined further below) is shown once, in the expanded panel body, so the
  // same information is never printed twice on this accordion item.
  function boundarySummaryText(record) {
    if (!record?.arrival_date || !record?.departure_date) return "尚未設定航班資訊";
    return `${formatDateSlash(record.arrival_date)}－${formatDateSlash(record.departure_date)}`;
  }
  // Stored value is just the number the user typed (e.g. "3") - this is the one place that turns
  // it into "（第 3 航廈）"; plain "羽田機場" (no parens at all) when not filled in.
  function terminalSuffix(terminal) {
    return terminal ? `（第 ${escape(terminal)} 航廈）` : "";
  }
  function hubOptionsHtml(list, selected) {
    return list.map((h) => `<option value="${h.id}" ${h.id === selected ? "selected" : ""}>${h.code}・${h.name}</option>`).join("");
  }
  // Arrival/departure default to this trip's city airports only (e.g. Tokyo -> HND/NRT), never a
  // mixed list of every recorded hub. otherHubs is always empty until real Airport Destination
  // Mapping data exists (see hubsForCity in trip-boundaries.js) - this entry point simply doesn't
  // render at all in that case, rather than show an arbitrary unrelated-country leftover list. A
  // hub already saved from before (legacy data, or a deliberately different airport) stays visible
  // by pre-expanding the full list for that one field.
  const SHOW_MORE_HUBS_VALUE = "__show_more_hubs__";
  // "查看更多可前往此目的地的鄰近機場" is a fixed last option on the dropdown, not a separate button -
  // it is always present (not just when other-hub data happens to exist), since the point is to let
  // the user discover the entry point either way. Selecting it never becomes a real saved value -
  // the change handler in openBoundaryEditor swaps it out for real other-hub options when a formal
  // Airport Destination Mapping provides any, or reveals the honest empty-state note below the
  // select when it doesn't (no such mapping exists anywhere in this project today - see
  // hubsForCity in trip-boundaries.js). Never fabricates a candidate list either way.
  function hubFieldHtml(labelText, name, selected, cityHubs, otherHubs) {
    const selectedInOther = selected && otherHubs.some((h) => h.id === selected);
    const expanded = selectedInOther || !cityHubs.length;
    const moreOption = !expanded ? `<option value="${SHOW_MORE_HUBS_VALUE}">查看更多可前往此目的地的鄰近機場</option>` : "";
    const options = `<option value="">請選擇</option>${hubOptionsHtml(cityHubs, selected)}${expanded ? hubOptionsHtml(otherHubs, selected) : moreOption}`;
    return `<label>${labelText}<select name="${name}" data-hub-select required>${options}</select></label><p class="field-note" data-hub-empty-note hidden>目前尚未整理其他可前往此目的地的境內機場。</p>`;
  }
  // Shared by the new-trip past-date/time guard (boundaryDialogForm/wireBoundaryDateGuards) and
  // the tentative-plan form - local system date/time, never UTC (toISOString would shift the date
  // near midnight in most timezones).
  function todayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function nowTimeString() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function oneMinuteAfter(time) {
    const [h, m] = time.split(":").map(Number);
    const total = (h * 60 + m + 1) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  function boundaryDialogForm(record) {
    const { primary: cityHubs, other: otherHubs } = window.SoftPlanetTripBoundaries.hubsForCity(trip.city);
    return `<form class="workspace-form" id="boundaryForm">
      <p class="section-helper">抵達</p>
      <div class="form-row"><label>日期<input name="arrival_date" type="date" value="${record?.arrival_date || ""}" required></label><label>抵達時間<input name="arrival_time" type="time" value="${record?.arrival_time || ""}" required></label></div>
      <p class="field-note">此時間為航班表定抵達目的地機場的時間。</p>
      ${hubFieldHtml("抵達機場", "arrival_hub_id", record?.arrival_hub_id, cityHubs, otherHubs)}
      <label class="terminal-inline-field">第 <input name="arrival_terminal" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${escape(record?.arrival_terminal || "")}"> 航廈（選填）</label>
      <p class="section-helper">離開</p>
      <div class="form-row"><label>日期<input name="departure_date" type="date" value="${record?.departure_date || ""}" required></label><label>起飛時間<input name="departure_time" type="time" value="${record?.departure_time || ""}" required></label></div>
      <p class="field-note">此時間為航班表定起飛時間，不是前往機場的時間。</p>
      ${hubFieldHtml("離開機場", "departure_hub_id", record?.departure_hub_id, cityHubs, otherHubs)}
      <label class="terminal-inline-field">第 <input name="departure_terminal" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${escape(record?.departure_terminal || "")}"> 航廈（選填）</label>
      <p class="mumu-reminder" id="boundaryFormError" role="status"></p>
      <button class="primary-btn" type="submit">確認航班資訊</button>
    </form>
    <div class="boundary-entry-links">
      <button type="button" class="flight-helper-card" id="openFlightGuideBtn">我還沒訂機票，我該如何買到優惠的機票？</button>
      <button type="button" class="flight-helper-card" id="openTentativePlanBtn">我要自己設定大概的抵達時間，先安排行程</button>
    </div>`;
  }
  // Shared by the "先設定抵達與離開" empty-state (brand-new trip, no dates yet) and the
  // accordion's "編輯抵達與離開" button. Saving here also derives trip.start_date/end_date from
  // arrival/departure so the user is never asked to enter trip dates a second time.
  // Real-time datetime guard: keeps departure_date/departure_time's own min constraints in sync
  // with whatever arrival is currently entered, so an invalid combo is never selectable in the
  // input itself rather than only being caught on submit. If the user later moves arrival later
  // and that invalidates an already-chosen departure, the departure fields are wiped immediately
  // with the required message - never left silently invalid, never silently accepted.
  function wireBoundaryDateGuards(dialog, originalArrivalDate, originalArrivalTime) {
    const form = dialog.querySelector("#boundaryForm");
    const arrivalDate = form.elements.arrival_date, arrivalTime = form.elements.arrival_time;
    const departureDate = form.elements.departure_date, departureTime = form.elements.departure_time;
    const errorEl = dialog.querySelector("#boundaryFormError");
    // Submit-time blocking only ever engages once the user actually retypes/repicks arrival_date
    // or arrival_time away from whatever was already saved (both "" for a brand-new trip, so any
    // first entry there already counts as changed). An existing trip's untouched, already-past
    // arrival stays fully browsable/re-savable for every other field (terminal note, etc.) - this
    // is what makes editing a completed trip's terminal note not require faking a future date.
    function arrivalChanged() {
      return arrivalDate.value !== originalArrivalDate || arrivalTime.value !== originalArrivalTime;
    }
    // The date/time picker itself must never offer an illegal option in the first place (same
    // experience as departure's min, which is always active, never just a post-submit check) - so
    // this min is set unconditionally, on every sync, not gated behind arrivalChanged(). Once the
    // value differs from what was saved, the floor is today (a genuinely new pick can never be in
    // the past); left untouched, the floor is simply the original value itself, so an existing,
    // already-past arrival is never flagged invalid purely for being redisplayed/resaved unchanged.
    function sync(fromDeparture) {
      const today = todayDateString();
      const changed = arrivalChanged();
      arrivalDate.min = changed ? today : (originalArrivalDate || today);
      if (arrivalDate.value === today) arrivalTime.min = changed ? oneMinuteAfter(nowTimeString()) : (originalArrivalTime || oneMinuteAfter(nowTimeString()));
      else arrivalTime.removeAttribute("min");
      if (arrivalDate.value) departureDate.min = arrivalDate.value; else departureDate.removeAttribute("min");
      const sameDay = Boolean(arrivalDate.value && departureDate.value && arrivalDate.value === departureDate.value);
      if (sameDay && arrivalTime.value) departureTime.min = oneMinuteAfter(arrivalTime.value); else departureTime.removeAttribute("min");
      if (fromDeparture) return;
      if (!(arrivalDate.value && arrivalTime.value && departureDate.value && departureTime.value)) return;
      const arrival = new Date(`${arrivalDate.value}T${arrivalTime.value}:00`);
      const departure = new Date(`${departureDate.value}T${departureTime.value}:00`);
      if (!(departure > arrival)) {
        departureDate.value = "";
        departureTime.value = "";
        departureTime.removeAttribute("min");
        errorEl.textContent = "🐻 離境時間需晚於抵達時間，請重新選擇。";
      }
    }
    arrivalDate.addEventListener("change", () => sync(false));
    arrivalTime.addEventListener("change", () => sync(false));
    departureDate.addEventListener("change", () => sync(true));
    departureTime.addEventListener("change", () => { errorEl.textContent = ""; });
    sync(true);
  }
  function openBoundaryEditor(onSaved) {
    const boundaryRecord = window.SoftPlanetTripBoundaries.get(tripId);
    // What the arrival was BEFORE this edit session - "" for a brand-new trip. Only actively
    // changing away from this triggers the no-past-arrival guard (see wireBoundaryDateGuards).
    const originalArrivalDate = boundaryRecord?.arrival_date || "";
    const originalArrivalTime = boundaryRecord?.arrival_time || "";
    const prefill = boundaryRecord || window.SoftPlanetTripBoundaries.legacyPrefill(tripId);
    const dialog = openDialog("航班資訊", boundaryDialogForm(prefill));
    dialog.querySelectorAll("select[data-hub-select]").forEach((select) => select.addEventListener("change", () => {
      if (select.value !== SHOW_MORE_HUBS_VALUE) return;
      const { other: otherHubs } = window.SoftPlanetTripBoundaries.hubsForCity(trip.city);
      select.querySelector(`option[value="${SHOW_MORE_HUBS_VALUE}"]`)?.remove();
      if (otherHubs.length) {
        select.insertAdjacentHTML("beforeend", hubOptionsHtml(otherHubs, ""));
      } else {
        const note = select.closest("label")?.nextElementSibling;
        if (note?.hasAttribute("data-hub-empty-note")) note.hidden = false;
      }
      select.value = "";
    }));
    wireBoundaryDateGuards(dialog, originalArrivalDate, originalArrivalTime);
    dialog.querySelector("#openTentativePlanBtn").onclick = () => openTentativePlanForm(dialog, onSaved);
    dialog.querySelector("#openFlightGuideBtn").onclick = () => openFlightGuideModal(() => openBoundaryEditor(onSaved));
    dialog.querySelector("#boundaryForm").onsubmit = async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const errorEl = dialog.querySelector("#boundaryFormError");
      // Departure must be strictly after arrival - comparing full datetimes catches both a
      // reversed date AND a same-day departure time that's before/equal to the arrival time in
      // one check. Previously nothing validated this at all: an invalid pair saved silently, and
      // dateRange(start,end) then produced an empty array for every downstream day/night
      // calculation with no visible error - "抵達與離開已設定" but stays/Day panels acted as if no
      // dates existed. Blocking the save here is the actual fix, not a copy change downstream.
      const arrival = new Date(`${values.arrival_date}T${values.arrival_time}:00`);
      const departure = new Date(`${values.departure_date}T${values.departure_time}:00`);
      if (!(departure > arrival)) {
        errorEl.textContent = "🐻 回程時間不能早於抵達時間喔，請重新確認日期與時間。";
        return;
      }
      // Only actively changing arrival away from what was already saved re-triggers the no-past-
      // arrival check (re-checked here at submit, not just the input's min attribute, in case the
      // dialog stayed open long enough for "now" to move past what was valid earlier). Resaving an
      // existing trip's untouched, already-past arrival (e.g. only editing the terminal note) is
      // never blocked by this.
      const arrivalChanged = values.arrival_date !== originalArrivalDate || values.arrival_time !== originalArrivalTime;
      if (arrivalChanged && arrival <= new Date()) {
        errorEl.textContent = "🐻 抵達時間必須晚於現在，請重新選擇。";
        return;
      }
      errorEl.textContent = "";
      // Single Source of Truth: trip.start_date/end_date (read by every Day/night/notebook
      // calculation) and the boundary record (read for arrival/departure time+airport display) must
      // never disagree. Writing trip.start_date/end_date FIRST and only persisting the boundary
      // record once that succeeds means a failure here leaves every piece of stored date data
      // exactly as it was before this submit - nothing is left half-written.
      if (values.arrival_date && values.departure_date && (trip.start_date !== values.arrival_date || trip.end_date !== values.departure_date)) {
        try { trip = await window.SoftPlanetStore.updateTripDates(tripId, { start_date: values.arrival_date, end_date: values.departure_date }); } catch (error) { errorEl.textContent = "🐻 旅行日期暫時無法儲存，請稍後再試一次。"; return; }
      }
      window.SoftPlanetTripBoundaries.save(tripId, values);
      dialog.close();
      onSaved();
    };
  }
  // For travelers who haven't booked real tickets yet: sets the same trip.start_date/end_date +
  // boundary record the formal flight form writes (arrival_hub_id/departure_hub_id left null,
  // since no real flight is confirmed), through the exact same save path - so Day1-N generation
  // and every other downstream reader keeps working unchanged. Deliberately does not chain into
  // the flight-confirm dialog or the arrival-transport/accommodation handoff below - those are
  // part of the formal flight flow, not this alternate one, and this Sprint must not touch them.
  // 暫訂航班資訊 only needs whole-hour precision ("大約幾點"), never minutes - a <select> of the 24
  // whole hours makes finer input physically impossible, rather than just discouraging it.
  // disabledUpToHour (inclusive) greys out any hour that would already be in the past today,
  // keeping the same no-past-arrival safeguard as the real form at this coarser granularity.
  function hourOptionsHtml(selectedTime, disabledUpToHour) {
    const selectedHour = selectedTime ? Number(selectedTime.split(":")[0]) : null;
    const opts = [];
    for (let h = 0; h < 24; h++) {
      const value = `${String(h).padStart(2, "0")}:00`;
      const disabled = disabledUpToHour !== null && h <= disabledUpToHour;
      opts.push(`<option value="${value}" ${h === selectedHour ? "selected" : ""} ${disabled ? "disabled" : ""}>${value}</option>`);
    }
    return opts.join("");
  }
  function tentativePlanFormHtml(record) {
    const { primary: cityHubs, other: otherHubs } = window.SoftPlanetTripBoundaries.hubsForCity(trip.city);
    // Picker itself must never offer an illegal option (min is always active, same as departure's
    // pattern) - unchanged, the floor is simply today or the already-saved date/hour, so an
    // existing, already-past estimate is never flagged invalid purely for being redisplayed.
    const today = todayDateString();
    const arrivalMin = record?.arrival_date || today;
    const initialDisabledHour = (record?.arrival_date || "") === today && record?.arrival_time
      ? Number(record.arrival_time.split(":")[0]) - 1 : null;
    return `<form class="workspace-form" id="tentativePlanForm">
      <p class="section-helper">先抓一個大概的旅行時間，等買到機票後還可以回來修改成正式航班資訊。</p>
      <p class="section-helper">預計抵達</p>
      <div class="form-row"><label>日期<input name="arrival_date" type="date" value="${record?.arrival_date || ""}" min="${arrivalMin}" required></label><label>大約幾點<select name="arrival_time" required>${hourOptionsHtml(record?.arrival_time, initialDisabledHour)}</select></label></div>
      ${hubFieldHtml("抵達機場", "arrival_hub_id", record?.arrival_hub_id, cityHubs, otherHubs)}
      <p class="section-helper">預計離開</p>
      <div class="form-row"><label>日期<input name="departure_date" type="date" value="${record?.departure_date || ""}" required></label><label>大約幾點<select name="departure_time" required>${hourOptionsHtml(record?.departure_time, null)}</select></label></div>
      ${hubFieldHtml("離開機場", "departure_hub_id", record?.departure_hub_id, cityHubs, otherHubs)}
      <p class="mumu-reminder" id="tentativeFormError" role="status"></p>
      <button class="primary-btn" type="submit">先用這個時間安排行程</button>
      <button type="button" class="text-button" id="tentativePlanBack">‹ 回到航班編輯</button>
    </form>`;
  }
  function openTentativePlanForm(dialog, onSaved) {
    const record = window.SoftPlanetTripBoundaries.get(tripId);
    const originalArrivalDate = record?.arrival_date || "";
    const originalArrivalTime = record?.arrival_time || "";
    updateDialogContent(dialog, "暫訂航班資訊", tentativePlanFormHtml(record));
    const form = dialog.querySelector("#tentativePlanForm");
    const errorEl = dialog.querySelector("#tentativeFormError");
    const arrivalDate = form.elements.arrival_date;
    dialog.querySelectorAll("select[data-hub-select]").forEach((select) => select.addEventListener("change", () => {
      if (select.value !== SHOW_MORE_HUBS_VALUE) return;
      const { other: otherHubs } = window.SoftPlanetTripBoundaries.hubsForCity(trip.city);
      select.querySelector(`option[value="${SHOW_MORE_HUBS_VALUE}"]`)?.remove();
      if (otherHubs.length) {
        select.insertAdjacentHTML("beforeend", hubOptionsHtml(otherHubs, ""));
      } else {
        const note = select.closest("label")?.nextElementSibling;
        if (note?.hasAttribute("data-hub-empty-note")) note.hidden = false;
      }
      select.value = "";
    }));
    // Same rule as the real form: only actively changing the estimated arrival away from what was
    // already saved re-triggers the no-past-arrival guard - re-saving an unchanged estimate (or
    // just picking a different airport) is never blocked, however old that estimate now is.
    function arrivalChanged() {
      return arrivalDate.value !== originalArrivalDate || form.elements.arrival_time.value !== originalArrivalTime;
    }
    // Picker min is always active (mirrors departure's always-on min, and the real form's arrival
    // guard) - unchanged, the floor is today or the original date/hour itself, never a post-submit
    // browser message the user only sees after already picking an illegal value.
    function refreshArrivalPicker() {
      const today = todayDateString();
      const changed = arrivalChanged();
      arrivalDate.min = changed ? today : (originalArrivalDate || today);
      const hourSelect = form.elements.arrival_time;
      const currentValue = hourSelect.value;
      let disabledHour = null;
      if (arrivalDate.value === today) {
        disabledHour = changed ? new Date().getHours() : (originalArrivalTime ? Number(originalArrivalTime.split(":")[0]) - 1 : new Date().getHours());
      }
      hourSelect.innerHTML = hourOptionsHtml(currentValue, disabledHour);
      if (hourSelect.selectedOptions[0]?.disabled) hourSelect.value = "";
    }
    arrivalDate.addEventListener("change", refreshArrivalPicker);
    dialog.querySelector("#tentativePlanBack").onclick = () => openBoundaryEditor(onSaved);
    form.onsubmit = async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const arrival = new Date(`${values.arrival_date}T${values.arrival_time}:00`);
      const departure = new Date(`${values.departure_date}T${values.departure_time}:00`);
      if (!(departure > arrival)) {
        errorEl.textContent = "🐻 預計離開時間不能早於預計抵達時間喔，請重新確認。";
        return;
      }
      if (arrivalChanged() && arrival <= new Date()) {
        errorEl.textContent = "🐻 抵達時間必須晚於現在，請重新選擇。";
        return;
      }
      errorEl.textContent = "";
      if (values.arrival_date && values.departure_date && (trip.start_date !== values.arrival_date || trip.end_date !== values.departure_date)) {
        try { trip = await window.SoftPlanetStore.updateTripDates(tripId, { start_date: values.arrival_date, end_date: values.departure_date }); } catch (error) { errorEl.textContent = "🐻 旅行日期暫時無法儲存，請稍後再試一次。"; return; }
      }
      window.SoftPlanetTripBoundaries.save(tripId, { arrival_date: values.arrival_date, arrival_time: values.arrival_time, arrival_hub_id: values.arrival_hub_id || null, departure_date: values.departure_date, departure_time: values.departure_time, departure_hub_id: values.departure_hub_id || null, tentative: true });
      dialog.close();
      // Deliberately calls renderJourney() directly rather than the onSaved passed into
      // openBoundaryEditor - that callback chains into the flight-confirm dialog and then the
      // arrival-transport/accommodation handoff, which all assume a real confirmed flight (their
      // copy reads the airport name). This alternate entry must not touch that chain at all, per
      // this Sprint's scope.
      renderJourney();
    };
  }
  // Flight Guide stays in-flow instead of navigating away to flight.html - its content is reused
  // completely unmodified via an iframe (never touched or duplicated), so reading it never leaves
  // 航班助手 stranded on a separate page. The dialog's own "✕" close (from openDialog) always
  // dismisses it; "‹ 返回上一層" additionally re-opens whichever screen launched it, when given one.
  function openFlightGuideModal(onBack) {
    // Carries this trip's id into the iframe (as ?trip=) so the MUMU booking-confirm Modal inside
    // Flight Guide knows which trip's Flight Assistant to return to once a booking is done.
    const dialog = openDialog("機票攻略", `<div class="flight-guide-modal">
      <div class="flight-guide-modal-bar"><button type="button" class="text-button" id="flightGuideBackBtn">‹ 回航班編輯</button></div>
      <iframe class="flight-guide-frame" src="flight.html?trip=${encodeURIComponent(tripId)}" title="機票攻略"></iframe>
    </div>`);
    dialog.querySelector("#flightGuideBackBtn").onclick = () => { dialog.close(); onBack?.(); };
  }
  // Real per-airport arrival/departure guide content (immigration, baggage claim, customs, SIM,
  // transit cards, security, liquids, tax refund, etc.) does not exist anywhere in this project
  // yet - guides.js only has general city-level guides, not directional airport guides. Kept
  // empty and honest rather than repurposing a generic guide or treating Google Maps as if it
  // were guide content. Populate per hub id once a real guide is written.
  const AIRPORT_GUIDES = {};
  function airportGuide(hubId, direction) {
    return AIRPORT_GUIDES[hubId]?.[direction] || null;
  }
  function openAirportGuide(hubId, direction) {
    const transport = window.SoftPlanetTripBoundaries.hubTransport(hubId);
    if (!transport) return;
    const guide = airportGuide(hubId, direction);
    const label = direction === "arrival" ? "機場入境攻略" : "機場出境攻略";
    const emptyMessage = direction === "arrival" ? "目前尚未整理這個機場的入境攻略。" : "目前尚未整理這個機場的出境攻略。";
    const navUrl = navigationUrl(hubAsPlace(transport.hub, trip.country));
    const body = guide
      ? `<p>${escape(transport.hub.name)}</p>${guide.sections.map((section) => `<p class="section-helper">${escape(section.title)}</p><p>${escape(section.content)}</p>`).join("")}`
      : `<p>${escape(transport.hub.name)}</p><p class="field-note">${escape(emptyMessage)}</p>`;
    const dialog = openDialog(label, `${body}${navUrl ? `<a class="primary-link" href="${navUrl}" target="_blank" rel="noopener noreferrer">開始導航 ↗</a>` : ""}`);
    return dialog;
  }
  function transportBlock(hubId, direction) {
    const transport = window.SoftPlanetTripBoundaries.hubTransport(hubId);
    if (!transport) return "";
    const label = direction === "arrival" ? "機場入境攻略" : "機場出境攻略";
    return `<p>${escape(transport.hub.name)}</p><button class="text-mini-action" type="button" data-airport-guide="${hubId}" data-direction="${direction}">${label}</button>`;
  }

  // Real Airport Transport Master data would live here, one array per hub id, once imported. Expected
  // record shape (subset actually rendered below): transport_id, destination_id, airport_id, direction,
  // transport_type, title, summary, estimated_minutes, estimated_cost, currency, service_area_summary,
  // arrival_area_ids, arrival_living_cluster_ids, booking_type, reservation_required, luggage_friendly,
  // service_hours, frequency_note, related_ticket_id, official_url, booking_url, affiliate_url,
  // google_map_url, naver_map_url, map_url, transport_tags, traveler_type_tags, display_order, status,
  // created_at, updated_at, last_review_date, notes.
  // Verified empty for every hub today (no such table/file exists anywhere in the project) - this must
  // stay empty rather than fabricate per-mode entries. Only "published" records would ever be offered.
  const AIRPORT_TRANSPORT_RECORDS = {};
  function airportTransportOptions(hubId) {
    return (AIRPORT_TRANSPORT_RECORDS[hubId] || []).filter((record) => record.status === "published");
  }
  function openTransportPicker({ hubId, tripId, date, isArrival, anchorTime, onAdded }) {
    const transport = window.SoftPlanetTripBoundaries.hubTransport(hubId);
    if (!transport) return;
    const options = airportTransportOptions(hubId);
    if (!options.length) {
      openDialog("機場交通", `<p class="field-note">${escape(transport.hub.name)}・目前尚未整理此機場的個別交通方式。${transport.officialUrl ? ` <a href="${transport.officialUrl}" target="_blank" rel="noopener noreferrer">查看機場官方交通頁 ↗</a>` : ""}</p>`);
      return;
    }
    const buffer = (isArrival ? transport.hub.arrival_buffer : transport.hub.departure_buffer) ?? null;
    const body = `<p class="field-note">${escape(transport.hub.name)}</p><div class="block-picker">${options.map((record) => `<article><span aria-hidden="true">🚄</span><div><h3>${escape(record.title)}</h3><p>${escape(record.summary || "")}${record.estimated_minutes ? `・約 ${record.estimated_minutes} 分鐘` : "・沒有時間資料"}</p></div><button type="button" data-add-mode="${escape(record.transport_id)}">加入行程</button></article>`).join("")}</div>`;
    const dialog = openDialog("機場交通", body);
    dialog.querySelectorAll("[data-add-mode]").forEach((btn) => btn.onclick = () => {
      const record = options.find((r) => r.transport_id === btn.dataset.addMode);
      const minutes = record.estimated_minutes ?? buffer ?? 90;
      let startTime, endTime;
      if (isArrival) {
        startTime = anchorTime;
        const endMin = (window.SoftPlanetTripItems.minutes(anchorTime) + minutes) % 1440;
        endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      } else {
        const startMin = (window.SoftPlanetTripItems.minutes(anchorTime) - minutes + 1440) % 1440;
        startTime = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
        endTime = anchorTime;
      }
      const note = record.estimated_minutes ? `${record.summary || ""}` : `${record.summary || ""}實際所需時間請以官方資訊為準。`;
      window.SoftPlanetTripItems.save({ trip_id: tripId, item_type: "transport", item_id: `transport-${hubId}-${record.transport_id}-${Date.now()}`, item_name: `機場交通：${record.title}`, trip_date: date, start_time: startTime, end_time: endTime, note });
      dialog.close();
      onAdded();
    });
  }

  // Sprint A.6A: a place already linked to this trip (favorited/custom/previously scheduled) must
  // stay a visible candidate forever - "不感興趣"/hide-recommendation is removed entirely, and
  // scheduling something no longer excludes it from future candidate lists (repeat scheduling is
  // allowed). This intentionally returns every trip-linked place regardless of schedule status.
  async function tripLinkedPlaces() {
    const placeIds = await window.SoftPlanetStore.listPlaceIds(tripId);
    return placeIds.map((id) => window.getSoftPlanetPlace(id));
  }

  // Dormant: A.4.1 introduced an explicit "不感興趣" hide state, separate from deleting a scheduled
  // item. Sprint A.6A removes the feature (candidates must never disappear because of it), but an
  // existing user's old hidden-list data is left untouched rather than force-deleted - it is simply
  // never read or written to again anywhere in this file.
  const HIDDEN_REC_KEY = "softplanet-hidden-recommendations";
  function hiddenRecIds() {
    try { return (JSON.parse(localStorage.getItem(HIDDEN_REC_KEY) || "{}"))[tripId] || []; } catch (_) { return []; }
  }

  // Deleting a scheduled item must free the place to be recommended/added again - only removing it
  // from trip_places (not just the schedule entry) achieves that, since candidate lists also read
  // trip_places. Manual (non-place) entries have no place record to remove.
  async function removeScheduleItem(item) {
    window.SoftPlanetTripItems.remove(item.trip_item_id);
    if (item.item_type === "place" && !String(item.item_id).startsWith("manual-")) {
      await window.SoftPlanetStore.removePlace(tripId, item.item_id);
    }
  }

  // Best-effort parse of the free-text duration field ("約 2–3 小時" / "約 90 分鐘"); a range takes the
  // shorter value. No official suggested-duration field exists for items without one, so those fall
  // back to an editable 60 minutes - never presented as an official recommendation, just a starting point.
  function parseDurationMinutes(place) {
    const text = place?.duration || "";
    const rangeMatch = text.match(/(\d+)\s*[–—-]\s*(\d+)\s*小時/);
    if (rangeMatch) return Number(rangeMatch[1]) * 60;
    const hourMatch = text.match(/(\d+)\s*小時/);
    if (hourMatch) return Number(hourMatch[1]) * 60;
    const minMatch = text.match(/(\d+)\s*分鐘/);
    if (minMatch) return Number(minMatch[1]);
    return 60;
  }
  function addMinutesToTime(time, minutesToAdd) {
    const total = (window.SoftPlanetTripItems.minutes(time) + minutesToAdd + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  // Chains from the day's latest existing item; on Day 1 with no items yet, starts after arrival +
  // the hub's real arrival_buffer (never a fabricated buffer); otherwise a plain 08:00 default.
  function computeStartTime(date) {
    const minutes = window.SoftPlanetTripItems.minutes;
    const dayItems = window.SoftPlanetTripItems.itemsForDate(tripId, date);
    if (dayItems.length) {
      return dayItems.reduce((latest, item) => minutes(item.end_time) > minutes(latest) ? item.end_time : latest, "00:00");
    }
    const boundary = window.SoftPlanetTripBoundaries.get(tripId);
    if (date === trip.start_date && boundary?.arrival_time) {
      const hub = window.SoftPlanetTripBoundaries.HUBS().find((h) => h.id === boundary.arrival_hub_id);
      return addMinutesToTime(boundary.arrival_time, hub?.arrival_buffer ?? 90);
    }
    return "08:00";
  }
  // The only function that actually writes a schedule entry. Called strictly after the user
  // presses 確認加入 in openPendingConfirm below - never directly from a candidate card.
  async function commitPendingItem(pending, reopen) {
    await window.SoftPlanetStore.addPlace(tripId, pending.place.id);
    // Formal Departure Boundary lock (trip-schedule.js save()): a blocked result must not touch
    // Journey at all - the place was only added to this trip's place list above (harmless on its
    // own), nothing schedule-related is written, and the caller shows the lock message instead of
    // closing/refreshing the dialog.
    const result = window.SoftPlanetTripItems.save({ trip_id: tripId, item_type: "place", item_id: pending.place.id, item_name: pending.place.name, trip_date: pending.date, start_time: pending.start_time, end_time: pending.end_time, note: "" });
    if (result.blocked) return result;
    renderJourney(reopen);
    return result;
  }
  function departureLockBlockHtml(lockStart) {
    return `<div class="mumu-assistant-body">
      <p class="mumu-reminder">🐻 這個時間已經要準備前往機場，請安排在 ${escape(lockStart)} 以前。</p>
      <div class="dialog-actions"><button type="button" class="secondary-btn" id="lockBackBtn">返回調整</button><button type="button" class="primary-btn" id="lockViewTransportBtn">查看機場交通</button></div>
    </div>`;
  }
  function scheduleInstancesFor(placeId) {
    return window.SoftPlanetTripItems.list(tripId).filter((item) => item.item_id === placeId);
  }
  // custom-item-service.js never touches the favorites id-list itself - without this, "已加入我的
  // 收藏" would not actually be true, and favorites.html's type filter would never see the new card.
  // card-actions.js (which normally owns favoriting) isn't loaded on trip.html, so this mirrors its
  // storage format directly rather than adding a new script dependency for one call site.
  function addToFavorites(id) {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem("softplanet-favorites") || "[]"); } catch (_) { ids = []; }
    if (!Array.isArray(ids)) ids = [];
    if (!ids.includes(id)) localStorage.setItem("softplanet-favorites", JSON.stringify([...ids, id]));
  }
  // Builds the in-memory Pending Item shown in the confirm summary. Reuses the existing
  // computeStartTime/parseDurationMinutes suggested-time logic as-is (not rewritten this sprint) -
  // the values are frozen here and carried through to commitPendingItem unchanged.
  function buildPendingItem(place, date, categoryLabel) {
    const start_time = computeStartTime(date);
    const durationMinutes = parseDurationMinutes(place);
    return { place, date, categoryLabel, start_time, end_time: addMinutesToTime(start_time, durationMinutes), durationMinutes };
  }
  function pendingConfirmHtml(pending) {
    const instances = scheduleInstancesFor(pending.place.id);
    const sameDay = instances.some((i) => i.trip_date === pending.date);
    const otherDay = instances.find((i) => i.trip_date !== pending.date);
    const scheduledNote = sameDay ? "是（這一天已經安排過）" : otherDay ? `是（${otherDay.trip_date} 已經安排過）` : "否";
    return `<div class="mumu-assistant-body">
      <p class="section-helper">確認加入</p>
      <p><strong>名稱</strong>　${escape(pending.place.name)}</p>
      <p><strong>類型</strong>　${escape(pending.categoryLabel)}</p>
      <p><strong>日期</strong>　${escape(pending.date)}</p>
      <p><strong>建議開始時間</strong>　${escape(pending.start_time)}</p>
      <p><strong>建議結束時間</strong>　${escape(pending.end_time)}</p>
      <p><strong>建議停留時間</strong>　${pending.durationMinutes} 分鐘</p>
      ${pending.place.subarea ? `<p><strong>區域／生活圈</strong>　${escape(pending.place.subarea)}</p>` : ""}
      <p><strong>是否曾安排過</strong>　${scheduledNote}</p>
      <div class="dialog-actions"><button type="button" class="secondary-btn" id="pendingCancelBtn">取消</button><button type="button" class="primary-btn" id="pendingConfirmBtn">確認加入</button></div>
    </div>`;
  }
  function duplicateWarningHtml(pending) {
    const instances = scheduleInstancesFor(pending.place.id);
    const sameDay = instances.some((i) => i.trip_date === pending.date);
    const otherDay = instances.find((i) => i.trip_date !== pending.date);
    const message = sameDay
      ? `這個${pending.categoryLabel}今天已經安排過囉，還要再安排一次嗎？`
      : `這個${pending.categoryLabel}在 ${otherDay.trip_date} 已經安排過囉，還要再次加入嗎？`;
    return `<div class="mumu-assistant-body"><p>🐻 ${message}</p><div class="dialog-actions"><button type="button" class="secondary-btn" id="pendingDupCancel">取消</button><button type="button" class="primary-btn" id="pendingDupContinue">仍然加入</button></div></div>`;
  }
  // Shared "candidate card -> Pending Item -> confirm -> commit" step, used by the top-level MUMU
  // assistant, custom-card creation, and the nearby-recommendation widget in place/stay detail
  // alike. Nothing is written to Journey/localStorage until 確認加入 (and 仍然加入 if a duplicate
  // is detected) is pressed; clicking a different candidate before that just discards this pending
  // item in favor of a new one, since it never left this local variable.
  function openPendingConfirm({ place, date, categoryLabel, reopen, onCancel, onCommitted }) {
    const dialog = $("tripToolDialog");
    const pending = buildPendingItem(place, date, categoryLabel);
    updateDialogContent(dialog, "MUMU 行程助手", pendingConfirmHtml(pending));
    dialog.querySelector("#pendingCancelBtn").onclick = () => onCancel();
    let submitted = false;
    const handleBlocked = (result) => {
      updateDialogContent(dialog, "MUMU 行程助手", departureLockBlockHtml(result.lockStart));
      dialog.querySelector("#lockBackBtn").onclick = () => onCancel();
      dialog.querySelector("#lockViewTransportBtn").onclick = () => {
        const boundary = window.SoftPlanetTripBoundaries.get(tripId);
        onCancel();
        openTransportPicker({ hubId: boundary?.departure_hub_id, tripId, date, isArrival: false, anchorTime: boundary?.departure_time || "18:00", onAdded: () => renderJourney(reopen) });
      };
    };
    dialog.querySelector("#pendingConfirmBtn").onclick = () => {
      if (submitted) return;
      submitted = true;
      dialog.querySelector("#pendingConfirmBtn").disabled = true;
      if (scheduleInstancesFor(pending.place.id).length) {
        updateDialogContent(dialog, "MUMU 行程助手", duplicateWarningHtml(pending));
        dialog.querySelector("#pendingDupCancel").onclick = () => onCancel();
        dialog.querySelector("#pendingDupContinue").onclick = async () => {
          const result = await commitPendingItem(pending, reopen);
          if (result.blocked) { handleBlocked(result); return; }
          onCommitted();
        };
        return;
      }
      commitPendingItem(pending, reopen).then((result) => {
        if (result.blocked) { handleBlocked(result); return; }
        onCommitted();
      });
    };
  }

  async function renderRecommendationSection(container, anchorPlace, categories, date, reopen) {
    const result = window.SoftPlanetRecommendations.recommend(anchorPlace, categories, []);
    if (!result.items.length) {
      container.innerHTML = `<p class="field-note">這一區還沒有符合條件的正式內容，可以到旅行靈感看看其他地方。</p>`;
      return;
    }
    const categoryLabel = categories.includes("景點") ? "景點" : "美食";
    container.innerHTML = `<p class="section-helper">${window.SoftPlanetRecommendations.levelHeading(result.level)}</p><div class="rec-card-list">${result.items.slice(0, 6).map((place) => `<article><span aria-hidden="true">${place.emoji}</span><div><h3>${escape(place.name)}</h3><p>${escape(place.summary || "")}</p></div><button type="button" data-add-rec="${escape(place.id)}">加入</button></article>`).join("")}</div>`;
    container.querySelectorAll("[data-add-rec]").forEach((btn) => btn.onclick = () => openPendingConfirm({
      place: window.getSoftPlanetPlace(btn.dataset.addRec), date, categoryLabel, reopen,
      onCancel: () => $("tripToolDialog").close(),
      onCommitted: () => $("tripToolDialog").close()
    }));
  }

  // Nearby recommendations collapse to two entry rows (周邊景點／周邊美食); guides/souvenirs/tickets
  // are second-tier information attached to each place's own detail modal, not shown at this outer layer.
  const REC_TIP_KEY = "softplanet-rec-tip-dismissed";
  function renderRecommendationEntries(container, anchorPlace, date, reopen) {
    const tipHtml = localStorage.getItem(REC_TIP_KEY) === "true" ? "" : `<div class="rec-tip" id="recTip"><p>🐻 MUMU 推薦你看看附近的行程喔！</p><ul><li>周邊景點：看看這一區還能去哪裡</li><li>周邊美食：找餐廳、咖啡或早餐</li><li>推薦只是參考，也可從收藏或專屬卡安排</li></ul><button type="button" id="dismissRecTip">知道了</button></div>`;
    container.innerHTML = `${tipHtml}<div class="rec-entry-list"><button type="button" class="rec-entry" data-rec-toggle="spot"><span aria-hidden="true">📍</span><strong>周邊景點</strong><span class="trip-accordion-caret" aria-hidden="true">›</span></button><div class="rec-entry-body" id="recSpotBody" hidden></div><button type="button" class="rec-entry" data-rec-toggle="food"><span aria-hidden="true">🍜</span><strong>周邊美食</strong><span class="trip-accordion-caret" aria-hidden="true">›</span></button><div class="rec-entry-body" id="recFoodBody" hidden></div></div>`;
    container.querySelector("#dismissRecTip")?.addEventListener("click", () => { localStorage.setItem(REC_TIP_KEY, "true"); renderJourney(reopen); });
    let spotLoaded = false, foodLoaded = false;
    container.querySelector('[data-rec-toggle="spot"]').addEventListener("click", async (event) => {
      const body = container.querySelector("#recSpotBody");
      const opening = body.hidden;
      body.hidden = !opening;
      event.currentTarget.querySelector(".trip-accordion-caret").classList.toggle("open", opening);
      if (opening && !spotLoaded) { spotLoaded = true; await renderRecommendationSection(body, anchorPlace, ["景點"], date, reopen); }
    });
    container.querySelector('[data-rec-toggle="food"]').addEventListener("click", async (event) => {
      const body = container.querySelector("#recFoodBody");
      const opening = body.hidden;
      body.hidden = !opening;
      event.currentTarget.querySelector(".trip-accordion-caret").classList.toggle("open", opening);
      if (opening && !foodLoaded) { foodLoaded = true; await renderRecommendationSection(body, anchorPlace, ["美食", "餐廳"], date, reopen); }
    });
  }

  // Shared detail rendering for spots/food/hotels. Every row is optional and only appears when the
  // underlying place actually has that field - nothing here is invented.
  const TICKET_PRIORITY = ["官方", "Klook", "KKday", "Trip.com"];
  function sortTicketLinks(links) {
    return [...links].sort((a, b) => {
      const ai = TICKET_PRIORITY.findIndex((p) => a.name.includes(p));
      const bi = TICKET_PRIORITY.findIndex((p) => b.name.includes(p));
      return (ai === -1 ? TICKET_PRIORITY.length : ai) - (bi === -1 ? TICKET_PRIORITY.length : bi);
    });
  }
  function areaName(place) {
    if (place.subarea) return place.subarea;
    if (!place.area_id) return null;
    return (window.SoftPlanetServices.areas(place.country, place.city) || []).find((a) => a.id === place.area_id)?.name || null;
  }
  function navigationUrl(place) {
    return place ? window.SoftPlanetMaps.resolve(place).url || null : null;
  }
  function hubAsPlace(hub, country) {
    if (!hub) return null;
    return { id: `hub-${hub.id}`, name: hub.name, city: hub.destination || null, country: country || null, category: "機場", map_url: hub.map_url || null };
  }
  function hubIdFromTransportItemId(itemId) {
    const parts = String(itemId || "").split("-");
    return parts[0] === "transport" ? parts[1] : null;
  }
  function placeDetailHtml(place, options = {}) {
    const rows = [];
    if (options.time) rows.push(["🕰️", options.time]);
    if (place.summary) rows.push(["", place.summary]);
    if (place.tip) rows.push(["🐻", place.tip]);
    if (place.address) rows.push(["📍", place.address]);
    if (areaName(place)) rows.push(["🏘️", areaName(place)]);
    if (place.duration) rows.push(["⏱️", `建議停留 ${place.duration}`]);
    if (place.transport) rows.push(["🚉", place.transport]);
    if (place.surroundings) rows.push(["🏙️", place.surroundings]);
    if (place.facilities) rows.push(["🛎️", place.facilities]);
    const note = options.note || place.short_note;
    if (note) rows.push(["📝", note]);
    const mapUrl = navigationUrl(place);
    const ticketLinks = sortTicketLinks((place.ticket_links || []).filter((t) => window.SoftPlanetMaps.safe(t.url)));
    // "相關攻略" intentionally removed here: guidesFor() only matches by country/city, which is not
    // an explicit relation (no related_spot_ids/related_food_ids/source_id-target_id field exists
    // anywhere in the data model). Guide data and guidesFor() stay available for a future surface
    // that isn't scoped to a single place's detail (e.g. a city-level guide list).
    return `<div class="tool-dialog-body">
      <p class="eyebrow">${escape([place.city, place.category].filter(Boolean).join("・"))}</p>
      <h3>${escape(place.name)}</h3>
      ${rows.map(([icon, text]) => `<p class="field-note">${icon ? `${icon} ` : ""}${escape(text)}</p>`).join("")}
      ${mapUrl ? `<a class="secondary-btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer">開始導航 →</a>` : ""}
      ${ticketLinks.length ? `<p class="section-helper">票券</p><div class="external-grid">${ticketLinks.map((t) => `<a href="${window.SoftPlanetMaps.safe(t.url)}" target="_blank" rel="noopener noreferrer">${escape(t.name)} ↗</a>`).join("")}</div>` : ""}
    </div>`;
  }
  function openPlaceDetail(place, options = {}) {
    const dialog = openDialog("詳情", `${placeDetailHtml(place, options)}<button class="secondary-btn" type="button" id="goToEditBtn">前往編輯模式</button>`);
    dialog.querySelector("#goToEditBtn").onclick = () => { dialog.close(); viewMode = "edit"; renderJourney(options.dayId); };
  }

  function stayDetailBody(night) {
    if (!night.stay) return { html: `<p class="field-note">這晚還沒有指定住宿。</p>`, place: null };
    const place = window.getSoftPlanetPlace(night.stay.place_id);
    const rows = [["📍", place.address], ["🚉", place.transport], ["🏙️", place.surroundings], ["🛎️", place.facilities]].filter(([, value]) => value);
    const navUrl = navigationUrl(place);
    return {
      html: `<div class="tool-dialog-body"><p class="eyebrow">${escape(place.city)}・${escape(place.category)}</p><h3>${escape(place.name)}</h3>${place.summary ? `<p>${escape(place.summary)}</p>` : ""}${rows.map(([icon, value]) => `<p class="field-note">${icon} ${escape(value)}</p>`).join("")}${navUrl ? `<a class="secondary-btn" href="${navUrl}" target="_blank" rel="noopener noreferrer">開始導航 →</a>` : ""}<div id="stayDetailNearby"></div></div>`,
      place
    };
  }
  function openStayDetail(night, date, reopen) {
    const { html: bodyHtml, place } = stayDetailBody(night);
    const label = night.stay ? "更換住宿" : "安排住宿";
    const dialog = openDialog("住宿詳情", `${bodyHtml}<button class="secondary-btn" type="button" id="changeStayBtn">${label}</button>`);
    dialog.querySelector("#changeStayBtn").onclick = () => { dialog.close(); openAccommodationAssistant({ presetDate: date, onDone: () => renderJourney(reopen) }); };
    if (place) {
      const nearby = dialog.querySelector("#stayDetailNearby");
      renderRecommendationEntries(nearby, place, date, reopen);
    }
  }

  // ---- MUMU 住宿助手 ----
  // Data reality check (verified by full-project search): no dedicated Accommodation Area master
  // with descriptive content exists anywhere, and only 2 hotel-category places exist in the whole
  // project, both explicitly demo:true layout placeholders. window.SoftPlanetAccommodation
  // (trip-accommodation.js) is the honest real-data layer this assistant reads from; every step
  // below hides fields/sections that have no real content instead of inventing copy.
  const addDays = (date, n) => new Date(new Date(`${date}T12:00:00`).getTime() + n * 86400000).toISOString().slice(0, 10);
  function hotelFieldRows(place) {
    return [["📍", place.address], ["🚉", place.transport], ["🛎️", place.facilities]].filter(([, v]) => v);
  }
  function hotelCardHtml(place) {
    const rows = hotelFieldRows(place).slice(0, 1);
    return `<article><span aria-hidden="true">${place.emoji || "🏨"}</span><div><h3>${escape(place.name)}</h3>${place.summary ? `<p>${escape(place.summary)}</p>` : ""}${place.suitable ? `<p class="field-note">${escape(place.suitable)}</p>` : ""}${rows.map(([icon, v]) => `<p class="field-note">${icon} ${escape(v)}</p>`).join("")}</div><button type="button" data-open-hotel="${escape(place.id)}">查看詳情</button></article>`;
  }
  function accommodationStaySourceHtml(idSuffix) {
    return `<div class="stay-picker-actions">
      <button type="button" class="secondary-btn" id="assistantStayFav${idSuffix}">從我的收藏選住宿</button>
      <button type="button" class="secondary-btn" id="assistantStayCustom${idSuffix}">新增專屬住宿卡</button>
    </div><div id="assistantStaySourceBody${idSuffix}"></div>`;
  }
  function wireAccommodationStaySource(dialog, idSuffix, ctx) {
    dialog.querySelector(`#assistantStayFav${idSuffix}`).onclick = () => {
      const host = dialog.querySelector(`#assistantStaySourceBody${idSuffix}`);
      const list = favoritesByCategory(["住宿"]);
      host.innerHTML = list.length
        ? `<div class="rec-card-list">${list.map((place) => `<article><span aria-hidden="true">${place.emoji}</span><div><h3>${escape(place.name)}</h3>${place.summary ? `<p>${escape(place.summary)}</p>` : ""}</div><button type="button" data-pick-fav-hotel="${escape(place.id)}">選擇</button></article>`).join("")}</div>`
        : `<p class="field-note">收藏裡還沒有住宿類型的地點。</p>`;
      host.querySelectorAll("[data-pick-fav-hotel]").forEach((btn) => btn.onclick = () => onHotelChosen(window.getSoftPlanetPlace(btn.dataset.pickFavHotel), ctx));
    };
    dialog.querySelector(`#assistantStayCustom${idSuffix}`).onclick = () => {
      const host = dialog.querySelector(`#assistantStaySourceBody${idSuffix}`);
      const areas = window.SoftPlanetAccommodation.areasForDestination(trip.country, trip.city);
      host.innerHTML = `<form class="workspace-form" id="assistantStayCustomForm">
        <label>住宿名稱<input name="custom_name" maxlength="60" required></label>
        <label>住宿區域<select name="area_id" required><option value="">請選擇</option>${areas.map((a) => `<option value="${a.accommodation_area_id}" data-name="${a.name}">${a.name}</option>`).join("")}</select></label>
        <label>Google Maps（選填）<input name="maps_url" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…"></label>
        <label>備註（選填）<textarea name="short_note" maxlength="100"></textarea></label>
        <button class="primary-btn" type="submit">建立並繼續</button>
      </form>`;
      host.querySelector("#assistantStayCustomForm").onsubmit = (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        const areaOption = event.currentTarget.elements.area_id.options[event.currentTarget.elements.area_id.selectedIndex];
        const mapsUrl = window.SoftPlanetMaps.safe(values.maps_url);
        const references = mapsUrl ? [{ name: "Google Maps", url: mapsUrl }] : [];
        const item = window.SoftPlanetCustomItems.create({ trip_id: tripId, country: trip.country, city: trip.city, area_id: values.area_id, area_name: areaOption?.dataset.name || "", item_type: "住宿", custom_name: values.custom_name, short_note: values.short_note || "", references });
        addToFavorites(item.id);
        onHotelChosen(item, ctx);
      };
    };
  }
  function accommodationAreaListHtml() {
    const areas = window.SoftPlanetAccommodation.areasForDestination(trip.country, trip.city);
    return `<div class="mumu-assistant-body">
      <div class="mumu-assistant-header"><span class="mumu-asset" data-mumu aria-hidden="true"></span><div><strong>先看看${escape(trip.city || "這座城市")}哪一區比較適合你吧！</strong><small>每一區的交通和旅行氣氛都不太一樣，我陪你慢慢選。</small></div></div>
      ${areas.length ? `<div class="area-card-list">${areas.map((area) => `<button type="button" class="area-card" data-pick-area="${escape(area.accommodation_area_id)}"><strong>${escape(area.name)}</strong>${area.short_recommendation ? `<small>${escape(area.short_recommendation)}</small>` : ""}</button>`).join("")}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>這座城市的住宿區還在整理中</h3><p>可以先從我的收藏選住宿，或新增專屬住宿卡。</p></div>`}
      ${accommodationStaySourceHtml("1")}
    </div>`;
  }
  function accommodationAreaDetailHtml(area) {
    const fields = [["適合旅客", area.suited_for], ["交通特色", area.transport_highlight], ["簡短介紹", area.description], ["注意事項", area.notes]].filter(([, v]) => v);
    return `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="assistantAreaBack">‹ 返回住宿區總覽</button>
      <h3>${escape(area.name)}</h3>
      ${area.short_recommendation ? `<p>${escape(area.short_recommendation)}</p>` : ""}
      ${fields.map(([label, value]) => `<p class="section-helper">${label}</p><p>${escape(value)}</p>`).join("")}
      <div class="dialog-actions"><button type="button" class="primary-btn" id="assistantSeeHotelsBtn">查看這一區的飯店</button></div>
    </div>`;
  }
  function accommodationHotelListHtml(area) {
    const hotels = window.SoftPlanetAccommodation.hotelsForArea(trip.country, trip.city, area.accommodation_area_id);
    return `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="assistantHotelListBack">‹ 返回${escape(area.name)}介紹</button>
      <p class="section-helper">${escape(area.name)}的飯店</p>
      ${hotels.length ? `<div class="rec-card-list">${hotels.map(hotelCardHtml).join("")}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>這一區還沒有正式收錄的飯店</h3><p>可以先從我的收藏選住宿，或新增專屬住宿卡。</p></div>`}
      ${accommodationStaySourceHtml("2")}
    </div>`;
  }
  function accommodationHotelDetailHtml(place) {
    const rows = hotelFieldRows(place);
    const links = (place.reference_links && place.reference_links.length) ? place.reference_links : [place.google_map_url && { name: "Google Maps", url: place.google_map_url }, place.naver_map_url && { name: "Naver Map", url: place.naver_map_url }].filter(Boolean);
    return `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="assistantHotelDetailBack">‹ 返回飯店列表</button>
      <h3>${escape(place.name)}</h3>
      ${place.summary ? `<p>${escape(place.summary)}</p>` : ""}
      ${rows.map(([icon, v]) => `<p class="field-note">${icon} ${escape(v)}</p>`).join("")}
      ${place.short_note ? `<p class="field-note">📝 ${escape(place.short_note)}</p>` : ""}
      ${links.length ? `<div class="stay-picker-actions">${links.slice(0, 3).map((l) => `<a class="secondary-btn" href="${escape(l.url)}" target="_blank" rel="noopener noreferrer">${escape(l.name)} ↗</a>`).join("")}</div>` : ""}
      <div class="dialog-actions"><button type="button" class="primary-btn" id="assistantAddHotelBtn">加入旅行</button></div>
    </div>`;
  }
  // Accommodation nights are never an input - they are purely the count of dates the user checks
  // below. There is no "1/2/3/custom nights" step, no "N nights left, adjust?" prompt, and no
  // range-extrapolation from a single start date: every stay-able date in the trip is listed as
  // its own checkbox (with its current assignment, if any), and the user picks any subset - one
  // day, a contiguous run, or a non-contiguous mix. This directly replaces the nights-based flow
  // that produced the "剩下 1 晚，要調整為 1 晚嗎？" bug against a 7-night trip.
  function accommodationDateCheckboxHtml(presetDate) {
    const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
    return `<div class="mumu-assistant-body">
      <p>🐻 這間想安排在哪幾晚呢？</p>
      <p class="section-helper">可以選連續日期，也可以只選其中幾晚。</p>
      <div class="stay-picker-actions">
        <button type="button" class="secondary-btn" id="stayCheckAllUnassigned">全選尚未安排日期</button>
        <button type="button" class="secondary-btn" id="stayCheckNone">取消全選</button>
      </div>
      <div class="stay-date-list">${nights.map((n) => `<label class="stay-date-row"><input type="checkbox" data-stay-checkbox value="${n.date}" ${n.date === presetDate ? "checked" : ""}><span>${escape(formatDayLabel(n.date))}</span><small>${n.stay ? `目前：${escape(n.stay.place_name)}` : "尚未安排"}</small></label>`).join("")}</div>
      <p class="field-note" id="stayDateNote"></p>
      <div class="dialog-actions"><button type="button" class="secondary-btn" id="stayDateBack">上一步</button><button type="button" class="primary-btn" id="stayDateNext">下一步</button></div>
    </div>`;
  }
  function accommodationStayConfirmHtml(ctx, selectedDates) {
    const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
    const rows = selectedDates.map((date) => ({ date, existing: nights.find((n) => n.date === date)?.stay }));
    const fresh = rows.filter((r) => !r.existing);
    const conflicts = rows.filter((r) => r.existing && r.existing.place_id !== ctx.place.id);
    return `<div class="mumu-assistant-body">
      <p class="section-helper">確認安排</p>
      <p><strong>飯店</strong>　${escape(ctx.place.name)}</p>
      ${ctx.place.subarea ? `<p><strong>住宿區</strong>　${escape(ctx.place.subarea)}</p>` : ""}
      <p><strong>已選日期</strong>　${selectedDates.length} 晚（${selectedDates.map((d) => escape(d)).join("、")}）</p>
      ${fresh.length ? `<p class="field-note">新安排：${fresh.map((r) => escape(r.date)).join("、")}</p>` : ""}
      ${conflicts.length ? `<p class="field-note">⚠️ 以下日期將由原本的住宿改成這一間：${conflicts.map((r) => `${escape(r.date)}（原：${escape(r.existing.place_name)}）`).join("、")}</p>` : ""}
      <div class="dialog-actions"><button type="button" class="secondary-btn" id="stayConfirmBack">返回修改</button><button type="button" class="primary-btn" id="stayConfirmBtn">確認安排</button></div>
    </div>`;
  }
  function accommodationContinueHtml(trip) {
    const remaining = window.SoftPlanetTripStays.nightsForTrip(trip).filter((n) => !n.stay);
    if (!remaining.length) {
      return { done: true, html: `<div class="mumu-assistant-body"><p>🐻 住宿都安排好了！附近還可以安排什麼？</p>${assistantCategoryGridHtml()}<button type="button" class="secondary-btn" id="assistantStayFinish">先到這裡</button></div>` };
    }
    return { done: false, html: `<div class="mumu-assistant-body"><p>🐻 ${escape(remaining[0].date)} 還沒有安排住宿，要繼續嗎？</p><div class="stay-picker-actions"><button type="button" class="secondary-btn" id="assistantContinueArea">繼續看住宿區</button><button type="button" class="secondary-btn" id="assistantContinueFav">從我的收藏選住宿</button><button type="button" class="secondary-btn" id="assistantContinueCustom">新增專屬住宿卡</button></div><button type="button" class="secondary-btn" id="assistantStayFinish">先到這裡</button></div>`, nextDate: remaining[0].date };
  }
  let onHotelChosen = () => {};
  function openAccommodationAssistant(options = {}) {
    const ctx = { onDone: options.onDone || (() => {}), presetDate: options.presetDate || null };
    onHotelChosen = (place) => handleHotelChosen(place, ctx);
    if (options.presetPlace) {
      openDialog("MUMU 住宿助手", `<p class="field-note">正在確認…</p>`);
      handleHotelChosen(options.presetPlace, ctx);
      return;
    }
    const dialog = openDialog("MUMU 住宿助手", accommodationAreaListHtml());
    showAreaList(dialog, ctx);
  }
  function handleHotelChosen(place, ctx) {
    const dialog = $("tripToolDialog");
    ctx.place = place;
    showStayDateStep(dialog, ctx);
  }
  function showStayDateStep(dialog, ctx) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationDateCheckboxHtml(ctx.presetDate));
    const checkboxes = () => [...dialog.querySelectorAll("[data-stay-checkbox]")];
    dialog.querySelector("#stayCheckAllUnassigned").onclick = () => {
      const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
      checkboxes().forEach((cb) => { const n = nights.find((x) => x.date === cb.value); if (!n?.stay) cb.checked = true; });
    };
    dialog.querySelector("#stayCheckNone").onclick = () => checkboxes().forEach((cb) => { cb.checked = false; });
    dialog.querySelector("#stayDateBack").onclick = () => showAreaList(dialog, ctx);
    dialog.querySelector("#stayDateNext").onclick = () => {
      const selected = checkboxes().filter((cb) => cb.checked).map((cb) => cb.value);
      if (!selected.length) { dialog.querySelector("#stayDateNote").textContent = "請至少選擇一晚。"; return; }
      showStayConfirm(dialog, ctx, selected);
    };
  }
  function showStayConfirm(dialog, ctx, selectedDates) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationStayConfirmHtml(ctx, selectedDates));
    dialog.querySelector("#stayConfirmBack").onclick = () => showStayDateStep(dialog, ctx);
    let submitted = false;
    dialog.querySelector("#stayConfirmBtn").onclick = () => {
      if (submitted) return;
      submitted = true;
      dialog.querySelector("#stayConfirmBtn").disabled = true;
      selectedDates.forEach((date) => window.SoftPlanetTripStays.setNightStay(tripId, date, { place_id: ctx.place.id, place_name: ctx.place.name }));
      ctx.onDone();
      showContinuePrompt(dialog, ctx);
    };
  }
  function showContinuePrompt(dialog, ctx) {
    const { done, html, nextDate } = accommodationContinueHtml(trip);
    updateDialogContent(dialog, "MUMU 住宿助手", html);
    dialog.querySelector("#assistantStayFinish").onclick = () => dialog.close();
    if (done) {
      // Hand off to the general Journey assistant, anchored on this stay's check-in date - a
      // separate MUMU flow, not embedded inside the accommodation assistant or any detail page.
      const days = dateRange(trip.start_date, trip.end_date);
      const dayIdx = days.indexOf(ctx.presetDate);
      const reopenId = dayIdx >= 0 ? `day-${dayIdx + 1}` : undefined;
      dialog.querySelectorAll("[data-category]").forEach((btn) => btn.onclick = () => openAssistantSourceStep(dialog, btn.dataset.category, ctx.presetDate || days[0], reopenId));
      return;
    }
    const continueNext = () => openAccommodationAssistant({ presetDate: nextDate, onDone: ctx.onDone });
    dialog.querySelector("#assistantContinueArea").onclick = continueNext;
    dialog.querySelector("#assistantContinueFav").onclick = continueNext;
    dialog.querySelector("#assistantContinueCustom").onclick = continueNext;
  }
  function showAreaList(dialog, ctx) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationAreaListHtml());
    dialog.querySelectorAll("[data-pick-area]").forEach((btn) => btn.onclick = () => {
      const area = window.SoftPlanetAccommodation.areasForDestination(trip.country, trip.city).find((a) => a.accommodation_area_id === btn.dataset.pickArea);
      showAreaDetail(dialog, area, ctx);
    });
    wireAccommodationStaySource(dialog, "1", ctx);
  }
  function showAreaDetail(dialog, area, ctx) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationAreaDetailHtml(area));
    dialog.querySelector("#assistantAreaBack").onclick = () => showAreaList(dialog, ctx);
    dialog.querySelector("#assistantSeeHotelsBtn").onclick = () => showHotelList(dialog, area, ctx);
  }
  function showHotelList(dialog, area, ctx) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationHotelListHtml(area));
    dialog.querySelector("#assistantHotelListBack").onclick = () => showAreaDetail(dialog, area, ctx);
    dialog.querySelectorAll("[data-open-hotel]").forEach((hbtn) => hbtn.onclick = () => {
      const place = window.getSoftPlanetPlace(hbtn.dataset.openHotel);
      showHotelDetail(dialog, place, area, ctx);
    });
    wireAccommodationStaySource(dialog, "2", ctx);
  }
  function showHotelDetail(dialog, place, area, ctx) {
    updateDialogContent(dialog, "MUMU 住宿助手", accommodationHotelDetailHtml(place));
    dialog.querySelector("#assistantHotelDetailBack").onclick = () => showHotelList(dialog, area, ctx);
    dialog.querySelector("#assistantAddHotelBtn").onclick = () => onHotelChosen(place, ctx);
  }

  // Cascades a later end-time change onto subsequent same-day "place" items only (fixed nodes like
  // arrival/transport/check-in are never trip_items in this list, so they are naturally untouched).
  // Each item keeps its own original duration; only its position shifts.
  function rechainFrom(date, editedTripItemId, newEndTime) {
    const minutes = window.SoftPlanetTripItems.minutes;
    const fmt = (m) => { const wrapped = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`; };
    const items = window.SoftPlanetTripItems.list(tripId).filter((i) => i.trip_date === date && i.item_type === "place").sort((a, b) => minutes(a.start_time) - minutes(b.start_time));
    const idx = items.findIndex((i) => i.trip_item_id === editedTripItemId);
    if (idx === -1) return;
    let cursor = minutes(newEndTime);
    let blockedAt = null;
    for (let i = idx + 1; i < items.length; i++) {
      const current = items[i];
      const duration = minutes(current.end_time) - minutes(current.start_time);
      if (duration <= 0) continue;
      const newStart = cursor;
      const newEnd = newStart + duration;
      // Formal Departure Boundary lock: if this shift would push the item into the locked
      // pre-departure window, trip-schedule.js's save() refuses it and the item keeps its previous
      // time untouched - stop rechaining the rest too, since anything after it would only be
      // pushed further into the same locked window.
      const result = window.SoftPlanetTripItems.save({ trip_item_id: current.trip_item_id, trip_id: tripId, item_type: current.item_type, item_id: current.item_id, item_name: current.item_name, trip_date: date, start_time: fmt(newStart), end_time: fmt(newEnd), note: current.note });
      if (result.blocked) { blockedAt = result.lockStart; break; }
      cursor = newEnd;
    }
    if (blockedAt) {
      showJourneyToast(`🐻 這個時間已經要準備前往機場，後面的行程無法排到 ${blockedAt} 之後，請重新調整。`);
    }
  }
  function openEditScheduleItem(item, date, reopen) {
    const place = item.item_type === "place" && !String(item.item_id).startsWith("manual-") ? window.getSoftPlanetPlace(item.item_id) : null;
    const area = place ? areaName(place) : null;
    const body = `<form class="workspace-form" id="editItemForm">
      <label>行程名稱<input name="item_name" maxlength="40" required value="${escape(item.item_name)}"></label>
      <div class="form-row"><label>開始時間<input name="start_time" type="time" step="60" required value="${item.start_time}"></label><label>結束時間<input name="end_time" type="time" step="60" required value="${item.end_time}"></label></div>
      <label>備註（選填）<textarea name="note" maxlength="100">${escape(item.note || "")}</textarea><small class="char-count"><span id="editNoteCount">${[...(item.note || "")].length}</span> / 100</small></label>
      ${area ? `<p class="field-note">區域：${escape(area)}</p>` : ""}
      <p class="mumu-reminder" id="editItemReminder" role="status"></p>
      <button class="primary-btn" type="submit">儲存修改</button>
    </form>`;
    const dialog = openDialog("編輯行程", body);
    const form = dialog.querySelector("#editItemForm");
    form.elements.note.oninput = () => { dialog.querySelector("#editNoteCount").textContent = [...form.elements.note.value].length; };
    form.onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      if (window.SoftPlanetTripItems.minutes(values.end_time) <= window.SoftPlanetTripItems.minutes(values.start_time)) { dialog.querySelector("#editItemReminder").textContent = "結束時間要晚於開始時間。"; return; }
      // Extending a "place" item's end time into whatever comes next is exactly what re-chaining is
      // for, so that case must skip the generic overlap block below rather than get stuck on it -
      // otherwise the very save that re-chaining exists to resolve is the one that blocks re-chaining.
      const willRechain = item.item_type === "place" && values.end_time !== item.end_time;
      const result = window.SoftPlanetTripItems.save({ trip_item_id: item.trip_item_id, trip_id: tripId, item_type: item.item_type, item_id: item.item_id, item_name: values.item_name, trip_date: date, start_time: values.start_time, end_time: values.end_time, note: values.note });
      if (result.blocked) {
        dialog.querySelector("#editItemReminder").textContent = `🐻 這個時間已經要準備前往機場，請安排在 ${result.lockStart} 以前。`;
        return;
      }
      if (willRechain) {
        rechainFrom(date, item.trip_item_id, values.end_time);
      } else if (result.conflicts.length) {
        dialog.querySelector("#editItemReminder").textContent = "🐻 這段時間和其他行程有些重疊，要再確認一下嗎？";
        return;
      }
      dialog.close();
      renderJourney(reopen);
    };
  }

  // ---- MUMU 行程助手 ----
  function contextAnchor(date) {
    const items = window.SoftPlanetTripItems.itemsForDate(tripId, date).filter((i) => i.item_type !== "transport");
    const last = items[items.length - 1];
    if (last && !String(last.item_id).startsWith("manual-")) return window.getSoftPlanetPlace(last.item_id);
    const days = dateRange(trip.start_date, trip.end_date);
    const idx = days.indexOf(date);
    const stay = window.SoftPlanetTripStays.nightsForTrip(trip)[idx]?.stay;
    return stay ? window.getSoftPlanetPlace(stay.place_id) : null;
  }
  function favoritesByCategory(categories) {
    try {
      const ids = JSON.parse(localStorage.getItem("softplanet-favorites") || "[]");
      return (Array.isArray(ids) ? ids : []).map((id) => window.getSoftPlanetPlace(id)).filter((place) => place && categories.includes(place.category));
    } catch (_) { return []; }
  }
  function sortByCluster(list, anchor) {
    if (!anchor) return list;
    const order = { living_cluster: 0, area: 1, station: 1, city: 2 };
    return [...list].sort((a, b) => {
      const la = window.SoftPlanetRecommendations.matchLevel(anchor, a);
      const lb = window.SoftPlanetRecommendations.matchLevel(anchor, b);
      return (la ? order[la] : 3) - (lb ? order[lb] : 3);
    });
  }
  // 生活機能 is a real, formally addable Journey place type (not just an info-reading category) -
  // it uses the exact same candidate/pending-item/commit pipeline as 景點/美食. No real Local
  // Reference dataset (便利商店/超市/藥局/ATM/...) exists anywhere in this project yet; the
  // category is fully wired so it activates the moment real data or custom cards populate it.
  function assistantCategoryGridHtml() {
    return `<div class="assistant-choice-grid"><button type="button" class="assistant-choice" data-category="景點"><span aria-hidden="true">📍</span>景點</button><button type="button" class="assistant-choice" data-category="美食"><span aria-hidden="true">🍜</span>美食</button><button type="button" class="assistant-choice" data-category="生活機能"><span aria-hidden="true">🏪</span>生活機能</button></div>`;
  }
  function assistantStep1Html() {
    return `<div class="mumu-assistant-body"><p>🐻 這次想安排什麼呢？</p>${assistantCategoryGridHtml()}</div>`;
  }
  function wireAssistantStep1(dialog, date, reopen) {
    dialog.querySelectorAll("[data-category]").forEach((btn) => btn.onclick = () => openAssistantSourceStep(dialog, btn.dataset.category, date, reopen));
  }
  function openMumuAssistant(date, reopen) {
    if (!window.SoftPlanetTripItems.itemsForDate(tripId, date).length && !breakfastHandled(date)) {
      openBreakfastAssistant(date, reopen);
      return;
    }
    const dialog = openDialog("MUMU 行程助手", assistantStep1Html());
    wireAssistantStep1(dialog, date, reopen);
  }
  function offerFollowUp(date, reopen) {
    const body = `<div class="mumu-assistant-body"><p>🐻 下一站想安排什麼？</p>${assistantCategoryGridHtml()}<button type="button" class="secondary-btn" id="assistantDone">先到這裡</button></div>`;
    const dialog = openDialog("MUMU 行程助手", body);
    wireAssistantStep1(dialog, date, reopen);
    dialog.querySelector("#assistantDone").onclick = () => dialog.close();
  }
  function categoriesFor(category) {
    if (category === "景點") return ["景點"];
    if (category === "美食") return ["美食", "餐廳"];
    return ["生活機能"];
  }
  // Shared candidate list markup + client-side search (filters only this already-fetched, already-
  // official list - never mutates favorites/inspiration/recommendation data).
  function candidateListHtml(list) {
    return `<input type="search" class="candidate-search" id="candidateSearchInput" placeholder="搜尋名稱或關鍵字">
      <div class="rec-card-list" id="candidateListBody">${list.map((place) => `<article data-search="${escape(`${place.name}${place.summary || ""}${place.tags || ""}`.toLowerCase())}"><span aria-hidden="true">${place.emoji}</span><div><h3>${escape(place.name)}</h3><p>${escape(place.summary || "")}</p></div><button type="button" data-pick-place="${escape(place.id)}">加入</button></article>`).join("")}</div>`;
  }
  function wireCandidateSearch(container) {
    const input = container.querySelector("#candidateSearchInput");
    if (!input) return;
    input.oninput = () => {
      const term = input.value.trim().toLowerCase();
      container.querySelectorAll("#candidateListBody > article").forEach((article) => { article.hidden = Boolean(term) && !article.dataset.search.includes(term); });
    };
  }
  async function openAssistantFavorites(container, categories, categoryLabel, date, reopen, onCommittedOverride) {
    container.innerHTML = `<p class="field-note">正在整理清單…</p>`;
    const favorites = favoritesByCategory(categories);
    const tripLinked = (await tripLinkedPlaces()).filter((p) => categories.includes(p.category));
    const merged = [...favorites, ...tripLinked].filter((place, index, arr) => arr.findIndex((p) => p.id === place.id) === index);
    const sorted = sortByCluster(merged, contextAnchor(date));
    if (!sorted.length) {
      container.innerHTML = `<p class="field-note">收藏裡還沒有這個類型的地點，可以到旅行靈感看看，或新增專屬卡。</p>`;
      return;
    }
    container.innerHTML = candidateListHtml(sorted);
    wireCandidateSearch(container);
    container.querySelectorAll("[data-pick-place]").forEach((btn) => btn.onclick = () => openPendingConfirm({
      place: window.getSoftPlanetPlace(btn.dataset.pickPlace), date, categoryLabel, reopen,
      onCancel: () => openAssistantFavorites(container, categories, categoryLabel, date, reopen, onCommittedOverride),
      onCommitted: onCommittedOverride || (() => offerFollowUp(date, reopen))
    }));
  }
  // 生活機能's "查看周邊生活機能" reuses the same recommendation engine as the 周邊景點／周邊美食
  // widget (contextAnchor + recommend()), rather than linking to an inspiration.html category that
  // doesn't exist for this type.
  // anchorOverride is optional and additive: every existing call site omits it and keeps today's
  // exact contextAnchor-based behavior unchanged. Only the arrival-deferred-add flow (still at the
  // airport, transport not chosen yet) supplies a deliberately non-matching anchor so this never
  // falls through to city-wide results - see openArrivalDeferredAdd below.
  function openAssistantNearby(container, category, date, reopen, onCommittedOverride, anchorOverride) {
    const anchor = anchorOverride !== undefined ? anchorOverride : (contextAnchor(date) || { id: null, city: trip.city, country: trip.country });
    const result = window.SoftPlanetRecommendations.recommend(anchor, categoriesFor(category), []);
    if (!result.items.length) {
      container.innerHTML = anchorOverride !== undefined
        ? `<p class="field-note">機場周邊目前還沒有正式的生活機能資料，可以先從收藏選擇，或新增專屬卡。</p>`
        : `<p class="field-note">這一區還沒有符合條件的正式${category}資料，可以先從收藏選擇，或新增專屬卡。</p>`;
      return;
    }
    container.innerHTML = `<p class="section-helper">${window.SoftPlanetRecommendations.levelHeading(result.level)}</p>${candidateListHtml(result.items)}`;
    wireCandidateSearch(container);
    container.querySelectorAll("[data-pick-place]").forEach((btn) => btn.onclick = () => openPendingConfirm({
      place: window.getSoftPlanetPlace(btn.dataset.pickPlace), date, categoryLabel: category, reopen,
      onCancel: () => openAssistantNearby(container, category, date, reopen, onCommittedOverride, anchorOverride),
      onCommitted: onCommittedOverride || (() => offerFollowUp(date, reopen))
    }));
  }
  function openAssistantCustomForm(container, category, date, reopen, dialog, onCommittedOverride) {
    const itemType = category === "景點" ? "景點" : category === "美食" ? "餐廳" : "生活機能";
    const areas = window.SoftPlanetServices.areas(trip.country, trip.city);
    container.innerHTML = `<form class="workspace-form" id="assistantCustomForm">
      <label>名稱<input name="custom_name" maxlength="60" required></label>
      <label>區域<select name="area_id" required><option value="">請選擇</option>${areas.map((a) => `<option value="${a.id}" data-name="${a.name}">${a.name}</option>`).join("")}</select></label>
      <label>Google Maps（選填）<input name="maps_url" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…"></label>
      <label>備註（選填）<textarea name="short_note" maxlength="100"></textarea></label>
      <button class="primary-btn" type="submit">建立並加入收藏</button>
    </form>`;
    const form = container.querySelector("#assistantCustomForm");
    let created = false;
    form.onsubmit = (event) => {
      event.preventDefault();
      if (created) return;
      created = true;
      form.querySelector("button[type=submit]").disabled = true;
      const values = Object.fromEntries(new FormData(form));
      const areaOption = form.elements.area_id.options[form.elements.area_id.selectedIndex];
      const mapsUrl = window.SoftPlanetMaps.safe(values.maps_url);
      const references = mapsUrl ? [{ name: "Google Maps", url: mapsUrl }] : [];
      const item = window.SoftPlanetCustomItems.create({ trip_id: tripId, country: trip.country, city: trip.city, area_id: values.area_id, area_name: areaOption?.dataset.name || "", item_type: itemType, custom_name: values.custom_name, short_note: values.short_note || "", references });
      addToFavorites(item.id);
      container.innerHTML = `<div class="mumu-assistant-body"><p>🐻 已加入我的收藏。</p><p class="section-helper">要加入目前這一天嗎？</p><div class="dialog-actions"><button type="button" class="secondary-btn" id="assistantCustomSkip">先不要</button><button type="button" class="primary-btn" id="assistantCustomAdd">確認加入</button></div></div>`;
      container.querySelector("#assistantCustomSkip").onclick = () => dialog.close();
      container.querySelector("#assistantCustomAdd").onclick = () => openPendingConfirm({
        place: item, date, categoryLabel: category, reopen,
        onCancel: () => dialog.close(),
        onCommitted: onCommittedOverride || (() => offerFollowUp(date, reopen))
      });
    };
  }
  // onCommittedOverride is optional and only changes what happens after an item is committed from
  // this source step - every existing caller omits it and keeps the original offerFollowUp
  // ("下一站想安排什麼？") behavior unchanged. Only the arrival-transport deferred-add flow supplies
  // one, to ask its own follow-up ("接下來要前往市區了嗎？") instead.
  function openAssistantSourceStep(dialog, category, date, reopen, onCommittedOverride, anchorOverride) {
    const categories = categoriesFor(category);
    const firstOption = category === "生活機能"
      ? `<button type="button" class="secondary-btn" id="assistantNearbyBtn">查看周邊生活機能</button>`
      : `<a class="secondary-btn" href="inspiration.html?${new URLSearchParams({ country: trip.country || "", city: trip.city || "", category, trip: tripId })}">到旅行靈感找${category}</a>`;
    const body = `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="assistantBack">‹ 上一步</button>
      <p class="section-helper">想從哪裡找${category}呢？</p>
      <div class="stay-picker-actions">
        ${firstOption}
        <button type="button" class="secondary-btn" id="assistantFavoritesBtn">從我的${category}收藏選擇</button>
        <button type="button" class="secondary-btn" id="assistantCustomBtn">新增專屬${category}卡</button>
      </div>
      <div id="assistantSourceBody"></div>
    </div>`;
    updateDialogContent(dialog, "MUMU 行程助手", body);
    // When this step was reached with an override (e.g. arrival-deferred-add's airport scoping),
    // going back to the type grid must keep re-supplying that same override on the next category
    // pick - otherwise it would silently fall back to the generic wiring and lose the override.
    // No override present (every other, pre-existing entry point) behaves exactly as before.
    dialog.querySelector("#assistantBack").onclick = () => {
      updateDialogContent(dialog, "MUMU 行程助手", assistantStep1Html());
      if (onCommittedOverride || anchorOverride !== undefined) {
        dialog.querySelectorAll("[data-category]").forEach((btn) => btn.onclick = () => openAssistantSourceStep(dialog, btn.dataset.category, date, reopen, onCommittedOverride, anchorOverride));
      } else {
        wireAssistantStep1(dialog, date, reopen);
      }
    };
    dialog.querySelector("#assistantNearbyBtn")?.addEventListener("click", () => openAssistantNearby(dialog.querySelector("#assistantSourceBody"), category, date, reopen, onCommittedOverride, anchorOverride));
    dialog.querySelector("#assistantFavoritesBtn").onclick = () => openAssistantFavorites(dialog.querySelector("#assistantSourceBody"), categories, category, date, reopen, onCommittedOverride);
    dialog.querySelector("#assistantCustomBtn").onclick = () => openAssistantCustomForm(dialog.querySelector("#assistantSourceBody"), category, date, reopen, dialog, onCommittedOverride);
  }

  // ---- 早餐助手 ----
  // Skip/complete state is a UI flag only, stored apart from Journey data - it must never fabricate
  // a breakfast Journey item, and must not re-trigger on every reload once handled for that day.
  const BREAKFAST_STATE_KEY = "softplanet-breakfast-state";
  function breakfastHandled(date) {
    try { return Boolean((JSON.parse(localStorage.getItem(BREAKFAST_STATE_KEY) || "{}")[tripId] || {})[date]); } catch (_) { return false; }
  }
  function markBreakfastHandled(date) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(BREAKFAST_STATE_KEY) || "{}"); } catch (_) { all = {}; }
    all[tripId] = { ...(all[tripId] || {}), [date]: true };
    localStorage.setItem(BREAKFAST_STATE_KEY, JSON.stringify(all));
  }
  function openBreakfastAssistant(date, reopen) {
    const days = dateRange(trip.start_date, trip.end_date);
    const idx = days.indexOf(date);
    const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
    const previousStay = idx > 0 ? nights[idx - 1]?.stay : null;
    const stayPlace = previousStay ? window.getSoftPlanetPlace(previousStay.place_id) : null;
    // No place (official or custom) has a real breakfast field anywhere in this project yet - the
    // hotel-breakfast option must stay hidden rather than assume every hotel serves breakfast.
    const hasHotelBreakfast = Boolean(stayPlace?.breakfast);
    const body = `<div class="mumu-assistant-body">
      <p>🐻 早安，今天早上想吃什麼呢？</p>
      <div class="stay-picker-actions">
        ${hasHotelBreakfast ? `<button type="button" class="secondary-btn" id="breakfastHotelBtn">飯店早餐</button>` : ""}
        <button type="button" class="secondary-btn" id="breakfastNearbyBtn">周邊早餐</button>
        <button type="button" class="secondary-btn" id="breakfastLifeBtn">周邊生活機能</button>
        <button type="button" class="secondary-btn" id="breakfastSkipBtn">今天不排早餐</button>
      </div>
      <div id="breakfastBody"></div>
    </div>`;
    const dialog = openDialog("MUMU 行程助手", body);
    dialog.querySelector("#breakfastHotelBtn")?.addEventListener("click", () => {
      markBreakfastHandled(date);
      openPendingConfirm({ place: stayPlace, date, categoryLabel: "早餐", reopen, onCancel: () => dialog.close(), onCommitted: () => offerFollowUp(date, reopen) });
    });
    dialog.querySelector("#breakfastNearbyBtn").onclick = () => {
      const anchor = stayPlace || contextAnchor(date) || { id: null, city: trip.city, country: trip.country };
      const body2 = dialog.querySelector("#breakfastBody");
      const result = window.SoftPlanetRecommendations.recommend(anchor, ["美食", "餐廳"], []);
      body2.innerHTML = result.items.length
        ? `<p class="section-helper">${window.SoftPlanetRecommendations.levelHeading(result.level)}</p>${candidateListHtml(result.items)}`
        : `<p class="field-note">這一區還沒有正式的早餐資料，可以先從收藏選擇，或新增專屬卡。</p>`;
      wireCandidateSearch(body2);
      body2.querySelectorAll("[data-pick-place]").forEach((btn) => btn.onclick = () => {
        markBreakfastHandled(date);
        openPendingConfirm({ place: window.getSoftPlanetPlace(btn.dataset.pickPlace), date, categoryLabel: "美食", reopen, onCancel: () => dialog.close(), onCommitted: () => offerFollowUp(date, reopen) });
      });
    };
    dialog.querySelector("#breakfastLifeBtn").onclick = () => {
      markBreakfastHandled(date);
      openAssistantSourceStep(dialog, "生活機能", date, reopen);
    };
    dialog.querySelector("#breakfastSkipBtn").onclick = () => {
      markBreakfastHandled(date);
      updateDialogContent(dialog, "MUMU 行程助手", assistantStep1Html());
      wireAssistantStep1(dialog, date, reopen);
    };
  }

  function renderDayPanel(panel, date, isFirst, isLast, night, boundary, reopen, checkInStay) {
    const parts = [];
    if (isFirst && boundary?.arrival_date) {
      // Arrival Boundary this sprint is flight info only - no transport, no stay, no MUMU jump, no
      // recommendation. Those are separate features for a later sprint.
      parts.push(`<div class="day-boundary-block flight-boundary"><p class="eyebrow">抵達航班</p><strong>${boundary.arrival_date} ${boundary.arrival_time || ""}</strong><p class="field-note">${escape(hubCode(boundary.arrival_hub_id))}</p></div>`);
    }
    if (checkInStay) {
      const stayPlace = window.getSoftPlanetPlace(checkInStay.place_id);
      const area = areaName(stayPlace);
      parts.push(`<button class="day-checkin-card" type="button" id="checkInDetailBtn"><span aria-hidden="true">🏨</span><div><p class="eyebrow">入住住宿</p><h3>${escape(checkInStay.place_name)}</h3><p>${area ? escape(area) : "Check-in／寄放行李"}</p></div><span aria-hidden="true">›</span></button>`);
    }
    parts.push(`<div class="day-schedule">${window.SoftPlanetTripSchedule.renderDay(tripId, date)}</div><button class="schedule-place-btn" type="button" id="addScheduleBtn">＋ 新增行程</button>`);
    if (night) {
      parts.push(`<button class="day-stay-card" type="button" id="openStayDetailBtn"><div><p class="eyebrow">今晚住宿</p><strong>${night.stay ? escape(night.stay.place_name) : "尚未指定住宿"}</strong></div><span aria-hidden="true">›</span></button>`);
    }
    if (isLast && boundary?.departure_date) {
      // Departure Boundary this sprint: a fixed, non-negotiable time-lock counting back from the
      // real flight departure time, through the hub's real departure_buffer, through the actual
      // selected airport-transport trip_item's own duration (never a guessed number). The Boundary
      // card only displays state; picking a transport mode happens through the existing, separate
      // MUMU 機場交通 flow (openTransportPicker), reached via 查看機場交通 below.
      const lock = window.SoftPlanetTripBoundaries.departureLock(tripId);
      const departureHubLabel = escape(hubCode(boundary.departure_hub_id));
      const latestRow = lock?.latestDeparture
        ? `<div class="flight-lock-row"><strong>${lock.latestDeparture}</strong><p>最晚開始前往機場</p><p class="field-note">已選擇機場交通方式</p></div>`
        : `<div class="flight-lock-row"><strong>－－:－－</strong><p>最晚開始前往機場</p><p class="field-note">機場交通尚未選擇，選擇交通方式後確認</p></div>`;
      const suggestedRow = lock?.suggestedArrival
        ? `<div class="flight-lock-row"><strong>${lock.suggestedArrival}</strong><p>建議抵達機場</p></div>`
        : `<div class="flight-lock-row"><strong>－－:－－</strong><p>建議抵達機場</p></div>`;
      parts.push(`<div class="day-boundary-block flight-boundary flight-lock-block">
        <p class="eyebrow">離境行程</p>
        ${latestRow}
        ${suggestedRow}
        <div class="flight-lock-row"><strong>${boundary.departure_time || ""}</strong><p>航班起飛・${departureHubLabel}</p></div>
        <button type="button" class="text-mini-action" id="viewAirportTransportBtn">查看機場交通</button>
      </div>`);
    }
    panel.innerHTML = parts.join("");
    panel.querySelectorAll("[data-remove-trip-item]").forEach((btn) => btn.onclick = async (event) => {
      event.stopPropagation();
      const removeId = btn.dataset.removeTripItem;
      const item = window.SoftPlanetTripItems.itemsForDate(tripId, date).find((entry) => entry.trip_item_id === removeId);
      if (item) await removeScheduleItem(item);
      renderJourney(reopen);
    });
    panel.querySelectorAll("[data-edit-item]").forEach((article) => article.addEventListener("click", () => {
      const item = window.SoftPlanetTripItems.itemsForDate(tripId, date).find((entry) => entry.trip_item_id === article.dataset.editItem);
      if (item) openEditScheduleItem(item, date, reopen);
    }));
    panel.querySelector("#addScheduleBtn").onclick = () => openMumuAssistant(date, reopen);
    panel.querySelector("#viewAirportTransportBtn")?.addEventListener("click", () => openTransportPicker({ hubId: boundary.departure_hub_id, tripId, date, isArrival: false, anchorTime: boundary.departure_time || "18:00", onAdded: () => renderJourney(reopen) }));
    panel.querySelector("#openStayDetailBtn")?.addEventListener("click", () => openStayDetail(night, date, reopen));
    panel.querySelector("#checkInDetailBtn")?.addEventListener("click", () => openStayDetail({ stay: checkInStay }, date, reopen));
  }

  let viewMode = "edit";
  function hubCode(id) {
    return window.SoftPlanetTripBoundaries.HUBS().find((h) => h.id === id)?.code || "";
  }
  function hubFullName(id) {
    return window.SoftPlanetTripBoundaries.HUBS().find((h) => h.id === id)?.name || "";
  }
  function chineseMonthDay(dateStr, timeStr) {
    const [, m, d] = String(dateStr || "").split("-").map(Number);
    return `${m} 月 ${d} 日 ${timeStr || ""}`.trim();
  }
  // The two required warm sentences, shared by the 抵達與離開 accordion panel, the flight
  // confirmation dialog, and text mode - one canonical source so the copy never drifts between
  // the three places it appears.
  function boundaryWarmCopy(record) {
    if (!record?.arrival_date || !record?.departure_date) return null;
    const arrivalHub = `${hubFullName(record.arrival_hub_id)}${terminalSuffix(record.arrival_terminal)}`;
    const departureHub = `${hubFullName(record.departure_hub_id)}${terminalSuffix(record.departure_terminal)}`;
    // Tentative航班資訊 must never read like a confirmed flight - same date/hub/terminal data,
    // deliberately different wording ("預計...") so this is the one function every surface
    // (accordion panel, flight-confirm dialog, notebook view) can share without drifting apart.
    if (record.tentative) {
      return {
        arrivalLine: `${chineseMonthDay(record.arrival_date, record.arrival_time)}：預計抵達${arrivalHub}。`,
        departureLine: `${chineseMonthDay(record.departure_date, record.departure_time)}：預計從${departureHub}起飛。`
      };
    }
    return {
      arrivalLine: `${chineseMonthDay(record.arrival_date, record.arrival_time)}：抵達${arrivalHub}，開始美好的旅行。`,
      departureLine: `${chineseMonthDay(record.departure_date, record.departure_time)}：從${departureHub}啟程，回到溫暖的家。`
    };
  }
  // Confirmation step inserted after a successful boundary save, without touching
  // openBoundaryEditor itself (its fields/validation/dropdowns/live guard/save flow are locked -
  // this only wraps the onSaved callback the function already accepts). 錯誤 reopens the exact
  // same, unmodified edit dialog - openBoundaryEditor's own prefill (window.SoftPlanetTripBoundaries.get)
  // already reads back whatever was just saved, so the user's entries are never lost. 正確 hands off
  // straight into the accommodation area picker, never leaving the user back on a bare Journey view.
  // Real check/X icons (inline SVG), never the "×"/"○" text glyphs - color lives on the icon only,
  // button background stays the same low-saturation neutral for both so neither reads as a big
  // solid red/green button.
  const ICON_X_CIRCLE = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="#c0503a" stroke-width="1.6"/><path d="M7 7l6 6M13 7l-6 6" stroke="#c0503a" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const ICON_CHECK_CIRCLE = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="#3f9d6b" stroke-width="1.6"/><path d="M6 10.3l2.6 2.6L14 7.5" stroke="#3f9d6b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  function confirmFlightDialogHtml(record) {
    const copy = boundaryWarmCopy(record);
    if (!copy) return `<div class="mumu-assistant-body"><p class="field-note">尚未設定航班資訊。</p></div>`;
    return `<div class="mumu-assistant-body">
      <p class="flight-warm-copy">${escape(copy.arrivalLine)}</p>
      <p class="flight-warm-copy">${escape(copy.departureLine)}</p>
      <div class="flight-confirm-actions">
        <button type="button" class="flight-confirm-btn" id="flightConfirmWrong">${ICON_X_CIRCLE}錯誤！</button>
        <button type="button" class="flight-confirm-btn" id="flightConfirmRight">${ICON_CHECK_CIRCLE}正確！</button>
      </div>
    </div>`;
  }
  function confirmFlightThenProceed(onConfirmed) {
    const record = window.SoftPlanetTripBoundaries.get(tripId);
    const dialog = openDialog("確認一下你的航班資訊是否正確哦！", confirmFlightDialogHtml(record));
    dialog.querySelector("#flightConfirmWrong").onclick = () => {
      openBoundaryEditor(() => confirmFlightThenProceed(onConfirmed));
    };
    dialog.querySelector("#flightConfirmRight").onclick = () => {
      dialog.close();
      openArrivalTransportHandoff(onConfirmed);
    };
  }
  // Entry point only - 5 fixed area cards, reusing the existing Accommodation Area data layer.
  // Clicking a card hands off into the pre-existing, unmodified showAreaDetail/showHotelList/
  // stay-date flow (same one openAccommodationAssistant already uses elsewhere) rather than
  // building a second parallel hotel-selection path.
  function openArrivalAccommodationHandoff(onDone) {
    const areas = window.SoftPlanetAccommodation.areasForDestination(trip.country, trip.city);
    const boundary = window.SoftPlanetTripBoundaries.get(tripId);
    const body = `<div class="mumu-assistant-body">
      <div class="mumu-assistant-header"><span class="mumu-asset" data-mumu aria-hidden="true"></span><div><strong>到市區後，第一晚你打算住哪裡呢？</strong><small>先看看哪一區比較適合你的旅行方式。</small></div></div>
      ${areas.length ? `<div class="area-card-list">${areas.map((area) => `<button type="button" class="area-card" data-pick-area="${escape(area.accommodation_area_id)}"><strong>${escape(area.name)}</strong>${area.short_recommendation ? `<small>${escape(area.short_recommendation)}</small>` : ""}</button>`).join("")}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>這座城市的住宿區還在整理中</h3><p>可以先從我的收藏選住宿，或新增專屬住宿卡。</p></div>`}
      <button type="button" class="secondary-btn" id="accommodationDeferBtn">晚點安排，我想先新增別的行程</button>
    </div>`;
    const dialog = openDialog("MUMU 住宿助手", body);
    const ctx = { onDone: onDone || (() => {}), presetDate: null };
    onHotelChosen = (place) => handleHotelChosen(place, ctx);
    // Reuses the existing 旅行靈感／我的收藏／新增專屬卡 source step exactly as-is (no override), so
    // committing an item here falls back to the standard, pre-existing offerFollowUp prompt - no
    // new reminder/field/button/flow is introduced for this entry point.
    dialog.querySelector("#accommodationDeferBtn").onclick = () => openAssistantSourceStep(dialog, "生活機能", boundary?.arrival_date, "day-1");
    dialog.querySelectorAll("[data-pick-area]").forEach((btn) => btn.onclick = () => {
      const area = areas.find((a) => a.accommodation_area_id === btn.dataset.pickArea);
      showAreaDetail(dialog, area, ctx);
    });
  }

  // ---- Arrival Transport Handoff (Sprint 1C; wired to real data in Data Binding Micro Sprint 02) ----
  // Deliberately separate from AIRPORT_TRANSPORT_RECORDS/openTransportPicker above (the departure-
  // side "查看機場交通" entry reached from the locked Departure Boundary block - not touched this
  // sprint). Real data now comes from js/airport-transport-service.js (32_airport_transport Google
  // Sheet, direction=arrival rows) keyed by the same airport id/code HUBS already uses - every card
  // surface below still shows the existing honest empty state whenever a given airport has no
  // published rows for that transport_type.
  function arrivalTransitOptions(hubId) { return window.SoftPlanetAirportTransport.transitOptions(hubId); }
  function arrivalCharterOptions(hubId) { return window.SoftPlanetAirportTransport.charterOptions(hubId); }

  // Marks arrival transport as "decided" (any of transit/charter/self-arranged) so the deferred-add
  // follow-up loop knows to stop asking. item_id prefix is distinct from the departure-side
  // `transport-${hubId}-...` items so the two ends of the trip can never be confused with each other.
  function arrivalTransportChosen(date) {
    return window.SoftPlanetTripItems.itemsForDate(tripId, date).some((item) => item.item_type === "transport" && String(item.item_id).startsWith("arrival-transport-"));
  }
  function embedArrivalTransport({ name, note, startTime, endTime }) {
    const boundary = window.SoftPlanetTripBoundaries.get(tripId);
    window.SoftPlanetTripItems.save({ trip_id: tripId, item_type: "transport", item_id: `arrival-transport-${Date.now()}`, item_name: name, trip_date: boundary.arrival_date, start_time: startTime, end_time: endTime, note: note || "" });
  }
  function proceedAfterArrivalTransport(onDone) {
    openArrivalAccommodationHandoff(onDone);
  }

  function openArrivalTransportHandoff(onDone) {
    const body = `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="arrivalTransportHandoffBack">‹ 返回上一層</button>
      <div class="mumu-assistant-header"><span class="mumu-asset" data-mumu aria-hidden="true"></span><div><strong>抵達後，你想要怎麼前往市區呢？</strong><small>可以直接出發，也可以先在機場安排其他事情。</small></div></div>
      <div class="area-card-list">
        <button type="button" class="area-card" id="arrivalTransitBtn"><strong>大眾運輸</strong></button>
        <button type="button" class="area-card" id="arrivalCharterBtn"><strong>當地包車</strong></button>
        <button type="button" class="area-card" id="arrivalSelfBtn"><strong>自行前往市區</strong></button>
      </div>
      <button type="button" class="secondary-btn" id="arrivalDeferBtn">晚點安排，我想先新增別的行程</button>
    </div>`;
    const dialog = openDialog("MUMU 行程助手", body);
    const boundary = window.SoftPlanetTripBoundaries.get(tripId);
    // Pure navigation back to the flight-confirm dialog - confirmFlightThenProceed only reads the
    // already-saved boundary record (window.SoftPlanetTripBoundaries.get) and re-renders it, so
    // going back never re-saves data, never re-creates Journey, never re-creates the boundary.
    // Pressing 正確！again simply re-enters this same handoff.
    dialog.querySelector("#arrivalTransportHandoffBack").onclick = () => confirmFlightThenProceed(onDone);
    dialog.querySelector("#arrivalTransitBtn").onclick = () => showArrivalTransitList(dialog, boundary, onDone);
    dialog.querySelector("#arrivalCharterBtn").onclick = () => showArrivalCharterList(dialog, boundary, onDone);
    dialog.querySelector("#arrivalSelfBtn").onclick = () => showArrivalSelfArrangedForm(dialog, boundary, onDone);
    dialog.querySelector("#arrivalDeferBtn").onclick = () => openArrivalDeferredAdd(boundary.arrival_date, onDone);
  }

  function showArrivalTransitList(dialog, boundary, onDone) {
    const options = arrivalTransitOptions(boundary.arrival_hub_id);
    const cardsHtml = options.map((r) => `<article class="airport-transport-card">
        <div><h3>${escape(r.title)}</h3><p>${escape(r.summary || "")}</p>
        ${r.boarding_location ? `<p class="field-note">上車位置：${escape(r.boarding_location)}</p>` : ""}
        ${r.drop_off ? `<p class="field-note">主要下車／服務區：${escape(r.drop_off)}</p>` : ""}
        ${r.estimated_minutes ? `<p class="field-note">參考時間：約 ${r.estimated_minutes} 分鐘</p>` : ""}
        ${r.suited_for ? `<p class="field-note">適合旅客：${escape(r.suited_for)}</p>` : ""}</div>
        <div class="dialog-actions"><button type="button" class="primary-btn" data-pick-transit="${escape(r.transport_id)}">選擇這個</button>${r.guide_url ? `<a class="text-mini-action" href="${escape(r.guide_url)}" target="_blank" rel="noopener noreferrer">攻略或票券 ↗</a>` : ""}</div>
      </article>`).join("");
    const body = `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="arrivalTransportBack">‹ 上一步</button>
      ${options.length ? `<div class="airport-transport-card-list">${cardsHtml}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>目前尚未整理這個機場到市區的正式大眾運輸資訊</h3><p>可以先選自行前往市區，或晚點再回來安排。</p></div>`}
    </div>`;
    updateDialogContent(dialog, "MUMU 行程助手", body);
    dialog.querySelector("#arrivalTransportBack").onclick = () => openArrivalTransportHandoff(onDone);
    dialog.querySelectorAll("[data-pick-transit]").forEach((btn) => btn.onclick = () => {
      const record = options.find((r) => r.transport_id === btn.dataset.pickTransit);
      const startTime = boundary.arrival_time || "09:00";
      const endTime = record.estimated_minutes ? addMinutesToTime(startTime, record.estimated_minutes) : startTime;
      embedArrivalTransport({ name: `搭乘${record.title}前往市區`, note: record.summary || "", startTime, endTime });
      dialog.close();
      proceedAfterArrivalTransport(onDone);
    });
  }

  function showArrivalCharterList(dialog, boundary, onDone) {
    const options = arrivalCharterOptions(boundary.arrival_hub_id);
    const cardsHtml = options.map((r) => `<article class="airport-transport-card">
        <div><h3>${escape(r.title)}</h3><p>${escape(r.summary || "")}</p>
        ${r.suited_for ? `<p class="field-note">適合對象：${escape(r.suited_for)}</p>` : ""}
        ${r.service_area ? `<p class="field-note">服務區域：${escape(r.service_area)}</p>` : ""}
        <p class="field-note">${r.source_type === "community" ? "社群經驗分享，非官方服務" : "正式票券／服務平台"}</p></div>
        <div class="dialog-actions"><button type="button" class="primary-btn" data-pick-charter="${escape(r.transport_id)}">選擇這個</button>${r.booking_url ? `<a class="text-mini-action" href="${escape(r.booking_url)}" target="_blank" rel="noopener noreferrer">查看價格／預約 ↗</a>` : ""}</div>
      </article>`).join("");
    const body = `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="arrivalTransportBack">‹ 上一步</button>
      ${options.length ? `<div class="airport-transport-card-list">${cardsHtml}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>目前尚未整理這個機場的正式包車服務資訊</h3><p>可以先選自行前往市區，或晚點再回來安排。</p></div>`}
    </div>`;
    updateDialogContent(dialog, "MUMU 行程助手", body);
    dialog.querySelector("#arrivalTransportBack").onclick = () => openArrivalTransportHandoff(onDone);
    dialog.querySelectorAll("[data-pick-charter]").forEach((btn) => btn.onclick = () => {
      const record = options.find((r) => r.transport_id === btn.dataset.pickCharter);
      const anchorTime = boundary.arrival_time || "09:00";
      embedArrivalTransport({ name: `使用${record.title}前往市區`, note: record.summary || "", startTime: anchorTime, endTime: anchorTime });
      dialog.close();
      proceedAfterArrivalTransport(onDone);
    });
  }

  // Reference info block only - the 5 area names themselves are real (js/trip-accommodation.js),
  // but no distance/time-from-airport field exists anywhere in the project, and HUBS carries no
  // taxi/Uber/payment field at all. Both stay honest empty notes instead of a guessed number.
  function airportReferenceInfoHtml() {
    const areas = window.SoftPlanetAccommodation.areasForDestination(trip.country, trip.city);
    const areaRowsHtml = areas.length
      ? areas.map((area) => `<div class="airport-ref-row"><strong>${escape(area.name)}</strong><span class="field-note">參考距離與時間尚未提供</span></div>`).join("")
      : `<p class="field-note">這座城市的住宿區距離資訊還在整理中。</p>`;
    return `<div class="airport-ref-section"><h3>機場到住宿區參考距離</h3>${areaRowsHtml}</div>
      <div class="airport-ref-section"><h3>計程車資訊</h3><p class="field-note">這個機場的計程車搭乘位置、付款方式與 Uber 使用資訊，目前還在整理中。</p></div>`;
  }
  function showArrivalSelfArrangedForm(dialog, boundary, onDone) {
    const body = `<div class="mumu-assistant-body">
      <button type="button" class="text-button" id="arrivalTransportBack">‹ 上一步</button>
      ${airportReferenceInfoHtml()}
      <form class="workspace-form" id="arrivalSelfForm">
        <label>方式名稱（選填）<input name="mode_name" maxlength="40" placeholder="例如：親友接送、自行搭計程車"></label>
        <div class="form-row"><label>預計出發時間（選填）<input name="depart_time" type="time"></label><label>預計抵達時間（選填）<input name="arrive_time" type="time"></label></div>
        <label>備註（選填）<textarea name="note" maxlength="100"></textarea></label>
        <label>連結（選填）<input name="link_url" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…"></label>
        <button class="primary-btn" type="submit">確認機場交通已安排</button>
      </form>
    </div>`;
    updateDialogContent(dialog, "MUMU 行程助手", body);
    dialog.querySelector("#arrivalTransportBack").onclick = () => openArrivalTransportHandoff(onDone);
    const form = dialog.querySelector("#arrivalSelfForm");
    let submitted = false;
    form.onsubmit = (event) => {
      event.preventDefault();
      if (submitted) return;
      submitted = true;
      form.querySelector("button[type=submit]").disabled = true;
      const values = Object.fromEntries(new FormData(form));
      const minutes = window.SoftPlanetTripItems.minutes;
      const hasRealRange = values.depart_time && values.arrive_time && minutes(values.arrive_time) > minutes(values.depart_time);
      const anchorTime = boundary.arrival_time || "09:00";
      const startTime = hasRealRange ? values.depart_time : anchorTime;
      const endTime = hasRealRange ? values.arrive_time : anchorTime;
      const safeLink = window.SoftPlanetMaps?.safe ? window.SoftPlanetMaps.safe(values.link_url) : "";
      const note = [values.note?.trim(), safeLink].filter(Boolean).join(" ");
      embedArrivalTransport({ name: values.mode_name?.trim() || "自行前往市區", note, startTime, endTime });
      dialog.close();
      proceedAfterArrivalTransport(onDone);
    };
  }

  // "晚點安排" lets the user add one schedule item (airport/pre-city errands) before deciding
  // transport. First layer is the same 景點/美食/生活機能 grid used everywhere else
  // (assistantStep1Html) - not a shortcut straight into one category. Still at the airport (no
  // transport chosen yet), so 生活機能's "查看周邊" must never fall through to city-wide results;
  // a deliberately non-matching anchor is supplied for that path only (no airport-vicinity place
  // data exists anywhere in the project, so this always yields an honest empty state). 景點/美食
  // keep their existing "到旅行靈感找..." link unchanged - reusing the existing source step as-is
  // in every other respect, not a second parallel assistant.
  function openArrivalDeferredAdd(date, onDone) {
    const dialog = openDialog("MUMU 行程助手", assistantStep1Html());
    const onCommittedOverride = () => afterDeferredArrivalItem(date, onDone);
    const airportAnchor = { id: null, city: null, country: null };
    dialog.querySelectorAll("[data-category]").forEach((btn) => btn.onclick = () => openAssistantSourceStep(dialog, btn.dataset.category, date, "day-1", onCommittedOverride, airportAnchor));
  }
  function afterDeferredArrivalItem(date, onDone) {
    if (arrivalTransportChosen(date)) { proceedAfterArrivalTransport(onDone); return; }
    const boundary = window.SoftPlanetTripBoundaries.get(tripId);
    const body = `<div class="mumu-assistant-body">
      <p class="section-helper">接下來要前往市區了嗎？</p>
      <div class="stay-picker-actions">
        <button type="button" class="secondary-btn" id="followupTransit">大眾運輸</button>
        <button type="button" class="secondary-btn" id="followupCharter">當地包車</button>
        <button type="button" class="secondary-btn" id="followupSelf">自行前往市區</button>
        <button type="button" class="secondary-btn" id="followupMore">再新增一筆行程</button>
      </div>
    </div>`;
    const dialog = openDialog("MUMU 行程助手", body);
    dialog.querySelector("#followupTransit").onclick = () => showArrivalTransitList(dialog, boundary, onDone);
    dialog.querySelector("#followupCharter").onclick = () => showArrivalCharterList(dialog, boundary, onDone);
    dialog.querySelector("#followupSelf").onclick = () => showArrivalSelfArrangedForm(dialog, boundary, onDone);
    dialog.querySelector("#followupMore").onclick = () => openArrivalDeferredAdd(date, onDone);
  }

  // Text mode's per-day expand state is a UI preference only (module-level, resets on reload),
  // never written into Journey data. Days can be open independently, unlike edit mode's accordion.
  let textModeOpenDays = null;
  function renderNotebookView() {
    const boundaryRecord = window.SoftPlanetTripBoundaries.get(tripId);
    const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
    const days = dateRange(trip.start_date, trip.end_date);
    if (!textModeOpenDays) textModeOpenDays = new Set(days.length ? ["day-1"] : []);
    const minutes = window.SoftPlanetTripItems.minutes;

    const controls = document.createElement("div");
    controls.className = "notebook-controls";
    controls.innerHTML = `<button type="button" id="expandAllDays">全部展開</button><button type="button" id="collapseAllDays">全部收合</button>`;
    journey.appendChild(controls);
    controls.querySelector("#expandAllDays").onclick = () => { textModeOpenDays = new Set(days.map((_, i) => `day-${i + 1}`)); renderJourney(); };
    controls.querySelector("#collapseAllDays").onclick = () => { textModeOpenDays = new Set(); renderJourney(); };

    const host = document.createElement("div");
    host.className = "journey-notebook";
    days.forEach((date, index) => {
      const dayId = `day-${index + 1}`;
      const isFirst = index === 0, isLast = index === days.length - 1;
      const timedLines = [];
      // Boundary lines carry no place (place: null) so the shared actions block below never
      // attaches 查看詳情／開始導航 to them - the traveler is already at the airport for arrival, and
      // this line is flight information only, not a navigable destination. Full airport name +
      // the warm one-line note (reusing the existing per-item note slot) instead of a bare hub code.
      if (isFirst && boundaryRecord?.arrival_date) {
        const arrivalHub = `${hubFullName(boundaryRecord.arrival_hub_id)}${terminalSuffix(boundaryRecord.arrival_terminal)}`;
        timedLines.push(boundaryRecord.tentative
          ? { time: boundaryRecord.arrival_time || "", text: `預計抵達${arrivalHub}`, kind: "boundary", place: null }
          : { time: boundaryRecord.arrival_time || "", text: `抵達${arrivalHub}`, note: "「開始美好的旅行。」", kind: "boundary", place: null });
      }
      window.SoftPlanetTripItems.itemsForDate(tripId, date).forEach((item) => {
        const isTransport = item.item_type === "transport";
        const place = isTransport
          ? hubAsPlace(window.SoftPlanetTripBoundaries.HUBS().find((h) => h.id === hubIdFromTransportItemId(item.item_id)), trip.country)
          : (!String(item.item_id).startsWith("manual-") ? window.getSoftPlanetPlace(item.item_id) : null);
        timedLines.push({ time: item.start_time, text: item.item_name, note: item.note, itemId: item.item_id, kind: isTransport ? "transport" : "place", place });
      });
      if (isLast && boundaryRecord?.departure_date) {
        const departureHub = `${hubFullName(boundaryRecord.departure_hub_id)}${terminalSuffix(boundaryRecord.departure_terminal)}`;
        timedLines.push(boundaryRecord.tentative
          ? { time: boundaryRecord.departure_time || "", text: `預計從${departureHub}起飛`, kind: "boundary", place: null }
          : { time: boundaryRecord.departure_time || "", text: `從${departureHub}啟程`, note: "「回到溫暖的家。」", kind: "boundary", place: null });
      }
      timedLines.sort((a, b) => (minutes(a.time) ?? 0) - (minutes(b.time) ?? 0));
      const arrivalMin = isFirst && boundaryRecord?.arrival_time ? minutes(boundaryRecord.arrival_time) : null;
      const departureMin = isLast && boundaryRecord?.departure_time ? minutes(boundaryRecord.departure_time) : null;
      let hasConflict = false;
      timedLines.forEach((line) => {
        const lineMin = minutes(line.time);
        if (arrivalMin !== null && lineMin !== null && lineMin < arrivalMin && line.kind !== "boundary") { line.conflict = "🐻 這筆時間比抵達時間還早，要再確認一下嗎？"; hasConflict = true; }
        if (departureMin !== null && lineMin !== null && lineMin > departureMin && line.kind !== "boundary") { line.conflict = "🐻 這筆時間比離開時間還晚，要再確認一下嗎？"; hasConflict = true; }
      });
      const stayTonight = nights[index]?.stay || null;
      const checkInStay = checkInStayForIndex(nights, index);
      const isOpen = textModeOpenDays.has(dayId);
      const summary = `${formatDayLabel(date)}・${timedLines.length ? `${timedLines.length} 個行程` : "尚未安排"}${stayTonight ? `・今晚住宿：${stayTonight.place_name}` : ""}${hasConflict ? "・⚠️ 時間可能需要確認" : ""}`;
      const section = document.createElement("section");
      section.className = "notebook-day";
      section.innerHTML = `<button type="button" class="notebook-day-header"><span><strong>Day ${index + 1}</strong><small>${escape(summary)}</small></span><span class="trip-accordion-caret ${isOpen ? "open" : ""}" aria-hidden="true">›</span></button><div class="notebook-day-body" ${isOpen ? "" : "hidden"}></div>`;
      section.querySelector(".notebook-day-header").onclick = () => {
        if (textModeOpenDays.has(dayId)) textModeOpenDays.delete(dayId); else textModeOpenDays.add(dayId);
        renderJourney();
      };
      const body = section.querySelector(".notebook-day-body");
      if (!timedLines.length && !stayTonight && !checkInStay) {
        body.innerHTML = `<p class="field-note">這天還沒有安排內容。</p>`;
      } else {
        const actionsHtml = (navUrl, index) => `<div class="notebook-item-actions"><button type="button" class="notebook-action" data-line-detail="${index}">查看詳情</button>${navUrl ? `<a class="notebook-action" href="${navUrl}" target="_blank" rel="noopener noreferrer">開始導航</a>` : ""}</div>`;
        // Each rendered line keeps its resolved place/stay object in dayLineActions (by index) so the
        // click handler below never has to re-derive a hub/place from a data-attribute string.
        const dayLineActions = [];
        let checkInHtml = "";
        if (checkInStay) {
          const stayPlace = window.getSoftPlanetPlace(checkInStay.place_id);
          const idx = dayLineActions.push({ type: "stay", night: { stay: checkInStay } }) - 1;
          checkInHtml = `<article class="notebook-item notebook-item-stay"><div class="notebook-item-head"><span aria-hidden="true">🏨</span><div><strong>入住住宿</strong><small>${escape(checkInStay.place_name)}</small></div></div>${actionsHtml(navigationUrl(stayPlace), idx)}</article>`;
        }
        const itemsHtml = timedLines.map((line) => {
          const navUrl = navigationUrl(line.place);
          let actions = "";
          if (line.place) {
            const idx = dayLineActions.push({ type: "place", place: line.place, time: line.time }) - 1;
            actions = actionsHtml(navUrl, idx);
          }
          return `<article class="notebook-item">
            <div class="notebook-item-head"><time>${escape(line.time)}</time><div><strong>${escape(line.text)}</strong>${line.place ? `<small>${escape([line.place.city, line.place.category].filter(Boolean).join("・"))}</small>` : ""}</div></div>
            ${line.note ? `<p class="notebook-item-note">${escape(line.note)}</p>` : ""}
            ${line.conflict ? `<p class="notebook-conflict">${line.conflict}</p>` : ""}
            ${actions}
          </article>`;
        }).join("");
        let stayHtml = "";
        if (stayTonight) {
          const idx = dayLineActions.push({ type: "stay", night: nights[index] }) - 1;
          stayHtml = `<article class="notebook-item notebook-item-stay"><div class="notebook-item-head"><span aria-hidden="true">🏨</span><div><strong>今晚住宿</strong><small>${escape(stayTonight.place_name)}</small></div></div>${actionsHtml(navigationUrl(window.getSoftPlanetPlace(stayTonight.place_id)), idx)}</article>`;
        }
        body.innerHTML = checkInHtml + itemsHtml + stayHtml;
        body.querySelectorAll("[data-line-detail]").forEach((btn) => btn.onclick = () => {
          const action = dayLineActions[Number(btn.dataset.lineDetail)];
          if (action.type === "stay") openStayDetail(action.night, date, dayId);
          else openPlaceDetail(action.place, { time: action.time, dayId });
        });
      }
      host.appendChild(section);
    });
    journey.appendChild(host);
    const packingHost = document.createElement("div");
    journey.appendChild(packingHost);
    renderPackingChecklist(packingHost);
  }

  // ---- 旅行準備清單／伴手禮清單 ----
  // Reuses the existing checklist storage (same as block-workspace.js's packing block) - no
  // second checklist data system. No Essentials Master / Trigger Tags exist anywhere in this
  // project, so the category seed list below is the same kind of generic, non-destination-
  // specific travel knowledge already shown on the standalone packing.html guide page - never a
  // fabricated per-trip recommendation. "查看推薦" only appears once an item carries a real
  // productUrl; no product/affiliate data exists anywhere in the project today, so it stays
  // hidden for now.
  const PACKING_CATEGORIES = [
    { key: "documents", name: "證件與資料" },
    { key: "electronics", name: "電子用品" },
    { key: "clothing", name: "衣物" },
    { key: "toiletries", name: "盥洗與清潔" },
    { key: "medicine", name: "藥品與急救" },
    { key: "family", name: "親子用品" },
    { key: "baby", name: "嬰幼兒用品" },
    { key: "sun_rain", name: "防曬與雨具" },
    { key: "warmth", name: "保暖用品" },
    { key: "comfort", name: "旅途舒適" },
    { key: "shopping", name: "購物與收納" }
  ];
  const PACKING_DEFAULTS = {
    documents: ["護照與證件", "旅遊保險", "訂房與機票證明"],
    electronics: ["手機與充電器", "行動電源", "轉接插頭"],
    clothing: ["當季衣物", "備用內衣褲", "好走的鞋"],
    toiletries: ["隨身盥洗用品", "毛巾"],
    medicine: ["常用藥品", "個人藥物"],
    family: ["兒童證件", "隨身玩具或安撫物"],
    baby: ["尿布", "奶瓶與奶粉"],
    sun_rain: ["防曬用品", "雨具"],
    warmth: ["保暖外套", "圍巾手套"],
    comfort: ["頸枕", "眼罩耳塞"],
    shopping: ["收納袋", "環保購物袋"]
  };
  function defaultPackingItems() {
    const items = [];
    Object.entries(PACKING_DEFAULTS).forEach(([category, names]) => names.forEach((name, i) => items.push({ id: `sys-${category}-${i}`, category, name, done: false, hidden: false, custom: false })));
    return items;
  }
  // Merges in any system item the stored list doesn't have yet (e.g. this trip's checklist was
  // created before a category existed) without ever duplicating or touching what the user already
  // has - each trip's checklist is independent and persists exactly as saved.
  function packingItemsFor(tid) {
    const stored = window.SoftPlanetServices.checklist(tid, "packing");
    if (!stored.length) return defaultPackingItems();
    const storedIds = new Set(stored.map((i) => i.id));
    return [...stored, ...defaultPackingItems().filter((sys) => !storedIds.has(sys.id))];
  }
  function savePackingItems(tid, items) { window.SoftPlanetServices.saveChecklist(tid, "packing", items); }

  function prepSummaryCardsHtml() {
    const packing = packingItemsFor(tripId).filter((i) => !i.hidden);
    const packingDone = packing.filter((i) => i.done).length;
    const souvenirs = souvenirsFor(tripId);
    const souvenirDone = souvenirs.filter((i) => i.purchased).length;
    return `<section class="prep-section">
      <button type="button" class="prep-summary-card" id="openPackingBtn"><span aria-hidden="true">🧳</span><div><h3>行李準備清單</h3><p>已準備 ${packingDone}／${packing.length} 項</p></div><span aria-hidden="true">›</span></button>
      <button type="button" class="prep-summary-card" id="openSouvenirBtn"><span aria-hidden="true">🎁</span><div><h3>伴手禮清單</h3><p>${souvenirs.length ? `已購買 ${souvenirDone}／${souvenirs.length} 項` : "還沒有加入想買的伴手禮"}</p></div><span aria-hidden="true">›</span></button>
    </section>`;
  }
  function renderPackingChecklist(container) {
    container.innerHTML = prepSummaryCardsHtml();
    container.querySelector("#openPackingBtn").onclick = () => openPackingList();
    container.querySelector("#openSouvenirBtn").onclick = () => openSouvenirList();
  }

  let packingViewMode = "edit";
  function packingCategoryRows(items) {
    return items.map((item) => `<label class="check-row ${item.done ? "done" : ""}"><input type="checkbox" data-packing-check="${escape(item.id)}" ${item.done ? "checked" : ""}><span>${escape(item.name)}</span>${item.productUrl ? `<a href="${escape(item.productUrl)}" target="_blank" rel="noopener noreferrer">查看推薦</a>` : ""}${item.custom ? `<button type="button" data-packing-hide="${escape(item.id)}" aria-label="隱藏 ${escape(item.name)}">×</button>` : `<button type="button" class="text-mini-action" data-packing-hide="${escape(item.id)}">隱藏</button>`}</label>`).join("");
  }
  function packingListHtml() {
    const items = packingItemsFor(tripId);
    const visible = items.filter((i) => !i.hidden);
    const hidden = items.filter((i) => i.hidden);
    const customItems = visible.filter((i) => i.category === "custom");
    const toggle = `<div class="journey-view-toggle"><button type="button" class="${packingViewMode === "edit" ? "active" : ""}" data-packing-mode="edit">編輯模式</button><button type="button" class="${packingViewMode === "text" ? "active" : ""}" data-packing-mode="text">文字模式</button></div>`;
    if (packingViewMode === "text") {
      const groups = [...PACKING_CATEGORIES, { key: "custom", name: "其他自訂" }].map((cat) => ({ ...cat, list: visible.filter((i) => i.category === cat.key) })).filter((g) => g.list.length);
      return `${toggle}<div class="mumu-assistant-body">${groups.length ? groups.map((g) => `<p class="section-helper">${g.name}</p>${g.list.map((i) => `<p>${i.done ? "✓" : "☐"} ${escape(i.name)}</p>`).join("")}`).join("") : `<p class="field-note">還沒有任何準備項目。</p>`}</div>`;
    }
    const groups = PACKING_CATEGORIES.map((cat) => ({ ...cat, list: visible.filter((i) => i.category === cat.key) }));
    return `${toggle}<div class="mumu-assistant-body">
      ${groups.map((g) => `<p class="section-helper">${g.name}</p><div class="checklist-card">${packingCategoryRows(g.list)}</div>`).join("")}
      <p class="section-helper">其他自訂</p>
      <div class="checklist-card">${customItems.length ? packingCategoryRows(customItems) : ""}</div>
      <form id="packingAddForm" class="inline-form"><input name="name" maxlength="40" required placeholder="新增自訂用品"><select name="category">${PACKING_CATEGORIES.map((c) => `<option value="${c.key}">${c.name}</option>`).join("")}<option value="custom" selected>其他自訂</option></select><button class="secondary-btn" type="submit">新增</button></form>
      ${hidden.length ? `<button type="button" class="text-mini-action" id="showHiddenPackingBtn">已隱藏 ${hidden.length} 項用品，點此恢復</button>` : ""}
    </div>`;
  }
  function openPackingList() {
    const dialog = openDialog("旅行準備清單", packingListHtml());
    wirePackingList(dialog);
  }
  function wirePackingList(dialog) {
    updateDialogContent(dialog, "旅行準備清單", packingListHtml());
    dialog.querySelectorAll("[data-packing-mode]").forEach((btn) => btn.onclick = () => { packingViewMode = btn.dataset.packingMode; wirePackingList(dialog); });
    if (packingViewMode !== "edit") return;
    dialog.querySelectorAll("[data-packing-check]").forEach((input) => input.onchange = () => {
      const items = packingItemsFor(tripId);
      const item = items.find((i) => i.id === input.dataset.packingCheck);
      if (item) item.done = input.checked;
      savePackingItems(tripId, items);
      renderJourney(); wirePackingList(dialog);
    });
    dialog.querySelectorAll("[data-packing-hide]").forEach((btn) => btn.onclick = () => {
      const items = packingItemsFor(tripId);
      const item = items.find((i) => i.id === btn.dataset.packingHide);
      if (item) item.hidden = true;
      savePackingItems(tripId, items);
      renderJourney(); wirePackingList(dialog);
    });
    dialog.querySelector("#showHiddenPackingBtn")?.addEventListener("click", () => {
      const items = packingItemsFor(tripId);
      items.forEach((i) => { i.hidden = false; });
      savePackingItems(tripId, items);
      renderJourney(); wirePackingList(dialog);
    });
    dialog.querySelector("#packingAddForm").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const name = values.name.trim();
      if (!name) return;
      const items = packingItemsFor(tripId);
      items.push({ id: `custom-packing-${Date.now()}`, category: values.category, name, done: false, hidden: false, custom: true });
      savePackingItems(tripId, items);
      renderJourney(); wirePackingList(dialog);
    };
  }

  // ---- 伴手禮清單 ----
  // Brand-new interface (no prior data/storage existed for this at all) - reuses the same
  // checklist storage pattern already established for packing, under its own "souvenirs" type key
  // so it stays fully independent per trip.
  function souvenirsFor(tid) {
    return window.SoftPlanetServices.checklist(tid, "souvenirs");
  }
  function saveSouvenirs(tid, items) { window.SoftPlanetServices.saveChecklist(tid, "souvenirs", items); }
  function souvenirRowHtml(item) {
    return `<article class="souvenir-row ${item.purchased ? "done" : ""}">
      <label><input type="checkbox" data-souvenir-check="${escape(item.id)}" ${item.purchased ? "checked" : ""}><strong>${escape(item.name)}</strong></label>
      <p class="field-note">${[item.type, item.purchase_location, item.area].filter(Boolean).map(escape).join("・")}${item.quantity ? `・數量 ${escape(item.quantity)}` : ""}</p>
      ${item.note ? `<p class="field-note">📝 ${escape(item.note)}</p>` : ""}
      ${item.custom ? `<button type="button" class="text-mini-action" data-souvenir-remove="${escape(item.id)}">刪除</button>` : ""}
    </article>`;
  }
  function souvenirListHtml() {
    const items = souvenirsFor(tripId);
    return `<div class="mumu-assistant-body">
      ${items.length ? `<div class="rec-card-list souvenir-list">${items.map(souvenirRowHtml).join("")}</div>` : `<div class="soft-empty compact-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>還沒有加入想買的伴手禮</h3><p>可以從我的收藏挑選，或新增自己的伴手禮。</p></div>`}
      <div class="stay-picker-actions">
        <a class="secondary-btn" href="inspiration.html?${new URLSearchParams({ country: trip.country || "", city: trip.city || "", category: "伴手禮", trip: tripId })}">從伴手禮靈感加入</a>
        <button type="button" class="secondary-btn" id="souvenirFavBtn">從我的收藏加入</button>
        <button type="button" class="secondary-btn" id="souvenirCustomBtn">新增自己的伴手禮</button>
      </div>
      <div id="souvenirSourceBody"></div>
    </div>`;
  }
  function addSouvenir(values) {
    const items = souvenirsFor(tripId);
    items.push({ id: `souvenir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: values.name, type: values.type || "", purchase_location: values.purchase_location || "", area: values.area || "", quantity: values.quantity || "", note: values.note || "", purchased: false, source: values.source || "custom", custom: values.source !== "favorites" ? true : false });
    saveSouvenirs(tripId, items);
  }
  function openSouvenirList() {
    const dialog = openDialog("伴手禮清單", souvenirListHtml());
    wireSouvenirList(dialog);
  }
  function wireSouvenirList(dialog) {
    updateDialogContent(dialog, "伴手禮清單", souvenirListHtml());
    dialog.querySelectorAll("[data-souvenir-check]").forEach((input) => input.onchange = () => {
      const items = souvenirsFor(tripId);
      const item = items.find((i) => i.id === input.dataset.souvenirCheck);
      if (item) item.purchased = input.checked;
      saveSouvenirs(tripId, items);
      renderJourney(); wireSouvenirList(dialog);
    });
    dialog.querySelectorAll("[data-souvenir-remove]").forEach((btn) => btn.onclick = () => {
      saveSouvenirs(tripId, souvenirsFor(tripId).filter((i) => i.id !== btn.dataset.souvenirRemove));
      renderJourney(); wireSouvenirList(dialog);
    });
    dialog.querySelector("#souvenirFavBtn").onclick = () => {
      const host = dialog.querySelector("#souvenirSourceBody");
      const list = favoritesByCategory(["伴手禮", "景點", "美食", "餐廳"]);
      host.innerHTML = list.length ? `<div class="rec-card-list">${list.map((p) => `<article><span aria-hidden="true">${p.emoji}</span><div><h3>${escape(p.name)}</h3></div><button type="button" data-pick-souvenir-fav="${escape(p.id)}">加入</button></article>`).join("")}</div>` : `<p class="field-note">收藏裡還沒有可以加入的地點。</p>`;
      host.querySelectorAll("[data-pick-souvenir-fav]").forEach((btn) => btn.onclick = () => {
        const place = window.getSoftPlanetPlace(btn.dataset.pickSouvenirFav);
        addSouvenir({ name: place.name, purchase_location: place.name, area: place.subarea || "", source: "favorites" });
        wireSouvenirList(dialog);
      });
    };
    dialog.querySelector("#souvenirCustomBtn").onclick = () => {
      const host = dialog.querySelector("#souvenirSourceBody");
      host.innerHTML = `<form class="workspace-form" id="souvenirCustomForm">
        <label>名稱<input name="name" maxlength="60" required></label>
        <label>類型<input name="type" maxlength="30" placeholder="例如：零食、雜貨"></label>
        <label>購買地點<input name="purchase_location" maxlength="60"></label>
        <label>所在區域<input name="area" maxlength="30"></label>
        <label>預計數量<input name="quantity" maxlength="20"></label>
        <label>備註<textarea name="note" maxlength="100"></textarea></label>
        <button class="primary-btn" type="submit">加入清單</button>
      </form>`;
      host.querySelector("#souvenirCustomForm").onsubmit = (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        if (!values.name.trim()) return;
        addSouvenir({ ...values, source: "custom" });
        wireSouvenirList(dialog);
      };
    };
  }

  function renderJourney(openId) {
    journey.innerHTML = "";

    if (!trip.start_date || !trip.end_date) {
      journey.innerHTML = `<div class="soft-empty"><span class="mumu-asset" data-mumu aria-hidden="true"></span><h3>先一起設定航班資訊吧！</h3><p>設定航班資訊後，MUMU 會自動排出每天的行程，不用再輸入一次旅行日期。</p><button class="primary-btn" id="setTripDatesBtn" type="button">設定航班資訊</button></div>`;
      $("setTripDatesBtn").onclick = () => openBoundaryEditor(() => confirmFlightThenProceed(() => renderJourney()));
      return;
    }

    const toggle = document.createElement("div");
    toggle.className = "journey-view-toggle";
    toggle.innerHTML = `<button type="button" class="${viewMode === "edit" ? "active" : ""}" data-view="edit">編輯模式</button><button type="button" class="${viewMode === "text" ? "active" : ""}" data-view="text">文字模式</button>`;
    journey.appendChild(toggle);
    toggle.querySelectorAll("[data-view]").forEach((btn) => btn.onclick = () => { viewMode = btn.dataset.view; renderJourney(); });

    if (viewMode === "text") { renderNotebookView(); return; }

    const group = window.SoftPlanetAccordion.createGroup();
    const list = document.createElement("div");
    list.className = "trip-accordion";
    journey.appendChild(list);

    const boundaryRecord = window.SoftPlanetTripBoundaries.get(tripId);
    const boundaryTitle = boundaryRecord?.tentative ? "暫訂航班資訊" : "航班資訊";
    const { item: boundaryItem, panel: boundaryPanel } = accordionItem(group, "boundary", boundaryTitle, boundarySummaryText(boundaryRecord));
    list.appendChild(boundaryItem);
    const warmCopy = boundaryWarmCopy(boundaryRecord);
    const warmCopyHtml = warmCopy ? `<p class="flight-warm-copy">${escape(warmCopy.arrivalLine)}</p><p class="flight-warm-copy">${escape(warmCopy.departureLine)}</p>` : "";
    if (boundaryRecord?.tentative) {
      // Tentative航班資訊 offers three slim actions instead of a single edit button - the accordion
      // makes clear this isn't finalized, and the traveler can upgrade to real 航班資訊 whenever
      // they've bought tickets, without losing the estimate they already entered.
      boundaryPanel.innerHTML = `${warmCopyHtml}<div class="flight-slim-actions">
        <button type="button" class="flight-slim-btn" id="tentativeUpgradeBtn">買好機票了，我要輸入航班資訊</button>
        <button type="button" class="flight-slim-btn" id="tentativeGuideBtn">如何買優惠機票</button>
        <button type="button" class="flight-slim-btn" id="tentativeBookBtn">帶我去買機票</button>
      </div>`;
      boundaryPanel.querySelector("#tentativeUpgradeBtn").onclick = () => openBoundaryEditor(() => confirmFlightThenProceed(() => renderJourney("boundary")));
      boundaryPanel.querySelector("#tentativeGuideBtn").onclick = () => openFlightGuideModal();
      // "帶我去買機票": no real flight-ticket-platform-overview page exists anywhere in this
      // project yet (confirmed by full-project search) - per explicit instruction, this entry point
      // is reserved as-is with no destination rather than guessing or building an interim page. A
      // future Sprint wires this once that page exists.
    } else {
      boundaryPanel.innerHTML = `${warmCopyHtml}<button class="secondary-btn" id="editBoundaryBtn" type="button">編輯航班資訊</button>`;
      boundaryPanel.querySelector("#editBoundaryBtn").onclick = () => openBoundaryEditor(() => confirmFlightThenProceed(() => renderJourney("boundary")));
    }
    if (openId === "boundary") group.open("boundary");

    const nights = window.SoftPlanetTripStays.nightsForTrip(trip);
    const missingNights = nights.filter((n) => !n.stay).length;
    const staySubtitle = !nights.length ? "還沒有可安排的夜晚" : missingNights ? `${missingNights} 晚尚未指定住宿` : "已安排全程住宿";
    const { item: stayItem, panel: stayPanel } = accordionItem(group, "stay", "住宿", staySubtitle);
    list.appendChild(stayItem);
    window.SoftPlanetTripStays.mount(stayPanel, trip, {
      onAssign: (date) => openAccommodationAssistant({ presetDate: date, onDone: () => renderJourney("stay") }),
      onReplace: (date) => openAccommodationAssistant({ presetDate: date, onDone: () => renderJourney("stay") })
    });
    if (openId === "stay") group.open("stay");

    const days = dateRange(trip.start_date, trip.end_date);
    days.forEach((date, index) => {
      const dayId = `day-${index + 1}`;
      const items = window.SoftPlanetTripItems.itemsForDate(tripId, date);
      const subtitle = `${formatDayLabel(date)}・${items.length ? `${items.length} 個行程` : "尚未安排"}`;
      const { item, panel } = accordionItem(group, dayId, `Day ${index + 1}`, subtitle);
      list.appendChild(item);
      const checkInStay = checkInStayForIndex(nights, index);
      renderDayPanel(panel, date, index === 0, index === days.length - 1, nights[index], boundaryRecord, dayId, checkInStay);
      if (openId === dayId) group.open(dayId);
    });

    const packingHost = document.createElement("div");
    journey.appendChild(packingHost);
    renderPackingChecklist(packingHost);
  }

  renderHero();
  renderAdvisory();
  renderToolbar();
  renderJourney();

  // trips.js sends brand-new trips here with ?setup=boundary right after creation. Only
  // auto-open once, and only while the trip genuinely has no dates yet - a legacy trip that
  // already has dates must never be forced back into this flow.
  if (new URLSearchParams(location.search).get("setup") === "boundary" && (!trip.start_date || !trip.end_date)) {
    history.replaceState(null, "", `trip.html?id=${encodeURIComponent(tripId)}`);
    openBoundaryEditor(() => confirmFlightThenProceed(() => renderJourney()));
  }

  // 旅行靈感／我的收藏／新增專屬住宿卡 all hand off a selected hotel here via ?assistant=stay&place=,
  // landing straight on the check-in date step rather than repeating area/hotel browsing.
  const assistantParams = new URLSearchParams(location.search);
  if (assistantParams.get("assistant") === "stay" && assistantParams.get("place")) {
    const presetPlace = window.getSoftPlanetPlace(assistantParams.get("place"));
    history.replaceState(null, "", `trip.html?id=${encodeURIComponent(tripId)}`);
    if (trip.start_date && trip.end_date) openAccommodationAssistant({ presetPlace, onDone: () => renderJourney() });
  }

  // Flight Guide's MUMU booking-confirm Modal hands off here via ?assistant=flight once the user
  // says they've actually booked - same "land and auto-open" convention as ?assistant=stay above,
  // straight into the existing 買好機票了，我要輸入航班資訊 flow (no separate/duplicate form).
  if (assistantParams.get("assistant") === "flight") {
    history.replaceState(null, "", `trip.html?id=${encodeURIComponent(tripId)}`);
    openBoundaryEditor(() => confirmFlightThenProceed(() => renderJourney("boundary")));
  }
});
