(function () {
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  // Presentation-only mapping from the CSV's icon keyword to this app's existing emoji-based
  // icon language (no icon font is loaded anywhere in the project). The stored `icon` value
  // itself is never altered - this only decides how to draw it.
  const ICON_MAP = {
    flight: "✈️", compare: "⚖️", trending_up: "📈", shopping_cart: "🛍️",
    language: "🌐", public: "🌍", credit_card: "💳", school: "🎓",
    luggage: "🧳", flight_takeoff: "🛫", help: "❓", schedule: "🕒",
    visibility_off: "🕶️", account_balance: "🏦",
    flag_tw: "🇹🇼", flag_jp: "🇯🇵", flag_kr: "🇰🇷"
  };
  const iconFor = (node) => ICON_MAP[node?.icon] || "🧭";

  // Short, first-time-buyer teaching steps for the 3 real external tools this flow walks
  // someone through. Not part of the CSV (no article-body column exists there, and this Sprint's
  // scope explicitly keeps the CSV structure untouched) - this is page copy, same category as the
  // hand-written page-intro copy already used across the app.
  const ARTICLE_STEPS = {
    "google-flights": [
      "打開 Google Flights，輸入出發地與目的地。",
      "選好「來回」或「單程」，輸入一組初步日期。",
      "點日期上方顯示的價格，看看前後幾天貴不貴。",
      "打開「價格圖表」，抓一整個月的價格高低區間。",
      "選出你能接受、相對便宜的日期組合。",
      "還沒決定也沒關係，按「追蹤價格」，之後降價會通知你。"
    ],
    "skyscanner": [
      "打開 Skyscanner，輸入出發地、目的地與日期。",
      "把日期改成「整月」，一次看完一個月的價格。",
      "同一航班，比較不同訂票平台顯示的價格。",
      "留意廉航常另外收行李費，不是只看票面價。",
      "找到喜歡的組合後，點進去看是導去哪個平台訂票。",
      "把看到的價格記下來，帶去 KAYAK 再確認一次。"
    ],
    "kayak": [
      "打開 KAYAK，輸入同樣的出發地、目的地與日期。",
      "看「價格趨勢」，了解現在是偏貴還是偏便宜。",
      "如果顯示「現在買」，代表價格短期內不容易更低。",
      "如果顯示「可以再等」，可以先觀察幾天再決定。",
      "把 KAYAK 看到的價格，和前面兩個平台做最後比較。",
      "確認好日期、航班與價格後，就可以前往下一步訂票。"
    ]
  };

  const CHECKLIST_ITEMS = [
    "英文姓名與護照完全一致",
    "去程、回程日期正確",
    "起飛與抵達時間再次確認",
    "手提行李額度已確認",
    "托運行李額度已確認",
    "是否需要提前選位",
    "是否需要加購餐點",
    "是否確認退改票規則",
    "是否確認最終付款金額（機票＋行李＋選位＋手續費）",
    "是否確認付款幣別",
    "是否再次確認所有訂票資料"
  ];

  const main = document.getElementById("flightGuideMain");
  const guide = () => window.SoftPlanetFlightGuide;

  function currentParam() {
    return new URLSearchParams(location.search).get("guide") || "";
  }

  // Set once by trip-detail.js's openFlightGuideModal (?trip=) when Flight Guide is opened from a
  // specific trip's Flight Assistant; empty when reached standalone (bottom-nav, homepage, etc.).
  function currentTripId() {
    return new URLSearchParams(location.search).get("trip") || "";
  }

  // Preserves ?trip= across every internal Flight Guide navigation, so the MUMU confirm Modal
  // still knows which trip to return to even after several levels of browsing (home -> STEP 4 ->
  // platform list -> ...).
  function navigateTo(idOrSlug) {
    const params = new URLSearchParams();
    const trip = currentTripId();
    if (trip) params.set("trip", trip);
    if (idOrSlug) params.set("guide", idOrSlug);
    const query = params.toString();
    const url = query ? `flight.html?${query}` : "flight.html";
    history.pushState({}, "", url);
    render();
    main.scrollIntoView({ block: "start" });
  }

  // Generic: "up" always means the node's own parent, or the true home if it has none -
  // never a per-page hardcoded destination.
  function backTarget(node) {
    const parent = node?.parent_id ? guide().find(node.parent_id) : null;
    if (!parent) return { id: "", label: "‹ 返回機票攻略" };
    return { id: parent.content_slug || parent.guide_id, label: `‹ 返回${html(parent.title)}` };
  }

  // confirmOnClick: when true, the real booking-site link ALSO opens the MUMU confirm checklist
  // Modal alongside its normal new-tab navigation (STEP 4 platform/airline leaves only - decided
  // generically by the caller from the CSV's own `level` column, never a hardcoded slug list).
  function cardHtml(node, opts = {}) {
    const subtitle = node.subtitle ? `<p class="fg-card-subtitle">${html(node.subtitle)}</p>` : "";
    const description = node.description ? `<p class="fg-card-desc">${html(node.description)}</p>` : "";
    const body = `<span class="flight-guide-icon" aria-hidden="true">${iconFor(node)}</span><div class="flight-guide-card-body"><h3>${html(node.title)}</h3>${subtitle}${description}</div>`;
    if (node.page_type === "external") {
      const url = guide().resolveUrl(node);
      const confirmAttr = opts.confirmOnClick ? ` data-confirm-modal="1"` : "";
      const action = url
        ? `<a class="flight-guide-card-action" href="${html(url)}" target="_blank" rel="noopener noreferrer"${confirmAttr}>${html(node.button_text || "前往")} ↗</a>`
        : `<span class="flight-guide-card-action fg-disabled">尚未提供連結</span>`;
      return `<article class="flight-guide-card">${body}${action}</article>`;
    }
    const target = node.content_slug || node.guide_id;
    return `<button type="button" class="flight-guide-card" data-guide-nav="${html(target)}">${body}<span class="flight-guide-card-action">${html(node.button_text || "查看")} ›</span></button>`;
  }

  function wireNav(container) {
    container.querySelectorAll("[data-guide-nav]").forEach((el) => {
      el.addEventListener("click", () => navigateTo(el.dataset.guideNav));
    });
    container.querySelectorAll("[data-guide-back]").forEach((el) => {
      el.addEventListener("click", () => navigateTo(el.dataset.guideBack));
    });
    // Explicit, deterministic sequencing for the STEP 4 booking/airline links: open the real
    // site in a new tab via window.open() (still a same-tick, user-gesture-triggered call, so
    // no popup blocker interferes), THEN open the confirm Modal - both happen synchronously in
    // this one click handler, with no timer, no delay, and nothing that could auto-close or
    // auto-navigate afterwards. preventDefault() stops the anchor's own default navigation so
    // window.open() is the single, explicit source of truth for opening the tab (right-click
    // "open in new tab" / middle-click still work normally since those never fire this handler).
    container.querySelectorAll("[data-confirm-modal]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        window.open(el.href, "_blank", "noopener,noreferrer");
        openConfirmModal(el);
      });
    });
  }

  function stepRowHtml(node, index, isLast) {
    const target = node.content_slug || node.guide_id;
    const subtitle = node.subtitle ? `<p class="fg-step-subtitle">${html(node.subtitle)}</p>` : "";
    const url = guide().resolveUrl(node);
    // Google Flights/Skyscanner/KAYAK need a second, real external entry alongside the tutorial
    // entry; STEP 4 (an index page, not an external tool) has no resolveUrl and simply gets none.
    const externalBtn = node.page_type === "guide"
      ? (url
          ? `<a class="fg-step-external" href="${html(url)}" target="_blank" rel="noopener noreferrer">前往 ${html(node.title)} ↗</a>`
          : `<p class="fg-step-external-pending">官方網站連結尚未提供</p>`)
      : "";
    return `<div class="fg-step-row-wrap">
      <button type="button" class="fg-step-row" data-guide-nav="${html(target)}">
        <span class="fg-step-line"><span class="fg-step-dot">${index + 1}</span>${isLast ? "" : `<span class="fg-step-connector"></span>`}</span>
        <span class="fg-step-content"><span class="fg-step-label">STEP ${index + 1}</span><h3>${html(node.title)}</h3>${subtitle}<span class="fg-step-cta">查看${html(node.title)}教學 ›</span></span>
      </button>
      ${externalBtn ? `<div class="fg-step-external-wrap">${externalBtn}</div>` : ""}
    </div>`;
  }

  function renderHome() {
    const rootNodes = guide().root();
    const steps = rootNodes.filter((n) => n.level === "step");
    const extras = rootNodes.filter((n) => n.level !== "step");
    main.innerHTML = `
      <section class="page-intro">
        <p class="eyebrow">MUMU 的訂票陪伴</p>
        <h1>機票攻略</h1>
        <p class="fg-home-lede">好想買便宜機票嗎？</p>
        <p class="fg-home-lede">跟著 MUMU 用 4 步驟買便宜機票吧！</p>
      </section>
      <p class="fg-step-intro">目前共有四個正式步驟，請依照順序完成。</p>
      <section class="fg-step-timeline">${steps.map((node, i) => stepRowHtml(node, i, i === steps.length - 1)).join("")}</section>
      ${extras.length ? `<section class="flight-guide-extra"><p class="eyebrow fg-extra-label">延伸閱讀</p><div class="flight-guide-grid">${extras.map(cardHtml).join("")}</div></section>` : ""}`;
    wireNav(main);
  }

  function renderIndex(node) {
    if (!node) { renderHome(); return; }
    let kids = guide().children(node.guide_id);
    // STEP 4 keeps only the two real booking methods; credit-card offers move into the MUMU
    // confirm Modal instead of sitting alongside actual booking methods.
    if (node.content_slug === "mumu-booking") {
      kids = kids.filter((k) => k.content_slug !== "flight-card-offers");
    }
    const confirmOnClick = kids.length > 0 && (kids[0].level === "platform" || kids[0].level === "airline");
    const backBtn = `<button type="button" class="text-button fg-back" data-guide-back="${html(backTarget(node).id)}">${backTarget(node).label}</button>`;
    const heading = `<section class="page-intro"><p class="eyebrow">${html(node.subtitle || "")}</p><h1>${html(node.title)}</h1>${node.description ? `<p>${html(node.description)}</p>` : ""}</section>`;
    main.innerHTML = `${backBtn}${heading}<section class="flight-guide-grid">${
      kids.length ? kids.map((k) => cardHtml(k, { confirmOnClick })).join("") : `<p class="field-note">目前尚未整理這個分類的內容。</p>`
    }</section>`;
    wireNav(main);
  }

  function renderGuide(node) {
    const isStep = node.level === "step";
    // Sequential prev/next for the 4-step chain, derived purely from the CSV's existing
    // related_guides field (reverse lookup for "prev") - no hardcoded slugs.
    const prevNode = isStep ? guide().root().find((n) => n.related_guides === node.guide_id) || null : null;
    const nextNode = node.related_guides ? guide().find(node.related_guides) : null;
    const back = prevNode
      ? { id: prevNode.content_slug || prevNode.guide_id, label: `← ${html(prevNode.title)}` }
      : backTarget(node);
    const steps = ARTICLE_STEPS[node.content_slug];
    const articleBody = steps
      ? `<ol class="fg-step-list">${steps.map((step) => `<li>${html(step)}</li>`).join("")}</ol>`
      : `${node.description ? `<p>${html(node.description)}</p>` : ""}<p class="field-note">完整攻略內容準備中，之後會補上更詳細的說明。</p>`;
    const heroUrl = isStep ? guide().resolveUrl(node) : null;
    const heroExternal = isStep
      ? (heroUrl
          ? `<a class="fg-hero-external" href="${html(heroUrl)}" target="_blank" rel="noopener noreferrer">前往 ${html(node.title)} ↗</a>`
          : `<p class="fg-step-external-pending">官方網站連結尚未提供</p>`)
      : "";
    main.innerHTML = `
      <button type="button" class="text-button fg-back" data-guide-back="${html(back.id)}">${back.label}</button>
      <section class="flight-guide-hero">
        <span class="flight-guide-hero-icon" aria-hidden="true">${iconFor(node)}</span>
        <h1>${html(node.title)}</h1>
        ${node.subtitle ? `<p class="fg-subtitle">${html(node.subtitle)}</p>` : ""}
        ${heroExternal}
      </section>
      <section class="flight-guide-article">
        ${articleBody}
        ${nextNode ? `<button type="button" class="flight-guide-next" data-guide-nav="${html(nextNode.content_slug || nextNode.guide_id)}">下一步：${html(nextNode.title)} →</button>` : ""}
      </section>`;
    wireNav(main);
  }

  // Credit-card offers move here from STEP 4's main flow. The real data (FG090-093) is grouped
  // by card brand, not by booking platform - there is no CSV field mapping a specific offer to
  // Trip.com/Booking.com/Agoda, so this honestly renders what the data actually contains (brand
  // rows with their real URLs) instead of inventing a platform-specific offer that doesn't exist.
  function creditOfferRowsHtml() {
    const parent = guide().find("FG007");
    const offers = parent ? guide().children(parent.guide_id) : [];
    if (!offers.length) return `<p class="field-note">目前尚未整理信用卡優惠資訊。</p>`;
    return offers.map((node) => {
      const url = guide().resolveUrl(node);
      const action = url
        ? `<a class="fg-offer-btn" href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(node.button_text || `查看${node.title}`)} ↗</a>`
        : "";
      return `<div class="fg-offer-row"><h4>${html(node.title)}</h4>${node.description ? `<p>${html(node.description)}</p>` : ""}${action}</div>`;
    }).join("");
  }

  let confirmDialog = null;
  let confirmTrigger = null;

  function ensureConfirmModal() {
    if (confirmDialog) return confirmDialog;
    const dialog = document.createElement("dialog");
    dialog.className = "fg-confirm-modal";
    dialog.innerHTML = `
      <button type="button" class="fg-confirm-close" aria-label="關閉">×</button>
      <div class="fg-confirm-inner">
        <h2>🐻 MUMU 訂票確認清單</h2>
        <p class="fg-confirm-intro">出發前，我們一起確認一下吧！<br>很多人都是因為忽略這些小細節，才造成後續改票、加價或影響行程。<br>花 30 秒確認，就可以更安心完成訂票。</p>
        <ul class="fg-checklist">${CHECKLIST_ITEMS.map((label, i) => `<li><label><input type="checkbox" data-checklist-item="${i}"> <span>${html(label)}</span></label></li>`).join("")}</ul>
        <div class="fg-offer-accordion">
          <button type="button" class="fg-offer-toggle" aria-expanded="false">💳 付款前看看是否有優惠</button>
          <div class="fg-offer-panel" hidden>
            <p class="fg-offer-note">付款前建議再次確認目前使用的信用卡是否有旅遊優惠。不同平台與銀行的活動會不定期更新，實際優惠請以平台、發卡組織或銀行最新公告為準。</p>
            ${creditOfferRowsHtml()}
          </div>
        </div>
        <div class="fg-confirm-done">
          <p class="fg-confirm-cheer">🐻 太好了！<br>希望你順利訂到喜歡的班機。<br>接下來把航班資訊放進旅行裡，MUMU 就能陪你繼續安排後面的行程。</p>
          <button type="button" class="primary-btn fg-confirm-btn">我已訂好機票，輸入航班資訊</button>
          <p class="fg-confirm-footnote">還沒完成付款也沒關係，可以先關閉這個視窗，之後再回來繼續。</p>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector(".fg-confirm-close").addEventListener("click", () => dialog.close());
    // Only this explicit click means "booking is done" - X and Esc (native <dialog> cancel/close)
    // never reach this handler, so they always just close the Modal and leave the user on Flight
    // Guide, per the required close-vs-complete distinction.
    dialog.querySelector(".fg-confirm-btn").addEventListener("click", () => {
      dialog.close();
      const trip = currentTripId();
      const target = trip ? `trip.html?id=${encodeURIComponent(trip)}&assistant=flight` : `trips.html?assistant=flight`;
      window.top.location.href = target;
    });
    const toggle = dialog.querySelector(".fg-offer-toggle");
    const panel = dialog.querySelector(".fg-offer-panel");
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });
    dialog.addEventListener("close", () => {
      if (confirmTrigger) { confirmTrigger.focus(); confirmTrigger = null; }
    });
    confirmDialog = dialog;
    return dialog;
  }

  // The dialog element is built once and never re-rendered on subsequent opens, so checked
  // checkboxes and the accordion's expanded/collapsed state simply survive a close+reopen within
  // the same page session - no separate state object or storage needed.
  function openConfirmModal(triggerEl) {
    const dialog = ensureConfirmModal();
    confirmTrigger = triggerEl;
    if (!dialog.open) dialog.showModal();
  }

  function render() {
    const param = currentParam();
    const node = param ? guide().find(param) : null;
    if (node && node.page_type === "guide") { renderGuide(node); return; }
    if (node && (node.page_type === "index" || node.page_type === "knowledge_root")) { renderIndex(node); return; }
    renderIndex(null);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await guide().ready();
    render();
  });
  window.addEventListener("popstate", render);
}());
