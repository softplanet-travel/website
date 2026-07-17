(function () {
  const STORAGE_KEY = "softplanet-trip-items";
  const parse = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (_) { return []; } };
  const write = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  const uid = () => `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const minutes = (value) => { const [hour, minute] = String(value || "").split(":").map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null; };
  const overlaps = (candidate, item) => candidate.trip_date === item.trip_date && minutes(candidate.start_time) < minutes(item.end_time) && minutes(candidate.end_time) > minutes(item.start_time);
  const formatDate = (value) => {
    if (!value) return "未指定日期";
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return html(value);
    const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return `${parts[1]}月${parts[2]}日・${weekdays[date.getDay()]}`;
  };
  function list(tripId) { return parse().filter((item) => item.trip_id === tripId).sort((a, b) => `${a.trip_date} ${a.start_time}`.localeCompare(`${b.trip_date} ${b.start_time}`)); }
  function save(values) {
    const items = parse();
    const existing = items.find((item) => item.trip_id === values.trip_id && item.item_id === values.item_id);
    const next = { trip_item_id: existing?.trip_item_id || uid(), trip_id: values.trip_id, item_type: values.item_type || "place", item_id: values.item_id, item_name: String(values.item_name || "").trim(), trip_date: values.trip_date, start_time: values.start_time, end_time: values.end_time, note: String(values.note || "").trim().slice(0, 100), display_order: existing?.display_order ?? items.filter((item) => item.trip_id === values.trip_id).length, created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    const conflicts = items.filter((item) => item.trip_id === next.trip_id && item.trip_item_id !== next.trip_item_id && overlaps(next, item));
    if (existing) Object.assign(existing, next); else items.push(next);
    write(items);
    return { item: next, conflicts };
  }
  function remove(tripItemId) { write(parse().filter((item) => item.trip_item_id !== tripItemId)); }
  window.SoftPlanetTripItems = { list, save, remove, minutes, overlaps };
}());

document.addEventListener("DOMContentLoaded", async () => {
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const formatDate = (value) => {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return html(value || "未指定日期");
    const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return `${parts[1]}月${parts[2]}日・${weekdays[date.getDay()]}`;
  };
  const tripId = new URLSearchParams(location.search).get("id");
  if (!tripId || !window.SoftPlanetTripItems || !window.SoftPlanetStore) return;
  const trip = await window.SoftPlanetStore.getTrip(tripId);
  const collection = document.getElementById("tripCollection");
  if (!trip || !collection) return;
  const section = document.createElement("section");
  section.className = "trip-schedule-section";
  section.innerHTML = `<div class="section-head"><div><p class="eyebrow">旅行日程</p><h2>排進每天的行程</h2></div><span class="count-badge" id="scheduleCount"></span></div><p class="section-helper">先用 30 分鐘快捷選擇，再依預約時間調整到精確分鐘。</p><div class="trip-timeline" id="tripTimeline"></div>`;
  collection.parentNode.insertBefore(section, collection);
  const dialog = document.createElement("dialog");
  dialog.className = "schedule-sheet";
  dialog.innerHTML = `<form method="dialog" id="scheduleForm"><button class="sheet-close" value="cancel" aria-label="關閉">×</button><p class="eyebrow">加入旅行日程</p><h2 id="scheduleTitle">安排時間</h2><input type="hidden" name="item_id"><label for="scheduleDate">日期</label><input id="scheduleDate" name="trip_date" type="date" required><div class="quick-time-grid" aria-label="30 分鐘快捷時間"></div><div class="form-row"><div><label for="scheduleStart">開始時間</label><input id="scheduleStart" name="start_time" type="time" step="60" required></div><div><label for="scheduleEnd">結束時間</label><input id="scheduleEnd" name="end_time" type="time" step="60" required></div></div><label for="scheduleNote">備註</label><input id="scheduleNote" name="note" maxlength="100" placeholder="集合地點、預約資訊或小提醒"><p class="mumu-reminder" id="scheduleReminder" role="status"></p><button class="primary-btn" value="save">儲存行程</button></form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector("form"), quick = dialog.querySelector(".quick-time-grid");
  for (let hour = 8; hour <= 21; hour += 1) for (const minute of [0, 30]) { const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`; quick.insertAdjacentHTML("beforeend", `<button type="button" data-quick-time="${value}">${value}</button>`); }
  quick.onclick = (event) => { const value = event.target.dataset.quickTime; if (!value) return; form.elements.start_time.value = value; const end = (window.SoftPlanetTripItems.minutes(value) + 60) % 1440; form.elements.end_time.value = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`; };
  function render() {
    const items = window.SoftPlanetTripItems.list(tripId), root = document.getElementById("tripTimeline");
    document.getElementById("scheduleCount").textContent = `${items.length} 個行程`;
    if (!items.length) { root.innerHTML = `<div class="soft-empty compact-empty"><span aria-hidden="true">🗓️</span><h3>還沒有安排時間</h3><p>從下方收藏的地點選擇「安排時間」，慢慢排出適合自己的節奏。</p></div>`; return; }
    root.innerHTML = items.map((item) => {
      const name = html(item.item_name || "未命名行程");
      return `<article class="timeline-item"><time>${html(item.start_time)}–${html(item.end_time)}</time><div><p class="eyebrow">${formatDate(item.trip_date)}</p><h3>${name}</h3>${item.note ? `<p>${html(item.note)}</p>` : ""}</div><button type="button" data-remove-trip-item="${html(item.trip_item_id)}" aria-label="移除 ${name}">×</button></article>`;
    }).join("");
    root.querySelectorAll("[data-remove-trip-item]").forEach((button) => button.onclick = () => { window.SoftPlanetTripItems.remove(button.dataset.removeTripItem); render(); });
  }
  function mountScheduleButtons() {
    document.querySelectorAll(".trip-place-item").forEach((article) => {
      if (article.querySelector("[data-schedule-place]")) return;
      const link = article.querySelector("h3 a"); if (!link) return;
      const placeId = new URL(link.href).searchParams.get("id"), button = document.createElement("button");
      button.type = "button"; button.className = "schedule-place-btn"; button.dataset.schedulePlace = placeId; button.dataset.placeName = link.textContent.trim(); button.textContent = "安排時間";
      article.querySelector("div").appendChild(button);
      button.onclick = () => {
        const existing = window.SoftPlanetTripItems.list(tripId).find((item) => item.item_id === placeId);
        form.reset(); form.elements.item_id.value = placeId; form.elements.trip_date.value = existing?.trip_date || trip.start_date || new Date().toISOString().slice(0, 10); form.elements.start_time.value = existing?.start_time || "09:30"; form.elements.end_time.value = existing?.end_time || "10:30"; form.elements.note.value = existing?.note || "";
        document.getElementById("scheduleTitle").textContent = `安排「${button.dataset.placeName}」`; document.getElementById("scheduleReminder").textContent = ""; dialog.showModal();
      };
    });
  }
  form.addEventListener("submit", (event) => {
    if (event.submitter?.value !== "save") return; event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (window.SoftPlanetTripItems.minutes(values.end_time) <= window.SoftPlanetTripItems.minutes(values.start_time)) { document.getElementById("scheduleReminder").textContent = "結束時間要晚於開始時間。"; return; }
    const place = window.getSoftPlanetPlace(values.item_id), result = window.SoftPlanetTripItems.save({ ...values, trip_id: tripId, item_name: place?.name || "旅行行程" });
    document.getElementById("scheduleReminder").textContent = result.conflicts.length ? "🐻 這段時間和前一個行程有些重疊，要再確認一下嗎？" : "行程已儲存。"; render(); mountScheduleButtons(); if (!result.conflicts.length) dialog.close();
  });
  new MutationObserver(mountScheduleButtons).observe(document.getElementById("placeList"), { childList: true });
  render(); mountScheduleButtons();
});
