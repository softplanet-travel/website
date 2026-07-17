# SoftPlanet 柔軟星球

SoftPlanet 是由 MUMU 陪伴使用者蒐集旅行靈感、建立旅行並整理旅途中實用資訊的 Mobile First MVP。專案沿用原有 Vanilla HTML、CSS、JavaScript 與 Supabase 架構，不使用前端框架。

正式設計基準請見 [`docs/softplanet-v1-design-system.md`](docs/softplanet-v1-design-system.md)。所有新頁面、元件與文字內容都必須先符合該文件的 Typography、Spacing、Card、Empty State、中文排版與 Mobile First 規則。

## MVP 主要體驗

- 首頁雙入口：旅行靈感、我的旅行
- 旅行靈感：國家、城市、景點、住宿區、飯店、美食與票券內容
- 我的旅行：建立旅行、加入地點、搜尋旅行與旅行內地點
- 旅行積木：行李清單、必買清單、旅行記帳、預算控管、匯率換算
- 自訂行程卡：依旅行、國家、城市與 Area Master 建立，支援日本 Google Maps、韓國 Naver Maps 優先與 Google Maps 備援
- 自訂卡片升級：比對正式內容後由使用者確認，保留旅行、備註與排序資料
- 分區搜尋：旅行靈感、收藏、我的旅行、我的攻略、我的工具與旅行內地點
- 世界時間與天氣摘要：顯示於旅行與城市情境，不放在工具頁
- 收藏、我的攻略、我的工具與帳號入口
- Loading、Empty、Error、Coming Soon 共用狀態語言

## 專案結構

- `index.html`：首頁
- `inspiration.html`：旅行靈感與自訂行程卡入口
- `place.html`：地點詳情、地圖導航與自訂卡片升級
- `trips.html`、`trip.html`：旅行清單與旅行工作區
- `block.html`：旅行積木工作頁
- `favorites.html`：景點、餐廳、住宿收藏
- `guides.html`：我的攻略
- `tools.html`：我的工具
- `packing.html`：行李攻略的類別、清單、商品三層流程
- `js/travel-services.js`：積木、支出、預算、清單、匯率、天氣與 Area Master 服務
- `js/custom-item-service.js`：自訂行程卡資料與升級流程
- `js/map-link-resolver.js`：安全地圖連結與國家別導航規則
- `js/search-component.js`：共用搜尋互動
- `supabase-schema.sql`：MVP 資料表建議結構

## 本機執行

請用本機 HTTP Server 開啟專案根目錄，不要直接以 `file://` 開啟 `index.html`。若要驗證登入與雲端同步，還需在 Supabase 設定 Google Provider、Redirect URL 與對應資料表。

## MVP 資料與服務界線

目前旅行積木、自訂卡片、匯率與天氣採可替換的前端服務介面。訪客模式分別寫入獨立的 localStorage key；既有旅行與地點資料不會因積木隱藏而刪除。

- 匯率：每日更新一次的本機快取；沒有外部 API 金鑰時使用明確標示的示範匯率
- 天氣：每小時更新一次的本機快取；沒有外部 API 金鑰時使用示範摘要
- 世界時間：使用瀏覽器 `Intl.DateTimeFormat` 與 Area Master 時區
- 地圖：只接受安全的 `https` 分享連結，不自行拼接不存在的地點 URL
- Supabase：`supabase-schema.sql` 已包含新增資料表建議，但部署前仍需在目標專案套用 schema、RLS 與正式同步流程

這些界線讓 MVP 可以完整驗證產品流程，同時保留未來替換正式匯率、天氣與雲端資料來源的空間。

## 會員稱呼與旅行財務工具

- 稱呼：`js/profile-service.js` 統一處理 preferred name、Google display name、Email 前綴與「旅人」的顯示優先順序。
- 記帳：每筆支出區分已支付、預排與取消，並保存幣別、換算、支付方式、支付來源與 50 字內備註。
- 預算：`trip_budgets` 提供總預算、主要幣別與分類預算；摘要同時呈現實際與含預排的估算。
- 支付來源：現金、消費儲值與交通餘額分開建立；帳面餘額只依使用者記錄計算。
- 儲值：只增加支付來源餘額，不列入旅行支出；實際付款時才計入，避免重複計算。
- MUMU：指定狀態共用 `.mumu-asset` 與單一 `--mumu-asset-url`，方便日後替換正式獨立素材。

完整驗收證據與已知限制請見 `docs/member-finance-acceptance/README.md`。
