# SoftPlanet V1 Design System 最終行動版視覺驗收

驗收日期：2026-07-13  
瀏覽器測試寬度：320px、375px、390px、430px（高度 900px）  
結論：**PASS，可通過 V1 Design System 最終驗收。**

本次使用真實瀏覽器逐頁操作及 viewport 分段截圖，不以 HTTP 200、語法或 Git 狀態代替視覺驗收。分段截圖可避免固定 Header／Bottom Navigation 在整頁拼接截圖中重複或錯誤重排。

## 各寬度結果

| 寬度 | 跑版 | 中文不自然斷句 | CTA／Button | 卡片對齊 | Bottom Navigation | 結果 |
| --- | --- | --- | --- | --- | --- | --- |
| 320px | 無 | 無單字孤行；Hero 採語意兩行 | 全部單行 | 首頁雙入口同高、CTA 對齊 | 最後內容上方保留 15px 以上安全距離 | PASS |
| 375px | 無 | 無單字孤行或第二行僅 1–2 字 | 全部單行 | 首頁雙入口同高、CTA 對齊 | 未遮住內容 | PASS |
| 390px | 無 | Empty State 修正後無孤行 | 全部單行 | 首頁雙入口同高、CTA 對齊 | 未遮住內容 | PASS |
| 430px | 無 | 兩欄景點卡標題修正後維持完整詞名 | 全部單行 | 兩欄卡高度、說明與 CTA 對齊 | 未遮住內容 | PASS |

## 頁面與元件測試結果

| 項目 | 驗收結果 | 證據重點 |
| --- | --- | --- |
| 首頁 Hero | PASS | 圖片填滿 Hero；MUMU 未被文字遮住；品牌文案採固定語意兩行；沒有大片無意義空白。 |
| 首頁雙入口卡 | PASS | 兩卡等高；Icon、標題、說明與 CTA 對齊；CTA 保持單行。 |
| 首頁 Section Title | PASS | 「MUMU 的熱門靈感」與「查看更多」層級清楚，沒有拆詞。 |
| 景點卡列表 | PASS | 320–390px 單欄穩定；430px 兩欄卡標題完整，說明與 CTA 對齊。 |
| 景點詳情頁 | PASS | 標題、摘要、資訊卡與 CTA 無溢出；Hero 與內容比例自然。 |
| 搜尋無結果 Empty State | PASS | 超長動態搜尋名稱留在單行搜尋欄內；Empty 文案、MUMU 與 CTA 無破版。 |
| 自訂小卡新增表單 | PASS | 長卡片名稱在輸入欄內水平處理；欄位、下拉選單與說明文字無溢出。 |
| 自訂小卡詳情頁 | PASS | 長標題與長備註正常換行；參考連結只顯示名稱；長名稱以單行省略號處理。 |
| 我的旅行 | PASS | 320px 起表單與旅行列表正常；標題採語意斷句；主要按鈕單行。 |
| Bottom Navigation | PASS | 四種寬度皆固定且未造成水平溢出；最大捲動位置仍可完整閱讀最後內容。 |

## 資料相容與網址安全測試

| 測試 | 結果 | 實際結果 |
| --- | --- | --- |
| 舊卡只有 `google_map_url` | PASS | 詳情頁自動建立「參考連結／Google Maps」，連結仍可使用。 |
| 網址未輸入 `https://` | PASS | 離開欄位時自動補為 `https://maps.google.com/?q=Shinjuku`。 |
| Google Maps | PASS | 產生安全 HTTPS 連結，於新分頁開啟。 |
| Naver Map | PASS | 產生安全 HTTPS 連結，於新分頁開啟。 |
| 一般官網 | PASS | 長 URL 保留在 `href`，畫面只顯示自訂名稱。 |
| 部落格與訂票網址 | PASS | 分別顯示「旅行部落格」「訂票平台」，使用 `target="_blank"` 與 `rel="noopener noreferrer"`。 |
| `javascript:`／`data:` | PASS | 表單拒絕儲存，顯示安全 HTTPS 友善提示。 |
| 長連結名稱 | PASS | 單行省略號，不顯示完整 URL、不撐破卡片。 |

## 發現並已修正

1. 320px Hero 主標原本被單行規則裁切；改為兩段固定語意行。
2. 390px Empty State 說明最後只剩「小卡。」；縮短文案後保持完整行意。
3. 430px 兩欄景點卡仍保留單欄卡的 56px 右側空間，造成景點名稱單字孤行；移除該頁多餘保留空間。
4. 430px 自訂表單說明最後只剩「安排。」；改為較短且自然的說明。
5. 長參考連結名稱可能在第二行只剩 1–2 字；改為單行省略號。
6. Bottom Navigation 在最大捲動位置會遮住最後約 47px 內容；全站底部安全留白提高至 100px，複驗保留正距離。
7. 舊自訂卡只有 Google Map URL 時缺少通用參考連結；加入舊資料 fallback。
8. 參考網址欄位補上無協定自動完成與非 HTTPS 協定拒絕提示。

## 尚未修正內容

本次 V1 Design System 與指定 MVP 視覺驗收範圍內，沒有尚未修正的阻擋項目。第三方網站本身的服務可用性不由 SoftPlanet 控制；前端的 URL、開啟方式與安全屬性均已通過。

## 最新截圖

### 320px

- [首頁 Hero](320-01-home-hero.png)
- [首頁雙入口與 Section Title](320-02-home-entry-section.png)
- [景點卡列表](320-03-attraction-list.png)
- [景點詳情](320-04-place-detail.png)
- [搜尋無結果 Empty State](320-05-empty-state.png)
- [自訂小卡新增表單](320-06-custom-card-form.png)
- [自訂小卡詳情](320-07-custom-card-detail.png)
- [我的旅行](320-08-my-trips.png)
- [參考連結與長名稱](320-09-custom-card-links.png)

### 375px

- [首頁 Hero](375-01-home-hero.png)
- [首頁雙入口與 Section Title](375-02-home-entry-section.png)
- [景點卡列表](375-03-attraction-list.png)
- [景點詳情](375-04-place-detail.png)
- [搜尋無結果 Empty State](375-05-empty-state.png)
- [自訂小卡新增表單](375-06-custom-card-form.png)
- [自訂小卡詳情](375-07-custom-card-detail.png)
- [我的旅行](375-08-my-trips.png)
- [參考連結與長名稱](375-09-custom-card-links.png)

### 390px

- [首頁 Hero](390-01-home-hero.png)
- [首頁雙入口與 Section Title](390-02-home-entry-section.png)
- [景點卡列表](390-03-attraction-list.png)
- [景點詳情](390-04-place-detail.png)
- [搜尋無結果 Empty State](390-05-empty-state.png)
- [自訂小卡新增表單](390-06-custom-card-form.png)
- [自訂小卡詳情](390-07-custom-card-detail.png)
- [我的旅行](390-08-my-trips.png)
- [參考連結與長名稱](390-09-custom-card-links.png)

### 430px

- [首頁 Hero](430-01-home-hero.png)
- [首頁雙入口與 Section Title](430-02-home-entry-section.png)
- [景點卡列表](430-03-attraction-list.png)
- [景點詳情](430-04-place-detail.png)
- [搜尋無結果 Empty State](430-05-empty-state.png)
- [自訂小卡新增表單](430-06-custom-card-form.png)
- [自訂小卡詳情](430-07-custom-card-detail.png)
- [我的旅行](430-08-my-trips.png)
- [參考連結與長名稱](430-09-custom-card-links.png)

## 最終判定

四種指定寬度與所有指定頁面／狀態皆已完成真實視覺複驗。已發現的孤字、裁切、卡片空間與 Bottom Navigation 遮擋問題均已修正並重新截圖；因此本輪可判定通過 **SoftPlanet V1 Design System 最終驗收**。
