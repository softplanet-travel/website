(function () {
  const KEYS = {
    blocks: "softplanet-trip-blocks",
    expenses: "softplanet-trip-expenses",
    budgets: "softplanet-trip-budgets",
    checklists: "softplanet-trip-checklists",
    rates: "softplanet-exchange-rates",
    weather: "softplanet-weather-cache",
    paymentSources: "softplanet-payment-sources",
    walletTransactions: "softplanet-wallet-transactions"
  };

  const parse = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "");
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const now = () => new Date().toISOString();
  const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const blockCatalog = [
    { id: "packing", name: "行李清單", icon: "🧳", note: "收好這趟真的需要的東西" },
    { id: "shopping", name: "必買清單", icon: "🎁", note: "記下想帶回家的小東西" },
    { id: "expenses", name: "旅行記帳", icon: "🧾", note: "記錄已支付與預排支出" },
    { id: "budget", name: "預算控管", icon: "🌿", note: "一起看看還能怎麼安排" },
    { id: "currency", name: "匯率換算", icon: "💱", note: "快速估算兩種幣別金額" }
  ];

  const paymentMethods = [
    ["cash", "現金"],
    ["credit_card", "信用卡"],
    ["debit_card", "簽帳金融卡"],
    ["wowpass", "WOWPASS"],
    ["tmoney", "T-money"],
    ["namane", "NAMANE"],
    ["suica_pasmo", "Suica／PASMO"],
    ["other_transit", "其他交通卡"],
    ["mobile_payment", "行動支付"],
    ["other", "其他"]
  ].map(([value, label]) => ({ value, label }));

  const walletTypes = [
    ["cash", "現金錢包"],
    ["prepaid_payment", "儲值卡消費餘額"],
    ["transit_balance", "交通卡餘額"]
  ].map(([value, label]) => ({ value, label }));

  const destinationWallets = {
    日本: [["cash","現金（日圓）"],["credit_card","信用卡"],["suica_pasmo","Suica／PASMO／ICOCA"]],
    韓國: [["cash","現金（韓元）"],["credit_card","信用卡"],["wowpass","WOWPASS"],["tmoney","T-money"],["namane","NAMANE"]],
    香港: [["cash","現金（港幣）"],["credit_card","信用卡"],["other_transit","八達通"]],
    新加坡: [["cash","現金（新幣）"],["credit_card","信用卡"],["other_transit","EZ-Link／SimplyGo"]]
  };
  function walletMethodsForDestination(country){return (destinationWallets[country]||[["cash","現金"],["credit_card","信用卡"]]).map(([value,label])=>({value,label}));}

  function blocksForTrip(tripId) {
    return parse(KEYS.blocks, {})[tripId] || [];
  }

  function setBlock(tripId, type, status) {
    const all = parse(KEYS.blocks, {});
    const items = all[tripId] || [];
    const existing = items.find((item) => item.type === type);
    if (existing) {
      existing.status = status;
      existing.updated_at = now();
    } else {
      items.push({ trip_id: tripId, type, status, created_at: now(), updated_at: now() });
    }
    all[tripId] = items;
    write(KEYS.blocks, all);
    return items;
  }

  function deleteBlock(tripId, type) {
    const all = parse(KEYS.blocks, {});
    all[tripId] = (all[tripId] || []).filter((item) => item.type !== type);
    write(KEYS.blocks, all);
    const checks = parse(KEYS.checklists, {});
    delete checks[`${tripId}:${type}`];
    write(KEYS.checklists, checks);
    if (type === "expenses") {
      write(KEYS.expenses, parse(KEYS.expenses, []).filter((item) => item.trip_id !== tripId));
      const removedSources = parse(KEYS.paymentSources, []).filter((source) => source.trip_id === tripId).map((source) => source.payment_source_id);
      write(KEYS.paymentSources, parse(KEYS.paymentSources, []).filter((source) => source.trip_id !== tripId));
      write(KEYS.walletTransactions, parse(KEYS.walletTransactions, []).filter((entry) => !removedSources.includes(entry.payment_source_id)));
    }
    if (type === "budget") {
      const budgets = parse(KEYS.budgets, {});
      delete budgets[tripId];
      write(KEYS.budgets, budgets);
    }
  }

  function normalizeExpense(item) {
    return {
      ...item,
      payment_method: item.payment_method || "cash",
      payment_source_id: item.payment_source_id || null,
      expense_status: item.expense_status || "paid",
      short_note: item.short_note || ""
    };
  }

  function expensesForTrip(tripId) {
    return parse(KEYS.expenses, [])
      .filter((item) => item.trip_id === tripId)
      .map(normalizeExpense)
      .sort((a, b) => `${b.expense_date}${b.created_at || ""}`.localeCompare(`${a.expense_date}${a.created_at || ""}`));
  }

  function addExpense(values) {
    const all = parse(KEYS.expenses, []);
    const timestamp = now();
    const item = normalizeExpense({
      expense_id: id("expense"),
      trip_id: values.trip_id,
      expense_date: values.expense_date,
      trip_day: Number(values.trip_day) || null,
      item_name: String(values.item_name || "").trim(),
      category: values.category,
      amount: Number(values.amount),
      currency: values.currency,
      base_currency: values.base_currency,
      exchange_rate: Number(values.exchange_rate),
      converted_amount: Number(values.converted_amount),
      payment_method: values.payment_method,
      payment_source_id: values.payment_source_id || null,
      expense_status: values.expense_status || "paid",
      short_note: String(values.short_note || "").trim().slice(0, 50),
      created_at: timestamp,
      updated_at: timestamp
    });
    all.push(item);
    write(KEYS.expenses, all);
    return item;
  }

  function updateExpense(expenseId, updates) {
    const all = parse(KEYS.expenses, []);
    const item = all.find((entry) => entry.expense_id === expenseId);
    if (!item) return null;
    const allowed = ["amount", "currency", "base_currency", "exchange_rate", "converted_amount", "payment_method", "payment_source_id", "expense_status", "short_note", "expense_date", "trip_day"];
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) item[key] = updates[key];
    });
    item.updated_at = now();
    write(KEYS.expenses, all);
    return normalizeExpense(item);
  }

  function expenseSummary(tripId, currency = "TWD") {
    const expenses = expensesForTrip(tripId);
    const converted = (item) => convert(item.amount, item.currency, currency)?.amount || 0;
    const paid = expenses.filter((item) => item.expense_status === "paid").reduce((sum, item) => sum + converted(item), 0);
    const planned = expenses.filter((item) => item.expense_status === "planned").reduce((sum, item) => sum + converted(item), 0);
    return { paid, planned, estimated: paid + planned, expenses };
  }

  function budgetForTrip(tripId) {
    return parse(KEYS.budgets, {})[tripId] || null;
  }

  function saveBudget(tripId, values) {
    const all = parse(KEYS.budgets, {});
    all[tripId] = {
      budget_id: all[tripId]?.budget_id || id("budget"),
      trip_id: tripId,
      total_budget: Number(values.total_budget),
      currency: values.currency,
      category_budgets: values.category_budgets || {},
      created_at: all[tripId]?.created_at || now(),
      updated_at: now()
    };
    write(KEYS.budgets, all);
    return all[tripId];
  }

  function paymentSourcesForTrip(tripId) {
    return parse(KEYS.paymentSources, []).filter((source) => source.trip_id === tripId && source.is_active !== false);
  }

  function createPaymentSource(values) {
    const all = parse(KEYS.paymentSources, []);
    const timestamp = now();
    const source = {
      payment_source_id: id("wallet"),
      trip_id: values.trip_id,
      name: String(values.name || "").trim(),
      wallet_type: values.wallet_type,
      currency: values.currency,
      initial_balance: Number(values.initial_balance) || 0,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    };
    all.push(source);
    write(KEYS.paymentSources, all);
    return source;
  }

  function walletTransactions(paymentSourceId) {
    return parse(KEYS.walletTransactions, [])
      .filter((entry) => entry.payment_source_id === paymentSourceId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  function walletSnapshot(paymentSourceId) {
    const source = parse(KEYS.paymentSources, []).find((entry) => entry.payment_source_id === paymentSourceId);
    if (!source) return null;
    const events = walletTransactions(paymentSourceId).map((entry) => ({ ...entry, event: "transaction" }));
    expensesForTrip(source.trip_id)
      .filter((expense) => expense.payment_source_id === paymentSourceId && expense.currency === source.currency && expense.expense_status === "paid")
      .forEach((expense) => events.push({ ...expense, event: "expense" }));
    events.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    let balance = Number(source.initial_balance) || 0;
    let paid = 0;
    events.forEach((entry) => {
      if (entry.event === "expense") {
        balance -= Number(entry.amount) || 0;
        paid += Number(entry.amount) || 0;
      } else if (entry.transaction_type === "top_up") {
        balance += Number(entry.amount) || 0;
      } else if (entry.transaction_type === "adjustment") {
        balance = Number(entry.balance_after);
      }
    });
    const planned = expensesForTrip(source.trip_id)
      .filter((expense) => expense.payment_source_id === paymentSourceId && expense.currency === source.currency && expense.expense_status === "planned")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return { source, initial: Number(source.initial_balance) || 0, paid, planned, current: balance, estimated: balance - planned };
  }

  function addWalletTransaction(paymentSourceId, values) {
    const snapshot = walletSnapshot(paymentSourceId);
    if (!snapshot) return null;
    const all = parse(KEYS.walletTransactions, []);
    const timestamp = now();
    const item = {
      transaction_id: id("wallet-tx"),
      payment_source_id: paymentSourceId,
      transaction_type: values.transaction_type,
      amount: Number(values.amount) || 0,
      currency: snapshot.source.currency,
      transaction_date: values.transaction_date || timestamp.slice(0, 10),
      note: String(values.note || "").trim().slice(0, 50),
      balance_before: snapshot.current,
      balance_after: values.transaction_type === "adjustment" ? Number(values.amount) : snapshot.current + Number(values.amount || 0),
      created_at: timestamp
    };
    all.push(item);
    write(KEYS.walletTransactions, all);
    return item;
  }

  function checklist(tripId, type) {
    return parse(KEYS.checklists, {})[`${tripId}:${type}`] || [];
  }

  function saveChecklist(tripId, type, items) {
    const all = parse(KEYS.checklists, {});
    all[`${tripId}:${type}`] = items;
    write(KEYS.checklists, all);
  }

  const AreaMaster = {
    "日本|東京": [["tokyo-ueno", "上野"], ["tokyo-asakusa", "淺草"], ["tokyo-shinjuku", "新宿"], ["tokyo-shibuya", "澀谷"], ["tokyo-ginza", "銀座"], ["tokyo-ikebukuro", "池袋"], ["tokyo-odaiba", "台場"], ["tokyo-roppongi", "六本木"], ["tokyo-other", "其他／尚未分類"]],
    "韓國|首爾": [["seoul-myeongdong", "明洞"], ["seoul-dongdaemun", "東大門"], ["seoul-hongdae", "弘大／延南"], ["seoul-gangnam", "江南"], ["seoul-seongsu", "聖水"], ["seoul-other", "其他／尚未分類"]]
  };
  function areas(country, city) {
    return (AreaMaster[`${country}|${city}`] || [[`${country}-${city}-other`, "其他／尚未分類"]]).map(([areaId, name]) => ({ id: areaId, name }));
  }

  const timeZones = { 東京: "Asia/Tokyo", 沖繩: "Asia/Tokyo", 北海道: "Asia/Tokyo", 首爾: "Asia/Seoul", 釜山: "Asia/Seoul", 濟州: "Asia/Seoul", 曼谷: "Asia/Bangkok", 新加坡: "Asia/Singapore", 香港島: "Asia/Hong_Kong" };
  function worldTime(city) {
    const zone = timeZones[city];
    if (!zone) return null;
    const date = new Date();
    const destination = new Intl.DateTimeFormat("zh-TW", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    const local = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    const zoneParts = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(date);
    const localParts = new Intl.DateTimeFormat("en", { timeZoneName: "longOffset" }).formatToParts(date);
    const offset = (value) => {
      const match = value?.match(/GMT([+-])(\d{2}):(\d{2})/);
      return match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
    };
    const difference = (offset(zoneParts.find((part) => part.type === "timeZoneName")?.value) - offset(localParts.find((part) => part.type === "timeZoneName")?.value)) / 60;
    return { city, zone, destination, local, difference: difference === 0 ? "沒有時差" : `${difference > 0 ? "快" : "慢"} ${Math.abs(difference)} 小時` };
  }

  const mockRates = { TWD: 1, JPY: 0.21, KRW: 0.024, USD: 32.5, EUR: 35.2, HKD: 4.16, THB: 0.91, SGD: 24.2 };
  function rateData() {
    const today = new Date().toISOString().slice(0, 10);
    const cached = parse(KEYS.rates, null);
    if (cached?.rate_date === today) return cached;
    const data = { base_currency: "TWD", rates: mockRates, rate_date: today, updated_at: now(), source: "SoftPlanet MVP daily cache (mock)" };
    write(KEYS.rates, data);
    return data;
  }
  function convert(amount, from, to) {
    const data = rateData();
    const fromRate = data.rates[from];
    const toRate = data.rates[to];
    if (!fromRate || !toRate) return null;
    return { amount: Number(amount) * fromRate / toRate, rate: fromRate / toRate, rate_date: data.rate_date, source: data.source };
  }

  const weatherMock = { 東京: { status: "晴時多雲", high: 30, low: 24, rain: "午後短暫雨機率低" }, 首爾: { status: "多雲", high: 29, low: 23, rain: "外出可帶輕便雨具" }, 曼谷: { status: "局部陣雨", high: 33, low: 27, rain: "午後留意短暫陣雨" }, 新加坡: { status: "多雲短暫雨", high: 31, low: 26, rain: "建議隨身帶傘" } };
  function weather(city) {
    const mock = weatherMock[city];
    if (!mock) return null;
    const cache = parse(KEYS.weather, {});
    const cached = cache[city];
    if (cached && Date.now() - new Date(cached.updated_at).getTime() < 3600000) return cached;
    const value = { city, date: new Date().toISOString().slice(0, 10), ...mock, updated_at: now(), source: "SoftPlanet MVP hourly cache (mock)" };
    cache[city] = value;
    write(KEYS.weather, cache);
    return value;
  }

  window.SoftPlanetServices = {
    blockCatalog, paymentMethods, walletTypes, walletMethodsForDestination,
    blocksForTrip, setBlock, deleteBlock,
    expensesForTrip, addExpense, updateExpense, expenseSummary,
    budgetForTrip, saveBudget,
    paymentSourcesForTrip, createPaymentSource, walletTransactions, walletSnapshot, addWalletTransaction,
    checklist, saveChecklist, areas, worldTime, rateData, convert, weather
  };
}());
