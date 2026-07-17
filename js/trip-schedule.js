(function () {
  const STORAGE_KEY = "softplanet-trip-items";
  const parse = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (_) { return []; } };
  const write = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  const uid = () => `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const minutes = (value) => { const [hour, minute] = String(value || "").split(":").map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null; };
  const overlaps = (candidate, item) => candidate.trip_date === item.trip_date && minutes(candidate.start_time) < minutes(item.end_time) && minutes(candidate.end_time) > minutes(item.start_time);
  function list(tripId) { return parse().filter((item) => item.trip_id === tripId).sort((a, b) => `${a.trip_date} ${a.start_time}`.localeCompare(`${b.trip_date} ${b.start_time}`)); }
  function itemsForDate(tripId, date) { return list(tripId).filter((item) => item.trip_date === date); }
  function save(values) {
    const items = parse();
    // Formal Departure Boundary lock (trip-boundaries.js departureLock): the last day's window
    // reserved for getting to/through the airport must never accept a general schedule item.
    // Transport items themselves (item_type "transport") are exempt - they are the mechanism by
    // which the traveler reaches the airport, not something the lock protects against.
    if (values.item_type !== "transport") {
      const boundary = window.SoftPlanetTripBoundaries?.get(values.trip_id);
      if (boundary?.departure_date && values.trip_date === boundary.departure_date) {
        const lock = window.SoftPlanetTripBoundaries.departureLock(values.trip_id);
        if (lock?.lockStart && minutes(values.end_time) > minutes(lock.lockStart)) {
          return { item: null, conflicts: [], blocked: true, lockStart: lock.lockStart };
        }
      }
    }
    // Matching must key off trip_item_id (the specific scheduled instance), never item_id alone -
    // the same place can now be scheduled more than once (same day or different days), so matching
    // by item_id would silently merge edits/re-adds into an unrelated existing instance. Callers
    // that are genuinely creating a new instance simply omit trip_item_id.
    const existing = values.trip_item_id ? items.find((item) => item.trip_item_id === values.trip_item_id) : null;
    const next = { trip_item_id: existing?.trip_item_id || uid(), trip_id: values.trip_id, item_type: values.item_type || "place", item_id: values.item_id, item_name: String(values.item_name || "").trim(), trip_date: values.trip_date, start_time: values.start_time, end_time: values.end_time, note: String(values.note || "").trim().slice(0, 100), display_order: existing?.display_order ?? items.filter((item) => item.trip_id === values.trip_id).length, created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    const conflicts = items.filter((item) => item.trip_id === next.trip_id && item.trip_item_id !== next.trip_item_id && overlaps(next, item));
    if (existing) Object.assign(existing, next); else items.push(next);
    write(items);
    return { item: next, conflicts };
  }
  function remove(tripItemId) { write(parse().filter((item) => item.trip_item_id !== tripItemId)); }
  window.SoftPlanetTripItems = { list, itemsForDate, save, remove, minutes, overlaps };
}());

(function () {
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  let dialog = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "schedule-sheet";
    dialog.innerHTML = `<form method="dialog" id="scheduleForm"><button class="sheet-close" type="button" aria-label="關閉">×</button><p class="eyebrow">加入這一天的行程</p><h2 id="scheduleTitle">安排時間</h2><input type="hidden" name="item_id"><input type="hidden" name="trip_date"><label id="scheduleExistingWrap" hidden>已加入這趟旅行的地點<select id="scheduleExisting"></select></label><label>行程名稱<input id="scheduleName" name="item_name" maxlength="40" required placeholder="例如：淺草寺散步"></label><div class="quick-time-grid" aria-label="30 分鐘快捷時間"></div><div class="form-row"><div><label for="scheduleStart">開始時間</label><input id="scheduleStart" name="start_time" type="time" step="60" required></div><div><label for="scheduleEnd">結束時間</label><input id="scheduleEnd" name="end_time" type="time" step="60" required></div></div><label for="scheduleNote">備註</label><input id="scheduleNote" name="note" maxlength="100" placeholder="集合地點、預約資訊或小提醒"><p class="mumu-reminder" id="scheduleReminder" role="status"></p><button class="primary-btn" value="save">儲存行程</button></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector(".sheet-close").onclick = () => dialog.close();
    const quick = dialog.querySelector(".quick-time-grid");
    for (let hour = 8; hour <= 21; hour += 1) for (const minute of [0, 30]) { const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`; quick.insertAdjacentHTML("beforeend", `<button type="button" data-quick-time="${value}">${value}</button>`); }
    quick.onclick = (event) => {
      const value = event.target.dataset.quickTime;
      if (!value) return;
      const form = dialog.querySelector("form");
      form.elements.start_time.value = value;
      const end = (window.SoftPlanetTripItems.minutes(value) + 60) % 1440;
      form.elements.end_time.value = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    };
    return dialog;
  }

  // Shared time-chaining rule: next item's start defaults to the latest existing item's end time
  // that day (or 09:30 if the day is empty). Used by both the dialog default and one-click adds.
  function nextTimeRange(tripId, date) {
    const dayItems = window.SoftPlanetTripItems.itemsForDate(tripId, date);
    const latestEnd = dayItems.reduce((latest, item) => window.SoftPlanetTripItems.minutes(item.end_time) > window.SoftPlanetTripItems.minutes(latest) ? item.end_time : latest, "00:00");
    const start_time = dayItems.length ? latestEnd : "09:30";
    const endMinutes = (window.SoftPlanetTripItems.minutes(start_time) + 60) % 1440;
    const end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    return { start_time, end_time };
  }

  // Opens the shared schedule dialog for a specific trip/date. unscheduledPlaces lets the user
  // pick from places already added to this trip via place.html, without reviving a persistent list.
  // preselect (optional) pre-fills a specific place instead of leaving the picker on "自行輸入名稱".
  function openFor(tripId, date, unscheduledPlaces = [], onSaved, preselect) {
    const el = ensureDialog();
    const form = el.querySelector("form");
    form.reset();
    form.elements.trip_date.value = date;
    form.elements.item_id.value = preselect?.id || "";
    const existingWrap = el.querySelector("#scheduleExistingWrap");
    const existingSelect = el.querySelector("#scheduleExisting");
    if (unscheduledPlaces.length) {
      existingWrap.hidden = false;
      existingSelect.innerHTML = `<option value="">不指定，自行輸入名稱</option>${unscheduledPlaces.map((place) => `<option value="${html(place.id)}" ${preselect?.id === place.id ? "selected" : ""}>${html(place.name)}</option>`).join("")}`;
      existingSelect.onchange = () => {
        const place = unscheduledPlaces.find((item) => item.id === existingSelect.value);
        form.elements.item_id.value = place?.id || "";
        if (place) form.elements.item_name.value = place.name;
      };
    } else {
      existingWrap.hidden = true;
    }
    if (preselect) form.elements.item_name.value = preselect.name;
    const range = nextTimeRange(tripId, date);
    form.elements.start_time.value = range.start_time;
    form.elements.end_time.value = range.end_time;
    el.querySelector("#scheduleReminder").textContent = "";
    form.onsubmit = (event) => {
      if (event.submitter?.value !== "save") return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      if (window.SoftPlanetTripItems.minutes(values.end_time) <= window.SoftPlanetTripItems.minutes(values.start_time)) { el.querySelector("#scheduleReminder").textContent = "結束時間要晚於開始時間。"; return; }
      if (!values.item_id) values.item_id = `manual-${Date.now()}`;
      const result = window.SoftPlanetTripItems.save({ ...values, trip_id: tripId, item_type: "place" });
      if (result.conflicts.length) { el.querySelector("#scheduleReminder").textContent = "🐻 這段時間和其他行程有些重疊，要再確認一下嗎？"; return; }
      el.close();
      onSaved?.(result.item);
    };
    el.showModal();
  }

  function renderDay(tripId, date) {
    const items = window.SoftPlanetTripItems.itemsForDate(tripId, date);
    if (!items.length) return `<p class="field-note">這天還沒有安排時間。</p>`;
    return `<div class="trip-timeline">${items.map((item) => `<article class="timeline-item" data-edit-item="${html(item.trip_item_id)}"><time>${html(item.start_time)}–${html(item.end_time)}</time><div><h3>${html(item.item_name || "未命名行程")}</h3>${item.note ? `<p>${html(item.note)}</p>` : ""}</div><button type="button" data-remove-trip-item="${html(item.trip_item_id)}" aria-label="移除 ${html(item.item_name)}">×</button></article>`).join("")}</div>`;
  }

  window.SoftPlanetTripSchedule = { openFor, renderDay, nextTimeRange };
}());
