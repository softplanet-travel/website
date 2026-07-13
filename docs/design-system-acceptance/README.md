# SoftPlanet V1 Design System Acceptance

驗收日期：2026-07-13

## 本次落地

- 正式規格：`docs/softplanet-v1-design-system.md`
- Typography Scale 與七種 Component Text Budget
- 4–48px Spacing Scale
- Card、Empty State 與 Mobile First 規則
- 首頁全幅 Hero，Greeting 整合於 Hero
- 首頁雙入口卡同高，Icon、Title、Description、CTA 對齊
- 中文語意斷句與固定詞組保護
- 專屬小卡最多三組通用「名稱＋HTTPS URL」參考連結
- `custom_trip_items.reference_links` migration 欄位

## 操作驗收

1. 首頁 Hero 同時呈現品牌圖片、品牌文案與個人 Greeting，沒有獨立 Greeting Card。
2. 搜尋不存在內容時使用統一 Empty State 結構。
3. 專屬小卡表單顯示三組通用參考連結，不限制平台。
4. 使用「官方」與 `https://example.com/official` 建立專屬小卡成功。
5. 詳情頁顯示「參考連結」卡，沒有把非地圖連結誤當成「查看地圖」。
6. 頁面執行期間沒有瀏覽器錯誤紀錄。

## Responsive 基準

CSS 以 320px 為初始規則，僅在 359px 以下收斂 Hero、卡片與參考連結欄位；430px 以上才放大 Typography 與主要間距。專屬小卡參考連結在 320px 改為單欄，375px 以上可使用名稱／URL 雙欄。既有 480px 內容型閱讀寬度與 Bottom Navigation safe-area 保留。

## 截圖

- 初始 Design System 驗收截圖：本目錄既有檔案
- [最終 320／375／390／430px 真實視覺驗收報告](final-mobile-review/README.md)
- 最終驗收共 36 張最新 viewport 截圖，依寬度與頁面編號收錄於 `final-mobile-review/`
