document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const tripId = params.get("trip");
  const type = params.get("type");
  const $ = (id) => document.getElementById(id);
  const workspace = $("blockWorkspace");
  const services = window.SoftPlanetServices;
  const meta = services.blockCatalog.find((item) => item.id === type);
  const currencies = ["TWD", "JPY", "KRW", "USD", "EUR", "HKD", "THB", "SGD"];
  const categories = ["餐飲", "交通", "住宿", "門票", "購物", "生活用品", "其他"];
  const today = new Date().toISOString().slice(0, 10);
  const escape = (value) => String(value || "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const mumu = '<span class="mumu-asset" data-mumu aria-hidden="true"></span>';

  if (!tripId || !meta) {
    workspace.innerHTML = `<div class="soft-empty">${mumu}<h3>找不到這個旅行積木</h3><a class="primary-link" href="trips.html">返回我的旅行 →</a></div>`;
    return;
  }
  const trip = await window.SoftPlanetStore.getTrip(tripId);
  if (!trip) {
    workspace.innerHTML = `<div class="soft-empty">${mumu}<h3>找不到這趟旅行</h3><a class="primary-link" href="trips.html">返回我的旅行 →</a></div>`;
    return;
  }
  const destinationPaymentMethods = services.walletMethodsForDestination(trip.country);

  $("blockBack").href = `trip.html?id=${encodeURIComponent(tripId)}`;
  $("blockHeader").textContent = meta.name;
  $("blockTitle").textContent = meta.name;
  $("blockDescription").textContent = `${trip.title}・${meta.note}`;
  document.title = `${meta.name} - ${trip.title}`;

  function money(value, currency) {
    return new Intl.NumberFormat("zh-TW", { style: "currency", currency, maximumFractionDigits: ["JPY", "KRW"].includes(currency) ? 0 : 2 }).format(Number(value) || 0);
  }

  function methodLabel(value) {
    return services.paymentMethods.find((method) => method.value === value)?.label || "其他";
  }

  function budgetMetrics() {
    const budget = services.budgetForTrip(tripId);
    const currency = budget?.currency || "TWD";
    const summary = services.expenseSummary(tripId, currency);
    const total = Number(budget?.total_budget) || 0;
    return {
      budget, currency, total, ...summary,
      remaining: total - summary.estimated,
      actualPercent: total ? summary.paid / total * 100 : null,
      estimatedPercent: total ? summary.estimated / total * 100 : null
    };
  }

  function reminder(percent) {
    if (percent === null || percent < 70) return null;
    if (percent > 100) return "目前預估支出已超過原先設定的旅行預算，可以調整預排項目，或重新設定預算。";
    if (percent >= 90) return "目前已接近旅行預算，如果還有購物或票券安排，可以先確認剩餘金額。";
    return `MUMU 提醒你，目前預估會使用約 ${Math.round(percent)}% 的旅行預算，可以先看看後面還有哪些預定支出。`;
  }

  function renderBudgetSummary(metrics, compact = false) {
    if (!metrics.budget) {
      return `<section class="budget-empty-card">${mumu}<div><strong>還沒有設定總預算</strong><p>記帳可以先開始，需要時再設定旅行預算。</p><a href="block.html?trip=${encodeURIComponent(tripId)}&type=budget">設定旅行預算 →</a></div></section>`;
    }
    const note = reminder(metrics.estimatedPercent);
    const categoryTotals = {};
    metrics.expenses.filter((item) => item.expense_status !== "cancelled").forEach((item) => { categoryTotals[item.category] = (categoryTotals[item.category] || 0) + (services.convert(item.amount, item.currency, metrics.currency)?.amount || 0); });
    const palette = ["#d88c6a", "#8fae8b", "#d6b46f", "#9ba9c7", "#c694ad", "#87b7b0", "#b39a88"];
    let cursor = 0;
    const segments = Object.entries(categoryTotals).map(([name, value], index) => { const percent = metrics.estimated ? value / metrics.estimated * 100 : 0; const start = cursor; cursor += percent; return { name, percent, start, end: cursor, color: palette[index % palette.length] }; });
    const pie = segments.length ? `<div class="budget-breakdown"><div class="budget-pie" role="img" aria-label="預估支出分類比例" style="background:conic-gradient(${segments.map((item) => `${item.color} ${item.start}% ${item.end}%`).join(",")})"></div><div class="budget-legend">${segments.map((item) => `<span><i style="background:${item.color}"></i>${item.name} ${Math.round(item.percent)}%</span>`).join("")}</div></div>` : "";
    return `<section class="budget-hero ${metrics.estimatedPercent > 100 ? "over" : metrics.estimatedPercent >= 90 ? "high" : metrics.estimatedPercent >= 70 ? "near" : "normal"}">
      ${note ? `<div class="mumu-reminder">${mumu}<p>${note}</p></div>` : ""}
      <div class="metric-grid finance-metrics">
        <article><small>總預算</small><strong>${money(metrics.total, metrics.currency)}</strong></article>
        <article><small>已花費</small><strong>${money(metrics.paid, metrics.currency)}</strong></article>
        <article><small>預排支出</small><strong>${money(metrics.planned, metrics.currency)}</strong></article>
        <article><small>預估總支出</small><strong>${money(metrics.estimated, metrics.currency)}</strong></article>
        <article><small>剩餘可安排</small><strong>${money(metrics.remaining, metrics.currency)}</strong></article>
        <article><small>實際／預估使用</small><strong>${Math.round(metrics.actualPercent)}%／${Math.round(metrics.estimatedPercent)}%</strong></article>
      </div>
      ${compact ? "" : `<div class="budget-progress"><span style="width:${Math.min(metrics.estimatedPercent, 100)}%"></span></div>${pie}`}
    </section>`;
  }

  function renderChecklist() {
    let items = services.checklist(tripId, type);
    if (!items.length) {
      items = (type === "packing" ? ["護照與證件", "充電器與充電線", "常用藥品"] : ["送家人的小點心", "留給自己的紀念", "旅伴想買的東西"]).map((name, index) => ({ id: `default-${index}`, name, done: false }));
    }
    workspace.innerHTML = `<div class="checklist-card"><div>${items.map((item) => `<label class="check-row ${item.done ? "done" : ""}"><input type="checkbox" data-id="${item.id}" ${item.done ? "checked" : ""}><span>${escape(item.name)}</span><button type="button" data-remove="${item.id}" aria-label="移除 ${escape(item.name)}">×</button></label>`).join("")}</div><form id="addChecklistItem" class="inline-form"><input name="name" required maxlength="40" placeholder="新增一項"><button class="secondary-btn" type="submit">新增</button></form></div>`;
    const save = () => services.saveChecklist(tripId, type, items);
    workspace.querySelectorAll("[data-id]").forEach((input) => input.onchange = () => { items.find((item) => item.id === input.dataset.id).done = input.checked; save(); renderChecklist(); });
    workspace.querySelectorAll("[data-remove]").forEach((button) => button.onclick = () => { items = items.filter((item) => item.id !== button.dataset.remove); save(); renderChecklist(); });
    $("addChecklistItem").onsubmit = (event) => { event.preventDefault(); const name = new FormData(event.currentTarget).get("name").trim(); if (name) { items.push({ id: `item-${Date.now()}`, name, done: false }); save(); renderChecklist(); } };
  }

  function sourceOptions(selected = "") {
    const sources = services.paymentSourcesForTrip(tripId);
    return `<option value="">不追蹤餘額</option>${sources.map((source) => `<option value="${source.payment_source_id}" ${source.payment_source_id === selected ? "selected" : ""}>${escape(source.name)}・${source.currency}</option>`).join("")}`;
  }

  function renderExpenses() {
    const expenses = services.expensesForTrip(tripId);
    const metrics = budgetMetrics();
    const sources = services.paymentSourcesForTrip(tripId);
    workspace.innerHTML = `${renderBudgetSummary(metrics, true)}
      <p class="service-note finance-disclaimer">換算金額僅供旅行預算估算，實際請以銀行、信用卡或支付工具帳單為準。</p>
      <section class="workspace-card"><h2>新增支出</h2>
        <form id="expenseForm" class="workspace-form">
          <label>品項名稱<input name="item_name" maxlength="50" required placeholder="例如：午餐拉麵"></label>
          <div class="form-row"><label>金額<input id="expenseAmount" name="amount" type="number" min="0" step="0.01" required placeholder="1200"></label><label>幣別<select id="expenseCurrency" name="currency">${currencies.map((currency) => `<option ${currency === "JPY" ? "selected" : ""}>${currency}</option>`).join("")}</select></label></div>
          <label>分類<select name="category">${categories.map((category) => `<option>${category}</option>`).join("")}</select></label>
          <div class="form-row"><label>日期<input name="expense_date" type="date" value="${today}" required></label><label>旅行日次<input name="trip_day" type="number" min="1" placeholder="例如：1"></label></div>
          <div class="form-row"><label>支付方式<select id="paymentMethod" name="payment_method">${destinationPaymentMethods.map((method) => `<option value="${method.value}">${method.label}</option>`).join("")}</select></label><label>支出狀態<select name="expense_status"><option value="paid">已支付</option><option value="planned">預計支出</option></select></label></div>
          <label id="paymentSourceField">支付來源<select id="paymentSource" name="payment_source_id">${sourceOptions()}</select><small>${sources.length ? "需要追蹤現金或儲值餘額時再選擇。" : "尚未建立來源，可在下方新增。"}</small></label>
          <label>支付備註（選填）<textarea id="expenseNote" name="short_note" maxlength="50" placeholder="例如：信用卡可能另收海外手續費"></textarea><small class="char-count"><span id="expenseNoteCount">0</span> / 50</small><small>備註不會自動計算手續費、回饋或銀行匯差。</small></label>
          <div class="conversion-preview" id="expensePreview">輸入金額後顯示主要幣別估算</div>
          <button class="primary-btn" type="submit">新增支出</button>
        </form>
      </section>
      ${renderWallets()}
      <section class="workspace-card"><div class="section-head"><h2>支出明細</h2></div><div id="expenseSearch"></div><div id="expenseList"></div></section>`;

    const amount = $("expenseAmount");
    const currency = $("expenseCurrency");
    const note = $("expenseNote");
    const sourceField = $("paymentSourceField");
    const sourceMethods = new Set(["cash", "wowpass", "tmoney", "namane", "suica_pasmo", "other_transit"]);
    const updateSourceVisibility = () => { sourceField.hidden = !sourceMethods.has($("paymentMethod").value); };
    const preview = () => {
      const converted = services.convert(amount.value, currency.value, metrics.currency);
      const rate = services.rateData();
      $("expensePreview").textContent = converted ? `${amount.value || 0} ${currency.value}・約 ${money(converted.amount, metrics.currency)}（匯率資料 ${rate.rate_date}，不含銀行手續費與回饋）` : "暫時沒有這組匯率，仍可保存原幣支出。";
    };
    amount.oninput = preview;
    currency.onchange = preview;
    $("paymentMethod").onchange = updateSourceVisibility;
    note.oninput = () => { $("expenseNoteCount").textContent = [...note.value].length; };
    updateSourceVisibility();
    preview();

    function listExpenses(term = "") {
      const filtered = expenses.filter((item) => `${item.item_name}${item.category}${item.expense_date}${methodLabel(item.payment_method)}${item.short_note}`.toLowerCase().includes(term.toLowerCase()));
      $("expenseList").innerHTML = filtered.length ? filtered.map((item) => {
        const source = sources.find((entry) => entry.payment_source_id === item.payment_source_id);
        const statusLabel = item.expense_status === "planned" ? "預計支出" : item.expense_status === "cancelled" ? "已取消" : "已支付";
        return `<article class="expense-row expense-${item.expense_status}"><div><strong>${escape(item.item_name)}</strong><p>${item.expense_date}${item.trip_day ? `・第 ${item.trip_day} 天` : ""}・${item.category}</p><p>${methodLabel(item.payment_method)}${source ? `・${escape(source.name)}` : ""}・<span class="expense-status">${statusLabel}</span></p>${item.short_note ? `<small>${escape(item.short_note)}</small>` : ""}</div><div><strong>${money(item.amount, item.currency)}</strong><small>約 ${money(item.converted_amount, item.base_currency)}</small>${item.expense_status === "planned" ? `<button class="mini-action" type="button" data-pay="${item.expense_id}">標記為已支付</button><button class="text-mini-action" type="button" data-cancel="${item.expense_id}">取消項目</button>` : ""}</div></article>`;
      }).join("") : `<div class="soft-empty compact-empty">${mumu}<h3>${term ? `沒有找到符合「${escape(term)}」的支出` : "還沒有支出"}</h3><p>${term ? "清除搜尋後再看看。" : "從第一筆旅途花費開始就好。"}</p></div>`;
      workspace.querySelectorAll("[data-pay]").forEach((button) => button.onclick = () => showPaymentUpdate(button.dataset.pay));
      workspace.querySelectorAll("[data-cancel]").forEach((button) => button.onclick = () => { services.updateExpense(button.dataset.cancel, { expense_status: "cancelled" }); renderExpenses(); });
    }
    window.SoftPlanetSearch.mount($("expenseSearch"), { placeholder: "搜尋支出品項、分類、日期或支付方式", onSearch: listExpenses });
    listExpenses();

    $("expenseForm").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const converted = services.convert(values.amount, values.currency, metrics.currency);
      services.addExpense({ ...values, trip_id: tripId, payment_source_id: sourceField.hidden ? "" : values.payment_source_id, base_currency: metrics.currency, exchange_rate: converted?.rate || 1, converted_amount: converted?.amount || Number(values.amount) });
      renderExpenses();
    };

    bindWalletForms();
  }

  function showPaymentUpdate(expenseId) {
    const expense = services.expensesForTrip(tripId).find((item) => item.expense_id === expenseId);
    if (!expense) return;
    const host = document.createElement("section");
    host.className = "workspace-card inline-update-card";
    host.innerHTML = `<h2>完成這筆預排支出</h2><p>保留原項目，只更新實際金額與支付方式，不會新增第二筆。</p><form class="workspace-form"><div class="form-row"><label>實際金額<input name="amount" type="number" min="0" step="0.01" value="${expense.amount}" required></label><label>幣別<select name="currency">${currencies.map((currency) => `<option ${currency === expense.currency ? "selected" : ""}>${currency}</option>`).join("")}</select></label></div><label>實際支付方式<select name="payment_method">${services.paymentMethods.map((method) => `<option value="${method.value}" ${method.value === expense.payment_method ? "selected" : ""}>${method.label}</option>`).join("")}</select></label><label>支付來源<select name="payment_source_id">${sourceOptions(expense.payment_source_id)}</select></label><div class="dialog-actions"><button class="secondary-btn" type="button" data-close>先不要</button><button class="primary-btn" type="submit">更新為已支付</button></div></form>`;
    workspace.prepend(host);
    host.querySelector("[data-close]").onclick = () => host.remove();
    host.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const converted = services.convert(values.amount, values.currency, expense.base_currency);
      services.updateExpense(expenseId, { ...values, expense_status: "paid", amount: Number(values.amount), exchange_rate: converted?.rate || 1, converted_amount: converted?.amount || Number(values.amount) });
      renderExpenses();
    };
    host.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderWallets() {
    const sources = services.paymentSourcesForTrip(tripId);
    return `<section class="workspace-card wallet-section"><div class="section-head"><div><h2>現金與儲值來源</h2><p>需要追蹤餘額時再建立。</p></div></div>
      <div class="wallet-list">${sources.length ? sources.map((source) => {
        const snapshot = services.walletSnapshot(source.payment_source_id);
        return `<article class="wallet-card"><div><small>${services.walletTypes.find((type) => type.value === source.wallet_type)?.label || "支付來源"}</small><h3>${escape(source.name)}</h3></div><div class="wallet-balance"><small>帳面餘額</small><strong>${money(snapshot.current, source.currency)}</strong><p>預排將支出 ${money(snapshot.planned, source.currency)}・支付後預估 ${money(snapshot.estimated, source.currency)}</p></div><div class="wallet-actions"><button type="button" data-topup="${source.payment_source_id}">儲值</button><button type="button" data-adjust="${source.payment_source_id}">校正餘額</button></div></article>`;
      }).join("") : `<p class="field-note">尚未建立支付來源。現金、WOWPASS 消費餘額與交通餘額都應分開建立。</p>`}</div>
      <details class="wallet-create"><summary>＋ 新增支付來源</summary><form id="paymentSourceForm" class="workspace-form"><label>來源名稱<input name="name" maxlength="40" required placeholder="例如：日圓現金、WOWPASS T-money"></label><div class="form-row"><label>來源類型<select name="wallet_type">${services.walletTypes.map((item) => `<option value="${item.value}">${item.label}</option>`).join("")}</select></label><label>幣別<select name="currency">${currencies.map((currency) => `<option>${currency}</option>`).join("")}</select></label></div><label>初始餘額<input name="initial_balance" type="number" min="0" step="0.01" value="0" required></label><button class="primary-btn" type="submit">建立支付來源</button></form></details>
      <div id="walletActionHost"></div>
      <p class="service-note">帳面餘額依你輸入的儲值與支出計算。若有漏記，請以卡片 App、機台或實際現金為準。</p>
      <p class="service-note">儲值不是支出，使用卡片付款時才會列入旅行花費，避免重複計算。</p>
    </section>`;
  }

  function bindWalletForms() {
    const form = $("paymentSourceForm");
    if (form) form.onsubmit = (event) => { event.preventDefault(); services.createPaymentSource({ ...Object.fromEntries(new FormData(event.currentTarget)), trip_id: tripId }); renderExpenses(); };
    workspace.querySelectorAll("[data-topup]").forEach((button) => button.onclick = () => showWalletAction(button.dataset.topup, "top_up"));
    workspace.querySelectorAll("[data-adjust]").forEach((button) => button.onclick = () => showWalletAction(button.dataset.adjust, "adjustment"));
  }

  function showWalletAction(sourceId, transactionType) {
    const snapshot = services.walletSnapshot(sourceId);
    const host = $("walletActionHost");
    host.innerHTML = `<form id="walletActionForm" class="workspace-form wallet-action-form"><h3>${transactionType === "top_up" ? `替「${escape(snapshot.source.name)}」儲值` : `校正「${escape(snapshot.source.name)}」帳面餘額`}</h3><label>${transactionType === "top_up" ? "儲值金額" : "校正後餘額"}<input name="amount" type="number" min="0" step="0.01" required></label><label>日期<input name="transaction_date" type="date" value="${today}" required></label><label>備註（選填）<input name="note" maxlength="50" placeholder="例如：使用哪張信用卡儲值"></label><div class="dialog-actions"><button class="secondary-btn" type="button" data-close-wallet>取消</button><button class="primary-btn" type="submit">${transactionType === "top_up" ? "記錄儲值" : "儲存校正"}</button></div><p class="field-note">${transactionType === "top_up" ? "這筆儲值不會計入旅行總支出。" : `校正前帳面餘額：${money(snapshot.current, snapshot.source.currency)}。校正不會刪除歷史支出。`}</p></form>`;
    host.querySelector("[data-close-wallet]").onclick = () => { host.innerHTML = ""; };
    $("walletActionForm").onsubmit = (event) => { event.preventDefault(); services.addWalletTransaction(sourceId, { ...Object.fromEntries(new FormData(event.currentTarget)), transaction_type: transactionType }); renderExpenses(); };
    host.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderBudget() {
    const metrics = budgetMetrics();
    const budget = metrics.budget;
    const categoryBudgets = budget?.category_budgets || {};
    workspace.innerHTML = `${renderBudgetSummary(metrics)}<section class="workspace-card"><h2>${budget ? "調整旅行預算" : "設定旅行預算"}</h2><form id="budgetForm" class="workspace-form"><label>旅行總預算<input name="total_budget" type="number" min="0" step="1" required value="${metrics.total || ""}" placeholder="例如：50000"></label><label>預算主要幣別<select name="currency">${currencies.map((item) => `<option ${item === metrics.currency ? "selected" : ""}>${item}</option>`).join("")}</select></label><details class="category-budget-fields"><summary>設定分類預算（選填）</summary><div class="form-row">${categories.map((category) => `<label>${category}<input name="category_${category}" type="number" min="0" step="1" value="${categoryBudgets[category] || ""}" placeholder="不設定"></label>`).join("")}</div></details><button class="primary-btn" type="submit">保存預算</button><p class="service-note">預算提醒同時考慮已支付與預排支出，只提供旅行安排參考，不是金融建議。</p></form></section>`;
    $("budgetForm").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const categoryValues = {};
      categories.forEach((category) => { if (values[`category_${category}`]) categoryValues[category] = Number(values[`category_${category}`]); });
      services.saveBudget(tripId, { total_budget: values.total_budget, currency: values.currency, category_budgets: categoryValues });
      renderBudget();
    };
  }

  function renderCurrency() {
    const rate = services.rateData();
    workspace.innerHTML = `<section class="workspace-card"><h2>簡單換算</h2><p class="service-note">換算金額僅供旅行預算估算，實際請以銀行、信用卡或支付工具帳單為準。最後更新：${rate.rate_date}</p><form class="workspace-form" id="currencyForm"><label>金額<input name="amount" type="number" min="0" step="0.01" value="1200"></label><div class="form-row"><label>來源幣別<select name="from">${currencies.map((item) => `<option ${item === "JPY" ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>目標幣別<select name="to">${currencies.map((item) => `<option ${item === "TWD" ? "selected" : ""}>${item}</option>`).join("")}</select></label></div><div class="currency-result" id="currencyResult"></div></form></section>`;
    const form = $("currencyForm");
    const update = () => { const values = Object.fromEntries(new FormData(form)); const result = services.convert(values.amount, values.from, values.to); $("currencyResult").innerHTML = result ? `<small>${values.amount} ${values.from}</small><strong>約 ${money(result.amount, values.to)}</strong><p>資料日期 ${result.rate_date}</p>` : "<p>暫時沒有這組匯率資料。</p>"; };
    form.oninput = update;
    form.onchange = update;
    update();
  }

  if (type === "packing" || type === "shopping") renderChecklist();
  if (type === "expenses") renderExpenses();
  if (type === "budget") renderBudget();
  if (type === "currency") renderCurrency();
});
