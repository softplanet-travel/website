# SoftPlanet V1 Product Experience Refinement Acceptance

驗收日期：2026-07-13

## Product Acceptance Gate

| Gate | 結果 | 實際證據 |
|---|---|---|
| Functional | PASS（本機 MVP） | 旅行日期、精確分鐘行程、航班、旅行積木、預算與 My Space 均以瀏覽器完成操作；不是靜態畫面。 |
| Data | PASS with limitation | 使用者輸入會保留；天氣已在旅行頁標示「示範資料」，匯率 Service 的 source 為 mock。正式航班、地圖與價格不會自行偽造。 |
| Responsive | PASS | 320、375、390、430、768、1024、1280px 的 `scrollWidth <= clientWidth`；Header、Main 與 Bottom Navigation 無水平溢出。 |
| Security | PASS with environment verification | 外部地圖只使用 HTTPS 並帶 `noopener noreferrer`；沒有分享 Token。Supabase RLS Migration 已建立，仍須在正式 Supabase 專案套用後驗證。 |
| Evidence | PASS | 本文件、Migration、8 張主要畫面截圖與分階段 Commit 均已保存。 |

## 實際驗收流程

- 旅行靈感 → 景點詳情 → 加入旅行 → 我的旅行：通過，沿用既有正式流程。
- 旅行日期：建立旅行時可輸入開始／結束日，結束日早於開始日會被拒絕。
- 行程時間：30 分鐘快捷可用；實測保存 `10:17–11:43`，重新載入仍顯示精確分鐘。
- 時間重疊：以固定規則比對，不使用 AI；顯示 Product Bible 指定的 MUMU 提醒文案。
- 航班：實測新增長榮航空 BR 192，`07:17` 出發、`11:43` 抵達；抵達時間早於出發時間會被拒絕。
- 機場動線：顯示航班抵達 → 入境與行李 → 機場交通 → 住宿報到；buffer 取自 Transportation Hub Master。
- Reminder：新增航班後重新載入，航班前與抵達提醒均出現；來源明示為固定規則。
- Travel Wallet：支付方式依目的地切換；日本只呈現日圓現金、信用卡、Suica／PASMO／ICOCA 等相關方式。
- 預算：總預算、已支付、預排、預估與剩餘可安排均保留；有支出時生成分類圓餅圖。
- My Space：正式登入標題、說明與「立即登入同步」通過；功能入口先於帳號設定呈現。

## Responsive 結果

| 寬度 | 水平溢出 | Header／Main | Bottom Navigation | 結果 |
|---:|---|---|---|---|
| 320 | 無 | 305 / 305px | 固定於安全區上方 | PASS |
| 375 | 無 | 360 / 360px | 正常 | PASS |
| 390 | 無 | 375 / 375px | 正常 | PASS |
| 430 | 無 | 415 / 415px | 正常 | PASS |
| 768 | 無 | 480px 內容欄置中 | 正常 | PASS |
| 1024 | 無 | 480px 內容欄置中 | 正常 | PASS |
| 1280 | 無 | 480px 內容欄置中 | 正常 | PASS |

## Demo／Mock／正式資料

- 正式：使用者建立的旅行、日期、行程、航班、預算、記帳、錢包與稱呼。
- Master Data：目前內建 TPE、HND、NRT、ICN 的 V1 Hub 範例；只提供真實 HTTPS 地圖搜尋 URL，不提供票價、班次或交通耗時。
- Mock：天氣與匯率 Cache；天氣已在 UI 標示示範資料，匯率頁仍應在串接正式 API 前補上更醒目的示範 Badge。
- Guest：資料保存在瀏覽器；Supabase 資料表與 RLS 已提供 Migration，正式同步需部署後驗證。

## 修改範圍

- 共用：`js/card-actions.js`、`js/trip-schedule.js`、`js/trip-flights.js`、`js/reminder-engine.js`、`js/travel-services.js`。
- 頁面：`trip.html`、`my.html`、`favorites.html`、`js/account.js`、`js/block-workspace.js`、`js/trips.js`。
- Design System：`css/style.css`。
- Migration：`supabase/migrations/20260713_trip_schedule.sql`、`20260713_flights_hubs_guides.sql`、`20260713_reminder_rules_guides.sql`、`20260713_wallet_budget.sql`。

## 截圖

- `screenshots/home-390.png`
- `screenshots/inspiration-390.png`
- `screenshots/trip-320.png`
- `screenshots/trip-390.png`
- `screenshots/trip-430.png`
- `screenshots/trip-1024.png`
- `screenshots/budget-390.png`
- `screenshots/my-space-390.png`

## 已知限制／正式環境待驗

1. Supabase Migration 尚未套用至正式專案，RLS 必須以兩個真實帳號做跨帳號隔離測試。
2. Guest 行程、航班與錢包目前使用 localStorage；登入後正式同步須在 Migration 部署後做整合驗收。
3. 天氣與匯率仍是 V1 Service Interface + Cache + Mock；沒有 API Key 時不阻礙其餘流程。
4. Transportation Hub Master 目前只含本次驗收需要的四個機場；擴充必須使用正式來源，不得推測。
5. 未開發 Product Bible 列為 POST-V1 的即時航班、路線計算、多人協作、PDF／QR 分享與 AI 功能。

## Commit

- `aa66b91` Establish V1 typography and card actions
- `78a3d52` Build flexible trip date and time scheduling
- `8a2a15d` Add trip flights and transportation hub guides
- `4494567` Connect reminder rules and guide cards
- `14b584e` Refine Travel Wallet and budget experience
- `a5d728d` Remediate My Space information architecture

## Decision List

無。此次沒有需要改變產品方向或大幅調整資料模型的未決事項。
