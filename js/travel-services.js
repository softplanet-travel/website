(function () {
  const KEYS = {
    blocks: "softplanet-trip-blocks",
    expenses: "softplanet-trip-expenses",
    budgets: "softplanet-trip-budgets",
    checklists: "softplanet-trip-checklists",
    rates: "softplanet-exchange-rates",
    weather: "softplanet-weather-cache",
    paymentSources: "softplanet-payment-sources",
    walletTransactions: "softplanet-wallet-transactions",
    tripContext: "softplanet-trip-context"
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
    { id: "packing", name: "行李清單", icon: "🧳", note: "收好這趟真的需要的東西", tripTool: false },
    { id: "shopping", name: "必買清單", icon: "🎁", note: "記下想帶回家的小東西", tripTool: false },
    { id: "expenses", name: "旅行花費", icon: "🧾", note: "記帳、支付來源、預算與花費分析" },
    { id: "budget", name: "旅行預算", icon: "🌿", note: "一起看看還能怎麼安排" },
    { id: "currency", name: "換匯計算", icon: "💱", note: "快速估算兩種幣別金額" }
  ];

  const toolCatalog = [
    { id: "weather", type: "weather", name: "當地天氣", icon: "🌤️", note: "這幾天的天氣提醒", defaultTool: true },
    { id: "expenses", type: "expenses", name: "旅行花費", icon: "🧾", note: "記帳、支付來源、預算與花費分析", defaultTool: true },
    { id: "worldtime", type: "worldtime", name: "世界時間", icon: "🕰️", note: "你和目的地的時差", defaultTool: false },
    { id: "unit", type: "unit", name: "單位換算", icon: "📐", note: "公斤／磅、公里／英里等常用換算", defaultTool: false },
    { id: "currency", type: "currency", name: "換匯計算", icon: "💱", note: "快速估算兩種幣別金額", defaultTool: false }
  ];

  const unitCategories = [
    { id: "weight", name: "公斤／磅", units: [["kg", "公斤"], ["lb", "磅"]] },
    { id: "distance", name: "公里／英里", units: [["km", "公里"], ["mi", "英里"]] },
    { id: "length", name: "公分／英吋", units: [["cm", "公分"], ["in", "英吋"]] },
    { id: "temperature", name: "攝氏／華氏", units: [["c", "攝氏"], ["f", "華氏"]] }
  ];
  function convertUnit(categoryId, value, fromUnit, toUnit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (fromUnit === toUnit) return n;
    if (categoryId === "weight") return fromUnit === "kg" ? n * 2.2046226218 : n / 2.2046226218;
    if (categoryId === "distance") return fromUnit === "km" ? n * 0.6213711922 : n / 0.6213711922;
    if (categoryId === "length") return fromUnit === "cm" ? n * 0.3937007874 : n / 0.3937007874;
    if (categoryId === "temperature") return fromUnit === "c" ? n * 9 / 5 + 32 : (n - 32) * 5 / 9;
    return null;
  }

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

  // Standard ISO currency codes, not trip data - same kind of fixed reference fact as timeZones
  // above. The actual exchange rate still only ever comes from a trusted primeRates() cache.
  const CURRENCY_BY_COUNTRY = { 日本: "JPY", 韓國: "KRW", 香港: "HKD", 澳門: "MOP", 新加坡: "SGD", 泰國: "THB", 越南: "VND", 馬來西亞: "MYR" };
  function currencyForCountry(country) {
    return CURRENCY_BY_COUNTRY[country] || null;
  }
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

  // Rates only ever come from a trusted cache written by primeRates(); this module
  // never fabricates exchange numbers. No trusted cache yet means rateData() is null.
  function rateData() {
    const cached = parse(KEYS.rates, null);
    return cached && cached.trusted && cached.rates ? cached : null;
  }
  function primeRates(payload) {
    const data = { base_currency: payload.base_currency, rates: payload.rates, rate_date: payload.rate_date, updated_at: now(), source: payload.source, trusted: true };
    write(KEYS.rates, data);
    return data;
  }
  function convert(amount, from, to) {
    if (from === to) return { amount: Number(amount) || 0, rate: 1, rate_date: null, source: "same-currency" };
    const data = rateData();
    if (!data) return null;
    const fromRate = data.rates[from];
    const toRate = data.rates[to];
    if (!fromRate || !toRate) return null;
    return { amount: Number(amount) * fromRate / toRate, rate: fromRate / toRate, rate_date: data.rate_date, source: data.source };
  }

  // Weather works the same way: only a trusted cache (via primeWeather()) is shown.
  // No trusted cache means weather(city) is null and the UI must say so plainly.
  function weather(city) {
    const cache = parse(KEYS.weather, {});
    const cached = cache[city];
    return cached && cached.trusted ? cached : null;
  }
  function primeWeather(city, payload) {
    const cache = parse(KEYS.weather, {});
    const value = { city, date: payload.date, status: payload.status, high: payload.high, low: payload.low, rain: payload.rain, updated_at: now(), source: payload.source, trusted: true };
    cache[city] = value;
    write(KEYS.weather, cache);
    return value;
  }

  // Season Advisory lookup table. Sprint A ships the reading interface only — no real
  // destination/month advisory content exists anywhere in this project yet, so this stays
  // empty until a real dataset is imported. Never invent advisory content here.
  const seasonAdvisoryData = {};
  // destination_id is derived from country+city rather than stored as a separate value: the
  // project has no dedicated destination master table, but window.SoftPlanetCatalog (already
  // used by inspiration.html to browse real countries/cities) is the one real list of
  // recognized destinations. A pair not in that catalog (e.g. a pre-existing free-text legacy
  // trip) yields null rather than a fabricated id - callers must degrade honestly.
  function destinationIdFor(country, city) {
    const catalog = window.SoftPlanetCatalog;
    if (catalog && !(catalog.cities[country] || []).includes(city)) return null;
    const raw = `${country || ""}-${city || ""}`.trim();
    return raw && raw !== "-" ? raw : null;
  }
  function seasonAdvisory(destinationId, month) {
    if (!destinationId) return null;
    return seasonAdvisoryData[destinationId]?.[month] || null;
  }

  function tripContext(tripId) {
    return parse(KEYS.tripContext, {})[tripId] || null;
  }
  function saveTripContext(tripId, context) {
    const all = parse(KEYS.tripContext, {});
    all[tripId] = { destination_id: context.destination_id || null, travel_month: context.travel_month ?? null, season_type: context.season_type || null, advisory_id: context.advisory_id || null, saved_at: now() };
    write(KEYS.tripContext, all);
    return all[tripId];
  }

  window.SoftPlanetServices = {
    blockCatalog, toolCatalog, unitCategories, convertUnit,
    paymentMethods, walletTypes, walletMethodsForDestination,
    blocksForTrip, setBlock, deleteBlock,
    expensesForTrip, addExpense, updateExpense, expenseSummary,
    budgetForTrip, saveBudget,
    paymentSourcesForTrip, createPaymentSource, walletTransactions, walletSnapshot, addWalletTransaction,
    checklist, saveChecklist, areas, worldTime, rateData, primeRates, convert, weather, primeWeather,
    destinationIdFor, seasonAdvisory, tripContext, saveTripContext, currencyForCountry
  };
}());
